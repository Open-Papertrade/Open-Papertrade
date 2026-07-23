# Grounded Generation

## The QA pipeline

`services/qa.py::answer_question` is the single-question RAG loop:

```
retrieved = search(question, use_hybrid, use_rerank)

if all(chunk.score < threshold for chunk in retrieved):
    return REFUSAL       ← before any LLM call

prompt   = system(GROUNDED_QA_SYSTEM) + user(format_sources(retrieved) + question)
response = llm.complete(prompt, JSON output enforced by prompt)
parsed   = _extract_json(response.text)

return QAResult(answer, citations, declined, confidence)
```

Four things earn their weight in this pipeline. In order of impact.

## 1. The system prompt (`prompts.py`)

```
You are a careful financial research analyst.

You answer questions about SEC filings using ONLY the numbered SOURCES provided.
You are precise, quote-driven, and unwilling to speculate.

RULES:
1. Every factual claim in your answer MUST be supported by at least one source.
   Cite by inserting [S<number>] immediately after the sentence.
2. If the sources do not clearly answer the question, respond exactly with:
   "I don't have enough information in the provided filings to answer that."
   Do NOT guess. Do NOT use outside knowledge.
3. Prefer short direct quotes when a claim is subtle.
4. Do not invent source numbers.
5. Be concise. 3-6 sentences unless the question asks for detail.

OUTPUT FORMAT — respond with a single JSON object:
{
  "answer": "...",
  "citations": [<int>, ...],
  "confidence": "low"|"medium"|"high",
  "declined": true|false
}
```

Five things the prompt does, in order of importance:

### 1.1 Names the persona

_"Careful financial research analyst"_ — precise, quote-driven, unwilling to speculate. This affects tone and refusal willingness measurably. A generic "helpful assistant" persona gets \~20% lower refusal accuracy in our eval.

### 1.2 Restricts the knowledge source

_"Use ONLY the numbered SOURCES."_ Not "prefer" — **only**. This is the single biggest lever for grounding.

### 1.3 Specifies the citation form

`[S<n>]` inline after each factual sentence. This is the shape our post-processing regex expects, and it survives model rewrites better than markdown footnotes.

### 1.4 Provides the refusal script verbatim

_"If the sources do not clearly answer the question, respond exactly with..."_ — giving the model an exact string is more reliable than "decline"; the model will actually reproduce it. This is why the refusal text matches character-for-character every time.

### 1.5 Forces JSON output

`{answer, citations, confidence, declined}` — lets us extract structure without a second model call. Every field has a purpose:

* `answer` — the prose with inline `[S<n>]` markers
* `citations` — list of source indices actually used (validated against retrieved sources)
* `confidence` — self-reported (low/medium/high), displayed to user
* `declined` — explicit refusal flag

## 2. The retrieval floor (refusal-before-LLM)

Before we build a prompt, we check whether any retrieved chunk clears the threshold:

```python
strong = [r for r in retrieved if _is_relevant(r, min_score, min_rerank_score)]
if not strong:
    return QAResult(declined=True, answer=REFUSAL_TEXT, citations=[], ...)
```

Two reasons for the pre-LLM refusal:

* **Latency.** No LLM call = 0 tokens spent on garbage.
* **Purity.** The LLM sometimes tries to be helpful even when told not to. Skipping the model entirely eliminates that failure mode.

### Score-aware refusal threshold

Different retrieval layers produce scores on **different scales**. A single numeric threshold can't work across all of them:

| Layer                | Score range   | Threshold used              |
| -------------------- | ------------- | --------------------------- |
| Dense (cosine)       | \[0, 1]       | `>= 0.15`                   |
| RRF fusion sum       | \~\[0, 0.05]  | Any positive value = signal |
| Cross-encoder rerank | \~\[-10, +10] | `>= -5.0`                   |

The `_is_relevant()` helper in `qa.py` branches on which score is populated:

