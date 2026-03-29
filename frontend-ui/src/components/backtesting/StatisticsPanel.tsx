"use client";

import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  Shield,
  Clock,
  Percent,
  Zap,
} from "lucide-react";
import type { BacktestStatistics } from "@/types/backtesting";

interface Props {
  stats: BacktestStatistics;
  initialCapital: number;
}

function fmt(val: number, decimals = 2): string {
  return val.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtDollar(val: number): string {
  const abs = Math.abs(val);
  if (abs >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(val / 1e3).toFixed(1)}K`;
  return `$${fmt(val)}`;
}

export default function StatisticsPanel({ stats, initialCapital }: Props) {
  const sections = [
    {
      title: "Returns",
      icon: <TrendingUp size={14} />,
      items: [
        { label: "Total Return", value: fmtDollar(stats.totalReturn), pct: `${stats.totalReturnPercent >= 0 ? "+" : ""}${fmt(stats.totalReturnPercent)}%`, positive: stats.totalReturn >= 0 },
        { label: "CAGR", value: `${fmt(stats.cagr)}%`, positive: stats.cagr >= 0 },
        { label: "Buy & Hold", value: `${stats.buyAndHoldReturnPercent >= 0 ? "+" : ""}${fmt(stats.buyAndHoldReturnPercent)}%`, positive: stats.buyAndHoldReturnPercent >= 0 },
        { label: "vs Buy & Hold", value: `${stats.totalReturnPercent - stats.buyAndHoldReturnPercent >= 0 ? "+" : ""}${fmt(stats.totalReturnPercent - stats.buyAndHoldReturnPercent)}%`, positive: stats.totalReturnPercent >= stats.buyAndHoldReturnPercent },
      ],
    },
    {
      title: "Risk",
      icon: <Shield size={14} />,
      items: [
        { label: "Sharpe Ratio", value: fmt(stats.sharpeRatio), positive: stats.sharpeRatio > 1 },
        { label: "Sortino Ratio", value: fmt(stats.sortinoRatio), positive: stats.sortinoRatio > 1 },
        { label: "Max Drawdown", value: `${fmt(stats.maxDrawdownPercent)}%`, positive: false, alwaysRed: true },
        { label: "Max DD ($)", value: fmtDollar(stats.maxDrawdown), positive: false, alwaysRed: true },
      ],
    },
    {
      title: "Trades",
      icon: <BarChart3 size={14} />,
      items: [
        { label: "Total Trades", value: String(stats.totalTrades) },
        { label: "Winning", value: String(stats.winningTrades), positive: true },
        { label: "Losing", value: String(stats.losingTrades), positive: false },
        { label: "Win Rate", value: `${fmt(stats.winRate, 1)}%`, positive: stats.winRate > 50 },
      ],
    },
    {
      title: "Performance",
      icon: <Target size={14} />,
      items: [
        { label: "Profit Factor", value: stats.profitFactor === Infinity ? "∞" : fmt(stats.profitFactor), positive: stats.profitFactor > 1 },
        { label: "Avg Win", value: `+${fmtDollar(stats.avgWin)} (${fmt(stats.avgWinPercent, 1)}%)`, positive: true },
        { label: "Avg Loss", value: `-${fmtDollar(stats.avgLoss)} (${fmt(stats.avgLossPercent, 1)}%)`, positive: false },
        { label: "Expectancy", value: fmtDollar(stats.totalTrades > 0 ? stats.totalReturn / stats.totalTrades : 0), positive: stats.totalReturn > 0 },
      ],
    },
    {
      title: "Extremes",
      icon: <Zap size={14} />,
      items: [
        { label: "Largest Win", value: fmtDollar(stats.largestWin), positive: true },
        { label: "Largest Loss", value: fmtDollar(stats.largestLoss), positive: false },
        { label: "Max Consec. Wins", value: String(stats.consecutiveWins), positive: true },
        { label: "Max Consec. Losses", value: String(stats.consecutiveLosses), positive: false },
      ],
    },
    {
      title: "Timing",
      icon: <Clock size={14} />,
      items: [
        { label: "Avg Hold Time", value: `${fmt(stats.avgHoldingBars, 0)} days` },
        { label: "Exposure", value: `${fmt(stats.exposurePercent, 1)}%` },
        { label: "Initial Capital", value: fmtDollar(initialCapital) },
        { label: "Final Equity", value: fmtDollar(initialCapital + stats.totalReturn), positive: stats.totalReturn >= 0 },
      ],
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {sections.map((section) => (
        <div
          key={section.title}
          className="bg-[var(--bg-card-inner)] rounded-lg border border-[var(--border-primary)] p-4 space-y-3"
        >
          <div className="flex items-center gap-2">
            <span className="text-[var(--accent-primary)]">{section.icon}</span>
            <h4 className="text-xs font-medium text-[var(--text-muted)] tracking-wide">
              {section.title.toUpperCase()}
            </h4>
          </div>
          <div className="space-y-2">
            {section.items.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between"
              >
                <span className="text-xs text-[var(--text-muted)]">
                  {item.label}
                </span>
                <span
                  className={`text-xs font-mono font-medium ${
                    item.positive === undefined
                      ? "text-[var(--text-primary)]"
                      : (item as any).alwaysRed
                      ? "text-[var(--accent-red)]"
                      : item.positive
                      ? "text-[var(--accent-green)]"
                      : "text-[var(--accent-red)]"
                  }`}
                >
                  {item.value}
                  {"pct" in item && (
                    <span className="ml-1 text-[10px] opacity-70">
                      {(item as any).pct}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
