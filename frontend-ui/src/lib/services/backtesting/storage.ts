/**
 * Backend-backed persistence for strategies and backtests.
 *
 * All calls hit /api/users/backtesting/... — nothing lives in localStorage anymore.
 * The public function signatures are async now; existing callers must `await`.
 */

import type { StrategyConfig, BacktestResults } from '@/types/backtesting';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
const API_ROOT = `${API_BASE_URL}/users/backtesting`;

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
  strategy_id: string | null;
  strategy_name: string;
  symbol: string;
  start_date: string;
  end_date: string;
  initial_capital: number;
  config_snapshot: StrategyConfig;
  results: BacktestResults;
  created_at: string;
}

/** Compact record returned by the list endpoint (no full results/config). */
export interface BacktestListEntry {
  id: string;
  strategy_id: string | null;
  strategy_name: string;
  symbol: string;
  start_date: string;
  end_date: string;
  initial_capital: number;
  created_at: string;
  summary_stats: {
    totalReturnPercent: number | null;
    winRate: number | null;
    sharpeRatio: number | null;
    maxDrawdownPercent: number | null;
    totalTrades: number | null;
  };
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_ROOT}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

// ── Strategies ──────────────────────────────────────────────────

export async function getStrategies(): Promise<SavedStrategy[]> {
  return api<SavedStrategy[]>('/strategies/');
}

export async function getStrategy(id: string): Promise<SavedStrategy | null> {
  try {
    return await api<SavedStrategy>(`/strategies/${id}/`);
  } catch {
    return null;
  }
}

export async function saveStrategy(data: {
  id?: string;
  name: string;
  description: string;
  config: StrategyConfig;
}): Promise<SavedStrategy> {
  return api<SavedStrategy>('/strategies/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteStrategy(id: string): Promise<void> {
  await api(`/strategies/${id}/`, { method: 'DELETE' });
}

// ── Backtests ───────────────────────────────────────────────────

export async function getBacktests(): Promise<BacktestListEntry[]> {
  return api<BacktestListEntry[]>('/backtests/');
}

export async function getBacktest(id: string): Promise<SavedBacktest | null> {
  try {
    return await api<SavedBacktest>(`/backtests/${id}/`);
  } catch {
    return null;
  }
}

/**
 * Run + save in one call. Returns the saved backtest (with full results).
 * Use this from the builder page instead of calling /run/ and saveBacktest separately.
 */
export async function runAndSaveBacktest(input: {
  strategy_id?: string | null;
  strategy_name: string;
  symbol: string;
  start_date: string;
  end_date: string;
  initial_capital: number;
  config: StrategyConfig;
}): Promise<SavedBacktest> {
  const res = await fetch(`${API_ROOT}/run/`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      config: input.config,
      symbol: input.symbol,
      start_date: input.start_date,
      end_date: input.end_date,
      initial_capital: input.initial_capital,
      strategy_id: input.strategy_id ?? undefined,
      strategy_name: input.strategy_name,
      save: true,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Backtest failed');
  }
  const { id } = await res.json();
  if (!id) throw new Error('Backtest ran but was not saved');
  const full = await getBacktest(id);
  if (!full) throw new Error('Saved backtest could not be reloaded');
  return full;
}

/**
 * Legacy shim — used by the compare flow that already has computed results.
 * Persists them by re-running via /run/ with save=true.
 */
export async function saveBacktest(data: {
  strategy_id?: string | null;
  strategy_name: string;
  symbol: string;
  start_date: string;
  end_date: string;
  initial_capital: number;
  config_snapshot: StrategyConfig;
  results: BacktestResults;
}): Promise<SavedBacktest> {
  return runAndSaveBacktest({
    strategy_id: data.strategy_id ?? null,
    strategy_name: data.strategy_name,
    symbol: data.symbol,
    start_date: data.start_date,
    end_date: data.end_date,
    initial_capital: data.initial_capital,
    config: data.config_snapshot,
  });
}

export async function deleteBacktest(id: string): Promise<void> {
  await api(`/backtests/${id}/`, { method: 'DELETE' });
}
