"use client";

import { useEffect, useRef, useCallback } from "react";
import { IChartApi, ISeriesApi, SeriesType } from "lightweight-charts";
import { Bar } from "@/lib/indicators";

interface VolumeProfileProps {
  chart: IChartApi | null;
  priceSeries: ISeriesApi<SeriesType> | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  bars: Bar[];
  buckets?: number;
  widthPct?: number;
}

export default function VolumeProfile({
  chart,
  priceSeries,
  containerRef,
  bars,
  buckets = 40,
  widthPct = 0.18,
}: VolumeProfileProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !chart || !priceSeries || bars.length === 0) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Find visible price range
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    for (const b of bars) {
      if (b.low < minPrice) minPrice = b.low;
      if (b.high > maxPrice) maxPrice = b.high;
    }
    if (!isFinite(minPrice) || !isFinite(maxPrice)) return;

    // Compute volume per bucket
    const range = maxPrice - minPrice;
    if (range <= 0) return;
    const bucketSize = range / buckets;
    const volumes = new Array(buckets).fill(0);
    for (const b of bars) {
      const typical = (b.high + b.low + b.close) / 3;
      const idx = Math.min(buckets - 1, Math.floor((typical - minPrice) / bucketSize));
      volumes[idx] += b.volume;
    }
    const maxVol = Math.max(...volumes);
    if (maxVol === 0) return;

    // Find POC (point of control) — highest volume bucket
    const pocIndex = volumes.indexOf(maxVol);

    // Draw histogram on the LEFT side of the chart
    const profileWidth = rect.width * widthPct;
    const leftPadding = 0;

    for (let i = 0; i < buckets; i++) {
      const bucketMinPrice = minPrice + i * bucketSize;
      const bucketMaxPrice = bucketMinPrice + bucketSize;
      const yTop = priceSeries.priceToCoordinate(bucketMaxPrice);
      const yBottom = priceSeries.priceToCoordinate(bucketMinPrice);
      if (yTop === null || yBottom === null) continue;
      const barH = Math.abs(yBottom - yTop);
      const barW = (volumes[i] / maxVol) * profileWidth;
      const y = Math.min(yTop, yBottom);

      ctx.fillStyle = i === pocIndex ? "rgba(255, 92, 0, 0.5)" : "rgba(156, 163, 175, 0.25)";
      ctx.fillRect(leftPadding, y, barW, Math.max(1, barH - 1));
    }

    // POC line label
    const pocPrice = minPrice + (pocIndex + 0.5) * bucketSize;
    const pocY = priceSeries.priceToCoordinate(pocPrice);
    if (pocY !== null) {
      ctx.fillStyle = "#FF5C00";
      ctx.font = "10px 'DM Mono', monospace";
      ctx.fillText(`POC · ${pocPrice.toFixed(2)}`, profileWidth + 4, pocY + 3);
    }
  }, [chart, priceSeries, containerRef, bars, buckets, widthPct]);

  useEffect(() => {
    if (!chart) return;
    const handler = () => render();
    chart.timeScale().subscribeVisibleLogicalRangeChange(handler);
    render();
    const ro = new ResizeObserver(render);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handler);
      ro.disconnect();
    };
  }, [chart, render, containerRef]);

  useEffect(() => {
    render();
  }, [bars, render]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 4 }}
    />
  );
}
