from __future__ import annotations

import re
from dataclasses import dataclass


_TOKEN_RE = re.compile(r'\S+')


@dataclass
class Chunk:
    order: int
    text: str
    char_start: int
    char_end: int
    token_count: int


def _tokens_with_offsets(text: str) -> list[tuple[str, int, int]]:
    return [(m.group(0), m.start(), m.end()) for m in _TOKEN_RE.finditer(text)]


def chunk_text(text: str, chunk_tokens: int = 400, overlap_tokens: int = 50) -> list[Chunk]:
    if chunk_tokens <= 0:
        raise ValueError('chunk_tokens must be positive')
    if overlap_tokens >= chunk_tokens:
        raise ValueError('overlap_tokens must be < chunk_tokens')

    toks = _tokens_with_offsets(text)
    if not toks:
        return []

    step = chunk_tokens - overlap_tokens
    chunks: list[Chunk] = []
    order = 0
    i = 0
    while i < len(toks):
        window = toks[i:i + chunk_tokens]
        char_start = window[0][1]
        char_end = window[-1][2]
        chunks.append(Chunk(
            order=order,
            text=text[char_start:char_end],
            char_start=char_start,
            char_end=char_end,
            token_count=len(window),
        ))
        order += 1
        if i + chunk_tokens >= len(toks):
            break
        i += step
    return chunks
