/**
 * Client-side storage for strategies and backtest results using localStorage.
 */

import type { StrategyConfig, BacktestResults, BacktestStatistics } from '@/types/backtesting';

export interface SavedStrategy {
  id: string;
  name: string;
  description: string;
  config: StrategyConfig;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface SavedBacktest {
  id: string;
  strategy_name: string;
  symbol: string;
  start_date: string;
  end_date: string;
  initial_capital: number;
  config_snapshot: StrategyConfig;
  results: BacktestResults;
  created_at: string;
}

const STRATEGIES_KEY = 'openpt_strategies';
const BACKTESTS_KEY = 'openpt_backtests';

function uuid(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ── Strategies ──────────────────────────────────────────────────

export function getStrategies(): SavedStrategy[] {
  try {
    return JSON.parse(localStorage.getItem(STRATEGIES_KEY) || '[]');
  } catch {
    return [];
  }
}

export function getStrategy(id: string): SavedStrategy | null {
  return getStrategies().find((s) => s.id === id) || null;
}

export function saveStrategy(data: {
  id?: string;
  name: string;
  description: string;
  config: StrategyConfig;
}): SavedStrategy {
  const strategies = getStrategies();
  const now = new Date().toISOString();

  if (data.id) {
    // Update existing
    const idx = strategies.findIndex((s) => s.id === data.id);
    if (idx >= 0) {
      strategies[idx] = {
        ...strategies[idx],
        name: data.name,
        description: data.description,
        config: data.config,
        updated_at: now,
      };
      localStorage.setItem(STRATEGIES_KEY, JSON.stringify(strategies));
      return strategies[idx];
    }
  }

  // Create new
  const strategy: SavedStrategy = {
    id: data.id || uuid(),
    name: data.name,
    description: data.description,
    config: data.config,
    is_public: false,
    created_at: now,
    updated_at: now,
  };
  strategies.unshift(strategy);
  localStorage.setItem(STRATEGIES_KEY, JSON.stringify(strategies));
  return strategy;
}

export function deleteStrategy(id: string): void {
  const strategies = getStrategies().filter((s) => s.id !== id);
  localStorage.setItem(STRATEGIES_KEY, JSON.stringify(strategies));
}

// ── Backtests ───────────────────────────────────────────────────

export function getBacktests(): SavedBacktest[] {
  try {
    return JSON.parse(localStorage.getItem(BACKTESTS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function getBacktest(id: string): SavedBacktest | null {
  return getBacktests().find((b) => b.id === id) || null;
}

export function saveBacktest(data: {
  strategy_name: string;
  symbol: string;
  start_date: string;
  end_date: string;
  initial_capital: number;
  config_snapshot: StrategyConfig;
  results: BacktestResults;
}): SavedBacktest {
  const backtests = getBacktests();
  const backtest: SavedBacktest = {
    id: uuid(),
    ...data,
    created_at: new Date().toISOString(),
  };
  backtests.unshift(backtest);
  // Keep only last 50 backtests to prevent localStorage overflow
  if (backtests.length > 50) backtests.length = 50;
  localStorage.setItem(BACKTESTS_KEY, JSON.stringify(backtests));
  return backtest;
}

export function deleteBacktest(id: string): void {
  const backtests = getBacktests().filter((b) => b.id !== id);
  localStorage.setItem(BACKTESTS_KEY, JSON.stringify(backtests));
}
