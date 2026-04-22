"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  SeriesType,
  Time,
  CandlestickData,
  BarData,
  LineData,
  AreaData,
  HistogramData,
  ColorType,
  CrosshairMode,
  CandlestickSeries,
  BarSeries,
  LineSeries,
  AreaSeries,
  HistogramSeries,
  MouseEventParams,
  LineStyle,
  IPriceLine,
  SeriesMarker,
  createSeriesMarkers,
  ISeriesMarkersPluginApi,
} from "lightweight-charts";
import {
  BarChart3,
  CandlestickChart,
  LineChart,
  AreaChart,
  Mountain,
  TrendingUp,
  Minus,
  Square,
  Activity,
  Type,
  MousePointer2,
  Trash2,
  Eye,
  EyeOff,
  ChevronDown,
  Loader2,
  Camera,
  Play,
  GitCompare,
  Bell,
  Scan,
  Newspaper,
  BarChartHorizontal,
  X,
  Plus,
  Target,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { stockAPI, userAPI, HistoricalBar, TimeRange, PriceAlert, NewsArticle } from "@/lib/api";
import { detectPatterns, DetectedPattern } from "@/lib/patterns";
import ReplayControls from "./ReplayControls";
import VolumeProfile from "./VolumeProfile";
import {
  sma,
  ema,
  bollinger,
  vwap,
  rsi,
  macd,
  stochastic,
  atr,
  obv,
  toHeikinAshi,
  Bar as IndicatorBar,
} from "@/lib/indicators";
import { INDICATOR_CATALOG, IndicatorId, ChartMode, Drawing, DrawingTool } from "./types";
import DrawingCanvas from "./DrawingCanvas";

const TIME_RANGES: TimeRange[] = ["1D", "1W", "1M", "6M", "1Y", "5Y"];

const CHART_MODES: { id: ChartMode; icon: typeof BarChart3; label: string }[] = [
  { id: "candlestick", icon: CandlestickChart, label: "Candles" },
  { id: "bar", icon: BarChart3, label: "OHLC Bars" },
  { id: "line", icon: LineChart, label: "Line" },
  { id: "area", icon: AreaChart, label: "Area" },
  { id: "heikinAshi", icon: Mountain, label: "Heikin-Ashi" },
];

const DRAWING_TOOLS: { id: DrawingTool; icon: typeof MousePointer2; label: string }[] = [
  { id: "cursor", icon: MousePointer2, label: "Cursor" },
  { id: "trendline", icon: TrendingUp, label: "Trendline" },
  { id: "horizontalLine", icon: Minus, label: "Horizontal Line" },
  { id: "rectangle", icon: Square, label: "Rectangle" },
  { id: "fibonacci", icon: Activity, label: "Fibonacci" },
  { id: "text", icon: Type, label: "Text Note" },
];

interface AdvancedChartProps {
  symbol: string;
  symbolName?: string;
  initialState?: Partial<{
    timeframe: TimeRange;
    mode: ChartMode;
    indicators: IndicatorId[];
    drawings: Drawing[];
    logScale: boolean;
    compareSymbols: string[];
    showVolumeProfile: boolean;
    showNews: boolean;
  }>;
  onStateChange?: (state: {
    timeframe: TimeRange;
    mode: ChartMode;
    indicators: IndicatorId[];
    drawings: Drawing[];
    logScale: boolean;
    compareSymbols: string[];
    showVolumeProfile: boolean;
    showNews: boolean;
  }) => void;
  height?: number;
}

const COMPARE_COLORS = ["#06B6D4", "#F59E0B", "#A855F7", "#10B981", "#EC4899"];
const REPLAY_BAR_HEIGHT = 56;

export default function AdvancedChart({
  symbol,
  symbolName,
  initialState,
  onStateChange,
  height = 640,
}: AdvancedChartProps) {
  const [timeframe, setTimeframe] = useState<TimeRange>(initialState?.timeframe ?? "1M");
  const [mode, setMode] = useState<ChartMode>(initialState?.mode ?? "candlestick");
  const [logScale, setLogScale] = useState<boolean>(initialState?.logScale ?? false);
  const [activeIndicators, setActiveIndicators] = useState<Set<IndicatorId>>(
    new Set(initialState?.indicators ?? ["ma20", "ma50", "volume"])
  );
  const [drawings, setDrawings] = useState<Drawing[]>(initialState?.drawings ?? []);
  const [activeTool, setActiveTool] = useState<DrawingTool>("cursor");
  const [bars, setBars] = useState<HistoricalBar[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showIndicatorMenu, setShowIndicatorMenu] = useState(false);
  const [hoverOHLC, setHoverOHLC] = useState<{
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    time: string;
  } | null>(null);

  // Phase 2/3/4 state
  const [replayActive, setReplayActive] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(1);
  const [compareSymbols, setCompareSymbols] = useState<string[]>(initialState?.compareSymbols ?? []);
  const [showCompareMenu, setShowCompareMenu] = useState(false);
  const [compareInput, setCompareInput] = useState("");
  const [compareBars, setCompareBars] = useState<Record<string, HistoricalBar[]>>({});
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [patterns, setPatterns] = useState<DetectedPattern[]>([]);
  const [showPatterns, setShowPatterns] = useState(false);
  const [showVolumeProfile, setShowVolumeProfile] = useState(initialState?.showVolumeProfile ?? false);
  const [showNews, setShowNews] = useState(initialState?.showNews ?? false);
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [indicatorValues, setIndicatorValues] = useState<Record<string, number | null>>({});

  // Shrink the chart area when the replay bar is visible so the whole card
  // keeps its total height constant and the replay controls don't get clipped.
  const chartHeight = replayActive ? Math.max(200, height - REPLAY_BAR_HEIGHT) : height;

  const containerRef = useRef<HTMLDivElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<SeriesType> | null>(null);
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<SeriesType>>>(new Map());
  const horizontalLineRefs = useRef<Map<string, IPriceLine>>(new Map());
  const compareSeriesRef = useRef<Map<string, ISeriesApi<SeriesType>>>(new Map());
  const alertLineRefs = useRef<Map<string, IPriceLine>>(new Map());
  const patternSeriesRef = useRef<ISeriesApi<SeriesType> | null>(null);
  const markersPluginRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);

  // Notify parent on state change
  useEffect(() => {
    onStateChange?.({
      timeframe,
      mode,
      indicators: Array.from(activeIndicators),
      drawings,
      logScale,
      compareSymbols,
      showVolumeProfile,
      showNews,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe, mode, activeIndicators, drawings, logScale, compareSymbols, showVolumeProfile, showNews]);

  // Fetch bars
  useEffect(() => {
    let cancelled = false;
    setBars([]);
    setIsLoading(true);
    stockAPI
      .getHistory(symbol, timeframe)
      .then((res) => {
        if (!cancelled && res.success) setBars(res.bars);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol, timeframe]);

  // Normalise bars into indicator-ready form
  const normalisedBars: IndicatorBar[] = useMemo(
    () =>
      bars.map((b) => ({
        time: b.time,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
        volume: b.volume,
      })),
    [bars]
  );

  // When replay is active, slice bars up to the current index
  const effectiveBars = useMemo(
    () => (replayActive ? normalisedBars.slice(0, replayIndex + 1) : normalisedBars),
    [normalisedBars, replayActive, replayIndex]
  );

  const displayBars = useMemo(
    () => (mode === "heikinAshi" ? toHeikinAshi(effectiveBars) : effectiveBars),
    [effectiveBars, mode]
  );

  const isIntraday = useMemo(
    () => bars.length > 0 && /^\d+$/.test(bars[0].time),
    [bars]
  );

  const formatTime = useCallback(
    (time: string | number): Time => {
      return isIntraday ? (Number(time) as Time) : (String(time) as Time);
    },
    [isIntraday]
  );

  // --- Chart creation + main series ---
  // Rebuilds only when mode or height change, NOT when bars change.
  // This keeps replay/data updates cheap and avoids disposing series that
  // other effects (alerts, compare, patterns) hold references to.
  useEffect(() => {
    if (!chartContainerRef.current) return;
    const container = chartContainerRef.current;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: chartHeight,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "rgba(255, 255, 255, 0.55)",
        fontFamily: "'DM Mono', monospace",
        fontSize: 11,
        panes: {
          separatorColor: "rgba(255, 255, 255, 0.08)",
          separatorHoverColor: "rgba(255, 92, 0, 0.4)",
          enableResize: true,
        },
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.03)" },
        horzLines: { color: "rgba(255, 255, 255, 0.03)" },
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: { color: "rgba(255, 92, 0, 0.3)", width: 1, style: LineStyle.Dashed },
        horzLine: { color: "rgba(255, 92, 0, 0.3)", width: 1, style: LineStyle.Dashed },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.08, bottom: 0.08 },
        mode: logScale ? 1 : 0,
      },
      timeScale: {
        borderVisible: false,
        secondsVisible: false,
      },
    });
    chartRef.current = chart;

    let main: ISeriesApi<SeriesType>;
    if (mode === "candlestick" || mode === "heikinAshi") {
      main = chart.addSeries(CandlestickSeries, {
        upColor: "#22C55E",
        downColor: "#EF4444",
        borderUpColor: "#22C55E",
        borderDownColor: "#EF4444",
        wickUpColor: "#22C55E",
        wickDownColor: "#EF4444",
      });
    } else if (mode === "bar") {
      main = chart.addSeries(BarSeries, { upColor: "#22C55E", downColor: "#EF4444" });
    } else if (mode === "line") {
      main = chart.addSeries(LineSeries, { color: "#FF5C00", lineWidth: 2 });
    } else {
      main = chart.addSeries(AreaSeries, {
        topColor: "rgba(255, 92, 0, 0.4)",
        bottomColor: "rgba(255, 92, 0, 0.02)",
        lineColor: "#FF5C00",
        lineWidth: 2,
      });
    }
    mainSeriesRef.current = main;

    // Crosshair readout. Uses refs so it always reads the latest data.
    const crosshairHandler = (param: MouseEventParams) => {
      if (!param.time || !param.seriesData) {
        setHoverOHLC(null);
        setIndicatorValues({});
        return;
      }
      const mainData = param.seriesData.get(main);
      if (mainData && "close" in mainData) {
        const bar = mainData as CandlestickData;
        setHoverOHLC({
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          volume: 0,
          time: String(param.time),
        });
      } else if (mainData && "value" in mainData) {
        const ld = mainData as LineData;
        setHoverOHLC({
          open: ld.value,
          high: ld.value,
          low: ld.value,
          close: ld.value,
          volume: 0,
          time: String(param.time),
        });
      }

      const vals: Record<string, number | null> = {};
      indicatorSeriesRef.current.forEach((series, key) => {
        const d = param.seriesData.get(series) as { value?: number } | undefined;
        vals[key] = d && typeof d.value === "number" ? d.value : null;
      });
      setIndicatorValues(vals);
    };
    chart.subscribeCrosshairMove(crosshairHandler);

    const ro = new ResizeObserver((entries) => {
      for (const e of entries) chart.applyOptions({ width: e.contentRect.width });
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      try {
        chart.unsubscribeCrosshairMove(crosshairHandler);
      } catch {
        /* already disposed */
      }
      try {
        chart.remove();
      } catch {
        /* already removed */
      }
      chartRef.current = null;
      mainSeriesRef.current = null;
      indicatorSeriesRef.current.clear();
      horizontalLineRefs.current.clear();
      compareSeriesRef.current.clear();
      alertLineRefs.current.clear();
      markersPluginRef.current = null;
      patternSeriesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, chartHeight]);

  // --- Data update: push new bars to the existing main series ---
  useEffect(() => {
    const main = mainSeriesRef.current;
    const chart = chartRef.current;
    if (!main || !chart || displayBars.length === 0) return;

    if (mode === "candlestick" || mode === "heikinAshi") {
      (main as ISeriesApi<"Candlestick">).setData(
        displayBars.map((b) => ({
          time: formatTime(b.time),
          open: b.open,
          high: b.high,
          low: b.low,
          close: b.close,
        })) as CandlestickData[]
      );
    } else if (mode === "bar") {
      (main as ISeriesApi<"Bar">).setData(
        displayBars.map((b) => ({
          time: formatTime(b.time),
          open: b.open,
          high: b.high,
          low: b.low,
          close: b.close,
        })) as BarData[]
      );
    } else if (mode === "line") {
      (main as ISeriesApi<"Line">).setData(
        displayBars.map((b) => ({
          time: formatTime(b.time),
          value: b.close,
        })) as LineData[]
      );
    } else {
      (main as ISeriesApi<"Area">).setData(
        displayBars.map((b) => ({
          time: formatTime(b.time),
          value: b.close,
        })) as AreaData[]
      );
    }

    chart.applyOptions({ timeScale: { timeVisible: isIntraday, secondsVisible: false } });
  }, [displayBars, mode, formatTime, isIntraday]);

  // Apply log/linear scale change without full re-init
  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.priceScale("right").applyOptions({ mode: logScale ? 1 : 0 });
  }, [logScale]);

  // Manage indicator series
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !mainSeriesRef.current || normalisedBars.length === 0) return;

    // Only render indicators that have enough bars to compute
    const renderableIndicators = new Set<IndicatorId>();
    activeIndicators.forEach((id) => {
      if (normalisedBars.length >= INDICATOR_CATALOG[id].minBars) {
        renderableIndicators.add(id);
      }
    });

    // Remove series no longer active (or no longer renderable)
    const activeKeys = new Set<string>();
    renderableIndicators.forEach((id) => {
      const meta = INDICATOR_CATALOG[id];
      // Some indicators add multiple series (bollinger = 3, macd = 2 lines + histogram, etc.)
      if (meta.id === "bollinger") {
        activeKeys.add("bollinger:upper");
        activeKeys.add("bollinger:middle");
        activeKeys.add("bollinger:lower");
      } else if (meta.id === "macd") {
        activeKeys.add("macd:line");
        activeKeys.add("macd:signal");
        activeKeys.add("macd:hist");
      } else if (meta.id === "stochastic") {
        activeKeys.add("stochastic:k");
        activeKeys.add("stochastic:d");
      } else {
        activeKeys.add(meta.id);
      }
    });

    // Remove stale series
    indicatorSeriesRef.current.forEach((series, key) => {
      if (!activeKeys.has(key)) {
        try {
          chart.removeSeries(series);
        } catch {
          /* ignore */
        }
        indicatorSeriesRef.current.delete(key);
      }
    });

    // Track pane indices — one per sub indicator group
    const subPanes = {
      volume: 1,
      rsi: 2,
      macd: 3,
      stochastic: 4,
      atr: 5,
      obv: 6,
    };
    // Calculate which sub-pane indicators are active so we can pack panes tightly
    const activeSubOrder: string[] = [];
    (["volume", "rsi", "macd", "stochastic", "atr", "obv"] as const).forEach((k) => {
      if (renderableIndicators.has(k)) activeSubOrder.push(k);
    });
    const paneIndex = (key: keyof typeof subPanes) => activeSubOrder.indexOf(key) + 1;

    const addOrUpdateLine = (
      key: string,
      data: { time: Time; value: number }[],
      color: string,
      paneIdx = 0,
      lineWidth = 1.5
    ) => {
      let series = indicatorSeriesRef.current.get(key);
      if (!series) {
        series = chart.addSeries(LineSeries, { color, lineWidth: lineWidth as 1 | 2 | 3 | 4, priceLineVisible: false, lastValueVisible: false }, paneIdx);
        indicatorSeriesRef.current.set(key, series);
      } else {
        series.applyOptions({ color, lineWidth: lineWidth as 1 | 2 | 3 | 4 });
      }
      (series as ISeriesApi<"Line">).setData(data as LineData[]);
    };

    const addOrUpdateHistogram = (
      key: string,
      data: HistogramData[],
      paneIdx = 0
    ) => {
      let series = indicatorSeriesRef.current.get(key);
      if (!series) {
        series = chart.addSeries(
          HistogramSeries,
          { priceLineVisible: false, lastValueVisible: false, priceFormat: { type: "volume" } },
          paneIdx
        );
        indicatorSeriesRef.current.set(key, series);
      }
      (series as ISeriesApi<"Histogram">).setData(data);
    };

    // Overlays
    if (renderableIndicators.has("ma20")) {
      addOrUpdateLine(
        "ma20",
        sma(effectiveBars, 20).map((p) => ({ time: formatTime(p.time), value: p.value })),
        INDICATOR_CATALOG.ma20.color
      );
    }
    if (renderableIndicators.has("ma50")) {
      addOrUpdateLine(
        "ma50",
        sma(effectiveBars, 50).map((p) => ({ time: formatTime(p.time), value: p.value })),
        INDICATOR_CATALOG.ma50.color
      );
    }
    if (renderableIndicators.has("ma200")) {
      addOrUpdateLine(
        "ma200",
        sma(effectiveBars, 200).map((p) => ({ time: formatTime(p.time), value: p.value })),
        INDICATOR_CATALOG.ma200.color
      );
    }
    if (renderableIndicators.has("ema9")) {
      addOrUpdateLine(
        "ema9",
        ema(effectiveBars, 9).map((p) => ({ time: formatTime(p.time), value: p.value })),
        INDICATOR_CATALOG.ema9.color
      );
    }
    if (renderableIndicators.has("ema21")) {
      addOrUpdateLine(
        "ema21",
        ema(effectiveBars, 21).map((p) => ({ time: formatTime(p.time), value: p.value })),
        INDICATOR_CATALOG.ema21.color
      );
    }
    if (renderableIndicators.has("bollinger")) {
      const b = bollinger(effectiveBars);
      addOrUpdateLine(
        "bollinger:upper",
        b.map((p) => ({ time: formatTime(p.time), value: p.upper })),
        "#9CA3AF",
        0,
        1
      );
      addOrUpdateLine(
        "bollinger:middle",
        b.map((p) => ({ time: formatTime(p.time), value: p.middle })),
        "#9CA3AF",
        0,
        1
      );
      addOrUpdateLine(
        "bollinger:lower",
        b.map((p) => ({ time: formatTime(p.time), value: p.lower })),
        "#9CA3AF",
        0,
        1
      );
    }
    if (renderableIndicators.has("vwap")) {
      addOrUpdateLine(
        "vwap",
        vwap(effectiveBars).map((p) => ({ time: formatTime(p.time), value: p.value })),
        INDICATOR_CATALOG.vwap.color
      );
    }

    // Sub-pane indicators
    if (renderableIndicators.has("volume")) {
      const data: HistogramData[] = normalisedBars.map((b) => ({
        time: formatTime(b.time),
        value: b.volume,
        color: b.close >= b.open ? "rgba(34, 197, 94, 0.5)" : "rgba(239, 68, 68, 0.5)",
      }));
      addOrUpdateHistogram("volume", data, paneIndex("volume"));
    }
    if (renderableIndicators.has("rsi")) {
      addOrUpdateLine(
        "rsi",
        rsi(effectiveBars).map((p) => ({ time: formatTime(p.time), value: p.value })),
        INDICATOR_CATALOG.rsi.color,
        paneIndex("rsi")
      );
    }
    if (renderableIndicators.has("macd")) {
      const m = macd(effectiveBars);
      addOrUpdateLine(
        "macd:line",
        m.map((p) => ({ time: formatTime(p.time), value: p.macd })),
        "#06B6D4",
        paneIndex("macd")
      );
      addOrUpdateLine(
        "macd:signal",
        m.map((p) => ({ time: formatTime(p.time), value: p.signal })),
        "#F59E0B",
        paneIndex("macd")
      );
      const histData: HistogramData[] = m.map((p) => ({
        time: formatTime(p.time),
        value: p.histogram,
        color: p.histogram >= 0 ? "rgba(34, 197, 94, 0.6)" : "rgba(239, 68, 68, 0.6)",
      }));
      addOrUpdateHistogram("macd:hist", histData, paneIndex("macd"));
    }
    if (renderableIndicators.has("stochastic")) {
      const s = stochastic(effectiveBars);
      addOrUpdateLine(
        "stochastic:k",
        s.map((p) => ({ time: formatTime(p.time), value: p.k })),
        "#F59E0B",
        paneIndex("stochastic")
      );
      addOrUpdateLine(
        "stochastic:d",
        s.map((p) => ({ time: formatTime(p.time), value: p.d })),
        "#06B6D4",
        paneIndex("stochastic")
      );
    }
    if (renderableIndicators.has("atr")) {
      addOrUpdateLine(
        "atr",
        atr(effectiveBars).map((p) => ({ time: formatTime(p.time), value: p.value })),
        INDICATOR_CATALOG.atr.color,
        paneIndex("atr")
      );
    }
    if (renderableIndicators.has("obv")) {
      addOrUpdateLine(
        "obv",
        obv(effectiveBars).map((p) => ({ time: formatTime(p.time), value: p.value })),
        INDICATOR_CATALOG.obv.color,
        paneIndex("obv")
      );
    }
  }, [activeIndicators, effectiveBars, formatTime, mode]);

  // Manage horizontal line drawings via createPriceLine (native)
  useEffect(() => {
    const main = mainSeriesRef.current;
    if (!main) return;

    const activeHorizontalIds = new Set(
      drawings.filter((d) => d.tool === "horizontalLine").map((d) => d.id)
    );
    horizontalLineRefs.current.forEach((line, id) => {
      if (!activeHorizontalIds.has(id)) {
        try {
          main.removePriceLine(line);
        } catch {
          /* ignore */
        }
        horizontalLineRefs.current.delete(id);
      }
    });

    drawings.forEach((d) => {
      if (d.tool !== "horizontalLine") return;
      if (horizontalLineRefs.current.has(d.id)) return;
      const line = main.createPriceLine({
        price: d.price,
        color: d.color,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: d.price.toFixed(2),
      });
      horizontalLineRefs.current.set(d.id, line);
    });
  }, [drawings]);

  // --- Phase 2: Compare symbols — fetch bars for each ---
  useEffect(() => {
    let cancelled = false;
    compareSymbols.forEach((sym) => {
      if (compareBars[sym]) return;
      stockAPI
        .getHistory(sym, timeframe)
        .then((res) => {
          if (!cancelled && res.success) {
            setCompareBars((prev) => ({ ...prev, [sym]: res.bars }));
          }
        })
        .catch(() => {});
    });
    // Drop stale
    setCompareBars((prev) => {
      const next: Record<string, HistoricalBar[]> = {};
      compareSymbols.forEach((s) => {
        if (prev[s]) next[s] = prev[s];
      });
      return next;
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compareSymbols, timeframe]);

  // Render compare series as normalised % change overlays on the main pane
  useEffect(() => {
    const chart = chartRef.current;
    const main = mainSeriesRef.current;
    if (!chart || !main || bars.length === 0) return;

    const basePrice = bars[0].close;

    // Remove stale series
    compareSeriesRef.current.forEach((series, sym) => {
      if (!compareSymbols.includes(sym)) {
        try {
          chart.removeSeries(series);
        } catch {
          /* ignore */
        }
        compareSeriesRef.current.delete(sym);
      }
    });

    compareSymbols.forEach((sym, i) => {
      const symBars = compareBars[sym];
      if (!symBars || symBars.length === 0) return;

      // Project compare % onto primary symbol's price for visual overlay
      const compareBase = symBars[0].close;
      const color = COMPARE_COLORS[i % COMPARE_COLORS.length];

      let series = compareSeriesRef.current.get(sym);
      if (!series) {
        series = chart.addSeries(LineSeries, {
          color,
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: true,
          title: sym,
        });
        compareSeriesRef.current.set(sym, series);
      }

      const data: LineData[] = symBars.map((b) => {
        const pct = (b.close - compareBase) / compareBase;
        return {
          time: formatTime(b.time),
          value: basePrice * (1 + pct),
        };
      });
      (series as ISeriesApi<"Line">).setData(data);
    });
  }, [compareSymbols, compareBars, bars, formatTime]);

  // --- Phase 2: Alerts — fetch & render ---
  const fetchAlerts = useCallback(async () => {
    try {
      const list = await userAPI.getAlerts();
      setAlerts(list.filter((a) => a.symbol === symbol));
    } catch {
      /* ignore */
    }
  }, [symbol]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    const main = mainSeriesRef.current;
    if (!main) return;

    const activeIds = new Set(alerts.map((a) => a.id));
    alertLineRefs.current.forEach((line, id) => {
      if (!activeIds.has(id)) {
        try {
          main.removePriceLine(line);
        } catch {
          /* ignore */
        }
        alertLineRefs.current.delete(id);
      }
    });

    alerts.forEach((a) => {
      if (alertLineRefs.current.has(a.id)) return;
      const color = a.condition === "above" ? "#22C55E" : "#EF4444";
      const line = main.createPriceLine({
        price: Number(a.targetPrice),
        color,
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: true,
        title: `Alert ${a.condition} ${Number(a.targetPrice).toFixed(2)}`,
      });
      alertLineRefs.current.set(a.id, line);
    });
  }, [alerts]);

  const handleCreateAlert = async () => {
    const last = bars[bars.length - 1]?.close;
    if (!last) return;
    const priceStr = prompt(`Create price alert for ${symbol} — target price?`, last.toFixed(2));
    if (!priceStr) return;
    const target = parseFloat(priceStr);
    if (!isFinite(target)) return;
    const condition = target > last ? "above" : "below";
    try {
      await userAPI.createAlert({ symbol, condition, targetPrice: target });
      await fetchAlerts();
    } catch (e) {
      alert(`Failed to create alert: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  // --- Phase 3: Pattern detection ---
  // Clicking the Patterns button toggles the panel. Re-scan runs detection manually.
  const togglePatterns = () => {
    setShowPatterns((v) => !v);
  };

  const rescanPatterns = () => {
    setPatterns(detectPatterns(effectiveBars));
  };

  // Auto-detect whenever the panel opens or the underlying bars change
  useEffect(() => {
    if (!showPatterns) return;
    setPatterns(detectPatterns(effectiveBars));
  }, [showPatterns, effectiveBars]);

  // Render detected patterns as shaded rectangles using markers on pivot points
  useEffect(() => {
    const chart = chartRef.current;
    const main = mainSeriesRef.current;
    if (!chart || !main) return;

    // Remove prior markers plugin
    if (markersPluginRef.current) {
      try {
        markersPluginRef.current.detach();
      } catch {
        /* ignore */
      }
      markersPluginRef.current = null;
    }

    const markers: SeriesMarker<Time>[] = [];

    // Pattern markers
    if (showPatterns && patterns.length > 0) {
      patterns.forEach((p) => {
        p.points.forEach((idx, i) => {
          const bar = effectiveBars[idx];
          if (!bar) return;
          markers.push({
            time: formatTime(bar.time),
            position: p.bias === "bullish" ? "belowBar" : p.bias === "bearish" ? "aboveBar" : "inBar",
            color: p.bias === "bullish" ? "#22C55E" : p.bias === "bearish" ? "#EF4444" : "#F59E0B",
            shape: i === Math.floor(p.points.length / 2) ? "arrowUp" : "circle",
            text: i === 0 ? p.label : "",
            size: i === Math.floor(p.points.length / 2) ? 2 : 1,
          });
        });
      });
    }

    // News markers
    if (showNews && newsArticles.length > 0) {
      newsArticles.forEach((article) => {
        const articleDate = new Date(article.publishedAt);
        // Find closest bar
        let closest: IndicatorBar | null = null;
        let closestDiff = Infinity;
        for (const b of effectiveBars) {
          const barDate = typeof b.time === "string"
            ? new Date(b.time)
            : new Date(Number(b.time) * 1000);
          const diff = Math.abs(barDate.getTime() - articleDate.getTime());
          if (diff < closestDiff) {
            closestDiff = diff;
            closest = b;
          }
        }
        if (closest && closestDiff < 1000 * 60 * 60 * 24 * 3) {
          markers.push({
            time: formatTime(closest.time),
            position: "aboveBar",
            color: "#A855F7",
            shape: "square",
            text: "N",
            size: 1,
          });
        }
      });
    }

    if (markers.length > 0) {
      markers.sort((a, b) => {
        const aT = typeof a.time === "number" ? a.time : new Date(a.time as string).getTime();
        const bT = typeof b.time === "number" ? b.time : new Date(b.time as string).getTime();
        return aT - bT;
      });
      markersPluginRef.current = createSeriesMarkers(main, markers);
    }
  }, [patterns, showPatterns, showNews, newsArticles, effectiveBars, formatTime]);

  // --- Phase 4: Fetch news ---
  useEffect(() => {
    if (!showNews) {
      setNewsArticles([]);
      return;
    }
    let cancelled = false;
    stockAPI
      .getNews(symbol)
      .then((res) => {
        if (!cancelled) setNewsArticles(res.articles || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [showNews, symbol]);

  // --- Replay: reset index when replay exits or bars change ---
  useEffect(() => {
    if (!replayActive) return;
    if (replayIndex >= normalisedBars.length) {
      setReplayIndex(Math.max(0, normalisedBars.length - 1));
    }
  }, [replayActive, replayIndex, normalisedBars.length]);

  const startReplay = () => {
    if (normalisedBars.length === 0) return;
    setReplayActive(true);
    setReplayIndex(Math.floor(normalisedBars.length * 0.3)); // start at 30%
    setReplayPlaying(false);
  };

  const exitReplay = () => {
    setReplayActive(false);
    setReplayPlaying(false);
  };

  const addCompareSymbol = () => {
    const sym = compareInput.trim().toUpperCase();
    if (!sym) return;
    if (compareSymbols.includes(sym) || sym === symbol) return;
    if (compareSymbols.length >= 5) {
      alert("Max 5 compare symbols");
      return;
    }
    setCompareSymbols((prev) => [...prev, sym]);
    setCompareInput("");
  };

  const removeCompareSymbol = (sym: string) => {
    setCompareSymbols((prev) => prev.filter((s) => s !== sym));
  };

  // Drawing handlers
  const handleDrawingComplete = useCallback((d: Drawing) => {
    setDrawings((prev) => [...prev, d]);
    setActiveTool("cursor");
  }, []);

  const clearAllDrawings = () => {
    if (drawings.length === 0) return;
    if (!confirm("Clear all drawings?")) return;
    setDrawings([]);
  };

  const toggleIndicator = (id: IndicatorId) => {
    setActiveIndicators((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const takeSnapshot = () => {
    const container = chartContainerRef.current;
    if (!container) return;
    const canvas = container.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${symbol}_${timeframe}_${Date.now()}.png`;
    link.href = (canvas as HTMLCanvasElement).toDataURL("image/png");
    link.click();
  };

  // Group indicators by category for the menu
  const indicatorsByCategory = useMemo(() => {
    const groups: Record<string, IndicatorId[]> = {};
    Object.values(INDICATOR_CATALOG).forEach((m) => {
      if (!groups[m.category]) groups[m.category] = [];
      groups[m.category].push(m.id);
    });
    return groups;
  }, []);

  const lastPrice = bars[bars.length - 1]?.close;
  const firstPrice = bars[0]?.close;
  const priceChange = lastPrice && firstPrice ? lastPrice - firstPrice : 0;
  const priceChangePct = firstPrice ? (priceChange / firstPrice) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] overflow-hidden flex flex-col"
    >
      {/* --- Header: symbol + price + timeframe + chart type + indicators + scale + snapshot --- */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-primary)] flex-wrap">
        {/* Symbol + price */}
        <div className="flex items-center gap-3 min-w-[180px]">
          <div>
            <div className="font-mono text-sm font-semibold text-[var(--text-primary)]">{symbol}</div>
            {symbolName && (
              <div className="text-[10px] text-[var(--text-dim)] truncate max-w-[200px]">{symbolName}</div>
            )}
          </div>
          {lastPrice !== undefined && (
            <div className="flex flex-col items-end">
              <div className="font-mono text-sm font-semibold text-[var(--text-primary)]">
                ${lastPrice.toFixed(2)}
              </div>
              <div
                className={`font-mono text-[10px] font-medium ${
                  priceChange >= 0 ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"
                }`}
              >
                {priceChange >= 0 ? "+" : ""}
                {priceChange.toFixed(2)} ({priceChangePct >= 0 ? "+" : ""}
                {priceChangePct.toFixed(2)}%)
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-8 bg-[var(--border-primary)]" />

        {/* Timeframe */}
        <div className="flex gap-0.5 bg-[var(--bg-muted)] rounded-md p-0.5">
          {TIME_RANGES.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                timeframe === tf
                  ? "bg-[var(--accent-primary)] text-black"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        <div className="w-px h-8 bg-[var(--border-primary)]" />

        {/* Chart mode */}
        <div className="flex gap-0.5">
          {CHART_MODES.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              title={label}
              className={`p-1.5 rounded transition-all ${
                mode === id
                  ? "bg-[var(--bg-muted)] text-[var(--accent-primary)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Icon size={15} />
            </button>
          ))}
        </div>

        <div className="w-px h-8 bg-[var(--border-primary)]" />

        {/* Indicators menu */}
        <div className="relative">
          <button
            onClick={() => setShowIndicatorMenu((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--bg-muted)] text-[var(--text-primary)] text-xs font-medium hover:bg-[var(--bg-card-hover,rgba(255,255,255,0.06))] transition-all"
          >
            <Activity size={14} />
            Indicators
            <span className="text-[10px] text-[var(--accent-primary)]">({activeIndicators.size})</span>
            <ChevronDown size={12} />
          </button>
          {showIndicatorMenu && (
            <div className="absolute top-full left-0 mt-1 w-[360px] bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg shadow-2xl z-50 max-h-[440px] overflow-auto">
              {Object.entries(indicatorsByCategory).map(([category, ids]) => (
                <div key={category} className="border-b border-[var(--border-primary)] last:border-b-0">
                  <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
                    {category}
                  </div>
                  {ids.map((id) => {
                    const meta = INDICATOR_CATALOG[id];
                    const active = activeIndicators.has(id);
                    const available = normalisedBars.length >= meta.minBars;
                    return (
                      <button
                        key={id}
                        onClick={() => available && toggleIndicator(id)}
                        disabled={!available}
                        title={
                          available
                            ? meta.description
                            : `Needs ${meta.minBars} bars — you have ${normalisedBars.length}. Switch to a longer timeframe.`
                        }
                        className={`flex items-start justify-between w-full px-3 py-2 text-left transition-colors ${
                          !available
                            ? "opacity-40 cursor-not-allowed"
                            : "hover:bg-[var(--bg-muted)]"
                        } ${active && available ? "bg-[var(--bg-muted)]/50" : ""}`}
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                            style={{ backgroundColor: meta.color }}
                          />
                          <div>
                            <div className="text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                              {meta.label}
                              {!available && (
                                <span className="text-[9px] font-bold uppercase px-1 py-px rounded bg-[var(--accent-red)]/20 text-[var(--accent-red)]">
                                  ≥{meta.minBars} bars
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-[var(--text-dim)]">{meta.description}</div>
                          </div>
                        </div>
                        {active && available ? (
                          <Eye size={14} className="text-[var(--accent-primary)] shrink-0 mt-0.5" />
                        ) : (
                          <EyeOff size={14} className="text-[var(--text-dim)] shrink-0 mt-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Feature buttons */}
        <div className="flex items-center gap-1">
          <FeatureButton
            icon={Play}
            label="Replay"
            active={replayActive}
            onClick={() => (replayActive ? exitReplay() : startReplay())}
          />
          <div className="relative">
            <FeatureButton
              icon={GitCompare}
              label="Compare"
              active={compareSymbols.length > 0}
              badge={compareSymbols.length || undefined}
              onClick={() => setShowCompareMenu((v) => !v)}
            />
            {showCompareMenu && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg shadow-2xl z-50 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)] mb-2">
                  Overlay Symbols ({compareSymbols.length}/5)
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    addCompareSymbol();
                  }}
                  className="flex gap-1 mb-2"
                >
                  <input
                    value={compareInput}
                    onChange={(e) => setCompareInput(e.target.value)}
                    placeholder="Symbol…"
                    className="flex-1 px-2 py-1.5 rounded bg-[var(--bg-muted)] border border-[var(--border-primary)] text-xs font-mono text-[var(--text-primary)] placeholder:text-[var(--text-dim)] focus:border-[var(--accent-primary)] outline-none"
                  />
                  <button
                    type="submit"
                    className="px-2 py-1.5 rounded bg-[var(--accent-primary)] text-black"
                  >
                    <Plus size={14} />
                  </button>
                </form>
                {compareSymbols.length === 0 ? (
                  <div className="text-[11px] text-[var(--text-dim)] text-center py-2">
                    No compare symbols
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    {compareSymbols.map((s, i) => (
                      <div
                        key={s}
                        className="flex items-center gap-2 px-2 py-1.5 rounded bg-[var(--bg-muted)]/50"
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: COMPARE_COLORS[i % COMPARE_COLORS.length] }}
                        />
                        <span className="font-mono text-xs text-[var(--text-primary)] flex-1">{s}</span>
                        <button
                          onClick={() => removeCompareSymbol(s)}
                          className="text-[var(--text-muted)] hover:text-[var(--accent-red)]"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <FeatureButton
            icon={Bell}
            label="Alert"
            badge={alerts.length || undefined}
            onClick={handleCreateAlert}
          />
          <FeatureButton
            icon={Scan}
            label="Patterns"
            active={showPatterns}
            badge={showPatterns ? patterns.length || undefined : undefined}
            onClick={togglePatterns}
          />
          <FeatureButton
            icon={BarChartHorizontal}
            label="V.Profile"
            active={showVolumeProfile}
            onClick={() => setShowVolumeProfile((v) => !v)}
          />
          <FeatureButton
            icon={Newspaper}
            label="News"
            active={showNews}
            onClick={() => setShowNews((v) => !v)}
          />
          <Link
            href={`/backtesting?symbol=${symbol}`}
            title="Backtest this chart"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-[11px] font-semibold hover:bg-[var(--accent-primary)]/20 transition-all"
          >
            <Target size={13} />
            Backtest
            <ArrowRight size={12} />
          </Link>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setLogScale((v) => !v)}
            title={logScale ? "Linear scale" : "Log scale"}
            className={`px-2.5 py-1.5 rounded text-[10px] font-bold transition-all ${
              logScale
                ? "bg-[var(--accent-primary)] text-black"
                : "bg-[var(--bg-muted)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            LOG
          </button>
          <button
            onClick={takeSnapshot}
            title="Snapshot (PNG)"
            className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--bg-muted)] transition-all"
          >
            <Camera size={15} />
          </button>
        </div>
      </div>

      {/* --- Legend strip: active indicator readouts --- */}
      {(hoverOHLC || activeIndicators.size > 0) && (
        <div className="flex items-center gap-4 px-4 py-2 border-b border-[var(--border-primary)] flex-wrap text-[10px] font-mono">
          {hoverOHLC && (
            <>
              <span className="text-[var(--text-dim)]">
                O <span className="text-[var(--text-primary)]">{hoverOHLC.open.toFixed(2)}</span>
              </span>
              <span className="text-[var(--text-dim)]">
                H <span className="text-[var(--accent-green)]">{hoverOHLC.high.toFixed(2)}</span>
              </span>
              <span className="text-[var(--text-dim)]">
                L <span className="text-[var(--accent-red)]">{hoverOHLC.low.toFixed(2)}</span>
              </span>
              <span className="text-[var(--text-dim)]">
                C <span className="text-[var(--text-primary)]">{hoverOHLC.close.toFixed(2)}</span>
              </span>
              <span className="text-[var(--text-dim)]">
                V <span className="text-[var(--text-primary)]">{hoverOHLC.volume.toLocaleString()}</span>
              </span>
              <div className="w-px h-3 bg-[var(--border-primary)]" />
            </>
          )}
          {Array.from(activeIndicators).map((id) => {
            const meta = INDICATOR_CATALOG[id];
            const available = normalisedBars.length >= meta.minBars;
            const val = indicatorValues[id];
            return (
              <span
                key={id}
                className={`flex items-center gap-1 ${!available ? "opacity-40" : ""}`}
                title={
                  !available
                    ? `${meta.label} needs ${meta.minBars} bars (have ${normalisedBars.length})`
                    : undefined
                }
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
                <span className="text-[var(--text-muted)]">{meta.shortLabel}</span>
                {!available ? (
                  <span className="text-[var(--accent-red)] text-[9px] font-bold">n/a</span>
                ) : (
                  val !== null && val !== undefined && (
                    <span className="text-[var(--text-primary)]">{val.toFixed(2)}</span>
                  )
                )}
              </span>
            );
          })}
        </div>
      )}

      {/* --- Body: left toolbar + chart area --- */}
      <div className="flex flex-1" style={{ minHeight: chartHeight }}>
        {/* Drawing toolbar (vertical) */}
        <div className="flex flex-col gap-1 p-2 border-r border-[var(--border-primary)] bg-[var(--bg-card)]">
          {DRAWING_TOOLS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTool(id)}
              title={label}
              className={`p-2 rounded-md transition-all ${
                activeTool === id
                  ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Icon size={16} />
            </button>
          ))}
          <div className="h-px bg-[var(--border-primary)] my-1" />
          <button
            onClick={clearAllDrawings}
            title="Clear all drawings"
            disabled={drawings.length === 0}
            className="p-2 rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--accent-red)] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[var(--text-muted)] transition-all"
          >
            <Trash2 size={16} />
          </button>
          {drawings.length > 0 && (
            <div className="mt-auto px-1">
              <div className="text-[9px] font-mono text-center text-[var(--text-dim)]">
                {drawings.length}
              </div>
            </div>
          )}
        </div>

        {/* Chart area */}
        <div className="flex-1 relative min-w-0">
          {/* Chart container is always mounted so the ref is available
              when the chart-creation effect runs on mount. */}
          <div ref={chartContainerRef} className="w-full h-full" style={{ height: chartHeight }} />
          {showVolumeProfile && bars.length > 0 && (
            <VolumeProfile
              chart={chartRef.current}
              priceSeries={mainSeriesRef.current}
              containerRef={chartContainerRef}
              bars={effectiveBars}
            />
          )}
          {bars.length > 0 && (
            <DrawingCanvas
              chart={chartRef.current}
              priceSeries={mainSeriesRef.current}
              containerRef={chartContainerRef}
              activeTool={activeTool}
              drawings={drawings}
              onDrawingComplete={handleDrawingComplete}
            />
          )}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-card)]/60 z-20">
              <Loader2 size={28} className="text-[var(--accent-primary)] animate-spin" />
            </div>
          )}
          {!isLoading && bars.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-[var(--text-muted)] pointer-events-none">
              No chart data available
            </div>
          )}
        </div>

        {/* Patterns side panel */}
        {showPatterns && (
          <div className="w-[280px] border-l border-[var(--border-primary)] bg-[var(--bg-card)] overflow-auto flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-primary)] sticky top-0 bg-[var(--bg-card)] z-10">
              <div className="flex items-center gap-2">
                <Scan size={14} className="text-[var(--accent-primary)]" />
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  Detected Patterns
                </span>
                <span className="text-[10px] text-[var(--text-dim)]">({patterns.length})</span>
              </div>
              <button
                onClick={() => setShowPatterns(false)}
                className="text-[var(--text-muted)] hover:text-[var(--accent-red)] p-1"
              >
                <X size={14} />
              </button>
            </div>
            {patterns.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
                <div className="w-10 h-10 rounded-full bg-[var(--bg-muted)] flex items-center justify-center">
                  <Scan size={18} className="text-[var(--text-dim)]" />
                </div>
                <div className="text-xs font-medium text-[var(--text-primary)]">
                  No patterns detected
                </div>
                <div className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                  {effectiveBars.length < 20 ? (
                    <>
                      Not enough bars to analyse ({effectiveBars.length}/20 minimum).
                      Try a longer timeframe like <span className="text-[var(--accent-primary)] font-semibold">6M</span> or <span className="text-[var(--accent-primary)] font-semibold">1Y</span>.
                    </>
                  ) : (
                    <>
                      The current {effectiveBars.length} bars don&apos;t match any of the 7 classical patterns.
                      Try a different symbol, a longer timeframe, or a different date range via replay mode.
                    </>
                  )}
                </div>
                <button
                  onClick={rescanPatterns}
                  className="mt-2 px-3 py-1.5 rounded text-[10px] font-semibold bg-[var(--bg-muted)] text-[var(--text-primary)] hover:bg-[var(--accent-primary)] hover:text-black transition-all"
                >
                  Re-scan
                </button>
              </div>
            ) : (
              <div className="flex-1 divide-y divide-[var(--border-primary)]">
                {patterns.map((p, i) => (
                  <div key={i} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-[var(--text-primary)]">
                        {p.label}
                      </span>
                      <span
                        className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          p.bias === "bullish"
                            ? "bg-[var(--accent-green)]/20 text-[var(--accent-green)]"
                            : p.bias === "bearish"
                            ? "bg-[var(--accent-red)]/20 text-[var(--accent-red)]"
                            : "bg-[var(--text-muted)]/20 text-[var(--text-muted)]"
                        }`}
                      >
                        {p.bias}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                      <span>
                        Bars {p.startIndex}–{p.endIndex}
                      </span>
                      <span className="font-mono">
                        {(p.confidence * 100).toFixed(0)}% conf.
                      </span>
                    </div>
                    <div className="mt-2 h-1 rounded-full bg-[var(--bg-muted)]">
                      <div
                        className="h-full rounded-full bg-[var(--accent-primary)]"
                        style={{ width: `${p.confidence * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="px-4 py-2 border-t border-[var(--border-primary)] text-[10px] text-[var(--text-dim)]">
              Heuristic detection. Always verify visually.
            </div>
          </div>
        )}

        {/* News side panel */}
        {showNews && (
          <div className="w-[300px] border-l border-[var(--border-primary)] bg-[var(--bg-card)] overflow-auto flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-primary)] sticky top-0 bg-[var(--bg-card)] z-10">
              <div className="flex items-center gap-2">
                <Newspaper size={14} className="text-[#A855F7]" />
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  Recent News
                </span>
                <span className="text-[10px] text-[var(--text-dim)]">({newsArticles.length})</span>
              </div>
              <button
                onClick={() => setShowNews(false)}
                className="text-[var(--text-muted)] hover:text-[var(--accent-red)] p-1"
              >
                <X size={14} />
              </button>
            </div>
            {newsArticles.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
                <div className="w-10 h-10 rounded-full bg-[var(--bg-muted)] flex items-center justify-center">
                  <Newspaper size={18} className="text-[var(--text-dim)]" />
                </div>
                <div className="text-xs font-medium text-[var(--text-primary)]">
                  No recent news
                </div>
                <div className="text-[10px] text-[var(--text-muted)]">
                  No articles available for {symbol}. Try a different symbol.
                </div>
              </div>
            ) : (
              <div className="flex-1 divide-y divide-[var(--border-primary)]">
                {newsArticles.map((article, i) => (
                  <NewsItem
                    key={i}
                    article={article}
                    onJumpToBar={() => {
                      const chart = chartRef.current;
                      if (!chart) return;
                      const articleDate = new Date(article.publishedAt);
                      // Find closest bar index
                      let closestIdx = -1;
                      let closestDiff = Infinity;
                      normalisedBars.forEach((b, idx) => {
                        const barDate =
                          typeof b.time === "string"
                            ? new Date(b.time)
                            : new Date(Number(b.time) * 1000);
                        const diff = Math.abs(barDate.getTime() - articleDate.getTime());
                        if (diff < closestDiff) {
                          closestDiff = diff;
                          closestIdx = idx;
                        }
                      });
                      if (closestIdx >= 0) {
                        // Center the bar in view
                        const span = 20;
                        chart.timeScale().setVisibleLogicalRange({
                          from: Math.max(0, closestIdx - span),
                          to: Math.min(normalisedBars.length - 1, closestIdx + span),
                        });
                      }
                    }}
                  />
                ))}
              </div>
            )}
            <div className="px-4 py-2 border-t border-[var(--border-primary)] text-[10px] text-[var(--text-dim)]">
              Click article to open · click arrow to jump on chart
            </div>
          </div>
        )}
      </div>

      {/* Replay controls */}
      {replayActive && (
        <ReplayControls
          totalBars={normalisedBars.length}
          currentIndex={replayIndex}
          onIndexChange={setReplayIndex}
          isPlaying={replayPlaying}
          onPlayPause={() => setReplayPlaying((v) => !v)}
          speed={replaySpeed}
          onSpeedChange={setReplaySpeed}
          onExit={exitReplay}
          currentTime={
            normalisedBars[replayIndex]
              ? String(normalisedBars[replayIndex].time)
              : undefined
          }
        />
      )}
    </div>
  );
}

// --- Small helper component for the header feature buttons ---
interface FeatureButtonProps {
  icon: typeof Bell;
  label: string;
  active?: boolean;
  badge?: number;
  onClick: () => void;
}

function FeatureButton({ icon: Icon, label, active, badge, onClick }: FeatureButtonProps) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-medium transition-all ${
        active
          ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]"
          : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
      }`}
    >
      <Icon size={13} />
      <span className="hidden xl:inline">{label}</span>
      {badge !== undefined && (
        <span className="text-[9px] font-bold bg-[var(--accent-primary)]/30 text-[var(--accent-primary)] px-1 rounded">
          {badge}
        </span>
      )}
    </button>
  );
}

// --- News article card ---
function NewsItem({
  article,
  onJumpToBar,
}: {
  article: NewsArticle;
  onJumpToBar: () => void;
}) {
  const date = new Date(article.publishedAt);
  const isValid = !isNaN(date.getTime());
  const now = Date.now();
  const ageMs = isValid ? now - date.getTime() : 0;
  const ageLabel = !isValid
    ? ""
    : ageMs < 3600_000
    ? `${Math.max(1, Math.floor(ageMs / 60_000))}m ago`
    : ageMs < 86400_000
    ? `${Math.floor(ageMs / 3600_000)}h ago`
    : ageMs < 604800_000
    ? `${Math.floor(ageMs / 86400_000)}d ago`
    : date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="group relative flex gap-3 px-4 py-3 hover:bg-[var(--bg-muted)]/40 transition-colors">
      {article.thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.thumbnail}
          alt=""
          className="w-14 h-14 rounded-md object-cover shrink-0 bg-[var(--bg-muted)]"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <div className="w-14 h-14 rounded-md bg-[var(--bg-muted)] shrink-0 flex items-center justify-center">
          <Newspaper size={18} className="text-[var(--text-dim)]" />
        </div>
      )}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold text-[var(--text-primary)] leading-snug line-clamp-3 hover:text-[var(--accent-primary)] transition-colors"
        >
          {article.title}
        </a>
        <div className="flex items-center gap-2 text-[10px] text-[var(--text-dim)]">
          <span className="font-semibold text-[var(--text-muted)] truncate max-w-[120px]">
            {article.source}
          </span>
          <span>·</span>
          <span>{ageLabel}</span>
        </div>
        <button
          onClick={onJumpToBar}
          className="flex items-center gap-1 text-[10px] font-medium text-[#A855F7] hover:text-[#C084FC] mt-0.5 transition-colors self-start"
        >
          <ArrowRight size={10} />
          Jump to chart
        </button>
      </div>
    </div>
  );
}
