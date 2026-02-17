"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Stock, Holding, Transaction, WatchlistItem, PriceAlert, Order, User } from "@/types";
import { APP_CONFIG } from "@/config/app";
import { stockAPI, userAPI, StockQuote } from "@/lib/api";
import { setCurrentCurrency, CURRENCY_SYMBOLS, EXCHANGE_RATES, convertCurrency } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useAchievementToast } from "@/components/AchievementToast";
import { useXpToast } from "@/components/XpToast";


interface TradingSettings {
  defaultOrderType: string;
  confirmTrades: boolean;
  showProfitLoss: boolean;
  compactMode: boolean;
}

interface NotificationSettings {
  priceAlerts: boolean;
  tradeConfirmations: boolean;
  weeklyReport: boolean;
  marketNews: boolean;
}

interface PortfolioContextType {
  // User
  user: User;

  // Settings
  settings: TradingSettings;
  notifications: NotificationSettings;

  // Data
  stocks: Stock[];
  crypto: Stock[];
  holdings: Holding[];
  watchlist: WatchlistItem[];
  alerts: PriceAlert[];
  transactions: Transaction[];
  orders: Order[];

  // Currency
  currency: string;
  currencySymbol: string;
  exchangeRate: number;

  // Market
  market: string;

  // Theme
  theme: string;
  applyTheme: (theme: string) => void;

  // Loading/Error states
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;

  // Computed values
  totalPortfolioValue: number;
  totalInvested: number;
  totalReturns: number;
  returnsPercent: number;
  buyingPower: number;
  dayGain: number;
  dayGainPercent: number;

  // Actions
  executeTrade: (type: "BUY" | "SELL", symbol: string, name: string, shares: number, price: number, currency?: string) => Promise<boolean>;
  createLimitOrder: (type: "BUY" | "SELL", symbol: string, name: string, shares: number, limitPrice: number, currency?: string) => Promise<boolean>;
  cancelLimitOrder: (orderId: string) => Promise<void>;
  addToWatchlist: (symbol: string, name?: string) => Promise<void>;
  removeFromWatchlist: (symbol: string) => Promise<void>;
  toggleWatchlistStar: (symbol: string) => Promise<void>;
  toggleAlert: (alertId: string) => void;
  addAlert: (symbol: string, condition: "above" | "below", targetPrice: number) => Promise<void>;
  removeAlert: (alertId: string) => Promise<void>;
  getStockBySymbol: (symbol: string) => Stock | undefined;
  refreshPrices: (marketOverride?: string) => Promise<void>;
  refreshUserData: () => Promise<string>;
  setCurrency: (currency: string) => Promise<void>;
  setMarket: (market: string) => Promise<void>;
  updateTradingSettings: (updates: Partial<TradingSettings>) => void;
  updateNotificationSettings: (updates: Partial<NotificationSettings>) => void;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

// Helper to convert API quote to Stock type
function quoteToStock(quote: StockQuote): Stock {
  return {
    symbol: quote.symbol,
    name: quote.name || quote.symbol,
    price: quote.price,
    change: quote.change,
    changePercent: quote.changePercent,
    currency: quote.currency || 'USD',
  };
}

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isMaintenance = pathname === "/maintenance";
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { showAchievements } = useAchievementToast();
  const { showXpGain } = useXpToast();

  const [user, setUser] = useState<User>({
    ...APP_CONFIG.defaultUser,
    buyingPower: 0,
    xp: 0,
    level: 1,
    rank: 'Retail Trader',
  });

