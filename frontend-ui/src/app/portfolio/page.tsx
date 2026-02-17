"use client";

import { useMemo } from "react";
import type { ReactElement } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Wallet,
  BarChart3,
  Plus,
  ExternalLink,
  RefreshCw,
  Loader2,
  AlertCircle,
  Clock,
  DollarSign,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import PageHeader from "@/components/PageHeader";
import { usePortfolio } from "@/context/PortfolioContext";
import { formatCurrency, formatPercent } from "@/lib/utils";

export default function PortfolioPage() {
  const router = useRouter();
  const {
    holdings,
    totalPortfolioValue,
    totalInvested,
    totalReturns,
    returnsPercent,
    dayGain,
    dayGainPercent,
    buyingPower,
    getStockBySymbol,
    isLoading,
    error,
    lastUpdated,
    refreshPrices,
    refreshUserData,
    settings,
  } = usePortfolio();

  // Handle manual refresh
  const handleRefresh = async () => {
    await Promise.all([refreshUserData(), refreshPrices()]);
  };

  // Calculate P/L for each holding and sort
  const holdingsWithPL = useMemo(() => {
    return holdings.map((holding) => {
      const stock = getStockBySymbol(holding.symbol);
      const currentPrice = stock?.price || holding.currentPrice;
      const value = holding.shares * currentPrice;
      const costBasis = holding.shares * holding.avgCost;
      const pl = value - costBasis;
      const plPercent = costBasis > 0 ? (pl / costBasis) * 100 : 0;
      // Use change data from holding (set during refresh) or fallback to stock
      const change = holding.change ?? stock?.change ?? 0;
      const changePercent = holding.changePercent ?? stock?.changePercent ?? 0;
      const dayChange = change * holding.shares;

      return {
        ...holding,
        currentPrice,
        value,
        costBasis,
        pl,
        plPercent,
        dayChange,
        dayChangePercent: changePercent,
        currency: holding.currency || stock?.currency || "USD",
      };
    });
  }, [holdings, getStockBySymbol]);

  // Sort by value for allocation
  const sortedByValue = useMemo(
    () => [...holdingsWithPL].sort((a, b) => b.value - a.value),
    [holdingsWithPL]
  );

  // Top gainers and losers
  const topGainer = useMemo(
    () => {
      const candidates = holdingsWithPL.filter(h => h.plPercent > 0);
      return candidates.length > 0
        ? candidates.reduce((best, h) => (h.plPercent > best.plPercent ? h : best))
        : null;
    },
    [holdingsWithPL]
  );

  const topLoser = useMemo(
    () => {
      const candidates = holdingsWithPL.filter(h => h.plPercent < 0);
      return candidates.length > 0
        ? candidates.reduce((worst, h) => (h.plPercent < worst.plPercent ? h : worst))
        : null;
    },
    [holdingsWithPL]
  );

  // Allocation colors
  const COLORS = [
    "#FF5C00",
    "#22C55E",
    "#3B82F6",
    "#A855F7",
    "#EC4899",
    "#F59E0B",
    "#06B6D4",
    "#6366F1",
  ];

  // Calculate allocation percentages
  const allocations = useMemo(() => {
    if (totalPortfolioValue === 0) return [];
    return sortedByValue.slice(0, 6).map((h, i) => ({
      symbol: h.symbol,
      name: h.name,
      value: h.value,
      percent: (h.value / totalPortfolioValue) * 100,
      color: COLORS[i % COLORS.length],
    }));
  }, [sortedByValue, totalPortfolioValue]);

  // "Others" category if more than 6 holdings
  const othersValue = useMemo(() => {
    if (sortedByValue.length <= 6) return 0;
    return sortedByValue.slice(6).reduce((sum, h) => sum + h.value, 0);
  }, [sortedByValue]);

  const handleRowClick = (symbol: string) => {
    router.push(`/trade?symbol=${symbol}`);
  };

  // Empty state
  if (holdings.length === 0) {
    return (
      <div className="flex h-full bg-[var(--bg-primary)]">
        <Sidebar />
        <main className="flex-1 flex flex-col gap-7 py-8 px-10 overflow-auto">
          <div className="flex items-start justify-between">
            <PageHeader
              title="Portfolio"
              subtitle="Track your holdings and investment performance"
            />

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-primary)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)] transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )}
              {isLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/20">
              <AlertCircle size={16} className="text-[var(--accent-red)]" />
              <span className="text-sm text-[var(--accent-red)]">{error}</span>
            </div>
          )}

          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-6 text-center max-w-md">
              <div className="w-20 h-20 rounded-full bg-[var(--bg-card)] border border-[var(--border-primary)] flex items-center justify-center">
                {isLoading ? (
                  <Loader2 size={32} className="text-[var(--accent-primary)] animate-spin" />
                ) : (
                  <PieChart size={32} className="text-[var(--text-muted)]" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                  {isLoading ? "Loading your portfolio..." : "No holdings yet"}
                </h2>
                <p className="text-sm text-[var(--text-muted)]">
                  {isLoading
                    ? "Fetching your holdings and current prices from the market."
                    : "Start building your portfolio by buying your first stock or crypto. Your holdings will appear here."}
                </p>
              </div>
              {!isLoading && (
                <>
                  <div className="flex gap-3">
                    <Link
                      href="/trade"
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--accent-primary)] text-black text-sm font-semibold hover:brightness-110 transition-all"
                    >
                      <Plus size={16} />
                      Make your first trade
                    </Link>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                    <Wallet size={14} />
                    <span>
                      Buying Power: <span className="text-[var(--text-primary)] font-mono">{formatCurrency(buyingPower, false, { convertFromUSD: false })}</span>
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-[var(--bg-primary)]">
      <Sidebar />
      <main className="flex-1 flex flex-col gap-6 py-8 px-10 overflow-auto">
        <PageHeader
          title="Portfolio"
          subtitle="Track your holdings and investment performance"
        />

        {/* Error Banner */}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/20">
            <AlertCircle size={16} className="text-[var(--accent-red)]" />
            <span className="text-sm text-[var(--accent-red)]">{error}</span>
          </div>
        )}

        {/* Summary Cards Row */}
        <div className="grid grid-cols-4 gap-4">
          {/* Total Value */}
          <div className={`bg-[var(--bg-card)] rounded-xl ${settings.compactMode ? "p-3" : "p-5"} border border-[var(--border-primary)]`}>
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 size={14} className="text-[var(--text-muted)]" />
              <span className="text-xs font-medium text-[var(--text-muted)]">Total Value</span>
            </div>
            <div className="font-mono text-2xl font-semibold text-[var(--text-primary)]">
              {formatCurrency(totalPortfolioValue, false, { convertFromUSD: false })}
            </div>
            <div className="flex items-center gap-1 mt-2">
              {dayGain >= 0 ? (
                <ArrowUpRight size={14} className="text-[var(--accent-green)]" />
              ) : (
                <ArrowDownRight size={14} className="text-[var(--accent-red)]" />
              )}
              <span
                className={`text-xs font-mono ${
                  dayGain >= 0 ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"
                }`}
              >
                {dayGain >= 0 ? "+" : ""}
                {formatCurrency(dayGain, false, { convertFromUSD: false })} today
              </span>
            </div>
          </div>

          {/* Total Returns (shown) / Total Invested (when P/L hidden) */}
          {settings.showProfitLoss ? (
            <div className={`bg-[var(--bg-card)] rounded-xl ${settings.compactMode ? "p-3" : "p-5"} border border-[var(--border-primary)]`}>
              <div className="flex items-center gap-2 mb-3">
                {totalReturns >= 0 ? (
                  <TrendingUp size={14} className="text-[var(--accent-green)]" />
                ) : (
                  <TrendingDown size={14} className="text-[var(--accent-red)]" />
                )}
                <span className="text-xs font-medium text-[var(--text-muted)]">Total Returns</span>
              </div>
              <div
                className={`font-mono text-2xl font-semibold ${
                  totalReturns >= 0 ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"
                }`}
              >
                {totalReturns >= 0 ? "+" : ""}
                {formatCurrency(totalReturns, false, { convertFromUSD: false })}
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-2 font-mono">
                {formatPercent(returnsPercent)} all time
              </div>
            </div>
          ) : (
            <div className={`bg-[var(--bg-card)] rounded-xl ${settings.compactMode ? "p-3" : "p-5"} border border-[var(--border-primary)]`}>
              <div className="flex items-center gap-2 mb-3">
                <DollarSign size={14} className="text-[var(--text-muted)]" />
                <span className="text-xs font-medium text-[var(--text-muted)]">Total Invested</span>
              </div>
              <div className="font-mono text-2xl font-semibold text-[var(--text-primary)]">
                {formatCurrency(totalInvested, false, { convertFromUSD: false })}
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-2">
                in {holdings.length} position{holdings.length !== 1 ? "s" : ""}
              </div>
            </div>
          )}

          {/* Invested Amount */}
          <div className={`bg-[var(--bg-card)] rounded-xl ${settings.compactMode ? "p-3" : "p-5"} border border-[var(--border-primary)]`}>
            <div className="flex items-center gap-2 mb-3">
              <Wallet size={14} className="text-[var(--text-muted)]" />
              <span className="text-xs font-medium text-[var(--text-muted)]">Invested</span>
            </div>
            <div className="font-mono text-2xl font-semibold text-[var(--text-primary)]">
              {formatCurrency(totalInvested, false, { convertFromUSD: false })}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-2">
              in {holdings.length} position{holdings.length !== 1 ? "s" : ""}
            </div>
          </div>

          {/* Buying Power */}
          <div className={`bg-[var(--bg-card)] rounded-xl ${settings.compactMode ? "p-3" : "p-5"} border border-[var(--border-primary)]`}>
            <div className="flex items-center gap-2 mb-3">
              <Plus size={14} className="text-[var(--text-muted)]" />
              <span className="text-xs font-medium text-[var(--text-muted)]">Buying Power</span>
            </div>
            <div className="font-mono text-2xl font-semibold text-[var(--text-primary)]">
              {formatCurrency(buyingPower, false, { convertFromUSD: false })}
            </div>
            <Link
              href="/trade"
              className="text-xs text-[var(--accent-primary)] hover:underline mt-2 inline-block"
            >
              Trade now →
            </Link>
          </div>
        </div>

        {/* Main Content Row */}
        <div className="flex gap-5 flex-1 min-h-0">
          {/* Holdings Table */}
          <div className="flex-1 bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] flex flex-col overflow-hidden">
            {/* Table Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-primary)]">
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                Holdings ({holdings.length})
              </span>
              <Link
                href="/trade"
                className="flex items-center gap-1 text-xs font-medium text-[var(--accent-primary)] hover:underline"
              >
                <Plus size={12} />
                Add position
              </Link>
            </div>

            {/* Column Headers */}
            <div className={`grid ${settings.showProfitLoss ? "grid-cols-12" : "grid-cols-9"} gap-2 px-5 py-3 bg-[var(--bg-card-inner)] text-[10px] font-semibold tracking-wider text-[var(--text-muted)] uppercase`}>
              <span className="col-span-3">Asset</span>
              <span className="col-span-2 text-right">Shares</span>
              <span className="col-span-2 text-right">Price</span>
              <span className="col-span-2 text-right">Value</span>
              {settings.showProfitLoss && (
                <span className="col-span-3 text-right">P/L</span>
              )}
            </div>

            {/* Table Body */}
            <div className="flex-1 overflow-auto">
              {holdingsWithPL.map((holding) => {
                const isPositive = holding.pl >= 0;
                const isDayPositive = holding.dayChange >= 0;

                return (
                  <div
                    key={holding.symbol}
                    onClick={() => handleRowClick(holding.symbol)}
                    className={`grid ${settings.showProfitLoss ? "grid-cols-12" : "grid-cols-9"} gap-2 px-5 ${settings.compactMode ? "py-2" : "py-4"} border-b border-[var(--border-primary)] hover:bg-[var(--bg-hover)] cursor-pointer transition-colors group`}
                  >
                    {/* Asset */}
                    <div className="col-span-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[var(--bg-muted)] flex items-center justify-center shrink-0">
                        <span className="font-mono text-xs font-bold text-[var(--text-primary)]">
                          {holding.symbol.slice(0, 2)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="font-mono text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1">
                          {holding.symbol}
                          <ExternalLink
                            size={10}
                            className="text-[var(--text-dim)] opacity-0 group-hover:opacity-100 transition-opacity"
                          />
                        </div>
                        <div className="text-xs text-[var(--text-muted)] truncate">
                          {holding.name}
                        </div>
                      </div>
                    </div>

                    {/* Shares */}
                    <div className="col-span-2 flex items-center justify-end">
                      <span className="font-mono text-sm text-[var(--text-secondary)]">
                        {holding.shares}
                      </span>
                    </div>

                    {/* Price */}
                    <div className="col-span-2 flex flex-col items-end justify-center">
                      <span className="font-mono text-sm text-[var(--text-primary)]">
                        {formatCurrency(holding.currentPrice, false, {
                          sourceCurrency: holding.currency,
                        })}
                      </span>
                      <span
                        className={`font-mono text-[10px] ${
                          isDayPositive ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"
                        }`}
                      >
                        {isDayPositive ? "+" : ""}
                        {formatPercent(holding.dayChangePercent)}
                      </span>
                    </div>

                    {/* Value */}
                    <div className="col-span-2 flex items-center justify-end">
                      <span className="font-mono text-sm font-medium text-[var(--text-primary)]">
                        {formatCurrency(holding.value, false, {
                          sourceCurrency: holding.currency,
                        })}
                      </span>
                    </div>

                    {/* P/L */}
                    {settings.showProfitLoss && (
                      <div className="col-span-3 flex flex-col items-end justify-center">
                        <span
                          className={`font-mono text-sm font-medium ${
                            isPositive ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"
                          }`}
                        >
                          {isPositive ? "+" : ""}
                          {formatCurrency(holding.pl, false, {
                            sourceCurrency: holding.currency,
                          })}
                        </span>
                        <span
                          className={`font-mono text-[10px] ${
                            isPositive ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"
                          }`}
                        >
                          {formatPercent(holding.plPercent)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-[340px] flex flex-col gap-5 shrink-0">
            {/* Allocation Card */}
            <div className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-primary)]">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-[var(--text-primary)]">Allocation</span>
                <PieChart size={14} className="text-[var(--text-muted)]" />
              </div>

              {/* Donut Chart Visual */}
              <div className="relative w-32 h-32 mx-auto mb-5">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  {allocations.reduce(
                    (acc, alloc, i) => {
                      const circumference = 2 * Math.PI * 40;
                      const strokeDasharray = (alloc.percent / 100) * circumference;
                      const strokeDashoffset = -acc.offset;

                      acc.elements.push(
                        <circle
                          key={alloc.symbol}
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke={alloc.color}
                          strokeWidth="12"
                          strokeDasharray={`${strokeDasharray} ${circumference}`}
                          strokeDashoffset={strokeDashoffset}
                          className="transition-all duration-500"
                        />
                      );
                      acc.offset += strokeDasharray;
                      return acc;
                    },
                    { elements: [] as ReactElement[], offset: 0 }
                  ).elements}
                  {othersValue > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="var(--bg-bar)"
                      strokeWidth="12"
                      strokeDasharray={`${((othersValue / totalPortfolioValue) * 100 / 100) * (2 * Math.PI * 40)} ${2 * Math.PI * 40}`}
                      strokeDashoffset={-allocations.reduce((sum, a) => sum + (a.percent / 100) * (2 * Math.PI * 40), 0)}
                    />
                  )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-mono text-lg font-semibold text-[var(--text-primary)]">
                    {holdings.length}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">positions</span>
                </div>
              </div>

              {/* Allocation List */}
              <div className="flex flex-col gap-2.5">
                {allocations.map((alloc) => (
                  <div key={alloc.symbol} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: alloc.color }}
                      />
                      <span className="text-xs text-[var(--text-primary)]">{alloc.symbol}</span>
                    </div>
                    <span className="font-mono text-xs text-[var(--text-muted)]">
                      {alloc.percent.toFixed(1)}%
                    </span>
                  </div>
                ))}
                {othersValue > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: "var(--bg-bar)" }}
                      />
                      <span className="text-xs text-[var(--text-muted)]">
                        Others ({sortedByValue.length - 6})
                      </span>
                    </div>
                    <span className="font-mono text-xs text-[var(--text-muted)]">
                      {((othersValue / totalPortfolioValue) * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Top Performers */}
            {settings.showProfitLoss && (
            <div className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-primary)]">
              <span className="text-sm font-semibold text-[var(--text-primary)] block mb-4">
                Performance
              </span>

              {/* Top Gainer */}
              {topGainer && (
                <div
                  className="flex items-center justify-between p-3 rounded-lg bg-[var(--accent-green)]/10 mb-3 cursor-pointer hover:bg-[var(--accent-green)]/15 transition-colors"
                  onClick={() => handleRowClick(topGainer.symbol)}
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-[var(--accent-green)]" />
                    <div>
                      <span className="text-xs text-[var(--text-muted)]">Top Gainer</span>
                      <div className="font-mono text-sm font-semibold text-[var(--text-primary)]">
                        {topGainer.symbol}
                      </div>
                    </div>
                  </div>
                  <span className="font-mono text-sm font-semibold text-[var(--accent-green)]">
                    {topGainer.plPercent >= 0 ? "+" : ""}{topGainer.plPercent.toFixed(2)}%
                  </span>
                </div>
              )}

              {/* Top Loser */}
              {topLoser && topLoser.pl < 0 && (
                <div
                  className="flex items-center justify-between p-3 rounded-lg bg-[var(--accent-red)]/10 cursor-pointer hover:bg-[var(--accent-red)]/15 transition-colors"
                  onClick={() => handleRowClick(topLoser.symbol)}
                >
                  <div className="flex items-center gap-2">
                    <TrendingDown size={14} className="text-[var(--accent-red)]" />
                    <div>
                      <span className="text-xs text-[var(--text-muted)]">Top Loser</span>
                      <div className="font-mono text-sm font-semibold text-[var(--text-primary)]">
                        {topLoser.symbol}
                      </div>
                    </div>
                  </div>
                  <span className="font-mono text-sm font-semibold text-[var(--accent-red)]">
                    {topLoser.plPercent.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
            )}

            {/* Quick Stats */}
            <div className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-primary)] flex-1">
              <span className="text-sm font-semibold text-[var(--text-primary)] block mb-4">
                Today's Summary
              </span>

              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-muted)]">Day's Change</span>
                  <span
                    className={`font-mono text-sm font-medium ${
                      dayGain >= 0 ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"
                    }`}
                  >
                    {dayGain >= 0 ? "+" : ""}
                    {formatCurrency(dayGain, false, { convertFromUSD: false })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-muted)]">Day's Return</span>
                  <span
                    className={`font-mono text-sm font-medium ${
                      dayGainPercent >= 0 ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"
                    }`}
                  >
                    {formatPercent(dayGainPercent)}
                  </span>
                </div>
                <div className="h-px bg-[var(--border-primary)]" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-muted)]">Winners</span>
                  <span className="font-mono text-sm text-[var(--accent-green)]">
                    {holdingsWithPL.filter((h) => h.dayChange > 0).length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-muted)]">Losers</span>
                  <span className="font-mono text-sm text-[var(--accent-red)]">
                    {holdingsWithPL.filter((h) => h.dayChange < 0).length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-muted)]">Unchanged</span>
                  <span className="font-mono text-sm text-[var(--text-muted)]">
                    {holdingsWithPL.filter((h) => h.dayChange === 0).length}
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
