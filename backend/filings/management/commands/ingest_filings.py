from __future__ import annotations

from datetime import datetime

from django.core.management.base import BaseCommand
from django.db import transaction

from filings.models import Company, Filing, Section, Chunk
from filings.services import edgar, parser, chunker, embeddings


class Command(BaseCommand):
    help = 'Fetch filings from SEC EDGAR, parse, chunk, embed, and store.'

    def add_arguments(self, parser):
        parser.add_argument('tickers', nargs='+', help='e.g. AAPL NVDA TSLA')
        parser.add_argument('--form', default='10-K')
        parser.add_argument('--limit', type=int, default=1,
                            help='Filings per company (latest first)')
        parser.add_argument('--chunk-tokens', type=int, default=400)
        parser.add_argument('--overlap', type=int, default=50)
        parser.add_argument('--skip-existing', action='store_true', default=True)

    def handle(self, *args, **opts):
        tickers = [t.upper() for t in opts['tickers']]
        model_name, model_dim = embeddings.get_model_info()
        self.stdout.write(f'Embedding model: {model_name} (dim={model_dim})')

        for ticker in tickers:
            self._ingest_ticker(
                ticker,
                form_type=opts['form'],
                limit=opts['limit'],
                chunk_tokens=opts['chunk_tokens'],
                overlap=opts['overlap'],
                skip_existing=opts['skip_existing'],
                model_name=model_name,
                model_dim=model_dim,
            )
        self.stdout.write(self.style.SUCCESS('Ingestion complete.'))

    def _ingest_ticker(self, ticker, *, form_type, limit, chunk_tokens, overlap,
                       skip_existing, model_name, model_dim):
        self.stdout.write(f'\n=== {ticker} ===')
        try:
            cik, name = edgar.resolve_ticker(ticker)
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'  Could not resolve {ticker}: {e}'))
            return

        company, _ = Company.objects.update_or_create(
            ticker=ticker, defaults={'cik': cik, 'name': name}
        )
        self.stdout.write(f'  {name} (CIK {cik})')

        refs = edgar.list_filings(cik, form_type=form_type, limit=limit)
        if not refs:
            self.stdout.write(self.style.WARNING(f'  No {form_type} filings found'))
            return

        for ref in refs:
            if skip_existing and Filing.objects.filter(accession_number=ref.accession_number).exists():
                self.stdout.write(f'  Skipping existing {ref.accession_number}')
                continue

            self.stdout.write(f'  Fetching {ref.form_type} {ref.filed_date} ({ref.accession_number})')
            html = edgar.fetch_filing_html(cik, ref)
            sections = parser.parse_sections(html)
            self.stdout.write(f'    Parsed {len(sections)} sections')

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

                all_chunks_to_embed: list[tuple[Section, list]] = []
                for sec in sections:
                    section_row = Section.objects.create(
                        filing=filing,
                        name=sec.name,
                        order=sec.order,
                        text=sec.text,
                    )
                    chunks = chunker.chunk_text(sec.text, chunk_tokens=chunk_tokens, overlap_tokens=overlap)
                    all_chunks_to_embed.append((section_row, chunks))

                flat_texts: list[str] = []
                flat_meta: list[tuple[Section, object]] = []
                for section_row, chunks in all_chunks_to_embed:
                    for ch in chunks:
                        flat_texts.append(ch.text)
                        flat_meta.append((section_row, ch))

                if not flat_texts:
                    self.stdout.write(self.style.WARNING('    No chunks produced'))
                    continue

                self.stdout.write(f'    Embedding {len(flat_texts)} chunks')
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

                self.stdout.write(self.style.SUCCESS(
                    f'    Stored {len(flat_texts)} chunks for filing #{filing.id}'
                ))
