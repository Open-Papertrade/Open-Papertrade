import { APP_CONFIG } from "@/config/app";

// Currency symbols mapping
export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$',
  CHF: 'CHF ',
  CNY: '¥',
  SGD: 'S$',
};

// Exchange rates relative to USD
export const EXCHANGE_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 1.09,      // EUR is typically stronger
  GBP: 1.27,      // GBP is typically stronger
  INR: 83.50,     // Indian Rupee
  JPY: 148.75,    // Japanese Yen
  CAD: 1.38,      // Canadian Dollar
  AUD: 1.54,      // Australian Dollar
  CHF: 0.89,      // Swiss Franc
  CNY: 7.28,      // Chinese Yuan
  SGD: 1.35,      // Singapore Dollar
};

// Currency locale mapping for proper number formatting
const CURRENCY_LOCALES: Record<string, string> = {
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
  INR: 'en-IN',
  JPY: 'ja-JP',
  CAD: 'en-CA',
  AUD: 'en-AU',
  CHF: 'de-CH',
  CNY: 'zh-CN',
  SGD: 'en-SG',
};

export interface CurrencyConfig {
  code: string;
  symbol: string;
  rate: number;
}

// Default currency config (can be overridden by context)
let currentCurrency: CurrencyConfig = {
  code: 'USD',
  symbol: '$',
  rate: 1.0,
};

export function setCurrentCurrency(config: CurrencyConfig) {
  currentCurrency = config;
}

export function getCurrentCurrency(): CurrencyConfig {
  return currentCurrency;
}

export function formatCurrency(
  value: number,
  compact = false,
  options?: {
    currency?: string;
    convertFromUSD?: boolean;
    sourceCurrency?: string;  // The currency the value is already in
  }
): string {
  const targetCurrency = options?.currency || currentCurrency.code;
  const symbol = CURRENCY_SYMBOLS[targetCurrency] || targetCurrency;
  const locale = CURRENCY_LOCALES[targetCurrency] || 'en-US';

  // Determine the source currency (what the value is currently in)
  // Default: assume value is already in the target/display currency (no conversion)
  const sourceCurrency = options?.sourceCurrency || targetCurrency;

  // Calculate display value with proper conversion
  let displayValue = value;

  if (options?.convertFromUSD === false) {
    // Explicitly skip conversion
    displayValue = value;
  } else if (sourceCurrency === targetCurrency) {
    // Source and target are the same, no conversion needed
    displayValue = value;
  } else {
    // Convert from source currency to target currency
    const sourceRate = EXCHANGE_RATES[sourceCurrency] || 1.0;
    const targetRate = EXCHANGE_RATES[targetCurrency] || 1.0;
    // Convert to USD first (divide by source rate), then to target (multiply by target rate)
    displayValue = (value / sourceRate) * targetRate;
  }

  // For JPY, no decimal places
  const decimals = targetCurrency === 'JPY' ? 0 : 2;

  if (compact && Math.abs(displayValue) >= 1000) {
    if (Math.abs(displayValue) >= 1000000) {
      return `${symbol}${(displayValue / 1000000).toFixed(1)}M`;
    }
    return `${symbol}${(displayValue / 1000).toFixed(0)}K`;
  }

  return `${symbol}${displayValue.toLocaleString(locale, {
    minimumFractionDigits: displayValue % 1 === 0 ? 0 : decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/**
 * Detect the likely source currency for a stock symbol based on its format.
 * Indian stocks end with .NS (NSE) or .BO (BSE).
 * Most other stocks are assumed to be in USD.
 */
export function getSymbolCurrency(symbol: string): string {
  if (!symbol) return 'USD';
  const upperSymbol = symbol.toUpperCase();

  // Indian market suffixes
  if (upperSymbol.endsWith('.NS') || upperSymbol.endsWith('.BO')) {
    return 'INR';
  }

  // Japanese market
  if (upperSymbol.endsWith('.T')) {
    return 'JPY';
  }

  // UK market
  if (upperSymbol.endsWith('.L')) {
    return 'GBP';
  }

  // European markets
  if (upperSymbol.endsWith('.PA') || upperSymbol.endsWith('.DE')) {
    return 'EUR';
  }

  // Default to USD (US markets, crypto, etc.)
  return 'USD';
}

export function formatPercent(value: number, showSign = true): string {
  const sign = showSign && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatNumber(value: number, decimals = 2): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatDateTime(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return `Today, ${formatTime(date)}`;
  } else if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday, ${formatTime(date)}`;
  }
  return `${formatDate(date)}, ${formatTime(date)}`;
}

