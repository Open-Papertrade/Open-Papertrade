// ── Indicator Types ──────────────────────────────────────────────
export type IndicatorType =
  | 'RSI'
  | 'SMA'
  | 'EMA'
  | 'MACD'
  | 'BOLLINGER'
  | 'ATR'
  | 'STOCHASTIC'
  | 'VWAP'
  | 'OBV';

export type PriceSource = 'open' | 'high' | 'low' | 'close' | 'volume';

export interface IndicatorConfig {
  id: string;
  type: IndicatorType;
  params: Record<string, number>;
  source?: PriceSource;
}

// ── Condition Types ─────────────────────────────────────────────
export type ConditionOperator =
  | 'LESS_THAN'
  | 'GREATER_THAN'
  | 'LESS_EQUAL'
  | 'GREATER_EQUAL'
  | 'EQUALS'
  | 'CROSSES_ABOVE'
  | 'CROSSES_BELOW';

export type ConditionValueType = 'NUMBER' | 'INDICATOR' | 'PRICE';

export interface ConditionRule {
  id: string;
  leftOperand: string;        // indicator key like "RSI_14" or "PRICE"
  operator: ConditionOperator;
  rightType: ConditionValueType;
  rightValue: number | string; // number or indicator key
}

export type LogicOperator = 'AND' | 'OR';

export interface ConditionGroup {
  logic: LogicOperator;
  rules: ConditionRule[];
}

// ── Position Sizing ─────────────────────────────────────────────
export type PositionSizingMethod =
  | 'FIXED_AMOUNT'
  | 'PERCENT_PORTFOLIO'
  | 'PERCENT_RISK'
  | 'KELLY_CRITERION';

export interface PositionSizingConfig {
  method: PositionSizingMethod;
  value: number;
}

// ── Risk Management ─────────────────────────────────────────────
export type StopLossType = 'PERCENT' | 'ATR_MULTIPLE' | 'FIXED_PRICE' | 'TRAILING_PERCENT';
export type TakeProfitType = 'PERCENT' | 'RISK_REWARD_RATIO' | 'FIXED_PRICE';

export interface StopLossConfig {
  type: StopLossType;
  value: number;
}

export interface TakeProfitConfig {
  type: TakeProfitType;
  value: number;
}

// ── Strategy Config ─────────────────────────────────────────────
export type TradeDirection = 'LONG' | 'SHORT' | 'BOTH';

export type TemplateCategory =
  | 'MOMENTUM'
  | 'MEAN_REVERSION'
  | 'TREND_FOLLOWING'
  | 'BREAKOUT'
  | 'VOLATILITY'
  | 'CUSTOM';

export interface StrategyConfig {
  indicators: IndicatorConfig[];
  entryConditions: ConditionGroup;
  exitConditions: ConditionGroup;
  positionSizing: PositionSizingConfig;
  stopLoss?: StopLossConfig;
  takeProfit?: TakeProfitConfig;
  tradeDirection: TradeDirection;
  maxOpenPositions?: number;
  cooldownBars?: number; // bars to wait after exit before re-entry
}

export interface Strategy {
  id: string;
  user_id: string;
  name: string;
  description: string;
  config: StrategyConfig;
  is_template: boolean;
  is_public: boolean;
  template_category?: TemplateCategory;
  created_at: string;
  updated_at: string;
}

// ── Backtest Results ────────────────────────────────────────────
export interface BacktestTradeEntry {
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  shares: number;
  pnl: number;
  pnlPercent: number;
  direction: 'LONG' | 'SHORT';
  exitReason: 'SIGNAL' | 'STOP_LOSS' | 'TAKE_PROFIT' | 'END_OF_DATA';
  holdingBars: number;
}

export interface EquityPoint {
  date: string;
  equity: number;
  drawdown: number;
  drawdownPercent: number;
}

export interface BacktestStatistics {
  totalReturn: number;
  totalReturnPercent: number;
  cagr: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  avgWin: number;
  avgLoss: number;
  avgWinPercent: number;
  avgLossPercent: number;
  avgHoldingBars: number;
  largestWin: number;
  largestLoss: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  exposurePercent: number;  // % of time in market
  buyAndHoldReturn: number;
  buyAndHoldReturnPercent: number;
}

export interface MonthlyReturn {
  year: number;
  month: number;
  returnPercent: number;
}

export interface BacktestResults {
  equityCurve: EquityPoint[];
  trades: BacktestTradeEntry[];
  statistics: BacktestStatistics;
  monthlyReturns: MonthlyReturn[];
  indicatorData: Record<string, { date: string; value: number }[]>;
  priceData: { date: string; open: number; high: number; low: number; close: number; volume: number }[];
}

