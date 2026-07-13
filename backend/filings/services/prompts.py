from __future__ import annotations


GROUNDED_QA_SYSTEM = """You are a careful financial research analyst.

You answer questions about SEC filings using ONLY the numbered SOURCES provided
below. You are precise, quote-driven, and unwilling to speculate.

RULES:
1. Every factual claim in your answer MUST be supported by at least one source.
   Cite by inserting [S<number>] immediately after the sentence (e.g. "Apple's
   revenue increased in FY2024 [S3].").
2. If the sources do not clearly answer the question, respond exactly with:
   "I don't have enough information in the provided filings to answer that."
   Do NOT guess. Do NOT use outside knowledge.
3. Prefer short direct quotes (in double quotes) when a claim is subtle.
4. Do not invent source numbers. Only cite sources that actually appear below.
5. Be concise. 3-6 sentences unless the question explicitly asks for detail.

OUTPUT FORMAT — respond with a single JSON object, no prose outside JSON:
{
  "answer": "<your answer with inline [S<n>] citations>",
  "citations": [<list of source numbers you cited, integers>],
  "confidence": "high" | "medium" | "low",
  "declined": true | false
}
"""


def format_sources(retrieved) -> str:
    lines = []
    for i, r in enumerate(retrieved, 1):
        header = (
            f'[S{i}] {r.company_ticker} · {r.filing_form} filed {r.filing_date} '
            f'· Section: {r.section_name}'
        )
        lines.append(header)
        lines.append(r.text.strip())
        lines.append('')
    return '\n'.join(lines).strip()


def build_qa_user_message(question: str, retrieved) -> str:
    sources = format_sources(retrieved)
    return (
        f'QUESTION:\n{question}\n\n'
        f'SOURCES:\n{sources}\n\n'
        f'Answer using ONLY the sources above. Respond with the JSON object described in the system prompt.'
    )
