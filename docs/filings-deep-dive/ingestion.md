# Ingestion Pipeline

<p align="center">
  <img src="../.gitbook/assets/demo-placeholder.svg" alt="Ingestion Pipeline — demo video coming soon" width="720" />
</p>
<p align="center"><sub><strong>🎬 Demo: Ingestion in action</strong> — placeholder (recording coming soon)</sub></p>

## Two entry points, one processing engine

Ingestion has two triggers:

1. **CLI** — `python manage.py ingest_filings AAPL NVDA TSLA --form 10-K`. Blocks the terminal, writes to stdout.
2. **UI** — user pastes an SEC URL → `POST /api/filings/ingest/` → `IngestJob` row created → background worker picks it up → status polled via `GET /api/filings/ingest/status/<id>/`.

Both call the same core function, `services/ingest.py::process_filing()`. Same code path → identical DB rows regardless of trigger.

## The seven stages

```
    ┌─────────────────────────────────────────────────────────────────┐
    │  1. Resolve identity   (ticker/URL → CIK + accession + form)    │
    │  2. Fetch HTML         (SEC EDGAR, rate-limited)                │
    │  3. Parse sections     (Item 1A, MD&A, …) from HTML             │
    │  4. Chunk each section (~400-token windows, 50-token overlap)   │
    │  5. Batch-embed        (sentence-transformers, one call)        │
    │  6. Store atomically   (Filing + Sections + Chunks in one txn)  │
    │  7. Housekeeping       (invalidate BM25 cache, update job)      │
    └─────────────────────────────────────────────────────────────────┘
```

## Stage 1 — Resolve identity

### CLI path (starts from ticker)

```
"AAPL"  →  edgar.resolve_ticker()   → CIK "0000320193" + name "Apple Inc."
CIK     →  edgar.list_filings()     → [FilingRef(accession, filed_date, form, primary_document), ...]
```

`resolve_ticker` hits `sec.gov/files/company_tickers.json` — a single JSON file mapping tickers to CIKs.

### URL path (starts from URL)

```
"https://www.sec.gov/Archives/edgar/data/320193/000032019324000123/aapl-20240928.htm"
      ↓ edgar.parse_sec_url()          (regex on URL path)
ParsedSecUrl(cik="0000320193", accession_number="0000320193-24-000123", primary_document="aapl-20240928.htm")
      ↓ edgar.get_submissions(cik)    (one call — gives both company info AND filing metadata)
      ↓ edgar.find_filing_ref(cik, accession, submissions=...)
FilingRef(...)
```

**One-call optimization**: the submissions API returns both company info + filing history. We fetch once and extract both — avoiding an extra call under SEC's 10-req/sec cap.

## Stage 2 — Fetch HTML

```python
url = f'{SEC_HOST}/Archives/edgar/data/{cik_int}/{accession_nodash}/{primary_document}'
html = edgar._get(url).text
```

Three details make this bulletproof:

### Rate limiting

SEC caps at **10 requests/sec per IP**. Exceed it → soft-ban for minutes to hours.

```python
_MIN_INTERVAL_S = 0.11   # 110ms → ~9 req/sec, safely under cap
_rate_lock = threading.Lock()

def _get(url, host_override=None):
    with _rate_lock:                              # thread-safe (critical for the URL-paste worker)
        delta = time.time() - _last_request_ts
        if delta < _MIN_INTERVAL_S:
            time.sleep(_MIN_INTERVAL_S - delta)
        resp = requests.get(url, headers=..., timeout=30)
        _last_request_ts = time.time()
    resp.raise_for_status()
    return resp
```

The `threading.Lock` matters because the URL-paste worker runs in a separate thread. Without it, two threads could burst two requests in the same millisecond.

### User-Agent

SEC blocks `python-requests/2.x` and similar generic UAs. Required header:

```python
'User-Agent': settings.SEC_EDGAR_USER_AGENT
# e.g. "Open-Papertrade Research (contact@example.com)"
```

### Host header

SEC uses two hostnames:

* `www.sec.gov` — the document archive.
* `data.sec.gov` — the JSON API (submissions, ticker lookup).

The `Host` header must match — `_get()` accepts `host_override='data.sec.gov'` where needed.

## Stage 3 — Parse HTML into named sections

10-K filings share a mandated table of contents. `parser.py` uses `ITEM_MAP` to map Item codes to human names:

* Item 1 → Business
* Item 1A → Risk Factors
* Item 7 → Management's Discussion and Analysis (MD&A)
* … etc.

### The algorithm

