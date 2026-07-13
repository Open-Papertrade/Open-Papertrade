from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Optional

from .llm import LLMMessage, get_provider


PLANNER_SYSTEM = """You are a research planner for questions about SEC filings.

Given a user question, decompose it into 1-4 focused sub-questions that can each
be answered by a targeted retrieval over one company's filings at a time.

Rules:
- If the user asks about multiple companies ("compare X and Y"), produce one
  sub-question per company.
- If the question is time-series ("how has X changed"), produce one sub-question
  per year or per filing.
- If the question is simple and already focused, return it unchanged as a single sub-question.
- Extract any tickers mentioned. Use only tickers, not company names.

Output ONLY a JSON object:
{
  "subquestions": [
    {"question": "...", "tickers": ["AAPL"], "reason": "why this sub-question"},
    ...
  ]
}
"""


@dataclass
class SubQuestion:
    question: str
    tickers: list[str]
    reason: str = ''


_JSON_RE = re.compile(r'\{.*\}', re.DOTALL)


def decompose(
    question: str,
    provider_name: Optional[str] = None,
    model: Optional[str] = None,
) -> list[SubQuestion]:
    provider = get_provider(provider_name, model=model)
    resp = provider.complete(
        [LLMMessage(role='user', content=question)],
        system=PLANNER_SYSTEM,
        temperature=0.0,
        max_tokens=400,
    )
    m = _JSON_RE.search(resp.text)
    if not m:
        return [SubQuestion(question=question, tickers=[], reason='fallback')]
    try:
        data = json.loads(m.group(0))
    except json.JSONDecodeError:
        return [SubQuestion(question=question, tickers=[], reason='fallback')]

    subs = []
    for sq in data.get('subquestions', [])[:4]:
        q = str(sq.get('question') or '').strip()
        if not q:
            continue
        tickers = [str(t).upper() for t in (sq.get('tickers') or []) if t]
        subs.append(SubQuestion(question=q, tickers=tickers, reason=str(sq.get('reason') or '')))
    return subs or [SubQuestion(question=question, tickers=[], reason='fallback')]
