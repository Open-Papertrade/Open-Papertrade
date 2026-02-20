"""
Yahoo Finance stock data provider.
Uses yfinance library (unofficial Yahoo Finance API).

No API key required, but rate limits may apply.
Supports global stocks including Indian markets (NSE/BSE).
Automatically detects the correct exchange for symbols.
Supports name-based search (e.g., "Apple" -> AAPL).
"""

import logging
from typing import Optional
from datetime import datetime
import requests

import yfinance as yf
import pandas as pd

from .base_provider import BaseStockProvider, StockQuote, HistoricalBar

logger = logging.getLogger(__name__)

# Index symbol mappings (these need explicit mapping)
INDEX_SYMBOLS = {
    "NIFTY": "^NSEI",
    "NIFTY50": "^NSEI",
    "SENSEX": "^BSESN",
    "BANKNIFTY": "^NSEBANK",
    "SPX": "^GSPC",
    "SPY": "SPY",
    "DJI": "^DJI",
    "NASDAQ": "^IXIC",
    "VIX": "^VIX",
}


class YahooFinanceProvider(BaseStockProvider):
    """Yahoo Finance provider for stock data."""

    name = "yahoo"

    # Exchange suffixes to try (in order of priority)
    EXCHANGE_SUFFIXES = [
        "",       # US stocks (no suffix)
        ".NS",    # Indian NSE
        ".BO",    # Indian BSE
        ".L",     # London Stock Exchange
        ".TO",    # Toronto Stock Exchange
        ".AX",    # Australian Stock Exchange
        ".HK",    # Hong Kong Stock Exchange
        ".SI",    # Singapore Stock Exchange
    ]

    # Map exchange suffixes to currencies
    EXCHANGE_CURRENCIES = {
        "": "USD",      # US stocks
        ".NS": "INR",   # Indian NSE
        ".BO": "INR",   # Indian BSE
        ".L": "GBP",    # London
        ".TO": "CAD",   # Toronto
        ".AX": "AUD",   # Australia
        ".HK": "HKD",   # Hong Kong
        ".SI": "SGD",   # Singapore
        ".T": "JPY",    # Tokyo
        ".PA": "EUR",   # Paris
        ".DE": "EUR",   # Germany
    }

    def __init__(self):
        # Cache for symbol -> working yahoo symbol mapping
        self._symbol_cache: dict[str, str] = {}

    def _get_display_symbol(self, yahoo_symbol: str) -> str:
        """
        Get display symbol from Yahoo symbol.
        Keep the exchange suffix for non-US stocks to ensure correct lookups.
        Only strip the ^ prefix for indices.
        """
        display = yahoo_symbol.lstrip("^")
        return display

    def _get_currency_for_symbol(self, yahoo_symbol: str) -> str:
        """Detect the currency for a Yahoo symbol based on its suffix."""
        # Crypto pairs ending in -USD are already in USD
        if "-USD" in yahoo_symbol.upper():
            return "USD"

        # Check for exchange suffix
        for suffix, currency in self.EXCHANGE_CURRENCIES.items():
            if suffix and yahoo_symbol.upper().endswith(suffix.upper()):
                return currency

        # Default to USD for US stocks (no suffix)
        return "USD"

    def _try_fetch_quote(self, yahoo_symbol: str) -> Optional[StockQuote]:
        """
        Try to fetch quote for a specific Yahoo symbol.
        Returns StockQuote if successful, None otherwise.
        """
        try:
            ticker = yf.Ticker(yahoo_symbol)
            info = ticker.info
            display_symbol = self._get_display_symbol(yahoo_symbol)
            currency = self._get_currency_for_symbol(yahoo_symbol)

            # Try to get currency from Yahoo response if available
            if info and info.get('currency'):
                currency = info.get('currency')

            # Check if we got valid data
            if not info or info.get('trailingPegRatio') is None and 'regularMarketPrice' not in info:
                # Try fast_info as fallback
                fast_info = ticker.fast_info
                if hasattr(fast_info, 'last_price') and fast_info.last_price:
                    price = fast_info.last_price
                    prev_close = fast_info.previous_close if hasattr(fast_info, 'previous_close') else price
                    change = price - prev_close
                    change_percent = (change / prev_close * 100) if prev_close else 0

                    # Try to get currency from fast_info
                    if hasattr(fast_info, 'currency') and fast_info.currency:
                        currency = fast_info.currency

                    return StockQuote(
                        symbol=display_symbol,
                        price=float(price),
                        change=float(change),
                        change_percent=float(change_percent),
                        high=float(fast_info.day_high) if hasattr(fast_info, 'day_high') and fast_info.day_high else price,
                        low=float(fast_info.day_low) if hasattr(fast_info, 'day_low') and fast_info.day_low else price,
                        open=float(fast_info.open) if hasattr(fast_info, 'open') and fast_info.open else price,
                        previous_close=float(prev_close),
                        volume=int(fast_info.last_volume) if hasattr(fast_info, 'last_volume') and fast_info.last_volume else None,
                        timestamp=datetime.now(),
                        name=display_symbol,
                        provider=self.name,
                        currency=currency
                    )
                return None

            price = info.get('regularMarketPrice', 0)
            if not price:
                return None

            prev_close = info.get('regularMarketPreviousClose', info.get('previousClose', price))
            change = info.get('regularMarketChange', price - prev_close)
            change_percent = info.get('regularMarketChangePercent', 0)

            # Handle percentage as decimal (0.05) vs percentage (5.0)
            if abs(change_percent) < 1 and abs(change_percent) > 0:
                change_percent = change_percent * 100

            return StockQuote(
                symbol=display_symbol,
                price=float(price),
                change=float(change),
                change_percent=float(change_percent),
                high=float(info.get('regularMarketDayHigh', info.get('dayHigh', price))),
                low=float(info.get('regularMarketDayLow', info.get('dayLow', price))),
                open=float(info.get('regularMarketOpen', info.get('open', price))),
                previous_close=float(prev_close),
                volume=int(info.get('regularMarketVolume', 0)) or None,
                timestamp=datetime.now(),
                name=info.get('shortName', info.get('longName', display_symbol)),
                provider=self.name,
                currency=currency
            )

        except Exception as e:
            logger.debug(f"Yahoo Finance error for {yahoo_symbol}: {e}")
            return None

    def get_quote(self, symbol: str) -> Optional[StockQuote]:
        """
        Get a stock quote from Yahoo Finance.
        Automatically tries different exchange suffixes to find the symbol.
        """
        symbol = symbol.upper().strip()

        # Check if it's a known index
        if symbol in INDEX_SYMBOLS:
            yahoo_symbol = INDEX_SYMBOLS[symbol]
            quote = self._try_fetch_quote(yahoo_symbol)
            if quote:
                quote.symbol = symbol  # Use the friendly name
                return quote

        # Check cache first
        if symbol in self._symbol_cache:
            cached_yahoo_symbol = self._symbol_cache[symbol]
            quote = self._try_fetch_quote(cached_yahoo_symbol)
            if quote:
                return quote
            # Cache miss, remove stale entry
            del self._symbol_cache[symbol]

        # Already has a suffix or is an index - try as-is
        if "." in symbol or symbol.startswith("^") or "-" in symbol:
            quote = self._try_fetch_quote(symbol)
            if quote:
                self._symbol_cache[symbol] = symbol
                return quote
            return None

        # Try different exchange suffixes
        for suffix in self.EXCHANGE_SUFFIXES:
            yahoo_symbol = f"{symbol}{suffix}"
            logger.debug(f"Trying symbol: {yahoo_symbol}")
            quote = self._try_fetch_quote(yahoo_symbol)
            if quote:
                # Cache the working suffix for future lookups
                self._symbol_cache[symbol] = yahoo_symbol
                logger.debug(f"Found {symbol} as {yahoo_symbol}")
                return quote

        logger.warning(f"No data from Yahoo Finance for {symbol}")
        return None

    def get_quotes(self, symbols: list[str]) -> dict[str, Optional[StockQuote]]:
        """Get multiple stock quotes from Yahoo Finance."""
        results = {}

        for symbol in symbols:
            original_symbol = symbol.upper().strip()
            quote = self.get_quote(original_symbol)
            results[original_symbol] = quote

        return results

    def search_symbol(self, query: str) -> list[dict]:
        """
        Search for stock symbols on Yahoo Finance.
        Supports both symbol and company name search (e.g., "Apple" -> AAPL).
        """
        results = []
        query = query.strip()

        if not query:
            return results

        # Use Yahoo Finance search API for name-based search
        try:
            search_url = "https://query2.finance.yahoo.com/v1/finance/search"
            params = {
                "q": query,
                "quotesCount": 15,
                "newsCount": 0,
                "listsCount": 0,
                "enableFuzzyQuery": True,
                "quotesQueryId": "tss_match_phrase_query",
            }
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }

            response = requests.get(search_url, params=params, headers=headers, timeout=10)
            response.raise_for_status()
            data = response.json()

            quotes = data.get("quotes", [])
            seen_symbols = set()

            for quote in quotes:
                symbol = quote.get("symbol", "")
                if not symbol or symbol in seen_symbols:
                    continue

                # Filter to only equity and crypto types
                quote_type = quote.get("quoteType", "")
                if quote_type not in ["EQUITY", "ETF", "CRYPTOCURRENCY", "INDEX", "MUTUALFUND"]:
                    continue

                display_symbol = self._get_display_symbol(symbol)
                seen_symbols.add(symbol)
                seen_symbols.add(display_symbol)

                results.append({
                    "symbol": display_symbol,
                    "yahooSymbol": symbol,  # Include full Yahoo symbol for reference
                    "name": quote.get("shortname") or quote.get("longname") or display_symbol,
                    "type": quote_type,
                    "exchange": quote.get("exchange", ""),
                    "exchangeDisplay": quote.get("exchDisp", ""),
                    "provider": self.name,
                })

                # Limit results
                if len(results) >= 10:
                    break

        except requests.RequestException as e:
            logger.warning(f"Yahoo Finance search API error: {e}")
            # Fallback to direct symbol lookup
            return self._fallback_search(query)
        except Exception as e:
            logger.error(f"Yahoo Finance search error: {e}")
            return self._fallback_search(query)

        return results

    def _fallback_search(self, query: str) -> list[dict]:
        """Fallback search using direct symbol lookup."""
        results = []
        query = query.upper().strip()

        # Try the query with different suffixes
        for suffix in self.EXCHANGE_SUFFIXES:
            yahoo_symbol = f"{query}{suffix}"

            try:
                ticker = yf.Ticker(yahoo_symbol)
                info = ticker.info

                if info and info.get('shortName') and info.get('regularMarketPrice'):
                    display_symbol = self._get_display_symbol(yahoo_symbol)
                    if not any(r['symbol'] == display_symbol for r in results):
                        results.append({
                            "symbol": display_symbol,
                            "yahooSymbol": yahoo_symbol,
                            "name": info.get('shortName', info.get('longName', '')),
                            "type": info.get('quoteType', 'EQUITY'),
                            "exchange": info.get('exchange', ''),
                            "exchangeDisplay": info.get('exchange', ''),
                            "provider": self.name,
                        })
            except Exception as e:
                logger.debug(f"Fallback search error for {yahoo_symbol}: {e}")
                continue

            if len(results) >= 5:
                break

        return results

    def get_company_profile(self, symbol: str) -> Optional[dict]:
        """Get company profile information from Yahoo Finance."""
        # First get a valid quote to find the right yahoo symbol
        quote = self.get_quote(symbol)
        if not quote:
            return None

        # Use cached symbol if available
        yahoo_symbol = self._symbol_cache.get(symbol.upper(), symbol.upper())

        try:
            ticker = yf.Ticker(yahoo_symbol)
            info = ticker.info

            if not info or not info.get('shortName'):
                return None

            return {
                "symbol": self._get_display_symbol(yahoo_symbol),
                "name": info.get('shortName', info.get('longName', '')),
                "country": info.get('country', ''),
                "exchange": info.get('exchange', ''),
                "industry": info.get('industry', ''),
                "sector": info.get('sector', ''),
                "weburl": info.get('website', ''),
                "marketCap": info.get('marketCap', 0),
                "description": info.get('longBusinessSummary', ''),
            }

        except Exception as e:
            logger.error(f"Yahoo Finance profile error for {symbol}: {e}")
            return None

    def get_news(self, symbol: str) -> Optional[list[dict]]:
        """Get recent news articles for a symbol from Yahoo Finance."""
        symbol = symbol.upper().strip()
        yahoo_symbol = self._symbol_cache.get(symbol, symbol)
        if symbol in INDEX_SYMBOLS:
            yahoo_symbol = INDEX_SYMBOLS[symbol]

        try:
            ticker = yf.Ticker(yahoo_symbol)
            news = ticker.news
            if not news:
                return []

            articles = []
            for item in news[:10]:
                content = item.get('content', {})
                thumbnail_url = ''
                thumbnail = content.get('thumbnail')
                if thumbnail and thumbnail.get('resolutions'):
                    thumbnail_url = thumbnail['resolutions'][0].get('url', '')

                articles.append({
                    'title': content.get('title', ''),
                    'url': content.get('canonicalUrl', {}).get('url', ''),
                    'source': content.get('provider', {}).get('displayName', ''),
                    'publishedAt': content.get('pubDate', ''),
                    'thumbnail': thumbnail_url,
                })
            return articles
        except Exception as e:
            logger.error(f"Yahoo Finance news error for {symbol}: {e}")
            return None

    def is_available(self) -> bool:
        """Check if Yahoo Finance is available."""
        try:
            ticker = yf.Ticker("AAPL")
            info = ticker.fast_info
            return hasattr(info, 'last_price') and info.last_price is not None
        except Exception:
            return False

    def get_historical_data(self, symbol: str, period: str, interval: str) -> Optional[list[HistoricalBar]]:
        """
        Get historical OHLC data from Yahoo Finance.

        Args:
            symbol: Stock ticker symbol
            period: Time period (e.g., '1d', '5d', '1mo', '6mo', '1y', '5y')
            interval: Bar interval (e.g., '5m', '15m', '1d', '1wk')

        Returns:
            List of HistoricalBar if successful, None if failed
        """
        symbol = symbol.upper().strip()

        # Resolve to yahoo symbol using cache / suffix search
        yahoo_symbol = symbol
        if symbol in INDEX_SYMBOLS:
            yahoo_symbol = INDEX_SYMBOLS[symbol]
        elif symbol in self._symbol_cache:
            yahoo_symbol = self._symbol_cache[symbol]
        elif "." not in symbol and not symbol.startswith("^") and "-" not in symbol:
            # Try suffix resolution (same logic as get_quote)
            for suffix in self.EXCHANGE_SUFFIXES:
                candidate = f"{symbol}{suffix}"
                try:
                    ticker = yf.Ticker(candidate)
                    hist = ticker.history(period="5d", interval="1d")
                    if hist is not None and not hist.empty:
                        yahoo_symbol = candidate
                        self._symbol_cache[symbol] = candidate
                        break
                except Exception:
                    continue

        try:
            ticker = yf.Ticker(yahoo_symbol)
            hist = ticker.history(period=period, interval=interval)

            if hist is None or hist.empty:
                return None

            is_intraday = interval in ("1m", "2m", "5m", "15m", "30m", "60m", "90m")
            bars: list[HistoricalBar] = []
            seen_times: set[str] = set()

            for idx, row in hist.iterrows():
                # Skip rows with NaT index or NaN OHLC values
                if pd.isna(idx):
                    continue
                if any(pd.isna(row.get(col, float('nan'))) for col in ("Open", "High", "Low", "Close")):
                    continue

                if is_intraday:
                    time_val = str(int(idx.timestamp()))
                else:
                    time_val = idx.strftime("%Y-%m-%d")

                # Skip duplicate timestamps
                if time_val in seen_times:
                    continue
                seen_times.add(time_val)

                bars.append(HistoricalBar(
                    time=time_val,
                    open=round(float(row["Open"]), 4),
                    high=round(float(row["High"]), 4),
                    low=round(float(row["Low"]), 4),
                    close=round(float(row["Close"]), 4),
                    volume=int(row.get("Volume", 0)),
                ))

            return bars if bars else None

        except Exception as e:
            logger.error(f"Yahoo Finance history error for {symbol}: {e}")
            return None
