/**
 * Simple pivot-based chart pattern detection.
 *
 * Detects double tops/bottoms, head & shoulders, and triangles by
 * identifying pivot highs/lows in the bar series and looking for
 * characteristic geometric relationships.
 *
 * These heuristics are intentionally loose — they flag candidate
 * patterns, not confirmed ones. Users should interpret results critically.
 */

import { Bar } from "./indicators";

export type PatternType =
  | "double_top"
  | "double_bottom"
  | "head_and_shoulders"
  | "inverse_head_and_shoulders"
  | "ascending_triangle"
  | "descending_triangle"
  | "symmetrical_triangle";

export interface DetectedPattern {
  type: PatternType;
  label: string;
  bias: "bullish" | "bearish" | "neutral";
  startIndex: number;
  endIndex: number;
  points: number[]; // bar indices that form the pattern
  confidence: number; // 0-1
}

interface Pivot {
  index: number;
  price: number;
  type: "high" | "low";
}

/** Find pivot highs and lows with `lookback` bars on each side. */
function findPivots(bars: Bar[], lookback = 5): Pivot[] {
  const pivots: Pivot[] = [];
  for (let i = lookback; i < bars.length - lookback; i++) {
    let isHigh = true;
    let isLow = true;
    for (let j = 1; j <= lookback; j++) {
      if (bars[i].high <= bars[i - j].high || bars[i].high <= bars[i + j].high) isHigh = false;
      if (bars[i].low >= bars[i - j].low || bars[i].low >= bars[i + j].low) isLow = false;
    }
    if (isHigh) pivots.push({ index: i, price: bars[i].high, type: "high" });
    else if (isLow) pivots.push({ index: i, price: bars[i].low, type: "low" });
  }
  return pivots;
}

/** Check if two prices are within `tolerance` (fraction, default 3%). */
function similar(a: number, b: number, tolerance = 0.03): boolean {
  return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b)) < tolerance;
}

/** Double top: two highs near the same level with a trough between them. */
function detectDoubleTops(bars: Bar[], pivots: Pivot[]): DetectedPattern[] {
  const out: DetectedPattern[] = [];
  const highs = pivots.filter((p) => p.type === "high");
  for (let i = 0; i < highs.length - 1; i++) {
    for (let j = i + 1; j < highs.length; j++) {
      const a = highs[i];
      const b = highs[j];
      if (!similar(a.price, b.price, 0.02)) continue;
      if (b.index - a.index < 5 || b.index - a.index > 80) continue;

      // Find lowest low between them
      let troughIndex = a.index;
      let troughPrice = Infinity;
      for (let k = a.index + 1; k < b.index; k++) {
        if (bars[k].low < troughPrice) {
          troughPrice = bars[k].low;
          troughIndex = k;
        }
      }
      // Trough should be at least 3% below peaks
      if ((a.price - troughPrice) / a.price < 0.03) continue;

      out.push({
        type: "double_top",
        label: "Double Top",
        bias: "bearish",
        startIndex: a.index,
        endIndex: b.index,
        points: [a.index, troughIndex, b.index],
        confidence: 1 - Math.abs(a.price - b.price) / Math.max(a.price, b.price),
      });
      break; // don't double-count the same first peak
    }
  }
  return out;
}

/** Double bottom: two lows near the same level with a peak between. */
function detectDoubleBottoms(bars: Bar[], pivots: Pivot[]): DetectedPattern[] {
  const out: DetectedPattern[] = [];
  const lows = pivots.filter((p) => p.type === "low");
  for (let i = 0; i < lows.length - 1; i++) {
    for (let j = i + 1; j < lows.length; j++) {
      const a = lows[i];
      const b = lows[j];
      if (!similar(a.price, b.price, 0.02)) continue;
      if (b.index - a.index < 5 || b.index - a.index > 80) continue;

      let peakIndex = a.index;
      let peakPrice = -Infinity;
      for (let k = a.index + 1; k < b.index; k++) {
        if (bars[k].high > peakPrice) {
          peakPrice = bars[k].high;
          peakIndex = k;
        }
      }
      if ((peakPrice - a.price) / a.price < 0.03) continue;

      out.push({
        type: "double_bottom",
        label: "Double Bottom",
        bias: "bullish",
        startIndex: a.index,
        endIndex: b.index,
        points: [a.index, peakIndex, b.index],
        confidence: 1 - Math.abs(a.price - b.price) / Math.max(a.price, b.price),
      });
      break;
    }
  }
  return out;
}

/** H&S: three peaks where middle is higher, outer two are similar. */
function detectHeadAndShoulders(pivots: Pivot[]): DetectedPattern[] {
  const out: DetectedPattern[] = [];
  const highs = pivots.filter((p) => p.type === "high");
  for (let i = 0; i < highs.length - 2; i++) {
    const left = highs[i];
    const head = highs[i + 1];
    const right = highs[i + 2];
    if (head.price < left.price || head.price < right.price) continue;
    if (!similar(left.price, right.price, 0.04)) continue;
    if ((head.price - left.price) / left.price < 0.03) continue;
    if (right.index - left.index > 80) continue;

    out.push({
      type: "head_and_shoulders",
      label: "Head & Shoulders",
      bias: "bearish",
      startIndex: left.index,
      endIndex: right.index,
      points: [left.index, head.index, right.index],
      confidence: 1 - Math.abs(left.price - right.price) / Math.max(left.price, right.price),
    });
  }
  return out;
}