```python
def _is_relevant(r, min_dense: float, min_rerank: float) -> bool:
    if r.rerank_score != 0.0:
        return r.rerank_score >= min_rerank    # cross-encoder: permissive
    if r.fused_score > 0.0:
        return True                             # RRF: any presence is signal
    return r.dense_score >= min_dense           # cosine
```

Without this, the naive check `final_score >= 0.15` would filter out **all rerank results** (many of which are legitimately relevant with logit scores around -2 or -3), causing wrong refusals on the entire hybrid+rerank path.

## 3. Formatting the sources

`prompts.py::format_sources()` produces the block that goes into the user message:

```
[S1] AAPL · 10-K filed 2024-11-01 · Section: Risk Factors
The Company's business is subject to a variety of risks, including...
[full chunk text]

[S2] AAPL · 10-K filed 2024-11-01 · Section: MD&A
Net sales for fiscal 2024 were $391 billion, an increase of...

[S3] ...
```

Every source has:

* An index `[S1]`, `[S2]`, ...
* Provenance line — ticker, form, filed date, section name.
* The full chunk text.

The LLM's citation choices are indices into this list. Post-processing validates that any `[S<n>]` in the answer maps to a real source (see below).

## 4. Citation parsing + validation

```python
parsed = _extract_json(resp.text) or {}
cited_idx = parsed.get('citations') or []

citations = []
for idx in cited_idx:
    n = int(idx)
    if 1 <= n <= len(strong):
        r = strong[n - 1]
        citations.append(Citation(index=n, chunk_id=r.chunk_id, ...))
    # else: silently drop — model hallucinated a citation
```

Two safeguards:

* **Range check** — `[S9]` when only 6 sources were sent gets dropped.
* **Fallback** — if the LLM produced text but forgot the JSON envelope, we salvage the raw text as `answer` and attach the top 3 retrieved chunks as citations. This is a soft fallback — the eval judge will penalize it if the retrieved chunks don't support the answer.

## The full QA loop, annotated

```python
def answer_question(question, *, filters, use_hybrid, use_rerank, ...):
    # 1. Retrieve
    retrieved = search(question, filters=filters,
                       use_hybrid=use_hybrid, use_rerank=use_rerank,
                       top_k=6, candidate_k=24)

    # 2. Refusal-before-LLM
    strong = [r for r in retrieved if _is_relevant(r, ...)]
    if not strong:
        return QAResult(declined=True, answer=REFUSAL_TEXT, ...)

    # 3. Build the prompt
    provider = get_provider(provider_name, model=model)
    user_msg = build_qa_user_message(question, strong)

    # 4. LLM call
    resp = provider.complete(
        [LLMMessage(role='user', content=user_msg)],
        system=GROUNDED_QA_SYSTEM,
        temperature=0.0,       # deterministic
        max_tokens=800,
    )

    # 5. Parse + validate
    parsed = _extract_json(resp.text) or {}
    answer = str(parsed.get('answer') or resp.text).strip()
    declined = bool(parsed.get('declined')) or answer.startswith(REFUSAL_TEXT[:20])
    confidence = parsed.get('confidence', 'low' if declined else 'medium')

    # 6. Remap citations (LLM indices → real Chunk rows)
    citations = _validate_citations(parsed.get('citations', []), strong)

    return QAResult(question, answer, declined, confidence, citations, ...)
```

## Why refusal is a feature

_"I don't have enough information in the provided filings to answer that."_

This one line is the differentiator over 90% of chat-with-your-PDF demos. IDEA.md is explicit about it: **"prefer refusal over hallucination"** is the core design principle.

Concretely, refusal fires in two places:

1. **Pre-LLM** (score-based) — cheapest, most reliable, described above.
2. **Post-LLM** (LLM declares `declined=true`) — the model itself decides the sources don't answer the question, even after seeing them.

Both surface the same UI state: a `🚫 declined` badge, an empty citation list, and the fixed refusal text.

## Related

* [Retrieval](retrieval.md) — what feeds into this pipeline.
* [Agent](agent.md) — how single-shot QA composes into multi-step reasoning.
* [Eval Harness](evals.md) — how faithfulness and refusal accuracy are measured.
