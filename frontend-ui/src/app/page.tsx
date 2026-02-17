"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  PieChart,
  BarChart3,
  Clock,
  Star,
  RefreshCw,
  Loader2,
  ChevronRight,
  Zap,
  Target,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { usePortfolio } from "@/context/PortfolioContext";
import { stockAPI, StockQuote } from "@/lib/api";
import { formatCurrency, formatPercent, formatDateTime } from "@/lib/utils";

export default function Dashboard() {
  const router = useRouter();
  const {
    user,
    totalPortfolioValue,
    totalInvested,
    totalReturns,
    returnsPercent,
    dayGain,
    dayGainPercent,
    buyingPower,
    holdings,
    watchlist,
    transactions,
    stocks,
    crypto,
    isLoading,
    lastUpdated,
    refreshPrices,
    refreshUserData,
    settings,
    market,
    notifications,
  } = usePortfolio();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [indices, setIndices] = useState<StockQuote[]>([]);

  // Fetch market indices whenever the market changes
  useEffect(() => {
    stockAPI.getIndices(market).then((res) => {
      setIndices(res.indices);
    }).catch((err) => {
      console.error("Failed to fetch indices:", err);
    });
  }, [market]);

  // Top holdings by value
  const topHoldings = [...holdings]
    .map((h) => ({
      ...h,
      value: h.shares * h.currentPrice,
      gain: (h.currentPrice - h.avgCost) * h.shares,
      gainPercent: h.avgCost > 0 ? ((h.currentPrice - h.avgCost) / h.avgCost) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);

  // Best and worst performers
  const performers = [...holdings]
    .map((h) => ({
      ...h,
      gainPercent: h.avgCost > 0 ? ((h.currentPrice - h.avgCost) / h.avgCost) * 100 : 0,
    }))
    .sort((a, b) => b.gainPercent - a.gainPercent);

  const bestPerformer = performers[0];
  const worstPerformer = performers[performers.length - 1];

  // Market movers from stocks
  const gainers = [...stocks].sort((a, b) => b.changePercent - a.changePercent).slice(0, 3);
  const losers = [...stocks].sort((a, b) => a.changePercent - b.changePercent).slice(0, 3);

  // Starred watchlist items
  const starredWatchlist = watchlist.filter((w) => w.starred).slice(0, 4);

  // Portfolio allocation - detect crypto by checking against loaded crypto symbols
  const cryptoSymbolSet = new Set(crypto.map((c) => c.symbol));
  const stockValue = holdings
    .filter((h) => !cryptoSymbolSet.has(h.symbol))
    .reduce((sum, h) => sum + h.shares * h.currentPrice, 0);
  const cryptoValue = holdings
    .filter((h) => cryptoSymbolSet.has(h.symbol))
    .reduce((sum, h) => sum + h.shares * h.currentPrice, 0);
  const cashValue = buyingPower;
  const totalValue = stockValue + cryptoValue + cashValue;

  const allocation = [
    { label: "Stocks", value: stockValue, percent: totalValue > 0 ? (stockValue / totalValue) * 100 : 0, color: "var(--accent-primary)" },
    { label: "Crypto", value: cryptoValue, percent: totalValue > 0 ? (cryptoValue / totalValue) * 100 : 0, color: "var(--accent-green)" },
    { label: "Cash", value: cashValue, percent: totalValue > 0 ? (cashValue / totalValue) * 100 : 0, color: "var(--text-muted)" },
  ];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refreshUserData(), refreshPrices()]);
    setIsRefreshing(false);
  };

  return (
    <div className="flex h-full bg-[var(--bg-primary)]">
      <Sidebar />

      <main className="flex-1 flex flex-col gap-6 py-8 px-10 overflow-auto">
        {/* Header */}
        <header className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h1 className="font-serif text-[32px] font-medium tracking-[-1px] text-[var(--text-primary)]">
                Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""}
              </h1>
              {lastUpdated && (
                <span className="text-xs text-[var(--text-dim)] flex items-center gap-1.5">
                  <Clock size={12} />
                  {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              Here's your portfolio overview for today
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[var(--border-muted)] hover:bg-[var(--bg-muted)] transition-colors disabled:opacity-50"
            >
              {isRefreshing || isLoading ? (
                <Loader2 size={16} className="text-[var(--text-muted)] animate-spin" />
              ) : (
                <RefreshCw size={16} className="text-[var(--text-muted)]" />
              )}
            </button>
            <Link
              href="/trade"
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--accent-primary)] hover:brightness-110 transition-all"
            >
              <Plus size={16} className="text-black" />
              <span className="text-[13px] font-semibold text-black">New Trade</span>
            </Link>
          </div>
        </header>

        {/* Market Indices Bar */}
        {indices.length > 0 && (
          <div className="flex items-center gap-6 px-5 py-3 bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)]">
            {indices.map((idx) => (
              <div key={idx.symbol} className="flex items-center gap-3">
                <span className="text-xs font-semibold text-[var(--text-muted)]">{idx.symbol}</span>
                <span className="font-mono text-sm font-medium text-[var(--text-primary)]">
                  {idx.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
                <span className={`font-mono text-xs font-medium ${idx.changePercent >= 0 ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"}`}>
                  {formatPercent(idx.changePercent)}
                </span>
              </div>
            ))}
            {(() => {
              const btc = crypto.find((c) => c.symbol === "BTC");
              return btc ? (
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-[var(--text-muted)]">BTC</span>
                  <span className="font-mono text-sm font-medium text-[var(--text-primary)]">
                    {formatCurrency(btc.price, false, { sourceCurrency: btc.currency || "USD" })}
                  </span>
                  <span className={`font-mono text-xs font-medium ${btc.changePercent >= 0 ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"}`}>
                    {formatPercent(btc.changePercent)}
                  </span>
                </div>
              ) : null;
            })()}
          </div>
        )}

        {/* Main Stats Row */}
        <div className="grid grid-cols-4 gap-4">
          {/* Total Portfolio */}
          <div className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-primary)] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-muted)]">Total Portfolio</span>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)] animate-pulse" />
                <span className="text-[10px] font-medium text-[var(--accent-green)]">Live</span>
              </div>
            </div>
            <span className="font-mono text-[28px] font-semibold text-[var(--text-primary)] tracking-tight">
              {formatCurrency(totalPortfolioValue, false)}
            </span>
            <div className="flex items-center gap-1.5">
              {dayGain >= 0 ? (
                <ArrowUpRight size={14} className="text-[var(--accent-green)]" />
              ) : (
                <ArrowDownRight size={14} className="text-[var(--accent-red)]" />
              )}
              <span className={`text-xs font-medium ${dayGain >= 0 ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"}`}>
                {dayGain >= 0 ? "+" : ""}{formatCurrency(dayGain, false)} ({formatPercent(dayGainPercent)}) today
              </span>
            </div>
          </div>

          {/* Total Returns / Total Invested */}
          {settings.showProfitLoss ? (
            <div className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-primary)] flex flex-col gap-3">
              <span className="text-xs font-medium text-[var(--text-muted)]">Total Returns</span>
              <span className={`font-mono text-[28px] font-semibold tracking-tight ${totalReturns >= 0 ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"}`}>
                {totalReturns >= 0 ? "+" : ""}{formatCurrency(totalReturns, false)}
              </span>
              <div className="flex items-center gap-1.5">
                {totalReturns >= 0 ? (
                  <TrendingUp size={14} className="text-[var(--accent-green)]" />
                ) : (
                  <TrendingDown size={14} className="text-[var(--accent-red)]" />
                )}
                <span className={`text-xs font-medium ${totalReturns >= 0 ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"}`}>
                  {formatPercent(returnsPercent)} all time
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-primary)] flex flex-col gap-3">
              <span className="text-xs font-medium text-[var(--text-muted)]">Total Invested</span>
              <span className="font-mono text-[28px] font-semibold text-[var(--text-primary)] tracking-tight">
                {formatCurrency(totalInvested, false)}
              </span>
              <div className="flex items-center gap-1.5">
                <Wallet size={14} className="text-[var(--text-muted)]" />
                <span className="text-xs text-[var(--text-muted)]">
                  Across {holdings.length} positions
                </span>
              </div>
            </div>
          )}

          {/* Buying Power */}
          <div className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-primary)] flex flex-col gap-3">
            <span className="text-xs font-medium text-[var(--text-muted)]">Buying Power</span>
            <span className="font-mono text-[28px] font-semibold text-[var(--text-primary)] tracking-tight">
              {formatCurrency(buyingPower, false, { convertFromUSD: false })}
            </span>
            <div className="flex items-center gap-1.5">
              <Wallet size={14} className="text-[var(--text-muted)]" />
              <span className="text-xs text-[var(--text-muted)]">
                Available to trade
              </span>
            </div>
          </div>

          {/* Active Positions */}
          <div className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-primary)] flex flex-col gap-3">
            <span className="text-xs font-medium text-[var(--text-muted)]">Active Positions</span>
            <span className="font-mono text-[28px] font-semibold text-[var(--accent-primary)] tracking-tight">
              {holdings.length}
            </span>
            <div className="flex items-center gap-1.5">
              <Activity size={14} className="text-[var(--text-muted)]" />
              <span className="text-xs text-[var(--text-muted)]">
                {holdings.filter((h) => !cryptoSymbolSet.has(h.symbol)).length} stocks, {holdings.filter((h) => cryptoSymbolSet.has(h.symbol)).length} crypto
              </span>
            </div>
          </div>
        </div>

        {/* Content Row */}
        <div className="grid grid-cols-3 gap-5">
          {/* Left Column - Holdings & Performance */}
          <div className="col-span-2 flex flex-col gap-5">
            {/* Top Holdings */}
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-primary)]">
                <div className="flex items-center gap-2">
                  <BarChart3 size={16} className="text-[var(--accent-primary)]" />
                  <span className="text-sm font-semibold text-[var(--text-primary)]">Top Holdings</span>
                </div>
                <Link href="/portfolio" className="text-[11px] font-medium text-[var(--accent-primary)] hover:underline flex items-center gap-1">
                  View all <ChevronRight size={12} />
                </Link>
              </div>

              {holdings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <PieChart size={32} className="text-[var(--text-dim)] mb-3" />
                  <span className="text-sm text-[var(--text-muted)] mb-1">No holdings yet</span>
                  <span className="text-xs text-[var(--text-dim)]">Start trading to build your portfolio</span>
                  <Link
                    href="/trade"
                    className="mt-4 px-4 py-2 rounded-lg bg-[var(--accent-primary)] text-xs font-semibold text-black hover:brightness-110 transition-all"
                  >
                    Make Your First Trade
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-primary)]">
                  {topHoldings.map((holding) => (
                    <div
                      key={holding.symbol}
                      onClick={() => router.push(`/trade?symbol=${holding.symbol}`)}
                      className={`flex items-center justify-between px-5 ${settings.compactMode ? "py-2.5" : "py-4"} hover:bg-[var(--bg-muted)] cursor-pointer transition-colors`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-[var(--bg-muted)] flex items-center justify-center font-mono text-sm font-bold text-[var(--text-primary)]">
                          {holding.symbol.slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-mono text-sm font-semibold text-[var(--text-primary)]">{holding.symbol}</div>
                          <div className="text-xs text-[var(--text-muted)]">{holding.shares} shares</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm font-semibold text-[var(--text-primary)]">
                          {formatCurrency(holding.value, false, { sourceCurrency: holding.currency || "USD" })}
                        </div>
                        {settings.showProfitLoss ? (
                          <div className={`text-xs font-medium flex items-center justify-end gap-1 ${holding.gainPercent >= 0 ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"}`}>
                            {holding.gainPercent >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                            {formatPercent(holding.gainPercent)}
                          </div>
                        ) : (
                          <div className="text-xs text-[var(--text-muted)]">
                            {formatCurrency(holding.currentPrice, false, { sourceCurrency: holding.currency || "USD" })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Best/Worst Performers */}
            {holdings.length > 0 && settings.showProfitLoss && (
              <div className="grid grid-cols-2 gap-4">
                {/* Best Performer */}
                <div className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-primary)]">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-md bg-[var(--accent-green)]/20 flex items-center justify-center">
                      <TrendingUp size={14} className="text-[var(--accent-green)]" />
                    </div>
                    <span className="text-xs font-medium text-[var(--text-muted)]">Best Performer</span>
                  </div>
                  {bestPerformer && (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-mono text-lg font-semibold text-[var(--text-primary)]">{bestPerformer.symbol}</div>
                        <div className="text-xs text-[var(--text-muted)]">{bestPerformer.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-lg font-semibold text-[var(--accent-green)]">
                          {formatPercent(bestPerformer.gainPercent)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Worst Performer */}
                <div className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-primary)]">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-md bg-[var(--accent-red)]/20 flex items-center justify-center">
                      <TrendingDown size={14} className="text-[var(--accent-red)]" />
                    </div>
                    <span className="text-xs font-medium text-[var(--text-muted)]">Needs Attention</span>
                  </div>
                  {worstPerformer && worstPerformer.gainPercent < 0 ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-mono text-lg font-semibold text-[var(--text-primary)]">{worstPerformer.symbol}</div>
                        <div className="text-xs text-[var(--text-muted)]">{worstPerformer.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-lg font-semibold text-[var(--accent-red)]">
                          {formatPercent(worstPerformer.gainPercent)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-[var(--text-muted)]">All positions are profitable!</div>
                  )}
                </div>
              </div>
            )}

            {/* Weekly Summary */}
            {notifications.weeklyReport && (
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 size={16} className="text-[var(--accent-primary)]" />
                  <span className="text-sm font-semibold text-[var(--text-primary)]">Weekly Summary</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-[var(--text-muted)]">Trades This Week</span>
                    <span className="font-mono text-lg font-semibold text-[var(--text-primary)]">
                      {transactions.filter((tx) => {
                        const txDate = new Date(tx.date);
                        const now = new Date();
                        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        return txDate >= weekAgo;
                      }).length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-[var(--text-muted)]">Portfolio Change</span>
                    <span className={`font-mono text-lg font-semibold ${totalReturns >= 0 ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"}`}>
                      {totalReturns >= 0 ? "+" : ""}{formatCurrency(totalReturns, false)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-[var(--text-muted)]">Active Positions</span>
                    <span className="font-mono text-lg font-semibold text-[var(--text-primary)]">
                      {holdings.length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-[var(--text-muted)]">Buying Power</span>
                    <span className="font-mono text-lg font-semibold text-[var(--text-primary)]">
                      {formatCurrency(buyingPower, false, { convertFromUSD: false })}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Market Movers */}
            {notifications.marketNews && (
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-primary)]">
                  <div className="flex items-center gap-2">
                    <Zap size={16} className="text-[var(--accent-primary)]" />
                    <span className="text-sm font-semibold text-[var(--text-primary)]">Market Movers</span>
                  </div>
                  <Link href="/markets" className="text-[11px] font-medium text-[var(--accent-primary)] hover:underline flex items-center gap-1">
                    View markets <ChevronRight size={12} />
                  </Link>
                </div>

                <div className="grid grid-cols-2 divide-x divide-[var(--border-primary)]">
                  {/* Gainers */}
                  <div className="p-4">
                    <div className="text-[10px] font-semibold text-[var(--accent-green)] uppercase tracking-wider mb-3">Top Gainers</div>
                    <div className="flex flex-col gap-2">
                      {gainers.length > 0 ? gainers.map((stock) => (
                        <div
                          key={stock.symbol}
                          onClick={() => router.push(`/trade?symbol=${stock.symbol}`)}
                          className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[var(--bg-muted)] cursor-pointer transition-colors"
                        >
                          <span className="font-mono text-sm font-medium text-[var(--text-primary)]">{stock.symbol}</span>
                          <span className="font-mono text-xs font-semibold text-[var(--accent-green)]">{formatPercent(stock.changePercent)}</span>
                        </div>
                      )) : (
                        <span className="text-xs text-[var(--text-dim)] py-2">Loading...</span>
                      )}
                    </div>
                  </div>

                  {/* Losers */}
                  <div className="p-4">
                    <div className="text-[10px] font-semibold text-[var(--accent-red)] uppercase tracking-wider mb-3">Top Losers</div>
                    <div className="flex flex-col gap-2">
                      {losers.length > 0 ? losers.map((stock) => (
                        <div
                          key={stock.symbol}
                          onClick={() => router.push(`/trade?symbol=${stock.symbol}`)}
                          className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[var(--bg-muted)] cursor-pointer transition-colors"
                        >
                          <span className="font-mono text-sm font-medium text-[var(--text-primary)]">{stock.symbol}</span>
                          <span className="font-mono text-xs font-semibold text-[var(--accent-red)]">{formatPercent(stock.changePercent)}</span>
                        </div>
                      )) : (
                        <span className="text-xs text-[var(--text-dim)] py-2">Loading...</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Allocation, Watchlist, Recent */}
          <div className="flex flex-col gap-5">
            {/* Portfolio Allocation */}
            <div className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-primary)]">
              <div className="flex items-center gap-2 mb-4">
                <PieChart size={16} className="text-[var(--accent-primary)]" />
                <span className="text-sm font-semibold text-[var(--text-primary)]">Allocation</span>
              </div>

              {/* Allocation Bar */}
              <div className="h-3 rounded-full overflow-hidden flex mb-4 bg-[var(--bg-muted)]">
                {allocation.map((item, idx) => (
                  item.percent > 0 && (
                    <div
                      key={item.label}
                      className="h-full transition-all"
                      style={{
                        width: `${item.percent}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  )
                ))}
              </div>

              {/* Legend */}
              <div className="flex flex-col gap-3">
                {allocation.map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-xs text-[var(--text-muted)]">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-[var(--text-primary)]">{formatCurrency(item.value, false)}</span>
                      <span className="font-mono text-[10px] text-[var(--text-dim)] w-10 text-right">{item.percent.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Watchlist Highlights */}
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-primary)]">
                <div className="flex items-center gap-2">
                  <Star size={16} className="text-[var(--accent-primary)]" />
                  <span className="text-sm font-semibold text-[var(--text-primary)]">Watchlist</span>
                </div>
                <Link href="/watchlist" className="text-[11px] font-medium text-[var(--accent-primary)] hover:underline flex items-center gap-1">
                  View all <ChevronRight size={12} />
                </Link>
              </div>

              {watchlist.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                  <Star size={24} className="text-[var(--text-dim)] mb-2" />
                  <span className="text-xs text-[var(--text-muted)]">No stocks in watchlist</span>
                  <Link href="/watchlist" className="text-[11px] text-[var(--accent-primary)] mt-1 hover:underline">
                    Add stocks to watch
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-primary)]">
                  {(starredWatchlist.length > 0 ? starredWatchlist : watchlist.slice(0, 4)).map((item) => (
                    <div
                      key={item.symbol}
                      onClick={() => router.push(`/trade?symbol=${item.symbol}`)}
                      className="flex items-center justify-between px-5 py-3 hover:bg-[var(--bg-muted)] cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {item.starred && <Star size={10} className="text-[var(--accent-primary)] fill-[var(--accent-primary)]" />}
                        <span className="font-mono text-sm font-medium text-[var(--text-primary)]">{item.symbol}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-[var(--text-muted)]">
                          {formatCurrency(item.price, false, { sourceCurrency: item.currency || "USD" })}
                        </span>
                        <span className={`font-mono text-xs font-medium ${item.changePercent >= 0 ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"}`}>
                          {formatPercent(item.changePercent)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Transactions */}
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] flex flex-col overflow-hidden flex-1">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-primary)]">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-[var(--accent-primary)]" />
                  <span className="text-sm font-semibold text-[var(--text-primary)]">Recent Activity</span>
                </div>
                <Link href="/history" className="text-[11px] font-medium text-[var(--accent-primary)] hover:underline flex items-center gap-1">
                  View all <ChevronRight size={12} />
                </Link>
              </div>

              {transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center px-4 flex-1">
                  <Target size={24} className="text-[var(--text-dim)] mb-2" />
                  <span className="text-xs text-[var(--text-muted)]">No transactions yet</span>
                  <Link href="/trade" className="text-[11px] text-[var(--accent-primary)] mt-1 hover:underline">
                    Start trading
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-primary)] overflow-auto">
                  {transactions.slice(0, 5).map((tx) => (
                    <div key={tx.id} className={`flex items-center justify-between px-5 ${settings.compactMode ? "py-2" : "py-3"}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.type === "BUY" ? "bg-[var(--accent-green)]/20" : "bg-[var(--accent-red)]/20"}`}>
                          {tx.type === "BUY" ? (
                            <ArrowUpRight size={14} className="text-[var(--accent-green)]" />
                          ) : (
                            <ArrowDownRight size={14} className="text-[var(--accent-red)]" />
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-medium text-[var(--text-primary)]">
                            {tx.type} {tx.symbol}
                          </div>
                          <div className="text-[10px] text-[var(--text-dim)]">
                            {tx.shares} shares @ {formatCurrency(tx.price, false)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-mono text-xs font-medium ${tx.type === "BUY" ? "text-[var(--accent-green)]" : "text-[var(--text-muted)]"}`}>
                          {tx.type === "BUY" ? "-" : "+"}{formatCurrency(tx.total, false)}
                        </div>
                        <div className="text-[10px] text-[var(--text-dim)]">
                          {formatDateTime(tx.date)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-4">
          <Link
            href="/trade"
            className="flex items-center gap-4 p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] hover:border-[var(--accent-primary)] transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-[var(--accent-primary)]/20 flex items-center justify-center group-hover:bg-[var(--accent-primary)]/30 transition-colors">
              <Plus size={18} className="text-[var(--accent-primary)]" />
            </div>
            <div>
              <div className="text-sm font-medium text-[var(--text-primary)]">New Trade</div>
              <div className="text-xs text-[var(--text-muted)]">Buy or sell stocks</div>
            </div>
          </Link>

          <Link
            href="/markets"
            className="flex items-center gap-4 p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] hover:border-[var(--accent-primary)] transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-[var(--accent-green)]/20 flex items-center justify-center group-hover:bg-[var(--accent-green)]/30 transition-colors">
              <TrendingUp size={18} className="text-[var(--accent-green)]" />
            </div>
            <div>
              <div className="text-sm font-medium text-[var(--text-primary)]">Markets</div>
              <div className="text-xs text-[var(--text-muted)]">Explore stocks & crypto</div>
            </div>
          </Link>

          <Link
            href="/portfolio"
            className="flex items-center gap-4 p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] hover:border-[var(--accent-primary)] transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-[var(--text-muted)]/20 flex items-center justify-center group-hover:bg-[var(--text-muted)]/30 transition-colors">
              <PieChart size={18} className="text-[var(--text-muted)]" />
            </div>
            <div>
              <div className="text-sm font-medium text-[var(--text-primary)]">Portfolio</div>
              <div className="text-xs text-[var(--text-muted)]">View your holdings</div>
            </div>
          </Link>

          <Link
            href="/history"
            className="flex items-center gap-4 p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] hover:border-[var(--accent-primary)] transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-[var(--border-muted)]/30 flex items-center justify-center group-hover:bg-[var(--border-muted)]/50 transition-colors">
              <Clock size={18} className="text-[var(--text-dim)]" />
            </div>
            <div>
              <div className="text-sm font-medium text-[var(--text-primary)]">History</div>
              <div className="text-xs text-[var(--text-muted)]">Past transactions</div>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
