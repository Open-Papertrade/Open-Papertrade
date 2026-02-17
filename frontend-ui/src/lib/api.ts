/**
 * API client for the Paper Trading backend.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
export const API_HOST = API_BASE_URL.replace(/\/api\/?$/, '');

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  volume: number | null;
  timestamp: string | null;
  name: string | null;
  provider: string;
  currency: string;  // Currency the price is quoted in (e.g., "USD", "INR", "GBP")
}

export interface StockServiceResult {
  data: StockQuote | null;
  success: boolean;
  primaryUsed: boolean;
  errors: Array<{ provider: string; errorType: string; message: string }>;
  cached: boolean;
}

export interface BulkQuotesResponse {
  quotes: Record<string, StockServiceResult>;
  total: number;
  successful: number;
}

export interface ProviderStatus {
  provider: { name: string; available: boolean };
  finnhubMarketStatus: { name: string; available: boolean };
  cacheSize: number;
}

export interface SearchResult {
  symbol: string;
  name: string;
  type?: string;
  exchange?: string;
  provider: string;
}

export type TimeRange = '1D' | '1W' | '1M' | '6M' | '1Y' | '5Y';

export interface HistoricalBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface HistoricalDataResponse {
  bars: HistoricalBar[];
  success: boolean;
  symbol: string;
  period: string;
  interval: string;
  count: number;
  cached: boolean;
}

// User API types
export interface UserProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  initials: string;
  avatarUrl: string | null;
  buyingPower: number;
  initialBalance: number;
  plan: string;
  passwordChangedAt: string | null;
  is2faEnabled: boolean;
  xp: number;
  level: number;
  rank: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  notifications: {
    priceAlerts: boolean;
    tradeConfirmations: boolean;
    weeklyReport: boolean;
    marketNews: boolean;
  };
  preferences: {
    defaultOrderType: string;
    confirmTrades: boolean;
    showProfitLoss: boolean;
    compactMode: boolean;
  };
  display: {
    theme: string;
    currency: string;
    market: string;
  };
}

export interface MarketInfo {
  code: string;
  name: string;
  exchanges: string[];
  defaultCurrency: string;
}

export interface RankInfo {
  level: number;
  rank: string;
  xp: number;
  nextRank: {
    level: number;
    rank: string;
    xpRequired: number;
    xpRemaining: number;
  } | null;
}

export interface LeaderboardEntry {
  position: number;
  userId: string;
  name: string;
  username: string;
  initials: string;
  avatarUrl: string | null;
  level: number;
  rank: string;
  xp: number;
  portfolioReturn: number;
  realizedProfit: number;
  totalTrades: number;
  winRate: number;
  isCurrentUser: boolean;
}

export interface PublicProfile {
  username: string;
  name: string;
  initials: string;
  avatarUrl: string | null;
  level: number;
  rank: string;
  xp: number;
  portfolioReturn: number;
  realizedProfit: number;
  totalTrades: number;
  winRate: number;
  memberSince: string;
  achievements: Achievement[];
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  totalTraders: number;
}

export interface UserStats {
  totalTrades: number;
  totalInvested: number;
  buyingPower: number;
  initialBalance: number;
  holdingsCount: number;
  winRate: number;
  memberSince: string;
  rank: RankInfo;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt: string | null;
}

export interface Holding {
  symbol: string;
  name: string;
  shares: number;
  avgCost: number;
  currency?: string;
}

export interface Trade {
  id: string;
  symbol: string;
  name: string;
  type: string;
  shares: number;
  price: number;
  total: number;
  currency?: string;
  executedAt: string;
}

export interface WatchlistItem {
  symbol: string;
  name: string;
  starred: boolean;
  addedAt: string;
}

export interface PriceAlert {
  id: string;
  symbol: string;
  condition: string;
  targetPrice: number;
  enabled: boolean;
  triggered: boolean;
}

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  rate: number;
}

export interface CurrencyData {
  currencies: Currency[];
  exchangeRates: Record<string, number>;
  symbols: Record<string, string>;
}

export interface MarketStatusResponse {
  exchange: string;
  isOpen: boolean;
  holiday: string | null;
  session: string;
  source: 'finnhub' | 'schedule';
}

export interface NewsArticle {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  thumbnail: string;
}

export interface APIKeyInfo {
  id: string;
  name: string;
  keyPrefix: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  fullKey?: string;
}

// Friends API types
export interface FriendInfo {
  friendshipId: string;
  username: string;
  name: string;
  initials: string;
  avatarUrl: string | null;
  level: number;
  rank: string;
  portfolioReturn?: number;
  realizedProfit?: number;
  totalTrades?: number;
  winRate?: number;
  createdAt?: string;
}

export interface FriendsListResponse {
  friends: FriendInfo[];
  pendingIncoming: FriendInfo[];
  pendingOutgoing: FriendInfo[];
}

export type FriendshipStatus =
  | { status: 'self' }
  | { status: 'none' }
  | { status: 'pending'; direction: 'incoming' | 'outgoing'; friendshipId: string }
  | { status: 'accepted'; friendshipId: string };

export interface TwoFactorSetupResponse {
  secret: string;
  qrCode: string;
  provisioningUri: string;
}

export interface TwoFactorVerifyResponse {
  success: boolean;
  backupCodes: string[];
}

// Singleton refresh promise to prevent concurrent refresh attempts
let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh/`, {
        method: 'POST',
        credentials: 'include',
      });
      return response.ok;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

class StockAPI {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options?.headers as Record<string, string>,
    };

    let response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    // 401 interceptor: try refresh then retry once
    if (response.status === 401) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        response = await fetch(`${this.baseUrl}${endpoint}`, {
          ...options,
          headers,
          credentials: 'include',
        });
      } else if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        if (path !== '/login' && path !== '/signup' && path !== '/verify-email') {
          window.location.href = '/login';
        }
        throw new Error('Session expired');
      }
    }

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get a single stock quote
   */
  async getQuote(symbol: string, skipCache = false): Promise<StockServiceResult> {
    const params = skipCache ? '?skip_cache=true' : '';
    return this.fetch<StockServiceResult>(`/stocks/quote/${symbol.toUpperCase()}/${params}`);
  }

  /**
   * Get multiple stock quotes
   */
  async getQuotes(symbols: string[], skipCache = false): Promise<BulkQuotesResponse> {
    return this.fetch<BulkQuotesResponse>('/stocks/quotes/', {
      method: 'POST',
      body: JSON.stringify({ symbols, skipCache }),
    });
  }

  /**
   * Get popular stocks based on market
   */
  async getPopularStocks(market?: string): Promise<{ stocks: StockQuote[]; count: number; market: string }> {
    const params = market ? `?market=${market}` : '';
    return this.fetch(`/stocks/popular/${params}`);
  }

  /**
   * Get popular cryptocurrencies
   */
  async getCrypto(market?: string): Promise<{ crypto: StockQuote[]; count: number; market: string }> {
    const params = market ? `?market=${market}` : '';
    return this.fetch(`/stocks/crypto/${params}`);
  }

  /**
   * Search for symbols
   */
  async search(query: string, market?: string): Promise<{ results: SearchResult[]; count: number; market?: string }> {
    const marketParam = market ? `&market=${market}` : '';
    return this.fetch(`/stocks/search/?q=${encodeURIComponent(query)}${marketParam}`);
  }

  /**
   * Get company profile
   */
  async getProfile(symbol: string): Promise<Record<string, unknown>> {
    return this.fetch(`/stocks/profile/${symbol.toUpperCase()}/`);
  }

  /**
   * Get provider status
   */
  async getStatus(): Promise<ProviderStatus> {
    return this.fetch('/stocks/status/');
  }

  /**
   * Clear the backend cache
   */
  async clearCache(): Promise<{ message: string }> {
    return this.fetch('/stocks/cache/clear/', { method: 'POST' });
  }

  /**
   * Get historical OHLC data for a symbol
   */
  async getHistory(symbol: string, range: TimeRange = '1M'): Promise<HistoricalDataResponse> {
    return this.fetch<HistoricalDataResponse>(`/stocks/history/${symbol.toUpperCase()}/?range=${range}`);
  }

  /**
   * Get market indices (US or Indian based on market param)
   */
  async getIndices(market?: string): Promise<{ indices: StockQuote[]; count: number; market: string }> {
    const params = market ? `?market=${market}` : '';
    return this.fetch(`/stocks/indices/${params}`);
  }

  /**
   * Get real-time market status (holiday-aware)
   */
  async getMarketStatus(exchange: string = 'US'): Promise<MarketStatusResponse> {
    return this.fetch<MarketStatusResponse>(`/stocks/market-status/?exchange=${encodeURIComponent(exchange)}`);
  }

  /**
   * Get recent news for a stock
   */
  async getNews(symbol: string): Promise<{ symbol: string; articles: NewsArticle[]; count: number }> {
    return this.fetch(`/stocks/news/${symbol.toUpperCase()}/`);
  }
}

