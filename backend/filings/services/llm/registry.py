from __future__ import annotations

import os
from typing import Optional

from .base import BaseLLMProvider


def get_provider(name: Optional[str] = None, model: Optional[str] = None) -> BaseLLMProvider:
    name = (name or os.getenv('LLM_PROVIDER', 'anthropic')).lower()

    # Explicit `model` arg wins; otherwise fall back to a provider-specific env var
    # (e.g. OPENROUTER_MODEL), then to a generic LLM_MODEL, then to the provider's default.
    env_model = os.getenv(f'{name.upper()}_MODEL') or os.getenv('LLM_MODEL')
    resolved_model = model or env_model

    if name == 'anthropic':
        from .anthropic_provider import AnthropicProvider
        return AnthropicProvider(model=resolved_model)
    if name == 'openai':
        from .openai_provider import OpenAIProvider
        return OpenAIProvider(model=resolved_model)
    if name == 'openrouter':
        from .openrouter_provider import OpenRouterProvider
        return OpenRouterProvider(model=resolved_model)
    if name == 'mistral':
        from .mistral_provider import MistralProvider
        return MistralProvider(model=resolved_model)
    if name == 'ollama':
        from .ollama_provider import OllamaProvider
        return OllamaProvider(model=resolved_model)
    if name == 'local':
        from .local_provider import LocalOpenAIProvider
        return LocalOpenAIProvider(model=resolved_model)

    raise ValueError(f'Unknown LLM provider: {name!r}')


def available_providers() -> list[str]:
    """Return providers that appear ready to use based on env vars alone.
    (Does not verify keys are valid — just that they're set.)
    """
    out = []
    if os.getenv('ANTHROPIC_API_KEY'):
        out.append('anthropic')
    if os.getenv('OPENAI_API_KEY'):
        out.append('openai')
    if os.getenv('OPENROUTER_API_KEY'):
        out.append('openrouter')
    if os.getenv('MISTRAL_API_KEY'):
        out.append('mistral')
    if os.getenv('OLLAMA_BASE_URL') or os.path.exists('/usr/local/bin/ollama'):
        out.append('ollama')
    if os.getenv('LOCAL_LLM_BASE_URL'):
        out.append('local')
    return out
