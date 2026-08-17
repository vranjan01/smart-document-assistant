"""
Embedding generation using Sentence-Transformers.

Wrapped as a small singleton class so the model is loaded once per
process (loading is the expensive part) and shared by both the
ingestion path (embedding new chunks) and the query path (embedding
user questions for similarity search).
"""

from __future__ import annotations
from sentence_transformers import SentenceTransformer

from app.config import settings


class EmbeddingModel:
    _instance: "EmbeddingModel | None" = None

    def __init__(self, model_name: str | None = None):
        self.model_name = model_name or settings.embedding_model
        self.model = SentenceTransformer(self.model_name)

    @classmethod
    def get(cls, model_name: str | None = None) -> "EmbeddingModel":
        if cls._instance is None or (model_name and model_name != cls._instance.model_name):
            cls._instance = cls(model_name)
        return cls._instance

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        embeddings = self.model.encode(texts, show_progress_bar=False, normalize_embeddings=True)
        return embeddings.tolist()

    def embed_query(self, text: str) -> list[float]:
        return self.embed_texts([text])[0]
