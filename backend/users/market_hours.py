"""
Market hours utility for enforcing trading windows.

Crypto symbols (containing '-USD') trade 24/7.
Equity markets use Finnhub's market-status API for real-time status
(including holiday detection) and fall back to weekday + time-window
checks when Finnhub is unavailable.

Schedule fallback:
  - US (NYSE): 9:30 AM - 4:00 PM Eastern, Mon-Fri
  - India (NSE): 9:15 AM - 3:30 PM IST, Mon-Fri
"""

import logging
from datetime import datetime, time
from zoneinfo import ZoneInfo

logger = logging.getLogger(__name__)


MARKET_SCHEDULES = {
    'US': {
        'name': 'US (NYSE)',
        'timezone': 'America/New_York',
        'open': time(9, 30),
        'close': time(16, 0),
        'display_hours': '9:30 AM - 4:00 PM ET',
    },
    'IN': {
        'name': 'India (NSE)',
        'timezone': 'Asia/Kolkata',
        'open': time(9, 15),
        'close': time(15, 30),
        'display_hours': '9:15 AM - 3:30 PM IST',
    },
}


def _is_market_open_schedule(market: str, now: datetime | None = None) -> dict:
    """Time-based fallback: weekday + trading-window check."""
    schedule = MARKET_SCHEDULES.get(market, MARKET_SCHEDULES['US'])
    tz = ZoneInfo(schedule['timezone'])

    if now is None:
        now = datetime.now(tz)
    elif now.tzinfo is None:
        now = now.replace(tzinfo=ZoneInfo('UTC')).astimezone(tz)
    else:
        now = now.astimezone(tz)

    market_name = schedule['name']
    display_hours = schedule['display_hours']

    # Weekend check (Monday=0, Sunday=6)
    if now.weekday() >= 5:
        return {
            'is_open': False,
            'reason': f'{market_name} is closed on weekends. Trading hours: {display_hours}, Mon-Fri.',
            'market_name': market_name,
            'display_hours': display_hours,
            'source': 'schedule',
        }

    # Time window check
    current_time = now.time()
    if current_time < schedule['open'] or current_time >= schedule['close']:
        return {
            'is_open': False,
            'reason': f'{market_name} is closed. Trading hours: {display_hours}, Mon-Fri.',
            'market_name': market_name,
            'display_hours': display_hours,
            'source': 'schedule',
        }

    return {
        'is_open': True,
        'reason': f'{market_name} is open',
        'market_name': market_name,
        'display_hours': display_hours,
        'source': 'schedule',
    }


def is_market_open(market: str, symbol: str, now: datetime | None = None) -> dict:
    """
    Check whether a trade is allowed right now.

    Tries Finnhub market-status API first (holiday-aware). Falls back to
    weekday + time-window logic when Finnhub is unreachable.

    Args:
        market: 'US' or 'IN'
        symbol: Stock/crypto ticker (e.g. 'AAPL', 'BTC-USD')
        now: Optional datetime for testing (timezone-aware or naive UTC assumed).
             When provided, Finnhub is skipped and only the schedule fallback is used.

    Returns:
        dict with keys: is_open, reason, market_name, display_hours, source
    """
    # Crypto trades 24/7
    if '-USD' in symbol.upper():
        return {
            'is_open': True,
            'reason': 'Crypto markets are always open',
            'market_name': 'Crypto',
            'display_hours': '24/7',
            'source': 'local',
        }

    schedule = MARKET_SCHEDULES.get(market, MARKET_SCHEDULES['US'])
    market_name = schedule['name']
    display_hours = schedule['display_hours']

    # When `now` is passed (unit tests), skip Finnhub and use schedule only
    if now is not None:
        return _is_market_open_schedule(market, now)

    # Try Finnhub for real-time status (includes holidays)
    try:
        from stocks.services import get_stock_service
        service = get_stock_service()
        status = service.get_market_status(market)

        if status is not None:
            is_open = status.get('isOpen', False)
            holiday = status.get('holiday')
            session = status.get('session', '')

            if is_open:
                return {
                    'is_open': True,
                    'reason': f'{market_name} is open',
                    'market_name': market_name,
                    'display_hours': display_hours,
                    'source': 'finnhub',
                }

            # Closed — build informative reason
            if holiday:
                reason = f'{market_name} is closed for {holiday}. Trading hours: {display_hours}, Mon-Fri.'
            else:
                reason = f'{market_name} is closed. Trading hours: {display_hours}, Mon-Fri.'

            return {
                'is_open': False,
                'reason': reason,
                'market_name': market_name,
                'display_hours': display_hours,
                'holiday': holiday,
                'source': 'finnhub',
            }
    except Exception as e:
        logger.warning(f"Finnhub market status unavailable, falling back to schedule: {e}")

    # Fallback to schedule-based check
    return _is_market_open_schedule(market)


def is_symbol_valid_for_market(symbol: str, market: str) -> tuple[bool, str]:
    """
    Check whether a symbol is valid for the given market.

    Crypto (-USD) is always allowed regardless of market.
    Indian market (IN) requires .NS or .BO suffix.
    US market requires symbol NOT to end with .NS or .BO.

    Returns:
        (is_valid, error_message) — error_message is empty when valid.
    """
    upper = symbol.upper()

    # Crypto is market-agnostic
    if '-USD' in upper:
        return True, ''

    is_indian_symbol = upper.endswith('.NS') or upper.endswith('.BO')

    if market == 'IN' and not is_indian_symbol:
        return False, f'{symbol} is not available in the India (NSE/BSE) market'

    if market == 'US' and is_indian_symbol:
        return False, f'{symbol} is not available in the US market'

    return True, ''
