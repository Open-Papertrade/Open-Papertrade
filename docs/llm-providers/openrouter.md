# OpenRouter (recommended)

## Why OpenRouter

**One API key gives you access to every major model** — Claude, GPT, Mistral, Llama, Gemini, DeepSeek, Qwen, and dozens more. Pay-as-you-go at each provider's published rate, or use free-tier slugs where available.

The best fit for this project because:

* The eval harness compares providers — one key covers all of them.
* Free-tier models let you smoke-test without any credit card.
* Model deprecations don't require signing up somewhere new — just change the slug.

## Setup

### 1. Get a key

1. Visit [**openrouter.ai/keys**](https://openrouter.ai/keys).
2. Sign in (Google, GitHub, or email).
3. Click **Create Key**, give it any name.
4. Copy the key — starts with `sk-or-v1-...`.

### 2. (Optional) top up credits

Free-tier slugs work without credits but are rate-limited and rotate frequently. For serious use, add $5 — that covers \~1000 questions on `openai/gpt-4o-mini`.

### 3. Configure `.env`

```bash
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-v1-your-key-here
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet

# Optional attribution (shows on OpenRouter's public leaderboard):
OPENROUTER_REFERER=https://open-papertrade.local
OPENROUTER_APP_TITLE=Open-Papertrade Filings
```

### 4. Restart the backend

```bash
# In your backend terminal:
Ctrl+C
python manage.py runserver
```

Verify:

```bash
curl http://localhost:8000/api/filings/health/
# → "llm_providers": ["openrouter"]
```

## Choosing a model

Model slugs are OpenRouter-specific — they include the provider prefix. Browse the full catalog at [**openrouter.ai/models**](https://openrouter.ai/models).

### Currently recommended (as of writing — always verify pricing on their site)

| Slug                             | Approx. cost per 1000 questions | Use case                            |
| -------------------------------- | ------------------------------- | ----------------------------------- |
| `anthropic/claude-3.5-sonnet`    | \~$3.00                         | Best quality, best refusal behavior |
| `anthropic/claude-3.5-haiku`     | \~$0.80                         | Fast, still strong                  |
| `openai/gpt-4o`                  | \~$5.00                         | GPT-4 class, structured outputs     |
| `openai/gpt-4o-mini`             | **\~$0.30**                     | Best price/performance sweet spot   |
| `mistralai/mistral-large-latest` | \~$1.20                         | Balanced middle ground              |
| `google/gemini-2.0-flash`        | \~$0.30                         | Google's fast tier                  |

### Free-tier slugs (subject to change)

| Slug                                    | Notes               |
| --------------------------------------- | ------------------- |
| `meta-llama/llama-3.1-8b-instruct:free` | Solid all-round     |
| `google/gemma-2-9b-it:free`             | Google's open model |
| `mistralai/mistral-7b-instruct:free`    | Small but sharp     |
| `qwen/qwen-2.5-7b-instruct:free`        | Good at JSON output |

Free-tier availability rotates. Check `openrouter.ai/models?fmt=table&order=pricing-low-to-high` for the current list.

## Cost estimation for this project

Each Filings Research question makes **one LLM call** (single-shot) or **N+1 calls** (agent mode with N sub-questions). Retrieval and embedding are local and free.

| Task                           | Model                                   | Approx. cost |
| ------------------------------ | --------------------------------------- | ------------ |
| Single question                | `anthropic/claude-3.5-sonnet`           | \~$0.003     |
| Single question                | `openai/gpt-4o-mini`                    | \~$0.0003    |
| Single question                | `meta-llama/llama-3.1-8b-instruct:free` | $0.00        |
| Agent question (3 sub-Qs)      | `anthropic/claude-3.5-sonnet`           | \~$0.012     |
| Full eval run (\~40 questions) | `anthropic/claude-3.5-sonnet`           | \~$0.15      |
| Full eval run (\~40 questions) | `openai/gpt-4o-mini`                    | \~$0.015     |

Ingestion is **free regardless of model choice** — the LLM is only invoked at query time.

## A/B testing across providers

Because the LLM is behind a common interface, sweeping providers is trivial. Change `.env`, restart, re-run the eval:

```bash
# Config 1
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet python manage.py evaluate --hybrid --rerank --out claude.json

# Config 2
OPENROUTER_MODEL=openai/gpt-4o-mini python manage.py evaluate --hybrid --rerank --out gpt.json

# Config 3
OPENROUTER_MODEL=mistralai/mistral-large-latest python manage.py evaluate --hybrid --rerank --out mistral.json

# Compare
jq '.answer.faithfulness_rate, .answer.refusal_accuracy' claude.json gpt.json mistral.json
```

That produces a real cross-model comparison table for the cost of running the eval three times.

## Common errors

| Error                                | Cause                           | Fix                                                        |
| ------------------------------------ | ------------------------------- | ---------------------------------------------------------- |
| `401 Unauthorized`                   | Key wrong or revoked            | Get a fresh key at `openrouter.ai/keys`                    |
| `402 Payment Required`               | No credits + non-free slug      | Top up, or switch to a `:free` slug                        |
| `404` + "model unavailable for free" | The `:free` slug was deprecated | Check `openrouter.ai/models`, pick a currently-active slug |
| `429 Too Many Requests`              | Free-tier rate limit            | Wait 60s or switch models                                  |
| `503 Service Unavailable`            | Upstream provider is down       | Try a different model (different upstream)                 |

The `/ask/` endpoint catches these and returns a friendly `502 llm_provider_error` with the actual OpenRouter message in the `detail` field — you'll see it in the UI's error banner.

## Attribution (optional but nice)

If you set:

```bash
OPENROUTER_REFERER=https://your-project.com
OPENROUTER_APP_TITLE=Your App Name
```

Your app appears on OpenRouter's public model-usage leaderboard. Not required — the API works without these headers.

## Related

* [Overview](overview.md) — how the LLM abstraction works.
* [Environment Variables](../reference/environment-variables.md) — full env reference.
* [Evaluation Harness](../filings-deep-dive/evals.md) — cross-provider A/B methodology.
