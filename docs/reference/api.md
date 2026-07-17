# API Reference

Every REST endpoint in the app. Base URL: `http://localhost:8000/api/` in dev.

Auth: most endpoints require the `access_token` cookie (issued on login). Public endpoints are marked `AllowAny`.

## Auth

### `POST /auth/signup/`
Create a new user account.

### `POST /auth/login/`
Log in with email + password. Issues `access_token` and `refresh_token` cookies.

### `POST /auth/refresh/`
Rotate the access token.

### `POST /auth/logout/`
Clear the auth cookies.

### `GET /auth/me/`
Current user profile.

### `POST /auth/verify-email/`
Verify email via signed token.

### `POST /auth/2fa/verify/`
Verify a TOTP 2FA code during login.

### `POST /auth/forgot-password/` + `POST /auth/reset-password/`
Password reset flow.

## Stocks & market data

### `GET /stocks/quote/<symbol>/`
Real-time quote for a symbol.

### `POST /stocks/quotes/`
Bulk quotes. Body: `{"symbols": ["AAPL", "NVDA", ...]}`.

### `GET /stocks/search/?q=<query>`
Symbol search across US stocks + crypto.

### `GET /stocks/profile/<symbol>/`
Company profile / metadata.

### `GET /stocks/popular/`
Trending / most-active symbols.

### `GET /stocks/crypto/`
Crypto quotes.

### `GET /stocks/status/`
Provider health and market open/close.

## Users — profile & settings

### `GET /users/profile/`, `PATCH /users/profile/`
Fetch/update your profile.

### `GET /users/settings/`, `PATCH /users/settings/`
User preferences (currency, market, theme).

### `GET /users/stats/`
Aggregate stats (return, win rate, XP, rank).

### `GET /users/achievements/`
Your unlocked achievements.

## Users — trading

### `GET /users/holdings/`
Current portfolio holdings.

### `GET /users/trades/`
Trade history.

### `POST /users/trades/execute/`
Place a trade. Body: `{"symbol": "AAPL", "quantity": 10, "side": "buy", "order_type": "market"}`.

### `GET /users/watchlist/`, `POST /users/watchlist/`
Watchlist management.

### `GET /users/alerts/`, `POST /users/alerts/`
Price alerts.

### `POST /users/reset/`
Reset your virtual portfolio to starting state.

## AI Coach

### `GET /users/coaching/dashboard/`
Bundled coaching data — portfolio summary, patterns, scores, tips, LLM availability, model.

### `POST /users/coaching/chat/`
Interactive chat with the AI Coach. Body: `{"message": "...", "history": [...]}`.

## Copy Trading

### `GET /users/copy/leaders/`
Discoverable leader accounts.

### `POST /users/copy/follow/`
Follow a leader. Body: `{"leader_id": ..., "copy_percentage": 100, ...}`.

### `DELETE /users/copy/follow/<id>/`
Unfollow.

## Filings Research

### `GET /filings/health/`
`{status, companies, filings, llm_providers}`.

### `GET /filings/companies/`
List of ingested companies with filing counts.

### `GET /filings/filings/?ticker=<optional>`
List of ingested filings with chunk/section counts.

### `DELETE /filings/filings/<id>/`
Delete a filing (cascades to sections + chunks). If it was the last filing for a company, the company is removed too.

### `GET /filings/search/?q=<query>&hybrid=1&rerank=1&top_k=10&ticker=<optional>`
Retrieval only — returns chunks with score breakdown (dense, sparse, rerank, fused).

### `POST /filings/ask/`
Full QA pipeline. Body:
```json
{
  "question": "...",
  "hybrid": true,
  "rerank": true,
  "agent": false,
  "provider": "openrouter",       // optional per-request override
  "model": "openai/gpt-4o-mini",  // optional
  "tickers": ["AAPL"]              // optional filter
}
```

Response (single-shot):
```json
{
  "question": "...",
  "answer": "...",
  "declined": false,
  "confidence": "medium",
  "citations": [
    {"index": 1, "chunk_id": ..., "company_ticker": "AAPL", "filing_form": "10-K", "filing_date": "2024-11-01", "section_name": "Risk Factors", "snippet": "...", "source_url": "https://sec.gov/...", "score": 0.87},
    ...
  ],
  "usage": {"provider": "openrouter", "model": "anthropic/claude-3.5-sonnet", "input_tokens": 3247, "output_tokens": 412}
}
```

Response (agent mode) — same shape plus a `trace` object with the sub-questions.

Errors:
* `400 {"error": "question is required"}` — empty body.
* `502 {"error": "llm_provider_error", "detail": "...", "hint": "..."}` — LLM upstream failed.

### `POST /filings/ingest/`
Enqueue a URL ingestion. Body: `{"url": "https://www.sec.gov/Archives/..."}`.

Response `202`:
```json
{"id": 3, "url": "...", "status": "pending", "created_at": "..."}
```

Throttled at `10/hour` per client.

### `GET /filings/ingest/status/<job_id>/`
Poll job status. Response:
```json
{
  "id": 3,
  "status": "success",           // pending | running | success | failed
  "progress": "Embedding 412 chunks",
  "chunk_count": 412,
  "section_count": 19,
  "filing": { "id": 4, "company_ticker": "AAPL", ... },
  "started_at": "...",
  "finished_at": "..."
}
```

### `GET /filings/ingest/jobs/?limit=20`
Recent ingest jobs (most recent first).

## Admin

### `/admin/`
Django-Unfold admin dashboard. Log in with a superuser account.

## Public

### `GET /`
API root with an endpoint index.

### `GET /maintenance-status/`
Public maintenance-mode check.

## Auth model

Cookie-based JWT:
* `access_token` — 30 min, sent on every `/api/*` request.
* `refresh_token` — 7 days, path-restricted to `/api/auth/`.
* `auth_active` — non-HTTPOnly flag cookie for the frontend to know "you're logged in" without reading the JWT.

CSRF is handled via SameSite=Lax cookies + explicit CORS allowlist. No CSRF token required for API calls from the configured frontend origin.

## Related

* [Environment Variables](environment-variables.md) — how to configure the server.
* [CLI Commands](cli-commands.md) — non-HTTP ways to interact.
