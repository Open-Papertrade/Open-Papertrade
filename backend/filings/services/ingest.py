from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Callable, Optional

from django.db import transaction

from ..models import Chunk, Company, Filing, Section
from . import chunker, edgar, embeddings, parser


ProgressFn = Callable[[str], None]


@dataclass
class IngestResult:
    filing_id: int
    company_ticker: str
    company_name: str
    form_type: str
    filed_date: str
    section_count: int
    chunk_count: int


def _progress(cb: Optional[ProgressFn], msg: str):
    if cb:
        try:
            cb(msg)
        except Exception:
            pass


def process_filing(
    *,
    cik: str,
    ref: edgar.FilingRef,
    company_ticker: str,
    company_name: str,
    chunk_tokens: int = 400,
    overlap: int = 50,
    on_progress: Optional[ProgressFn] = None,
) -> IngestResult:
    model_name, model_dim = embeddings.get_model_info()

    company, _ = Company.objects.update_or_create(
        ticker=company_ticker,
        defaults={'cik': cik, 'name': company_name},
    )

    existing = Filing.objects.filter(accession_number=ref.accession_number).first()
    if existing:
        _progress(on_progress, f'Filing already ingested: {ref.accession_number}')
        return IngestResult(
            filing_id=existing.id,
            company_ticker=company.ticker,
            company_name=company.name,
            form_type=existing.form_type,
            filed_date=existing.filed_date.isoformat(),
            section_count=existing.sections.count(),
            chunk_count=existing.chunks.count(),
        )

    _progress(on_progress, f'Fetching {ref.form_type} {ref.filed_date}')
    html = edgar.fetch_filing_html(cik, ref)

    _progress(on_progress, 'Parsing sections')
    sections = parser.parse_sections(html)
    _progress(on_progress, f'Parsed {len(sections)} sections')

    filed_date = datetime.strptime(ref.filed_date, '%Y-%m-%d').date()
    period_date = None
    if ref.period_of_report:
        try:
            period_date = datetime.strptime(ref.period_of_report, '%Y-%m-%d').date()
        except ValueError:
            period_date = None

    source_url = edgar.filing_source_url(cik, ref)

    with transaction.atomic():
        filing = Filing.objects.create(
            company=company,
            form_type=ref.form_type,
            accession_number=ref.accession_number,
            filed_date=filed_date,
            period_of_report=period_date,
            fiscal_year=period_date.year if period_date else filed_date.year,
            source_url=source_url,
        )

        section_rows: list[tuple[Section, list]] = []
        for sec in sections:
            section_row = Section.objects.create(
                filing=filing, name=sec.name, order=sec.order, text=sec.text,
            )
            chs = chunker.chunk_text(sec.text, chunk_tokens=chunk_tokens, overlap_tokens=overlap)
            section_rows.append((section_row, chs))

        flat_texts: list[str] = []
        flat_meta: list[tuple[Section, object]] = []
        for section_row, chs in section_rows:
            for ch in chs:
                flat_texts.append(ch.text)
                flat_meta.append((section_row, ch))

        if not flat_texts:
            _progress(on_progress, 'No chunks produced')
            return IngestResult(
                filing_id=filing.id,
                company_ticker=company.ticker,
                company_name=company.name,
                form_type=filing.form_type,
                filed_date=filing.filed_date.isoformat(),
                section_count=len(sections),
                chunk_count=0,
            )

        _progress(on_progress, f'Embedding {len(flat_texts)} chunks')
        vecs = embeddings.embed_texts(flat_texts, model_name=model_name)

        Chunk.objects.bulk_create([
            Chunk(
                section=section_row,
                filing=filing,
                company=company,
                text=ch.text,
                token_count=ch.token_count,
                char_start=ch.char_start,
                char_end=ch.char_end,
                order=i,
                embedding=embeddings.to_bytes(vecs[i]),
                embedding_model=model_name,
                embedding_dim=model_dim,
            )
            for i, (section_row, ch) in enumerate(flat_meta)
        ], batch_size=200)

    _progress(on_progress, f'Stored {len(flat_texts)} chunks')

    try:
        from .bm25 import invalidate_cache
        invalidate_cache()
    except Exception:
        pass

    return IngestResult(
        filing_id=filing.id,
        company_ticker=company.ticker,
        company_name=company.name,
        form_type=filing.form_type,
        filed_date=filing.filed_date.isoformat(),
        section_count=len(sections),
        chunk_count=len(flat_texts),
    )


def ingest_from_url(url: str, on_progress: Optional[ProgressFn] = None) -> IngestResult:
    parsed = edgar.parse_sec_url(url)
    submissions = edgar.get_submissions(parsed.cik)

    ticker, name = edgar.get_company_info(parsed.cik, submissions=submissions)
    ref = edgar.find_filing_ref(parsed.cik, parsed.accession_number, submissions=submissions)
    if ref is None:
        raise ValueError(
            f'Accession {parsed.accession_number} not found in recent submissions for CIK {parsed.cik}. '
            f'Only filings from the last ~1000 submissions are searchable.'
        )
    if parsed.primary_document and not ref.primary_document:
        ref.primary_document = parsed.primary_document

    _progress(on_progress, f'Resolved: {ticker} {ref.form_type} {ref.filed_date}')
    return process_filing(
        cik=parsed.cik, ref=ref,
        company_ticker=ticker, company_name=name,
        on_progress=on_progress,
    )
