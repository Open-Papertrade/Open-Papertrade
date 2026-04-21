"""
Trade & portfolio analysis engine.
Examines individual trades and overall portfolio for coaching insights.
"""

from __future__ import annotations
from datetime import timedelta
from decimal import Decimal
from typing import Optional

import yfinance as yf
import pandas as pd


def analyze_trade(trade_dict: dict, all_trades: list[dict], holdings: list[dict]) -> dict:
    """
    Post-trade analysis for a single trade.
    Returns timing analysis, context, and what-if scenarios.
    """
    symbol = trade_dict["symbol"]
    trade_type = trade_dict["trade_type"]
    price = float(trade_dict["price"])
    shares = float(trade_dict["shares"])
    executed_at = trade_dict["executed_at"]  # datetime object

    result = {
        "symbol": symbol,
        "trade_type": trade_type,
        "price": price,
        "shares": shares,
        "executed_at": str(executed_at),
        "timing": {},
        "context": {},
        "whatIf": {},
        "verdict": "",
        "verdictScore": 0,  # -100 to +100
    }

    # ── 1. Timing Analysis — was this near the high/low of the day? ──
    try:
        date_str = executed_at.strftime("%Y-%m-%d")
        next_day = (executed_at + timedelta(days=1)).strftime("%Y-%m-%d")
        ticker = yf.Ticker(symbol)
        day_data = ticker.history(start=date_str, end=next_day, interval="1d")

        if not day_data.empty:
            day_high = float(day_data["High"].iloc[0])
            day_low = float(day_data["Low"].iloc[0])
            day_open = float(day_data["Open"].iloc[0])
            day_close = float(day_data["Close"].iloc[0])
            day_range = day_high - day_low if day_high != day_low else 1

            # Position within day's range (0 = low, 1 = high)
            range_position = (price - day_low) / day_range

            result["timing"] = {
                "dayHigh": round(day_high, 2),
                "dayLow": round(day_low, 2),
                "dayOpen": round(day_open, 2),
                "dayClose": round(day_close, 2),
                "rangePosition": round(range_position, 3),
                "rangePositionLabel": _range_label(range_position, trade_type),
            }

            # Timing score
            if trade_type == "BUY":
                # Lower is better for buys
                timing_score = int((1 - range_position) * 100) - 50
            else:
                # Higher is better for sells
                timing_score = int(range_position * 100) - 50
            result["verdictScore"] += timing_score // 2

    except Exception:
        pass

    # ── 2. Context — what happened after this trade? ──
    try:
        # Get 30 days of data after the trade
        end_date = (executed_at + timedelta(days=35)).strftime("%Y-%m-%d")
        start_date = executed_at.strftime("%Y-%m-%d")
        future_data = yf.Ticker(symbol).history(start=start_date, end=end_date, interval="1d")

        if len(future_data) > 1:
            closes = future_data["Close"].values
            entry_close = float(closes[0])

            # 1-day, 5-day, 10-day, 30-day performance after trade
            perf = {}
            for label, days in [("1d", 1), ("5d", 5), ("10d", 10), ("30d", min(len(closes) - 1, 30))]:
                if days < len(closes):
                    future_price = float(closes[days])
                    change_pct = ((future_price - entry_close) / entry_close) * 100
                    perf[label] = {
                        "price": round(future_price, 2),
                        "changePct": round(change_pct, 2),
                    }

            result["context"]["afterPerformance"] = perf

            # What-if: if they held (for sells) or if they waited (for buys)
            if trade_type == "SELL" and len(closes) > 5:
                max_after = float(max(closes[1:min(len(closes), 31)]))
                missed_upside = ((max_after - price) / price) * 100
                result["whatIf"]["heldLonger"] = {
                    "maxPriceAfter30d": round(max_after, 2),
                    "missedUpsidePct": round(missed_upside, 2),
                    "shouldHaveHeld": missed_upside > 5,
                }

            if trade_type == "BUY" and len(closes) > 5:
                min_after = float(min(closes[1:min(len(closes), 11)]))
                better_entry = ((price - min_after) / price) * 100
                result["whatIf"]["waitedForDip"] = {
                    "minPriceNext10d": round(min_after, 2),
                    "betterEntryPct": round(better_entry, 2),
                    "couldHaveSaved": better_entry > 2,
                }

    except Exception:
        pass

    # ── 3. P&L context for sells ──
    if trade_type == "SELL":
        # Calculate avg buy price from trade history
        buys = [t for t in all_trades if t["symbol"] == symbol and t["trade_type"] == "BUY"
                and t["executed_at"] <= executed_at]
        if buys:
            total_cost = sum(float(b["price"]) * float(b["shares"]) for b in buys)
            total_shares = sum(float(b["shares"]) for b in buys)
            avg_buy = total_cost / total_shares if total_shares > 0 else 0
            pnl = (price - avg_buy) * shares
            pnl_pct = ((price - avg_buy) / avg_buy * 100) if avg_buy > 0 else 0

            result["context"]["avgBuyPrice"] = round(avg_buy, 2)
            result["context"]["pnl"] = round(pnl, 2)
            result["context"]["pnlPercent"] = round(pnl_pct, 2)

            # Hold time
            first_buy = min(buys, key=lambda b: b["executed_at"])
            hold_days = (executed_at - first_buy["executed_at"]).days
            result["context"]["holdDays"] = hold_days

            if pnl > 0:
                result["verdictScore"] += 20
            elif pnl < 0:
                result["verdictScore"] -= 20

    # ── 4. Verdict ──
    score = max(-100, min(100, result["verdictScore"]))
    result["verdictScore"] = score
    if score >= 40:
        result["verdict"] = "EXCELLENT"
    elif score >= 15:
        result["verdict"] = "GOOD"
    elif score >= -15:
        result["verdict"] = "NEUTRAL"
    elif score >= -40:
        result["verdict"] = "POOR"
    else:
        result["verdict"] = "BAD"

    return result


