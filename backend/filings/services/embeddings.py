from __future__ import annotations

from typing import Iterable, Optional

import numpy as np
from django.conf import settings


_MODEL_CACHE: dict[str, object] = {}


def _load_model(name: str):
    if name in _MODEL_CACHE:
        return _MODEL_CACHE[name]
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer(name)
    _MODEL_CACHE[name] = model
    return model


def embed_texts(
    texts: Iterable[str],
    model_name: Optional[str] = None,
    batch_size: int = 32,
    normalize: bool = True,
) -> np.ndarray:
    name = model_name or settings.FILINGS_EMBEDDING_MODEL
    model = _load_model(name)
    arr = model.encode(
        list(texts),
        batch_size=batch_size,
        show_progress_bar=False,
        convert_to_numpy=True,
        normalize_embeddings=normalize,
    )
    return arr.astype(np.float32)


def embed_query(text: str, model_name: Optional[str] = None) -> np.ndarray:
    return embed_texts([text], model_name=model_name)[0]


def to_bytes(vec: np.ndarray) -> bytes:
    return vec.astype(np.float32).tobytes()


def from_bytes(blob: bytes, dim: int) -> np.ndarray:
    return np.frombuffer(blob, dtype=np.float32).reshape(dim)


def get_model_info(model_name: Optional[str] = None) -> tuple[str, int]:
    name = model_name or settings.FILINGS_EMBEDDING_MODEL
    model = _load_model(name)
    dim = int(model.get_sentence_embedding_dimension())
    return name, dim
