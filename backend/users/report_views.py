"""
Report generation views for paper trading app.
Computes weekly, monthly, and yearly trading reports from actual trade data.
"""

from datetime import date, timedelta
from collections import defaultdict

from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import Trade, UserProfile, UserSettings
from .views import get_user, compute_trader_stats

_CURRENCY_SYMBOLS = {
    'USD': '$', 'EUR': '€', 'GBP': '£', 'INR': '₹',
    'JPY': '¥', 'CAD': 'C$', 'AUD': 'A$', 'CHF': 'CHF',
    'CNY': '¥', 'SGD': 'S$',
}

_EXCHANGE_RATES = {
    'USD': 1.0, 'EUR': 0.92, 'GBP': 0.79, 'INR': 83.12,
    'JPY': 149.50, 'CAD': 1.36, 'AUD': 1.53, 'CHF': 0.88,
    'CNY': 7.24, 'SGD': 1.34,
}


def _get_user_currency(user):
    """Return the user's preferred currency code."""
    try:
        return user.settings.currency
    except UserSettings.DoesNotExist:
        return 'USD'


def _get_currency_symbol(user):
    """Return the currency symbol for a user based on their settings."""
    currency = _get_user_currency(user)
    return _CURRENCY_SYMBOLS.get(currency, currency)


def _convert(value, from_currency, to_currency):
    """Convert a monetary value between currencies using exchange rates."""
    if from_currency == to_currency:
        return value
    from_rate = _EXCHANGE_RATES.get(from_currency, 1.0)
    to_rate = _EXCHANGE_RATES.get(to_currency, 1.0)
    return value * (to_rate / from_rate)


def _avg_buy_price(trades_qs, symbol, before_dt):
    """Compute average buy price for a symbol from BUY trades before a given datetime."""
    buys = trades_qs.filter(trade_type='BUY', symbol=symbol, executed_at__lte=before_dt)
    if not buys.exists():
        return 0
    total_cost = sum(float(t.price) * float(t.shares) for t in buys)
    total_shares = sum(float(t.shares) for t in buys)
    return total_cost / total_shares if total_shares > 0 else 0


def _compute_sell_stats(all_user_trades, sells, to_currency='USD'):
    """Compute win/loss stats and per-symbol profit from a queryset of SELL trades.

    Returns (winning_sells, total_sells, per_symbol_profit dict).
    per_symbol_profit maps symbol -> total realized profit converted to to_currency.
    """
    winning = 0
    total = 0
    per_symbol = defaultdict(float)

    for sell in sells:
        avg_bp = _avg_buy_price(all_user_trades, sell.symbol, sell.executed_at)
        profit = (float(sell.price) - avg_bp) * float(sell.shares)
        profit = _convert(profit, sell.currency, to_currency)
        per_symbol[sell.symbol] += profit
        total += 1
        if float(sell.price) > avg_bp:
            winning += 1

    return winning, total, dict(per_symbol)


def _format_currency(value, sym='$'):
    """Format a float as a currency string like +$1,234 or -$5.67."""
    sign = '+' if value >= 0 else '-'
    av = abs(value)
    if av < 10:
        return f"{sign}{sym}{av:,.2f}"
    return f"{sign}{sym}{av:,.0f}"


def _format_volume(value, sym='$'):
    """Format a volume value like $48.2K or $1.2M."""
    if abs(value) >= 1_000_000:
        return f"{sym}{value / 1_000_000:,.1f}M"
    if abs(value) >= 1_000:
        return f"{sym}{value / 1_000:,.1f}K"
    return f"{sym}{value:,.0f}"


def _format_percent(value):
    """Format a percentage like +18.4% or -5.2%."""
    sign = '+' if value >= 0 else ''
    return f"{sign}{value:.1f}%"


def _consecutive_wins(all_user_trades, sells_ordered):
    """Count consecutive winning sell trades from most recent."""
    streak = 0
    for sell in sells_ordered:
        avg_bp = _avg_buy_price(all_user_trades, sell.symbol, sell.executed_at)
        if float(sell.price) > avg_bp:
            streak += 1
        else:
            break
    return streak


