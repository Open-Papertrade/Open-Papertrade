"""
OpenRouter LLM integration for natural-language coaching.
Supports any model available on OpenRouter (including free ones).

Environment variables:
  OPENROUTER_API_KEY  — your OpenRouter API key (required)
  OPENROUTER_MODEL    — model to use (default: meta-llama/llama-4-maverick:free)
"""

from __future__ import annotations

import json
import os
import logging
from typing import Optional

import requests

logger = logging.getLogger(__name__)

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = "meta-llama/llama-4-maverick:free"

SYSTEM_PROMPT = """You are an expert AI trading coach for a paper-trading platform. You analyze users' trading behavior, patterns, and performance data to provide personalized, actionable coaching.

Your tone is:
- Encouraging but honest — praise good habits, but don't sugarcoat problems
- Specific — reference actual numbers, patterns, and trades from the data
- Actionable — every insight should end with something the user can DO
- Concise — keep responses focused, use bullet points when helpful

You are NOT a financial advisor. This is a learning/simulation platform. Never recommend specific stocks to buy. Focus on process, behavior, and risk management.

When reviewing a trade, analyze: timing quality, position sizing, whether the user followed a plan or acted emotionally, and what they can learn.

When giving an overall coaching session, cover: biggest strengths, top 2-3 areas to improve, one specific drill or exercise to try this week."""


def get_api_key() -> Optional[str]:
    return os.environ.get("OPENROUTER_API_KEY")


def get_model() -> str:
    return os.environ.get("OPENROUTER_MODEL", DEFAULT_MODEL)


def is_available() -> bool:
    """Check if OpenRouter is configured."""
    return bool(get_api_key())


def generate_coaching_response(
    user_message: str,
    context: dict,
    conversation_history: Optional[list[dict]] = None,
) -> dict:
    """
    Generate a coaching response using OpenRouter.

    Parameters
    ----------
    user_message : str
        The user's question or request.
    context : dict
        Trading data context (portfolio analysis, patterns, scores, recent trades).
    conversation_history : list[dict], optional
        Previous messages in the conversation [{role, content}, ...].

    Returns
    -------
    dict with keys: response (str), model (str), tokens_used (int), error (str|None)
    """
    api_key = get_api_key()
    if not api_key:
        return {
            "response": None,
            "model": None,
            "tokens_used": 0,
            "error": "OpenRouter API key not configured. Set OPENROUTER_API_KEY in your environment.",
        }

    # Build context message
    context_text = _build_context_text(context)

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "system", "content": f"Here is the user's current trading data:\n\n{context_text}"},
    ]

    # Add conversation history
    if conversation_history:
        for msg in conversation_history[-10:]:  # last 10 messages
            messages.append({"role": msg["role"], "content": msg["content"]})

    messages.append({"role": "user", "content": user_message})

    model = get_model()

    try:
        response = requests.post(
            OPENROUTER_API_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": os.environ.get("FRONTEND_URL", "http://localhost:3000"),
                "X-Title": "Open Papertrade AI Coach",
            },
            json={
                "model": model,
                "messages": messages,
                "max_tokens": 1024,
                "temperature": 0.7,
            },
            timeout=30,
        )

        if response.status_code != 200:
            error_body = response.text
            logger.error(f"OpenRouter API error {response.status_code}: {error_body}")
            return {
                "response": None,
                "model": model,
                "tokens_used": 0,
                "error": f"OpenRouter API returned {response.status_code}",
            }

        data = response.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        usage = data.get("usage", {})
        tokens = usage.get("total_tokens", 0)

        return {
            "response": content,
            "model": model,
            "tokens_used": tokens,
            "error": None,
        }

    except requests.exceptions.Timeout:
        return {"response": None, "model": model, "tokens_used": 0, "error": "Request timed out"}
    except Exception as e:
        logger.exception("OpenRouter request failed")
        return {"response": None, "model": model, "tokens_used": 0, "error": str(e)}


