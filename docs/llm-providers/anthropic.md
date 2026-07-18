# Anthropic

## Why Anthropic

Best-in-class instruction-following and refusal behavior in this project's evals. If you want the highest-quality Filings Research answers _and_ the most honest refusals, Anthropic is the reference point.

## Setup

### 1. Get a key

1. Visit [**console.anthropic.com/settings/keys**](https://console.anthropic.com/settings/keys).
2. Sign up (new accounts get $5 free credit).
3. Create a key — starts with `sk-ant-api03-...`.

### 2. Configure `.env`

```bash
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
ANTHROPIC_MODEL=claude-sonnet-5
```

### 3. Restart the backend

```bash
Ctrl+C
python manage.py runserver
```

Verify:

```bash
curl http://localhost:8000/api/filings/health/
# → "llm_providers": ["anthropic"]
```

## Model choices

| Model                       | Approx. cost per 1000 questions | Use case                                    |
| --------------------------- | ------------------------------- | ------------------------------------------- |
| `claude-opus-4-8`           | \~$15                           | Highest quality, most expensive             |
| `claude-sonnet-5`           | \~$3                            | **Recommended** — best quality/cost balance |
| `claude-haiku-4-5-20251001` | \~$0.80                         | Fast, still very good                       |

For this project, `claude-sonnet-5` hits the sweet spot — near-Opus quality on grounded QA, at 5× cheaper.

## Notes

* **Free credit**: new accounts get $5 → \~1,600 questions on Sonnet, \~20,000 on Haiku.
* **Refusal behavior**: Anthropic models are the most likely to output the exact refusal string when they should. Highest refusal accuracy in our eval.
* **Prompt caching**: Anthropic supports prompt caching (\~90% cheaper on cached tokens). Not currently used in the code, but the abstraction supports passing `cache_control=True` via `**kwargs` if you want to add it.

## Related

* [Overview](overview.md) — how the LLM abstraction works.
* [OpenRouter](openrouter.md) — access Anthropic models plus dozens more with one key.
