# Mistral

<p align="center"><sub><strong>🎬 Demo: Mistral setup</strong> — placeholder (recording coming soon)</sub></p>

## Why Mistral

Direct Mistral API — EU-hosted, cheaper than GPT-4 class for many tasks, has a genuine free tier. Good middle-ground between closed-source hosted and fully-local options.

## Setup

### 1. Get a key

1. Visit [**console.mistral.ai**](https://console.mistral.ai/).
2. Sign up (free tier available).
3. Create an API key.

### 2. Configure `.env`

```bash
LLM_PROVIDER=mistral
MISTRAL_API_KEY=your-mistral-key
MISTRAL_MODEL=mistral-large-latest
```

### 3. Restart the backend

```bash
Ctrl+C
python manage.py runserver
```

## Model choices

| Model                  | Approx. cost per 1000 questions | Use case                    |
| ---------------------- | ------------------------------- | --------------------------- |
| `mistral-large-latest` | \~$1.20                         | Best Mistral quality        |
| `mistral-small-latest` | \~$0.20                         | Fast + cheap                |
| `open-mixtral-8x22b`   | \~$0.60                         | Open-weights, MoE           |
| `open-mistral-7b`      | \~$0.05                         | Cheapest, weaker on refusal |

## Notes

* **EU hosting**: if data residency matters, Mistral hosts inside the EU. Anthropic and OpenAI are US-hosted.
* **JSON output**: Mistral supports `response_format={"type": "json_object"}`. Not currently wired in via `**kwargs` but the interface allows it.
* **Free tier**: generous compared to OpenAI but rate-limited.

## Related

* [Overview](overview.md) — how the LLM abstraction works.
* [OpenRouter](openrouter.md) — access Mistral models via one key.
