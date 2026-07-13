from __future__ import annotations

from .openai_compatible import OpenAICompatibleProvider


class MistralProvider(OpenAICompatibleProvider):
    """Mistral's public API. It's OpenAI-compatible for /chat/completions, so we
    reuse the OpenAI SDK against their base URL.
    Models: https://docs.mistral.ai/getting-started/models/
    """
    name = 'mistral'
    api_key_env = 'MISTRAL_API_KEY'
    base_url = 'https://api.mistral.ai/v1'
    default_model = 'mistral-large-latest'
