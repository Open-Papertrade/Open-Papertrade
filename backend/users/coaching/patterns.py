"""
Behavioral pattern detection.
Scans trade history for recurring behavioral biases and habits.
"""

from __future__ import annotations
from datetime import timedelta
from collections import defaultdict


# ── Pattern IDs ──────────────────────────────────────────────────

PANIC_SELLING = "panic_selling"
FOMO_BUYING = "fomo_buying"
REVENGE_TRADING = "revenge_trading"
OVERTRADING = "overtrading"
CUTTING_WINNERS = "cutting_winners"
HOLDING_LOSERS = "holding_losers"
AVERAGING_DOWN = "averaging_down"
CONCENTRATION_RISK = "concentration_risk"
SIZE_INCONSISTENCY = "size_inconsistency"
ROUND_NUMBER_BIAS = "round_number_bias"
HERDING = "herding"
LOSS_AVERSION = "loss_aversion"
WINNING_STREAK_OVERCONFIDENCE = "winning_streak_overconfidence"
TIME_CLUSTERING = "time_clustering"
IMPROVING_TREND = "improving_trend"
DIVERSIFICATION_GOOD = "diversification_good"

PATTERN_META = {
    PANIC_SELLING: {
        "name": "Panic Selling",
        "icon": "🔥",
        "severity": "warning",
        "description": "You sold positions shortly after a price drop, possibly driven by fear rather than strategy.",
        "advice": "Set stop-loss levels before entering a trade. If the price is still above your stop, the dip may be a normal fluctuation.",
    },
    FOMO_BUYING: {
        "name": "FOMO Buying",
        "icon": "🚀",
        "severity": "warning",
        "description": "You bought stocks after significant price increases, chasing momentum at potentially elevated prices.",
        "advice": "Wait for pullbacks before entering. If a stock just rallied 5%+, the easy money may already be made.",
    },
    REVENGE_TRADING: {
        "name": "Revenge Trading",
        "icon": "😤",
        "severity": "danger",
        "description": "You made trades immediately after a loss, possibly trying to recover quickly rather than thinking clearly.",
        "advice": "After a losing trade, take a break. Review what went wrong before placing another trade.",
    },
    OVERTRADING: {
        "name": "Overtrading",
        "icon": "⚡",
        "severity": "warning",
        "description": "You're making a high volume of trades, which can indicate impulsive behavior and reduces average quality per trade.",
        "advice": "Quality over quantity. Fewer, well-researched trades typically outperform frequent impulsive ones.",
    },
    CUTTING_WINNERS: {
        "name": "Cutting Winners Early",
        "icon": "✂️",
        "severity": "info",
        "description": "You tend to sell profitable positions too quickly, missing further upside after your exit.",
        "advice": "Let your winners run. Consider using trailing stops instead of taking profit at the first sign of green.",
    },
    HOLDING_LOSERS: {
        "name": "Holding Losers Too Long",
        "icon": "⏳",
        "severity": "warning",
        "description": "You held losing positions for extended periods, hoping they'd recover rather than cutting your losses.",
        "advice": "Define an exit plan before entering. If a stock drops X% from your entry, consider cutting the loss and moving on.",
    },
    AVERAGING_DOWN: {
        "name": "Averaging Down Excessively",
        "icon": "📉",
        "severity": "info",
        "description": "You repeatedly bought more shares of declining stocks, increasing your exposure to a losing position.",
        "advice": "Averaging down can work, but only with conviction and a plan. Don't throw good money after bad.",
    },
    CONCENTRATION_RISK: {
        "name": "Concentration Risk",
        "icon": "🎯",
        "severity": "warning",
        "description": "A large portion of your portfolio is in a single stock, making you vulnerable to company-specific events.",
        "advice": "Diversify across at least 5-10 positions. No single stock should be more than 20% of your portfolio.",
    },
    SIZE_INCONSISTENCY: {
        "name": "Inconsistent Position Sizing",
        "icon": "📊",
        "severity": "info",
        "description": "Your trade sizes vary significantly, suggesting you might be betting bigger on emotional trades.",
        "advice": "Use a consistent position sizing rule (e.g., 5-10% of portfolio per trade) to manage risk evenly.",
    },
    ROUND_NUMBER_BIAS: {
        "name": "Round Number Bias",
        "icon": "🔢",
        "severity": "info",
        "description": "You tend to buy/sell at round numbers, which are common support/resistance levels where many traders cluster.",
        "advice": "Consider placing orders slightly off round numbers to get better fills (e.g., $99.50 instead of $100).",
    },
    HERDING: {
        "name": "Herding Behavior",
        "icon": "🐑",
        "severity": "info",
        "description": "Many of your trades are in the same popular stocks, suggesting you may follow the crowd rather than your own analysis.",
        "advice": "Popular stocks have the most competition. Look for opportunities in less-followed names too.",
    },
    LOSS_AVERSION: {
        "name": "Loss Aversion",
        "icon": "🛡️",
        "severity": "info",
        "description": "You sell winners quickly but hold losers — the classic disposition effect. Your average win is smaller than your average loss.",
        "advice": "Flip the script: cut losers faster and let winners run longer.",
    },
    WINNING_STREAK_OVERCONFIDENCE: {
        "name": "Overconfidence After Wins",
        "icon": "🎰",
        "severity": "warning",
        "description": "After a winning streak, your trade sizes increased, suggesting overconfidence that could amplify future losses.",
        "advice": "Stay disciplined regardless of recent results. A winning streak doesn't mean your next trade is guaranteed.",
    },
    TIME_CLUSTERING: {
        "name": "Time Clustering",
        "icon": "⏰",
        "severity": "info",
        "description": "Most of your trades happen in bursts rather than being spread out, suggesting impulsive batch trading.",
        "advice": "Spread trades out. Give yourself time to think between decisions.",
    },
    IMPROVING_TREND: {
        "name": "Improving Over Time",
        "icon": "📈",
        "severity": "positive",
        "description": "Your recent trades show better timing and returns compared to your earlier trades. Your skills are developing!",
        "advice": "Keep refining what's working. Journal your process so you can repeat it.",
    },
    DIVERSIFICATION_GOOD: {
        "name": "Well-Diversified",
        "icon": "✅",
        "severity": "positive",
        "description": "Your portfolio is well-spread across multiple positions with no single stock dominating.",
        "advice": "Great job managing concentration risk. Keep it up!",
    },
}


