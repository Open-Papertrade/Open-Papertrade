from __future__ import annotations

from dataclasses import dataclass


@dataclass
class RetrievalMetrics:
    recall_at_k: dict[int, float]
    mrr: float
    hits: int
    total: int


def compute_retrieval(hits_per_question: list[list[bool]], ks: list[int]) -> RetrievalMetrics:
    """
    hits_per_question[i] is a list of booleans (top-k order) of whether each
    retrieved chunk contains the required text.
    """
    recall = {k: 0.0 for k in ks}
    rr_total = 0.0
    hit_count = 0
    for hits in hits_per_question:
        first_hit = next((i for i, h in enumerate(hits) if h), None)
        if first_hit is not None:
            rr_total += 1.0 / (first_hit + 1)
            hit_count += 1
        for k in ks:
            if any(hits[:k]):
                recall[k] += 1
    n = max(1, len(hits_per_question))
    return RetrievalMetrics(
        recall_at_k={k: v / n for k, v in recall.items()},
        mrr=rr_total / n,
        hits=hit_count,
        total=len(hits_per_question),
    )


@dataclass
class AnswerMetrics:
    faithfulness: float
    relevance: float
    refusal_accuracy: float
    citation_rate: float
    total: int


def summarize_answers(judgements: list[dict]) -> AnswerMetrics:
    if not judgements:
        return AnswerMetrics(0.0, 0.0, 0.0, 0.0, 0)
    faith = sum(j.get('faithful', 0) for j in judgements) / len(judgements)
    rel = sum(j.get('relevant', 0) for j in judgements) / len(judgements)
    refuse_correct = sum(1 for j in judgements if j.get('refusal_correct')) / len(judgements)
    cite_rate = sum(1 for j in judgements if j.get('had_citations')) / len(judgements)
    return AnswerMetrics(
        faithfulness=faith,
        relevance=rel,
        refusal_accuracy=refuse_correct,
        citation_rate=cite_rate,
        total=len(judgements),
    )