1. **Strip HTML → plain text** via BeautifulSoup. Preserves paragraph breaks; drops tags, scripts, styles.
2. **Find section boundaries** — regex `^\s*item\s+(\d{1,2}[A-C]?)[\.\:\s]` at line starts (multiline). Matches "Item 7.", "Item 7A:", "ITEM  7 ".
3. **Deduplicate** — 10-Ks mention "Item 1A" twice: once in the ToC, once at the actual section. Keep the **last** occurrence (that's the section body).
4. **Split by position** — slice `text[pos_i : pos_i+1]` for each match.
5. **Drop fragments** — anything under 200 chars is a stray ToC reference or artifact.
6. **Fallback** — if parsing fails (unusual layout), produce a single `Section(name="Full Document")` with the whole text. Better a degraded index than no index.

Output: `[ParsedSection(name, order, text)]`.

## Stage 4 — Chunk each section

`chunker.py::chunk_text(text, chunk_tokens=400, overlap_tokens=50)`:

```python
tokens = re.findall(r'\S+', text)        # whitespace tokenization — rough but fast
step = chunk_tokens - overlap_tokens     # 400 - 50 = 350
for i in range(0, len(tokens), step):
    window = tokens[i : i + chunk_tokens]
    yield Chunk(text=..., char_start=..., char_end=..., token_count=len(window))
```

### Overlap

The last 50 tokens of chunk N are the first 50 of chunk N+1. That's ~12.5% duplicated content in exchange for robustness — sentences that span a boundary appear in at least one chunk.

### Preserved offsets

Each chunk carries `char_start` and `char_end` into the parent section text. **This is what makes citations traceable.** See [Architecture](architecture.md#4-every-citation-traces-to-a-stored-chunk-row-with-char_start--char_end) for why.

### Known limitations

* Not sentence-aware (splits mid-sentence at token 400).
* Not table-aware (tables get flattened into whitespace-separated tokens).

Both are listed in IDEA.md §16 as future work. The eval harness makes upgrades measurable.

## Stage 5 — Batch-embed

```python
model = _MODEL_CACHE.get(name) or SentenceTransformer(name)
_MODEL_CACHE[name] = model
vecs = model.encode(
    chunk_texts,
    batch_size=32,
    normalize_embeddings=True,
    convert_to_numpy=True,
).astype(np.float32)
```

### Model caching

Loading `all-MiniLM-L6-v2` costs ~2 seconds and ~120 MB RAM. `_MODEL_CACHE[name] = model` keeps it alive across every call in the process. First ingestion pays the load cost once; all subsequent calls are free.

### Batch encoding

Every chunk from every section goes into a **single** `model.encode(list_of_texts)` call — not one call per chunk. This is 5–20× faster.

### Normalization

`normalize_embeddings=True` produces unit-length vectors. Cosine similarity then reduces to a plain dot product (`a · b`), which is a single matmul across the whole matrix. Big simplification, no accuracy loss.

### Storage

Each vector: `float32` (4 bytes) × 384 dims = **1.5 KB**. Stored as raw bytes in `Chunk.embedding` (a `BinaryField`). Comparison vs. JSON:

| Format | Bytes per chunk | 10k chunks |
|---|---|---|
| `float32` bytes | 1,536 | 15 MB |
| JSON string | ~9,000 | 90 MB |

## Stage 6 — Store atomically

```python
with transaction.atomic():
    filing = Filing.objects.create(...)          # 1 row
    for sec in parsed_sections:
        Section.objects.create(...)              # N rows (~15-20)
    Chunk.objects.bulk_create([                   # one INSERT for all chunks
        Chunk(...) for ch in flat_chunks
    ], batch_size=200)
```

* **Atomic** — if embedding fails halfway, no partial write. Retry cleanly.
* **`bulk_create`** — one INSERT instead of 400 round-trips. ~100ms vs. ~80 seconds.

## Stage 7 — Housekeeping

```python
from .bm25 import invalidate_cache
invalidate_cache()

# For URL-paste ingestion only:
IngestJob.objects.filter(id=job_id).update(
    status='success', chunk_count=..., finished_at=now(),
)
```

The BM25 cache is per-process in-memory. Invalidating it forces the next BM25 query to rebuild from the DB, picking up the new chunks.

## Total time

For one 10-K:

| Stage | Time |
|---|---|
| 1–2. Identity + fetch | 3–10s |
| 3. Parse HTML | 1–3s |
| 4. Chunk | < 1s |
| **5. Embed** (CPU) | **20–100s** ← the tall pole |
| 6. Store | < 1s |

Total: **30–120 seconds per filing**. Which is exactly why ingestion must never be in the request path.

## The full flow, end-to-end

```
                    ┌──────────────────────────────────────┐
                    │  User pastes URL   OR   CLI command  │
                    └───────────────────┬──────────────────┘
                                        │
                        ┌───────────────┴───────────────┐
                        │                                │
                        ▼                                ▼
         POST /api/filings/ingest/         python manage.py ingest_filings
                        │                                │
                        │                                │
        Create IngestJob(pending)                  For each ticker:
        ThreadPoolExecutor.submit()              resolve_ticker() → CIK
                        │                                │
                        └────────────────┬───────────────┘
                                         ▼
       ┌─────────────────────────────────────────────────────────┐
       │  1  Resolve identity                                     │
       │  2  Fetch HTML  (rate-limited, threading lock)           │
       │  3  Parse sections                                       │
       │  4  Chunk (400-token windows, 50-token overlap)          │
       │  5  Batch-embed ALL chunks (one call)                    │
       │  6  Store atomically                                     │
       │  7  Invalidate BM25 cache + update job                   │
       └─────────────────────────────────────────────────────────┘
                                         │
                                         ▼
                                Ready to answer.
```

## Related

* [Architecture](architecture.md) — how ingestion fits in the whole system.
* [Retrieval](retrieval.md) — what happens to the chunks once they're stored.
