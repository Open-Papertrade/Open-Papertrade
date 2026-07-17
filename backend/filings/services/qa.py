from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from typing import Optional

from .llm import LLMMessage, get_provider
from .prompts import GROUNDED_QA_SYSTEM, build_qa_user_message
from .retrieval import RetrievedChunk, RetrievalFilters, search


REFUSAL_TEXT = "I don't have enough information in the provided filings to answer that."


@dataclass
class Citation:
    index: int
    chunk_id: int
    company_ticker: str
    filing_form: str
    filing_date: str
    section_name: str
    snippet: str
    source_url: str
    score: float


@dataclass
class QAResult:
    question: str
    answer: str
    declined: bool
    confidence: str
    citations: list[Citation]
    retrieved: list[RetrievedChunk] = field(default_factory=list)
    provider: str = ''
    model: str = ''
    input_tokens: int = 0
    output_tokens: int = 0

    def to_dict(self) -> dict:
        return {
            'question': self.question,
            'answer': self.answer,
            'declined': self.declined,
            'confidence': self.confidence,
            'citations': [c.__dict__ for c in self.citations],
            'usage': {
                'provider': self.provider,
                'model': self.model,
                'input_tokens': self.input_tokens,
                'output_tokens': self.output_tokens,
            },
        }


_JSON_BLOCK_RE = re.compile(r'\{.*\}', re.DOTALL)


def _extract_json(text: str) -> Optional[dict]:
    m = _JSON_BLOCK_RE.search(text)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except json.JSONDecodeError:
        return None


def _snippet(text: str, max_len: int = 320) -> str:
    text = text.strip()
    return text if len(text) <= max_len else text[:max_len].rsplit(' ', 1)[0] + '…'


def _is_relevant(r: RetrievedChunk, min_dense: float, min_rerank: float) -> bool:
    """Score-aware relevance check.

    Different retrieval layers produce scores on different scales — cosine ∈ [0,1],
    RRF sums are ~[0, 0.05], cross-encoder logits are ~[-10, +10]. A single
    numeric threshold cannot work across them, so we branch by which layer produced
    the score.
    """
    if r.rerank_score != 0.0:
        return r.rerank_score >= min_rerank
    if r.fused_score > 0.0:
        return True
    return r.dense_score >= min_dense


def answer_question(
    question: str,
    *,
    filters: Optional[RetrievalFilters] = None,
    top_k: int = 6,
    provider_name: Optional[str] = None,
    model: Optional[str] = None,
    use_hybrid: bool = False,
    use_rerank: bool = False,
    min_score: float = 0.15,
    min_rerank_score: float = -5.0,
) -> QAResult:
    retrieved = search(
        question,
        top_k=top_k,
        filters=filters,
        use_hybrid=use_hybrid,
        use_rerank=use_rerank,
        candidate_k=max(top_k * 4, 20),
    )

    strong = [r for r in retrieved if _is_relevant(r, min_score, min_rerank_score)]
    if not strong:
        return QAResult(
            question=question,
            answer=REFUSAL_TEXT,
            declined=True,
            confidence='low',
            citations=[],
            retrieved=retrieved,
        )

    provider = get_provider(provider_name, model=model)
    user_msg = build_qa_user_message(question, strong)
    resp = provider.complete(
        [LLMMessage(role='user', content=user_msg)],
        system=GROUNDED_QA_SYSTEM,
        temperature=0.0,
        max_tokens=800,
    )

    parsed = _extract_json(resp.text) or {}
    answer = str(parsed.get('answer') or resp.text).strip()
    declined = bool(parsed.get('declined')) or answer.startswith(REFUSAL_TEXT[:20])
    confidence = str(parsed.get('confidence') or ('low' if declined else 'medium'))

    cited_idx = parsed.get('citations') or []
    citations: list[Citation] = []
    for idx in cited_idx:
        try:
            n = int(idx)
        except (TypeError, ValueError):
            continue
        if 1 <= n <= len(strong):
            r = strong[n - 1]
            citations.append(Citation(
                index=n,
                chunk_id=r.chunk_id,
                company_ticker=r.company_ticker,
                filing_form=r.filing_form,
                filing_date=r.filing_date,
                section_name=r.section_name,
                snippet=_snippet(r.text),
                source_url=r.source_url,
                score=r.final_score,
            ))

    if not citations and not declined:
        for i, r in enumerate(strong[:3], 1):
            citations.append(Citation(
                index=i, chunk_id=r.chunk_id, company_ticker=r.company_ticker,
                filing_form=r.filing_form, filing_date=r.filing_date,
                section_name=r.section_name, snippet=_snippet(r.text),
                source_url=r.source_url, score=r.final_score,
            ))

    return QAResult(
        question=question,
        answer=answer,
        declined=declined,
        confidence=confidence,
        citations=citations,
        retrieved=strong,
        provider=resp.provider,
        model=resp.model,
        input_tokens=resp.input_tokens,
        output_tokens=resp.output_tokens,
    )
