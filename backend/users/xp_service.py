"""
XP and Rank service for paper trading app.
"""

from .models import Holding, Trade, UserAchievement

# Rank ladder: (level, title, xp_required)
RANK_LADDER = [
    (1, 'Retail Trader', 0),
    (2, 'Day Trader', 500),
    (3, 'Swing Trader', 1500),
    (4, 'Floor Trader', 4000),
    (5, 'Fund Manager', 8000),
    (6, 'Market Maker', 15000),
    (7, 'Wall Street Legend', 30000),
]

# XP award amounts
XP_TRADE_EXECUTED = 25
XP_FIRST_TRADE_BONUS = 75
XP_PROFITABLE_SELL = 50
XP_ACHIEVEMENT_UNLOCKED = 100
XP_5_HOLDINGS = 150
XP_10_HOLDINGS = 250


def get_rank_for_xp(xp):
    """Return (level, rank_title) for a given XP amount."""
    result_level, result_rank = 1, 'Retail Trader'
    for level, title, required in RANK_LADDER:
        if xp >= required:
            result_level, result_rank = level, title
    return result_level, result_rank


def award_xp(user, amount):
    """Award XP to a user and update their rank/level."""
    user.xp += amount
    new_level, new_rank = get_rank_for_xp(user.xp)
    user.level = new_level
    user.rank = new_rank
    user.save(update_fields=['xp', 'rank', 'level'])
    return user.xp


def award_trade_xp(user, trade_type, sell_price=None, avg_buy_price=None):
    """Award XP for a trade execution. Returns total XP awarded."""
    xp_gained = 0

    # Base XP for executing a trade
    xp_gained += XP_TRADE_EXECUTED

    # First trade bonus
    trade_count = Trade.objects.filter(user=user).count()
    if trade_count == 1:
        xp_gained += XP_FIRST_TRADE_BONUS

    # Profitable sell bonus
    if trade_type == 'SELL' and sell_price is not None and avg_buy_price is not None:
        if sell_price > avg_buy_price:
            xp_gained += XP_PROFITABLE_SELL

    # Holdings milestones
    holdings_count = Holding.objects.filter(user=user).count()
    if holdings_count == 5:
        xp_gained += XP_5_HOLDINGS
    elif holdings_count == 10:
        xp_gained += XP_10_HOLDINGS

    if xp_gained > 0:
        award_xp(user, xp_gained)

    return xp_gained


def award_achievement_xp(user, new_achievements):
    """Award XP for newly unlocked achievements. Returns total XP awarded."""
    if not new_achievements:
        return 0
    xp_gained = len(new_achievements) * XP_ACHIEVEMENT_UNLOCKED
    award_xp(user, xp_gained)
    return xp_gained


def get_rank_info(user):
    """Get full rank info for a user."""
    return {
        'level': user.level,
        'rank': user.rank,
        'xp': user.xp,
        'nextRank': get_next_rank_info(user.xp),
    }


def get_next_rank_info(xp):
    """Get info about the next rank."""
    for level, title, required in RANK_LADDER:
        if xp < required:
            return {
                'level': level,
                'rank': title,
                'xpRequired': required,
                'xpRemaining': required - xp,
            }
    # Already at max rank
    return None
