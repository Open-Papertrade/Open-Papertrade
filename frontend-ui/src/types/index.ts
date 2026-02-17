export interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency?: string;  // Currency the price is in (e.g., "USD", "INR")
}

export interface Holding {
  symbol: string;
  name: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  currency?: string;  // Currency the prices are in
  change?: number;  // Daily price change
  changePercent?: number;  // Daily price change percent
}

export interface Transaction {
  id: string;
  date: Date;
  type: "BUY" | "SELL";
  symbol: string;
  shares: number;
  price: number;
  total: number;
}

export interface WatchlistItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  starred: boolean;
  currency?: string;  // Currency the price is in
}

export interface PriceAlert {
  id: string;
  symbol: string;
  condition: "above" | "below";
  targetPrice: number;
  currentPrice: number;
  enabled: boolean;
}

export interface Order {
  id: string;
  type: "BUY" | "SELL";
  orderType: "MARKET" | "LIMIT";
  symbol: string;
  name: string;
  shares: number;
  price: number;
  currency: string;
  status: "PENDING" | "FILLED" | "CANCELLED" | "EXPIRED";
  createdAt: string;
  filledAt: string | null;
  expiresAt: string | null;
}

export interface User {
  name: string;
  username: string;
  email: string;
  initials: string;
  avatarUrl: string | null;
  buyingPower: number;
  xp: number;
  level: number;
  rank: string;
}
