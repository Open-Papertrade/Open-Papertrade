"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, TrendingUp, Plus, Star } from "lucide-react";
import { stockAPI, StockQuote } from "@/lib/api";
import { usePortfolio } from "@/context/PortfolioContext";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  symbol: string;
  name: string;
  type?: string;
  exchange?: string;
  exchangeDisplay?: string;
  provider: string;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const router = useRouter();
  const { addToWatchlist, watchlist, stocks, crypto, market } = usePortfolio();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({});
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<"search" | "popular">("popular");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Search for symbols (supports both symbol and company name search)
  const handleSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 1) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    setActiveTab("search");

    try {
      // Use search endpoint first (supports name-based search)
      // Pass market preference to filter results
      const searchResponse = await stockAPI.search(searchQuery, market);

      if (searchResponse.results.length > 0) {
        setResults(searchResponse.results);

        // Fetch quotes for search results
        const symbols = searchResponse.results.map(r => r.symbol).slice(0, 8);
        const quotesResponse = await stockAPI.getQuotes(symbols);
        const newQuotes: Record<string, StockQuote> = {};
        Object.entries(quotesResponse.quotes).forEach(([symbol, result]) => {
          if (result.success && result.data) {
            newQuotes[symbol] = result.data;
          }
        });
        setQuotes(newQuotes);
      } else {
        // Fallback: Try direct quote lookup (for exact symbols)
        const quoteResponse = await stockAPI.getQuote(searchQuery);
        if (quoteResponse.success && quoteResponse.data) {
          setResults([{
            symbol: quoteResponse.data.symbol,
            name: quoteResponse.data.name || quoteResponse.data.symbol,
            type: "EQUITY",
            provider: quoteResponse.data.provider,
          }]);
          setQuotes({ [quoteResponse.data.symbol]: quoteResponse.data });
        } else {
          setResults([]);
        }
      }
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [market]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) {
        handleSearch(query);
      } else {
        setActiveTab("popular");
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, handleSearch]);

  const isInWatchlist = (symbol: string) =>
    watchlist.some((w) => w.symbol === symbol);

  const handleAddToWatchlist = (symbol: string) => {
    addToWatchlist(symbol);
  };

  const handleTrade = (symbol: string) => {
    onClose();
    router.push(`/trade?symbol=${symbol}`);
  };

  const popularStocks = [...stocks, ...crypto].slice(0, 8);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-xl bg-[var(--bg-sidebar)] rounded-xl border border-[var(--border-primary)] shadow-2xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-[var(--border-primary)]">
          <Search size={20} className="text-[var(--text-muted)]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or symbol (e.g., Apple, AAPL, Reliance)"
            className="flex-1 bg-transparent text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 hover:bg-[var(--bg-muted)] rounded"
            >
              <X size={16} className="text-[var(--text-muted)]" />
            </button>
          )}
          <span className="text-[11px] text-[var(--text-dim)] font-mono">ESC</span>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-auto">
          {isSearching ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : activeTab === "search" && results.length > 0 ? (
            <div className="py-2">
              <div className="px-4 py-2">
                <span className="text-[10px] font-bold tracking-[1px] text-[var(--text-muted)]">
                  SEARCH RESULTS
                </span>
              </div>
              {results.map((result) => {
                const quote = quotes[result.symbol];
                return (
                  <div
                    key={`${result.symbol}-${result.exchange || ''}`}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-[var(--bg-muted)] cursor-pointer group"
                  >
                    <div className="flex-1" onClick={() => handleTrade(result.symbol)}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-[var(--text-primary)]">
                          {result.symbol}
                        </span>
                        {result.exchangeDisplay && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
                            {result.exchangeDisplay}
                          </span>
                        )}
                        {result.type && result.type !== "EQUITY" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-muted)] text-[var(--text-dim)]">
                            {result.type}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[var(--text-muted)] line-clamp-1">
                        {result.name}
                      </span>
                    </div>
                    {quote && (
                      <div className="text-right">
                        <div className="font-mono text-sm text-[var(--text-primary)]">
                          {formatCurrency(quote.price)}
                        </div>
                        <div className={`font-mono text-xs ${
                          quote.changePercent >= 0
                            ? "text-[var(--accent-green)]"
                            : "text-[var(--accent-red)]"
                        }`}>
                          {formatPercent(quote.changePercent)}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!isInWatchlist(result.symbol) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToWatchlist(result.symbol);
                          }}
                          className="p-1.5 rounded-md hover:bg-[var(--bg-hover)] transition-colors"
                          title="Add to watchlist"
                        >
                          <Star size={14} className="text-[var(--text-muted)]" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTrade(result.symbol);
                        }}
                        className="px-2 py-1 rounded text-[10px] font-semibold bg-[var(--accent-primary)] text-white"
                      >
                        Trade
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : activeTab === "search" && query && results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search size={32} className="text-[var(--text-dim)] mb-3" />
              <span className="text-sm text-[var(--text-muted)]">
                No results found for "{query}"
              </span>
              <span className="text-xs text-[var(--text-dim)] mt-1">
                Try a different symbol or company name
              </span>
            </div>
          ) : (
            <div className="py-2">
              <div className="px-4 py-2">
                <span className="text-[10px] font-bold tracking-[1px] text-[var(--text-muted)]">
                  POPULAR
                </span>
              </div>
              {popularStocks.map((stock) => (
                <div
                  key={stock.symbol}
                  onClick={() => handleTrade(stock.symbol)}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-[var(--bg-muted)] cursor-pointer group"
                >
                  <TrendingUp size={16} className="text-[var(--text-dim)]" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-[var(--text-primary)]">
                        {stock.symbol}
                      </span>
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">
                      {stock.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm text-[var(--text-primary)]">
                      {formatCurrency(stock.price)}
                    </div>
                    <div className={`font-mono text-xs ${
                      stock.changePercent >= 0
                        ? "text-[var(--accent-green)]"
                        : "text-[var(--accent-red)]"
                    }`}>
                      {formatPercent(stock.changePercent)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isInWatchlist(stock.symbol) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToWatchlist(stock.symbol);
                        }}
                        className="p-1.5 rounded-md hover:bg-[var(--bg-hover)] transition-colors"
                        title="Add to watchlist"
                      >
                        <Star size={14} className="text-[var(--text-muted)]" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTrade(stock.symbol);
                      }}
                      className="px-2 py-1 rounded text-[10px] font-semibold bg-[var(--accent-primary)] text-white"
                    >
                      Trade
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-primary)] bg-[var(--bg-card)]">
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-1 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-medium">
              {market === 'IN' ? '🇮🇳 India' : '🇺🇸 US'} Market
            </span>
            <span className="text-[11px] text-[var(--text-dim)]">
              Search by name or symbol
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--text-dim)]">
              <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-muted)] font-mono">↵</kbd> to trade
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
