# Architecture

## The whole system in one diagram

```
                    ┌─────────────────────────────────────────────────┐
   User question ─► │  AGENT LOOP (plan → retrieve → judge → act)    │
                    └───────────────┬─────────────────────────────────┘
                                    │ (may loop / reformulate)
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                            ▼
   Query rewrite             Hybrid retrieval              Rerank
   / decomposition       (dense + BM25 → RRF)         (cross-encoder)
                                    │
                                    ▼
                     Grounded generation + citations
                     (or "no supported answer")
```

## The three horizontal layers

```
┌──────────────────────────────┐
│   Next.js UI (/filings)      │ ← surface the user touches
└──────────────┬───────────────┘
               │ POST /api/filings/ask
               ▼
┌───────────────── Django ───────────────────────────────────┐
│                                                            │
│  filings/views.py    — HTTP layer, ~130 lines              │
│    /health /companies /filings /search /ask /ingest        │
│                                                            │
│  Agent  (services/agent.py)     ← plan → answer → synth    │
│    │                                                       │
│    ▼                                                       │
│  QA pipeline (services/qa.py)   ← single-question RAG      │
│    │                                                       │
│    ▼                                                       │
│  Retrieval (services/retrieval.py)                         │
│    ├─ dense_search   (NumPy cosine)                        │
│    ├─ bm25_search    (rank-bm25)                           │
│    ├─ rrf_fuse       (Reciprocal Rank Fusion)              │
│    └─ cross_encoder_rerank                                 │
│                                                            │
│  Ingestion (management/commands/ingest_filings.py +        │
│             services/ingest.py + ingest_worker.py)         │
│  Eval      (management/commands/evaluate.py)               │
│                                                            │
└────────────────────────────────────────────────────────────┘
               │
               ▼
       SQLite / Postgres    ← Company / Filing / Section / Chunk
               ▲
               │ populated only during ingestion
               │
       SEC EDGAR (public HTTP, rate-limited)
```

## Four load-bearing design properties

### 1. Ingestion writes; retrieval reads. No ingestion in the request path.

The `/ask` and `/search` endpoints only read from the DB — they never fetch from EDGAR, never re-parse HTML, never re-embed. Ingestion is a separate offline pipeline triggered by:

* CLI: `python manage.py ingest_filings AAPL NVDA TSLA`
* User: `POST /api/filings/ingest/` with a URL → background thread picks it up.

**Why this matters:** if ingestion were in the request path, every "cold" query would hit EDGAR's rate limits and eat 30–120 seconds waiting for embeddings. Separation gives every query a predictable, bounded latency.

### 2. Retrieval is layered. Every layer toggles independently.

The `search()` function accepts `use_hybrid` and `use_rerank` booleans. All four combinations work — dense-only, dense+BM25, dense+rerank, or the full stack.

**Why this matters:** you can produce real A/B numbers. IDEA.md says _"every change is a measured experiment with a before/after number"_ — toggleability is the substrate that makes that eval work.

### 3. The LLM is behind an interface. `qa.py` and `agent.py` never name a vendor.

Anywhere the reasoning layer needs an LLM, it calls `get_provider().complete(...)`. The provider is resolved from an env var. Six adapters ship, all sharing a minimal `BaseLLMProvider` interface.

**Why this matters:** during evals you actually use multiple providers (they have different refusal / citation-format tendencies). If the interface tried to normalize every feature, it'd become a lowest-common-denominator prison. Instead, provider-specific kwargs pass through via `**kwargs` and each adapter decides whether to use them.

### 4. Every citation traces to a stored Chunk row with `char_start` / `char_end`.

Citations aren't fuzzy strings — they're offsets into `Section.text`, stored on the `Chunk` row. That means:

* An offline verifier can re-slice the source and compare to the LLM's quoted snippet — a background hallucination detector that costs zero tokens.
* The frontend can deep-link to the exact passage in the source.
* Re-chunking doesn't break old citations, because section text is the source of truth.

## Data model

```
Company    ticker · cik · name
   │
   ▼
Filing     form_type · accession_number · filed_date · fiscal_year · source_url
   │
   ▼
Section    name (e.g. "Risk Factors") · order · text
   │
   ▼
Chunk      text · token_count · char_start · char_end · order
           embedding (BinaryField, float32 bytes) · embedding_model · embedding_dim
```

* **Company** is a filter (users ask about Apple, not CIK 0000320193).
* **Filing** is the citation unit (`Apple 10-K filed 2024-11-01`).
* **Section** is a semantic filter (`Risk Factors`, `MD&A`, …).
* **Chunk** is the retrieval unit (\~400 tokens each, embedded, scored).

See [Ingestion Pipeline](ingestion.md) for the full ingest flow and [Hybrid Retrieval + Rerank](retrieval.md) for how these rows get searched.

## The vector "store" is just a `BinaryField`

There is no dedicated vector database. `Chunk.embedding` is Django's `BinaryField` holding a NumPy float32 array as raw bytes. At query time, `retrieval.py::dense_search` loads them into a NumPy matrix and does one matmul.

```python
matrix = np.stack([np.frombuffer(bytes(r.embedding), dtype=np.float32) for r in rows])
q_vec  = emb.embed_query(query)          # unit-normalized
sims   = matrix @ q_vec                   # cosine (both are unit vectors)
top    = np.argsort(-sims)[:top_k]
```

At portfolio scale (\~10k chunks, \~15 MB RAM), this is faster than any dedicated vector service — no network hop, no second data store to sync. Migration to `pgvector` is \~50 lines of code when the corpus grows past 50k chunks.

See [Retrieval](retrieval.md) for the full story.

## What each page in this section covers

<table data-view="cards"><thead><tr><th></th><th></th><th data-hidden data-card-target data-type="content-ref"></th></tr></thead><tbody><tr><td><strong>Ingestion Pipeline</strong></td><td>EDGAR → parse → chunk → embed → store. Rate limits, HTML section detection, chunker tradeoffs.</td><td><a href="ingestion.md">ingestion.md</a></td></tr><tr><td><strong>Retrieval + Rerank</strong></td><td>Dense cosine, BM25, Reciprocal Rank Fusion, cross-encoder rerank — and how they compose.</td><td><a href="retrieval.md">retrieval.md</a></td></tr><tr><td><strong>Grounded Generation</strong></td><td>The QA prompt, citation validation, refusal behavior.</td><td><a href="grounded-generation.md">grounded-generation.md</a></td></tr><tr><td><strong>The Agentic Loop</strong></td><td>Query decomposition, per-sub-Q retrieval, synthesis with citation remapping.</td><td><a href="agent.md">agent.md</a></td></tr><tr><td><strong>Evaluation Harness</strong></td><td>Gold sets, metrics, A/B toggles, judge calibration.</td><td><a href="evals.md">evals.md</a></td></tr></tbody></table>
