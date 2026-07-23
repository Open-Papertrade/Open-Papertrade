# CLI Commands

Every Django management command available in this project. Run from `backend/` with the virtualenv active.

## Standard Django commands

```bash
python manage.py runserver                  # Start the API server on :8000
python manage.py makemigrations             # Generate migrations from model changes
python manage.py migrate                    # Apply migrations
python manage.py createsuperuser            # Create an admin user for /admin/
python manage.py shell                      # Interactive Python shell with Django context
python manage.py collectstatic              # Gather static files for prod
python manage.py showmigrations             # List migration status
```

## Filings Research

### `ingest_filings` — bulk seed the corpus

```bash
python manage.py ingest_filings TICKER [TICKER...] [OPTIONS]
```

Fetches filings from SEC EDGAR, parses, chunks, embeds, and stores them.

**Options**:

| Flag | Default | Description |
|---|---|---|
| `--form` | `10-K` | Form type: `10-K`, `10-Q`, or `8-K` |
| `--limit N` | `1` | Filings per company, most recent first |
| `--chunk-tokens N` | `400` | Chunker window size |
| `--overlap N` | `50` | Chunker overlap |
| `--skip-existing` | `True` | Skip filings already ingested (idempotent) |

**Examples**:

```bash
# Latest 10-K for three companies
python manage.py ingest_filings AAPL NVDA TSLA

# Multiple 10-Ks per company (time series)
python manage.py ingest_filings TSLA --form 10-K --limit 4

# Quarterly reports
python manage.py ingest_filings AAPL --form 10-Q --limit 4

# Bulk from a text file
python manage.py ingest_filings $(cat tickers.txt) --form 10-K --limit 1
```

The command is idempotent — re-running skips already-ingested filings.

### `evaluate` — run the eval harness

```bash
python manage.py evaluate [OPTIONS]
```

Runs retrieval and answer metrics against the gold sets in `backend/filings/evals/data/`.

**Options**:

| Flag | Default | Description |
|---|---|---|
| `--hybrid` | off | Enable BM25 + RRF fusion |
| `--rerank` | off | Enable cross-encoder rerank |
| `--retrieval-only` | off | Skip the answer eval (no LLM cost) |
| `--out <path>` | `results.json` | Output file |
| `--k <n>` | `10` | Retrieval top-k |
| `--candidate-k <n>` | `40` | Candidates before rerank |
| `--provider <name>` | env | Override `LLM_PROVIDER` for this run |
| `--model <name>` | env | Override the model for this run |
| `--judge-provider <name>` | env | Separate provider for the LLM judge (best practice) |
| `--judge-model <name>` | env | Separate model for the judge |

**A/B recipe** — three commands, three reports, diff them:

```bash
python manage.py evaluate --out results_dense.json                    # dense only
python manage.py evaluate --hybrid --out results_hybrid.json          # + BM25
python manage.py evaluate --hybrid --rerank --out results_full.json   # full stack

jq '.retrieval.recall_at_10' results_*.json
```

## Django shell recipes

The shell is often faster than writing an endpoint. Common recipes:

### Wipe the filings corpus

```bash
python manage.py shell -c "
from filings.models import Company, IngestJob
Company.objects.all().delete()   # cascades to Filings → Sections → Chunks
IngestJob.objects.all().delete()
print('Wiped.')
"
```

### Delete one company's filings

```bash
python manage.py shell -c "
from filings.models import Company
Company.objects.filter(ticker='TSLA').delete()
"
```

### Corpus breakdown

```bash
python manage.py shell -c "
from filings.models import Company, Chunk
for c in Company.objects.all():
    n = Chunk.objects.filter(company=c).count()
    print(f'{c.ticker:6s} {n:6d} chunks')
"
```

### Sanity-check retrieval

```bash
python manage.py shell -c "
from filings.services.retrieval import dense_search
for r in dense_search('supply chain risk', top_k=3):
    print(f'{r.dense_score:.3f} {r.company_ticker} {r.section_name}: {r.text[:80]}...')
"
```

### Programmatic ingestion via the shared engine

```bash
python manage.py shell
```

```python
>>> from filings.services.ingest import ingest_from_url
>>> result = ingest_from_url(
...     "https://www.sec.gov/Archives/edgar/data/320193/000032019324000123/aapl-20240928.htm",
...     on_progress=print,
... )
>>> print(result)
IngestResult(filing_id=1, company_ticker='AAPL', chunk_count=412, ...)
```

### Check LLM provider config

```bash
python manage.py shell -c "
import os
print('LLM_PROVIDER      =', os.getenv('LLM_PROVIDER'))
print('OPENROUTER_MODEL  =', os.getenv('OPENROUTER_MODEL'))
print('KEY set           =', bool(os.getenv('OPENROUTER_API_KEY')))
"
```

## Frontend commands

Run from `frontend-ui/`.

```bash
npm run dev              # Dev server with hot reload
npm run build            # Production build
npm run start            # Serve the production build
npm run lint             # Run ESLint
```

If hot reload gets stuck:

```bash
rm -rf .next
npm run dev
```

Then hard-refresh the browser (`Cmd/Ctrl + Shift + R`).

## Related

* [API Reference](api.md) — HTTP endpoints for the same operations.
* [Filings Deep Dive → Ingestion](../filings-deep-dive/ingestion.md) — what `ingest_filings` actually does.
* [Filings Deep Dive → Evaluation](../filings-deep-dive/evals.md) — what `evaluate` measures.
