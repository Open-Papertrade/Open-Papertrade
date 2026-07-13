from __future__ import annotations

import os
from typing import Iterable, Optional

from .base import BaseLLMProvider, LLMMessage, LLMResponse


class OpenAIProvider(BaseLLMProvider):
    name = 'openai'
    default_model = 'gpt-4o-mini'

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        super().__init__(api_key or os.getenv('OPENAI_API_KEY'), model)
        if not self.api_key:
            raise RuntimeError('OPENAI_API_KEY not set')

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
        from openai import OpenAI

        client = OpenAI(api_key=self.api_key)
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
