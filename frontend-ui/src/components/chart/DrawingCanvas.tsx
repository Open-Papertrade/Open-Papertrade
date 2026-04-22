"use client";

import { useEffect, useRef, useCallback } from "react";
import { IChartApi, ISeriesApi, SeriesType, Time } from "lightweight-charts";
import { Drawing, DrawingTool, PricePoint } from "./types";

interface DrawingCanvasProps {
  chart: IChartApi | null;
  priceSeries: ISeriesApi<SeriesType> | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  activeTool: DrawingTool;
  drawings: Drawing[];
  onDrawingComplete: (drawing: Drawing) => void;
  defaultColor?: string;
}

const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
const FIB_COLORS = ["#EF4444", "#F59E0B", "#FFD700", "#10B981", "#06B6D4", "#A855F7", "#EC4899"];

export default function DrawingCanvas({
  chart,
  priceSeries,
  containerRef,
  activeTool,
  drawings,
  onDrawingComplete,
  defaultColor = "#FF5C00",
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inProgressRef = useRef<{ start: PricePoint | null }>({ start: null });
  const mousePosRef = useRef<{ x: number; y: number } | null>(null);

  // Convert pixel → (time, price) via chart APIs
  const pixelToPricePoint = useCallback(
    (x: number, y: number): PricePoint | null => {
      if (!chart || !priceSeries) return null;
      const time = chart.timeScale().coordinateToTime(x);
      const price = priceSeries.coordinateToPrice(y);
      if (time === null || price === null) return null;
      return { time: time as Time, price };
    },
    [chart, priceSeries]
  );

  const pricePointToPixel = useCallback(
    (point: PricePoint): { x: number; y: number } | null => {
      if (!chart || !priceSeries) return null;
      const x = chart.timeScale().timeToCoordinate(point.time);
      const y = priceSeries.priceToCoordinate(point.price);
      if (x === null || y === null) return null;
      return { x, y };
    },
    [chart, priceSeries]
  );

  // Core render
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

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

    // Render persisted drawings
    for (const d of drawings) {
      ctx.strokeStyle = d.color;
      ctx.fillStyle = d.color;
      ctx.lineWidth = 1.5;

      if (d.tool === "trendline") {
        const a = pricePointToPixel(d.start);
        const b = pricePointToPixel(d.end);
        if (a && b) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
          drawHandle(ctx, a.x, a.y, d.color);
          drawHandle(ctx, b.x, b.y, d.color);
        }
      } else if (d.tool === "rectangle") {
        const a = pricePointToPixel(d.start);
        const b = pricePointToPixel(d.end);
        if (a && b) {
          const x = Math.min(a.x, b.x);
          const y = Math.min(a.y, b.y);
          const w = Math.abs(b.x - a.x);
          const h = Math.abs(b.y - a.y);
          ctx.fillStyle = `${d.color}22`;
          ctx.fillRect(x, y, w, h);
          ctx.strokeStyle = d.color;
          ctx.strokeRect(x, y, w, h);
        }
      } else if (d.tool === "fibonacci") {
        const a = pricePointToPixel(d.start);
        const b = pricePointToPixel(d.end);
        if (a && b) {
          const x1 = Math.min(a.x, b.x);
          const x2 = Math.max(a.x, b.x);
          const highPrice = Math.max(d.start.price, d.end.price);
          const lowPrice = Math.min(d.start.price, d.end.price);
          const range = highPrice - lowPrice;
          FIB_LEVELS.forEach((level, i) => {
            const price = highPrice - range * level;
            const y = priceSeries?.priceToCoordinate(price);
            if (y === null || y === undefined) return;
            ctx.strokeStyle = FIB_COLORS[i];
            ctx.fillStyle = FIB_COLORS[i];
            ctx.beginPath();
            ctx.moveTo(x1, y);
            ctx.lineTo(x2, y);
            ctx.stroke();
            ctx.font = "10px 'DM Mono', monospace";
            ctx.fillText(
              `${(level * 100).toFixed(1)}% · ${price.toFixed(2)}`,
              x2 + 4,
              y - 2
            );
          });
          // Outline
          ctx.strokeStyle = d.color;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      } else if (d.tool === "text") {
        const p = pricePointToPixel(d.point);
        if (p) {
          ctx.font = "12px 'DM Mono', monospace";
          ctx.fillStyle = d.color;
          ctx.fillText(d.text, p.x + 6, p.y);
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Render in-progress preview
    const inProgress = inProgressRef.current.start;
    const mouse = mousePosRef.current;
    if (inProgress && mouse && (activeTool === "trendline" || activeTool === "rectangle" || activeTool === "fibonacci")) {
      const a = pricePointToPixel(inProgress);
      if (a) {
        ctx.strokeStyle = defaultColor;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        if (activeTool === "trendline") {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        } else if (activeTool === "rectangle") {
          const x = Math.min(a.x, mouse.x);
          const y = Math.min(a.y, mouse.y);
          const w = Math.abs(mouse.x - a.x);
          const h = Math.abs(mouse.y - a.y);
          ctx.strokeRect(x, y, w, h);
        } else if (activeTool === "fibonacci") {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }
    }
  }, [drawings, activeTool, pricePointToPixel, priceSeries, containerRef, defaultColor]);

  // Subscribe to chart pan/zoom events to re-render
  useEffect(() => {
    if (!chart) return;
    const unsub = () => {
      render();
    };
    chart.timeScale().subscribeVisibleTimeRangeChange(unsub);
    chart.timeScale().subscribeVisibleLogicalRangeChange(unsub);
    render();
    const ro = new ResizeObserver(render);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => {
      chart.timeScale().unsubscribeVisibleTimeRangeChange(unsub);
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(unsub);
      ro.disconnect();
    };
  }, [chart, render, containerRef]);

  // Re-render on drawings/active tool change
  useEffect(() => {
    render();
  }, [drawings, activeTool, render]);

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === "cursor") return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const point = pixelToPricePoint(x, y);
    if (!point) return;

    if (activeTool === "horizontalLine") {
      onDrawingComplete({
        id: `draw_${Date.now()}`,
        tool: "horizontalLine",
        color: defaultColor,
        price: point.price,
      });
      return;
    }
    if (activeTool === "verticalLine") {
      onDrawingComplete({
        id: `draw_${Date.now()}`,
        tool: "verticalLine",
        color: defaultColor,
        time: point.time,
      });
      return;
    }
    if (activeTool === "text") {
      const text = prompt("Annotation text:");
      if (text) {
        onDrawingComplete({
          id: `draw_${Date.now()}`,
          tool: "text",
          color: defaultColor,
          point,
          text,
        });
      }
      return;
    }

    // Two-point tools
    if (!inProgressRef.current.start) {
      inProgressRef.current.start = point;
      mousePosRef.current = { x, y };
    } else {
      const start = inProgressRef.current.start;
      if (activeTool === "trendline") {
        onDrawingComplete({
          id: `draw_${Date.now()}`,
          tool: "trendline",
          color: defaultColor,
          start,
          end: point,
        });
      } else if (activeTool === "rectangle") {
        onDrawingComplete({
          id: `draw_${Date.now()}`,
          tool: "rectangle",
          color: defaultColor,
          start,
          end: point,
        });
      } else if (activeTool === "fibonacci") {
        onDrawingComplete({
          id: `draw_${Date.now()}`,
          tool: "fibonacci",
          color: defaultColor,
          start,
          end: point,
        });
      }
      inProgressRef.current.start = null;
      mousePosRef.current = null;
      render();
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!inProgressRef.current.start) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    mousePosRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    render();
  };

  // ESC cancels in-progress drawing
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        inProgressRef.current.start = null;
        mousePosRef.current = null;
        render();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [render]);

  const interactive = activeTool !== "cursor";

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      className={`absolute inset-0 ${interactive ? "cursor-crosshair" : "pointer-events-none"}`}
      style={{ zIndex: 5 }}
    />
  );
}

function drawHandle(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.save();
  ctx.fillStyle = "#0a0a0a";
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
