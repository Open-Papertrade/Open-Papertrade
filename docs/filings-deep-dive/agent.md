# The Agentic Loop

## Why an agent at all

Single-shot RAG works beautifully when:

* The question is about one company.
* Relevant passages live in one document.
* The question is atomic (asks for one thing).

It **silently fails** on:

| Failure mode             | Example                                                                |
| ------------------------ | ---------------------------------------------------------------------- |
| Multi-entity comparisons | _"Compare Apple's and NVIDIA's approach to R\&D"_                      |
| Time-series questions    | _"How has Tesla's risk language changed 2021 → 2024?"_                 |
| Compositional questions  | _"Which of these three has the most concentrated supply-chain risk?"_  |
| Multi-hop dependencies   | _"Does Apple mention any of the regulatory risks NVIDIA highlighted?"_ |

The root cause: **a single retrieval has a bounded budget** (top-K chunks). If a question requires evidence from two documents in two different frames, whichever is more strongly represented dominates and the other gets 0–1 chunks. The LLM then either writes a lopsided answer or _hallucinates_ the missing side to be helpful.

The agent fixes this by **allocating retrieval budget deliberately**.

## The three-stage flow

```
question ──▶ planner.decompose(question) ──▶ [sub-Q1, sub-Q2, sub-Q3]
                                                      │
                                     for each sub-Q, in sequence:
                                         answer_question(sub-Q, filters=<tickers>)
                                                      │
                                              [QAResult, QAResult, QAResult]
                                                      │
                            synthesize(sub-answers, preserving citations)
                                                      │
                                                AgentResult
```

## Stage 1 — Decompose (`services/planner.py`)

One LLM call. The planner's system prompt says roughly:

> Given a question, produce 1–4 sub-questions that together answer it. Each sub-question may specify a ticker filter (e.g. `["AAPL"]`) if it's about a specific company. Return JSON.

Output shape:

```python
[
  SubQuestion(question="What is Apple's approach to R&D?",  tickers=["AAPL"],  reason="one side of the comparison"),
  SubQuestion(question="What is NVIDIA's approach to R&D?", tickers=["NVDA"], reason="other side of the comparison"),
]
```

Key property — the plan is **visible in the response**. The frontend surfaces it as an "Agent trace" disclosure, so users can see _why_ the answer covers what it covers.

## Stage 2 — Execute (sub-answers)

```python
sub_results = [
    answer_question(
        sub.question,
        filters=RetrievalFilters(tickers=sub.tickers),  # ← scoped retrieval
        provider_name=provider_name,
        model=model,
        use_hybrid=use_hybrid,
        use_rerank=use_rerank,
    )
    for sub in subs
]
```

Each sub-question runs the **full standard QA pipeline** (see [Grounded Generation](grounded-generation.md)) with its **own top-K budget** and its **own metadata filters**. Two calls if it's an AAPL-vs-NVDA comparison; three calls for TSLA-2021 vs -2022 vs -2023.

## Stage 3 — Synthesize (with citation remap)

If more than one sub-question ran, a final LLM call synthesizes:

```python
SYNTHESIZE_SYSTEM = """You are a financial research analyst producing a final answer
by synthesizing sub-answers that each already have citations.

RULES:
- Preserve citation markers of the form [S<n>] from the sub-answers.
- Do not introduce new facts that are not present in the sub-answers.
- If all sub-answers are refusals, output the refusal text and set declined=true.
- Be concise and structured. If comparing companies, use short parallel points.
"""
```

Two deliberate design choices in the synthesizer:

### The synthesizer sees only sub-answers, not raw sources

If the synthesizer saw all the retrieved chunks, it might "helpfully" combine evidence in ways the sub-QA already ruled out — inventing claims by cross-referencing. Giving it only the _already-cited_ sub-answers means it can only rearrange what was already grounded. **New facts cannot appear at the synthesis step.**

### Citation index remapping

Each sub-QA numbers its citations locally: `[S1]`, `[S2]`, `[S3]`. In the merged answer we want a single **flat** numbering, so we remap:

* sub-Q1's `[S1]` → global `[S1]`
* sub-Q1's `[S2]` → global `[S2]`
* sub-Q2's `[S1]` → global `[S3]` (starts after sub-Q1's max)
* sub-Q2's `[S2]` → global `[S4]`
* …

