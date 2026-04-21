"""
Personalized tip generation based on analysis results.
Returns actionable, context-aware tips ranked by priority.
"""

from __future__ import annotations


def generate_tips(portfolio_analysis: dict, patterns: list[dict], scores: dict) -> list[dict]:
    """
    Generate ranked, personalized trading tips.
    Each tip has: id, priority (1-5), title, body, category.
    """
    tips = []

    if not portfolio_analysis.get("hasData"):
        return [_tip("first_trade", 1, "Make Your First Trade",
                      "Start by buying a stock you've researched. Even a small position will begin building your trading history and unlock coaching insights.",
                      "getting_started")]

    summary = portfolio_analysis.get("summary", {})
    concentration = portfolio_analysis.get("concentration", {})
    score_data = scores if scores.get("hasData") else {}
    score_values = score_data.get("scores", {})

    # ── Priority 1: Critical issues ──

    # No sells yet
    if summary.get("sells", 0) == 0 and summary.get("buys", 0) > 0:
        tips.append(_tip("learn_to_sell", 1, "Learn to Take Profits",
                         f'You have {summary["buys"]} buy(s) but no sells. Knowing when to exit is just as important as knowing when to enter. '
                         f'Set a profit target and a stop-loss for each position.',
                         "risk"))

    # Very low win rate
    if summary.get("winRate", 0) < 30 and summary.get("sells", 0) >= 5:
        tips.append(_tip("low_win_rate", 1, "Your Win Rate Needs Attention",
                         f'Only {summary["winRate"]:.0f}% of your sells are profitable. Consider: '
                         f'(1) Being more selective with entries, (2) Setting wider stop-losses, (3) Holding winners longer.',
                         "performance"))

    # Danger patterns
    for p in patterns:
        if p["severity"] == "danger":
            tips.append(_tip(f'pattern_{p["id"]}', 1, f'Address: {p["name"]}',
                             p["advice"], "behavior"))

    # ── Priority 2: Important improvements ──

    # High concentration
    if concentration.get("maxPct", 0) > 40:
        sym = concentration.get("topHolding", "?")
        pct = concentration["maxPct"]
        tips.append(_tip("reduce_concentration", 2, f'Reduce {sym} Concentration',
                         f'{sym} is {pct:.0f}% of your portfolio. If something goes wrong with this one stock, '
                         f'your entire portfolio takes a hit. Consider trimming to below 20%.',
                         "risk"))

    # Low diversification score
    if score_values.get("diversification", {}).get("score", 100) < 40:
        tips.append(_tip("diversify", 2, "Diversify Your Portfolio",
                         f'You only hold {summary.get("holdingsCount", 0)} position(s). '
                         f'Spread your capital across 5-10 stocks in different sectors to reduce risk.',
                         "risk"))

    # Low risk management score
    if score_values.get("riskManagement", {}).get("score", 100) < 40:
        tips.append(_tip("risk_mgmt", 2, "Improve Risk Management",
                         "Your risk management score is low. Key steps: (1) Never risk more than 5% of portfolio on one trade, "
                         "(2) Always set a stop-loss before entering, (3) Keep 10-20% in cash for opportunities.",
                         "risk"))

    # Warning patterns
    for p in patterns:
        if p["severity"] == "warning" and p["id"] not in ["concentration_risk"]:
            tips.append(_tip(f'pattern_{p["id"]}', 2, f'Watch Out: {p["name"]}',
                             p["advice"], "behavior"))

    # ── Priority 3: Growth opportunities ──

    # Overtrading
    if summary.get("tradesPerWeek", 0) > 15:
        tips.append(_tip("slow_down", 3, "Slow Down Your Trading",
                         f'You\'re averaging {summary["tradesPerWeek"]:.0f} trades/week. Research shows that less frequent, '
                         f'more deliberate trading tends to outperform hyperactive trading. Try limiting to 3-5 trades per week.',
                         "discipline"))

    # Very short hold times
    if summary.get("avgHoldDays", 0) < 2 and summary.get("sells", 0) >= 3:
        tips.append(_tip("hold_longer", 3, "Consider Holding Longer",
                         f'Your average hold time is only {summary["avgHoldDays"]:.1f} days. '
                         f'Most stock movements take time. Try setting a minimum hold period of 3-5 days.',
                         "timing"))

    # Good performance but could improve timing
    if score_values.get("performance", {}).get("score", 0) > 60 and score_values.get("timing", {}).get("score", 0) < 50:
        tips.append(_tip("better_entries", 3, "Your Results Are Good — Timing Could Be Better",
                         "You're making money, but your entry/exit timing has room for improvement. "
                         "Consider using limit orders and waiting for pullbacks instead of buying at market.",
                         "timing"))

    # ── Priority 4: Refinements ──

    # Positive reinforcement
    for p in patterns:
        if p["severity"] == "positive":
            tips.append(_tip(f'positive_{p["id"]}', 4, f'Keep It Up: {p["name"]}',
                             p["advice"], "positive"))

    # High overall score
    if score_data.get("overall", 0) >= 75:
        tips.append(_tip("doing_great", 4, "You're Trading Well",
                         f'Your overall score is {score_data["overall"]:.0f}/100 ({score_data.get("grade", "?")}). '
                         f'Focus on consistency — keep doing what works and avoid big bets that could undo your progress.',
                         "positive"))

    # ── Priority 5: Educational ──

    if summary.get("totalTrades", 0) < 10:
        tips.append(_tip("keep_learning", 5, "Build Your Track Record",
                         f'You have {summary["totalTrades"]} trades so far. The coaching engine gets smarter with more data. '
                         f'Keep trading, and more detailed patterns and insights will emerge.',
                         "education"))

    if summary.get("sells", 0) >= 3 and not any(t["id"] == "review_trades" for t in tips):
        tips.append(_tip("review_trades", 5, "Review Your Past Trades",
                         "Use the trade review feature to analyze your entries and exits. "
                         "Understanding why trades worked (or didn't) is the fastest path to improvement.",
                         "education"))

    # Sort by priority, deduplicate
    seen = set()
    unique_tips = []
    for t in sorted(tips, key=lambda x: x["priority"]):
        if t["id"] not in seen:
            seen.add(t["id"])
            unique_tips.append(t)

    return unique_tips[:12]  # max 12 tips


def _tip(tip_id: str, priority: int, title: str, body: str, category: str) -> dict:
    return {
        "id": tip_id,
        "priority": priority,
        "title": title,
        "body": body,
        "category": category,
    }
