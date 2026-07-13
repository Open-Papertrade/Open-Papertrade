from __future__ import annotations

from .retrieval import RetrievedChunk


def rrf_fuse(
    dense: list[RetrievedChunk],
    sparse: list[RetrievedChunk],
    top_k: int = 20,
    k: int = 60,
) -> list[RetrievedChunk]:
    """Reciprocal Rank Fusion.

    Score(doc) = sum over rankers of 1 / (k + rank).
    k=60 is the value from the original Cormack et al. paper — a large k
    softens the difference between top ranks so no single ranker dominates.
    """
    by_id: dict[int, RetrievedChunk] = {}

    for rank, r in enumerate(dense):
        contrib = 1.0 / (k + rank + 1)
        row = by_id.setdefault(r.chunk_id, r)
        row.fused_score += contrib
        row.dense_score = max(row.dense_score, r.dense_score)

    for rank, r in enumerate(sparse):
        contrib = 1.0 / (k + rank + 1)
        row = by_id.get(r.chunk_id)
        if row is None:
            by_id[r.chunk_id] = r
            row = r
        row.fused_score += contrib
        row.sparse_score = max(row.sparse_score, r.sparse_score)

    fused = sorted(by_id.values(), key=lambda x: -x.fused_score)
    return fused[:top_k]