export function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

// Convert amount between currencies
export function convertCurrency(amount: number, fromCurrency: string, toCurrency: string): number {
  const fromRate = EXCHANGE_RATES[fromCurrency] || 1.0;
  const toRate = EXCHANGE_RATES[toCurrency] || 1.0;

  // Convert to USD first, then to target currency
  const usdAmount = amount / fromRate;
  return usdAmount * toRate;
}

// --- Market Hours ---

export interface MarketStatus {
  isOpen: boolean;
  reason: string;
  marketName: string;
  displayHours: string;
}

const MARKET_SCHEDULES: Record<string, {
  name: string;
  timezone: string;
  openHour: number; openMinute: number;
  closeHour: number; closeMinute: number;
  displayHours: string;
}> = {
  US: {
    name: 'US (NYSE)',
    timezone: 'America/New_York',
    openHour: 9, openMinute: 30,
    closeHour: 16, closeMinute: 0,
    displayHours: '9:30 AM - 4:00 PM ET',
  },
  IN: {
    name: 'India (NSE)',
    timezone: 'Asia/Kolkata',
    openHour: 9, openMinute: 15,
    closeHour: 15, closeMinute: 30,
    displayHours: '9:15 AM - 3:30 PM IST',
  },
};

export function isCryptoSymbol(symbol: string): boolean {
  return symbol.toUpperCase().includes('-USD');
}

/**
 * Get the current market status using local schedule logic (sync fallback).
 */
export function getMarketStatusLocal(market: string, symbol: string): MarketStatus {
  if (isCryptoSymbol(symbol)) {
    return {
      isOpen: true,
      reason: 'Crypto markets are always open',
      marketName: 'Crypto',
      displayHours: '24/7',
    };
  }

  const schedule = MARKET_SCHEDULES[market] || MARKET_SCHEDULES.US;
  const now = new Date();

  // Get current time parts in the market's timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: schedule.timezone,
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'short',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);

  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
  const weekday = parts.find(p => p.type === 'weekday')?.value || '';

  const { name: marketName, displayHours } = schedule;

  // Weekend check
  if (weekday === 'Sat' || weekday === 'Sun') {
    return {
      isOpen: false,
      reason: `${marketName} is closed on weekends. Trading hours: ${displayHours}, Mon-Fri.`,
      marketName,
      displayHours,
    };
  }

  // Time window check (convert to minutes for easier comparison)
  const currentMinutes = hour * 60 + minute;
  const openMinutes = schedule.openHour * 60 + schedule.openMinute;
  const closeMinutes = schedule.closeHour * 60 + schedule.closeMinute;

  if (currentMinutes < openMinutes || currentMinutes >= closeMinutes) {
    return {
      isOpen: false,
      reason: `${marketName} is closed. Trading hours: ${displayHours}, Mon-Fri.`,
      marketName,
      displayHours,
    };
  }

  return {
    isOpen: true,
    reason: `${marketName} is open`,
    marketName,
    displayHours,
  };
}

/**
 * Get market status from the backend API (holiday-aware via Finnhub).
 * Falls back to local schedule logic if the API call fails.
 */
export async function getMarketStatus(market: string, symbol: string): Promise<MarketStatus> {
  // Crypto is always open — no API call needed
  if (isCryptoSymbol(symbol)) {
    return {
      isOpen: true,
      reason: 'Crypto markets are always open',
      marketName: 'Crypto',
      displayHours: '24/7',
    };
  }

  try {
    const { stockAPI } = await import('@/lib/api');
    const data = await stockAPI.getMarketStatus(market);

    const schedule = MARKET_SCHEDULES[market] || MARKET_SCHEDULES.US;
    const marketName = schedule.name;
    const displayHours = schedule.displayHours;

    if (data.isOpen) {
      return { isOpen: true, reason: `${marketName} is open`, marketName, displayHours };
    }

    let reason: string;
    if (data.holiday) {
      reason = `${marketName} is closed for ${data.holiday}. Trading hours: ${displayHours}, Mon-Fri.`;
    } else {
      reason = `${marketName} is closed. Trading hours: ${displayHours}, Mon-Fri.`;
    }

    return { isOpen: false, reason, marketName, displayHours };
  } catch {
    // API unavailable — fall back to local schedule
    return getMarketStatusLocal(market, symbol);
  }
}
