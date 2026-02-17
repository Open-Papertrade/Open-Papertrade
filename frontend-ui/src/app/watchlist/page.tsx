"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Star,
  ArrowUp,
  ArrowDown,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Bell,
  BellOff,
  TrendingUp,
  TrendingDown,
  Eye,
  Filter,
  Loader2,
  AlertCircle,
  Trash2,
  ShoppingCart,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import PageHeader from "@/components/PageHeader";
import { usePortfolio } from "@/context/PortfolioContext";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { stockAPI } from "@/lib/api";

type SortOption = "name" | "price" | "change" | "changePercent";
type FilterOption = "all" | "starred" | "gainers" | "losers";

export default function WatchlistPage() {
  const router = useRouter();
  const {
    watchlist,
    alerts,
    stocks,
    crypto,
    market,
    settings,
    notifications,
    toggleWatchlistStar,
    removeFromWatchlist,
    addToWatchlist,
    toggleAlert,
    addAlert,
    removeAlert,
    getStockBySymbol,
    error,
  } = usePortfolio();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ symbol: string; name: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAddAlert, setShowAddAlert] = useState(false);
  const [selectedSymbolForAlert, setSelectedSymbolForAlert] = useState<string | null>(null);
  const [newAlertCondition, setNewAlertCondition] = useState<"above" | "below">("above");
  const [newAlertPrice, setNewAlertPrice] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [showFilters, setShowFilters] = useState(false);

  // Debounce timer ref
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Stats
  const upToday = watchlist.filter((w) => w.changePercent > 0).length;
  const downToday = watchlist.filter((w) => w.changePercent < 0).length;
  const starredCount = watchlist.filter((w) => w.starred).length;

  // Filter and sort watchlist
  const filteredWatchlist = useMemo(() => {
    let filtered = [...watchlist];

    // Apply filter
    switch (filterBy) {
      case "starred":
        filtered = filtered.filter((w) => w.starred);
        break;
      case "gainers":
        filtered = filtered.filter((w) => w.changePercent > 0);
        break;
      case "losers":
        filtered = filtered.filter((w) => w.changePercent < 0);
        break;
    }

    // Apply search
    if (searchQuery && !isSearching) {
      filtered = filtered.filter(
        (w) =>
          w.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          w.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "price":
          return b.price - a.price;
        case "change":
          return b.change - a.change;
        case "changePercent":
          return b.changePercent - a.changePercent;
        default:
          return a.symbol.localeCompare(b.symbol);
      }
    });

    return filtered;
  }, [watchlist, searchQuery, isSearching, sortBy, filterBy]);

  // Search for stocks to add - with debouncing
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);

    // Clear any pending search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    // Show searching state immediately
    setIsSearching(true);

    // Debounce the API call by 300ms
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await stockAPI.search(query, market);
        // Filter out stocks already in watchlist
        const filtered = results.results.filter(
          (r) => !watchlist.find((w) => w.symbol === r.symbol)
        );
        setSearchResults(filtered.slice(0, 8));
      } catch (err) {
        console.error("Search failed:", err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, [watchlist, market]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleAddToWatchlist = async (symbol: string, name: string) => {
    await addToWatchlist(symbol, name);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleAddAlert = () => {
    if (selectedSymbolForAlert && newAlertPrice) {
      addAlert(selectedSymbolForAlert, newAlertCondition, parseFloat(newAlertPrice));
      setShowAddAlert(false);
      setSelectedSymbolForAlert(null);
      setNewAlertPrice("");
    }
  };

  const openAlertModal = (symbol: string) => {
    const stock = watchlist.find((w) => w.symbol === symbol);
    setSelectedSymbolForAlert(symbol);
    setNewAlertPrice(stock ? stock.price.toString() : "");
    setShowAddAlert(true);
  };

  const navigateToTrade = (symbol: string) => {
    router.push(`/trade?symbol=${symbol}`);
  };

  // Get alerts for a symbol
  const getAlertsForSymbol = (symbol: string) => {
    return alerts.filter((a) => a.symbol === symbol);
  };

  // Empty state - show regardless of loading when watchlist is empty
  if (watchlist.length === 0) {
    return (
      <div className="flex h-full bg-[var(--bg-primary)]">
        <Sidebar />
        <main className="flex-1 flex flex-col gap-7 py-8 px-10 overflow-auto">
          <PageHeader
            title="Watchlist"
            subtitle="Track your favorite stocks and set price alerts"
          />

          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-6 text-center max-w-md">
              <div className="w-20 h-20 rounded-full bg-[var(--bg-card)] border border-[var(--border-primary)] flex items-center justify-center">
                <Eye size={32} className="text-[var(--text-muted)]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                  Your watchlist is empty
                </h2>
                <p className="text-sm text-[var(--text-muted)]">
                  Start tracking stocks by searching and adding them to your watchlist.
                  You'll be able to monitor prices and set alerts.
                </p>
              </div>

              {/* Quick search to add */}
              <div className="w-full max-w-sm">
                <div className="relative">
                  <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)]">
                    <Search size={18} className="text-[var(--text-muted)]" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      placeholder="Search for a stock to add..."
                      className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
                    />
                    {isSearching && <Loader2 size={16} className="text-[var(--text-muted)] animate-spin" />}
                  </div>

                  {/* Search results dropdown */}
                  {searchResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-2 bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] shadow-lg z-10 overflow-hidden">
                      {searchResults.map((result) => (
                        <button
                          key={result.symbol}
                          onClick={() => handleAddToWatchlist(result.symbol, result.name)}
                          className="w-full px-4 py-3 text-left hover:bg-[var(--bg-muted)] transition-colors flex items-center justify-between"
                        >
                          <div>
                            <span className="font-mono text-sm font-semibold text-[var(--text-primary)]">
                              {result.symbol}
                            </span>
                            <span className="text-xs text-[var(--text-muted)] ml-2">
                              {result.name}
                            </span>
                          </div>
                          <Plus size={16} className="text-[var(--accent-primary)]" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick picks */}
              <div className="flex flex-wrap gap-2 justify-center">
                {stocks.slice(0, 5).map((stock) => (
                  <button
                    key={stock.symbol}
                    onClick={() => addToWatchlist(stock.symbol, stock.name)}
                    className="px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-primary)] text-xs font-mono font-semibold text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all"
                  >
                    + {stock.symbol}
                  </button>
                ))}
              </div>
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
          title="Watchlist"
          subtitle="Track your favorite stocks and set price alerts"
          onPrimaryClick={() => router.push("/trade")}
        />

        {/* Error Banner */}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/20">
            <AlertCircle size={16} className="text-[var(--accent-red)]" />
            <span className="text-sm text-[var(--accent-red)]">{error}</span>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-primary)]">
            <div className="flex items-center gap-2 mb-2">
              <Eye size={14} className="text-[var(--text-muted)]" />
              <span className="text-xs text-[var(--text-muted)]">Watching</span>
            </div>
            <span className="font-mono text-2xl font-semibold text-[var(--text-primary)]">
              {watchlist.length}
            </span>
          </div>

          <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-primary)]">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={14} className="text-[var(--accent-green)]" />
              <span className="text-xs text-[var(--text-muted)]">Gainers</span>
            </div>
            <span className="font-mono text-2xl font-semibold text-[var(--accent-green)]">
              {upToday}
            </span>
          </div>

          <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-primary)]">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={14} className="text-[var(--accent-red)]" />
              <span className="text-xs text-[var(--text-muted)]">Losers</span>
            </div>
            <span className="font-mono text-2xl font-semibold text-[var(--accent-red)]">
              {downToday}
            </span>
          </div>

          <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-primary)]">
            <div className="flex items-center gap-2 mb-2">
              <Bell size={14} className="text-[var(--accent-primary)]" />
              <span className="text-xs text-[var(--text-muted)]">Active Alerts</span>
            </div>
            <span className="font-mono text-2xl font-semibold text-[var(--accent-primary)]">
              {alerts.filter((a) => a.enabled).length}
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex gap-5 flex-1 min-h-0">
          {/* Watchlist */}
          <div className="flex-1 bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border-primary)]">
              {/* Search */}
              <div className="relative flex-1">
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border border-[var(--border-muted)] bg-[var(--bg-card-inner)]">
                  <Search size={16} className="text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search or add stocks..."
                    className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
                  />
                  {isSearching && <Loader2 size={14} className="text-[var(--text-muted)] animate-spin" />}
                  {searchQuery && !isSearching && (
                    <button onClick={() => { setSearchQuery(""); setSearchResults([]); }}>
                      <X size={14} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]" />
                    </button>
                  )}
                </div>

                {/* Search results */}
                {searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-[var(--bg-card)] rounded-lg border border-[var(--border-primary)] shadow-lg z-20 overflow-hidden">
                    <div className="px-3 py-2 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border-primary)]">
                      Add to Watchlist
                    </div>
                    {searchResults.map((result) => (
                      <button
                        key={result.symbol}
                        onClick={() => handleAddToWatchlist(result.symbol, result.name)}
                        className="w-full px-4 py-2.5 text-left hover:bg-[var(--bg-muted)] transition-colors flex items-center justify-between"
                      >
                        <div>
                          <span className="font-mono text-sm font-semibold text-[var(--text-primary)]">
                            {result.symbol}
                          </span>
                          <span className="text-xs text-[var(--text-muted)] ml-2 truncate">
                            {result.name}
                          </span>
                        </div>
                        <Plus size={14} className="text-[var(--accent-primary)]" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Filter */}
              <div className="relative">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all ${
                    filterBy !== "all"
                      ? "border-[var(--accent-primary)] text-[var(--accent-primary)]"
                      : "border-[var(--border-muted)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]"
                  }`}
                >
                  <Filter size={14} />
                  {filterBy === "all" ? "Filter" : filterBy.charAt(0).toUpperCase() + filterBy.slice(1)}
                </button>

                {showFilters && (
                  <div className="absolute right-0 top-full mt-2 w-36 bg-[var(--bg-card)] rounded-lg border border-[var(--border-primary)] shadow-lg z-20 overflow-hidden">
                    {(["all", "starred", "gainers", "losers"] as FilterOption[]).map((option) => (
                      <button
                        key={option}
                        onClick={() => { setFilterBy(option); setShowFilters(false); }}
                        className={`w-full px-4 py-2 text-left text-xs transition-colors ${
                          filterBy === option
                            ? "bg-[var(--accent-primary)] text-black font-semibold"
                            : "text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
                        }`}
                      >
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-3 py-2.5 rounded-lg border border-[var(--border-muted)] bg-[var(--bg-card-inner)] text-xs text-[var(--text-primary)] outline-none cursor-pointer"
              >
                <option value="name">Sort: Name</option>
                <option value="price">Sort: Price</option>
                <option value="change">Sort: Change</option>
                <option value="changePercent">Sort: % Change</option>
              </select>
            </div>

            {/* Watchlist Grid */}
            <div className="flex-1 overflow-auto p-5">
              <div className={`grid grid-cols-3 ${settings.compactMode ? "gap-3" : "gap-4"}`}>
                {filteredWatchlist.map((stock) => {
                  const stockAlerts = getAlertsForSymbol(stock.symbol);
                  const hasActiveAlert = stockAlerts.some((a) => a.enabled);
                  const isPositive = stock.changePercent >= 0;

                  return (
                    <div
                      key={stock.symbol}
                      className={`bg-[var(--bg-card-inner)] rounded-xl ${settings.compactMode ? "p-3" : "p-4"} border border-[var(--border-primary)] hover:border-[var(--border-muted)] transition-all group relative`}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div
                          className="cursor-pointer"
                          onClick={() => navigateToTrade(stock.symbol)}
                        >
                          <div className="font-mono text-base font-semibold text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-colors">
                            {stock.symbol}
                          </div>
                          <div className="text-[11px] text-[var(--text-muted)] truncate max-w-[120px]">
                            {stock.name}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {hasActiveAlert && (
                            <Bell size={12} className="text-[var(--accent-primary)]" />
                          )}
                          <button
                            onClick={() => toggleWatchlistStar(stock.symbol)}
                            className="p-1 rounded-md hover:bg-[var(--bg-muted)] transition-colors"
                          >
                            <Star
                              size={14}
                              className={
                                stock.starred
                                  ? "text-[var(--accent-primary)] fill-[var(--accent-primary)]"
                                  : "text-[var(--text-dim)] hover:text-[var(--accent-primary)]"
                              }
                            />
                          </button>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="mb-3">
                        <div className="font-mono text-xl font-semibold text-[var(--text-primary)]">
                          {formatCurrency(stock.price, false, { sourceCurrency: stock.currency || "USD" })}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          {isPositive ? (
                            <ArrowUpRight size={14} className="text-[var(--accent-green)]" />
                          ) : (
                            <ArrowDownRight size={14} className="text-[var(--accent-red)]" />
                          )}
                          <span
                            className={`font-mono text-xs font-medium ${
                              isPositive ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"
                            }`}
                          >
                            {formatCurrency(Math.abs(stock.change), false, { sourceCurrency: stock.currency || "USD" })} ({formatPercent(stock.changePercent)})
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-3 border-t border-[var(--border-primary)]">
                        <button
                          onClick={() => navigateToTrade(stock.symbol)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[var(--accent-primary)] text-[11px] font-semibold text-black hover:brightness-110 transition-all"
                        >
                          <ShoppingCart size={12} />
                          Trade
                        </button>
                        <button
                          onClick={() => openAlertModal(stock.symbol)}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--bg-muted)] text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
                        >
                          <Bell size={12} />
                        </button>
                        <button
                          onClick={() => removeFromWatchlist(stock.symbol)}
                          className="flex items-center justify-center px-2 py-2 rounded-lg text-[var(--text-dim)] hover:text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10 transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredWatchlist.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Search size={32} className="text-[var(--text-dim)] mb-3" />
                  <span className="text-sm text-[var(--text-muted)]">
                    {searchQuery ? "No stocks match your search" : "No stocks match the current filter"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Alerts Panel */}
          <div className="w-[340px] bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] flex flex-col overflow-hidden shrink-0">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-primary)]">
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                Price Alerts ({alerts.length})
              </span>
            </div>

            {/* Alerts List */}
            <div className="flex-1 overflow-auto p-4">
              {alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <BellOff size={32} className="text-[var(--text-dim)] mb-3" />
                  <span className="text-sm text-[var(--text-muted)] mb-1">No alerts set</span>
                  <span className="text-xs text-[var(--text-dim)]">
                    Click the bell icon on any stock to create one
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {alerts.map((alert) => {
                    const watchlistItem = watchlist.find((w) => w.symbol === alert.symbol);
                    const currentPrice = watchlistItem?.price || alert.currentPrice;
                    const currency = watchlistItem?.currency || "USD";
                    const distance = alert.condition === "above"
                      ? ((alert.targetPrice - currentPrice) / currentPrice) * 100
                      : ((currentPrice - alert.targetPrice) / currentPrice) * 100;
                    const isClose = Math.abs(distance) < 5;
                    const isTriggered = alert.condition === "above"
                      ? currentPrice >= alert.targetPrice
                      : currentPrice <= alert.targetPrice;
                    const showTriggered = isTriggered && notifications.priceAlerts;

                    return (
                      <div
                        key={alert.id}
                        className={`rounded-xl p-4 border transition-all ${
                          showTriggered
                            ? "bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/30"
                            : isClose
                            ? "bg-[var(--bg-card-inner)] border-[var(--accent-primary)]/20"
                            : "bg-[var(--bg-card-inner)] border-[var(--border-primary)]"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                alert.condition === "above"
                                  ? "bg-[var(--accent-green)]/20"
                                  : "bg-[var(--accent-red)]/20"
                              }`}
                            >
                              {alert.condition === "above" ? (
                                <ArrowUp size={14} className="text-[var(--accent-green)]" />
                              ) : (
                                <ArrowDown size={14} className="text-[var(--accent-red)]" />
                              )}
                            </div>
                            <div>
                              <div className="font-mono text-sm font-semibold text-[var(--text-primary)]">
                                {alert.symbol}
                              </div>
                              <div className="text-[10px] text-[var(--text-muted)]">
                                {alert.condition === "above" ? "Above" : "Below"}{" "}
                                {formatCurrency(alert.targetPrice, false, { sourceCurrency: currency })}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => removeAlert(alert.id)}
                            className="p-1 rounded-md text-[var(--text-dim)] hover:text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10 transition-all"
                          >
                            <X size={12} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="text-xs text-[var(--text-muted)]">
                            Current: {formatCurrency(currentPrice, false, { sourceCurrency: currency })}
                            {showTriggered ? (
                              <span className="ml-2 text-[var(--accent-primary)] font-medium">Triggered!</span>
                            ) : (
                              <span className={`ml-2 ${isClose ? "text-[var(--accent-primary)]" : ""}`}>
                                ({distance > 0 ? "+" : ""}{distance.toFixed(1)}%)
                              </span>
                            )}
                          </div>

                          <button
                            onClick={() => toggleAlert(alert.id)}
                            className={`w-9 h-5 rounded-full relative transition-colors ${
                              alert.enabled
                                ? "bg-[var(--accent-primary)]"
                                : "bg-[var(--border-muted)]"
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full absolute top-0.5 transition-all bg-white ${
                                alert.enabled ? "left-[18px]" : "left-0.5"
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Add Alert Modal */}
        {showAddAlert && selectedSymbolForAlert && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[var(--bg-card)] rounded-xl p-6 w-[360px] border border-[var(--border-primary)]">
              <div className="flex items-center justify-between mb-5">
                <span className="text-base font-semibold text-[var(--text-primary)]">
                  Set Price Alert
                </span>
                <button
                  onClick={() => { setShowAddAlert(false); setSelectedSymbolForAlert(null); }}
                  className="p-1 rounded-md hover:bg-[var(--bg-muted)] transition-colors"
                >
                  <X size={18} className="text-[var(--text-muted)]" />
                </button>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs text-[var(--text-muted)] mb-1.5 block">Symbol</label>
                  <div className="px-4 py-3 rounded-lg bg-[var(--bg-muted)] font-mono text-sm font-semibold text-[var(--text-primary)]">
                    {selectedSymbolForAlert}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-[var(--text-muted)] mb-1.5 block">Condition</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setNewAlertCondition("above")}
                      className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all ${
                        newAlertCondition === "above"
                          ? "bg-[var(--accent-green)] text-black"
                          : "bg-[var(--bg-muted)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      Price goes above
                    </button>
                    <button
                      onClick={() => setNewAlertCondition("below")}
                      className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all ${
                        newAlertCondition === "below"
                          ? "bg-[var(--accent-red)] text-white"
                          : "bg-[var(--bg-muted)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      Price goes below
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-[var(--text-muted)] mb-1.5 block">Target Price</label>
                  <input
                    type="number"
                    value={newAlertPrice}
                    onChange={(e) => setNewAlertPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-3 rounded-lg bg-[var(--bg-muted)] text-sm font-mono text-[var(--text-primary)] border border-[var(--border-muted)] outline-none focus:border-[var(--accent-primary)] transition-colors"
                  />
                </div>

                <button
                  onClick={handleAddAlert}
                  disabled={!newAlertPrice}
                  className="w-full py-3 rounded-lg bg-[var(--accent-primary)] text-sm font-semibold text-black hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Alert
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