  const [stocks, setStocks] = useState<Stock[]>([]);
  const [crypto, setCrypto] = useState<Stock[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  // Trading settings state
  const [settings, setSettings] = useState<TradingSettings>({
    defaultOrderType: 'MARKET',
    confirmTrades: true,
    showProfitLoss: true,
    compactMode: false,
  });

  // Notification settings state
  const [notifications, setNotifications] = useState<NotificationSettings>({
    priceAlerts: true,
    tradeConfirmations: true,
    weeklyReport: false,
    marketNews: true,
  });

  // Currency state
  const [currency, setCurrencyState] = useState("USD");
  const [currencySymbol, setCurrencySymbol] = useState("$");
  const [exchangeRate, setExchangeRate] = useState(1.0);

  // Market state
  const [market, setMarketState] = useState("US");

  // Theme state
  const [theme, setThemeState] = useState<string>("DARK");

  const applyTheme = useCallback((t: string) => {
    const root = document.documentElement;
    if (t === 'AUTO') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('light', !prefersDark);
    } else {
      root.classList.toggle('light', t === 'LIGHT');
    }
    setThemeState(t);
  }, []);

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch user data from backend. Returns the user's market preference.
  const refreshUserData = useCallback(async (): Promise<string> => {
    try {
      const [profileRes, holdingsRes, watchlistRes, alertsRes, tradesRes, ordersRes] = await Promise.all([
        userAPI.getProfile(),
        userAPI.getHoldings(),
        userAPI.getWatchlist(),
        userAPI.getAlerts(),
        userAPI.getTrades(20),
        userAPI.getLimitOrders('PENDING'),
      ]);

      // Update user profile
      setUser({
        name: profileRes.profile.name,
        username: profileRes.profile.username || '',
        email: profileRes.profile.email,
        initials: profileRes.profile.initials,
        avatarUrl: profileRes.profile.avatarUrl,
        buyingPower: profileRes.profile.buyingPower,
        xp: profileRes.profile.xp ?? 0,
        level: profileRes.profile.level ?? 1,
        rank: profileRes.profile.rank ?? 'Retail Trader',
      });

      // Update currency from settings
      const userCurrency = profileRes.settings.display.currency || 'USD';
      const symbol = CURRENCY_SYMBOLS[userCurrency] || userCurrency;
      const rate = EXCHANGE_RATES[userCurrency] || 1.0;
      setCurrencyState(userCurrency);
      setCurrencySymbol(symbol);
      setExchangeRate(rate);
      setCurrentCurrency({ code: userCurrency, symbol, rate });

      // Update market from settings
      const userMarket = profileRes.settings.display.market || 'US';
      setMarketState(userMarket);

      // Apply theme from settings
      const userTheme = profileRes.settings.display.theme || 'DARK';
      applyTheme(userTheme);

      // Update trading settings from preferences
      const prefs = profileRes.settings.preferences;
      setSettings({
        defaultOrderType: prefs.defaultOrderType || 'MARKET',
        confirmTrades: prefs.confirmTrades ?? true,
        showProfitLoss: prefs.showProfitLoss ?? true,
        compactMode: prefs.compactMode ?? false,
      });

      // Update notification settings
      const notifs = profileRes.settings.notifications;
      setNotifications({
        priceAlerts: notifs.priceAlerts ?? true,
        tradeConfirmations: notifs.tradeConfirmations ?? true,
        weeklyReport: notifs.weeklyReport ?? false,
        marketNews: notifs.marketNews ?? true,
      });

      // Update pending limit orders
      setOrders(ordersRes.map(o => ({
        id: o.id,
        type: o.type as "BUY" | "SELL",
        orderType: o.orderType as "MARKET" | "LIMIT",
        symbol: o.symbol,
        name: o.name,
        shares: o.shares,
        price: o.price,
        currency: o.currency,
        status: o.status as "PENDING" | "FILLED" | "CANCELLED" | "EXPIRED",
        createdAt: o.createdAt,
        filledAt: o.filledAt,
        expiresAt: o.expiresAt,
      })));

      // Collect all symbols that need current prices
      const holdingSymbols = holdingsRes.map(h => h.symbol);
      const watchlistSymbols = watchlistRes.map(w => w.symbol);
      const alertSymbols = alertsRes.map(a => a.symbol);
      const allSymbols = [...new Set([...holdingSymbols, ...watchlistSymbols, ...alertSymbols])].filter(Boolean);

      // Fetch current prices for all symbols immediately
      let priceMap: Record<string, { price: number; change: number; changePercent: number; currency: string }> = {};
      if (allSymbols.length > 0) {
        try {
          const quotesRes = await stockAPI.getQuotes(allSymbols);
          for (const [sym, result] of Object.entries(quotesRes.quotes)) {
            if (result.success && result.data) {
              priceMap[sym] = {
                price: result.data.price,
                change: result.data.change,
                changePercent: result.data.changePercent,
                currency: result.data.currency || 'USD',
              };
            }
          }
        } catch (priceErr) {
          console.error("Failed to fetch initial prices:", priceErr);
        }
      }

      // Update holdings with current prices (use fetched price or fallback to avgCost)
      setHoldings(holdingsRes.map(h => ({
        symbol: h.symbol,
        name: h.name,
        shares: h.shares,
        avgCost: h.avgCost,
        currentPrice: priceMap[h.symbol]?.price ?? h.avgCost,
        currency: h.currency || priceMap[h.symbol]?.currency || 'USD',
        change: priceMap[h.symbol]?.change ?? 0,
        changePercent: priceMap[h.symbol]?.changePercent ?? 0,
      })));

      // Update watchlist with current prices
      setWatchlist(watchlistRes.map(w => ({
        symbol: w.symbol,
        name: w.name,
        price: priceMap[w.symbol]?.price ?? 0,
        change: priceMap[w.symbol]?.change ?? 0,
        changePercent: priceMap[w.symbol]?.changePercent ?? 0,
        starred: w.starred,
        currency: priceMap[w.symbol]?.currency ?? 'USD',
      })));

      // Update alerts with current prices
      setAlerts(alertsRes.map(a => ({
        id: a.id,
        symbol: a.symbol,
        condition: a.condition as "above" | "below",
        targetPrice: a.targetPrice,
        currentPrice: priceMap[a.symbol]?.price ?? 0,
        enabled: a.enabled,
      })));

      // Update transactions
      setTransactions(tradesRes.map(t => ({
        id: t.id,
        date: new Date(t.executedAt),
        type: t.type as "BUY" | "SELL",
        symbol: t.symbol,
        shares: t.shares,
        price: t.price,
        total: t.total,
      })));

      return userMarket;
    } catch (err) {
      console.error("Failed to fetch user data:", err);
      return 'US';
    }
  }, [applyTheme]);

