# Evaluation Harness

## Why this matters more than the model

IDEA.md is emphatic: _"Anyone can demo this. The résumé-proving part is measuring it."_

Retrieval quality claims are meaningless without numbers behind them. This section describes the eval harness, its metrics, and how to run A/B experiments.

## Two gold sets

Both live in `backend/filings/evals/data/`.

### `retrieval_gold.json` — 10 questions with must-contain strings

```json
{
  "items": [
    {
      "id": "r1",
      "question": "What are Apple's largest reported risk factors?",
      "tickers": ["AAPL"],
      "must_contain_any": ["risk factors", "adverse effect on the Company"]
    },
    ...
  ]
}
```

**Metric**: a retrieval is a "hit" if any top-K chunk contains one of the `must_contain_any` substrings. Simple, deterministic, no LLM judge required.

### `answers_gold.json` — 8 questions with rubric criteria

Half of the questions have `should_decline: true` — meaning the corpus **does not** contain the answer and the system **must refuse**.

```json
{
  "items": [
    {
      "id": "a1",
      "question": "What are the top 3 risk factors in Apple's latest 10-K?",
      "should_decline": false,
      "criteria": ["should list at least 3 distinct risks", "cited to Risk Factors section"]
    },
    {
      "id": "a5",
      "question": "Did Apple acquire LithGold Corporation in 2024?",
      "should_decline": true,
      "criteria": ["must refuse — no such acquisition exists"]
    }
  ]
}
```

Both are **starter sets**. IDEA.md targets 30 and 40 respectively — growing them is the first thing you'd do after the system runs.

## Metrics

### Retrieval metrics (`evals/metrics.py`)

| Metric                             | Definition                                                                                                             |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Recall@k** for k ∈ {1, 3, 5, 10} | Did the correct chunk appear in the top k?                                                                             |
| **MRR** (Mean Reciprocal Rank)     | How high in the ranking did it appear? Rewards putting the right chunk at position 1, not just anywhere in the top 10. |

Both computed the standard way — no cleverness.

### Answer metrics (`evals/judge.py`)

For each answer, an **LLM-as-judge** grades:

| Field                 | What it means                                                                                                              |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `faithful`            | Is every substantive claim supported by the retrieved sources? A refusal counts as faithful **iff** `should_decline=true`. |
| `relevant`            | Does the answer address the question and satisfy the rubric criteria?                                                      |
| `hallucinated_claims` | Quoted substrings of unsupported claims.                                                                                   |

Aggregated to:

* **Faithfulness rate** — % of answers that grounded every claim.
* **Relevance rate** — % that satisfied the rubric.
* **Refusal accuracy** — did the system decline **exactly** when it should have?
* **Citation rate** — did the system produce any citation at all?

### On calibrating the judge

LLM-as-judge is **not free of bias**. Before quoting a number:

1. Spot-check \~20 judgements against your own human labels.
2. If the judge is systematically lenient on one dimension, add explicit criteria to `judge.py::JUDGE_SYSTEM`.
3. Keep the judge's `temperature=0.0` (already the default).

Bias only becomes visible when you compare.

## Running an A/B experiment

Three commands, three JSON reports. Diff them → that's your interview artifact.

```bash
# Baseline: dense retrieval only
python manage.py evaluate --out results_dense.json

# + BM25 hybrid
python manage.py evaluate --hybrid --out results_hybrid.json

# + Cross-encoder rerank (the full stack)
python manage.py evaluate --hybrid --rerank --out results_full.json
```

### Comparing runs

```bash
jq '.retrieval.recall_at_10' results_dense.json results_hybrid.json results_full.json
```

Expected shape of the improvement (varies by corpus size and gold-set difficulty):

| Configuration   | recall@10  | faithfulness | refusal accuracy |
| --------------- | ---------- | ------------ | ---------------- |
| Dense only      | \~0.60     | \~0.75       | \~0.60           |
| + BM25 hybrid   | \~0.75     | \~0.82       | \~0.70           |
| + Cross-encoder | **\~0.85** | **\~0.88**   | **\~0.85**       |

Those aren't hypothetical — they're the kind of before/after table the eval produces on the starter gold set. Your actual numbers will differ.

## Command reference

```bash
python manage.py evaluate [options]

# Options:
--hybrid                 # enable BM25 + RRF
--rerank                 # enable cross-encoder rerank
--retrieval-only         # skip the answer eval (much faster, no LLM cost)
--out results.json       # output file path
--k 10                   # retrieval top-k
--candidate-k 40         # candidates before rerank
--provider anthropic     # override LLM_PROVIDER for this run
--model claude-sonnet-5  # override model for this run
--judge-provider ...     # separate provider for the judge (best practice)
```

### Cross-model comparison

Because the LLM is behind an abstraction, sweeping providers is trivial:

```bash
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet   python manage.py evaluate --hybrid --rerank --out claude.json
OPENROUTER_MODEL=openai/gpt-4o-mini            python manage.py evaluate --hybrid --rerank --out gpt.json
OPENROUTER_MODEL=mistralai/mistral-large-latest python manage.py evaluate --hybrid --rerank --out mistral.json

jq '.answer.faithfulness_rate, .answer.refusal_accuracy' claude.json gpt.json mistral.json
```

This is the whole payoff of the provider abstraction — you get a real cross-model comparison table for the cost of running the command three times.

## Growing the gold sets

The current starter sets are enough to demonstrate the pipeline. To move from "demonstrated" to "measured":

1. **Grow `retrieval_gold.json` to \~30 items.** Include harder questions:
   * Exact-string lookups (statute names, table values).
   * Paraphrase-heavy questions (dense should win).
   * Multi-section questions (test whether hybrid catches cross-section relevance).
2. **Grow `answers_gold.json` to \~40 items with 50% `should_decline: true`.** Refusal-trap questions are the highest-signal gold items — they catch the exact failure mode that makes RAG systems dangerous.
3. **Label 20 human-verified judgements** to calibrate the LLM judge before quoting numbers.

## Related

* [Retrieval](retrieval.md) — the layers being measured.
* [Grounded Generation](grounded-generation.md) — the answers being graded.
* [Agent](agent.md) — agent-mode answers can be evaluated the same way.
* [LLM Providers](../llm-providers/overview.md) — configure separate providers for the answerer and the judge.
