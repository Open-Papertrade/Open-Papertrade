/**
 * Pure-function technical indicators computed from OHLCV bars.
 *
 * Each function takes an array of bars (or a numeric series) and returns
 * a series of { time, value } points aligned with the input times.
 * Missing leading values (while warming up) are skipped, not zero-filled.
 */

export interface Bar {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorPoint {
  time: string | number;
  value: number;
}

export interface MultiIndicatorPoint {
  time: string | number;
  [key: string]: string | number;
}

// ---- Moving averages ----

export function sma(bars: Bar[], period: number, source: "close" | "open" | "high" | "low" = "close"): IndicatorPoint[] {
  const out: IndicatorPoint[] = [];
  if (bars.length < period) return out;
  let sum = 0;
  for (let i = 0; i < bars.length; i++) {
    sum += bars[i][source];
    if (i >= period) sum -= bars[i - period][source];
    if (i >= period - 1) out.push({ time: bars[i].time, value: sum / period });
  }
  return out;
}

export function ema(bars: Bar[], period: number, source: "close" | "open" | "high" | "low" = "close"): IndicatorPoint[] {
  const out: IndicatorPoint[] = [];
  if (bars.length < period) return out;
  const k = 2 / (period + 1);
  // Seed with SMA of first `period` values
  let prev = 0;
  for (let i = 0; i < period; i++) prev += bars[i][source];
  prev /= period;
  out.push({ time: bars[period - 1].time, value: prev });
  for (let i = period; i < bars.length; i++) {
    const next = bars[i][source] * k + prev * (1 - k);
    out.push({ time: bars[i].time, value: next });
    prev = next;
  }
  return out;
}

export function wma(bars: Bar[], period: number, source: "close" | "open" | "high" | "low" = "close"): IndicatorPoint[] {
  const out: IndicatorPoint[] = [];
  if (bars.length < period) return out;
  const denom = (period * (period + 1)) / 2;
  for (let i = period - 1; i < bars.length; i++) {
    let weighted = 0;
    for (let j = 0; j < period; j++) {
      weighted += bars[i - j][source] * (period - j);
    }
    out.push({ time: bars[i].time, value: weighted / denom });
  }
  return out;
}

// ---- VWAP (session-based — resets each day) ----

export function vwap(bars: Bar[]): IndicatorPoint[] {
  const out: IndicatorPoint[] = [];
  let cumPV = 0;
  let cumV = 0;
  let currentSession = "";
  for (const bar of bars) {
    const session = typeof bar.time === "string" ? bar.time.slice(0, 10) : new Date(Number(bar.time) * 1000).toISOString().slice(0, 10);
    if (session !== currentSession) {
      cumPV = 0;
      cumV = 0;
      currentSession = session;
    }
    const typical = (bar.high + bar.low + bar.close) / 3;
    cumPV += typical * bar.volume;
    cumV += bar.volume;
    if (cumV > 0) out.push({ time: bar.time, value: cumPV / cumV });
  }
  return out;
}

// ---- Bollinger Bands ----

export interface BollingerPoint {
  time: string | number;
  middle: number;
  upper: number;
  lower: number;
}

export function bollinger(bars: Bar[], period = 20, stdDev = 2): BollingerPoint[] {
  const out: BollingerPoint[] = [];
  if (bars.length < period) return out;
  for (let i = period - 1; i < bars.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += bars[j].close;
    const mean = sum / period;
    let variance = 0;
    for (let j = i - period + 1; j <= i; j++) {
      variance += (bars[j].close - mean) ** 2;
    }
    const sd = Math.sqrt(variance / period);
    out.push({
      time: bars[i].time,
      middle: mean,
      upper: mean + stdDev * sd,
      lower: mean - stdDev * sd,
    });
  }
  return out;
}

// ---- RSI ----

export function rsi(bars: Bar[], period = 14): IndicatorPoint[] {
  const out: IndicatorPoint[] = [];
  if (bars.length <= period) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = bars[i].close - bars[i - 1].close;
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  gain /= period;
  loss /= period;
  const firstRs = loss === 0 ? 100 : gain / loss;
  out.push({ time: bars[period].time, value: loss === 0 ? 100 : 100 - 100 / (1 + firstRs) });
  for (let i = period + 1; i < bars.length; i++) {
    const diff = bars[i].close - bars[i - 1].close;
    const g = diff > 0 ? diff : 0;
    const l = diff < 0 ? -diff : 0;
    gain = (gain * (period - 1) + g) / period;
    loss = (loss * (period - 1) + l) / period;
    const rs = loss === 0 ? 100 : gain / loss;
    out.push({ time: bars[i].time, value: loss === 0 ? 100 : 100 - 100 / (1 + rs) });
  }
  return out;
}

// ---- MACD ----

export interface MACDPoint {
  time: string | number;
  macd: number;
  signal: number;
  histogram: number;
}

export function macd(bars: Bar[], fast = 12, slow = 26, signalPeriod = 9): MACDPoint[] {
  const fastEma = ema(bars, fast);
  const slowEma = ema(bars, slow);
  if (slowEma.length === 0) return [];

  // Align fast EMA to slow EMA's start
  const offset = fastEma.length - slowEma.length;
  const macdLine: IndicatorPoint[] = [];
  for (let i = 0; i < slowEma.length; i++) {
    macdLine.push({
      time: slowEma[i].time,
      value: fastEma[i + offset].value - slowEma[i].value,
    });
  }

  // Signal = EMA of MACD line
  const signalLine: IndicatorPoint[] = [];
  if (macdLine.length >= signalPeriod) {
    const k = 2 / (signalPeriod + 1);
    let seed = 0;
    for (let i = 0; i < signalPeriod; i++) seed += macdLine[i].value;
    seed /= signalPeriod;
    signalLine.push({ time: macdLine[signalPeriod - 1].time, value: seed });
    let prev = seed;
    for (let i = signalPeriod; i < macdLine.length; i++) {
      const next = macdLine[i].value * k + prev * (1 - k);
      signalLine.push({ time: macdLine[i].time, value: next });
      prev = next;
    }
  }

  const signalOffset = macdLine.length - signalLine.length;
  const out: MACDPoint[] = [];
  for (let i = 0; i < signalLine.length; i++) {
    const macdVal = macdLine[i + signalOffset].value;
    const sig = signalLine[i].value;
    out.push({ time: signalLine[i].time, macd: macdVal, signal: sig, histogram: macdVal - sig });
  }
  return out;
}

// ---- Stochastic Oscillator ----

export interface StochasticPoint {
  time: string | number;
  k: number;
  d: number;
}

export function stochastic(bars: Bar[], kPeriod = 14, dPeriod = 3): StochasticPoint[] {
  const out: StochasticPoint[] = [];
  if (bars.length < kPeriod) return out;
  const kSeries: IndicatorPoint[] = [];
  for (let i = kPeriod - 1; i < bars.length; i++) {
    let high = -Infinity;
    let low = Infinity;
    for (let j = i - kPeriod + 1; j <= i; j++) {
      if (bars[j].high > high) high = bars[j].high;
      if (bars[j].low < low) low = bars[j].low;
    }
    const k = high === low ? 50 : ((bars[i].close - low) / (high - low)) * 100;
    kSeries.push({ time: bars[i].time, value: k });
  }
  for (let i = dPeriod - 1; i < kSeries.length; i++) {
    let sum = 0;
    for (let j = i - dPeriod + 1; j <= i; j++) sum += kSeries[j].value;
    out.push({ time: kSeries[i].time, k: kSeries[i].value, d: sum / dPeriod });
  }
  return out;
}

// ---- ATR (Average True Range) ----

export function atr(bars: Bar[], period = 14): IndicatorPoint[] {
  const out: IndicatorPoint[] = [];
  if (bars.length <= period) return out;
  const trs: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const hl = bars[i].high - bars[i].low;
    const hc = Math.abs(bars[i].high - bars[i - 1].close);
    const lc = Math.abs(bars[i].low - bars[i - 1].close);
    trs.push(Math.max(hl, hc, lc));
  }
  let avg = 0;
  for (let i = 0; i < period; i++) avg += trs[i];
  avg /= period;
  out.push({ time: bars[period].time, value: avg });
  for (let i = period; i < trs.length; i++) {
    avg = (avg * (period - 1) + trs[i]) / period;
    out.push({ time: bars[i + 1].time, value: avg });
  }
  return out;
}

// ---- OBV (On-Balance Volume) ----

export function obv(bars: Bar[]): IndicatorPoint[] {
  const out: IndicatorPoint[] = [];
  if (bars.length === 0) return out;
  let total = 0;
  out.push({ time: bars[0].time, value: 0 });
  for (let i = 1; i < bars.length; i++) {
    if (bars[i].close > bars[i - 1].close) total += bars[i].volume;
    else if (bars[i].close < bars[i - 1].close) total -= bars[i].volume;
    out.push({ time: bars[i].time, value: total });
  }
  return out;
}

// ---- Heikin-Ashi transformation ----

export function toHeikinAshi(bars: Bar[]): Bar[] {
  const out: Bar[] = [];
  if (bars.length === 0) return out;
  // First bar stays
  out.push({ ...bars[0] });
  for (let i = 1; i < bars.length; i++) {
    const prev = out[i - 1];
    const cur = bars[i];
    const close = (cur.open + cur.high + cur.low + cur.close) / 4;
    const open = (prev.open + prev.close) / 2;
    const high = Math.max(cur.high, open, close);
    const low = Math.min(cur.low, open, close);
    out.push({ time: cur.time, open, high, low, close, volume: cur.volume });
  }
  return out;
}
