from __future__ import annotations

import re
from dataclasses import dataclass

from bs4 import BeautifulSoup


ITEM_MAP: list[tuple[str, str]] = [
    ('1', 'Business'),
    ('1A', 'Risk Factors'),
    ('1B', 'Unresolved Staff Comments'),
    ('1C', 'Cybersecurity'),
    ('2', 'Properties'),
    ('3', 'Legal Proceedings'),
    ('4', 'Mine Safety Disclosures'),
    ('5', 'Market for Registrant Common Equity'),
    ('6', 'Selected Financial Data'),
    ('7', 'MD&A'),
    ('7A', 'Quantitative and Qualitative Disclosures About Market Risk'),
    ('8', 'Financial Statements'),
    ('9', 'Changes in and Disagreements With Accountants'),
    ('9A', 'Controls and Procedures'),
    ('9B', 'Other Information'),
    ('10', 'Directors, Executive Officers'),
    ('11', 'Executive Compensation'),
    ('12', 'Security Ownership'),
    ('13', 'Certain Relationships'),
    ('14', 'Principal Accounting Fees'),
    ('15', 'Exhibits'),
]

ITEM_LOOKUP = {code: name for code, name in ITEM_MAP}

_ITEM_RE = re.compile(
    r'(?im)^[\s ]*item[\s ]+(\d{1,2}[A-Ca-c]?)[\.\:\s ]'
)


@dataclass
class ParsedSection:
    code: str
    name: str
    order: int
    text: str


def html_to_text(html: str) -> str:
    soup = BeautifulSoup(html, 'html.parser')
    for tag in soup(['script', 'style', 'noscript']):
        tag.decompose()
    text = soup.get_text('\n')
    text = re.sub(r'[ ​]+', ' ', text)
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def _dedup_headings(matches: list[tuple[str, int]]) -> list[tuple[str, int]]:
    """Filings mention "Item 1A" in the TOC and again at the section itself.
    Keep the last occurrence — the actual section body usually appears later.
    """
    seen: dict[str, int] = {}
    for code, pos in matches:
        seen[code.upper()] = pos
    return sorted(seen.items(), key=lambda kv: kv[1])


def parse_sections(html: str) -> list[ParsedSection]:
    text = html_to_text(html)
    raw_hits = [(m.group(1).upper(), m.start()) for m in _ITEM_RE.finditer(text)]
    if not raw_hits:
        return [ParsedSection(code='FULL', name='Full Document', order=0, text=text)]

    ordered = _dedup_headings(raw_hits)
    sections: list[ParsedSection] = []
    for i, (code, start) in enumerate(ordered):
        end = ordered[i + 1][1] if i + 1 < len(ordered) else len(text)
        body = text[start:end].strip()
        if len(body) < 200:
            continue
        name = ITEM_LOOKUP.get(code, f'Item {code}')
        sections.append(ParsedSection(code=code, name=name, order=i, text=body))
    if not sections:
        return [ParsedSection(code='FULL', name='Full Document', order=0, text=text)]
    return sections