class UserAPI {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options?.headers as Record<string, string>,
    };

    let response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    // 401 interceptor: try refresh then retry once
    if (response.status === 401) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        response = await fetch(`${this.baseUrl}${endpoint}`, {
          ...options,
          headers,
          credentials: 'include',
        });
      } else if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        if (path !== '/login' && path !== '/signup' && path !== '/verify-email') {
          window.location.href = '/login';
        }
        throw new Error('Session expired');
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API Error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get user profile and settings
   */
  async getProfile(): Promise<{ profile: UserProfile; settings: UserSettings }> {
    return this.fetch('/users/profile/');
  }

  /**
   * Update user profile
   */
  async updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    return this.fetch('/users/profile/', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * Get user settings
   */
  async getSettings(): Promise<UserSettings> {
    return this.fetch('/users/settings/');
  }

  /**
   * Update user settings
   */
  async updateSettings(data: Partial<UserSettings>): Promise<UserSettings> {
    return this.fetch('/users/settings/', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * Get user stats
   */
  async getStats(): Promise<UserStats> {
    return this.fetch('/users/stats/');
  }

  /**
   * Get weekly report
   */
  async getWeeklyReport(): Promise<Record<string, unknown>> {
    return this.fetch('/users/reports/weekly/');
  }

  /**
   * Get monthly report
   */
  async getMonthlyReport(year?: number, month?: number): Promise<Record<string, unknown>> {
    const params = new URLSearchParams();
    if (year) params.set('year', String(year));
    if (month) params.set('month', String(month));
    const q = params.toString() ? `?${params.toString()}` : '';
    return this.fetch(`/users/reports/monthly/${q}`);
  }

  /**
   * Get yearly report
   */
  async getYearlyReport(year?: number): Promise<Record<string, unknown>> {
    const q = year ? `?year=${year}` : '';
    return this.fetch(`/users/reports/yearly/${q}`);
  }

  /**
   * Get achievements
   */
  async getAchievements(): Promise<{ achievements: Achievement[]; unlockedCount: number; totalCount: number }> {
    return this.fetch('/users/achievements/');
  }

  /**
   * Get holdings
   */
  async getHoldings(): Promise<Holding[]> {
    return this.fetch('/users/holdings/');
  }

  /**
   * Get trade history
   */
  async getTrades(limit = 50): Promise<Trade[]> {
    return this.fetch(`/users/trades/?limit=${limit}`);
  }

  /**
   * Execute a trade
   */
  async executeTrade(data: {
    symbol: string;
    name: string;
    type: 'BUY' | 'SELL';
    shares: number;
    price: number;
    currency?: string;
  }): Promise<{ trade: Trade; buyingPower: number; newAchievements?: Achievement[]; xp?: number; level?: number; rank?: string }> {
    return this.fetch('/users/trades/execute/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Get watchlist
   */
  async getWatchlist(): Promise<WatchlistItem[]> {
    return this.fetch('/users/watchlist/');
  }

  /**
   * Get limit orders
   */
  async getLimitOrders(status = 'PENDING'): Promise<Array<{
    id: string;
    type: string;
    orderType: string;
    symbol: string;
    name: string;
    shares: number;
    price: number;
    currency: string;
    status: string;
    createdAt: string;
    filledAt: string | null;
    expiresAt: string | null;
  }>> {
    return this.fetch(`/users/orders/?status=${status}`);
  }

  /**
   * Create a limit order
   */
  async createLimitOrder(data: {
    symbol: string;
    name: string;
    type: 'BUY' | 'SELL';
    shares: number;
    limitPrice: number;
    currency?: string;
  }): Promise<{ order: { id: string; type: string; orderType: string; symbol: string; name: string; shares: number; price: number; currency: string; status: string; createdAt: string; filledAt: string | null; expiresAt: string | null }; buyingPower: number }> {
    return this.fetch('/users/orders/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Cancel a limit order
   */
  async cancelLimitOrder(orderId: string): Promise<{ success: boolean; buyingPower: number }> {
    return this.fetch(`/users/orders/${orderId}/cancel/`, {
      method: 'DELETE',
    });
  }

  /**
   * Fill a limit order
   */
  async fillLimitOrder(orderId: string, currentPrice: number): Promise<{ trade: Trade; order: { id: string; status: string }; buyingPower: number }> {
    return this.fetch(`/users/orders/${orderId}/fill/`, {
      method: 'POST',
      body: JSON.stringify({ currentPrice }),
    });
  }

  /**
   * Add to watchlist
   */
  async addToWatchlist(symbol: string, name: string): Promise<WatchlistItem & { newAchievements?: Achievement[] }> {
    return this.fetch('/users/watchlist/', {
      method: 'POST',
      body: JSON.stringify({ symbol, name }),
    });
  }

  /**
   * Remove from watchlist
   */
  async removeFromWatchlist(symbol: string): Promise<{ success: boolean }> {
    return this.fetch(`/users/watchlist/?symbol=${symbol}`, {
      method: 'DELETE',
    });
  }

  /**
   * Toggle watchlist star
   */
  async toggleWatchlistStar(symbol: string): Promise<{ starred: boolean }> {
    return this.fetch(`/users/watchlist/${symbol}/star/`, {
      method: 'POST',
    });
  }

  /**
   * Get price alerts
   */
  async getAlerts(): Promise<PriceAlert[]> {
    return this.fetch('/users/alerts/');
  }

  /**
   * Create price alert
   */
  async createAlert(data: { symbol: string; condition: string; targetPrice: number }): Promise<PriceAlert> {
    return this.fetch('/users/alerts/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete price alert
   */
  async deleteAlert(alertId: string): Promise<{ success: boolean }> {
    return this.fetch(`/users/alerts/?id=${alertId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Reset account
   */
  async resetAccount(): Promise<{ success: boolean; buyingPower: number }> {
    return this.fetch('/users/reset/', {
      method: 'POST',
    });
  }

  /**
   * Transfer funds to a friend
   */
  async transferFunds(toUsername: string, amount: number): Promise<{ success: boolean; transfer: { id: string; fromUser: string; toUser: string; amountUSD: number; senderDisplayAmount: number; senderCurrency: string; recipientDisplayAmount: number; recipientCurrency: string; createdAt: string }; buyingPower: number }> {
    return this.fetch('/users/transfer/', {
      method: 'POST',
      body: JSON.stringify({ to_username: toUsername, amount }),
    });
  }

  /**
   * Get transfer history
   */
  async getTransfers(): Promise<Array<{ id: string; fromUser: string; toUser: string; amountUSD: number; senderDisplayAmount: number; senderCurrency: string; recipientDisplayAmount: number; recipientCurrency: string; createdAt: string }>> {
    return this.fetch('/users/transfers/');
  }

  /**
   * Update theme
   */
  async updateTheme(theme: 'DARK' | 'LIGHT' | 'AUTO'): Promise<{ success: boolean; theme: string }> {
    return this.fetch('/users/theme/', {
      method: 'POST',
      body: JSON.stringify({ theme }),
    });
  }

  /**
   * Get available currencies
   */
  async getCurrencies(): Promise<CurrencyData> {
    return this.fetch('/users/currency/');
  }

  /**
   * Update currency preference
   */
  async updateCurrency(currency: string): Promise<{ success: boolean; currency: string; symbol: string; exchangeRate: number }> {
    return this.fetch('/users/currency/', {
      method: 'POST',
      body: JSON.stringify({ currency }),
    });
  }

  /**
   * Get available markets
   */
  async getMarkets(): Promise<{ markets: MarketInfo[] }> {
    return this.fetch('/users/market/');
  }

  /**
   * Update market preference
   */
  async updateMarket(market: string): Promise<{ success: boolean; market: string; marketInfo: MarketInfo }> {
    return this.fetch('/users/market/', {
      method: 'POST',
      body: JSON.stringify({ market }),
    });
  }

  /**
   * Upload avatar image
   */
  async uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
    const formData = new FormData();
    formData.append('avatar', file);

    const headers: Record<string, string> = {};
    // Don't set Content-Type - browser sets it with boundary for FormData

    let response = await fetch(`${this.baseUrl}/users/profile/avatar/`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: formData,
    });

    if (response.status === 401) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        response = await fetch(`${this.baseUrl}/users/profile/avatar/`, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: formData,
        });
      } else if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        if (path !== '/login' && path !== '/signup' && path !== '/verify-email') {
          window.location.href = '/login';
        }
        throw new Error('Session expired');
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Upload failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Remove avatar
   */
  async removeAvatar(): Promise<{ success: boolean }> {
    return this.fetch('/users/profile/avatar/', {
      method: 'DELETE',
    });
  }

  /**
   * Change password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; passwordChangedAt: string }> {
    return this.fetch('/users/password/change/', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  /**
   * Start 2FA setup (returns QR code and secret)
   */
  async setup2FA(): Promise<TwoFactorSetupResponse> {
    return this.fetch('/users/2fa/setup/', {
      method: 'POST',
    });
  }

  /**
   * Verify 2FA code and enable
   */
  async verify2FA(code: string): Promise<TwoFactorVerifyResponse> {
    return this.fetch('/users/2fa/verify/', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  /**
   * Disable 2FA
   */
  async disable2FA(password: string): Promise<{ success: boolean }> {
    return this.fetch('/users/2fa/disable/', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  }

  /**
   * Get API keys
   */
  async getAPIKeys(): Promise<{ keys: APIKeyInfo[] }> {
    return this.fetch('/users/api-keys/');
  }

  /**
   * Create API key
   */
  async createAPIKey(name: string): Promise<APIKeyInfo> {
    return this.fetch('/users/api-keys/', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  /**
   * Revoke API key
   */
  async revokeAPIKey(keyId: string): Promise<{ success: boolean }> {
    return this.fetch(`/users/api-keys/${keyId}/`, {
      method: 'DELETE',
    });
  }

  /**
   * Get friends list with stats and pending requests
   */
  async getFriends(): Promise<FriendsListResponse> {
    return this.fetch('/users/friends/');
  }

  /**
   * Send a friend request
   */
  async sendFriendRequest(username: string): Promise<{ status: string; friendshipId: string }> {
    return this.fetch(`/users/friends/request/${encodeURIComponent(username)}/`, {
      method: 'POST',
    });
  }

  /**
   * Respond to a friend request (accept or reject)
   */
  async respondFriendRequest(friendshipId: string, action: 'accept' | 'reject'): Promise<{ success: boolean; status: string }> {
    return this.fetch(`/users/friends/${friendshipId}/respond/`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  }

  /**
   * Remove a friend or cancel a pending request
   */
  async removeFriend(friendshipId: string): Promise<{ success: boolean }> {
    return this.fetch(`/users/friends/${friendshipId}/`, {
      method: 'DELETE',
    });
  }

  /**
   * Get friendship status with a user
   */
  async getFriendshipStatus(username: string): Promise<FriendshipStatus> {
    return this.fetch(`/users/friends/status/${encodeURIComponent(username)}/`);
  }

  /**
   * Get global leaderboard
   */
  async getLeaderboard(sort = 'portfolio_return', limit = 50): Promise<LeaderboardResponse> {
    return this.fetch(`/users/leaderboard/?sort=${sort}&limit=${limit}`);
  }

  /**
   * Get friends leaderboard
   */
  async getFriendsLeaderboard(sort = 'portfolio_return', limit = 50): Promise<LeaderboardResponse> {
    return this.fetch(`/users/leaderboard/?sort=${sort}&limit=${limit}&scope=friends`);
  }

  /**
   * Get exchange rates from backend
   */
  async getExchangeRates(): Promise<{ rates: Record<string, number>; status: { cached: boolean; is_fallback: boolean } }> {
    return this.fetch('/users/exchange-rates/');
  }

  /**
   * Get public profile by username
   */
  async getPublicProfile(username: string): Promise<PublicProfile> {
    return this.fetch(`/users/profile/${encodeURIComponent(username)}/public/`);
  }
}

// Export singleton instances
export const stockAPI = new StockAPI();
export const userAPI = new UserAPI();

// Export classes for custom instances
export { StockAPI, UserAPI };