def analyze_portfolio(user_trades: list[dict], holdings: list[dict], buying_power: float, initial_balance: float) -> dict:
    """
    Comprehensive portfolio analysis for coaching dashboard.
    """
    if not user_trades:
        return {"hasData": False, "message": "No trades yet. Make your first trade to get coached!"}

    total_trades = len(user_trades)
    buys = [t for t in user_trades if t["trade_type"] == "BUY"]
    sells = [t for t in user_trades if t["trade_type"] == "SELL"]

    # Portfolio value
    holdings_value = sum(float(h["shares"]) * float(h["avg_cost"]) for h in holdings)
    net_worth = buying_power + holdings_value
    total_return_pct = ((net_worth - initial_balance) / initial_balance * 100) if initial_balance > 0 else 0

    # Win rate
    winning_sells = 0
    total_realized_pnl = 0.0
    for sell in sells:
        avg_buy = _avg_buy_price(user_trades, sell["symbol"], sell["executed_at"])
        if avg_buy > 0:
            pnl = (float(sell["price"]) - avg_buy) * float(sell["shares"])
            total_realized_pnl += pnl
            if float(sell["price"]) > avg_buy:
                winning_sells += 1

    win_rate = (winning_sells / len(sells) * 100) if sells else 0

    # Trading frequency
    if total_trades >= 2:
        first_trade = min(t["executed_at"] for t in user_trades)
        last_trade = max(t["executed_at"] for t in user_trades)
        span_days = max((last_trade - first_trade).days, 1)
        trades_per_week = total_trades / span_days * 7
    else:
        trades_per_week = 0
        span_days = 0

    # Concentration analysis
    symbol_counts = {}
    symbol_values = {}
    for h in holdings:
        val = float(h["shares"]) * float(h["avg_cost"])
        symbol_values[h["symbol"]] = val
        symbol_counts[h["symbol"]] = float(h["shares"])

    total_invested = sum(symbol_values.values())
    concentration = {}
    if total_invested > 0:
        for sym, val in symbol_values.items():
            concentration[sym] = round(val / total_invested * 100, 1)

    max_concentration = max(concentration.values()) if concentration else 0
    top_holding = max(concentration, key=concentration.get) if concentration else None

    # Average hold time for sells
    hold_times = []
    for sell in sells:
        first_buy = next(
            (t for t in sorted(user_trades, key=lambda x: x["executed_at"])
             if t["symbol"] == sell["symbol"] and t["trade_type"] == "BUY"
             and t["executed_at"] < sell["executed_at"]),
            None
        )
        if first_buy:
            hold_times.append((sell["executed_at"] - first_buy["executed_at"]).days)

    avg_hold_days = sum(hold_times) / len(hold_times) if hold_times else 0

    # Average trade size
    avg_trade_size = sum(float(t["total"]) for t in user_trades) / total_trades if total_trades > 0 else 0

    return {
        "hasData": True,
        "summary": {
            "totalTrades": total_trades,
            "buys": len(buys),
            "sells": len(sells),
            "winRate": round(win_rate, 1),
            "totalReturnPct": round(total_return_pct, 2),
            "realizedPnl": round(total_realized_pnl, 2),
            "netWorth": round(net_worth, 2),
            "tradesPerWeek": round(trades_per_week, 1),
            "avgHoldDays": round(avg_hold_days, 1),
            "avgTradeSize": round(avg_trade_size, 2),
            "holdingsCount": len(holdings),
        },
        "concentration": {
            "breakdown": concentration,
            "maxPct": max_concentration,
            "topHolding": top_holding,
        },
        "tradingSpanDays": span_days,
    }


def _avg_buy_price(trades: list[dict], symbol: str, before_dt) -> float:
    buys = [t for t in trades if t["symbol"] == symbol and t["trade_type"] == "BUY" and t["executed_at"] <= before_dt]
    if not buys:
        return 0.0
    total_cost = sum(float(b["price"]) * float(b["shares"]) for b in buys)
    total_shares = sum(float(b["shares"]) for b in buys)
    return total_cost / total_shares if total_shares > 0 else 0.0


def _range_label(position: float, trade_type: str) -> str:
    if trade_type == "BUY":
        if position < 0.2:
            return "Near the day's low — great entry"
        elif position < 0.4:
            return "Lower half of range — decent entry"
        elif position < 0.6:
            return "Mid-range entry"
        elif position < 0.8:
            return "Upper half of range — could have been better"
        else:
            return "Near the day's high — poor timing"
    else:
        if position > 0.8:
            return "Near the day's high — great exit"
        elif position > 0.6:
            return "Upper half of range — decent exit"
        elif position > 0.4:
            return "Mid-range exit"
        elif position > 0.2:
            return "Lower half of range — left money on the table"
        else:
            return "Near the day's low — poor timing"