export interface Backtest {
  id: string;
  user_id: string;
  strategy_id: string;
  strategy_name?: string;
  symbol: string;
  start_date: string;
  end_date: string;
  initial_capital: number;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  config_snapshot: StrategyConfig;
  results?: BacktestResults;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

// ── Walk-Forward ────────────────────────────────────────────────
export interface WalkForwardWindow {
  inSampleStart: string;
  inSampleEnd: string;
  outOfSampleStart: string;
  outOfSampleEnd: string;
  bestParams: Record<string, number>;
  inSampleReturn: number;
  outOfSampleReturn: number;
}

export interface WalkForwardResult {
  windows: WalkForwardWindow[];
  aggregateReturn: number;
  aggregateEquityCurve: EquityPoint[];
  parameterStability: Record<string, { mean: number; stdDev: number; values: number[] }>;
}

// ── Comparison ──────────────────────────────────────────────────
export interface ComparisonData {
  strategy: {
    equityCurve: EquityPoint[];
    statistics: BacktestStatistics;
    trades: BacktestTradeEntry[];
  };
  manual: {
    equityCurve: EquityPoint[];
    statistics: BacktestStatistics;
    trades: { date: string; type: 'BUY' | 'SELL'; price: number; shares: number }[];
  };
  insights: string[];
}

// ── Default indicator params ────────────────────────────────────
export const INDICATOR_DEFAULTS: Record<IndicatorType, { params: Record<string, number>; source?: PriceSource; description: string }> = {
  RSI:        { params: { period: 14 }, source: 'close', description: 'Relative Strength Index — momentum oscillator (0-100)' },
  SMA:        { params: { period: 20 }, source: 'close', description: 'Simple Moving Average — average price over N periods' },
  EMA:        { params: { period: 20 }, source: 'close', description: 'Exponential Moving Average — weighted toward recent prices' },
  MACD:       { params: { fast: 12, slow: 26, signal: 9 }, source: 'close', description: 'Moving Average Convergence Divergence — trend & momentum' },
  BOLLINGER:  { params: { period: 20, stdDev: 2 }, source: 'close', description: 'Bollinger Bands — volatility bands around a moving average' },
  ATR:        { params: { period: 14 }, description: 'Average True Range — volatility measurement' },
  STOCHASTIC: { params: { kPeriod: 14, dPeriod: 3 }, description: 'Stochastic Oscillator — momentum comparing close to range' },
  VWAP:       { params: {}, description: 'Volume Weighted Average Price — fair value benchmark' },
  OBV:        { params: {}, description: 'On-Balance Volume — cumulative buying/selling pressure' },
};

export const OPERATOR_LABELS: Record<ConditionOperator, string> = {
  LESS_THAN: '<',
  GREATER_THAN: '>',
  LESS_EQUAL: '≤',
  GREATER_EQUAL: '≥',
  EQUALS: '=',
  CROSSES_ABOVE: 'crosses above',
  CROSSES_BELOW: 'crosses below',
};

export const POSITION_SIZING_LABELS: Record<PositionSizingMethod, string> = {
  FIXED_AMOUNT: 'Fixed Dollar Amount',
  PERCENT_PORTFOLIO: '% of Portfolio',
  PERCENT_RISK: '% Risk per Trade',
  KELLY_CRITERION: 'Kelly Criterion',
};

export const STOP_LOSS_LABELS: Record<StopLossType, string> = {
  PERCENT: 'Percentage',
  ATR_MULTIPLE: 'ATR Multiple',
  FIXED_PRICE: 'Fixed Price',
  TRAILING_PERCENT: 'Trailing %',
};

export const TAKE_PROFIT_LABELS: Record<TakeProfitType, string> = {
  PERCENT: 'Percentage',
  RISK_REWARD_RATIO: 'Risk/Reward Ratio',
  FIXED_PRICE: 'Fixed Price',
};

/** Get all indicator output keys for a given indicator config. */
export function getIndicatorKeys(config: IndicatorConfig): string[] {
  switch (config.type) {
    case 'MACD': return ['MACD_LINE', 'MACD_SIGNAL', 'MACD_HIST'];
    case 'BOLLINGER': return ['BB_UPPER', 'BB_MIDDLE', 'BB_LOWER', 'BB_WIDTH'];
    case 'STOCHASTIC': return ['STOCH_K', 'STOCH_D'];
    case 'RSI': return [`RSI_${config.params.period || 14}`];
    case 'SMA': return [`SMA_${config.params.period || 20}`];
    case 'EMA': return [`EMA_${config.params.period || 20}`];
    case 'ATR': return [`ATR_${config.params.period || 14}`];
    case 'VWAP': return ['VWAP'];
    case 'OBV': return ['OBV'];
    default: return [config.type];
  }
}
