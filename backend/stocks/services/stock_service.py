"""
Stock Service — Yahoo Finance for all price data.

Finnhub is only used for real-time market status (holiday detection).
"""

import logging
from typing import Optional
from datetime import datetime, timedelta
from dataclasses import dataclass

from .base_provider import StockQuote, ProviderError, HistoricalBar
from .finnhub_provider import FinnhubProvider
from .yahoo_provider import YahooFinanceProvider

logger = logging.getLogger(__name__)


@dataclass
class StockServiceResult:
    """Result from stock service including metadata."""
    quote: Optional[StockQuote]
    success: bool
    primary_used: bool
    errors: list[ProviderError]
    cached: bool = False

    def to_dict(self) -> dict:
        return {
            "data": self.quote.to_dict() if self.quote else None,
            "success": self.success,
            "primaryUsed": self.primary_used,
            "errors": [e.to_dict() for e in self.errors],
            "cached": self.cached,
        }


@dataclass
class HistoricalDataResult:
    """Result from historical data request."""
    bars: Optional[list[HistoricalBar]]
    success: bool
    symbol: str
    period: str
    interval: str
    cached: bool = False

    def to_dict(self) -> dict:
        return {
            "bars": [b.to_dict() for b in self.bars] if self.bars else [],
            "success": self.success,
            "symbol": self.symbol,
            "period": self.period,
            "interval": self.interval,
            "count": len(self.bars) if self.bars else 0,
            "cached": self.cached,
        }


