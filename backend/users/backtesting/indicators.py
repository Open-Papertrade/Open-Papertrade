"""
Technical indicators computed with pandas/numpy for backtesting.
"""

import numpy as np
import pandas as pd


def compute_rsi(series: pd.Series, period: int = 14) -> pd.Series:
    """Wilder's RSI."""
    delta = series.diff()
    gain = delta.where(delta > 0, 0.0)
    loss = (-delta).where(delta < 0, 0.0)
    avg_gain = gain.ewm(alpha=1 / period, min_periods=period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1 / period, min_periods=period, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    return (100 - 100 / (1 + rs)).fillna(np.nan)


def compute_sma(series: pd.Series, period: int) -> pd.Series:
    return series.rolling(window=period).mean()


def compute_ema(series: pd.Series, period: int) -> pd.Series:
    return series.ewm(span=period, adjust=False).mean()


def compute_macd(series: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9) -> dict[str, pd.Series]:
    ema_fast = compute_ema(series, fast)
    ema_slow = compute_ema(series, slow)
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    histogram = macd_line - signal_line
    return {"MACD_LINE": macd_line, "MACD_SIGNAL": signal_line, "MACD_HIST": histogram}


def compute_bollinger(series: pd.Series, period: int = 20, std_dev: float = 2.0) -> dict[str, pd.Series]:
    middle = compute_sma(series, period)
    sd = series.rolling(window=period).std()
    upper = middle + std_dev * sd
    lower = middle - std_dev * sd
    bandwidth = ((upper - lower) / middle * 100).fillna(0)
    return {"BB_UPPER": upper, "BB_MIDDLE": middle, "BB_LOWER": lower, "BB_WIDTH": bandwidth}


def compute_atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
    """Average True Range. Expects df with 'high', 'low', 'close' columns."""
    high_low = df["high"] - df["low"]
    high_close = (df["high"] - df["close"].shift(1)).abs()
    low_close = (df["low"] - df["close"].shift(1)).abs()
    tr = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
    return tr.ewm(alpha=1 / period, min_periods=period, adjust=False).mean()


def compute_stochastic(df: pd.DataFrame, k_period: int = 14, d_period: int = 3) -> dict[str, pd.Series]:
    """Stochastic %K and %D. Expects df with 'high', 'low', 'close' columns."""
    lowest_low = df["low"].rolling(window=k_period).min()
    highest_high = df["high"].rolling(window=k_period).max()
    k = ((df["close"] - lowest_low) / (highest_high - lowest_low).replace(0, np.nan)) * 100
    d = k.rolling(window=d_period).mean()
    return {"STOCH_K": k, "STOCH_D": d}


def compute_vwap(df: pd.DataFrame) -> pd.Series:
    """VWAP. Expects df with 'high', 'low', 'close', 'volume' columns."""
    tp = (df["high"] + df["low"] + df["close"]) / 3
    cum_vp = (tp * df["volume"]).cumsum()
    cum_vol = df["volume"].cumsum()
    return (cum_vp / cum_vol.replace(0, np.nan)).fillna(np.nan)


def compute_obv(df: pd.DataFrame) -> pd.Series:
    """On-Balance Volume. Expects df with 'close', 'volume' columns."""
    sign = np.sign(df["close"].diff())
    obv = (sign * df["volume"]).fillna(0).cumsum()
    return obv


def compute_indicator(config: dict, df: pd.DataFrame) -> dict[str, pd.Series]:
    """
    Compute a single indicator from its config dict.
    config: {"type": "RSI", "params": {"period": 14}, "source": "close"}
    df: DataFrame with OHLCV columns.
    Returns dict of key -> Series.
    """
    ind_type = config["type"]
    params = config.get("params", {})
    source_col = config.get("source", "close")
    source = df[source_col] if source_col in df.columns else df["close"]

    if ind_type == "RSI":
        key = f"RSI_{params.get('period', 14)}"
        return {key: compute_rsi(source, params.get("period", 14))}

    elif ind_type == "SMA":
        key = f"SMA_{params.get('period', 20)}"
        return {key: compute_sma(source, params.get("period", 20))}

    elif ind_type == "EMA":
        key = f"EMA_{params.get('period', 20)}"
        return {key: compute_ema(source, params.get("period", 20))}

    elif ind_type == "MACD":
        return compute_macd(source, params.get("fast", 12), params.get("slow", 26), params.get("signal", 9))

    elif ind_type == "BOLLINGER":
        return compute_bollinger(source, params.get("period", 20), params.get("stdDev", 2))

    elif ind_type == "ATR":
        key = f"ATR_{params.get('period', 14)}"
        return {key: compute_atr(df, params.get("period", 14))}

    elif ind_type == "STOCHASTIC":
        return compute_stochastic(df, params.get("kPeriod", 14), params.get("dPeriod", 3))

    elif ind_type == "VWAP":
        return {"VWAP": compute_vwap(df)}

    elif ind_type == "OBV":
        return {"OBV": compute_obv(df)}

    return {}
