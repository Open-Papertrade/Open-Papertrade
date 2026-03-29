"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Play,
  Loader2,
  Search,
  Calendar,
  DollarSign,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import IndicatorSelector from "@/components/backtesting/IndicatorSelector";
import ConditionBuilder from "@/components/backtesting/ConditionBuilder";
import PositionSizingPanel from "@/components/backtesting/PositionSizingPanel";
import StrategySummary from "@/components/backtesting/StrategySummary";
import {
  getStrategy,
  saveStrategy,
  saveBacktest,
} from "@/lib/services/backtesting/storage";
import { API_HOST } from "@/lib/api";
import type {
  StrategyConfig,
  IndicatorConfig,
  ConditionGroup,
  PositionSizingConfig,
  StopLossConfig,
  TakeProfitConfig,
  TradeDirection,
} from "@/types/backtesting";

const DEFAULT_CONFIG: StrategyConfig = {
  indicators: [],
  entryConditions: { logic: "AND", rules: [] },
  exitConditions: { logic: "AND", rules: [] },
  positionSizing: { method: "PERCENT_PORTFOLIO", value: 10 },
  tradeDirection: "LONG",
};

export default function StrategyBuilderPageWrapper() {
  return (
    <Suspense>
      <StrategyBuilderPage />
    </Suspense>
  );
}

function StrategyBuilderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");

  const [name, setName] = useState("My Strategy");
  const [description, setDescription] = useState("");
  const [config, setConfig] = useState<StrategyConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [saved, setSaved] = useState(false);
  const [strategyId, setStrategyId] = useState<string | null>(editId);
  const [error, setError] = useState<string | null>(null);

  // Backtest params
  const [symbol, setSymbol] = useState("AAPL");
  const [startDate, setStartDate] = useState("2023-01-01");
  const [endDate, setEndDate] = useState("2024-12-31");
  const [initialCapital, setInitialCapital] = useState(100000);

  // Load strategy if editing
  useEffect(() => {
    if (!editId) return;
    const strategy = getStrategy(editId);
    if (strategy) {
      setName(strategy.name);
      setDescription(strategy.description);
      setConfig(strategy.config);
      setStrategyId(strategy.id);
    }
  }, [editId]);

  const handleSave = useCallback(() => {
    setSaving(true);
    const result = saveStrategy({
      id: strategyId || undefined,
      name,
      description,
      config,
    });
    setStrategyId(result.id);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setSaving(false);
  }, [name, description, config, strategyId]);

  const handleRunBacktest = async () => {
    if (config.indicators.length === 0) {
      setError("Add at least one indicator.");
      return;
    }
    if (config.entryConditions.rules.length === 0) {
      setError("Add at least one entry condition.");
      return;
    }
    if (config.exitConditions.rules.length === 0) {
      setError("Add at least one exit condition.");
      return;
    }

    setError(null);
    setRunning(true);

    // Save strategy first
    const savedStrat = saveStrategy({
      id: strategyId || undefined,
      name,
      description,
      config,
    });
    setStrategyId(savedStrat.id);

    try {
      const res = await fetch(`${API_HOST}/api/users/backtesting/run/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          config,
          symbol,
          start_date: startDate,
          end_date: endDate,
          initial_capital: initialCapital,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Backtest failed");
        setRunning(false);
        return;
      }

      // Save backtest result to localStorage
      const bt = saveBacktest({
        strategy_name: name,
        symbol: symbol.toUpperCase(),
        start_date: startDate,
        end_date: endDate,
        initial_capital: initialCapital,
        config_snapshot: config,
        results: data.results,
      });

      router.push(`/backtesting/results/${bt.id}`);
    } catch (e: any) {
      setError(e.message || "Network error");
    }
    setRunning(false);
  };

  return (
    <div className="flex h-full bg-[var(--bg-primary)]">
      <Sidebar />
      <main className="flex-1 flex flex-col py-8 px-10 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/backtesting")}
              className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="font-serif text-[28px] font-medium tracking-[-1px] text-[var(--text-primary)] bg-transparent border-none outline-none w-full"
                placeholder="Strategy Name"
              />
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-sm text-[var(--text-muted)] bg-transparent border-none outline-none w-full mt-0.5"
                placeholder="Add a description..."
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              {saved ? "Saved!" : "Save"}
            </button>
            <button
              onClick={handleRunBacktest}
              disabled={running}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-[var(--accent-primary)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {running ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Play size={16} />
              )}
              {running ? "Running..." : "Run Backtest"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 px-4 py-3 bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/20 rounded-lg text-xs text-[var(--accent-red)]">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="flex gap-6 flex-1 min-h-0">
          {/* Left: Strategy Builder */}
          <div className="flex-1 space-y-5 overflow-auto pr-2">
            {/* Trade Direction */}
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] p-5 space-y-3">
              <h3 className="text-sm font-medium text-[var(--text-primary)]">
                Trade Direction
              </h3>
              <div className="flex gap-2">
                {(["LONG", "SHORT", "BOTH"] as TradeDirection[]).map((dir) => (
                  <button
                    key={dir}
                    onClick={() =>
                      setConfig((c) => ({ ...c, tradeDirection: dir }))
                    }
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors border ${
                      config.tradeDirection === dir
                        ? dir === "LONG"
                          ? "border-[var(--accent-green)] bg-[var(--accent-green)]/10 text-[var(--accent-green)]"
                          : dir === "SHORT"
                          ? "border-[var(--accent-red)] bg-[var(--accent-red)]/10 text-[var(--accent-red)]"
                          : "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                        : "border-[var(--border-primary)] bg-[var(--bg-card-inner)] text-[var(--text-secondary)]"
                    }`}
                  >
                    {dir === "BOTH" ? "Long & Short" : `${dir} Only`}
                  </button>
                ))}
              </div>
            </div>

            {/* Indicators */}
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] p-5">
              <IndicatorSelector
                indicators={config.indicators}
                onChange={(indicators) =>
                  setConfig((c) => ({ ...c, indicators }))
                }
              />
            </div>

            {/* Entry Conditions */}
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] p-5">
              <ConditionBuilder
                label="Entry Conditions (Buy Signal)"
                group={config.entryConditions}
                indicators={config.indicators}
                onChange={(entryConditions) =>
                  setConfig((c) => ({ ...c, entryConditions }))
                }
              />
            </div>

            {/* Exit Conditions */}
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] p-5">
              <ConditionBuilder
                label="Exit Conditions (Sell Signal)"
                group={config.exitConditions}
                indicators={config.indicators}
                onChange={(exitConditions) =>
                  setConfig((c) => ({ ...c, exitConditions }))
                }
              />
            </div>

            {/* Position Sizing & Risk Management */}
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] p-5">
              <PositionSizingPanel
                positionSizing={config.positionSizing}
                stopLoss={config.stopLoss}
                takeProfit={config.takeProfit}
                onPositionSizingChange={(positionSizing) =>
                  setConfig((c) => ({ ...c, positionSizing }))
                }
                onStopLossChange={(stopLoss) =>
                  setConfig((c) => ({ ...c, stopLoss }))
                }
                onTakeProfitChange={(takeProfit) =>
                  setConfig((c) => ({ ...c, takeProfit }))
                }
              />
            </div>

            {/* Advanced */}
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] p-5 space-y-3">
              <h3 className="text-sm font-medium text-[var(--text-primary)]">
                Advanced Settings
              </h3>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-muted)]">
                    Cooldown (bars):
                  </span>
                  <input
                    type="number"
                    value={config.cooldownBars || 0}
                    onChange={(e) =>
                      setConfig((c) => ({
                        ...c,
                        cooldownBars: parseInt(e.target.value) || 0,
                      }))
                    }
                    className="w-16 px-2 py-1 text-xs font-mono bg-[var(--bg-muted)] text-[var(--text-primary)] rounded border border-[var(--border-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
                  />
                </label>
                <label className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-muted)]">
                    Max positions:
                  </span>
                  <input
                    type="number"
                    value={config.maxOpenPositions || 1}
                    onChange={(e) =>
                      setConfig((c) => ({
                        ...c,
                        maxOpenPositions: parseInt(e.target.value) || 1,
                      }))
                    }
                    className="w-16 px-2 py-1 text-xs font-mono bg-[var(--bg-muted)] text-[var(--text-primary)] rounded border border-[var(--border-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Right: Summary & Backtest Config */}
          <div className="w-[360px] space-y-5 shrink-0 overflow-auto">
            <StrategySummary config={config} />

            {/* Backtest Configuration */}
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] p-5 space-y-4">
              <h3 className="text-xs font-medium text-[var(--text-muted)] tracking-wide">
                BACKTEST CONFIGURATION
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-[var(--text-muted)] block mb-1">
                    Symbol
                  </label>
                  <div className="relative">
                    <Search
                      size={12}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]"
                    />
                    <input
                      value={symbol}
                      onChange={(e) =>
                        setSymbol(e.target.value.toUpperCase())
                      }
                      className="w-full pl-8 pr-3 py-2 text-sm font-mono bg-[var(--bg-muted)] text-[var(--text-primary)] rounded-lg border border-[var(--border-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
                      placeholder="AAPL, TSLA, BTC-USD..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-[var(--text-muted)] block mb-1">
                      Start Date
                    </label>
                    <div className="relative">
                      <Calendar
                        size={12}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]"
                      />
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full pl-8 pr-2 py-2 text-xs font-mono bg-[var(--bg-muted)] text-[var(--text-primary)] rounded-lg border border-[var(--border-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--text-muted)] block mb-1">
                      End Date
                    </label>
                    <div className="relative">
                      <Calendar
                        size={12}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]"
                      />
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full pl-8 pr-2 py-2 text-xs font-mono bg-[var(--bg-muted)] text-[var(--text-primary)] rounded-lg border border-[var(--border-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-[var(--text-muted)] block mb-1">
                    Initial Capital
                  </label>
                  <div className="relative">
                    <DollarSign
                      size={12}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]"
                    />
                    <input
                      type="number"
                      value={initialCapital}
                      onChange={(e) =>
                        setInitialCapital(parseInt(e.target.value) || 100000)
                      }
                      className="w-full pl-8 pr-3 py-2 text-sm font-mono bg-[var(--bg-muted)] text-[var(--text-primary)] rounded-lg border border-[var(--border-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleRunBacktest}
                disabled={running || config.indicators.length === 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-lg bg-[var(--accent-primary)] text-white hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {running ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Running backtest...
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    Run Backtest
                  </>
                )}
              </button>
            </div>

            {/* Quick Tips */}
            <div className="bg-[var(--bg-card-inner)] rounded-lg border border-[var(--border-primary)] p-4 space-y-2">
              <h4 className="text-[10px] font-medium text-[var(--text-dim)] tracking-wide">
                TIPS
              </h4>
              <ul className="space-y-1.5 text-[11px] text-[var(--text-muted)]">
                <li>Add indicators first, then reference them in conditions</li>
                <li>Use &quot;crosses above/below&quot; for crossover strategies</li>
                <li>Set stop-loss to protect against large drawdowns</li>
                <li>Start simple and add complexity gradually</li>
                <li>Test across different time periods to check robustness</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
