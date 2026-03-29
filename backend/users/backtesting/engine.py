"""
Backtesting engine — simulates strategy execution bar-by-bar on OHLCV data.
Uses pandas for vectorised indicator computation, then iterates for trade logic.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field, asdict
from typing import Optional

import numpy as np
import pandas as pd
import yfinance as yf

from .indicators import compute_indicator


# ── Data classes ─────────────────────────────────────────────────

@dataclass
class TradeEntry:
    entry_date: str = ""
    exit_date: str = ""
    entry_price: float = 0.0
    exit_price: float = 0.0
    shares: int = 0
    pnl: float = 0.0
    pnl_percent: float = 0.0
    direction: str = "LONG"
    exit_reason: str = "SIGNAL"  # SIGNAL | STOP_LOSS | TAKE_PROFIT | END_OF_DATA
    holding_bars: int = 0


@dataclass
class Position:
    direction: str = "LONG"
    entry_bar: int = 0
    entry_price: float = 0.0
    shares: int = 0
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    trailing_stop: Optional[float] = None
    trailing_extreme: Optional[float] = None


# ── Main entry point ─────────────────────────────────────────────

def run_backtest(
    strategy_config: dict,
    symbol: str,
    start_date: str,
    end_date: str,
    initial_capital: float = 100_000,
) -> dict:
    """
    Run a full backtest and return results dict.

    Parameters
    ----------
    strategy_config : dict   – parsed strategy JSON (indicators, conditions, sizing, etc.)
    symbol          : str    – ticker symbol (e.g. "AAPL", "RELIANCE.NS", "BTC-USD")
    start_date      : str    – "YYYY-MM-DD"
    end_date        : str    – "YYYY-MM-DD"
    initial_capital : float  – starting cash

    Returns
    -------
    dict with keys: equity_curve, trades, statistics, monthly_returns, indicator_data, price_data
    """

    # 1. Fetch historical OHLCV ------------------------------------------------
    df = _fetch_data(symbol, start_date, end_date)
    if df is None or len(df) < 10:
        return {"error": f"Insufficient data for {symbol} ({len(df) if df is not None else 0} bars)"}

    # 2. Compute indicators ----------------------------------------------------
    indicator_series: dict[str, pd.Series] = {}
    for ind_cfg in strategy_config.get("indicators", []):
        computed = compute_indicator(ind_cfg, df)
        indicator_series.update(computed)

    # Also expose price columns as indicator keys
    indicator_series["PRICE"] = df["close"]
    indicator_series["OPEN"] = df["open"]
    indicator_series["HIGH"] = df["high"]
    indicator_series["LOW"] = df["low"]
    indicator_series["VOLUME"] = df["volume"]

    # 3. Simulate bar-by-bar ---------------------------------------------------
    cash = initial_capital
    position: Optional[Position] = None
    trades: list[TradeEntry] = []
    equity_curve: list[dict] = []
    peak_equity = initial_capital
    cooldown_until = -1

    dates = df.index.tolist()
    closes = df["close"].values
    highs = df["high"].values
    lows = df["low"].values

    entry_cond = strategy_config.get("entryConditions", {})
    exit_cond = strategy_config.get("exitConditions", {})
    sizing_cfg = strategy_config.get("positionSizing", {"method": "PERCENT_PORTFOLIO", "value": 10})
    sl_cfg = strategy_config.get("stopLoss")
    tp_cfg = strategy_config.get("takeProfit")
    direction_pref = strategy_config.get("tradeDirection", "LONG")
    cooldown_bars = strategy_config.get("cooldownBars", 0)

    n = len(df)

    for i in range(n):
        price = closes[i]
        equity = cash + (position.shares * price if position and position.direction == "LONG" else 0)
        if position and position.direction == "SHORT":
            equity = cash + position.shares * (2 * position.entry_price - price)

        if equity > peak_equity:
            peak_equity = equity
        dd = peak_equity - equity
        dd_pct = (dd / peak_equity * 100) if peak_equity > 0 else 0.0

        equity_curve.append({
            "date": str(dates[i])[:10],
            "equity": round(equity, 2),
            "drawdown": round(dd, 2),
            "drawdownPercent": round(dd_pct, 4),
        })

        # ── Check stop-loss / take-profit ──
        if position:
            exit_info = _check_sl_tp(position, highs[i], lows[i])
            if exit_info:
                trade = _close_position(position, exit_info["price"], dates[i], i, exit_info["reason"], dates)
                cash += _realise_cash(position, exit_info["price"])
                trades.append(trade)
                position = None
                cooldown_until = i + cooldown_bars
                continue

            # Update trailing stop
            if position.trailing_stop is not None:
                if position.direction == "LONG" and highs[i] > (position.trailing_extreme or 0):
                    position.trailing_extreme = highs[i]
                    position.trailing_stop = highs[i] * (1 - (sl_cfg["value"] / 100 if sl_cfg else 0.05))
                elif position.direction == "SHORT" and lows[i] < (position.trailing_extreme or float("inf")):
                    position.trailing_extreme = lows[i]
                    position.trailing_stop = lows[i] * (1 + (sl_cfg["value"] / 100 if sl_cfg else 0.05))

            # ── Check exit signal ──
            if _evaluate_conditions(exit_cond, indicator_series, i):
                trade = _close_position(position, price, dates[i], i, "SIGNAL", dates)
                cash += _realise_cash(position, price)
                trades.append(trade)
                position = None
                cooldown_until = i + cooldown_bars
                continue

        # ── Check entry signal ──
        if position is None and i > cooldown_until and i < n - 1:
            if _evaluate_conditions(entry_cond, indicator_series, i):
                direction = direction_pref if direction_pref != "BOTH" else "LONG"
                shares = _calc_shares(sizing_cfg, cash, price, trades)
                if shares > 0 and shares * price <= cash:
                    cash -= shares * price
                    position = Position(
                        direction=direction,
                        entry_bar=i,
                        entry_price=price,
                        shares=shares,
                    )
                    _apply_exit_levels(position, sl_cfg, tp_cfg)

    # Close remaining position
    if position:
        trade = _close_position(position, closes[-1], dates[-1], n - 1, "END_OF_DATA", dates)
        cash += _realise_cash(position, closes[-1])
        trades.append(trade)

    # 4. Compute statistics ----------------------------------------------------
    statistics = _compute_statistics(trades, equity_curve, initial_capital, n)
    monthly_returns = _compute_monthly_returns(equity_curve)

    # 5. Format indicator data for charts --------------------------------------
    indicator_data = {}
    skip = {"PRICE", "OPEN", "HIGH", "LOW", "VOLUME"}
    for key, series in indicator_series.items():
        if key in skip:
            continue
        vals = []
        for idx_val, val in zip(dates, series.values):
            if not (np.isnan(val) if isinstance(val, float) else pd.isna(val)):
                vals.append({"date": str(idx_val)[:10], "value": round(float(val), 6)})
        indicator_data[key] = vals

    price_data = [
        {"date": str(d)[:10], "open": round(float(o), 2), "high": round(float(h), 2),
         "low": round(float(l), 2), "close": round(float(c), 2), "volume": int(v)}
        for d, o, h, l, c, v in zip(
            dates, df["open"].values, df["high"].values, df["low"].values,
            df["close"].values, df["volume"].values
        )
    ]

    return {
        "equityCurve": equity_curve,
        "trades": [asdict(t) for t in trades],
        "statistics": statistics,
        "monthlyReturns": monthly_returns,
        "indicatorData": indicator_data,
        "priceData": price_data,
    }


# ── Data fetching ────────────────────────────────────────────────

def _fetch_data(symbol: str, start: str, end: str) -> Optional[pd.DataFrame]:
    try:
        ticker = yf.Ticker(symbol)
        df = ticker.history(start=start, end=end, interval="1d")
        if df is None or df.empty:
            return None
        df.columns = [c.lower() for c in df.columns]
        df = df[["open", "high", "low", "close", "volume"]].dropna(subset=["close"])
        return df
    except Exception:
        return None


# ── Condition evaluation ─────────────────────────────────────────

def _evaluate_conditions(group: dict, indicators: dict[str, pd.Series], bar: int) -> bool:
    rules = group.get("rules", [])
    if not rules:
        return False

    logic = group.get("logic", "AND")
    results = [_eval_rule(r, indicators, bar) for r in rules]

    return all(results) if logic == "AND" else any(results)


def _eval_rule(rule: dict, indicators: dict[str, pd.Series], bar: int) -> bool:
    left_key = rule.get("leftOperand", "PRICE")
    left_series = indicators.get(left_key)
    if left_series is None or bar >= len(left_series):
        return False

    left_val = float(left_series.iloc[bar])
    if np.isnan(left_val):
        return False

    left_prev = float(left_series.iloc[bar - 1]) if bar > 0 else np.nan

    # Right side
    right_type = rule.get("rightType", "NUMBER")
    right_raw = rule.get("rightValue", 0)

    if right_type == "NUMBER":
        right_val = float(right_raw)
        right_prev = right_val
    else:
        right_key = "PRICE" if right_type == "PRICE" else str(right_raw)
        right_series = indicators.get(right_key)
        if right_series is None or bar >= len(right_series):
            return False
        right_val = float(right_series.iloc[bar])
        right_prev = float(right_series.iloc[bar - 1]) if bar > 0 else np.nan
        if np.isnan(right_val):
            return False

    op = rule.get("operator", "GREATER_THAN")
    if op == "LESS_THAN":
        return left_val < right_val
    elif op == "GREATER_THAN":
        return left_val > right_val
    elif op == "LESS_EQUAL":
        return left_val <= right_val
    elif op == "GREATER_EQUAL":
        return left_val >= right_val
    elif op == "EQUALS":
        return abs(left_val - right_val) < 0.0001
    elif op == "CROSSES_ABOVE":
        return not np.isnan(left_prev) and not np.isnan(right_prev) and left_prev <= right_prev and left_val > right_val
    elif op == "CROSSES_BELOW":
        return not np.isnan(left_prev) and not np.isnan(right_prev) and left_prev >= right_prev and left_val < right_val
    return False


# ── Position helpers ─────────────────────────────────────────────

def _calc_shares(cfg: dict, cash: float, price: float, past_trades: list[TradeEntry]) -> int:
    method = cfg.get("method", "PERCENT_PORTFOLIO")
    value = cfg.get("value", 10)

    if method == "FIXED_AMOUNT":
        amount = min(value, cash)
    elif method == "PERCENT_PORTFOLIO":
        amount = cash * (value / 100)
    elif method == "PERCENT_RISK":
        amount = min(cash * (value / 100) / 0.05, cash)  # assume 5% SL if not set
    elif method == "KELLY_CRITERION":
        if len(past_trades) < 5:
            amount = cash * 0.1
        else:
            wins = [t for t in past_trades if t.pnl > 0]
            losses = [t for t in past_trades if t.pnl <= 0]
            wr = len(wins) / len(past_trades)
            avg_w = np.mean([t.pnl_percent for t in wins]) if wins else 0
            avg_l = np.mean([abs(t.pnl_percent) for t in losses]) if losses else 1
            kelly = wr - (1 - wr) / (avg_w / avg_l) if avg_l > 0 else 0
            half_kelly = max(0, min(kelly * 0.5, 0.25))
            amount = cash * half_kelly
    else:
        amount = cash * 0.1

    return int(amount / price) if price > 0 else 0


def _apply_exit_levels(pos: Position, sl_cfg: Optional[dict], tp_cfg: Optional[dict]):
    if sl_cfg:
        sl_type = sl_cfg.get("type", "PERCENT")
        sl_val = sl_cfg.get("value", 5)
        if sl_type == "PERCENT":
            pos.stop_loss = pos.entry_price * (1 - sl_val / 100) if pos.direction == "LONG" else pos.entry_price * (1 + sl_val / 100)
        elif sl_type == "TRAILING_PERCENT":
            pos.trailing_stop = pos.entry_price * (1 - sl_val / 100) if pos.direction == "LONG" else pos.entry_price * (1 + sl_val / 100)
            pos.trailing_extreme = pos.entry_price
        elif sl_type == "FIXED_PRICE":
            pos.stop_loss = sl_val

    if tp_cfg:
        tp_type = tp_cfg.get("type", "PERCENT")
        tp_val = tp_cfg.get("value", 15)
        if tp_type == "PERCENT":
            pos.take_profit = pos.entry_price * (1 + tp_val / 100) if pos.direction == "LONG" else pos.entry_price * (1 - tp_val / 100)
        elif tp_type == "RISK_REWARD_RATIO" and pos.stop_loss:
            risk = abs(pos.entry_price - pos.stop_loss)
            pos.take_profit = pos.entry_price + risk * tp_val if pos.direction == "LONG" else pos.entry_price - risk * tp_val
        elif tp_type == "FIXED_PRICE":
            pos.take_profit = tp_val


def _check_sl_tp(pos: Position, high: float, low: float) -> Optional[dict]:
    effective_stop = pos.trailing_stop if pos.trailing_stop is not None else pos.stop_loss
    if pos.direction == "LONG":
        if effective_stop and low <= effective_stop:
            return {"price": effective_stop, "reason": "STOP_LOSS"}
        if pos.take_profit and high >= pos.take_profit:
            return {"price": pos.take_profit, "reason": "TAKE_PROFIT"}
    else:
        if effective_stop and high >= effective_stop:
            return {"price": effective_stop, "reason": "STOP_LOSS"}
        if pos.take_profit and low <= pos.take_profit:
            return {"price": pos.take_profit, "reason": "TAKE_PROFIT"}
    return None


def _realise_cash(pos: Position, exit_price: float) -> float:
    if pos.direction == "LONG":
        return pos.shares * exit_price
    else:
        return pos.shares * (2 * pos.entry_price - exit_price)


def _close_position(pos: Position, exit_price: float, exit_date, exit_bar: int, reason: str, dates) -> TradeEntry:
    pnl = (exit_price - pos.entry_price) * pos.shares if pos.direction == "LONG" else (pos.entry_price - exit_price) * pos.shares
    pnl_pct = (pnl / (pos.entry_price * pos.shares) * 100) if pos.entry_price * pos.shares > 0 else 0
    entry_date = str(dates[pos.entry_bar])[:10] if pos.entry_bar < len(dates) else ""
    return TradeEntry(
        entry_date=entry_date,
        exit_date=str(exit_date)[:10],
        entry_price=round(pos.entry_price, 2),
        exit_price=round(exit_price, 2),
        shares=pos.shares,
        pnl=round(pnl, 2),
        pnl_percent=round(pnl_pct, 2),
        direction=pos.direction,
        exit_reason=reason,
        holding_bars=exit_bar - pos.entry_bar,
    )


# ── Statistics ───────────────────────────────────────────────────

def _compute_statistics(trades: list[TradeEntry], equity_curve: list[dict], initial_capital: float, n_bars: int) -> dict:
    final = equity_curve[-1]["equity"] if equity_curve else initial_capital
    total_return = final - initial_capital
    total_return_pct = (total_return / initial_capital * 100) if initial_capital > 0 else 0

    years = n_bars / 252
    cagr = ((final / initial_capital) ** (1 / years) - 1) * 100 if years > 0 and initial_capital > 0 else 0

    # Sharpe / Sortino
    equities = [e["equity"] for e in equity_curve]
    if len(equities) > 1:
        daily_ret = np.diff(equities) / np.array(equities[:-1])
        avg_r = np.mean(daily_ret)
        std_r = np.std(daily_ret, ddof=1) if len(daily_ret) > 1 else 0
        sharpe = (avg_r / std_r * math.sqrt(252)) if std_r > 0 else 0
        neg_ret = daily_ret[daily_ret < 0]
        ds = np.sqrt(np.mean(neg_ret ** 2)) if len(neg_ret) > 0 else 0
        sortino = (avg_r / ds * math.sqrt(252)) if ds > 0 else 0
    else:
        sharpe = sortino = 0

    max_dd = max((e["drawdown"] for e in equity_curve), default=0)
    max_dd_pct = max((e["drawdownPercent"] for e in equity_curve), default=0)

    wins = [t for t in trades if t.pnl > 0]
    losses = [t for t in trades if t.pnl <= 0]
    win_rate = (len(wins) / len(trades) * 100) if trades else 0
    total_wins = sum(t.pnl for t in wins)
    total_losses = abs(sum(t.pnl for t in losses))
    pf = (total_wins / total_losses) if total_losses > 0 else (float("inf") if total_wins > 0 else 0)

    avg_win = (total_wins / len(wins)) if wins else 0
    avg_loss = (total_losses / len(losses)) if losses else 0
    avg_win_pct = (sum(t.pnl_percent for t in wins) / len(wins)) if wins else 0
    avg_loss_pct = (abs(sum(t.pnl_percent for t in losses)) / len(losses)) if losses else 0
    avg_hold = (sum(t.holding_bars for t in trades) / len(trades)) if trades else 0
    largest_win = max((t.pnl for t in wins), default=0)
    largest_loss = max((abs(t.pnl) for t in losses), default=0)

    max_cw = max_cl = cw = cl = 0
    for t in trades:
        if t.pnl > 0:
            cw += 1; cl = 0; max_cw = max(max_cw, cw)
        else:
            cl += 1; cw = 0; max_cl = max(max_cl, cl)

    bars_in = sum(t.holding_bars for t in trades)
    exposure = (bars_in / n_bars * 100) if n_bars > 0 else 0

    # Buy & hold
    if equity_curve and len(equity_curve) > 1:
        first_close = equity_curve[0]["equity"]  # approximate with equity at bar 0
    else:
        first_close = initial_capital

    return {
        "totalReturn": round(total_return, 2),
        "totalReturnPercent": round(total_return_pct, 2),
        "cagr": round(cagr, 2),
        "sharpeRatio": round(sharpe, 2),
        "sortinoRatio": round(sortino, 2),
        "maxDrawdown": round(max_dd, 2),
        "maxDrawdownPercent": round(max_dd_pct, 2),
        "winRate": round(win_rate, 2),
        "profitFactor": round(pf, 2) if pf != float("inf") else 9999,
        "totalTrades": len(trades),
        "winningTrades": len(wins),
        "losingTrades": len(losses),
        "avgWin": round(avg_win, 2),
        "avgLoss": round(avg_loss, 2),
        "avgWinPercent": round(avg_win_pct, 2),
        "avgLossPercent": round(avg_loss_pct, 2),
        "avgHoldingBars": round(avg_hold, 1),
        "largestWin": round(largest_win, 2),
        "largestLoss": round(largest_loss, 2),
        "consecutiveWins": max_cw,
        "consecutiveLosses": max_cl,
        "exposurePercent": round(exposure, 1),
        "buyAndHoldReturn": 0,
        "buyAndHoldReturnPercent": 0,
    }


def _compute_monthly_returns(equity_curve: list[dict]) -> list[dict]:
    if not equity_curve:
        return []
    months: dict[str, dict] = {}
    for pt in equity_curve:
        key = pt["date"][:7]
        entry = months.get(key)
        if not entry:
            months[key] = {"start": pt["equity"], "end": pt["equity"]}
        else:
            entry["end"] = pt["equity"]

    results = []
    prev_end = equity_curve[0]["equity"]
    for key, data in months.items():
        year, month = key.split("-")
        ret = ((data["end"] - prev_end) / prev_end * 100) if prev_end > 0 else 0
        results.append({"year": int(year), "month": int(month), "returnPercent": round(ret, 2)})
        prev_end = data["end"]
    return results