  // Listen for OS theme changes when in AUTO mode
  useEffect(() => {
    if (theme !== 'AUTO') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle('light', !e.matches);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  // Fetch real-time prices from backend
  const refreshPrices = useCallback(async (marketOverride?: string) => {
    const effectiveMarket = marketOverride || market;
    setIsLoading(true);
    setError(null);

    try {
      // Fetch stocks and crypto in parallel (using current market preference)
      const [stocksResponse, cryptoResponse] = await Promise.all([
        stockAPI.getPopularStocks(effectiveMarket),
        stockAPI.getCrypto(effectiveMarket),
      ]);

      // Update stocks
      if (stocksResponse.stocks.length > 0) {
        setStocks(stocksResponse.stocks.map(quoteToStock));
      }

      // Update crypto
      if (cryptoResponse.crypto.length > 0) {
        setCrypto(cryptoResponse.crypto.map(quoteToStock));
      }

      // Update holdings with current prices
      const allQuotes = [...stocksResponse.stocks, ...cryptoResponse.crypto];
      setHoldings((prevHoldings) =>
        prevHoldings.map((holding) => {
          const quote = allQuotes.find((q) => q.symbol === holding.symbol);
          if (quote) {
            return {
              ...holding,
              currentPrice: quote.price,
              currency: quote.currency || 'USD',
              change: quote.change,
              changePercent: quote.changePercent,
            };
          }
          return holding;
        })
      );

      // Update watchlist with current prices
      setWatchlist((prevWatchlist) =>
        prevWatchlist.map((item) => {
          const quote = allQuotes.find((q) => q.symbol === item.symbol);
          if (quote) {
            return {
              ...item,
              price: quote.price,
              change: quote.change,
              changePercent: quote.changePercent,
              currency: quote.currency || 'USD',
            };
          }
          return item;
        })
      );

      // Update alerts with current prices
      setAlerts((prevAlerts) =>
        prevAlerts.map((alert) => {
          const quote = allQuotes.find((q) => q.symbol === alert.symbol);
          if (quote) {
            return { ...alert, currentPrice: quote.price };
          }
          return alert;
        })
      );

      // Check pending limit orders for fill conditions
      setOrders((prevOrders) => {
        const priceMap = Object.fromEntries(
          allQuotes.map((q) => [q.symbol, q.price])
        );
        for (const order of prevOrders) {
          if (order.status !== 'PENDING') continue;
          const marketPrice = priceMap[order.symbol];
          if (!marketPrice) continue;

          const shouldFill =
            (order.type === 'BUY' && marketPrice <= order.price) ||
            (order.type === 'SELL' && marketPrice >= order.price);

          if (shouldFill) {
            // Fire fill request (non-blocking)
            userAPI.fillLimitOrder(order.id, marketPrice).then((result) => {
              setUser(prev => ({ ...prev, buyingPower: result.buyingPower }));
              setOrders(prev => prev.filter(o => o.id !== order.id));
              // Refresh holdings
              userAPI.getHoldings().then(holdingsRes => {
                setHoldings(holdingsRes.map(h => ({
                  symbol: h.symbol,
                  name: h.name,
                  shares: h.shares,
                  avgCost: h.avgCost,
                  currentPrice: priceMap[h.symbol] || h.avgCost,
                  currency: h.currency || 'USD',
                })));
              });
            }).catch(err => {
              console.error("Failed to fill limit order:", err);
            });
          }
        }
        return prevOrders;
      });

      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to fetch prices:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch prices");
    } finally {
      setIsLoading(false);
    }
  }, [market]);

  // Fetch user data and prices on mount
  useEffect(() => {
    if (isMaintenance || authLoading || !isAuthenticated) return;
    refreshUserData().then((fetchedMarket) => refreshPrices(fetchedMarket));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMaintenance, authLoading, isAuthenticated]); // Run when auth state resolves

  // Auto-refresh prices only when there's data to refresh
  useEffect(() => {
    // Skip auto-refresh during maintenance or if no holdings and no watchlist
    if (isMaintenance || (holdings.length === 0 && watchlist.length === 0)) {
      return;
    }

    const interval = setInterval(refreshPrices, 300000); // 5 minutes (matches backend cache TTL)
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMaintenance, holdings.length, watchlist.length]); // Re-evaluate when data presence changes

  // Computed values - convert all holdings to user's display currency
  const holdingsValue = holdings.reduce((sum, h) => {
    const value = h.shares * h.currentPrice;
    const holdingCurrency = h.currency || 'USD';
    return sum + convertCurrency(value, holdingCurrency, currency);
  }, 0);

  const totalInvested = holdings.reduce((sum, h) => {
    const invested = h.shares * h.avgCost;
    const holdingCurrency = h.currency || 'USD';
    return sum + convertCurrency(invested, holdingCurrency, currency);
  }, 0);

  // Total portfolio = current market value of holdings only
  const totalPortfolioValue = holdingsValue;

  // Returns = unrealized P&L on holdings
  const totalReturns = holdingsValue - totalInvested;
  const returnsPercent = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;

  const dayGain = holdings.reduce((sum, h) => {
    const change = h.change || 0;
    const gain = change * h.shares;
    const holdingCurrency = h.currency || 'USD';
    return sum + convertCurrency(gain, holdingCurrency, currency);
  }, 0);

  const dayGainPercent = totalPortfolioValue > 0 ? (dayGain / (totalPortfolioValue - dayGain)) * 100 : 0;

  const getStockBySymbol = useCallback(
    (symbol: string) => {
      return [...stocks, ...crypto].find((s) => s.symbol === symbol);
    },
    [stocks, crypto]
  );

  const executeTrade = useCallback(
    async (type: "BUY" | "SELL", symbol: string, name: string, shares: number, price: number, currency?: string): Promise<boolean> => {
      try {
        // Capture previous XP/level/rank for delta computation
        let prevXp = 0;
        let prevLevel = 1;
        let prevRank = '';
        setUser(prev => {
          prevXp = prev.xp;
          prevLevel = prev.level;
          prevRank = prev.rank;
          return prev;
        });

        const result = await userAPI.executeTrade({
          symbol,
          name,
          type,
          shares,
          price,
          currency,
        });

        // Update local state
        setUser(prev => ({
          ...prev,
          buyingPower: result.buyingPower,
          ...(result.xp !== undefined && { xp: result.xp }),
          ...(result.level !== undefined && { level: result.level }),
          ...(result.rank !== undefined && { rank: result.rank }),
        }));

        // Show XP gain toast if XP increased
        if (result.xp !== undefined) {
          const xpDelta = result.xp - prevXp;
          if (xpDelta > 0) {
            const levelChanged = result.level !== undefined && result.level > prevLevel;
            const rankChanged = result.rank !== undefined && result.rank !== prevRank;
            showXpGain(
              xpDelta,
              levelChanged ? result.level : undefined,
              rankChanged ? result.rank : undefined,
            );
          }
        }

        // Add transaction
        const newTransaction: Transaction = {
          id: result.trade.id,
          date: new Date(result.trade.executedAt),
          type,
          symbol,
          shares,
          price,
          total: result.trade.total,
        };
        setTransactions(prev => [newTransaction, ...prev]);

        // Show achievement toasts if any
        if (result.newAchievements && result.newAchievements.length > 0) {
          showAchievements(result.newAchievements);
        }

        // Refresh holdings
        const holdingsRes = await userAPI.getHoldings();
        setHoldings(holdingsRes.map(h => {
          const stock = [...stocks, ...crypto].find(s => s.symbol === h.symbol);
          return {
            symbol: h.symbol,
            name: h.name,
            shares: h.shares,
            avgCost: h.avgCost,
            currentPrice: stock?.price || h.avgCost,
            currency: h.currency || 'USD',
          };
        }));

        return true;
      } catch (err) {
        console.error("Trade failed:", err);
        setError(err instanceof Error ? err.message : "Trade failed");
        return false;
      }
    },
    [stocks, crypto, showAchievements, showXpGain]
  );

  const createLimitOrder = useCallback(
    async (type: "BUY" | "SELL", symbol: string, name: string, shares: number, limitPrice: number, currency?: string): Promise<boolean> => {
      try {
        const result = await userAPI.createLimitOrder({
          symbol,
          name,
          type,
          shares,
          limitPrice,
          currency,
        });

        // Update buying power
        setUser(prev => ({ ...prev, buyingPower: result.buyingPower }));

        // Add order to state
        const newOrder: Order = {
          id: result.order.id,
          type: result.order.type as "BUY" | "SELL",
          orderType: "LIMIT",
          symbol: result.order.symbol,
          name: result.order.name,
          shares: result.order.shares,
          price: result.order.price,
          currency: result.order.currency,
          status: result.order.status as "PENDING",
          createdAt: result.order.createdAt,
          filledAt: result.order.filledAt,
          expiresAt: result.order.expiresAt,
        };
        setOrders(prev => [newOrder, ...prev]);

        return true;
      } catch (err) {
        console.error("Limit order failed:", err);
        setError(err instanceof Error ? err.message : "Limit order failed");
        return false;
      }
    },
    []
  );

  const cancelLimitOrder = useCallback(
    async (orderId: string) => {
      try {
        const result = await userAPI.cancelLimitOrder(orderId);
        setUser(prev => ({ ...prev, buyingPower: result.buyingPower }));
        setOrders(prev => prev.filter(o => o.id !== orderId));
      } catch (err) {
        console.error("Cancel order failed:", err);
        setError(err instanceof Error ? err.message : "Cancel order failed");
      }
    },
    []
  );

  const addToWatchlist = useCallback(
    async (symbol: string, name?: string) => {
      if (watchlist.find((w) => w.symbol === symbol)) return;

      const stock = getStockBySymbol(symbol);
      const stockName = name || stock?.name || symbol;

      try {
        const result = await userAPI.addToWatchlist(symbol, stockName);

        // Show achievement toasts if any
        if (result.newAchievements && result.newAchievements.length > 0) {
          showAchievements(result.newAchievements);
        }

        setWatchlist((prev) => [
          ...prev,
          {
            symbol,
            name: stockName,
            price: stock?.price || 0,
            change: stock?.change || 0,
            changePercent: stock?.changePercent || 0,
            starred: false,
          },
        ]);
      } catch (err) {
        console.error("Failed to add to watchlist:", err);
      }
    },
    [watchlist, getStockBySymbol, showAchievements]
  );

  const removeFromWatchlist = useCallback(async (symbol: string) => {
    try {
      await userAPI.removeFromWatchlist(symbol);
      setWatchlist((prev) => prev.filter((w) => w.symbol !== symbol));
    } catch (err) {
      console.error("Failed to remove from watchlist:", err);
    }
  }, []);

  const toggleWatchlistStar = useCallback(async (symbol: string) => {
    try {
      const result = await userAPI.toggleWatchlistStar(symbol);
      setWatchlist((prev) =>
        prev.map((w) => (w.symbol === symbol ? { ...w, starred: result.starred } : w))
      );
    } catch (err) {
      console.error("Failed to toggle star:", err);
    }
  }, []);

  const toggleAlert = useCallback((alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, enabled: !a.enabled } : a))
    );
  }, []);

  const addAlert = useCallback(
    async (symbol: string, condition: "above" | "below", targetPrice: number) => {
      const stock = getStockBySymbol(symbol);

      try {
        const result = await userAPI.createAlert({ symbol, condition, targetPrice });

        const newAlert: PriceAlert = {
          id: result.id,
          symbol,
          condition,
          targetPrice,
          currentPrice: stock?.price || 0,
          enabled: true,
        };
        setAlerts((prev) => [...prev, newAlert]);
      } catch (err) {
        console.error("Failed to create alert:", err);
      }
    },
    [getStockBySymbol]
  );

  const removeAlert = useCallback(async (alertId: string) => {
    try {
      await userAPI.deleteAlert(alertId);
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch (err) {
      console.error("Failed to remove alert:", err);
    }
  }, []);

  const setCurrency = useCallback(async (newCurrency: string) => {
    try {
      const result = await userAPI.updateCurrency(newCurrency);
      const symbol = CURRENCY_SYMBOLS[result.currency] || result.symbol;
      const rate = EXCHANGE_RATES[result.currency] || result.exchangeRate;

      setCurrencyState(result.currency);
      setCurrencySymbol(symbol);
      setExchangeRate(rate);
      setCurrentCurrency({ code: result.currency, symbol, rate });
    } catch (err) {
      console.error("Failed to update currency:", err);
      throw err;
    }
  }, []);

  const setMarket = useCallback(async (newMarket: string) => {
    try {
      const result = await userAPI.updateMarket(newMarket);
      setMarketState(result.market);
      // Refresh prices with new market directly (don't rely on stale closure)
      await refreshPrices(result.market);
    } catch (err) {
      console.error("Failed to update market:", err);
      throw err;
    }
  }, [refreshPrices]);

  const updateTradingSettings = useCallback((updates: Partial<TradingSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const updateNotificationSettings = useCallback((updates: Partial<NotificationSettings>) => {
    setNotifications(prev => ({ ...prev, ...updates }));
  }, []);

  return (
    <PortfolioContext.Provider
      value={{
        user,
        settings,
        notifications,
        stocks,
        crypto,
        holdings,
        watchlist,
        alerts,
        transactions,
        orders,
        isLoading,
        error,
        lastUpdated,
        totalPortfolioValue,
        totalInvested,
        totalReturns,
        returnsPercent,
        buyingPower: user.buyingPower,
        dayGain,
        dayGainPercent,
        executeTrade,
        createLimitOrder,
        cancelLimitOrder,
        addToWatchlist,
        removeFromWatchlist,
        toggleWatchlistStar,
        toggleAlert,
        addAlert,
        removeAlert,
        getStockBySymbol,
        refreshPrices,
        refreshUserData,
        setCurrency,
        currency,
        currencySymbol,
        exchangeRate,
        market,
        setMarket,
        theme,
        applyTheme,
        updateTradingSettings,
        updateNotificationSettings,
      }}
    >
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error("usePortfolio must be used within a PortfolioProvider");
  }
  return context;
}
