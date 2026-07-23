# Prerequisites

Confirm the following are installed on your machine before you start.

## Runtime versions

| Tool | Minimum | Check with |
|---|---|---|
| **Python** | 3.10 | `python --version` |
| **Node.js** | 20 | `node --version` |
| **Git** | any recent | `git --version` |
| **Free disk** | ~2 GB | for Python deps + embedding model |

If any are missing:

* **Python** — [python.org/downloads](https://www.python.org/downloads/) or your OS package manager.
* **Node.js** — [nodejs.org](https://nodejs.org/) or [`nvm`](https://github.com/nvm-sh/nvm).
* **Git** — [git-scm.com/downloads](https://git-scm.com/downloads).

## API keys you'll need

You need **one** LLM provider key to use the AI features (AI Coach + Filings Research Analyst). Pick one:

| Provider | Free tier? | Where to get a key |
|---|---|---|
| **OpenRouter** (recommended) | Some models free, many paid | [openrouter.ai/keys](https://openrouter.ai/keys) |
| **Anthropic** | $5 free credit | [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) |
| **OpenAI** | Pay-as-you-go | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| **Mistral** | Free tier | [console.mistral.ai](https://console.mistral.ai/) |
| **Ollama** (fully local) | Free forever | [ollama.com](https://ollama.com/) — no signup |

Optional keys (nice to have, not required):

* **Finnhub** — real-time quotes ([finnhub.io](https://finnhub.io/), free tier). Falls back to Yahoo Finance if absent.
* **Supabase** — Postgres + storage for **production only** ([supabase.com](https://supabase.com/)). Dev uses SQLite.

## What you don't need

* An OpenAI or Anthropic account if you're using OpenRouter — one key covers dozens of models.
* A GPU — the embedding model runs on CPU (~2s per filing during ingestion).
* Docker, Kubernetes, or cloud infra — this runs on your laptop.
* An SEC.gov account — EDGAR is public and free.

{% hint style="info" %}
Once prerequisites are checked off, head to [Installation](installation.md) — the whole path from `git clone` to your first cited answer is about 15 minutes.
{% endhint %}