The `AgentResult.citations` list carries the flat merged version. The frontend renders it uniformly — no special-casing between single-shot and agent responses.

## Three exit paths

```python
def run_agent(question, *, provider_name, model, use_hybrid, use_rerank):
    subs = decompose(question, provider)
    sub_results = [answer_question(s.question, filters=...) for s in subs]

    # Exit 1 — everyone refused
    if all(r.declined for r in sub_results):
        return _refuse(question, sub_results)

    # Exit 2 — trivial decomposition, no synthesis needed
    if len(subs) == 1:
        return _wrap_single(sub_results[0], subs[0])

    # Exit 3 — multiple valid sub-answers, synthesize
    return _synthesize(question, subs, sub_results, provider)
```

**Graceful degradation** — even if you leave "Agentic mode" on for simple questions, the planner will return one sub-question and the agent short-circuits back to single-shot QA. No extra latency.

## Why static decomposition, not tool-use loops

Two dominant "agent" patterns in RAG. We deliberately picked one:

### Rejected: tool-use loop

```
LLM: "I need to search for X" → search
LLM: "Now search for Y" → search
LLM: "Actually let me refine that" → search
... continues until model decides it's done
```

Powerful but:

* **Unbounded cost.** No hard cap on iterations. One question can spin into 5, 10, 20 LLM calls.
* **Opaque.** The plan emerges — you can't tell the user what will happen until it has.
* **Hard to debug.** If the answer is wrong, was it wrong at step 3 or step 7?
* **Latency variance.** p50 might be 3s, p95 might be 30s.

### Chosen: static decomposition

```
LLM: "Here's my plan: [sub-Q1, sub-Q2, sub-Q3]"   ← ONE call, upfront
Code:  for each sub-Q, run the standard pipeline
LLM: "Here's the final answer"                    ← ONE call, at end
```

* **Bounded cost.** Total LLM calls = `1 (plan) + N (sub-answers) + 1 (synthesize)`. N is bounded by the planner (typically 2–4).
* **Auditable.** The plan is exposed in the response payload.
* **Debuggable.** Each stage is independently testable.
* **Predictable latency.** N+2 calls, each with a known cost profile.

For financial filings — a bounded, well-structured domain — decomposition matches the shape of the hard questions and stays inspectable.

## When to turn agent mode on

| Question shape                         | Agent mode? | Why                                                                 |
| -------------------------------------- | ----------- | ------------------------------------------------------------------- |
| "What are Apple's risk factors?"       | ❌ Off       | Single retrieval works fine. Agent adds 2 LLM calls for no benefit. |
| "Summarize Tesla's MD\&A."             | ❌ Off       | Single company, single section.                                     |
| "Compare A and B" (any two entities)   | ✅ On        | Retrieval budget split problem.                                     |
| "How has X changed 2021→2024?"         | ✅ On        | Time-series needs one retrieval per year.                           |
| "Which of these three has the most X?" | ✅ On        | Compositional judgment across entities.                             |
| "Does A mention what B mentioned?"     | ✅ On        | Multi-hop dependency.                                               |

**Cost.** Single-shot: \~1 LLM call. Agent: 3–5. Roughly 4× more, but still fractions of a cent per query on any provider.

**Latency.** Single-shot: 2–4 seconds. Agent: 6–15 seconds. Users self-select via the UI toggle — they know they're opting into a bigger workload for a harder question.

## The philosophical point

The agent isn't the magic ingredient that makes RAG smart. **The magic is in the retrieval layer** (hybrid + rerank), **the refusal behavior** (grounding + citation validation), and **the eval harness** (which keeps you honest).

The agent is a targeted fix for one specific class of failure — **questions whose answers live in multiple retrieval frames** — that no amount of retrieval tuning can solve. It solves that class by allocating retrieval budget deliberately, scoping each sub-search with metadata filters, and preserving citations through synthesis.

Retrieval finds passages. The agent decides _where to look_. Different jobs, both necessary once questions get harder than "look up X."

## Related

* [Grounded Generation](grounded-generation.md) — the sub-question RAG each agent step runs.
* [Retrieval](retrieval.md) — the layer the agent budgets.
* [Eval Harness](evals.md) — how agent-mode answers get graded.
