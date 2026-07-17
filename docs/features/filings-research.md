# Filings Research Analyst

<p align="center"><sub><strong>🎬 Demo: Filings Research Analyst</strong> — placeholder (recording coming soon)</sub></p>

## What it is

An **agentic RAG** analyst over SEC EDGAR filings. Ask questions about 10-K, 10-Q, and 8-K documents; get answers with **inline citations linking back to sec.gov**, or an honest **refusal** when the corpus doesn't support the claim.

Not another "chat with your PDF" — this system is layered, measured, and grounded.

## What makes it different

| Property                | What it means                                                                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Cited**               | Every factual sentence carries a `[S<n>]` marker pointing to the exact passage in the source filing.                                      |
| **Verifiable**          | Click any citation → jumps to the filing on sec.gov, opened to the source URL.                                                            |
| **Refusal-first**       | If retrieval scores below threshold, the system declines with a fixed string. No polite fabrication.                                      |
| **Layered retrieval**   | Dense embeddings + BM25 (RRF fusion) + cross-encoder rerank — each layer toggleable, each measurable.                                     |
| **Agent decomposition** | Comparison questions ("Compare AAPL and NVDA on X") get decomposed into per-entity sub-questions, retrieved separately, then synthesized. |
| **Provider-agnostic**   | The LLM interface has six adapters — Anthropic, OpenAI, OpenRouter, Mistral, Ollama, generic OpenAI-compatible.                           |
| **Measured**            | Ships with an eval harness — recall@k, MRR, faithfulness, refusal accuracy.                                                               |

## What you can do

* **Ask any question** grounded in the ingested filings — even complex multi-entity comparisons.
* **See exactly where every claim came from** — clickable citations, snippet previews, source-URL links.
* **Watch the system refuse** when it doesn't know — this is a feature, not a bug.
* **Add filings yourself** — paste any SEC EDGAR URL, watch the ingestion job progress live, then query it.
* **Delete filings** — remove any filing from your corpus with one click.
* **Toggle retrieval layers** — hybrid on/off, rerank on/off, agent on/off — and see the answers change.

## How to use it

### Step 1 — Add filings to the corpus

The corpus starts **empty**. You add content two ways:

**Method A — Paste a URL in the UI**

1. Find a filing at [sec.gov](https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany) — copy the URL of the primary `.htm` document.
2. Sidebar → **Filings Research** → paste into the "Add a filing by URL" box → click **Ingest**.
3. Watch the job status update in real time (`pending → running → success`, \~30–120 seconds).
4. The filing appears in the "Ingested filings" list below.

**Method B — Bulk seed via CLI**

```bash
cd backend
source .venv/bin/activate
python manage.py ingest_filings AAPL NVDA TSLA --form 10-K --limit 1
```

See [Ingestion Pipeline](../filings-deep-dive/ingestion.md) for the full command reference.

### Step 2 — Ask a question

1. Type in the question box (or click a sample-question chip).
2. Toggle retrieval layers:
   * **Hybrid** — dense + BM25 (recommended: on).
   * **Rerank** — cross-encoder over top candidates (recommended: on).
   * **Agentic** — decomposition for comparison/multi-entity questions.
3. Click **Ask** (or `Cmd/Ctrl+Enter`).

### Step 3 — Verify

Every answer has:

* **Inline citations** — `[S1]`, `[S2]`, etc. as clickable superscripts.
* **Citation cards** below the answer with ticker, form, date, section, snippet, and a source-URL link.
* **Confidence** (low / medium / high) and **declined** badge if applicable.

Click a citation → the exact filing opens in a new tab. That's the one-click verifiability.

## Sample questions to try

Simple retrieval:

> _"What are the largest risk factors disclosed in this filing?"_

Section-specific:

> _"Summarize the Management's Discussion & Analysis section."_

Refusal test:

> _"Did the company acquire LithGold Corporation in 2024?"_ (Answer: **declines** — no such acquisition exists.)

Agent mode (turn Agentic on):

> _"Compare Apple's and NVIDIA's approach to R\&D investment."_

Time-series (agent mode, multiple years ingested):

> _"How has Tesla's risk-factor language changed from 2021 to 2024?"_

## Under the hood

The Filings feature has its own [deep-dive section](../filings-deep-dive/architecture.md) covering:

* [Architecture](../filings-deep-dive/architecture.md) — the whole system in one diagram
* [Ingestion Pipeline](../filings-deep-dive/ingestion.md) — EDGAR → parse → chunk → embed → store
* [Hybrid Retrieval + Rerank](../filings-deep-dive/retrieval.md) — dense + BM25 + cross-encoder
* [Grounded Generation](../filings-deep-dive/grounded-generation.md) — the QA prompt + citation validation
* [The Agentic Loop](../filings-deep-dive/agent.md) — planner → sub-answers → synthesis
* [Evaluation Harness](../filings-deep-dive/evals.md) — recall@k, MRR, faithfulness

## Related

* [LLM Providers](../llm-providers/overview.md) — configure which model powers the analyst.
* [AI Coach](ai-coach.md) — another grounded LLM feature, different flavor.
