"""
Finnhub stock data provider.
https://finnhub.io/docs/api

Free tier: 60 API calls/minute, real-time US stock data
"""

import logging
from typing import Optional
from datetime import datetime, timedelta

import requests
from django.conf import settings

from .base_provider import BaseStockProvider, StockQuote

logger = logging.getLogger(__name__)


class FinnhubProvider(BaseStockProvider):
    """Finnhub API provider for stock data."""

    name = "finnhub"
    BASE_URL = "https://finnhub.io/api/v1"

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or getattr(settings, 'FINNHUB_API_KEY', '')
        self._available: Optional[bool] = None
        self._available_checked_at: Optional[datetime] = None
        self._available_ttl = timedelta(minutes=5)

    def _make_request(self, endpoint: str, params: dict = None) -> Optional[dict]:
        """Make a request to Finnhub API."""
        if not self.api_key:
            logger.warning("Finnhub API key not configured")
            return None

        params = params or {}
        params['token'] = self.api_key

        try:
            response = requests.get(
                f"{self.BASE_URL}/{endpoint}",
                params=params,
                timeout=10
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Finnhub API error: {e}")
            return None

    def get_quote(self, symbol: str) -> Optional[StockQuote]:
        """Get a stock quote from Finnhub."""
        symbol = symbol.upper()
        data = self._make_request("quote", {"symbol": symbol})

        if not data or data.get('c') is None or data.get('c') == 0:
            logger.warning(f"No data from Finnhub for {symbol}")
            return None

        try:
            return StockQuote(
                symbol=symbol,
                price=float(data['c']),  # Current price
                change=float(data['d']) if data['d'] else 0,  # Change
                change_percent=float(data['dp']) if data['dp'] else 0,  # Change percent
                high=float(data['h']) if data['h'] else 0,  # High
                low=float(data['l']) if data['l'] else 0,  # Low
                open=float(data['o']) if data['o'] else 0,  # Open
                previous_close=float(data['pc']) if data['pc'] else 0,  # Previous close
                timestamp=datetime.fromtimestamp(data['t']) if data.get('t') else datetime.now(),
                provider=self.name
            )
        except (KeyError, TypeError, ValueError) as e:
            logger.error(f"Error parsing Finnhub data for {symbol}: {e}")
            return None

    def get_quotes(self, symbols: list[str]) -> dict[str, Optional[StockQuote]]:
        """Get multiple stock quotes from Finnhub."""
        results = {}
        for symbol in symbols:
            results[symbol] = self.get_quote(symbol)
        return results

    def search_symbol(self, query: str) -> list[dict]:
        """Search for stock symbols on Finnhub."""
        data = self._make_request("search", {"q": query})

        if not data or 'result' not in data:
            return []

        results = []
        for item in data['result'][:10]:  # Limit to 10 results
            results.append({
                "symbol": item.get('symbol', ''),
                "name": item.get('description', ''),
                "type": item.get('type', ''),
                "provider": self.name,
            })
        return results

    def get_company_profile(self, symbol: str) -> Optional[dict]:
        """Get company profile information."""
        data = self._make_request("stock/profile2", {"symbol": symbol.upper()})

        if not data or not data.get('name'):
            return None

        return {
            "symbol": data.get('ticker', symbol),
            "name": data.get('name', ''),
            "country": data.get('country', ''),
            "exchange": data.get('exchange', ''),
            "industry": data.get('finnhubIndustry', ''),
            "logo": data.get('logo', ''),
            "weburl": data.get('weburl', ''),
            "marketCap": data.get('marketCapitalization', 0),
        }

    def get_market_status(self, exchange: str) -> Optional[dict]:
        """Get market status from Finnhub.

        Returns dict with keys: isOpen, holiday, session, exchange, t
        or None if the request fails.
        """
        data = self._make_request("stock/market-status", {"exchange": exchange})
        if not data or 'isOpen' not in data:
            return None
        return data

    def is_available(self) -> bool:
        """Check if Finnhub is available (cached for 5 minutes)."""
        if not self.api_key:
            return False

        now = datetime.now()
        if (
            self._available is not None
            and self._available_checked_at
            and now - self._available_checked_at < self._available_ttl
        ):
            return self._available

        try:
            data = self._make_request("quote", {"symbol": "AAPL"})
            self._available = data is not None and data.get('c') is not None
        except Exception:
            self._available = False

        self._available_checked_at = now
        return self._available
