"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import EquityCurveChart from "@/components/backtesting/EquityCurveChart";
import StatisticsPanel from "@/components/backtesting/StatisticsPanel";
import TradeLogTable from "@/components/backtesting/TradeLogTable";
import MonthlyReturnsHeatmap from "@/components/backtesting/MonthlyReturnsHeatmap";
import StrategySummary from "@/components/backtesting/StrategySummary";
import { getBacktest, type SavedBacktest } from "@/lib/services/backtesting/storage";

type ResultTab = "overview" | "trades" | "monthly";

// Defensive helpers — the results object may contain nulls / NaN for edge cases.
function num(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return fallback;
}
function fmt(v: unknown, digits = 2): string {
  const n = typeof v === "number" && Number.isFinite(v) ? v : null;
  return n === null ? "—" : n.toFixed(digits);
}
function fmtInt(v: unknown): string {
  const n = typeof v === "number" && Number.isFinite(v) ? v : null;
  return n === null ? "—" : Math.round(n).toLocaleString("en-US");
}

export default function BacktestResultsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [backtest, setBacktest] = useState<SavedBacktest | null>(null);
  const [tab, setTab] = useState<ResultTab>("overview");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const bt = await getBacktest(id);
      if (!cancelled) {
        setBacktest(bt);
        setMounted(true);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (!mounted) {
    return (
      <div className="flex h-full bg-[var(--bg-primary)]">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 size={32} className="animate-spin text-[var(--accent-primary)]" />
        </main>
      </div>
    );
  }

  if (!backtest || !backtest.results) {
    return (
      <div className="flex h-full bg-[var(--bg-primary)]">
        <Sidebar />
        <main className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-sm text-[var(--accent-red)]">Backtest not found</p>
          <button
            onClick={() => router.push("/backtesting")}
            className="text-xs text-[var(--accent-primary)] hover:underline"
          >
            Back to Backtesting
          </button>
        </main>
      </div>
    );
  }

  const { results, config_snapshot: config } = backtest;
  const stats = results.statistics;
  const totalReturn = num(stats.totalReturn);
  const totalReturnPct = num(stats.totalReturnPercent);
  const buyHoldPct = num(stats.buyAndHoldReturnPercent);
  const winRate = num(stats.winRate);
  const sharpe = num(stats.sharpeRatio);
  const maxDdPct = num(stats.maxDrawdownPercent);
  const maxDd = num(stats.maxDrawdown);
  const profitFactor = stats.profitFactor;   // may be Infinity, handled below
  const isPositive = totalReturn >= 0;
  const alphaPct = totalReturnPct - buyHoldPct;

  return (
    <div className="flex h-full bg-[var(--bg-primary)]">
      <Sidebar />
      <main className="flex-1 flex flex-col gap-6 py-8 px-10 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/backtesting")}
              className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="font-serif text-[28px] font-medium tracking-[-1px] text-[var(--text-primary)]">
                {backtest.strategy_name || "Backtest Results"}
              </h1>
              <p className="text-sm text-[var(--text-muted)]">
                <span className="font-mono text-[var(--accent-primary)]">
                  {backtest.symbol}
                </span>{" "}
                {backtest.start_date} → {backtest.end_date}
                {" · "}${fmtInt(backtest.initial_capital)} initial
              </p>
            </div>
          </div>
        </div>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-6 gap-4">
          <MetricCard
            label="Total Return"
            value={`${isPositive ? "+" : ""}$${fmtInt(Math.abs(totalReturn))}`}
            sub={`${isPositive ? "+" : ""}${fmt(totalReturnPct, 2)}%`}
            positive={isPositive}
          />
          <MetricCard
            label="Win Rate"
            value={`${fmt(winRate, 1)}%`}
            sub={`${fmtInt(stats.winningTrades)}W / ${fmtInt(stats.losingTrades)}L`}
            positive={winRate > 50}
          />
          <MetricCard
            label="Sharpe Ratio"
            value={fmt(sharpe, 2)}
            sub={sharpe > 1 ? "Good" : sharpe > 0.5 ? "Fair" : "Poor"}
            positive={sharpe > 1}
          />
          <MetricCard
            label="Max Drawdown"
            value={`-${fmt(maxDdPct, 1)}%`}
            sub={`-$${fmtInt(Math.abs(maxDd))}`}
            positive={false}
            alwaysRed
          />
          <MetricCard
            label="Profit Factor"
            value={
              profitFactor === Infinity
                ? "∞"
                : fmt(profitFactor, 2)
            }
            sub={`${fmtInt(stats.totalTrades)} trades`}
            positive={typeof profitFactor === "number" && profitFactor > 1}
          />
          <MetricCard
            label="vs Buy & Hold"
            value={`${alphaPct >= 0 ? "+" : ""}${fmt(alphaPct, 1)}%`}
            sub={`B&H: ${buyHoldPct >= 0 ? "+" : ""}${fmt(buyHoldPct, 1)}%`}
            positive={totalReturnPct >= buyHoldPct}
          />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 bg-[var(--bg-card)] rounded-lg border border-[var(--border-primary)] w-fit">
          {(["overview", "trades", "monthly"] as ResultTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-xs font-medium rounded-md transition-colors capitalize ${
                tab === t
                  ? "bg-[var(--accent-primary)] text-white"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {t === "overview"
                ? "Overview"
                : t === "trades"
                ? `Trade Log (${results.trades.length})`
                : "Monthly Returns"}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === "overview" && (
          <div className="space-y-6">
            {/* Equity Curve */}
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] p-5">
              <h3 className="text-xs font-medium text-[var(--text-muted)] tracking-wide mb-4">
                EQUITY CURVE & DRAWDOWN
              </h3>
              <EquityCurveChart
                equityCurve={results.equityCurve}
                trades={results.trades}
                initialCapital={backtest.initial_capital}
                height={400}
              />
            </div>

            <div className="flex gap-6">
              {/* Statistics */}
              <div className="flex-1">
                <h3 className="text-xs font-medium text-[var(--text-muted)] tracking-wide mb-4">
                  DETAILED STATISTICS
                </h3>
                <StatisticsPanel
                  stats={stats}
                  initialCapital={backtest.initial_capital}
                />
              </div>

              {/* Strategy Used */}
              <div className="w-[300px] shrink-0">
                <h3 className="text-xs font-medium text-[var(--text-muted)] tracking-wide mb-4">
                  STRATEGY USED
                </h3>
                <StrategySummary config={config} />
              </div>
            </div>
          </div>
        )}

        {tab === "trades" && (
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] p-5">
            <TradeLogTable trades={results.trades} />
          </div>
        )}

        {tab === "monthly" && (
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] p-5">
            <h3 className="text-xs font-medium text-[var(--text-muted)] tracking-wide mb-4">
              MONTHLY RETURNS HEATMAP
            </h3>
            <MonthlyReturnsHeatmap returns={results.monthlyReturns} />
          </div>
        )}
      </main>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  positive,
  alwaysRed,
}: {
  label: string;
  value: string;
  sub: string;
  positive?: boolean;
  alwaysRed?: boolean;
}) {
  return (
    <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-primary)]">
      <span className="text-[10px] font-medium text-[var(--text-muted)] tracking-wide">
        {label}
      </span>
      <div
        className={`font-mono text-xl font-semibold mt-1 ${
          alwaysRed
            ? "text-[var(--accent-red)]"
            : positive === undefined
            ? "text-[var(--text-primary)]"
            : positive
            ? "text-[var(--accent-green)]"
            : "text-[var(--accent-red)]"
        }`}
      >
        {value}
      </div>
      <span className="text-[10px] text-[var(--text-dim)] mt-0.5 block">
        {sub}
      </span>
    </div>
  );
}