def detect_patterns(trades: list[dict], holdings: list[dict], buying_power: float) -> list[dict]:
    """
    Scan trade history and detect behavioral patterns.
    Returns list of detected patterns with metadata, evidence, and frequency.
    """
    if len(trades) < 3:
        return []

    detected = []
    sells = [t for t in trades if t["trade_type"] == "SELL"]
    buys = [t for t in trades if t["trade_type"] == "BUY"]
    sorted_trades = sorted(trades, key=lambda t: t["executed_at"])

    # ── Panic Selling ──
    panic_count = 0
    panic_examples = []
    for sell in sells:
        # Check if the stock dropped significantly in the days before selling
        recent_buys = [b for b in buys if b["symbol"] == sell["symbol"]
                       and b["executed_at"] < sell["executed_at"]]
        if recent_buys:
            last_buy = max(recent_buys, key=lambda b: b["executed_at"])
            price_change = (float(sell["price"]) - float(last_buy["price"])) / float(last_buy["price"]) * 100
            time_diff = (sell["executed_at"] - last_buy["executed_at"]).total_seconds() / 3600

            # Sold at a loss within 48 hours
            if price_change < -3 and time_diff < 48:
                panic_count += 1
                panic_examples.append(f'{sell["symbol"]} ({price_change:+.1f}% in {time_diff:.0f}h)')

    if panic_count >= 2:
        detected.append(_make_pattern(PANIC_SELLING, panic_count, len(sells), panic_examples[:3]))

    # ── FOMO Buying ──
    fomo_count = 0
    fomo_examples = []
    for buy in buys:
        # Check if stock had already run up significantly
        prev_sells_or_buys = [t for t in trades if t["symbol"] == buy["symbol"]
                              and t["executed_at"] < buy["executed_at"]]
        if prev_sells_or_buys:
            prev = max(prev_sells_or_buys, key=lambda t: t["executed_at"])
            price_change = (float(buy["price"]) - float(prev["price"])) / float(prev["price"]) * 100
            if price_change > 5:
                fomo_count += 1
                fomo_examples.append(f'{buy["symbol"]} (bought after +{price_change:.1f}% run)')

    if fomo_count >= 2:
        detected.append(_make_pattern(FOMO_BUYING, fomo_count, len(buys), fomo_examples[:3]))

    # ── Revenge Trading ──
    revenge_count = 0
    revenge_examples = []
    for i, trade in enumerate(sorted_trades):
        if i == 0:
            continue
        prev = sorted_trades[i - 1]
        # Previous trade was a losing sell, new trade within 1 hour
        if prev["trade_type"] == "SELL":
            prev_buys = [b for b in buys if b["symbol"] == prev["symbol"] and b["executed_at"] < prev["executed_at"]]
            if prev_buys:
                avg_buy = sum(float(b["price"]) * float(b["shares"]) for b in prev_buys) / sum(float(b["shares"]) for b in prev_buys)
                if float(prev["price"]) < avg_buy:
                    time_gap = (trade["executed_at"] - prev["executed_at"]).total_seconds() / 3600
                    if time_gap < 2:
                        revenge_count += 1
                        revenge_examples.append(f'Lost on {prev["symbol"]}, immediately traded {trade["symbol"]}')

    if revenge_count >= 2:
        detected.append(_make_pattern(REVENGE_TRADING, revenge_count, len(trades), revenge_examples[:3]))

    # ── Overtrading ──
    if len(trades) >= 10:
        first = sorted_trades[0]["executed_at"]
        last = sorted_trades[-1]["executed_at"]
        days = max((last - first).days, 1)
        trades_per_day = len(trades) / days
        if trades_per_day > 3:
            detected.append(_make_pattern(OVERTRADING, len(trades), days,
                                          [f'{trades_per_day:.1f} trades/day over {days} days']))

    # ── Cutting Winners Early ──
    cut_count = 0
    for sell in sells:
        avg_buy = _avg_buy(buys, sell["symbol"], sell["executed_at"])
        if avg_buy > 0:
            gain_pct = (float(sell["price"]) - avg_buy) / avg_buy * 100
            hold_hours = (sell["executed_at"] - min(
                (b["executed_at"] for b in buys if b["symbol"] == sell["symbol"]),
                default=sell["executed_at"]
            )).total_seconds() / 3600
            if 0 < gain_pct < 3 and hold_hours < 24:
                cut_count += 1

    if cut_count >= 2:
        detected.append(_make_pattern(CUTTING_WINNERS, cut_count, len(sells),
                                      [f'{cut_count} positions sold with <3% gain within 24h']))

    # ── Holding Losers Too Long ──
    hold_loser_count = 0
    for h in holdings:
        # Check current holdings that are down significantly
        avg_cost = float(h["avg_cost"])
        # We don't have current price here, but we can check if buys are old
        first_buy = next((b for b in sorted(buys, key=lambda x: x["executed_at"])
                          if b["symbol"] == h["symbol"]), None)
        if first_buy:
            hold_days = (sorted_trades[-1]["executed_at"] - first_buy["executed_at"]).days
            if hold_days > 30:
                hold_loser_count += 1

    # ── Loss Aversion (Disposition Effect) ──
    winning_hold_times = []
    losing_hold_times = []
    for sell in sells:
        avg_buy = _avg_buy(buys, sell["symbol"], sell["executed_at"])
        if avg_buy <= 0:
            continue
        first_buy = min(
            (b["executed_at"] for b in buys if b["symbol"] == sell["symbol"] and b["executed_at"] <= sell["executed_at"]),
            default=sell["executed_at"]
        )
        hold_days = (sell["executed_at"] - first_buy).days
        if float(sell["price"]) > avg_buy:
            winning_hold_times.append(hold_days)
        else:
            losing_hold_times.append(hold_days)

    if winning_hold_times and losing_hold_times:
        avg_win_hold = sum(winning_hold_times) / len(winning_hold_times)
        avg_loss_hold = sum(losing_hold_times) / len(losing_hold_times)
        if avg_loss_hold > avg_win_hold * 1.5 and len(losing_hold_times) >= 2:
            detected.append(_make_pattern(LOSS_AVERSION, len(losing_hold_times), len(sells),
                                          [f'Avg hold: {avg_win_hold:.0f}d (winners) vs {avg_loss_hold:.0f}d (losers)']))

    # ── Concentration Risk ──
    total_invested = sum(float(h["shares"]) * float(h["avg_cost"]) for h in holdings)
    if total_invested > 0:
        for h in holdings:
            val = float(h["shares"]) * float(h["avg_cost"])
            pct = val / total_invested * 100
            if pct > 40:
                detected.append(_make_pattern(CONCENTRATION_RISK, 1, len(holdings),
                                              [f'{h["symbol"]} is {pct:.0f}% of your portfolio']))
                break

    # ── Size Inconsistency ──
    if len(trades) >= 5:
        sizes = [float(t["total"]) for t in trades]
        avg_size = sum(sizes) / len(sizes)
        if avg_size > 0:
            cv = (sum((s - avg_size) ** 2 for s in sizes) / len(sizes)) ** 0.5 / avg_size
            if cv > 0.8:
                smallest = min(sizes)
                largest = max(sizes)
                detected.append(_make_pattern(SIZE_INCONSISTENCY, len(trades), len(trades),
                                              [f'Trades range from ${smallest:,.0f} to ${largest:,.0f} (CV={cv:.2f})']))

    # ── Round Number Bias ──
    round_count = sum(1 for t in trades if float(t["price"]) % 5 < 0.1 or float(t["price"]) % 5 > 4.9)
    if round_count > len(trades) * 0.4 and round_count >= 3:
        detected.append(_make_pattern(ROUND_NUMBER_BIAS, round_count, len(trades), []))

    # ── Winning Streak Overconfidence ──
    if len(sorted_trades) >= 6:
        streak = 0
        for i, t in enumerate(sorted_trades):
            if t["trade_type"] == "SELL":
                avg_buy = _avg_buy(buys, t["symbol"], t["executed_at"])
                if avg_buy > 0 and float(t["price"]) > avg_buy:
                    streak += 1
                    if streak >= 3 and i + 1 < len(sorted_trades):
                        next_trade = sorted_trades[i + 1]
                        if float(next_trade["total"]) > 1.5 * (sum(float(x["total"]) for x in sorted_trades[:i+1]) / (i + 1)):
                            detected.append(_make_pattern(WINNING_STREAK_OVERCONFIDENCE, 1, 1,
                                                          [f'After {streak} wins, next trade was {1.5:.0f}x larger than average']))
                            break
                else:
                    streak = 0

    # ── Positive: Improving Trend ──
    if len(sells) >= 6:
        mid = len(sells) // 2
        early_sells = sells[:mid]
        recent_sells = sells[mid:]
        early_win = sum(1 for s in early_sells if _is_winning_sell(s, buys)) / len(early_sells) * 100
        recent_win = sum(1 for s in recent_sells if _is_winning_sell(s, buys)) / len(recent_sells) * 100
        if recent_win > early_win + 10:
            detected.append(_make_pattern(IMPROVING_TREND, 1, 1,
                                          [f'Win rate improved from {early_win:.0f}% to {recent_win:.0f}%']))

    # ── Positive: Good Diversification ──
    if len(holdings) >= 5:
        max_pct = 0
        for h in holdings:
            val = float(h["shares"]) * float(h["avg_cost"])
            pct = (val / total_invested * 100) if total_invested > 0 else 0
            max_pct = max(max_pct, pct)
        if max_pct < 25:
            detected.append(_make_pattern(DIVERSIFICATION_GOOD, len(holdings), len(holdings),
                                          [f'{len(holdings)} positions, max concentration {max_pct:.0f}%']))

    return detected


def _make_pattern(pattern_id: str, occurrences: int, total: int, examples: list[str]) -> dict:
    meta = PATTERN_META[pattern_id]
    return {
        "id": pattern_id,
        "name": meta["name"],
        "icon": meta["icon"],
        "severity": meta["severity"],
        "description": meta["description"],
        "advice": meta["advice"],
        "occurrences": occurrences,
        "total": total,
        "frequency": round(occurrences / total * 100, 1) if total > 0 else 0,
        "examples": examples,
    }


def _avg_buy(buys: list[dict], symbol: str, before_dt) -> float:
    sym_buys = [b for b in buys if b["symbol"] == symbol and b["executed_at"] <= before_dt]
    if not sym_buys:
        return 0.0
    tc = sum(float(b["price"]) * float(b["shares"]) for b in sym_buys)
    ts = sum(float(b["shares"]) for b in sym_buys)
    return tc / ts if ts > 0 else 0.0


def _is_winning_sell(sell: dict, buys: list[dict]) -> bool:
    avg = _avg_buy(buys, sell["symbol"], sell["executed_at"])
    return avg > 0 and float(sell["price"]) > avg
