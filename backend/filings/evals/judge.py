from __future__ import annotations

import json
import re
from typing import Optional

from ..services.llm import LLMMessage, get_provider


JUDGE_SYSTEM = """You are a strict evaluator of AI-generated answers about SEC filings.

You will receive:
- QUESTION
- CRITERIA (rubric items that a correct answer must satisfy)
- ANSWER produced by an AI system
- SOURCES the AI was allowed to use

Grade the answer on:
1. faithful: 1 if every substantive claim in the ANSWER is supported by SOURCES; else 0.
   A refusal ("I don't have enough information...") counts as faithful=1 iff CRITERIA
   marks should_decline=true.
2. relevant: 1 if the ANSWER addresses the question and satisfies the rubric CRITERIA;
   else 0.
3. hallucinated_claims: list of short strings quoting any unsupported claims (empty if none).

Output ONLY a JSON object:
{"faithful": 0|1, "relevant": 0|1, "hallucinated_claims": [...], "reason": "one sentence"}
"""


_JSON_RE = re.compile(r'\{.*\}', re.DOTALL)


def judge_answer(
    question: str,
    criteria: list[str],
    should_decline: bool,
    answer: str,
    sources_text: str,
    provider_name: Optional[str] = None,
    model: Optional[str] = None,
) -> dict:
    user = (
        f'QUESTION: {question}\n\n'
        f'CRITERIA (should_decline={should_decline}):\n- '
        + '\n- '.join(criteria)
        + f'\n\nANSWER:\n{answer}\n\nSOURCES:\n{sources_text[:8000]}'
    )
    provider = get_provider(provider_name, model=model)
    resp = provider.complete(
        [LLMMessage(role='user', content=user)],
        system=JUDGE_SYSTEM,
        temperature=0.0,
        max_tokens=400,
    )

    m = _JSON_RE.search(resp.text)
    if not m:
        return {'faithful': 0, 'relevant': 0, 'hallucinated_claims': [], 'reason': 'unparseable'}
    try:
        return json.loads(m.group(0))
    except json.JSONDecodeError:
        return {'faithful': 0, 'relevant': 0, 'hallucinated_claims': [], 'reason': 'bad_json'}
