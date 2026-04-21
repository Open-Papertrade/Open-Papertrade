"""
Trading behavior scoring across 5 dimensions.
Produces a radar-chart-friendly score object.
"""

from __future__ import annotations
import math
from collections import defaultdict


def compute_trading_score(trades: list[dict], holdings: list[dict], patterns: list[dict],
                          buying_power: float, initial_balance: float) -> dict:
    """
    Score user across 5 dimensions (0-100 each):
    - Risk Management
    - Timing
    - Discipline
    - Diversification
    - Performance

    Returns dict with scores, overall grade, and reasoning.
    """
    if len(trades) < 3:
        return {
            "hasData": False,
            "message": "Need at least 3 trades for scoring.",
        }

    buys = [t for t in trades if t["trade_type"] == "BUY"]
    sells = [t for t in trades if t["trade_type"] == "SELL"]
    sorted_trades = sorted(trades, key=lambda t: t["executed_at"])

    risk = _score_risk_management(trades, holdings, patterns, buying_power, initial_balance)
    timing = _score_timing(sells, buys)
    discipline = _score_discipline(sorted_trades, patterns)
    diversification = _score_diversification(holdings, patterns)
    performance = _score_performance(sells, buys, buying_power, initial_balance, holdings)

    scores = {
        "riskManagement": risk,
        "timing": timing,
        "discipline": discipline,
        "diversification": diversification,
        "performance": performance,
    }

    overall = sum(s["score"] for s in scores.values()) / 5
    grade = _grade(overall)

    return {
        "hasData": True,
        "scores": scores,
        "overall": round(overall, 1),
        "grade": grade,
    }


def _score_risk_management(trades, holdings, patterns, buying_power, initial_balance) -> dict:
    score = 70  # start at C+
    reasons = []

    # Position sizing consistency
    if len(trades) >= 5:
        sizes = [float(t["total"]) for t in trades]
        avg = sum(sizes) / len(sizes)
        cv = (sum((s - avg) ** 2 for s in sizes) / len(sizes)) ** 0.5 / avg if avg > 0 else 0
        if cv < 0.3:
            score += 15
            reasons.append("Consistent position sizing")
        elif cv > 0.8:
            score -= 15
            reasons.append("Highly inconsistent position sizes")

    # Cash reserve
    total_invested = sum(float(h["shares"]) * float(h["avg_cost"]) for h in holdings)
    net_worth = buying_power + total_invested
    cash_pct = (buying_power / net_worth * 100) if net_worth > 0 else 100
    if cash_pct > 15:
        score += 10
        reasons.append(f"Healthy cash reserve ({cash_pct:.0f}%)")
    elif cash_pct < 5:
        score -= 10
        reasons.append(f"Very low cash ({cash_pct:.0f}%) — vulnerable to opportunities")

    # Concentration penalty
    has_concentration = any(p["id"] == "concentration_risk" for p in patterns)
    if has_concentration:
        score -= 15
        reasons.append("Excessive concentration in single stock")

    # Pattern penalties
    danger_patterns = [p for p in patterns if p["severity"] == "danger"]
    score -= len(danger_patterns) * 10

    return {"score": _clamp(score), "reasons": reasons}


def _score_timing(sells, buys) -> dict:
    score = 50
    reasons = []

    if not sells:
        return {"score": 50, "reasons": ["Not enough sells to evaluate timing"]}

    # Win rate impact
    winning = 0
    total_win_pct = 0
    total_loss_pct = 0
    for sell in sells:
        avg_buy = _avg_buy(buys, sell["symbol"], sell["executed_at"])
        if avg_buy > 0:
            pnl_pct = (float(sell["price"]) - avg_buy) / avg_buy * 100
            if pnl_pct > 0:
                winning += 1
                total_win_pct += pnl_pct
            else:
                total_loss_pct += abs(pnl_pct)

    win_rate = winning / len(sells) * 100 if sells else 0

    if win_rate >= 60:
        score += 25
        reasons.append(f"Strong {win_rate:.0f}% win rate")
    elif win_rate >= 50:
        score += 10
        reasons.append(f"Decent {win_rate:.0f}% win rate")
    elif win_rate < 40:
        score -= 15
        reasons.append(f"Low {win_rate:.0f}% win rate — entry timing needs work")

    # Win/loss ratio
    avg_win = total_win_pct / winning if winning > 0 else 0
    avg_loss = total_loss_pct / (len(sells) - winning) if (len(sells) - winning) > 0 else 0
    if avg_win > 0 and avg_loss > 0:
        ratio = avg_win / avg_loss
        if ratio > 2:
            score += 15
            reasons.append(f"Excellent {ratio:.1f}x win/loss ratio")
        elif ratio > 1:
            score += 5
        elif ratio < 0.5:
            score -= 15
            reasons.append(f"Poor {ratio:.1f}x win/loss ratio — losses are bigger than wins")

    return {"score": _clamp(score), "reasons": reasons}