# ---------------------------------------------------------------------------
# Shared computation helpers (used by both user-facing and admin views)
# ---------------------------------------------------------------------------

def compute_weekly_report(user):
    """Compute weekly report data for a user. Returns a dict (or None if no trades)."""
    now = timezone.now()
    sym = _get_currency_symbol(user)
    display_currency = _get_user_currency(user)
    monday = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)

    all_user_trades = Trade.objects.filter(user=user)
    week_trades = all_user_trades.filter(executed_at__gte=monday)

    if not week_trades.exists():
        return None

    sells = week_trades.filter(trade_type='SELL').order_by('-executed_at')
    winning, total_sells, per_symbol_profit = _compute_sell_stats(all_user_trades, sells, display_currency)
    total_pl = sum(per_symbol_profit.values())

    # Previous week for comparison
    prev_monday = monday - timedelta(days=7)
    prev_sells = all_user_trades.filter(
        trade_type='SELL', executed_at__gte=prev_monday, executed_at__lt=monday
    )
    _, _, prev_per_symbol = _compute_sell_stats(all_user_trades, prev_sells, display_currency)
    prev_pl = sum(prev_per_symbol.values())
    if prev_pl != 0:
        return_change = ((total_pl - prev_pl) / abs(prev_pl)) * 100
        return_change_str = f"{_format_percent(return_change)} from last week"
    else:
        return_change_str = "N/A last week"

    # Win rate
    win_rate = round((winning / total_sells * 100)) if total_sells > 0 else 0
    win_rate_detail = f"{winning} of {total_sells} trades" if total_sells > 0 else "No sells"

    # Best ticker
    if per_symbol_profit:
        best_sym = max(per_symbol_profit, key=per_symbol_profit.get)
        best_profit = per_symbol_profit[best_sym]
        best_trade = week_trades.filter(symbol=best_sym).first()
        best_name = best_trade.name if best_trade else best_sym
        trade_cur = best_trade.currency if best_trade else 'USD'
        avg_bp = _avg_buy_price(all_user_trades, best_sym, now)
        avg_bp_display = _convert(avg_bp, trade_cur, display_currency)
        sell_shares = sum(float(s.shares) for s in sells.filter(symbol=best_sym))
        best_pct = (best_profit / (avg_bp_display * sell_shares)) * 100 if avg_bp_display > 0 and sell_shares > 0 else 0
    else:
        best_sym = best_name = "N/A"
        best_profit = 0
        best_pct = 0

    # Volume (convert each trade's total to display currency)
    volume = sum(
        _convert(float(t.total), t.currency, display_currency)
        for t in week_trades
    )

    # Day streak: consecutive calendar days with at least one trade (from all trades)
    trade_dates = sorted(set(t.executed_at.date() for t in all_user_trades), reverse=True)
    streak = 0
    if trade_dates:
        expected = trade_dates[0]
        for d in trade_dates:
            if d == expected:
                streak += 1
                expected = d - timedelta(days=1)
            else:
                break

    # Daily bars (group by weekday)
    daily_pl = defaultdict(float)
    day_labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    for sell in sells:
        avg_bp = _avg_buy_price(all_user_trades, sell.symbol, sell.executed_at)
        pl = (float(sell.price) - avg_bp) * float(sell.shares)
        pl = _convert(pl, sell.currency, display_currency)
        weekday = sell.executed_at.weekday()
        daily_pl[weekday] += pl

    bars = []
    for i, label in enumerate(day_labels[:5]):  # Mon-Fri
        bars.append({'label': label, 'value': round(daily_pl.get(i, 0), 2), 'highlight': False})
    if bars and any(b['value'] != 0 for b in bars):
        max_idx = max(range(len(bars)), key=lambda x: abs(bars[x]['value']))
        bars[max_idx]['highlight'] = True

    daily_change = sum(daily_pl.values())
    daily_change_pct = _format_percent((daily_change / volume * 100) if volume > 0 else 0)

    # Date range
    sunday = monday + timedelta(days=6)
    date_range = f"{monday.strftime('%b %d').upper()} - {sunday.strftime('%b %d, %Y').upper()}"

    # User leaderboard position
    all_users = UserProfile.objects.all()
    entries = []
    for u in all_users:
        stats = compute_trader_stats(u)
        if stats['totalTrades'] == 0:
            continue
        entries.append((u.id, stats['portfolioReturn']))
    entries.sort(key=lambda x: x[1], reverse=True)
    position = next((i + 1 for i, (uid, _) in enumerate(entries) if uid == user.id), len(entries) or 1)

    return {
        'dateRange': date_range,
        'username': user.username,
        'initials': user.initials,
        'memberSince': user.created_at.strftime('%b %Y'),
        'rank': f"#{position}",
        'totalReturn': _format_currency(total_pl, sym),
        'totalReturnPositive': total_pl >= 0,
        'returnChange': return_change_str,
        'winRate': win_rate,
        'winRateDetail': win_rate_detail,
        'bestTicker': best_sym,
        'bestName': best_name,
        'bestProfit': _format_currency(best_profit, sym),
        'bestPercent': _format_percent(best_pct),
        'trades': week_trades.count(),
        'volume': _format_volume(volume, sym),
        'streak': f"{streak}D",
        'streakPositive': streak > 0,
        'dailyBars': bars,
        'dailyChangePercent': daily_change_pct,
        'generatedDate': now.strftime('%b %d, %Y'),
    }


