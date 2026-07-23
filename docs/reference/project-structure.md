# Project Structure

Repo layout, top to bottom.

## Top level

```
Open-Papertrade/
├── backend/                    Django REST API
├── frontend-ui/                Next.js frontend
├── docs/                       This GitBook
├── icons/                      App icons + branding
├── readme/                     Extra guides (AI Coach, Backtesting, Trading KB, ideas)
├── README.md                   Repo-level README
├── LICENSE                     AGPL-3.0
├── CONTRIBUTING.md
└── demo.gif                    Product demo
```

## Backend layout (`backend/`)

```
backend/
├── manage.py
├── requirements.txt
├── db.sqlite3                  Local dev DB (gitignored)
├── .env / .env.example         Runtime config
├── config/                     Django project config
│   ├── settings.py
│   ├── urls.py
│   ├── middleware.py
│   ├── wsgi.py / asgi.py
├── users/                      Auth + trading + AI Coach + social
│   ├── models.py               UserProfile, Holding, Trade, Watchlist, Alert,
│   │                           Achievement, Friendship, CopyRelationship, ...
│   ├── auth_views.py           Signup, login, refresh, verify, 2FA
│   ├── security_views.py       Forgot/reset password
│   ├── coaching/               AI Coach pattern detection + scoring
│   ├── backtesting/            Strategy execution engine
│   ├── authentication.py       CookieJWTAuthentication
│   ├── maintenance_middleware.py
│   └── ...
├── stocks/                     Market data + charts
│   ├── models.py               Quote cache
│   ├── services/               Provider abstraction (Finnhub / Yahoo)
│   │   ├── base_provider.py
│   │   ├── finnhub_provider.py
│   │   ├── yahoo_provider.py
│   │   └── stock_service.py    Orchestrates fallback
│   └── views.py
├── filings/                    Filings Research (agentic RAG)
│   ├── models.py               Company, Filing, Section, Chunk, IngestJob
│   ├── admin.py                Django-Unfold admin for all four models
│   ├── views.py                DRF endpoints (/health, /companies,
│   │                           /filings, /search, /ask, /ingest)
│   ├── serializers.py
│   ├── urls.py
│   ├── migrations/
│   ├── services/
│   │   ├── edgar.py            SEC EDGAR HTTP client (rate-limited, URL parser)
│   │   ├── parser.py           HTML → sections (Item 1A, MD&A, …)
│   │   ├── chunker.py          Sliding-window token chunking
│   │   ├── embeddings.py       sentence-transformers wrapper + caching
│   │   ├── retrieval.py        dense_search + search() orchestrator
│   │   ├── bm25.py             BM25 index + per-filter cache
│   │   ├── fusion.py           Reciprocal Rank Fusion
│   │   ├── rerank.py           Cross-encoder rerank
│   │   ├── prompts.py          GROUNDED_QA_SYSTEM + formatters
│   │   ├── qa.py               Single-shot QA pipeline
│   │   ├── planner.py          Query decomposition (agent step 1)
│   │   ├── agent.py            Multi-step agent (plan → answer → synth)
│   │   ├── ingest.py           Shared ingestion engine
│   │   ├── ingest_worker.py    Background thread runner for URL-paste ingest
│   │   └── llm/                Provider adapters
│   │       ├── base.py         BaseLLMProvider, LLMMessage, LLMResponse
│   │       ├── openai_compatible.py    Shared OpenAI-schema client
│   │       ├── anthropic_provider.py
│   │       ├── openai_provider.py
│   │       ├── openrouter_provider.py
│   │       ├── mistral_provider.py
│   │       ├── ollama_provider.py
│   │       ├── local_provider.py
│   │       └── registry.py     get_provider(name) factory
│   ├── evals/
│   │   ├── data/
│   │   │   ├── retrieval_gold.json
│   │   │   └── answers_gold.json
│   │   ├── metrics.py          recall@k, MRR aggregation
│   │   └── judge.py            LLM-as-judge prompt + parser
│   └── management/commands/
│       ├── ingest_filings.py   `python manage.py ingest_filings ...`
│       └── evaluate.py         `python manage.py evaluate ...`
└── static/                     Django static assets
```

## Frontend layout (`frontend-ui/`)

```
frontend-ui/
├── package.json
├── next.config.ts
├── tsconfig.json
├── .env.local / .env.example   Frontend env (just NEXT_PUBLIC_API_URL)
├── public/                     Static assets served at the root
└── src/
    ├── app/                    Next.js App Router — one dir per route
    │   ├── layout.tsx
    │   ├── page.tsx            Dashboard
    │   ├── markets/
    │   ├── chart/
    │   ├── portfolio/
    │   ├── trade/
    │   ├── history/
    │   ├── watchlist/
    │   ├── reports/
    │   ├── backtesting/
    │   ├── coaching/           AI Coach
    │   ├── filings/            Filings Research
    │   ├── copy-trading/
    │   ├── leaderboard/
    │   ├── friends/
    │   ├── trader/[id]/        Public trader profiles
    │   ├── account/
    │   ├── login/
    │   ├── signup/
    │   ├── verify-email/
    │   ├── forgot-password/
    │   ├── reset-password/
    │   ├── maintenance/
    │   └── api/                Any client-side helper routes
    ├── components/
    │   ├── Sidebar.tsx
    │   ├── PageHeader.tsx
    │   ├── SearchModal.tsx
    │   ├── QuickSettings.tsx
    │   ├── ConnectionStatus.tsx
    │   ├── AchievementToast.tsx / XpToast.tsx
    │   ├── StockChart.tsx / ChartCard.tsx / MetricCard.tsx
    │   ├── coaching/           AI Coach sub-components (chat, radar, cards)
    │   ├── backtesting/
    │   ├── copy-trading/
    │   ├── reports/
    │   ├── chart/
    │   └── TransactionItem.tsx / StockNews.tsx
    ├── context/
    │   ├── AuthContext.tsx
    │   └── PortfolioContext.tsx
    ├── lib/
    │   ├── api.ts              Fetch helpers + shared types
    │   ├── utils.ts
    │   ├── indicators.ts       Technical indicators (RSI, MACD, ...)
    │   ├── patterns.ts         Chart pattern detection
    │   └── services/
    ├── config/
    │   └── app.ts              APP_CONFIG constants
    └── types/                  Global TypeScript types
```

## docs/ (this GitBook)

```
docs/
├── README.md                       Landing page
├── SUMMARY.md                      Sidebar TOC
├── .gitbook.yaml                   GitBook config
├── .gitbook/
│   └── assets/
│       └── demo-placeholder.svg    Shared demo-video placeholder
├── getting-started/
├── features/
├── filings-deep-dive/
├── llm-providers/
├── reference/                      (you are here)
└── contributing.md
```

## Design notes

* **Feature-per-app**: `stocks/`, `users/`, `filings/` are separate Django apps. Each owns its own models, views, URLs, and services. Cross-app imports are narrow (mostly the `filings.services.llm` package, reused by AI Coach and chart analysis).
* **Service layer everywhere**: HTTP-facing views are thin. Business logic lives in `services/` modules that are testable in isolation and reusable from management commands.
* **Provider abstraction is single-file**: `filings/services/llm/base.py` defines `BaseLLMProvider`, and every provider adapter is <60 lines.
* **No framework lock-in for retrieval**: the RAG pipeline uses NumPy, `rank_bm25`, and `sentence-transformers` directly — no LangChain, no LlamaIndex. Every line of retrieval logic is inspectable.

## Related

* [Environment Variables](environment-variables.md)
* [API Reference](api.md)
* [CLI Commands](cli-commands.md)
