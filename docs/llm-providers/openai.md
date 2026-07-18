# OpenAI

## Why OpenAI

Standard hosted models. Widely documented, well-behaved on structured outputs (JSON mode), and the reference implementation for the `/v1/chat/completions` protocol every other OpenAI-compatible provider mimics.

## Setup

### 1. Get a key

1. Visit [**platform.openai.com/api-keys**](https://platform.openai.com/api-keys).
2. Sign up + add a payment method (no free tier — pay-as-you-go from the first call).
3. Create a key — starts with `sk-proj-...` or `sk-...`.

### 2. Configure `.env`

```bash
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-proj-your-key-here
OPENAI_MODEL=gpt-4o-mini
```

### 3. Restart the backend

```bash
Ctrl+C
python manage.py runserver
```

## Model choices

| Model           | Approx. cost per 1000 questions | Use case                                      |
| --------------- | ------------------------------- | --------------------------------------------- |
| `gpt-4o`        | \~$5                            | Highest quality, full GPT-4 class             |
| `gpt-4o-mini`   | **\~$0.30**                     | Best price/performance in the OpenAI catalog  |
| `gpt-4-turbo`   | \~$10                           | Older, more expensive — usually skip          |
| `gpt-3.5-turbo` | \~$0.10                         | Cheap but weaker on refusal + citation format |

For this project, `gpt-4o-mini` is the go-to.

## Notes

* **Structured outputs**: OpenAI supports `response_format={"type": "json_schema", ...}` which forces valid JSON. Not currently used (the prompt handles it), but the abstraction can pass it via `**kwargs`.
* **Rate limits**: hosted models have tiered rate limits based on account age + spend. Fresh accounts might hit 429s on the eval harness — space out runs or upgrade tier.
* **Citation compliance**: GPT models follow the `[S<n>]` citation format more literally than open models. High citation rate in eval.

## Related

* [Overview](overview.md) — how the LLM abstraction works.
* [OpenRouter](openrouter.md) — access OpenAI models plus dozens more with one key.
