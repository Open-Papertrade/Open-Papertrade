from __future__ import annotations

import os
from typing import Iterable, Optional

from .base import BaseLLMProvider, LLMMessage, LLMResponse


class OpenAICompatibleProvider(BaseLLMProvider):
    """Shared implementation for any service that speaks OpenAI's /chat/completions
    protocol: OpenAI itself, OpenRouter, Mistral (their public API is OpenAI-compat),
    Together, Groq, Fireworks, DeepInfra, LM Studio, vLLM, llama.cpp-server, etc.
    """
    name = 'openai-compatible'
    default_model = ''
    api_key_env = 'OPENAI_API_KEY'
    base_url: Optional[str] = None
    require_api_key = True
    extra_headers: dict[str, str] = {}

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None,
                 base_url: Optional[str] = None):
        super().__init__(api_key or os.getenv(self.api_key_env), model)
        self.base_url = base_url or self.base_url
        if self.require_api_key and not self.api_key:
            raise RuntimeError(f'{self.api_key_env} not set')

    def _client(self):
        from openai import OpenAI
        kwargs = {'api_key': self.api_key or 'not-required'}
        if self.base_url:
            kwargs['base_url'] = self.base_url
        if self.extra_headers:
            kwargs['default_headers'] = self.extra_headers
        return OpenAI(**kwargs)

    def complete(
        self,
        messages: Iterable[LLMMessage],
        *,
        model: Optional[str] = None,
        temperature: float = 0.0,
        max_tokens: int = 1024,
        system: Optional[str] = None,
        **kwargs,
    ) -> LLMResponse:
        client = self._client()
        sys_from_msgs, rest = self._split_system(messages)
        system_text = system or sys_from_msgs

        api_messages = []
        if system_text:
            api_messages.append({'role': 'system', 'content': system_text})
        api_messages.extend({'role': m.role, 'content': m.content} for m in rest)

        resp = client.chat.completions.create(
            model=model or self.model,
            max_tokens=max_tokens,
            temperature=temperature,
            messages=api_messages,
        )
        choice = resp.choices[0]
        return LLMResponse(
            text=choice.message.content or '',
            model=resp.model,
            provider=self.name,
            input_tokens=resp.usage.prompt_tokens if resp.usage else 0,
            output_tokens=resp.usage.completion_tokens if resp.usage else 0,
            finish_reason=choice.finish_reason or '',
            raw=resp.model_dump() if hasattr(resp, 'model_dump') else {},
        )
