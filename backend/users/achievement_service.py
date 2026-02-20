"""
Achievement checking and awarding service.
"""

from decimal import Decimal
from django.utils import timezone

from .models import Achievement, UserAchievement, Trade, Holding, Watchlist


def check_achievements(user):
    """
    Check all achievement requirements against current user data.
    Awards any newly earned achievements.
    Returns list of newly unlocked achievement dicts.
    """
    # Get already-unlocked achievement IDs
    unlocked_ids = set(
        UserAchievement.objects.filter(user=user).values_list('achievement_id', flat=True)
    )

    # Get all non-special achievements that haven't been unlocked yet
    candidates = Achievement.objects.exclude(
        id__in=unlocked_ids
    ).exclude(
        requirement_type='special'
    )

    if not candidates.exists():
        return []

    # Gather counts lazily (only compute what's needed)
    counts = {}
    needed_types = set(candidates.values_list('requirement_type', flat=True))

    if 'trades_count' in needed_types:
        counts['trades_count'] = Trade.objects.filter(user=user).count()

    if 'holdings_count' in needed_types:
        counts['holdings_count'] = Holding.objects.filter(user=user).count()

    if 'watchlist_count' in needed_types:
        counts['watchlist_count'] = Watchlist.objects.filter(user=user).count()

    if 'profit_amount' in needed_types:
        counts['profit_amount'] = _calculate_realized_profit(user)

    # Determine which achievements are newly earned
    newly_earned = []
    for achievement in candidates:
        current_value = counts.get(achievement.requirement_type, 0)
        if current_value >= achievement.requirement_value:
            newly_earned.append(achievement)

    if not newly_earned:
        return []

    # Bulk create UserAchievement records
    now = timezone.now()
    UserAchievement.objects.bulk_create(
        [UserAchievement(user=user, achievement=ach, unlocked_at=now) for ach in newly_earned],
        ignore_conflicts=True,
    )

    return [ach.to_dict() for ach in newly_earned]


def award_special_achievement(user, achievement_id):
    """
    Explicitly award a special achievement (e.g., early_adopter).
    Returns the achievement dict if newly awarded, None if already unlocked or not found.
    """
    try:
        achievement = Achievement.objects.get(id=achievement_id)
    except Achievement.DoesNotExist:
        return None

    _, created = UserAchievement.objects.get_or_create(
        user=user,
        achievement=achievement,
        defaults={'unlocked_at': timezone.now()},
    )

    if created:
        return achievement.to_dict()
    return None


def _calculate_realized_profit(user):
    """
    Calculate total realized profit from completed sell trades.
    Profit = sum of (sell_price - avg_buy_price) * shares for each sell trade.
    """
    sell_trades = Trade.objects.filter(user=user, trade_type='SELL')
    if not sell_trades.exists():
        return 0

    total_profit = Decimal('0')

    for sell in sell_trades:
        # Find avg buy price from buy trades for this symbol executed before this sell
        buy_trades = Trade.objects.filter(
            user=user,
            trade_type='BUY',
            symbol=sell.symbol,
            executed_at__lte=sell.executed_at,
        )
        if not buy_trades.exists():
            continue

        total_buy_cost = sum(t.price * t.shares for t in buy_trades)
        total_buy_shares = sum(t.shares for t in buy_trades)
        if total_buy_shares == 0:
            continue

        avg_buy_price = total_buy_cost / total_buy_shares
        profit = (sell.price - avg_buy_price) * sell.shares
        total_profit += profit

    return float(total_profit)
