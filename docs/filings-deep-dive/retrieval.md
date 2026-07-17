# Hybrid Retrieval + Rerank

## Three retrieval layers, composable

```
query ──▶ search(query, top_k=10, use_hybrid, use_rerank)
             │
             ├─ dense_search()            ← NumPy cosine over stored embeddings
             │
             ├─ (if hybrid) bm25_search() + rrf_fuse()
             │
             └─ (if rerank) cross_encoder_rerank(query, candidates)
```

Each layer is **toggleable**. That toggleability is what makes the eval harness work — you get real A/B numbers.

## Dense retrieval — the baseline

`services/retrieval.py::dense_search()` is deliberately transparent:

```python
rows = list(Chunk.objects.select_related('company', 'filing', 'section').filter(
    ~Q(embedding=None)
))
matrix = np.stack([
    np.frombuffer(bytes(r.embedding), dtype=np.float32).reshape(dim)
    for r in rows
])

q_vec = emb.embed_query(query)      # same model as ingest, unit-normalized
sims  = matrix @ q_vec               # cosine (both are unit-norm)
top   = np.argsort(-sims)[:top_k]
```

That's the entire dense retriever. Six lines.

### Why dense retrieval alone isn't enough

Embeddings capture **semantic similarity** — great for paraphrases, weak for:

| Weakness             | Example                                                                                         |
| -------------------- | ----------------------------------------------------------------------------------------------- |
| Exact string matches | "Section 302 of Sarbanes-Oxley" — dense sends this near other legal text, not the exact section |
| Rare technical terms | "H100 GPU", "ETF ticker", specific fund names                                                   |
| Negation             | "Apple does _not_ rely on X" vs. "Apple relies on X" — near-identical embeddings                |

This is why we add sparse.

## Sparse retrieval — BM25

`services/bm25.py` uses the `rank_bm25` library. BM25 has been the retrieval workhorse for 30 years — it weights **rare terms high, common terms low**, and normalizes for document length.

```python
tokens_per_chunk = [_tokenize(c.text) for c in chunks]
index = BM25Okapi(tokens_per_chunk)
scores = index.get_scores(_tokenize(query))
top = np.argsort(-scores)[:top_k]
```

### Cache behavior

BM25 indices are per-filter-key and cached in memory:

* First BM25 query with a given filter set builds the index (\~1s for 10k chunks).
* Subsequent queries with the same filters reuse it.
* Ingestion invalidates the cache (`invalidate_cache()` from `services/ingest.py`).

The cache is process-local. In a multi-worker deployment (gunicorn), each worker has its own cache. Fine for a research tool; move to Redis for production.

## Fusion — Reciprocal Rank Fusion (RRF)

The problem: `dense_score` is cosine in \[0, 1]; `sparse_score` is a BM25 value in \[0, \~20]. Adding them makes no sense.

**RRF sidesteps the normalization problem by using only ranks:**

$$\text{RRF}(d) = \sum_{r \in \text{rankers}} \frac{1}{k + \text{rank}_r(d)}$$

```python
# services/fusion.py
for rank, r in enumerate(dense):
    row.fused_score += 1.0 / (k + rank + 1)   # k=60 from Cormack et al.

for rank, r in enumerate(sparse):
    row.fused_score += 1.0 / (k + rank + 1)

fused = sorted(candidates, key=lambda x: -x.fused_score)
```

Each ranker contributes `1/(k + rank)` per document that appears in its top list. Documents in **both** lists near the top get a big bump; documents in only one still get some credit.

`k=60` comes from the original Cormack et al. paper. Held up as a robust default across a decade of RAG research.

### Typical impact

On a well-ingested corpus, dense-only recall@10 lands around **0.60**. Adding BM25 + RRF pushes it to **\~0.75–0.80** — a huge win for one small module.

## Rerank — cross-encoder

Everything above (dense, sparse, fusion) is a **bi-encoder** — the query and each document are encoded independently. Fast, but the two encodings never see each other.

A **cross-encoder** takes `(query, document)` as a **single joint input** and outputs one score. Much more expressive — but O(candidates) inference calls, not one matmul. That's why you use it after retrieval, not instead of it:

```
100k chunks  ──dense/hybrid──▶  40 candidates  ──cross-encoder──▶  10 final
```

### The implementation

```python
# services/rerank.py
model = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
pairs = [(query, c.text) for c in candidates]
scores = model.predict(pairs)

for c, s in zip(candidates, scores):
    c.rerank_score = float(s)

ranked = sorted(candidates, key=lambda x: -x.rerank_score)
return ranked[:top_k]
```

### Cost & benefit

* **Latency**: \~5ms per (query, chunk) pair on CPU. 40 candidates ≈ 200ms extra.
* **Benefit**: typically **+0.05 to +0.10 faithfulness** on the answer eval. Big return for 200ms.

### About the scores

Cross-encoder outputs are **unbounded logits**, typically in **\[-10, +10]**. Even relevant chunks can score negative. This matters for the refusal threshold — see [Grounded Generation](grounded-generation.md#score-aware-refusal-threshold) for how the QA pipeline handles score-scale differences correctly.

## The orchestrator

```python
# services/retrieval.py
def search(query, top_k=10, filters=None, *, use_hybrid=False, use_rerank=False,
           candidate_k=40):
    if not use_hybrid and not use_rerank:
        return dense_search(query, top_k=top_k, filters=filters)

    candidates = dense_search(query, top_k=candidate_k, filters=filters)

    if use_hybrid:
        from .bm25 import bm25_search
        from .fusion import rrf_fuse
        sparse = bm25_search(query, top_k=candidate_k, filters=filters)
        candidates = rrf_fuse(candidates, sparse, top_k=candidate_k)

    if use_rerank and candidates:
        from .rerank import cross_encoder_rerank
        candidates = cross_encoder_rerank(query, candidates, top_k=top_k)
    else:
        candidates = candidates[:top_k]

    return candidates
```

## Filtering composes naturally

`RetrievalFilters` scopes by ticker, form type, section name, or fiscal year — all applied **before** any vector math via Django ORM `.filter()`:

```python
qs = Chunk.objects.select_related(...)
qs = _apply_filters(qs, filters)     # SQL WHERE
rows = list(qs)                       # filtered subset
matrix = np.stack([...])              # matmul only sees the survivors
```

This is one of the pragmatic wins of not using a dedicated vector DB — filtering happens where filtering is best (SQL) and vector math happens where vector math is best (NumPy).

## The scoring model, in one table

| Layer                | Populates field | Range         | Refusal threshold        |
| -------------------- | --------------- | ------------- | ------------------------ |
| Dense (cosine)       | `dense_score`   | \[0, 1]       | `dense_score >= 0.15`    |
| BM25 → RRF           | `fused_score`   | \~\[0, 0.05]  | Presence in fused output |
| Cross-encoder rerank | `rerank_score`  | \~\[-10, +10] | `rerank_score >= -5.0`   |

`RetrievedChunk.final_score` picks the highest layer that ran: `rerank_score` > `fused_score` > `dense_score`.

## Related

* [Grounded Generation](grounded-generation.md) — what the retrieved chunks feed into.
* [Evaluation Harness](evals.md) — how each layer's contribution gets measured.
* [Architecture](architecture.md) — how retrieval fits in the whole system.
