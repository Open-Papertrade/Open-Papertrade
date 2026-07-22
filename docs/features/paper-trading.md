# Paper Trading

<figure><img src="../.gitbook/assets/Adobe Express - paper-trading.gif" alt=""><figcaption></figcaption></figure>

## What it is

Paper Trading lets you run a virtual portfolio against **real market data**. Everything a real broker would let you do — buy, sell, watch, set alerts — but with zero financial risk.

## What you can do

* **Place market orders** — instant fill at the current live quote.
* **Place limit orders** — queue an order to fire when the price reaches your target.
* **View holdings** with unrealized P/L per position.
* **Track transaction history** — every buy, sell, dividend, and adjustment.
* **Maintain a watchlist** — track symbols you don't own yet.
* **Set price alerts** — get notified when a stock crosses a threshold.
* **Multi-currency support** — quote and account values in your preferred currency.

## How to use it

### Placing a trade

1. Sidebar → **Trade**.
2. Search for a symbol (autocomplete works across US stocks and crypto).
3. Pick **Buy** or **Sell**.
4. Enter quantity — the estimated cost updates live from the current quote.
5. Choose order type:
   * **Market** — fills immediately.
   * **Limit** — set a target price; the order sits until reached.
6. Confirm.

The trade is instantly reflected in your **Portfolio** and **History**.

### Checking your portfolio

Sidebar → **Portfolio** shows:

* Total portfolio value + today's change.
* Buying power (virtual cash remaining).
* Holdings table with quantity, avg cost, current price, unrealized P/L.
* Sector breakdown pie chart.
* Historical value chart.

### Setting up price alerts

Sidebar → **Watchlist** → any symbol → **Alert** icon. Choose:

* Above / below threshold.
* One-time or recurring.

Alerts fire in the notification dropdown when the condition is met.

## Under the hood

* **Data**: Finnhub for real-time quotes (needs an API key — free tier is plenty). Falls back to Yahoo Finance if Finnhub is unreachable.
* **Storage**: Django `Trade`, `Holding`, `PriceAlert`, `Watchlist` models. All backed by SQLite in dev, Postgres in prod.
* **Latency**: quote-to-fill is single-digit milliseconds — the "market" order is really just a look-up-and-record.
* **Consistency**: buys and sells are atomic — a `transaction.atomic()` block ensures your buying power and holdings can't go out of sync.

## Related

* [Charts & Technical Analysis](charts.md) — chart any symbol you own or watch.
* [Backtesting](backtesting.md) — test the strategy that led to your paper trades.
* [Copy Trading](copy-trading.md) — mirror the trades of others.
