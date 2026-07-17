# AI Coach

<figure><img src="../.gitbook/assets/ai-coach_compressed.gif" alt=""><figcaption></figcaption></figure>

## What it is

An LLM-powered behavioral analyst that studies **your own trading history** and gives you feedback: what patterns you're falling into, where risk is concentrated, and how to improve. Includes an interactive chat that can reason about your positions.

## What you can do

* **Trade behavior score** — a multi-axis score across dimensions like discipline, diversification, patience, and risk management.
* **Pattern detection** — flags recurring behaviors (revenge trades, overtrading after wins, holding losers too long, etc.) with severity levels.
* **Personalized tips** — LLM-generated coaching notes based on your actual trades.
* **AI Chat** — ask the coach anything about your portfolio: "Why is my Q3 return negative?", "Am I over-concentrated in tech?", "What's my biggest weakness?"
* **Refusal-first** — if the coach doesn't have enough data (fewer than N trades), it says so instead of guessing.

## How to use it

### First-time setup

You need **at least a handful of trades** for the coach to have signal. Make 5–10 paper trades over a few days before opening the coach.

Sidebar → **AI Coach**.

### The four tabs

**Overview** — quick stats + top-line coach observations.

**Patterns** — categorized behavioral patterns (danger / warning / positive), each with:

* Description of the pattern.
* Recent examples from your trades.
* Suggestion for what to do differently.

**Tips** — LLM-generated actionable tips, ranked by priority.

**AI Chat** — free-form conversation. The coach has access to your trade history, current holdings, and pattern analysis. It grounds answers in your data.

### Sample questions to ask the chat

* "What's my biggest recurring mistake?"
* "How diversified is my current portfolio?"
* "Why did my last three tech trades lose money?"
* "What patterns are you most concerned about?"

## Design principles

### Grounded in your data

The coach doesn't invent things about your trading. When you ask "how am I doing?", it pulls actual trade rows, holdings, and win/loss stats before answering.

### Refusal over hallucination

If the coach doesn't have enough trades to score confidently, it says so. If a question is about a stock you've never touched, it declines.

### Provider-agnostic

The coach uses the same LLM abstraction as Filings Research. Set `LLM_PROVIDER` in `.env` — Anthropic, OpenAI, OpenRouter, Mistral, Ollama, or a local server all work.

## Under the hood

* **Backend service**: `backend/users/coaching/` — pattern detection, scoring, tip generation.
* **LLM abstraction**: `backend/filings/services/llm/` — reused across the coach, chart analysis, and filings.
* **API**: `GET /api/users/coaching/dashboard/` bundles portfolio + patterns + scores + tips in one payload.
* **Chat**: `POST /api/users/coaching/chat/` — carries your trade history as context.

## Extended usage

See `AI_COACH_GUIDE.md` in the repo root for the full coach reference — pattern definitions, scoring rubric, prompt engineering notes.

## Related

* [Paper Trading](paper-trading.md) — the coach analyzes what you did here.
* [Filings Research Analyst](filings-research.md) — a different flavor of grounded, cited AI.
* [LLM Providers](../llm-providers/overview.md) — swap the model powering the coach.
