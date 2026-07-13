from __future__ import annotations

import os

from .openai_compatible import OpenAICompatibleProvider


class OpenRouterProvider(OpenAICompatibleProvider):
    """OpenRouter — a single API key gives you access to Claude, GPT, Mistral,
    Llama, Gemini, DeepSeek, and dozens more. Pricing is per-token, provider-
    specific. See https://openrouter.ai/models
    """
    name = 'openrouter'
    api_key_env = 'OPENROUTER_API_KEY'
    base_url = 'https://openrouter.ai/api/v1'
    default_model = 'anthropic/claude-3.5-sonnet'

    def __init__(self, api_key=None, model=None, base_url=None):
        super().__init__(api_key=api_key, model=model, base_url=base_url)
        self.extra_headers = {
            'HTTP-Referer': os.getenv('OPENROUTER_REFERER', 'https://open-papertrade.local'),
            'X-Title': os.getenv('OPENROUTER_APP_TITLE', 'Open-Papertrade Filings'),
        }
