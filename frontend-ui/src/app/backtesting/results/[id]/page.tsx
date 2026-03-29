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

export default function BacktestResultsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [backtest, setBacktest] = useState<SavedBacktest | null>(null);
  const [tab, setTab] = useState<ResultTab>("overview");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const bt = getBacktest(id);
    setBacktest(bt);
    setMounted(true);
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
  const isPositive = stats.totalReturn >= 0;

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
                {" · "}${backtest.initial_capital.toLocaleString()} initial
              </p>
            </div>
          </div>
        </div>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-6 gap-4">
          <MetricCard
            label="Total Return"
            value={`${isPositive ? "+" : ""}$${Math.abs(stats.totalReturn).toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
            sub={`${isPositive ? "+" : ""}${stats.totalReturnPercent.toFixed(2)}%`}
            positive={isPositive}
          />
          <MetricCard
            label="Win Rate"
            value={`${stats.winRate.toFixed(1)}%`}
            sub={`${stats.winningTrades}W / ${stats.losingTrades}L`}
            positive={stats.winRate > 50}
          />
          <MetricCard
            label="Sharpe Ratio"
            value={stats.sharpeRatio.toFixed(2)}
            sub={stats.sharpeRatio > 1 ? "Good" : stats.sharpeRatio > 0.5 ? "Fair" : "Poor"}
            positive={stats.sharpeRatio > 1}
          />
          <MetricCard
            label="Max Drawdown"
            value={`-${stats.maxDrawdownPercent.toFixed(1)}%`}
            sub={`-$${Math.abs(stats.maxDrawdown).toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
            positive={false}
            alwaysRed
          />
          <MetricCard
            label="Profit Factor"
            value={stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2)}
            sub={`${stats.totalTrades} trades`}
            positive={stats.profitFactor > 1}
          />
          <MetricCard
            label="vs Buy & Hold"
            value={`${(stats.totalReturnPercent - stats.buyAndHoldReturnPercent) >= 0 ? "+" : ""}${(stats.totalReturnPercent - stats.buyAndHoldReturnPercent).toFixed(1)}%`}
            sub={`B&H: ${stats.buyAndHoldReturnPercent >= 0 ? "+" : ""}${stats.buyAndHoldReturnPercent.toFixed(1)}%`}
            positive={stats.totalReturnPercent >= stats.buyAndHoldReturnPercent}
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
