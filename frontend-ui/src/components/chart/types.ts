import { Time } from "lightweight-charts";

export type ChartMode = "candlestick" | "bar" | "line" | "area" | "heikinAshi";

export type Timeframe = "1D" | "1W" | "1M" | "6M" | "1Y" | "5Y";

export type IndicatorId =
  | "ma20"
  | "ma50"
  | "ma200"
  | "ema9"
  | "ema21"
  | "bollinger"
  | "vwap"
  | "volume"
  | "rsi"
  | "macd"
  | "stochastic"
  | "atr"
  | "obv";

export interface IndicatorMeta {
  id: IndicatorId;
  label: string;
  shortLabel: string;
  description: string;
  pane: "main" | "sub";
  color: string;
  category: "trend" | "momentum" | "volume" | "volatility";
  /** Minimum number of bars required to compute the first indicator value. */
  minBars: number;
}

export const INDICATOR_CATALOG: Record<IndicatorId, IndicatorMeta> = {
  ma20: {
    id: "ma20",
    label: "Moving Average (20)",
    shortLabel: "MA20",
    description: "20-period simple moving average",
    pane: "main",
    color: "#FFD700",
    category: "trend",
    minBars: 20,
  },
  ma50: {
    id: "ma50",
    label: "Moving Average (50)",
    shortLabel: "MA50",
    description: "50-period simple moving average",
    pane: "main",
    color: "#FF8C00",
    category: "trend",
    minBars: 50,
  },
  ma200: {
    id: "ma200",
    label: "Moving Average (200)",
    shortLabel: "MA200",
    description: "200-period simple moving average",
    pane: "main",
    color: "#FF4500",
    category: "trend",
    minBars: 200,
  },
  ema9: {
    id: "ema9",
    label: "Exponential MA (9)",
    shortLabel: "EMA9",
    description: "9-period exponential moving average",
    pane: "main",
    color: "#00E5FF",
    category: "trend",
    minBars: 9,
  },
  ema21: {
    id: "ema21",
    label: "Exponential MA (21)",
    shortLabel: "EMA21",
    description: "21-period exponential moving average",
    pane: "main",
    color: "#7C4DFF",
    category: "trend",
    minBars: 21,
  },
  bollinger: {
    id: "bollinger",
    label: "Bollinger Bands",
    shortLabel: "BOLL",
    description: "20-period, 2σ bands",
    pane: "main",
    color: "#9CA3AF",
    category: "volatility",
    minBars: 20,
  },
  vwap: {
    id: "vwap",
    label: "VWAP",
    shortLabel: "VWAP",
    description: "Volume-weighted average price (session)",
    pane: "main",
    color: "#EC4899",
    category: "volume",
    minBars: 1,
  },
  volume: {
    id: "volume",
    label: "Volume",
    shortLabel: "VOL",
    description: "Trading volume histogram",
    pane: "sub",
    color: "#6B7280",
    category: "volume",
    minBars: 1,
  },
  rsi: {
    id: "rsi",
    label: "Relative Strength Index",
    shortLabel: "RSI",
    description: "14-period RSI with 30/70 levels",
    pane: "sub",
    color: "#A855F7",
    category: "momentum",
    minBars: 15,
  },
  macd: {
    id: "macd",
    label: "MACD",
    shortLabel: "MACD",
    description: "12/26/9 moving average convergence divergence",
    pane: "sub",
    color: "#06B6D4",
    category: "momentum",
    minBars: 35,
  },
  stochastic: {
    id: "stochastic",
    label: "Stochastic",
    shortLabel: "STOCH",
    description: "14/3 stochastic oscillator",
    pane: "sub",
    color: "#F59E0B",
    category: "momentum",
    minBars: 17,
  },
  atr: {
    id: "atr",
    label: "Average True Range",
    shortLabel: "ATR",
    description: "14-period ATR (volatility)",
    pane: "sub",
    color: "#10B981",
    category: "volatility",
    minBars: 15,
  },
  obv: {
    id: "obv",
    label: "On-Balance Volume",
    shortLabel: "OBV",
    description: "Cumulative volume flow",
    pane: "sub",
    color: "#F97316",
    category: "volume",
    minBars: 2,
  },
};

export type DrawingTool =
  | "cursor"
  | "trendline"
  | "horizontalLine"
  | "verticalLine"
  | "rectangle"
  | "fibonacci"
  | "text";

export interface DrawingBase {
  id: string;
  tool: DrawingTool;
  color: string;
}

export interface PricePoint {
  time: Time;
  price: number;
}

export interface TrendlineDrawing extends DrawingBase {
  tool: "trendline";
  start: PricePoint;
  end: PricePoint;
}

export interface HorizontalLineDrawing extends DrawingBase {
  tool: "horizontalLine";
  price: number;
}

export interface VerticalLineDrawing extends DrawingBase {
  tool: "verticalLine";
  time: Time;
}

export interface RectangleDrawing extends DrawingBase {
  tool: "rectangle";
  start: PricePoint;
  end: PricePoint;
}

export interface FibonacciDrawing extends DrawingBase {
  tool: "fibonacci";
  start: PricePoint;
  end: PricePoint;
}

export interface TextDrawing extends DrawingBase {
  tool: "text";
  point: PricePoint;
  text: string;
}

export type Drawing =
  | TrendlineDrawing
  | HorizontalLineDrawing
  | VerticalLineDrawing
  | RectangleDrawing
  | FibonacciDrawing
  | TextDrawing;

export interface ChartState {
  symbol: string;
  timeframe: Timeframe;
  mode: ChartMode;
  logScale: boolean;
  indicators: IndicatorId[];
  drawings: Drawing[];
}