class StockService:
    """
    Stock service using Yahoo Finance for all price/quote/search data.

    Finnhub is retained solely for real-time market-status checks
    (holiday detection via /stock/market-status).

    Features:
    - Simple in-memory caching
    - Error tracking for debugging
    """

    # Finnhub exchange codes (used only for market status)
    EXCHANGE_CODES = {
        'US': 'US',
        'IN': 'NSE',
    }

    def __init__(self):
        self.provider = YahooFinanceProvider()
        self._finnhub = FinnhubProvider()  # only for market status
        self._cache: dict[str, tuple[StockQuote, datetime]] = {}
        self._cache_ttl = timedelta(minutes=5)
        self._history_cache: dict[str, tuple[list[HistoricalBar], datetime]] = {}
        self._history_cache_ttl = timedelta(minutes=5)
        self._market_status_cache: dict[str, tuple[dict, datetime]] = {}
        self._market_status_cache_ttl = timedelta(minutes=5)
        self._news_cache: dict[str, tuple[list[dict], datetime]] = {}
        self._news_cache_ttl = timedelta(minutes=30)

    def _get_from_cache(self, symbol: str) -> Optional[StockQuote]:
        """Get quote from cache if still valid."""
        if symbol in self._cache:
            quote, cached_at = self._cache[symbol]
            if datetime.now() - cached_at < self._cache_ttl:
                return quote
            else:
                del self._cache[symbol]
        return None

    def _set_cache(self, symbol: str, quote: StockQuote):
        """Cache a quote."""
        self._cache[symbol] = (quote, datetime.now())

    def get_quote(self, symbol: str, skip_cache: bool = False) -> StockServiceResult:
        """
        Get a stock quote from Yahoo Finance.

        Args:
            symbol: Stock ticker symbol
            skip_cache: If True, bypass cache and fetch fresh data

        Returns:
            StockServiceResult with quote and metadata
        """
        symbol = symbol.upper()

        # Check cache first
        if not skip_cache:
            cached_quote = self._get_from_cache(symbol)
            if cached_quote:
                logger.debug(f"Cache hit for {symbol}")
                return StockServiceResult(
                    quote=cached_quote,
                    success=True,
                    primary_used=False,
                    errors=[],
                    cached=True,
                )

        quote = self.provider.get_quote(symbol)
        if quote:
            self._set_cache(symbol, quote)
            return StockServiceResult(
                quote=quote,
                success=True,
                primary_used=False,
                errors=[],
            )

        return StockServiceResult(
            quote=None,
            success=False,
            primary_used=False,
            errors=[ProviderError(
                provider=self.provider.name,
                error_type="no_data",
                message=f"No data returned for {symbol}",
            )],
        )

    def get_quotes(self, symbols: list[str], skip_cache: bool = False) -> dict[str, StockServiceResult]:
        """
        Get quotes for multiple symbols.

        Args:
            symbols: List of stock ticker symbols
            skip_cache: If True, bypass cache and fetch fresh data

        Returns:
            Dictionary mapping symbols to their results
        """
        results = {}
        symbols_to_fetch = []

        # Check cache first
        if not skip_cache:
            for symbol in symbols:
                symbol = symbol.upper()
                cached_quote = self._get_from_cache(symbol)
                if cached_quote:
                    results[symbol] = StockServiceResult(
                        quote=cached_quote,
                        success=True,
                        primary_used=False,
                        errors=[],
                        cached=True,
                    )
                else:
                    symbols_to_fetch.append(symbol)
        else:
            symbols_to_fetch = [s.upper() for s in symbols]

        if not symbols_to_fetch:
            return results

        fetched = self.provider.get_quotes(symbols_to_fetch)
        for symbol, quote in fetched.items():
            if quote:
                self._set_cache(symbol, quote)
                results[symbol] = StockServiceResult(
                    quote=quote,
                    success=True,
                    primary_used=False,
                    errors=[],
                )
            else:
                results[symbol] = StockServiceResult(
                    quote=None,
                    success=False,
                    primary_used=False,
                    errors=[ProviderError(
                        provider=self.provider.name,
                        error_type="no_data",
                        message=f"No data returned for {symbol}",
                    )],
                )

        return results

    def search(self, query: str) -> list[dict]:
        """
        Search for stock symbols by name or symbol.

        Args:
            query: Search query (company name or partial symbol)
                   e.g., "Apple", "AAPL", "Reliance", "TCS"

        Returns:
            List of matching symbols with name, exchange, and type info
        """
        all_results = []
        seen_symbols = set()

        yahoo_results = self.provider.search_symbol(query)
        for i, result in enumerate(yahoo_results):
            symbol = result.get('symbol', '').upper()
            if symbol and symbol not in seen_symbols:
                seen_symbols.add(symbol)
                result['_order'] = i
                all_results.append(result)

        # Sort results with smart prioritization
        query_upper = query.upper()
        def sort_key(r):
            symbol = r.get('symbol', '').upper()
            name = r.get('name', '').upper()
            asset_type = r.get('type', '').upper()
            original_order = r.get('_order', 999)

            is_equity = asset_type in ('EQUITY', 'COMMON STOCK')
            is_etf = asset_type == 'ETF'
            is_crypto = asset_type == 'CRYPTOCURRENCY'

            # Priority 0: Exact symbol match (EQUITY)
            if symbol == query_upper and is_equity:
                return (0, 0, original_order)

            # Priority 1: Exact symbol match (other)
            if symbol == query_upper:
                return (1, 0, original_order)

            # Priority 2: EQUITY where name contains query (relevance order)
            if is_equity and query_upper in name:
                return (2, 0, original_order)

            # Priority 3: EQUITY where symbol starts with query
            if is_equity and symbol.startswith(query_upper):
                return (3, 0, original_order)

            # Priority 4: Other EQUITY (preserve relevance)
            if is_equity:
                return (4, 0, original_order)

            # Priority 5: ETF
            if is_etf:
                return (5, 0, original_order)

            # Priority 6: Crypto where symbol/name matches
            if is_crypto and (symbol.startswith(query_upper) or query_upper in name):
                return (6, 0, original_order)

            # Priority 7: Everything else
            return (7, 0, original_order)

        all_results.sort(key=sort_key)

        # Remove internal fields and limit results
        for r in all_results:
            r.pop('_order', None)

        return all_results[:15]

    def get_company_profile(self, symbol: str) -> Optional[dict]:
        """
        Get company profile information.

        Args:
            symbol: Stock ticker symbol

        Returns:
            Company profile dict or None
        """
        return self.provider.get_company_profile(symbol)

    def get_provider_status(self) -> dict:
        """Get status of stock data providers."""
        return {
            "provider": {
                "name": self.provider.name,
                "available": self.provider.is_available(),
            },
            "finnhubMarketStatus": {
                "name": self._finnhub.name,
                "available": self._finnhub.is_available(),
            },
            "cacheSize": len(self._cache),
        }

    def get_market_status(self, exchange: str) -> Optional[dict]:
        """
        Get market status from Finnhub with caching.

        Args:
            exchange: Market code ('US' or 'IN')

        Returns:
            Dict with isOpen, holiday, session, etc., or None if unavailable.
        """
        finnhub_exchange = self.EXCHANGE_CODES.get(exchange, exchange)

        # Check cache
        if finnhub_exchange in self._market_status_cache:
            cached_data, cached_at = self._market_status_cache[finnhub_exchange]
            if datetime.now() - cached_at < self._market_status_cache_ttl:
                logger.debug(f"Market status cache hit for {finnhub_exchange}")
                return cached_data
            else:
                del self._market_status_cache[finnhub_exchange]

        # Fetch from Finnhub
        if not self._finnhub.is_available():
            return None

        data = self._finnhub.get_market_status(finnhub_exchange)
        if data:
            self._market_status_cache[finnhub_exchange] = (data, datetime.now())
        return data

    def clear_cache(self):
        """Clear the quote cache."""
        self._cache.clear()
        self._history_cache.clear()
        self._market_status_cache.clear()
        self._news_cache.clear()

    def get_news(self, symbol: str) -> Optional[list[dict]]:
        """
        Get recent news for a symbol with caching.

        Args:
            symbol: Stock ticker symbol

        Returns:
            List of news article dicts, or None on failure
        """
        symbol = symbol.upper()

        # Check cache
        if symbol in self._news_cache:
            articles, cached_at = self._news_cache[symbol]
            if datetime.now() - cached_at < self._news_cache_ttl:
                return articles
            else:
                del self._news_cache[symbol]

        articles = self.provider.get_news(symbol)
        if articles is not None:
            self._news_cache[symbol] = (articles, datetime.now())
        return articles

    def get_historical_data(self, symbol: str, period: str, interval: str) -> HistoricalDataResult:
        """
        Get historical OHLC data from Yahoo Finance.

        Args:
            symbol: Stock ticker symbol
            period: yfinance period string
            interval: yfinance interval string

        Returns:
            HistoricalDataResult with bars and metadata
        """
        symbol = symbol.upper()
        cache_key = f"{symbol}:{period}:{interval}"

        # Check history cache
        if cache_key in self._history_cache:
            bars, cached_at = self._history_cache[cache_key]
            if datetime.now() - cached_at < self._history_cache_ttl:
                return HistoricalDataResult(
                    bars=bars, success=True, symbol=symbol,
                    period=period, interval=interval, cached=True,
                )
            else:
                del self._history_cache[cache_key]

        bars = self.provider.get_historical_data(symbol, period, interval)
        if bars:
            self._history_cache[cache_key] = (bars, datetime.now())
            return HistoricalDataResult(
                bars=bars, success=True, symbol=symbol,
                period=period, interval=interval,
            )

        return HistoricalDataResult(
            bars=None, success=False, symbol=symbol,
            period=period, interval=interval,
        )


# Singleton instance
_stock_service: Optional[StockService] = None


def get_stock_service() -> StockService:
    """Get the singleton stock service instance."""
    global _stock_service
    if _stock_service is None:
        _stock_service = StockService()
    return _stock_service
