from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from .llm import LLMMessage, get_provider
from .planner import SubQuestion, decompose
from .prompts import GROUNDED_QA_SYSTEM, format_sources
from .qa import Citation, QAResult, answer_question, _extract_json, _snippet, REFUSAL_TEXT
from .retrieval import RetrievalFilters, RetrievedChunk


SYNTHESIZE_SYSTEM = """You are a financial research analyst producing a final answer
by synthesizing sub-answers that each already have citations.

RULES:
- Preserve citation markers of the form [S<n>] from the sub-answers.
- Do not introduce new facts that are not present in the sub-answers.
- If all sub-answers are refusals, output the refusal text and set declined=true.
- Be concise and structured. If comparing companies, use short parallel points.

Respond ONLY with a JSON object:
{"answer": "...", "citations": [<int>...], "confidence": "low"|"medium"|"high", "declined": true|false}
"""


@dataclass
class AgentTrace:
    subquestions: list[dict] = field(default_factory=list)
    sub_results: list[dict] = field(default_factory=list)
    total_input_tokens: int = 0
    total_output_tokens: int = 0
    provider: str = ''
    model: str = ''


@dataclass
class AgentResult:
    question: str
    answer: str
    declined: bool
    confidence: str
    citations: list[Citation]
    trace: AgentTrace

    def to_dict(self) -> dict:
        return {
            'question': self.question,
            'answer': self.answer,
            'declined': self.declined,
            'confidence': self.confidence,
            'citations': [c.__dict__ for c in self.citations],
            'trace': {
                'subquestions': self.trace.subquestions,
                'sub_results': self.trace.sub_results,
                'usage': {
                    'provider': self.trace.provider,
                    'model': self.trace.model,
                    'input_tokens': self.trace.total_input_tokens,
                    'output_tokens': self.trace.total_output_tokens,
                },
            },
        }


def run_agent(
    question: str,
    *,
    provider_name: Optional[str] = None,
    model: Optional[str] = None,
    use_hybrid: bool = True,
    use_rerank: bool = True,
    top_k_per_sub: int = 5,
) -> AgentResult:
    subs = decompose(question, provider_name=provider_name, model=model)

    trace = AgentTrace(subquestions=[
        {'question': s.question, 'tickers': s.tickers, 'reason': s.reason} for s in subs
    ])

    sub_qa: list[QAResult] = []
    global_offset = 0
    remapped_citations: list[Citation] = []

    for sub in subs:
        filters = RetrievalFilters(tickers=sub.tickers or None)
        result = answer_question(
            sub.question,
            filters=filters,
            top_k=top_k_per_sub,
            provider_name=provider_name,
            model=model,
            use_hybrid=use_hybrid,
            use_rerank=use_rerank,
        )
        sub_qa.append(result)
        trace.total_input_tokens += result.input_tokens
        trace.total_output_tokens += result.output_tokens
        trace.provider = trace.provider or result.provider
        trace.model = trace.model or result.model

        for c in result.citations:
            new_idx = global_offset + c.index
            remapped_citations.append(Citation(
                index=new_idx,
                chunk_id=c.chunk_id,
                company_ticker=c.company_ticker,
                filing_form=c.filing_form,
                filing_date=c.filing_date,
                section_name=c.section_name,
                snippet=c.snippet,
                source_url=c.source_url,
                score=c.score,
            ))

        trace.sub_results.append({
            'question': sub.question,
            'declined': result.declined,
            'answer': result.answer[:400],
            'citation_indices_local': [c.index for c in result.citations],
            'citation_indices_global': [global_offset + c.index for c in result.citations],
        })
        global_offset += max(len(result.citations), len(result.retrieved))

    all_declined = all(r.declined for r in sub_qa)
    if all_declined:
        return AgentResult(
            question=question,
            answer=REFUSAL_TEXT,
            declined=True,
            confidence='low',
            citations=[],
            trace=trace,
        )

    # Single sub-question: just return its answer directly (no synthesis needed).
    if len(sub_qa) == 1:
        r = sub_qa[0]
        return AgentResult(
            question=question,
            answer=r.answer,
            declined=r.declined,
            confidence=r.confidence,
            citations=remapped_citations,
            trace=trace,
        )

    # Synthesize.
    provider = get_provider(provider_name, model=model)
    parts = []
    for i, (sub, r) in enumerate(zip(subs, sub_qa), 1):
        parts.append(f'SUB-QUESTION {i} ({", ".join(sub.tickers) or "any"}): {sub.question}')
        parts.append(f'SUB-ANSWER {i}: {r.answer}')
        parts.append('')

    synth_user = (
        f'ORIGINAL QUESTION:\n{question}\n\n'
        + '\n'.join(parts)
        + '\nProduce the final synthesized answer per the system rules.'
    )
    resp = provider.complete(
        [LLMMessage(role='user', content=synth_user)],
        system=SYNTHESIZE_SYSTEM,
        temperature=0.0,
        max_tokens=700,
    )
    trace.total_input_tokens += resp.input_tokens
    trace.total_output_tokens += resp.output_tokens

    parsed = _extract_json(resp.text) or {}
    final_answer = str(parsed.get('answer') or resp.text).strip()
    declined = bool(parsed.get('declined'))
    confidence = str(parsed.get('confidence') or 'medium')

    return AgentResult(
        question=question,
        answer=final_answer,
        declined=declined,
        confidence=confidence,
        citations=remapped_citations,
        trace=trace,
    )
