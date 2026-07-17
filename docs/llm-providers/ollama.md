# Ollama (local)

<p align="center"><sub><strong>🎬 Demo: Ollama setup</strong> — placeholder (recording coming soon)</sub></p>

## Why Ollama

Runs LLMs **fully locally** on your machine. Zero cost, complete privacy, no API key. Perfect for development, offline use, or when data can't leave your machine.

The tradeoff — smaller/quantized models mean **measurably lower quality** than hosted GPT-4-class models. Refusal accuracy and citation compliance both drop. Use it as the "cost floor" in your eval matrix, not as a primary provider for serious research.

## Setup

### 1. Install Ollama

**macOS / Linux**:

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Windows**: download the installer from [ollama.com/download](https://ollama.com/download).

### 2. Pull a model

```bash
ollama pull llama3.1                # 8B params, ~5 GB disk
# or
ollama pull llama3.1:70b            # 70B params, ~40 GB — needs GPU or lots of RAM
ollama pull mistral                 # 7B, fast
ollama pull qwen2.5                 # 7B, strong at JSON output
```

Recommended for this project: `llama3.1:8b` — the sweet spot between quality and speed on a laptop.

### 3. Confirm Ollama is running

```bash
ollama list        # shows installed models
ollama run llama3.1 "hello"   # smoke test
```

Ollama's server runs on `http://localhost:11434` by default. It starts automatically at boot on most installs.

### 4. Configure `.env`

```bash
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
```

### 5. Restart the backend

```bash
Ctrl+C
python manage.py runserver
```

## Recommended models for this project

| Model          | Params | Disk     | Notes                             |
| -------------- | ------ | -------- | --------------------------------- |
| `llama3.1:8b`  | 8B     | \~5 GB   | Best all-round on a laptop        |
| `qwen2.5:7b`   | 7B     | \~4.5 GB | Strong at structured JSON output  |
| `mistral:7b`   | 7B     | \~4 GB   | Fast, competitive                 |
| `phi3:14b`     | 14B    | \~8 GB   | Microsoft's larger open model     |
| `llama3.1:70b` | 70B    | \~40 GB  | Only if you have GPU or heavy RAM |

## Performance expectations

On a modern laptop CPU (no GPU):

* First response: \~2–3 seconds (model warm-up)
* Steady-state: \~5–15 tokens/second
* A typical Filings answer (\~200 tokens): **20–40 seconds**

With a GPU: 5–10× faster.

## Notes

* **Warm-up cost**: the first request after Ollama starts is slow (model loaded from disk to RAM). Subsequent requests reuse the loaded model.
* **Concurrency**: Ollama serializes requests by default. Fine for solo development, bottleneck under load.
* **JSON output**: Llama models sometimes drop the JSON envelope under prompt pressure. The QA pipeline has a fallback that salvages raw text, but citation-format compliance is lower than hosted models. Expect it in the eval numbers.
* **The quality cliff is real**: use Ollama as the "how cheap can I go and still have a working system?" data point in your eval matrix, not as your default provider for real research use.

## Related

* [Overview](overview.md) — how the LLM abstraction works.
* [Local OpenAI-compatible](local.md) — LM Studio / vLLM / llama.cpp-server as alternatives to Ollama.
