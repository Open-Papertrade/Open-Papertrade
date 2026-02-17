"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import PageHeader from "@/components/PageHeader";
import MetricCard from "@/components/MetricCard";
import { usePortfolio } from "@/context/PortfolioContext";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function HistoryPage() {
  const { transactions } = usePortfolio();
  const [filter, setFilter] = useState<"ALL" | "BUY" | "SELL">("ALL");

  const exportCSV = () => {
    if (transactions.length === 0) return;
    const header = "Date,Type,Symbol,Shares,Price,Total";
    const rows = transactions.map((tx) =>
      `${new Date(tx.date).toISOString().split("T")[0]},${tx.type},${tx.symbol},${tx.shares},${tx.price},${tx.total}`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "trade-history.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (filter === "ALL") return true;
    return tx.type === filter;
  });

  const totalTrades = transactions.length;
  const totalVolume = transactions.reduce((sum, tx) => sum + tx.total, 0);
  const buyTrades = transactions.filter((tx) => tx.type === "BUY").length;
  const sellTrades = transactions.filter((tx) => tx.type === "SELL").length;

  // Calculate this month's trades
  const now = new Date();
  const thisMonthTrades = transactions.filter((tx) => {
    const txDate = new Date(tx.date);
    return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
  });
  const thisMonthVolume = thisMonthTrades.reduce((sum, tx) => sum + tx.total, 0);

  // Calculate actual P/L per SELL trade by comparing to avg buy price
  // and compute average hold time from BUY→SELL pairs
  const buyHistory: Record<string, { totalCost: number; totalShares: number; firstBuyDate: Date }> = {};
  const holdTimes: number[] = [];

  // Sort chronologically (oldest first) to process buys before sells
  const chronological = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const tradesWithPL = chronological.map((tx) => {
    if (tx.type === "BUY") {
      const prev = buyHistory[tx.symbol] || { totalCost: 0, totalShares: 0, firstBuyDate: new Date(tx.date) };
      buyHistory[tx.symbol] = {
        totalCost: prev.totalCost + tx.total,
        totalShares: prev.totalShares + tx.shares,
        firstBuyDate: prev.firstBuyDate,
      };
      return { ...tx, pl: 0 };
    }
    // SELL — compute P/L against average buy cost
    const buy = buyHistory[tx.symbol];
    if (!buy || buy.totalShares === 0) return { ...tx, pl: 0 };

    const avgCost = buy.totalCost / buy.totalShares;
    const pl = (tx.price - avgCost) * tx.shares;

    // Track hold time
    const sellDate = new Date(tx.date);
    const holdDays = (sellDate.getTime() - buy.firstBuyDate.getTime()) / (1000 * 60 * 60 * 24);
    if (holdDays >= 0) holdTimes.push(holdDays);

    // Reduce tracked buy shares
    const costReduction = avgCost * tx.shares;
    buy.totalShares -= tx.shares;
    buy.totalCost -= costReduction;
    if (buy.totalShares <= 0) delete buyHistory[tx.symbol];

    return { ...tx, pl };
  });

  const sellTrades_ = tradesWithPL.filter((tx) => tx.type === "SELL" && tx.pl !== 0);
  const bestTrade = sellTrades_.length > 0
    ? sellTrades_.reduce((best, tx) => (tx.pl > best.pl ? tx : best), sellTrades_[0])
    : null;
  const worstTrade = sellTrades_.length > 0
    ? sellTrades_.reduce((worst, tx) => (tx.pl < worst.pl ? tx : worst), sellTrades_[0])
    : null;

  const avgHoldTime = holdTimes.length > 0
    ? holdTimes.reduce((sum, d) => sum + d, 0) / holdTimes.length
    : null;

  // Most traded asset
  const assetCounts = transactions.reduce((acc, tx) => {
    acc[tx.symbol] = (acc[tx.symbol] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const mostTraded = Object.entries(assetCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="flex h-full bg-[var(--bg-primary)]">
      <Sidebar />
      <main className="flex-1 flex flex-col gap-7 py-8 px-10 overflow-auto">
        <PageHeader
          title="History"
          subtitle="View your complete trading activity and transactions"
          primaryButtonText="Export"
          primaryButtonIcon="download"
          onPrimaryClick={exportCSV}
        />

        {/* Metrics Row */}
        <div className="flex gap-4">
          <MetricCard label="Total Trades" value={totalTrades.toString()} />
          <MetricCard label="Total Volume" value={formatCurrency(totalVolume, true)} />
          <MetricCard
            label="Profitable"
            value={buyTrades.toString()}
            valueColor="var(--accent-green)"
            subtext={`${((buyTrades / totalTrades) * 100).toFixed(1)}% win rate`}
          />
          <MetricCard
            label="This Month"
            value={thisMonthTrades.length.toString()}
            subtext={`${formatCurrency(thisMonthVolume, true)} volume`}
          />
        </div>

        {/* Content Row */}
        <div className="flex gap-4 flex-1 min-h-0">
          {/* Transactions Table */}
          <div className="flex-1 bg-[var(--bg-card)] rounded-xl p-6 border border-[var(--border-primary)] flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                Transaction History
              </span>
              <button onClick={exportCSV} className="text-[11px] font-medium text-[var(--accent-primary)] hover:underline">
                Export CSV
              </button>
            </div>

            {/* Filter Row */}
            <div className="flex gap-2">
              {(["ALL", "BUY", "SELL"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3.5 py-2 rounded-md text-xs font-medium transition-colors ${
                    filter === f
                      ? "bg-[var(--accent-primary)] text-white"
                      : "border border-[var(--border-muted)] text-[var(--text-muted)] hover:bg-[var(--bg-muted)]"
                  }`}
                >
                  {f === "ALL" ? "All" : f === "BUY" ? "Buys" : "Sells"}
                </button>
              ))}
            </div>

            {/* Table Header */}
            <div className="flex gap-4 py-3">
              <span className="w-24 text-[11px] font-semibold tracking-[0.5px] text-[var(--text-muted)]">
                Date
              </span>
              <span className="w-14 text-[11px] font-semibold tracking-[0.5px] text-[var(--text-muted)]">
                Type
              </span>
              <span className="w-14 text-[11px] font-semibold tracking-[0.5px] text-[var(--text-muted)]">
                Asset
              </span>
              <span className="w-16 text-right text-[11px] font-semibold tracking-[0.5px] text-[var(--text-muted)]">
                Qty
              </span>
              <span className="w-20 text-right text-[11px] font-semibold tracking-[0.5px] text-[var(--text-muted)]">
                Price
              </span>
              <span className="w-20 text-right text-[11px] font-semibold tracking-[0.5px] text-[var(--text-muted)]">
                Total
              </span>
            </div>

            {/* Table Body */}
            <div className="flex flex-col flex-1 overflow-auto">
              {filteredTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center gap-4 py-3.5 border-t border-[var(--border-primary)]"
                >
                  <span className="w-24 text-xs text-[var(--text-secondary)]">
                    {formatDate(new Date(tx.date))}
                  </span>
                  <span className="w-14">
                    <span
                      className={`px-2 py-1 rounded text-[10px] font-semibold ${
                        tx.type === "BUY"
                          ? "bg-[#22C55E20] text-[var(--accent-green)]"
                          : "bg-[#EF444420] text-[var(--accent-red)]"
                      }`}
                    >
                      {tx.type}
                    </span>
                  </span>
                  <span className="w-14 font-mono text-[13px] font-semibold text-[var(--text-primary)]">
                    {tx.symbol}
                  </span>
                  <span className="w-16 text-right font-mono text-[13px] text-[var(--text-secondary)]">
                    {tx.shares}
                  </span>
                  <span className="w-20 text-right font-mono text-[13px] text-[var(--text-primary)]">
                    {formatCurrency(tx.price)}
                  </span>
                  <span className="w-20 text-right font-mono text-[13px] text-[var(--text-primary)]">
                    {formatCurrency(tx.total)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly Summary Panel */}
          <div className="w-[360px] bg-[var(--bg-card)] rounded-xl p-6 border border-[var(--border-primary)] flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                Monthly Summary
              </span>
              <button onClick={exportCSV} className="text-[11px] font-medium text-[var(--accent-primary)] hover:underline">
                Export
              </button>
            </div>

            <div className="flex flex-col gap-5 flex-1">
              {/* Best Trade */}
              {bestTrade && (
                <div className="flex flex-col gap-2 pb-4 border-b border-[var(--border-primary)]">
                  <span className="text-xs text-[var(--text-muted)]">Best Trade</span>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-base font-semibold text-[var(--text-primary)]">
                      {bestTrade.symbol}
                    </span>
                    <span className="font-mono text-base font-medium text-[var(--accent-green)]">
                      +{formatCurrency(Math.abs(bestTrade.pl))}
                    </span>
                  </div>
                </div>
              )}

              {/* Worst Trade */}
              {worstTrade && (
                <div className="flex flex-col gap-2 pb-4 border-b border-[var(--border-primary)]">
                  <span className="text-xs text-[var(--text-muted)]">Worst Trade</span>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-base font-semibold text-[var(--text-primary)]">
                      {worstTrade.symbol}
                    </span>
                    <span className="font-mono text-base font-medium text-[var(--accent-red)]">
                      -{formatCurrency(Math.abs(worstTrade.pl))}
                    </span>
                  </div>
                </div>
              )}

              {/* Avg Hold Time */}
              <div className="flex flex-col gap-2 pb-4 border-b border-[var(--border-primary)]">
                <span className="text-xs text-[var(--text-muted)]">
                  Average Hold Time
                </span>
                <span className="font-mono text-base font-medium text-[var(--text-primary)]">
                  {avgHoldTime !== null
                    ? avgHoldTime < 1
                      ? `${Math.round(avgHoldTime * 24)} hours`
                      : `${avgHoldTime.toFixed(1)} days`
                    : "—"}
                </span>
              </div>

              {/* Most Traded */}
              {mostTraded && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-[var(--text-muted)]">Most Traded</span>
                  <span className="font-mono text-base font-medium text-[var(--text-primary)]">
                    {mostTraded[0]} ({mostTraded[1]} trades)
                  </span>
                </div>
              )}

              {/* Stats */}
              <div className="mt-auto pt-4 border-t border-[var(--border-primary)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[var(--text-muted)]">Buy Orders</span>
                  <span className="font-mono text-sm font-medium text-[var(--accent-green)]">
                    {buyTrades}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-muted)]">Sell Orders</span>
                  <span className="font-mono text-sm font-medium text-[var(--accent-red)]">
                    {sellTrades}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
