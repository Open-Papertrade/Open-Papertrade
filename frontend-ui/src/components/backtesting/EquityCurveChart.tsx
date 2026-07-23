"use client";

import { useEffect, useRef } from "react";
import type { EquityPoint, BacktestTradeEntry } from "@/types/backtesting";

/**
 * lightweight-charts v5 expects `time` as either "YYYY-MM-DD", a UNIX seconds
 * number, or a {year,month,day} object. Anything else (null, undefined, empty
 * string, ISO datetime with time+Z) makes it crash with
 * "Cannot read properties of undefined (reading 'year')".
 */
function normalizeTime(input: unknown): string | null {
  if (typeof input === "number" && Number.isFinite(input)) {
    // treat as UNIX seconds — return as-is (chart accepts number directly, but for
    // consistency across series we stringify only if the caller wants a string)
    return String(input);
  }
  if (typeof input !== "string" || !input.trim()) return null;
  // "2024-01-15T00:00:00Z" or "2024-01-15T00:00:00.000+05:30" → "2024-01-15"
  const m = input.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

interface Props {
  equityCurve: EquityPoint[];
  trades?: BacktestTradeEntry[];
  initialCapital: number;
  height?: number;
  showDrawdown?: boolean;
  comparisonCurve?: EquityPoint[];
  comparisonLabel?: string;
}

export default function EquityCurveChart({
  equityCurve,
  trades,
  initialCapital,
  height = 380,
  showDrawdown = true,
  comparisonCurve,
  comparisonLabel,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || equityCurve.length === 0) return;

    let cancelled = false;

    import("lightweight-charts").then(
      ({ createChart, ColorType, CrosshairMode, LineSeries, AreaSeries, createSeriesMarkers }) => {
        if (cancelled || !containerRef.current) return;

        // Cleanup previous chart
        if (chartRef.current) {
          chartRef.current.remove();
          chartRef.current = null;
        }

        const chart = createChart(containerRef.current, {
          width: containerRef.current.clientWidth,
          height,
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
            scaleMargins: { top: 0.1, bottom: showDrawdown ? 0.35 : 0.1 },
          },
          timeScale: { borderVisible: false },
          handleScroll: { mouseWheel: true, pressedMouseMove: true },
          handleScale: { mouseWheel: true, pinch: true },
        });

        chartRef.current = chart;

        // Main equity curve
        const equitySeries = chart.addSeries(AreaSeries, {
          topColor: "rgba(255, 92, 0, 0.4)",
          bottomColor: "rgba(255, 92, 0, 0.02)",
          lineColor: "#FF5C00",
          lineWidth: 2,
          priceLineVisible: false,
        });

        equitySeries.setData(
          equityCurve
            .map((p) => {
              const time = normalizeTime(p.date);
              return time && Number.isFinite(p.equity) ? { time, value: p.equity } : null;
            })
            .filter((x): x is { time: string; value: number } => x !== null) as any
        );

        // Comparison curve (if provided)
        if (comparisonCurve && comparisonCurve.length > 0) {
          const compSeries = chart.addSeries(LineSeries, {
            color: "#3B82F6",
            lineWidth: 2,
            priceLineVisible: false,
            title: comparisonLabel || "Manual",
          });
          compSeries.setData(
            comparisonCurve
              .map((p) => {
                const time = normalizeTime(p.date);
                return time && Number.isFinite(p.equity) ? { time, value: p.equity } : null;
              })
              .filter((x): x is { time: string; value: number } => x !== null) as any
          );
        }

        // Initial capital reference line
        equitySeries.createPriceLine({
          price: initialCapital,
          color: "rgba(255, 255, 255, 0.15)",
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: "Initial",
        });

        // Trade markers — v5 uses createSeriesMarkers(series, markers) (moved off the series API).
        if (trades && trades.length > 0) {
          type Marker = {
            time: string;
            position: "belowBar" | "aboveBar";
            color: string;
            shape: "arrowUp" | "arrowDown";
            text: string;
          };
          const markers: Marker[] = trades.flatMap((t) => {
            const result: Marker[] = [];
            const entryTime = normalizeTime(t.entryDate);
            if (entryTime) {
              result.push({
                time: entryTime,
                position: "belowBar",
                color: "#22C55E",
                shape: "arrowUp",
                text: "B",
              });
            }
            const exitTime = normalizeTime(t.exitDate);
            if (exitTime) {
              result.push({
                time: exitTime,
                position: "aboveBar",
                color:
                  t.exitReason === "STOP_LOSS"
                    ? "#EF4444"
                    : t.exitReason === "TAKE_PROFIT"
                    ? "#22C55E"
                    : "#FF5C00",
                shape: "arrowDown",
                text:
                  t.exitReason === "STOP_LOSS"
                    ? "SL"
                    : t.exitReason === "TAKE_PROFIT"
                    ? "TP"
                    : "S",
              });
            }
            return result;
          });
          if (markers.length > 0) {
            markers.sort((a, b) => a.time.localeCompare(b.time));
            createSeriesMarkers(equitySeries, markers as any);
          }
        }

        // Drawdown area (on separate price scale)
        if (showDrawdown) {
          const drawdownSeries = chart.addSeries(AreaSeries, {
            topColor: "rgba(239, 68, 68, 0.01)",
            bottomColor: "rgba(239, 68, 68, 0.25)",
            lineColor: "rgba(239, 68, 68, 0.6)",
            lineWidth: 1,
            priceScaleId: "drawdown",
            priceLineVisible: false,
          });

          chart.priceScale("drawdown").applyOptions({
            scaleMargins: { top: 0.7, bottom: 0 },
          });

          drawdownSeries.setData(
            equityCurve
              .map((p) => {
                const time = normalizeTime(p.date);
                return time && Number.isFinite(p.drawdownPercent)
                  ? { time, value: -p.drawdownPercent }
                  : null;
              })
              .filter((x): x is { time: string; value: number } => x !== null) as any
          );
        }

        chart.timeScale().fitContent();

        const handleResize = () => {
          if (containerRef.current) {
            chart.applyOptions({ width: containerRef.current.clientWidth });
          }
        };
        window.addEventListener("resize", handleResize);

        return () => {
          window.removeEventListener("resize", handleResize);
        };
      }
    );

    return () => {
      cancelled = true;
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [equityCurve, trades, initialCapital, height, showDrawdown, comparisonCurve, comparisonLabel]);

  return <div ref={containerRef} />;
}
