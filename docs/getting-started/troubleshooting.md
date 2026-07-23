# Troubleshooting

Common issues and their fixes. If your problem isn't here, open an issue on GitHub with the full error message.

## Backend

### `ModuleNotFoundError: No module named 'dj_database_url'` (or any dep)

Virtual environment isn't active, or dependencies weren't installed. From `backend/`:

```bash
source .venv/bin/activate
pip install -r requirements.txt
```

### `403 SEC.gov Denial of Service`

SEC blocks generic user-agents. Set `SEC_EDGAR_USER_AGENT` in `.env` to a real name + email, then restart the backend.

```bash
SEC_EDGAR_USER_AGENT=Your Name (your-real-email@example.com)
```

### `<PROVIDER>_API_KEY not set` on `/ask/`

`.env` isn't being loaded, or `LLM_PROVIDER` doesn't match the key you set. Check both, then restart the server after editing `.env`.

```bash
# Sanity check with venv active:
python manage.py shell -c "
import os
print('LLM_PROVIDER   =', os.getenv('LLM_PROVIDER'))
print('Key configured =', bool(os.getenv(os.getenv('LLM_PROVIDER','').upper()+'_API_KEY')))
"
```

### `502 llm_provider_error` in the UI

The LLM upstream returned an error. Check the JSON `detail` field for the actual message. Common causes:

| `detail` contains | Fix |
|---|---|
| `404` + "model unavailable" | Deprecated model slug — update `<PROVIDER>_MODEL` in `.env` |
| `401 Unauthorized` | API key wrong or expired — copy a fresh one |
| `402` / "insufficient credits" | Add credits, or switch to a free-tier slug |
| `429 Too Many Requests` | Free-tier rate limit — wait 60s or switch models |

### Ingest job stuck at `pending`

First ingest downloads the embedding model (`all-MiniLM-L6-v2`, ~90 MB from HuggingFace). Check the backend terminal — you'll see download progress. If you're offline, ingestion will hang here.

### `Ticker not found on EDGAR`

EDGAR only lists **US-registered public companies**. For a specific filing (including foreign private issuers on 20-F), use the URL-paste method instead.

### `Accession not found in recent submissions for CIK`

The URL you pasted points to an old filing (older than the last ~1000 submissions). Use the CLI path (`python manage.py ingest_filings`) which handles the full submission history.

## Frontend

### "Failed to fetch" error banner

Backend isn't running, `NEXT_PUBLIC_API_URL` is wrong, or CORS is misconfigured. Check:

1. Backend responds: `curl http://localhost:8000/api/`
2. `frontend-ui/.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:8000/api`
3. `backend/.env` has `CORS_ALLOWED_ORIGINS=http://localhost:3000`

### Sidebar changes / new features not appearing

Next.js hot reload sometimes misses shared component changes. Force a clean rebuild:

```bash
# In the frontend terminal:
Ctrl+C
rm -rf .next
npm run dev
```

Then **hard-refresh** the browser:

* macOS: `Cmd + Shift + R`
* Windows/Linux: `Ctrl + Shift + R`

### Cards / borders invisible on a page

If a page looks stripped of styling, it may be using CSS variables that don't exist in the app's theme. Valid variables:

* Backgrounds: `--bg-primary`, `--bg-card`, `--bg-card-inner`, `--bg-muted`, `--bg-hover`, `--bg-sidebar`
* Borders: `--border-primary`, `--border-muted`
* Text: `--text-primary`, `--text-secondary`, `--text-muted`, `--text-dim`
* Accents: `--accent-primary`, `--accent-secondary`, `--accent-green`, `--accent-red`

## LLM

### Answers are all "I don't have enough information..."

Two possibilities:

* **Corpus is empty.** Check `curl http://localhost:8000/api/filings/health/` — if `"chunks":0`, ingest a filing first.
* **Retrieval scores below threshold.** Rare — the fix in `qa.py::_is_relevant` is score-aware. If it's still refusing, look at the raw retrieval:

```bash
curl "http://localhost:8000/api/filings/search/?q=risk%20factors&hybrid=1&rerank=1" | jq '.results[0:3]'
```

### LLM output isn't valid JSON

The LLM occasionally ignores the JSON output instruction. The QA pipeline has a fallback that salvages the text and attaches the top 3 retrieved chunks as citations — you'll still get a usable answer.

If it happens frequently, try a stronger model (`anthropic/claude-3.5-sonnet` or `openai/gpt-4o`) and re-run the eval.

## Environment

### Existing filings you want to remove

Two options:

**Per-filing delete from the UI** — hover any filing card on the Filings Research page → click the trash icon.

**Wipe everything from the shell:**

```bash
python manage.py shell -c "
from filings.models import Company, IngestJob
Company.objects.all().delete()   # cascades to Filings → Sections → Chunks
IngestJob.objects.all().delete()
print('Wiped.')
"
```

### Reset your dev database entirely

```bash
rm backend/db.sqlite3
python manage.py migrate
python manage.py createsuperuser
```

## Still stuck?

* Read the backend terminal — most errors log a full traceback there.
* Check the browser console (`Cmd/Ctrl + Option + I`) for frontend errors.
* Open a GitHub issue with the exact command, the error, and your `LLM_PROVIDER` value (**do not paste your API key**).