/** Inverse H&S: three troughs where middle is lower, outer two are similar. */
function detectInverseHeadAndShoulders(pivots: Pivot[]): DetectedPattern[] {
  const out: DetectedPattern[] = [];
  const lows = pivots.filter((p) => p.type === "low");
  for (let i = 0; i < lows.length - 2; i++) {
    const left = lows[i];
    const head = lows[i + 1];
    const right = lows[i + 2];
    if (head.price > left.price || head.price > right.price) continue;
    if (!similar(left.price, right.price, 0.04)) continue;
    if ((left.price - head.price) / left.price < 0.03) continue;
    if (right.index - left.index > 80) continue;

    out.push({
      type: "inverse_head_and_shoulders",
      label: "Inverse Head & Shoulders",
      bias: "bullish",
      startIndex: left.index,
      endIndex: right.index,
      points: [left.index, head.index, right.index],
      confidence: 1 - Math.abs(left.price - right.price) / Math.max(left.price, right.price),
    });
  }
  return out;
}

/** Linear regression slope over a set of (x, y) points. */
function slope(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

/** Triangle patterns: converging trendlines. */
function detectTriangles(bars: Bar[], pivots: Pivot[]): DetectedPattern[] {
  const out: DetectedPattern[] = [];
  if (pivots.length < 4) return out;

  // Sliding window over last N pivots
  const windowSize = 6;
  for (let start = 0; start <= pivots.length - windowSize; start++) {
    const window = pivots.slice(start, start + windowSize);
    const highs = window.filter((p) => p.type === "high");
    const lows = window.filter((p) => p.type === "low");
    if (highs.length < 2 || lows.length < 2) continue;

    const highSlope = slope(highs.map((p) => p.index), highs.map((p) => p.price));
    const lowSlope = slope(lows.map((p) => p.index), lows.map((p) => p.price));

    const firstIndex = window[0].index;
    const lastIndex = window[window.length - 1].index;
    if (lastIndex - firstIndex > 60) continue;

    const avgPrice = bars[firstIndex].close;
    // Normalise slopes per-percentage so comparison is scale-free
    const hSlopePct = (highSlope * (lastIndex - firstIndex)) / avgPrice;
    const lSlopePct = (lowSlope * (lastIndex - firstIndex)) / avgPrice;

    // Ascending triangle: flat highs, rising lows
    if (Math.abs(hSlopePct) < 0.02 && lSlopePct > 0.02) {
      out.push({
        type: "ascending_triangle",
        label: "Ascending Triangle",
        bias: "bullish",
        startIndex: firstIndex,
        endIndex: lastIndex,
        points: window.map((p) => p.index),
        confidence: Math.min(1, lSlopePct / 0.1),
      });
    }
    // Descending triangle
    else if (Math.abs(lSlopePct) < 0.02 && hSlopePct < -0.02) {
      out.push({
        type: "descending_triangle",
        label: "Descending Triangle",
        bias: "bearish",
        startIndex: firstIndex,
        endIndex: lastIndex,
        points: window.map((p) => p.index),
        confidence: Math.min(1, Math.abs(hSlopePct) / 0.1),
      });
    }
    // Symmetric: opposite slopes, converging
    else if (hSlopePct < -0.01 && lSlopePct > 0.01) {
      out.push({
        type: "symmetrical_triangle",
        label: "Symmetrical Triangle",
        bias: "neutral",
        startIndex: firstIndex,
        endIndex: lastIndex,
        points: window.map((p) => p.index),
        confidence: Math.min(1, (Math.abs(hSlopePct) + Math.abs(lSlopePct)) / 0.15),
      });
    }
  }
  return out;
}

export function detectPatterns(bars: Bar[]): DetectedPattern[] {
  if (bars.length < 20) return [];
  const pivots = findPivots(bars, 5);
  const out: DetectedPattern[] = [
    ...detectDoubleTops(bars, pivots),
    ...detectDoubleBottoms(bars, pivots),
    ...detectHeadAndShoulders(pivots),
    ...detectInverseHeadAndShoulders(pivots),
    ...detectTriangles(bars, pivots),
  ];
  // De-duplicate overlapping patterns, keep higher confidence
  out.sort((a, b) => b.confidence - a.confidence);
  const kept: DetectedPattern[] = [];
  for (const p of out) {
    const overlaps = kept.some(
      (k) => !(p.endIndex < k.startIndex || p.startIndex > k.endIndex)
    );
    if (!overlaps) kept.push(p);
  }
  return kept.sort((a, b) => a.startIndex - b.startIndex);
}
