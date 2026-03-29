/**
 * Pre-built strategy templates users can clone and customize.
 */

import type { StrategyConfig, TemplateCategory } from '@/types/backtesting';

export interface StrategyTemplate {
  name: string;
  description: string;
  category: TemplateCategory;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  config: StrategyConfig;
}

export const STRATEGY_TEMPLATES: StrategyTemplate[] = [
  // ── Beginner ────────────────────────────────────────────────
  {
    name: 'RSI Mean Reversion',
    description: 'Buy when RSI drops below 30 (oversold), sell when it rises above 70 (overbought). Classic mean-reversion approach for range-bound markets.',
    category: 'MEAN_REVERSION',
    difficulty: 'Beginner',
    config: {
      indicators: [
        { id: 'rsi1', type: 'RSI', params: { period: 14 }, source: 'close' },
      ],
      entryConditions: {
        logic: 'AND',
        rules: [
          { id: 'e1', leftOperand: 'RSI_14', operator: 'LESS_THAN', rightType: 'NUMBER', rightValue: 30 },
        ],
      },
      exitConditions: {
        logic: 'AND',
        rules: [
          { id: 'x1', leftOperand: 'RSI_14', operator: 'GREATER_THAN', rightType: 'NUMBER', rightValue: 70 },
        ],
      },
      positionSizing: { method: 'PERCENT_PORTFOLIO', value: 20 },
      stopLoss: { type: 'PERCENT', value: 5 },
      takeProfit: { type: 'PERCENT', value: 15 },
      tradeDirection: 'LONG',
    },
  },

  {
    name: 'Golden Cross',
    description: 'Buy when the 50-day SMA crosses above the 200-day SMA (golden cross). Sell on the death cross. One of the most recognized trend signals.',
    category: 'TREND_FOLLOWING',
    difficulty: 'Beginner',
    config: {
      indicators: [
        { id: 'sma50', type: 'SMA', params: { period: 50 }, source: 'close' },
        { id: 'sma200', type: 'SMA', params: { period: 200 }, source: 'close' },
      ],
      entryConditions: {
        logic: 'AND',
        rules: [
          { id: 'e1', leftOperand: 'SMA_50', operator: 'CROSSES_ABOVE', rightType: 'INDICATOR', rightValue: 'SMA_200' },
        ],
      },
      exitConditions: {
        logic: 'AND',
        rules: [
          { id: 'x1', leftOperand: 'SMA_50', operator: 'CROSSES_BELOW', rightType: 'INDICATOR', rightValue: 'SMA_200' },
        ],
      },
      positionSizing: { method: 'PERCENT_PORTFOLIO', value: 30 },
      stopLoss: { type: 'PERCENT', value: 8 },
      tradeDirection: 'LONG',
    },
  },

  // ── Intermediate ────────────────────────────────────────────
  {
    name: 'MACD Momentum',
    description: 'Enter when MACD line crosses above the signal line (bullish momentum). Exit on bearish crossover. Works well in trending markets.',
    category: 'MOMENTUM',
    difficulty: 'Intermediate',
    config: {
      indicators: [
        { id: 'macd1', type: 'MACD', params: { fast: 12, slow: 26, signal: 9 }, source: 'close' },
      ],
      entryConditions: {
        logic: 'AND',
        rules: [
          { id: 'e1', leftOperand: 'MACD_LINE', operator: 'CROSSES_ABOVE', rightType: 'INDICATOR', rightValue: 'MACD_SIGNAL' },
        ],
      },
      exitConditions: {
        logic: 'AND',
        rules: [
          { id: 'x1', leftOperand: 'MACD_LINE', operator: 'CROSSES_BELOW', rightType: 'INDICATOR', rightValue: 'MACD_SIGNAL' },
        ],
      },
      positionSizing: { method: 'PERCENT_PORTFOLIO', value: 25 },
      stopLoss: { type: 'PERCENT', value: 6 },
      takeProfit: { type: 'PERCENT', value: 20 },
      tradeDirection: 'LONG',
    },
  },

  {
    name: 'Bollinger Band Bounce',
    description: 'Buy when price touches the lower Bollinger Band (support). Sell at the upper band (resistance). Best in sideways markets with clear ranges.',
    category: 'MEAN_REVERSION',
    difficulty: 'Intermediate',
    config: {
      indicators: [
        { id: 'bb1', type: 'BOLLINGER', params: { period: 20, stdDev: 2 }, source: 'close' },
      ],
      entryConditions: {
        logic: 'AND',
        rules: [
          { id: 'e1', leftOperand: 'PRICE', operator: 'LESS_EQUAL', rightType: 'INDICATOR', rightValue: 'BB_LOWER' },
        ],
      },
      exitConditions: {
        logic: 'AND',
        rules: [
          { id: 'x1', leftOperand: 'PRICE', operator: 'GREATER_EQUAL', rightType: 'INDICATOR', rightValue: 'BB_UPPER' },
        ],
      },
      positionSizing: { method: 'PERCENT_PORTFOLIO', value: 15 },
      stopLoss: { type: 'PERCENT', value: 4 },
      takeProfit: { type: 'PERCENT', value: 12 },
      tradeDirection: 'LONG',
    },
  },

  {
    name: 'Stochastic Reversal',
    description: 'Buy when Stochastic %K crosses above %D below 20 (oversold reversal). Sell when %K crosses below %D above 80 (overbought reversal).',
    category: 'MEAN_REVERSION',
    difficulty: 'Intermediate',
    config: {
      indicators: [
        { id: 'stoch1', type: 'STOCHASTIC', params: { kPeriod: 14, dPeriod: 3 } },
      ],
      entryConditions: {
        logic: 'AND',
        rules: [
          { id: 'e1', leftOperand: 'STOCH_K', operator: 'CROSSES_ABOVE', rightType: 'INDICATOR', rightValue: 'STOCH_D' },
          { id: 'e2', leftOperand: 'STOCH_K', operator: 'LESS_THAN', rightType: 'NUMBER', rightValue: 25 },
        ],
      },
      exitConditions: {
        logic: 'AND',
        rules: [
          { id: 'x1', leftOperand: 'STOCH_K', operator: 'CROSSES_BELOW', rightType: 'INDICATOR', rightValue: 'STOCH_D' },
          { id: 'x2', leftOperand: 'STOCH_K', operator: 'GREATER_THAN', rightType: 'NUMBER', rightValue: 75 },
        ],
      },
      positionSizing: { method: 'PERCENT_PORTFOLIO', value: 20 },
      stopLoss: { type: 'PERCENT', value: 5 },
      takeProfit: { type: 'PERCENT', value: 15 },
      tradeDirection: 'LONG',
    },
  },

  // ── Advanced ────────────────────────────────────────────────
  {
    name: 'Triple EMA Trend',
    description: 'Enter when EMA(8) > EMA(21) > EMA(55) — all three moving averages aligned in a bullish stack. Exit when the stack breaks. Strong trend confirmation.',
    category: 'TREND_FOLLOWING',
    difficulty: 'Advanced',
    config: {
      indicators: [
        { id: 'ema8', type: 'EMA', params: { period: 8 }, source: 'close' },
        { id: 'ema21', type: 'EMA', params: { period: 21 }, source: 'close' },
        { id: 'ema55', type: 'EMA', params: { period: 55 }, source: 'close' },
      ],
      entryConditions: {
        logic: 'AND',
        rules: [
          { id: 'e1', leftOperand: 'EMA_8', operator: 'GREATER_THAN', rightType: 'INDICATOR', rightValue: 'EMA_21' },
          { id: 'e2', leftOperand: 'EMA_21', operator: 'GREATER_THAN', rightType: 'INDICATOR', rightValue: 'EMA_55' },
        ],
      },
      exitConditions: {
        logic: 'OR',
        rules: [
          { id: 'x1', leftOperand: 'EMA_8', operator: 'CROSSES_BELOW', rightType: 'INDICATOR', rightValue: 'EMA_21' },
        ],
      },
      positionSizing: { method: 'PERCENT_PORTFOLIO', value: 30 },
      stopLoss: { type: 'TRAILING_PERCENT', value: 7 },
      tradeDirection: 'LONG',
    },
  },

  {
    name: 'RSI + MACD Confluence',
    description: 'Enter only when both RSI is oversold AND MACD gives a bullish crossover — dual confirmation reduces false signals. Exit on RSI overbought OR MACD bearish cross.',
    category: 'MOMENTUM',
    difficulty: 'Advanced',
    config: {
      indicators: [
        { id: 'rsi1', type: 'RSI', params: { period: 14 }, source: 'close' },
        { id: 'macd1', type: 'MACD', params: { fast: 12, slow: 26, signal: 9 }, source: 'close' },
      ],
      entryConditions: {
        logic: 'AND',
        rules: [
          { id: 'e1', leftOperand: 'RSI_14', operator: 'LESS_THAN', rightType: 'NUMBER', rightValue: 35 },
          { id: 'e2', leftOperand: 'MACD_LINE', operator: 'CROSSES_ABOVE', rightType: 'INDICATOR', rightValue: 'MACD_SIGNAL' },
        ],
      },
      exitConditions: {
        logic: 'OR',
        rules: [
          { id: 'x1', leftOperand: 'RSI_14', operator: 'GREATER_THAN', rightType: 'NUMBER', rightValue: 70 },
          { id: 'x2', leftOperand: 'MACD_LINE', operator: 'CROSSES_BELOW', rightType: 'INDICATOR', rightValue: 'MACD_SIGNAL' },
        ],
      },
      positionSizing: { method: 'PERCENT_RISK', value: 2 },
      stopLoss: { type: 'PERCENT', value: 4 },
      takeProfit: { type: 'RISK_REWARD_RATIO', value: 3 },
      tradeDirection: 'LONG',
      cooldownBars: 5,
    },
  },

  {
    name: 'Volatility Breakout',
    description: 'Enter when price breaks above the upper Bollinger Band with expanding ATR — signals a volatility expansion. Use trailing stop for exits.',
    category: 'BREAKOUT',
    difficulty: 'Advanced',
    config: {
      indicators: [
        { id: 'bb1', type: 'BOLLINGER', params: { period: 20, stdDev: 2 }, source: 'close' },
        { id: 'atr1', type: 'ATR', params: { period: 14 } },
      ],
      entryConditions: {
        logic: 'AND',
        rules: [
          { id: 'e1', leftOperand: 'PRICE', operator: 'CROSSES_ABOVE', rightType: 'INDICATOR', rightValue: 'BB_UPPER' },
        ],
      },
      exitConditions: {
        logic: 'AND',
        rules: [
          { id: 'x1', leftOperand: 'PRICE', operator: 'CROSSES_BELOW', rightType: 'INDICATOR', rightValue: 'BB_MIDDLE' },
        ],
      },
      positionSizing: { method: 'PERCENT_RISK', value: 1.5 },
      stopLoss: { type: 'TRAILING_PERCENT', value: 5 },
      tradeDirection: 'LONG',
    },
  },
];
