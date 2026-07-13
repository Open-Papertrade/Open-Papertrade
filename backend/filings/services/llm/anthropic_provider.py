from __future__ import annotations

import os
from typing import Iterable, Optional

from .base import BaseLLMProvider, LLMMessage, LLMResponse


class AnthropicProvider(BaseLLMProvider):
    name = 'anthropic'
    default_model = 'claude-sonnet-5'

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        super().__init__(api_key or os.getenv('ANTHROPIC_API_KEY'), model)
        if not self.api_key:
            raise RuntimeError('ANTHROPIC_API_KEY not set')

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
        from anthropic import Anthropic

        client = Anthropic(api_key=self.api_key)
        sys_from_msgs, rest = self._split_system(messages)
        system_text = system or sys_from_msgs or None

        api_messages = [{'role': m.role, 'content': m.content} for m in rest]

        resp = client.messages.create(
            model=model or self.model,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system_text if system_text else None,
            messages=api_messages,
        )

        text = ''.join(
            block.text for block in resp.content if getattr(block, 'type', '') == 'text'
        )

        return LLMResponse(
            text=text,
            model=resp.model,
            provider=self.name,
            input_tokens=resp.usage.input_tokens,
            output_tokens=resp.usage.output_tokens,
            finish_reason=resp.stop_reason or '',
            raw=resp.model_dump() if hasattr(resp, 'model_dump') else {},
        )
