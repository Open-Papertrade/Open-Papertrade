from __future__ import annotations

import os
from typing import Iterable, Optional

import requests

from .base import BaseLLMProvider, LLMMessage, LLMResponse


class OllamaProvider(BaseLLMProvider):
    name = 'ollama'
    default_model = 'llama3.1:8b'

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        super().__init__(api_key, model)
        self.base_url = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')

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
        sys_from_msgs, rest = self._split_system(messages)
        system_text = system or sys_from_msgs

        api_messages = []
        if system_text:
            api_messages.append({'role': 'system', 'content': system_text})
        api_messages.extend({'role': m.role, 'content': m.content} for m in rest)

        payload = {
            'model': model or self.model,
            'messages': api_messages,
            'stream': False,
            'options': {
                'temperature': temperature,
                'num_predict': max_tokens,
            },
        }

        resp = requests.post(f'{self.base_url}/api/chat', json=payload, timeout=120)
        resp.raise_for_status()
        data = resp.json()

        return LLMResponse(
            text=data.get('message', {}).get('content', ''),
            model=data.get('model', model or self.model),
            provider=self.name,
            input_tokens=data.get('prompt_eval_count', 0),
            output_tokens=data.get('eval_count', 0),
            finish_reason=data.get('done_reason', ''),
            raw=data,
        )
