"""
Currency exchange rate service with real-time rates and fallback support.

Priority order:
1. Cached rates (1-hour TTL)
2. Open Exchange Rates API (live)
3. ExchangeRate-API (live)
4. Admin-configured rates from SiteSettings (set via admin panel)
5. Hardcoded fallback rates
"""

import requests
from decimal import Decimal
import logging
from django.core.cache import cache
from django.conf import settings

logger = logging.getLogger(__name__)

# Last-resort hardcoded fallback rates
HARDCODED_FALLBACK_RATES = {
    'USD': 1.0,
    'EUR': 0.84,
    'GBP': 0.73,
    'INR': 90.55,
    'JPY': 152.70,
    'CAD': 1.36,
    'AUD': 1.41,
    'CHF': 0.77,
    'CNY': 6.91,
    'SGD': 1.26,
}

SUPPORTED_CURRENCIES = set(HARDCODED_FALLBACK_RATES.keys())


class CurrencyExchangeService:
    """Service for fetching real-time currency exchange rates."""

    CACHE_KEY = 'exchange_rates'
    CACHE_SOURCE_KEY = 'exchange_rates_source'
    CACHE_TIMEOUT = 3600  # Cache for 1 hour

    @classmethod
    def _get_api_key(cls, attr):
        return getattr(settings, attr, '') or ''

    @classmethod
    def get_rates(cls):
        """
        Get exchange rates. Checks cache first, then fetches fresh.
        Returns dict with currency codes as keys and rates-vs-USD as values.
        """
        cached = cache.get(cls.CACHE_KEY)
        if cached:
            return cached

        rates, source = cls._fetch_rates()
        cache.set(cls.CACHE_KEY, rates, cls.CACHE_TIMEOUT)
        cache.set(cls.CACHE_SOURCE_KEY, source, cls.CACHE_TIMEOUT)
        return rates

    @classmethod
    def _fetch_rates(cls):
        """Fetch exchange rates with cascading fallback. Returns (rates, source)."""

        # 1. Try Open Exchange Rates API
        key = cls._get_api_key('OPEN_EXCHANGE_API_KEY')
        if key:
            rates = cls._fetch_from_open_exchange(key)
            if rates:
                logger.info("Exchange rates from Open Exchange Rates API")
                return rates, 'open_exchange_api'

        # 2. Try ExchangeRate-API
        key = cls._get_api_key('EXCHANGERATE_API_KEY')
        if key:
            rates = cls._fetch_from_exchangerate_api(key)
            if rates:
                logger.info("Exchange rates from ExchangeRate-API")
                return rates, 'exchangerate_api'

        # 3. Try admin-configured rates from SiteSettings
        admin_rates = cls._get_admin_rates()
        if admin_rates:
            logger.info("Exchange rates from admin panel (SiteSettings)")
            return admin_rates, 'admin'

        # 4. Hardcoded fallback
        logger.warning("Using hardcoded fallback exchange rates")
        return HARDCODED_FALLBACK_RATES, 'hardcoded'

    @classmethod
    def _get_admin_rates(cls):
        """Load exchange rates configured by admin in SiteSettings."""
        try:
            from users.models import SiteSettings
            site = SiteSettings.load()
            if site.exchange_rates and isinstance(site.exchange_rates, dict) and len(site.exchange_rates) > 0:
                # Ensure USD is always 1.0
                rates = dict(site.exchange_rates)
                rates['USD'] = 1.0
                return rates
        except Exception as e:
            logger.error(f"Failed to load admin exchange rates: {e}")
        return None

    @classmethod
    def _fetch_from_open_exchange(cls, api_key):
        """Fetch from Open Exchange Rates API."""
        try:
            url = "https://openexchangerates.org/api/latest.json"
            params = {
                'app_id': api_key,
                'base': 'USD',
                'symbols': ','.join(SUPPORTED_CURRENCIES),
            }
            response = requests.get(url, params=params, timeout=5)
            response.raise_for_status()
            data = response.json()
            if 'rates' in data:
                return data['rates']
        except Exception as e:
            logger.error(f"Open Exchange Rates API error: {e}")
        return None

    @classmethod
    def _fetch_from_exchangerate_api(cls, api_key):
        """Fetch from ExchangeRate-API."""
        try:
            url = "https://api.exchangerate-api.com/v4/latest/USD"
            headers = {'Authorization': f'Bearer {api_key}'}
            response = requests.get(url, headers=headers, timeout=5)
            response.raise_for_status()
            data = response.json()
            if 'rates' in data:
                rates = {k: v for k, v in data['rates'].items() if k in SUPPORTED_CURRENCIES}
                return rates if rates else None
        except Exception as e:
            logger.error(f"ExchangeRate-API error: {e}")
        return None

    @classmethod
    def convert(cls, amount, from_currency, to_currency):
        """Convert amount from one currency to another. Returns Decimal."""
        if from_currency == to_currency:
            return Decimal(str(amount))

        rates = cls.get_rates()

        from_rate = Decimal(str(rates.get(from_currency, 1.0)))
        to_rate = Decimal(str(rates.get(to_currency, 1.0)))

        # from_currency → USD → to_currency
        usd_amount = Decimal(str(amount)) / from_rate
        return usd_amount * to_rate

    @classmethod
    def get_rate(cls, from_currency, to_currency):
        """Get direct exchange rate between two currencies."""
        if from_currency == to_currency:
            return 1.0
        rates = cls.get_rates()
        from_rate = rates.get(from_currency, 1.0)
        to_rate = rates.get(to_currency, 1.0)
        return to_rate / from_rate if from_rate else 0

    @classmethod
    def clear_cache(cls):
        """Clear cached exchange rates so next call fetches fresh."""
        cache.delete(cls.CACHE_KEY)
        cache.delete(cls.CACHE_SOURCE_KEY)

    @classmethod
    def get_status(cls):
        """Return current status of the exchange rate system."""
        try:
            rates = cls.get_rates()
            source = cache.get(cls.CACHE_SOURCE_KEY) or 'unknown'
            return {
                'success': True,
                'source': source,
                'cached': cache.get(cls.CACHE_KEY) is not None,
                'rates_count': len(rates),
                'currencies': sorted(rates.keys()),
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'source': 'error',
            }
