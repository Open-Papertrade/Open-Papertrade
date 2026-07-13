from __future__ import annotations

import os

from .openai_compatible import OpenAICompatibleProvider


class LocalOpenAIProvider(OpenAICompatibleProvider):
    """Any local OpenAI-compatible chat-completions server:
      - LM Studio       (default http://localhost:1234/v1)
      - vLLM            (usually http://localhost:8000/v1)
      - llama.cpp server (usually http://localhost:8080/v1)
      - text-generation-webui with the openai extension

    Point LOCAL_LLM_BASE_URL at whichever one you're running. No API key required.
    """
    name = 'local'
    api_key_env = 'LOCAL_LLM_API_KEY'
    require_api_key = False
    default_model = 'local-model'

    def __init__(self, api_key=None, model=None, base_url=None):
        base_url = base_url or os.getenv('LOCAL_LLM_BASE_URL', 'http://localhost:1234/v1')
        super().__init__(api_key=api_key, model=model, base_url=base_url)
