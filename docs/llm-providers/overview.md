# Overview

<p align="center"><sub><strong>🎬 Walkthrough: Switching providers</strong> — placeholder (recording coming soon)</sub></p>

## Six providers, one interface

Every AI feature — AI Coach, chart analysis, Filings Research — talks to LLMs through a single interface (`backend/filings/services/llm/`). Six adapters ship out of the box:

<table data-view="cards"><thead><tr><th></th><th></th><th data-hidden data-card-target data-type="content-ref"></th></tr></thead><tbody><tr><td><strong>🌐 OpenRouter (recommended)</strong></td><td>One key, hundreds of models — Claude, GPT, Mistral, Llama, Gemini, DeepSeek. Best for cost/quality A/B testing.</td><td><a href="openrouter.md">openrouter.md</a></td></tr><tr><td><strong>🤖 Anthropic</strong></td><td>Direct API. Strong instruction-following, honest refusals.</td><td><a href="anthropic.md">anthropic.md</a></td></tr><tr><td><strong>💬 OpenAI</strong></td><td>Standard hosted models. Widely documented, well-behaved on structured outputs.</td><td><a href="openai.md">openai.md</a></td></tr><tr><td><strong>🇫🇷 Mistral</strong></td><td>Direct Mistral API. Cheaper than GPT-4 class for many tasks.</td><td><a href="mistral.md">mistral.md</a></td></tr><tr><td><strong>🦙 Ollama (local)</strong></td><td>Fully local, zero cost. Ships with pull-and-run models.</td><td><a href="ollama.md">ollama.md</a></td></tr><tr><td><strong>⚙️ Local OpenAI-compatible</strong></td><td>LM Studio, vLLM, llama.cpp-server — any OpenAI-compatible endpoint.</td><td><a href="local.md">local.md</a></td></tr></tbody></table>

## How the abstraction works

```
                    ┌────────────────────────────────┐
                    │  qa.py / agent.py / coach.py   │
                    │       (no vendor names)        │
                    └───────────────┬────────────────┘
                                    │
                            get_provider(name)
                                    │
                                    ▼
                       BaseLLMProvider (abstract)
                                    │
        ┌───────────────────┬───────┴───────┬─────────────────┐
        │                   │               │                 │
  Anthropic         OllamaProvider   OpenAICompatibleProvider
  Provider                                  │
                        ┌───────────────┬───┴─────────────┬─────────────────┐
                        │               │                 │                 │
                    OpenAI          OpenRouter         Mistral         LocalOpenAI
```

Most hosted services (OpenAI, OpenRouter, Mistral, Together, Groq, Fireworks) speak the same `POST /v1/chat/completions` protocol. `OpenAICompatibleProvider` implements it once; the specific adapters just override `name`, `base_url`, `api_key_env`, and (optionally) `extra_headers`.

Anthropic and Ollama have their own APIs and get their own adapters.

## The interface

`BaseLLMProvider` is minimal on purpose:

```python
class BaseLLMProvider(ABC):
    @abstractmethod
    def complete(
        self,
        messages: Iterable[LLMMessage],
        *,
        model: Optional[str] = None,
        temperature: float = 0.0,
        max_tokens: int = 1024,
        system: Optional[str] = None,
        **kwargs,      # ← provider-specific features pass through here
    ) -> LLMResponse:
        ...
```

**Only five kwargs are guaranteed across providers**: `messages`, `model`, `temperature`, `max_tokens`, `system`. Everything else is provider-specific and passes through `**kwargs` — each adapter decides what to do with it.

Example: Anthropic's prompt caching, OpenAI's `response_format=json_schema`, Ollama's `num_ctx` — all supported via `**kwargs` without the interface knowing about them. Providers that don't understand a kwarg silently ignore it.

This is the deliberate choice to **avoid the lowest-common-denominator prison** — the interface exposes what every provider _does_, not the intersection of what every provider _supports_.

## Model resolution priority

When resolving which model to use, the registry checks in this order:

1. `model=...` passed at call time (e.g., per-request override in `/ask` body).
2. `<PROVIDER>_MODEL` env var (e.g. `OPENROUTER_MODEL`).
3. `LLM_MODEL` generic fallback env var.
4. The adapter's baked-in `default_model`.

So `.env` is the source of truth — set `<PROVIDER>_MODEL` and the whole system uses it, without any code changes.

## The response shape

Every provider returns the same normalized `LLMResponse`:

```python
@dataclass
class LLMResponse:
    text: str              # the generated content
    model: str             # the actual model that responded (may differ from requested)
    provider: str          # 'anthropic', 'openai', etc.
    input_tokens: int
    output_tokens: int
    finish_reason: str     # 'stop', 'length', 'content_filter', ...
    raw: dict              # full raw response for debugging

    @property
    def total_tokens(self) -> int:
        return self.input_tokens + self.output_tokens
```

This means:

* Cost accounting works uniformly.
* Debug logs are consistent.
* An admin dashboard can graph tokens/latency/cost by provider.

## Configure via `.env`

Pick one provider and set the corresponding vars. See individual provider pages for specifics.

```bash
# Which provider to use
LLM_PROVIDER=openrouter

# Per-provider config
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
OPENROUTER_REFERER=https://open-papertrade.local
OPENROUTER_APP_TITLE=Open-Papertrade Filings

# Or Anthropic
# ANTHROPIC_API_KEY=sk-ant-...
# ANTHROPIC_MODEL=claude-sonnet-5

# Or OpenAI
# OPENAI_API_KEY=sk-proj-...
# OPENAI_MODEL=gpt-4o-mini

# Or Mistral
# MISTRAL_API_KEY=...
# MISTRAL_MODEL=mistral-large-latest

# Or Ollama (fully local)
# OLLAMA_BASE_URL=http://localhost:11434
# OLLAMA_MODEL=llama3.1:8b

# Or a generic local server (LM Studio, vLLM, llama.cpp-server)
# LOCAL_LLM_BASE_URL=http://localhost:1234/v1
# LOCAL_MODEL=mistralai/Mistral-7B-Instruct-v0.3
```

## Per-request overrides

The `/api/filings/ask/` endpoint accepts `provider` and `model` in the request body — useful for A/B testing without redeploying:

```bash
curl -X POST http://localhost:8000/api/filings/ask/ \
  -H 'Content-Type: application/json' \
  -d '{
    "question": "What are the biggest risk factors?",
    "provider": "openrouter",
    "model": "openai/gpt-4o-mini",
    "hybrid": true, "rerank": true
  }'
```

## Which provider should you actually use?

| Your situation                                         | Pick                    |
| ------------------------------------------------------ | ----------------------- |
| Want to try many models with one key                   | **OpenRouter**          |
| Care most about honest refusal / instruction-following | **Anthropic**           |
| Standard, well-documented, no surprises                | **OpenAI**              |
| Budget-focused, EU-based                               | **Mistral**             |
| No budget at all / privacy-critical / offline          | **Ollama** or **Local** |

**My recommendation for first-time setup:** OpenRouter with `anthropic/claude-3.5-sonnet` if you have $5 in credit, else `meta-llama/llama-3.1-8b-instruct:free` (or check openrouter.ai for currently-active free slugs).

## Related

* [Environment Variables](../reference/environment-variables.md) — full list of all provider-related vars.
* [Filings Research](../features/filings-research.md) — the feature that stresses the LLM interface most.
* [Evaluation Harness](../filings-deep-dive/evals.md) — how to cross-compare providers with real numbers.