def _score_discipline(sorted_trades, patterns) -> dict:
    score = 65
    reasons = []

    # Pattern-based deductions
    bad_patterns = {"panic_selling", "revenge_trading", "overtrading", "fomo_buying", "winning_streak_overconfidence"}
    for p in patterns:
        if p["id"] in bad_patterns:
            score -= 10
            reasons.append(f"Detected: {p['name']}")

    # Positive patterns
    good_patterns = {"improving_trend", "diversification_good"}
    for p in patterns:
        if p["id"] in good_patterns:
            score += 10
            reasons.append(f"{p['name']}")

    # Trading frequency regularity
    if len(sorted_trades) >= 5:
        gaps = []
        for i in range(1, len(sorted_trades)):
            gap = (sorted_trades[i]["executed_at"] - sorted_trades[i - 1]["executed_at"]).total_seconds() / 3600
            gaps.append(gap)
        avg_gap = sum(gaps) / len(gaps) if gaps else 0
        if avg_gap > 0:
            cv = (sum((g - avg_gap) ** 2 for g in gaps) / len(gaps)) ** 0.5 / avg_gap
            if cv < 0.5:
                score += 10
                reasons.append("Consistent trading rhythm")
            elif cv > 2:
                score -= 5
                reasons.append("Erratic trading frequency")

    return {"score": _clamp(score), "reasons": reasons}


def _score_diversification(holdings, patterns) -> dict:
    score = 50
    reasons = []

    n = len(holdings)
    if n == 0:
        return {"score": 50, "reasons": ["No holdings to evaluate"]}

    if n >= 8:
        score += 25
        reasons.append(f"Well-diversified with {n} positions")
    elif n >= 5:
        score += 15
        reasons.append(f"Decent diversification with {n} positions")
    elif n >= 3:
        score += 5
        reasons.append(f"Moderate diversification with {n} positions")
    else:
        score -= 10
        reasons.append(f"Only {n} position(s) — too concentrated")

    # Check max concentration
    total_val = sum(float(h["shares"]) * float(h["avg_cost"]) for h in holdings)
    if total_val > 0:
        max_pct = max(float(h["shares"]) * float(h["avg_cost"]) / total_val * 100 for h in holdings)
        if max_pct < 20:
            score += 15
            reasons.append(f"Largest position is only {max_pct:.0f}%")
        elif max_pct > 50:
            score -= 20
            reasons.append(f"Largest position is {max_pct:.0f}% — very risky")
        elif max_pct > 30:
            score -= 10

    # Check if all same sector (simplified: check symbol diversity)
    symbols = set(h["symbol"] for h in holdings)
    if len(symbols) > 1:
        score += 5

    return {"score": _clamp(score), "reasons": reasons}


def _score_performance(sells, buys, buying_power, initial_balance, holdings) -> dict:
    score = 50
    reasons = []

    # Portfolio return
    holdings_val = sum(float(h["shares"]) * float(h["avg_cost"]) for h in holdings)
    net_worth = buying_power + holdings_val
    return_pct = ((net_worth - initial_balance) / initial_balance * 100) if initial_balance > 0 else 0

    if return_pct > 20:
        score += 30
        reasons.append(f"Excellent {return_pct:.1f}% total return")
    elif return_pct > 10:
        score += 20
        reasons.append(f"Strong {return_pct:.1f}% return")
    elif return_pct > 0:
        score += 10
        reasons.append(f"Positive {return_pct:.1f}% return")
    elif return_pct > -5:
        score -= 5
        reasons.append(f"Slightly negative {return_pct:.1f}% return")
    else:
        score -= 20
        reasons.append(f"Negative {return_pct:.1f}% return — review your strategy")

    # Realized P&L
    realized = 0
    for sell in sells:
        avg = _avg_buy(buys, sell["symbol"], sell["executed_at"])
        if avg > 0:
            realized += (float(sell["price"]) - avg) * float(sell["shares"])

    if realized > 0:
        score += 10
        reasons.append(f"Positive realized P&L: ${realized:,.0f}")
    elif realized < -1000:
        score -= 10

    return {"score": _clamp(score), "reasons": reasons}


def _avg_buy(buys, symbol, before_dt) -> float:
    sym_buys = [b for b in buys if b["symbol"] == symbol and b["executed_at"] <= before_dt]
    if not sym_buys:
        return 0.0
    tc = sum(float(b["price"]) * float(b["shares"]) for b in sym_buys)
    ts = sum(float(b["shares"]) for b in sym_buys)
    return tc / ts if ts > 0 else 0.0


def _clamp(score: float) -> int:
    return max(0, min(100, int(score)))


def _grade(score: float) -> str:
    if score >= 90:
        return "A+"
    elif score >= 80:
        return "A"
    elif score >= 70:
        return "B"
    elif score >= 60:
        return "C"
    elif score >= 50:
        return "D"
    else:
        return "F"
