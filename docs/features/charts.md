# Charts & Technical Analysis



<figure><img src="../.gitbook/assets/chart-analysis (2)_compressed.gif" alt=""><figcaption></figcaption></figure>

## What it is

Interactive, TradingView-style candlestick charts with drawing tools, technical indicators, and pattern detection — all driven by real market data.

## What you can do

* **Chart any symbol** — stocks, ETFs, crypto (with fallback provider support).
* **Switch timeframes** — 1m, 5m, 15m, 1h, 1d, 1w, 1M.
* **Overlay indicators** — moving averages, RSI, MACD, Bollinger Bands, and more.
* **Detect patterns** automatically — head & shoulders, flags, wedges (via `patterns.ts`).
* **Draw on the chart** — trendlines, horizontal levels, Fibonacci retracements.
* **Chart analysis mode** — an LLM analyzes the current chart snapshot and gives you a written breakdown (uses the same provider-agnostic LLM abstraction).

## How to use it

### Opening a chart

1. Sidebar → **Charts** (or click any symbol in Portfolio / Watchlist).
2. Pick a timeframe from the top bar.
3. Click **Indicators** to overlay any combination.
4. Drag / draw tools from the left sidebar.

### Chart analysis

With a chart open:

1. Click **Analyze Chart** (top-right).
2. The frontend snapshots the visible chart data + indicators and sends it to the configured LLM.
3. You get a written analysis: trend direction, notable levels, indicator signals, and (in some cases) risk observations.

The analysis is **not trading advice** — it's a summary of what the chart shows. See the Disclaimer for details.

## Under the hood

* **Rendering**: `lightweight-charts` from TradingView (open-source, no key required).
* **Indicators**: computed locally in `frontend-ui/src/lib/indicators.ts` — no server round-trip per indicator.
* **Pattern detection**: `frontend-ui/src/lib/patterns.ts` runs geometric heuristics client-side.
* **Chart analysis prompt**: shares the LLM provider layer with AI Coach and Filings — swap providers via `LLM_PROVIDER` in `.env`.

## Related

* [Paper Trading](paper-trading.md) — place a trade based on what the chart shows you.
* [Backtesting](backtesting.md) — codify a chart pattern into a testable strategy.
* [LLM Providers](../llm-providers/overview.md) — configure which model powers the chart analysis.
