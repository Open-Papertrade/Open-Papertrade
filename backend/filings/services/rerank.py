from __future__ import annotations

import os
from typing import Optional

from .retrieval import RetrievedChunk


_CROSS_ENCODER = None


def _load():
    global _CROSS_ENCODER
    if _CROSS_ENCODER is not None:
        return _CROSS_ENCODER
    from sentence_transformers import CrossEncoder
    model_name = os.getenv('FILINGS_RERANKER_MODEL', 'cross-encoder/ms-marco-MiniLM-L-6-v2')
    _CROSS_ENCODER = CrossEncoder(model_name)
    return _CROSS_ENCODER


def cross_encoder_rerank(
    query: str,
    candidates: list[RetrievedChunk],
    top_k: int = 10,
    model_name: Optional[str] = None,
) -> list[RetrievedChunk]:
    if not candidates:
        return []
    if model_name:
        from sentence_transformers import CrossEncoder
        model = CrossEncoder(model_name)
    else:
        model = _load()

    pairs = [(query, c.text) for c in candidates]
    scores = model.predict(pairs)

    for c, s in zip(candidates, scores):
        c.rerank_score = float(s)

    ranked = sorted(candidates, key=lambda x: -x.rerank_score)
    return ranked[:top_k]
