from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional

from django.db.models import Q

from ..models import Chunk
from .retrieval import RetrievedChunk, RetrievalFilters, _apply_filters


_TOKEN_RE = re.compile(r'[A-Za-z0-9]+')


def _tokenize(text: str) -> list[str]:
    return [t.lower() for t in _TOKEN_RE.findall(text)]


@dataclass
class _BM25Cache:
    filter_key: str
    chunk_ids: list[int]
    bm25: object


_cache: Optional[_BM25Cache] = None


def _build_index(filters: RetrievalFilters):
    from rank_bm25 import BM25Okapi

    qs = Chunk.objects.select_related('company', 'filing', 'section').filter(
        ~Q(embedding=None)
    )
    qs = _apply_filters(qs, filters)
    rows = list(qs)
    corpus = [_tokenize(r.text) for r in rows]
    if not corpus:
        return [], None, rows
    bm25 = BM25Okapi(corpus)
    return [r.id for r in rows], bm25, rows


def bm25_search(
    query: str,
    top_k: int = 20,
    filters: Optional[RetrievalFilters] = None,
) -> list[RetrievedChunk]:
    global _cache
    filters = filters or RetrievalFilters()
    key = repr(filters.__dict__)

    if _cache is None or _cache.filter_key != key:
        ids, bm25, rows = _build_index(filters)
        if bm25 is None:
            _cache = None
            return []
        _cache = _BM25Cache(filter_key=key, chunk_ids=ids, bm25=bm25)
        _cached_rows = rows
    else:
        _cached_rows = list(
            _apply_filters(
                Chunk.objects.select_related('company', 'filing', 'section').filter(
                    id__in=_cache.chunk_ids
                ),
                filters,
            )
        )

    q_toks = _tokenize(query)
    if not q_toks:
        return []

    scores = _cache.bm25.get_scores(q_toks)
    top_idx = sorted(range(len(scores)), key=lambda i: -scores[i])[:top_k]

    row_by_id = {r.id: r for r in _cached_rows}
    out: list[RetrievedChunk] = []
    for i in top_idx:
        if scores[i] <= 0:
            break
        chunk_id = _cache.chunk_ids[i]
        r = row_by_id.get(chunk_id)
        if not r:
            continue
        out.append(RetrievedChunk(
            chunk_id=r.id,
            text=r.text,
            company_ticker=r.company.ticker,
            filing_id=r.filing_id,
            filing_form=r.filing.form_type,
            filing_date=r.filing.filed_date.isoformat(),
            section_name=r.section.name,
            order=r.order,
            sparse_score=float(scores[i]),
            source_url=r.filing.source_url,
        ))
    return out


def invalidate_cache():
    global _cache
    _cache = None
