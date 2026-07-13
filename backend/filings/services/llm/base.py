from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Iterable, Literal, Optional


Role = Literal['system', 'user', 'assistant']


@dataclass
class LLMMessage:
    role: Role
    content: str


@dataclass
class LLMResponse:
    text: str
    model: str
    provider: str
    input_tokens: int = 0
    output_tokens: int = 0
    finish_reason: str = ''
    raw: dict = field(default_factory=dict)

    @property
    def total_tokens(self) -> int:
        return self.input_tokens + self.output_tokens


class BaseLLMProvider(ABC):
    name: str = 'base'
    default_model: str = ''

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key
        self.model = model or self.default_model

    @abstractmethod
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
        raise NotImplementedError

    def _split_system(self, messages: Iterable[LLMMessage]) -> tuple[str, list[LLMMessage]]:
        msgs = list(messages)
        system_parts = [m.content for m in msgs if m.role == 'system']
        rest = [m for m in msgs if m.role != 'system']
        return '\n\n'.join(system_parts), rest