def generate_trade_review(trade_analysis: dict, context: dict) -> dict:
    """Generate a natural-language review for a specific trade."""
    trade = trade_analysis
    prompt = (
        f'Review my {trade["trade_type"]} trade on {trade["symbol"]}:\n'
        f'- Price: ${trade["price"]:.2f}, Shares: {trade["shares"]}\n'
        f'- Timing: {trade.get("timing", {}).get("rangePositionLabel", "unknown")}\n'
    )

    if trade.get("context", {}).get("pnl") is not None:
        prompt += f'- P&L: ${trade["context"]["pnl"]:.2f} ({trade["context"]["pnlPercent"]:.1f}%)\n'
        prompt += f'- Hold time: {trade["context"].get("holdDays", "?")} days\n'

    if trade.get("whatIf", {}).get("heldLonger"):
        wif = trade["whatIf"]["heldLonger"]
        prompt += f'- Max price in 30 days after sell: ${wif["maxPriceAfter30d"]:.2f} (missed {wif["missedUpsidePct"]:.1f}%)\n'

    if trade.get("whatIf", {}).get("waitedForDip"):
        wif = trade["whatIf"]["waitedForDip"]
        prompt += f'- Min price in 10 days after buy: ${wif["minPriceNext10d"]:.2f} (could have saved {wif["betterEntryPct"]:.1f}%)\n'

    prompt += f'\nVerdict: {trade["verdict"]} (score: {trade["verdictScore"]}/100)\n'
    prompt += "\nGive me a brief, specific coaching review of this trade. What did I do well? What could I improve?"

    return generate_coaching_response(prompt, context)


def generate_session_summary(context: dict) -> dict:
    """Generate a full coaching session summary."""
    prompt = (
        "Give me a complete coaching session based on my trading data. Cover:\n"
        "1. My biggest strengths (what I'm doing well)\n"
        "2. Top 2-3 areas I need to improve\n"
        "3. One specific exercise or drill to practice this week\n"
        "4. An overall assessment of my trading maturity\n\n"
        "Be specific — reference my actual numbers and patterns."
    )
    return generate_coaching_response(prompt, context)


def _build_context_text(context: dict) -> str:
    """Convert context dict into readable text for the LLM."""
    parts = []

    # Portfolio summary
    summary = context.get("portfolio", {}).get("summary", {})
    if summary:
        parts.append("PORTFOLIO SUMMARY:")
        parts.append(f"  Total trades: {summary.get('totalTrades', 0)}")
        parts.append(f"  Buys: {summary.get('buys', 0)}, Sells: {summary.get('sells', 0)}")
        parts.append(f"  Win rate: {summary.get('winRate', 0)}%")
        parts.append(f"  Total return: {summary.get('totalReturnPct', 0)}%")
        parts.append(f"  Realized P&L: ${summary.get('realizedPnl', 0):,.2f}")
        parts.append(f"  Trades/week: {summary.get('tradesPerWeek', 0)}")
        parts.append(f"  Avg hold: {summary.get('avgHoldDays', 0)} days")
        parts.append(f"  Holdings: {summary.get('holdingsCount', 0)}")
        parts.append("")

    # Scores
    scores = context.get("scores", {})
    if scores.get("hasData"):
        parts.append(f"TRADING SCORE: {scores.get('overall', 0)}/100 (Grade: {scores.get('grade', '?')})")
        for dim, data in scores.get("scores", {}).items():
            parts.append(f"  {dim}: {data.get('score', 0)}/100")
            for r in data.get("reasons", []):
                parts.append(f"    - {r}")
        parts.append("")

    # Patterns
    patterns = context.get("patterns", [])
    if patterns:
        parts.append("DETECTED PATTERNS:")
        for p in patterns:
            parts.append(f"  {p['icon']} {p['name']} ({p['severity']}): {p['description']}")
            for ex in p.get("examples", []):
                parts.append(f"    Example: {ex}")
        parts.append("")

    # Recent trades
    recent = context.get("recentTrades", [])
    if recent:
        parts.append("RECENT TRADES (last 10):")
        for t in recent[:10]:
            parts.append(f"  {t.get('trade_type', '?')} {t.get('symbol', '?')} "
                         f"x{t.get('shares', 0)} @ ${float(t.get('price', 0)):.2f} "
                         f"on {str(t.get('executed_at', ''))[:10]}")
        parts.append("")

    # Holdings
    holdings = context.get("holdings", [])
    if holdings:
        parts.append("CURRENT HOLDINGS:")
        for h in holdings:
            parts.append(f"  {h.get('symbol', '?')}: {h.get('shares', 0)} shares @ ${float(h.get('avg_cost', 0)):.2f} avg")
        parts.append("")

    return "\n".join(parts) if parts else "No trading data available yet."
