# Environment Variables

Complete reference of every configurable variable. Backend goes in `backend/.env`. Frontend goes in `frontend-ui/.env.local`.

## Backend (`backend/.env`)

### Django core

| Variable | Description | Required |
|---|---|---|
| `DEBUG` | `True` in dev, `False` in prod | Yes |
| `SECRET_KEY` | Django secret key — a long random string | Yes |
| `ALLOWED_HOSTS` | Comma-separated hostnames | Yes |
| `CORS_ALLOWED_ORIGINS` | Frontend origin(s), comma-separated | Yes |

### Database (production)

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | Postgres connection string. SQLite is used automatically in dev. | Prod only |

### Supabase (production storage)

| Variable | Description | Required |
|---|---|---|
| `SUPABASE_URL` | Supabase project URL | Prod only |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key | Prod only |
| `SUPABASE_STORAGE_BUCKET` | Bucket for user avatars (default `avatars`) | Prod only |

### Market data

| Variable | Description | Required |
|---|---|---|
| `FINNHUB_API_KEY` | Real-time market data ([finnhub.io](https://finnhub.io/)). Falls back to Yahoo Finance if absent. | No |

### SEC EDGAR (Filings feature)

| Variable | Description | Required |
|---|---|---|
| `SEC_EDGAR_USER_AGENT` | Identifies you to SEC. Format: `Your Name (email@example.com)`. SEC blocks generic UAs. | For Filings feature |

### LLM — provider selection

| Variable | Description | Required |
|---|---|---|
| `LLM_PROVIDER` | Which provider to use: `anthropic` / `openai` / `openrouter` / `mistral` / `ollama` / `local` | For any LLM feature |
| `LLM_MODEL` | Generic model override — used only if the per-provider `<PROVIDER>_MODEL` isn't set | No |

### LLM — Anthropic

| Variable | Description | Required |
|---|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key (`sk-ant-...`) | If `LLM_PROVIDER=anthropic` |
| `ANTHROPIC_MODEL` | e.g. `claude-sonnet-5`. Defaults to `claude-sonnet-5`. | No |

### LLM — OpenAI

| Variable | Description | Required |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI API key (`sk-proj-...`) | If `LLM_PROVIDER=openai` |
| `OPENAI_MODEL` | e.g. `gpt-4o-mini`. Defaults to `gpt-4o-mini`. | No |

### LLM — OpenRouter

| Variable | Description | Required |
|---|---|---|
| `OPENROUTER_API_KEY` | OpenRouter API key (`sk-or-v1-...`) | If `LLM_PROVIDER=openrouter` |
| `OPENROUTER_MODEL` | Full slug, e.g. `anthropic/claude-3.5-sonnet`. Browse at [openrouter.ai/models](https://openrouter.ai/models). | No |
| `OPENROUTER_REFERER` | Attribution URL (shown on OpenRouter's public leaderboard) | No |
| `OPENROUTER_APP_TITLE` | Attribution title | No |

### LLM — Mistral

| Variable | Description | Required |
|---|---|---|
| `MISTRAL_API_KEY` | Mistral API key | If `LLM_PROVIDER=mistral` |
| `MISTRAL_MODEL` | e.g. `mistral-large-latest` | No |

### LLM — Ollama (local)

| Variable | Description | Required |
|---|---|---|
| `OLLAMA_BASE_URL` | Ollama server URL. Default: `http://localhost:11434` | If `LLM_PROVIDER=ollama` |
| `OLLAMA_MODEL` | Pulled model name, e.g. `llama3.1:8b` | No |

### LLM — Local OpenAI-compatible

| Variable | Description | Required |
|---|---|---|
| `LOCAL_LLM_BASE_URL` | OpenAI-compat endpoint (LM Studio `:1234/v1`, vLLM `:8000/v1`, llama.cpp `:8080/v1`) | If `LLM_PROVIDER=local` |
| `LOCAL_MODEL` | Model identifier the server expects | No |
| `LOCAL_LLM_API_KEY` | Optional token if the local server requires it | No |

### Filings feature — tuning

| Variable | Description | Default |
|---|---|---|
| `FILINGS_EMBEDDING_MODEL` | Embedding model name for ingestion + retrieval | `sentence-transformers/all-MiniLM-L6-v2` |
| `FILINGS_CHUNK_TOKENS` | Chunk size in whitespace tokens | `400` |
| `FILINGS_CHUNK_OVERLAP` | Overlap between adjacent chunks | `50` |
| `FILINGS_RERANKER_MODEL` | Cross-encoder for rerank | `cross-encoder/ms-marco-MiniLM-L-6-v2` |

## Frontend (`frontend-ui/.env.local`)

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Backend base URL | `http://localhost:8000/api` |

That's the whole frontend config — the app is intentionally close to zero-config on the client side.

## Example `.env` for OpenRouter

The minimal working config:

```bash
DEBUG=True
SECRET_KEY=change-this-to-a-long-random-string
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000

SEC_EDGAR_USER_AGENT=Your Name (you@example.com)

LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
```

Everything else uses sensible defaults.

## Precedence rules

**Model resolution** (highest priority first):

1. `model=...` passed at call time (e.g., in the `/ask` request body).
2. `<PROVIDER>_MODEL` env var (e.g. `OPENROUTER_MODEL`).
3. `LLM_MODEL` env var — generic fallback.
4. The adapter's baked-in `default_model`.

**Provider resolution**:

1. `provider=...` passed at call time.
2. `LLM_PROVIDER` env var.
3. Defaults to `anthropic` if nothing is set (but requires the key).

## License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

| Action | Allowed? | Notes |
|---|---|---|
| **Use** | ✅ | Personal, educational, or commercial. |
| **Modify** | ✅ | Modify freely for your own use. |
| **Distribute** | ✅ | Must provide source under AGPL-3.0. |
| **Sell / commercial use** | ✅ | Allowed — modifications must remain open source. |
| **Host as SaaS / network use** | ✅ | Must make modified source code available to users. |
| **Private internal use** | ✅ | Use internally without sharing code. |
| **Relicense as proprietary** | ❌ | AGPL forbids closed-source relicensing. |
| **Warranty / liability** | ⚠️ None | Software provided "as-is". |

Full text: [GNU AGPLv3](https://www.gnu.org/licenses/agpl-3.0.html).
