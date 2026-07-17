# Local OpenAI-compatible

<p align="center"><sub><strong>🎬 Demo: Local server setup</strong> — placeholder (recording coming soon)</sub></p>

## What this is

A **catch-all adapter for any local server that speaks OpenAI's `POST /v1/chat/completions` protocol** — LM Studio, vLLM, llama.cpp-server, Text Generation WebUI, and others. Use this when Ollama isn't the right fit (you want a specific model runner, want GPU-optimized serving, or already have one of these set up).

## Setup

### 1. Run a local server

Any of the following will do. Pick one:

#### LM Studio

Download from [lmstudio.ai](https://lmstudio.ai/). Load a model in the GUI → start the "Local Server" tab. Default: `http://localhost:1234/v1`.

#### vLLM

```bash
pip install vllm
vllm serve mistralai/Mistral-7B-Instruct-v0.3 --port 8000
```

Endpoint: `http://localhost:8000/v1`. Fast, GPU-optimized, batched inference.

#### llama.cpp server

```bash
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp && make server
./server -m ./models/llama-3.1-8b-instruct.gguf --port 8080
```

Endpoint: `http://localhost:8080/v1`. Zero-dependency, runs on CPU or GPU.

#### Text Generation WebUI (oobabooga)

Start with `--api` flag. Endpoint: `http://localhost:5000/v1`.

### 2. Configure `.env`

```bash
LLM_PROVIDER=local

# Match the endpoint of whichever server you're running:
LOCAL_LLM_BASE_URL=http://localhost:1234/v1        # LM Studio
# LOCAL_LLM_BASE_URL=http://localhost:8000/v1      # vLLM
# LOCAL_LLM_BASE_URL=http://localhost:8080/v1      # llama.cpp

LOCAL_MODEL=mistralai/Mistral-7B-Instruct-v0.3
```

### 3. Restart the backend

```bash
Ctrl+C
python manage.py runserver
```

Verify:

```bash
curl http://localhost:8000/api/filings/health/
# → "llm_providers": ["local"]
```

## When to prefer this over Ollama

| You want...                                   | Pick                   |
| --------------------------------------------- | ---------------------- |
| Simplest possible local setup                 | **Ollama**             |
| GUI to browse and swap models                 | **LM Studio**          |
| GPU-optimized batched throughput              | **vLLM**               |
| CPU-only, zero-dependency, tiny footprint     | **llama.cpp-server**   |
| Existing local setup you don't want to change | **whichever you have** |

## No API key required

The adapter (`LocalOpenAIProvider`) sets `allow_empty_key=True`. It ships an empty `Authorization` header, which most local servers accept. If your server requires a token, set:

```bash
LOCAL_LLM_API_KEY=your-token
```

## Performance expectations

Same as Ollama — depends on your hardware:

* **CPU-only**: 5–15 tokens/sec, \~20–40 sec per Filings answer.
* **GPU** (consumer, 8–24 GB VRAM): 30–100 tokens/sec, \~5–10 sec per answer.
* **GPU** (data-center, 40 GB+ VRAM): near-hosted speeds.

## Notes

* **Model selection matters more than the server**: `mistral-7b-instruct` on any local runner will give similar quality; the choice between runners is about throughput and DX.
* **JSON output reliability drops on smaller models**: same warning as Ollama — expect lower citation-format compliance and refusal accuracy compared to hosted providers.
* **Batching**: vLLM particularly benefits from concurrent requests. If you're running the eval harness, vLLM will finish faster than llama.cpp-server or Ollama.

## Related

* [Overview](overview.md) — how the LLM abstraction works.
* [Ollama](ollama.md) — the simplest local option.
