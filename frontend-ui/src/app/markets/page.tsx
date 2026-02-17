"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import PageHeader from "@/components/PageHeader";
import MetricCard from "@/components/MetricCard";
import { usePortfolio } from "@/context/PortfolioContext";
import { stockAPI, StockQuote } from "@/lib/api";
import { formatCurrency, formatPercent } from "@/lib/utils";

export default function MarketsPage() {
  const { stocks, crypto, addToWatchlist, watchlist, market } = usePortfolio();
  const [indices, setIndices] = useState<StockQuote[]>([]);

  // Fetch market indices whenever the market changes
  useEffect(() => {
    stockAPI.getIndices(market).then((res) => {
      setIndices(res.indices);
    }).catch((err) => {
      console.error("Failed to fetch indices:", err);
    });
  }, [market]);

  const allAssets = [...stocks, ...crypto];

  // Sort by change percent for gainers/losers
  const sortedByChange = [...allAssets].sort((a, b) => b.changePercent - a.changePercent);
  const gainers = sortedByChange.slice(0, 3);
  const losers = sortedByChange.slice(-3).reverse();

  const btcIndex = crypto.find((c) => c.symbol === "BTC");

  const isInWatchlist = (symbol: string) => watchlist.some((w) => w.symbol === symbol);

  return (
    <div className="flex h-full bg-[var(--bg-primary)]">
      <Sidebar />
      <main className="flex-1 flex flex-col gap-7 py-8 px-10 overflow-auto">
        <PageHeader
          title="Markets"
          subtitle="Track global markets and discover trading opportunities"
        />

        {/* Metrics Row */}
        <div className="flex gap-4">
          {indices.map((idx) => (
            <MetricCard
              key={idx.symbol}
              label={idx.symbol}
              value={idx.price.toLocaleString()}
              change={formatPercent(idx.changePercent)}
              isPositive={idx.changePercent >= 0}
            />
          ))}
          <MetricCard
            label="BITCOIN"
            value={btcIndex ? formatCurrency(btcIndex.price, false, { sourceCurrency: btcIndex.currency || 'USD' }) : "—"}
            valueColor="var(--accent-primary)"
            subtext={btcIndex ? formatPercent(btcIndex.changePercent) : ""}
          />
        </div>

        {/* Content Row */}
        <div className="flex gap-4 flex-1 min-h-0">
          {/* Popular Stocks Table */}
          <div className="flex-1 bg-[var(--bg-card)] rounded-xl p-6 border border-[var(--border-primary)] flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                Popular Stocks
              </span>
              <Link
                href="/watchlist"
                className="text-[11px] font-medium text-[var(--accent-primary)] hover:underline"
              >
                View all
              </Link>
            </div>

            {/* Table Header */}
            <div className="flex gap-4 py-3">
              <span className="flex-1 text-[11px] font-semibold tracking-[0.5px] text-[var(--text-muted)]">
                Symbol
              </span>
              <span className="flex-1 text-[11px] font-semibold tracking-[0.5px] text-[var(--text-muted)]">
                Name
              </span>
              <span className="w-24 text-right text-[11px] font-semibold tracking-[0.5px] text-[var(--text-muted)]">
                Price
              </span>
              <span className="w-24 text-right text-[11px] font-semibold tracking-[0.5px] text-[var(--text-muted)]">
                Change
              </span>
              <span className="w-20 text-right text-[11px] font-semibold tracking-[0.5px] text-[var(--text-muted)]">
                Action
              </span>
            </div>

            {/* Table Body */}
            <div className="flex flex-col flex-1 overflow-auto">
              {stocks.map((stock) => (
                <div
                  key={stock.symbol}
                  className="flex gap-4 py-4 border-t border-[var(--border-primary)] items-center"
                >
                  <span className="flex-1 font-mono text-[13px] font-semibold text-[var(--text-primary)]">
                    {stock.symbol}
                  </span>
                  <span className="flex-1 text-[13px] text-[var(--text-secondary)]">
                    {stock.name}
                  </span>
                  <span className="w-24 text-right font-mono text-[13px] text-[var(--text-primary)]">
                    {formatCurrency(stock.price, false, { sourceCurrency: stock.currency || 'USD' })}
                  </span>
                  <span
                    className={`w-24 text-right font-mono text-[13px] ${
                      stock.changePercent >= 0
                        ? "text-[var(--accent-green)]"
                        : "text-[var(--accent-red)]"
                    }`}
                  >
                    {formatPercent(stock.changePercent)}
                  </span>
                  <div className="w-20 flex justify-end gap-2">
                    <Link
                      href="/trade"
                      className="px-2 py-1 rounded text-[10px] font-semibold bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-secondary)]"
                    >
                      Trade
                    </Link>
                    {!isInWatchlist(stock.symbol) && (
                      <button
                        onClick={() => addToWatchlist(stock.symbol)}
                        className="px-2 py-1 rounded text-[10px] font-medium border border-[var(--border-muted)] text-[var(--text-muted)] hover:bg-[var(--bg-muted)]"
                      >
                        +
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Movers Panel */}
          <div className="w-[360px] bg-[var(--bg-card)] rounded-xl p-6 border border-[var(--border-primary)] flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                Top Movers
              </span>
              <Link href="/watchlist" className="text-[11px] font-medium text-[var(--accent-primary)] hover:underline">
                View all
              </Link>
            </div>

            <div className="flex flex-col gap-5 flex-1 overflow-auto">
              {/* Gainers */}
              <div className="flex flex-col gap-3">
                <span className="text-[10px] font-bold tracking-[1px] text-[var(--accent-green)]">
                  GAINERS
                </span>
                {gainers.map((item) => (
                  <div key={item.symbol} className="flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-[13px] font-semibold text-[var(--text-primary)]">
                        {item.symbol}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)]">
                        {item.name}
                      </span>
                    </div>
                    <span className="px-2.5 py-1.5 rounded-md bg-[#22C55E20] font-mono text-xs font-medium text-[var(--accent-green)]">
                      {formatPercent(item.changePercent)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Losers */}
              <div className="flex flex-col gap-3">
                <span className="text-[10px] font-bold tracking-[1px] text-[var(--accent-red)]">
                  LOSERS
                </span>
                {losers.map((item) => (
                  <div key={item.symbol} className="flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-[13px] font-semibold text-[var(--text-primary)]">
                        {item.symbol}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)]">
                        {item.name}
                      </span>
                    </div>
                    <span className="px-2.5 py-1.5 rounded-md bg-[#EF444420] font-mono text-xs font-medium text-[var(--accent-red)]">
                      {formatPercent(item.changePercent)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
