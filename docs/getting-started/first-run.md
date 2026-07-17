# First Run

You've installed the app and both servers are running. Here's a 5-minute path that touches every major feature.

## 1. Create your account

Open [http://localhost:3000](http://localhost:3000) → **Sign up** (top right).

Verification email is a no-op in dev — you'll be logged in immediately.

## 2. Look around the dashboard

The sidebar shows every feature:

| Item | What it does |
|---|---|
| Dashboard | Portfolio overview, market movers, quick stats |
| Markets | Live quotes, stock search, sector heatmap |
| Charts | Interactive TradingView-style charts with indicators |
| Portfolio | Your holdings + P/L |
| Trade | Place market or limit orders |
| History | Transaction log |
| Watchlist | Track symbols without owning them |
| Reports | Downloadable performance reports |
| Backtesting | Build & test trading strategies over historical data |
| AI Coach | Behavioral analysis of your trades |
| **Filings Research** | Ask questions of SEC 10-K / 10-Q / 8-K filings |
| Copy Trading | Follow leader accounts, mirror their trades |
| Leaderboard | Rank by return, XP, achievements |
| Friends | Social layer |
| Account | Settings, 2FA, currency |

## 3. Make your first trade

**Trade → Buy** — search for `AAPL`, buy 10 shares. You start with a virtual balance so nothing costs you anything.

Once it fills, check:

* **Portfolio** — the position appears with unrealized P/L.
* **History** — the transaction is logged with fill price.

## 4. Add a filing to the Research corpus

Sidebar → **Filings Research**. The corpus starts **empty** — that's on purpose.

### Option A — Paste a URL in the UI

Grab any SEC filing URL. Easiest path:

1. Go to [sec.gov/cgi-bin/browse-edgar?action=getcompany](https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany).
2. Search for a company (e.g. "Apple").
3. Click any 10-K filing → click the primary `.htm` document.
4. Copy the URL — it looks like `https://www.sec.gov/Archives/edgar/data/320193/000032019324000123/aapl-20240928.htm`.

Paste it into the **"Add a filing by URL"** box → click **Ingest**.

Watch the job status flip through `pending → running → success` in ~60 seconds. When done, the filing appears in the "Ingested filings" list below.

### Option B — Bulk seed via CLI

If you want a bigger corpus fast, open a third terminal:

```bash
cd backend
source .venv/bin/activate
python manage.py ingest_filings AAPL NVDA TSLA --form 10-K --limit 1
```

This takes 5–10 minutes for three filings on CPU.

## 5. Ask your first question

Back on **Filings Research**:

* Type: **"What are the largest risk factors disclosed in this filing?"**
* Leave **Hybrid** and **Rerank** toggles **on** (recommended defaults).
* Click **Ask**.

In 3–8 seconds you get an answer with inline `[S1]`, `[S2]`, `[S3]` citation markers. Below the answer, citation cards show:

* Ticker, form type, date, section name.
* A snippet of the quoted text.
* A `↗ source` link that opens the exact filing on sec.gov.

**Click any citation superscript in the answer** — it jumps you to the source URL. Every claim is verifiable in one click.

## 6. Try a refusal (this is the point)

Ask: **"Did Apple acquire LithGold Corporation in 2024?"**

The response should say:

> **🚫 declined** — I don't have enough information in the provided filings to answer that.

No hallucination. No polite fabrication. This is the differentiator over 90% of "chat with your PDF" tools.

## 7. Try Agent mode

Ingest a second company (say, NVDA) if you haven't already, then check **Agentic mode** and ask:

> **"Compare Apple's and NVIDIA's approach to R&D investment."**

Wait 8–15 seconds. The response includes:

* A synthesized comparison covering both companies.
* An **Agent trace** disclosure showing the sub-questions the planner generated (one per ticker).
* Merged citations from both filings, with global numbering.

## 8. Peek at the eval harness

```bash
python manage.py evaluate --hybrid --rerank --out results.json
cat results.json
```

You'll see recall@k, MRR, and answer-level metrics on the gold set. See [Evaluation Harness](../filings-deep-dive/evals.md) for full methodology.

---

## What next?

<table data-view="cards">
<thead>
  <tr><th></th><th></th><th data-hidden data-card-target data-type="content-ref"></th></tr>
</thead>
<tbody>
  <tr>
    <td><strong>Learn features in depth</strong></td>
    <td>Every feature has its own page with demos and walkthroughs.</td>
    <td><a href="../features/overview.md">overview.md</a></td>
  </tr>
  <tr>
    <td><strong>Understand the Filings pipeline</strong></td>
    <td>How ingestion, hybrid retrieval, and the agent actually work.</td>
    <td><a href="../filings-deep-dive/architecture.md">architecture.md</a></td>
  </tr>
  <tr>
    <td><strong>Something broke?</strong></td>
    <td>Common issues + fixes.</td>
    <td><a href="troubleshooting.md">troubleshooting.md</a></td>
  </tr>
</tbody>
</table>
