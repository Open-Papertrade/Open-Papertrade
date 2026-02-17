"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, BarChart3, LineChart, AreaChart } from "lucide-react";
import { stockAPI, HistoricalBar, TimeRange } from "@/lib/api";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  LineData,
  AreaData,
  CandlestickSeries,
  LineSeries,
  AreaSeries,
  ColorType,
  CrosshairMode,
  Time,
  SeriesType,
} from "lightweight-charts";

type ChartType = "candlestick" | "line" | "area";

const TIME_RANGES: TimeRange[] = ["1D", "1W", "1M", "6M", "1Y", "5Y"];

interface StockChartProps {
  symbol: string;
}

export default function StockChart({ symbol }: StockChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("1M");
  const [chartType, setChartType] = useState<ChartType>("candlestick");
  const [bars, setBars] = useState<HistoricalBar[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<SeriesType> | null>(null);

  // Fetch data — clear bars immediately so stale data doesn't render
  // with a new timeRange (which would cause a format mismatch → NaN times).
  const fetchHistory = useCallback(async () => {
    setBars([]);
    setIsLoading(true);
    try {
      const result = await stockAPI.getHistory(symbol, timeRange);
      if (result.success && result.bars.length > 0) {
        setBars(result.bars);
      } else {
        setBars([]);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
      setBars([]);
    } finally {
      setIsLoading(false);
    }
  }, [symbol, timeRange]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Render chart
  useEffect(() => {
    if (!chartContainerRef.current || bars.length === 0) return;

    // Clean up previous chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      seriesRef.current = null;
    }

    const container = chartContainerRef.current;

    // Detect format from the data itself (not timeRange) to avoid stale-state mismatches.
    // Intraday bars have pure-digit Unix timestamps; daily bars have "YYYY-MM-DD" strings.
    const isIntraday = bars.length > 0 && /^\d+$/.test(bars[0].time);

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 420,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "rgba(255, 255, 255, 0.5)",
        fontFamily: "'DM Mono', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.04)" },
        horzLines: { color: "rgba(255, 255, 255, 0.04)" },
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: { color: "rgba(255, 92, 0, 0.3)", width: 1, style: 2 },
        horzLine: { color: "rgba(255, 92, 0, 0.3)", width: 1, style: 2 },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderVisible: false,
        timeVisible: isIntraday,
        secondsVisible: false,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale: { mouseWheel: true, pinch: true },
    });

    chartRef.current = chart;

    const formatTime = (bar: HistoricalBar): Time => {
      if (isIntraday) {
        return Number(bar.time) as Time;
      }
      return bar.time as Time;
    };

    if (chartType === "candlestick") {
      const series = chart.addSeries(CandlestickSeries, {
        upColor: "#22C55E",
        downColor: "#EF4444",
        borderUpColor: "#22C55E",
        borderDownColor: "#EF4444",
        wickUpColor: "#22C55E",
        wickDownColor: "#EF4444",
      });
      const data: CandlestickData[] = bars.map((bar) => ({
        time: formatTime(bar),
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
      }));
      series.setData(data);
      seriesRef.current = series;
    } else if (chartType === "line") {
      const series = chart.addSeries(LineSeries, {
        color: "#FF5C00",
        lineWidth: 2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBackgroundColor: "#FF5C00",
      });
      const data: LineData[] = bars.map((bar) => ({
        time: formatTime(bar),
        value: bar.close,
      }));
      series.setData(data);
      seriesRef.current = series;
    } else {
      const series = chart.addSeries(AreaSeries, {
        topColor: "rgba(255, 92, 0, 0.4)",
        bottomColor: "rgba(255, 92, 0, 0.02)",
        lineColor: "#FF5C00",
        lineWidth: 2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBackgroundColor: "#FF5C00",
      });
      const data: AreaData[] = bars.map((bar) => ({
        time: formatTime(bar),
        value: bar.close,
      }));
      series.setData(data);
      seriesRef.current = series;
    }

    chart.timeScale().fitContent();

    // Responsive resize
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        chart.applyOptions({ width });
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [bars, chartType]);

  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] overflow-hidden shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-primary)]">
        {/* Time range buttons */}
        <div className="flex gap-1">
          {TIME_RANGES.map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                timeRange === range
                  ? "bg-[var(--accent-primary)] text-black"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
              }`}
            >
              {range}
            </button>
          ))}
        </div>

        {/* Chart type toggle */}
        <div className="flex gap-1">
          <button
            onClick={() => setChartType("candlestick")}
            title="Candlestick"
            className={`p-1.5 rounded-md transition-all ${
              chartType === "candlestick"
                ? "bg-[var(--bg-muted)] text-[var(--accent-primary)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <BarChart3 size={16} />
          </button>
          <button
            onClick={() => setChartType("line")}
            title="Line"
            className={`p-1.5 rounded-md transition-all ${
              chartType === "line"
                ? "bg-[var(--bg-muted)] text-[var(--accent-primary)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <LineChart size={16} />
          </button>
          <button
            onClick={() => setChartType("area")}
            title="Area"
            className={`p-1.5 rounded-md transition-all ${
              chartType === "area"
                ? "bg-[var(--bg-muted)] text-[var(--accent-primary)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <AreaChart size={16} />
          </button>
        </div>
      </div>

      {/* Chart area */}
      <div className="relative" style={{ height: 420 }}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-card)]/80 z-10">
            <Loader2 size={28} className="text-[var(--accent-primary)] animate-spin" />
          </div>
        )}
        {!isLoading && bars.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-[var(--text-muted)]">
            No chart data available
          </div>
        ) : (
          <div ref={chartContainerRef} className="w-full h-full" />
        )}
      </div>
    </div>
  );
}
