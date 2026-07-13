from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

import numpy as np
from django.db.models import Q

from ..models import Chunk
from . import embeddings as emb


@dataclass
class RetrievedChunk:
    chunk_id: int
    text: str
    company_ticker: str
    filing_id: int
    filing_form: str
    filing_date: str
    section_name: str
    order: int
    dense_score: float = 0.0
    sparse_score: float = 0.0
    rerank_score: float = 0.0
    fused_score: float = 0.0
    source_url: str = ''
    scores: dict = field(default_factory=dict)

    @property
    def final_score(self) -> float:
        if self.rerank_score:
            return self.rerank_score
        if self.fused_score:
            return self.fused_score
        return self.dense_score


@dataclass
class RetrievalFilters:
    tickers: Optional[list[str]] = None
    form_types: Optional[list[str]] = None
    section_names: Optional[list[str]] = None
    fiscal_years: Optional[list[int]] = None


def _apply_filters(qs, f: RetrievalFilters):
    if f.tickers:
        qs = qs.filter(company__ticker__in=[t.upper() for t in f.tickers])
    if f.form_types:
        qs = qs.filter(filing__form_type__in=f.form_types)
    if f.section_names:
        qs = qs.filter(section__name__in=f.section_names)
    if f.fiscal_years:
        qs = qs.filter(filing__fiscal_year__in=f.fiscal_years)
    return qs


def dense_search(
    query: str,
    top_k: int = 20,
    filters: Optional[RetrievalFilters] = None,
) -> list[RetrievedChunk]:
    filters = filters or RetrievalFilters()
    qs = Chunk.objects.select_related('company', 'filing', 'section').filter(
        ~Q(embedding=None) & ~Q(embedding=b'')
    )
    qs = _apply_filters(qs, filters)

    rows = list(qs)
    if not rows:
        return []

    dim = rows[0].embedding_dim
    matrix = np.stack([
        np.frombuffer(bytes(r.embedding), dtype=np.float32).reshape(dim)
        for r in rows
    ])

    q_vec = emb.embed_query(query)
    if q_vec.shape[0] != dim:
        raise ValueError(f'Query dim {q_vec.shape[0]} != store dim {dim}')

    sims = matrix @ q_vec
    top_idx = np.argsort(-sims)[:top_k]

    out: list[RetrievedChunk] = []
    for idx in top_idx:
        r = rows[int(idx)]
        out.append(RetrievedChunk(
            chunk_id=r.id,
            text=r.text,
            company_ticker=r.company.ticker,
            filing_id=r.filing_id,
            filing_form=r.filing.form_type,
            filing_date=r.filing.filed_date.isoformat(),
            section_name=r.section.name,
            order=r.order,
            dense_score=float(sims[int(idx)]),
            source_url=r.filing.source_url,
        ))
    return out


def search(
    query: str,
    top_k: int = 10,
    filters: Optional[RetrievalFilters] = None,
    *,
    use_hybrid: bool = False,
    use_rerank: bool = False,
    candidate_k: int = 40,
) -> list[RetrievedChunk]:
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
