"""
Base class for stock data providers.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional
from datetime import datetime


@dataclass
class StockQuote:
    """Standardized stock quote data."""
    symbol: str
    price: float
    change: float
    change_percent: float
    high: float
    low: float
    open: float
    previous_close: float
    volume: Optional[int] = None
    timestamp: Optional[datetime] = None
    name: Optional[str] = None
    provider: str = "unknown"
    currency: str = "USD"  # Currency the price is quoted in

    def to_dict(self) -> dict:
        return {
            "symbol": self.symbol,
            "price": self.price,
            "change": self.change,
            "changePercent": self.change_percent,
            "high": self.high,
            "low": self.low,
            "open": self.open,
            "previousClose": self.previous_close,
            "volume": self.volume,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "name": self.name,
            "provider": self.provider,
            "currency": self.currency,
        }


@dataclass
class ProviderError:
    """Error information from a provider."""
    provider: str
    error_type: str
    message: str

    def to_dict(self) -> dict:
        return {
            "provider": self.provider,
            "errorType": self.error_type,
            "message": self.message,
        }


@dataclass
class HistoricalBar:
    """Single OHLC bar for historical data."""
    time: str  # YYYY-MM-DD for daily, Unix timestamp for intraday
    open: float
    high: float
    low: float
    close: float
    volume: int

    def to_dict(self) -> dict:
        return {
            "time": self.time,
            "open": self.open,
            "high": self.high,
            "low": self.low,
            "close": self.close,
            "volume": self.volume,
        }


class BaseStockProvider(ABC):
    """Abstract base class for stock data providers."""

    name: str = "base"

    @abstractmethod
    def get_quote(self, symbol: str) -> Optional[StockQuote]:
        """
        Get a stock quote for a single symbol.

        Args:
            symbol: Stock ticker symbol (e.g., 'AAPL', 'GOOGL')

        Returns:
            StockQuote if successful, None if failed
        """
        pass

    @abstractmethod
    def get_quotes(self, symbols: list[str]) -> dict[str, Optional[StockQuote]]:
        """
        Get stock quotes for multiple symbols.

        Args:
            symbols: List of stock ticker symbols

        Returns:
            Dictionary mapping symbols to their quotes (None if failed)
        """
        pass

    @abstractmethod
    def search_symbol(self, query: str) -> list[dict]:
        """
        Search for stock symbols matching a query.

        Args:
            query: Search query (company name or partial symbol)

        Returns:
            List of matching symbols with metadata
        """
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """
        Check if the provider is available and configured.

        Returns:
            True if provider is ready to use
        """
        pass

    def get_historical_data(self, symbol: str, period: str, interval: str) -> Optional[list['HistoricalBar']]:
        """
        Get historical OHLC data for a symbol.

        Args:
            symbol: Stock ticker symbol
            period: Time period (e.g., '1d', '5d', '1mo', '6mo', '1y', '5y')
            interval: Bar interval (e.g., '5m', '15m', '1d', '1wk')

        Returns:
            List of HistoricalBar if successful, None if not supported/failed
        """
        return None
