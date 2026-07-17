# Backtesting

<p align="center"><sub><strong>🎬 Demo: Backtesting</strong> — placeholder (recording coming soon)</sub></p>

## What it is

A strategy backtesting engine — build a trading rule, run it against historical market data, and see how it would have performed. Full performance metrics, equity curve, and trade-by-trade log.

## What you can do

* **Define a strategy** — combinations of indicators, thresholds, and entry/exit rules.
* **Pick a date range** — any historical window your data provider covers.
* **Choose a universe** — one symbol, a sector, or your entire watchlist.
* **Run the backtest** — the engine walks bar-by-bar, simulating orders at market open/close.
* **See the results** — equity curve, drawdown chart, Sharpe ratio, win rate, average P/L, trade count, and a per-trade log.
* **Save strategies** — reuse and iterate on them.
* **Compare runs** — A/B a strategy across different date ranges or parameters.

## How to use it

### Creating a strategy

1. Sidebar → **Backtesting** → **New Strategy**.
2. Give it a name.
3. Add entry conditions:
   * e.g., "Buy when RSI(14) < 30".
4. Add exit conditions:
   * e.g., "Sell when RSI(14) > 70" or "Stop-loss at -5%".
5. Set position sizing and risk parameters.
6. Save.

### Running a backtest

1. Select the strategy.
2. Pick a symbol and date range.
3. Click **Run**.
4. Wait for the equity curve, metrics, and trade log to populate.

### Interpreting the results

| Metric                | What to look for                                                 |
| --------------------- | ---------------------------------------------------------------- |
| **Total return**      | Absolute % over the window                                       |
| **CAGR**              | Annualized — comparable across timeframes                        |
| **Max drawdown**      | Worst peak-to-trough loss — pain tolerance                       |
| **Sharpe ratio**      | Return per unit of volatility — > 1.0 is decent                  |
| **Win rate**          | % of trades profitable                                           |
| **Avg P/L per trade** | Small edge × many trades > large edge × few trades?              |
| **Trade count**       | Statistical significance — < 30 trades is anecdote, not evidence |

## Under the hood

* **Engine**: pure Python, no external backtesting framework — see `backend/stocks/services/` for the historical data provider and `backend/users/backtesting/` for the strategy runner.
* **Data**: same market data providers as live quotes (Finnhub → Yahoo Finance fallback).
* **Storage**: `Strategy` and `Backtest` models persist your work between sessions.

## Extended usage

* See `BACKTESTING_GUIDE.md` in the repo root for the full engine reference (strategy grammar, indicator DSL, custom hooks).
* Strategy files are portable — export them to share, or import from other users.

## Related

* [Charts](charts.md) — visually inspect price action before codifying it.
* [Paper Trading](paper-trading.md) — deploy a validated strategy against live data.
* [AI Coach](ai-coach.md) — analyze the trades your strategies produced.