def compute_monthly_report(user, year, month):
    """Compute monthly report data for a user. Returns a dict (or None if no trades)."""
    now = timezone.now()
    sym = _get_currency_symbol(user)
    display_currency = _get_user_currency(user)

    all_user_trades = Trade.objects.filter(user=user)
    month_trades = all_user_trades.filter(executed_at__year=year, executed_at__month=month)

    if not month_trades.exists():
        return None

    sells = month_trades.filter(trade_type='SELL').order_by('-executed_at')
    winning, total_sells, per_symbol_profit = _compute_sell_stats(all_user_trades, sells, display_currency)
    total_pl = sum(per_symbol_profit.values())

    unique_symbols = set(month_trades.values_list('symbol', flat=True))
    volume = sum(
        _convert(float(t.total), t.currency, display_currency)
        for t in month_trades
    )

    # Best ticker
    if per_symbol_profit:
        best_sym = max(per_symbol_profit, key=per_symbol_profit.get)
        best_profit = per_symbol_profit[best_sym]
        best_trade = month_trades.filter(symbol=best_sym).first()
        best_name = best_trade.name if best_trade else best_sym
        trade_cur = best_trade.currency if best_trade else 'USD'
        avg_bp = _avg_buy_price(all_user_trades, best_sym, now)
        avg_bp_display = _convert(avg_bp, trade_cur, display_currency)
        sell_shares = sum(float(s.shares) for s in sells.filter(symbol=best_sym))
        best_pct = (best_profit / (avg_bp_display * sell_shares)) * 100 if avg_bp_display > 0 and sell_shares > 0 else 0
    else:
        best_sym = best_name = "N/A"
        best_profit = 0
        best_pct = 0

    win_rate = round((winning / total_sells * 100)) if total_sells > 0 else 0

    # Day streak: consecutive calendar days with at least one trade
    trade_dates = sorted(set(t.executed_at.date() for t in all_user_trades), reverse=True)
    streak = 0
    if trade_dates:
        expected = trade_dates[0]
        for d in trade_dates:
            if d == expected:
                streak += 1
                expected = d - timedelta(days=1)
            else:
                break

    # Portfolio growth this month (convert initial balance from USD to display currency)
    initial = float(user.initial_balance) if user.initial_balance > 0 else 100000
    initial = _convert(initial, 'USD', display_currency)
    growth_pct = (total_pl / initial) * 100 if initial > 0 else 0

    # Week bars (group trades into 4 weeks)
    week_pls = defaultdict(float)
    for sell in sells:
        avg_bp = _avg_buy_price(all_user_trades, sell.symbol, sell.executed_at)
        pl = (float(sell.price) - avg_bp) * float(sell.shares)
        pl = _convert(pl, sell.currency, display_currency)
        day_of_month = sell.executed_at.day
        week_num = min((day_of_month - 1) // 7, 3)  # 0-3
        week_pls[week_num] += pl

    week_bars = []
    for i in range(4):
        week_bars.append({'label': f"W{i + 1}", 'value': round(week_pls.get(i, 0), 2), 'highlight': False})
    if week_bars and any(b['value'] != 0 for b in week_bars):
        max_idx = max(range(len(week_bars)), key=lambda x: abs(week_bars[x]['value']))
        week_bars[max_idx]['highlight'] = True

    month_name = date(year, month, 1).strftime('%B %Y')

    return {
        'month': month_name,
        'username': user.username,
        'memberSince': user.created_at.strftime('%b %Y'),
        'totalTrades': month_trades.count(),
        'uniqueStocks': len(unique_symbols),
        'totalPL': _format_currency(total_pl, sym),
        'totalPLPositive': total_pl >= 0,
        'volume': _format_volume(volume, sym),
        'bestTicker': best_sym,
        'bestName': best_name,
        'bestProfit': _format_currency(best_profit, sym),
        'bestPercent': _format_percent(best_pct),
        'winRate': win_rate,
        'streak': f"{streak}D",
        'streakPositive': streak > 0,
        'stocks': len(unique_symbols),
        'growthPercent': _format_percent(growth_pct),
        'growthPositive': growth_pct >= 0,
        'weekBars': week_bars,
    }


def compute_yearly_report(user, year):
    """Compute yearly report data for a user. Returns a dict (or None if no trades)."""
    now = timezone.now()
    sym = _get_currency_symbol(user)
    display_currency = _get_user_currency(user)

    all_user_trades = Trade.objects.filter(user=user)
    year_trades = all_user_trades.filter(executed_at__year=year)

    if not year_trades.exists():
        return None

    sells = year_trades.filter(trade_type='SELL').order_by('-executed_at')
    winning, total_sells, per_symbol_profit = _compute_sell_stats(all_user_trades, sells, display_currency)
    total_profit = sum(per_symbol_profit.values())

    unique_symbols = set(year_trades.values_list('symbol', flat=True))
    volume = sum(
        _convert(float(t.total), t.currency, display_currency)
        for t in year_trades
    )
    win_rate = round((winning / total_sells * 100)) if total_sells > 0 else 0

    # Best ticker
    if per_symbol_profit:
        best_sym = max(per_symbol_profit, key=per_symbol_profit.get)
        best_profit_val = per_symbol_profit[best_sym]
        best_trade_count = year_trades.filter(symbol=best_sym).count()
        best_trade = year_trades.filter(symbol=best_sym).first()
        trade_cur = best_trade.currency if best_trade else 'USD'
        avg_bp = _avg_buy_price(all_user_trades, best_sym, now)
        avg_bp_display = _convert(avg_bp, trade_cur, display_currency)
        sell_shares = sum(float(s.shares) for s in sells.filter(symbol=best_sym))
        best_return_pct = (best_profit_val / (avg_bp_display * sell_shares)) * 100 if avg_bp_display > 0 and sell_shares > 0 else 0
    else:
        best_sym = "N/A"
        best_profit_val = 0
        best_trade_count = 0
        best_return_pct = 0

    # Day streak: longest consecutive calendar days with at least one trade
    trade_dates = sorted(set(
        t.executed_at.date() for t in year_trades
    ))
    max_streak = 0
    current_streak = 1 if trade_dates else 0
    for i in range(1, len(trade_dates)):
        if (trade_dates[i] - trade_dates[i - 1]).days == 1:
            current_streak += 1
        else:
            max_streak = max(max_streak, current_streak)
            current_streak = 1
    max_streak = max(max_streak, current_streak)

    # Best day: calendar date with highest single-day profit
    daily_profits = defaultdict(float)
    for sell in sells:
        avg_bp = _avg_buy_price(all_user_trades, sell.symbol, sell.executed_at)
        pl = (float(sell.price) - avg_bp) * float(sell.shares)
        pl = _convert(pl, sell.currency, display_currency)
        daily_profits[sell.executed_at.date()] += pl

    if daily_profits:
        best_date = max(daily_profits, key=daily_profits.get)
        best_day_str = best_date.strftime('%b %d')
    else:
        best_day_str = "N/A"

    # Trader rank: percentile based on total profit vs all users (compare in USD for fairness)
    total_profit_usd = _convert(total_profit, display_currency, 'USD')
    all_users = UserProfile.objects.all()
    user_count = 0
    users_below = 0
    for u in all_users:
        u_sells = Trade.objects.filter(user=u, trade_type='SELL', executed_at__year=year)
        if not u_sells.exists():
            continue
        u_all_trades = Trade.objects.filter(user=u)
        _, _, u_per_symbol = _compute_sell_stats(u_all_trades, u_sells, 'USD')
        u_profit = sum(u_per_symbol.values())
        user_count += 1
        if u_profit < total_profit_usd:
            users_below += 1

    if user_count > 0:
        percentile = round((1 - users_below / user_count) * 100)
        trader_rank = f"Top {max(percentile, 1)}%"
    else:
        trader_rank = "Top 1%"

    return {
        'year': year,
        'username': user.username,
        'initials': user.initials,
        'memberSince': user.created_at.strftime('%b %Y'),
        'traderRank': trader_rank,
        'totalTrades': year_trades.count(),
        'totalProfit': _format_currency(total_profit, sym),
        'totalProfitPositive': total_profit >= 0,
        'winRate': win_rate,
        'stocksTraded': len(unique_symbols),
        'bestTicker': best_sym,
        'bestTradeCount': best_trade_count,
        'bestProfit': f"{sym}{abs(best_profit_val):,.0f}",
        'bestReturn': _format_percent(best_return_pct),
        'dayStreak': max_streak,
        'volume': _format_volume(volume, sym),
        'bestDay': best_day_str,
    }


# ---------------------------------------------------------------------------
# User-facing views (thin wrappers around shared helpers)
# ---------------------------------------------------------------------------

class WeeklyReportView(APIView):
    """GET /api/users/reports/weekly/ - Generate weekly trading report."""

    def get(self, request):
        user = get_user(request)
        data = compute_weekly_report(user)
        if data is None:
            return Response({'empty': True, 'message': 'No trades this week'})
        return Response(data)


class MonthlyReportView(APIView):
    """GET /api/users/reports/monthly/ - Generate monthly trading report.

    Monthly reports are only available for completed months (unlocks on
    the 1st of the following month).  Defaults to the most recent
    completed month.
    """

    def get(self, request):
        user = get_user(request)
        now = timezone.now()

        # Default to previous month
        first_of_current = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        prev = first_of_current - timedelta(days=1)
        year = int(request.query_params.get('year', prev.year))
        month = int(request.query_params.get('month', prev.month))

        # Block current or future months
        requested = date(year, month, 1)
        current_month = date(now.year, now.month, 1)
        if requested >= current_month:
            next_month = (current_month.replace(day=28) + timedelta(days=4)).replace(day=1)
            return Response({
                'locked': True,
                'message': f"Your {current_month.strftime('%B')} report will be available on {next_month.strftime('%b %d, %Y')}",
            })

        data = compute_monthly_report(user, year, month)
        if data is None:
            return Response({'empty': True, 'message': 'No trades this month'})
        return Response(data)


class YearlyReportView(APIView):
    """GET /api/users/reports/yearly/?year=2025 - Generate yearly wrapped report.

    Yearly wrapped is only available for completed years (unlocks on
    Jan 1st of the following year).  Defaults to the most recent
    completed year.
    """

    def get(self, request):
        user = get_user(request)
        now = timezone.now()
        year = int(request.query_params.get('year', now.year - 1))

        # Block current or future years
        if year >= now.year:
            return Response({
                'locked': True,
                'message': f"Your {now.year} Wrapped will be available on Jan 01, {now.year + 1}",
            })

        data = compute_yearly_report(user, year)
        if data is None:
            return Response({'empty': True, 'message': 'No trades this year'})
        return Response(data)
