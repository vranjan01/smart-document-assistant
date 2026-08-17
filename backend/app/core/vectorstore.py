"""
FAISS-backed vector store.

Replaces ChromaDB with a local FAISS index (faiss-cpu), which is more
Windows-friendly to install (no SQLite/telemetry native deps, pure
pip-installable wheel). Since FAISS is a pure vector index with no
built-in metadata store or filtering, this module pairs a
faiss.IndexIDMap (wrapping an IndexFlatIP for cosine similarity, since
embeddings are L2-normalized at encode time) with a JSON "sidecar" file
holding per-chunk metadata/text, keyed by the same chunk_id used
elsewhere in the app. This preserves the exact public interface the
rest of the backend already depends on (add_chunks / query /
delete_document / get_all_chunks_for_doc), so no other module needs to
change.

Persistence layout (under settings.faiss_dir):
  - index.faiss     FAISS IndexIDMap binary
  - metadata.json    { "chunks": {chunk_id: {...}}, "id_to_chunk": {int_id: chunk_id},
                       "chunk_to_id": {chunk_id: int_id}, "next_id": int, "dimension": int }

Filtering by doc_ids: FAISS has no native "where" filter, so a doc-scoped
query over-fetches (searches a larger k across the *whole* index) and
then filters results down to the requested doc_ids in Python. This is
the standard, simple approach for FAISS at MVP/demo scale.
"""

from __future__ import annotations
import json
import threading
from pathlib import Path

import numpy as np
import faiss

from app.config import settings
from app.core.chunker import Chunk
from app.core.embeddings import EmbeddingModel

INDEX_FILE = "index.faiss"
METADATA_FILE = "metadata.json"

_LOCK = threading.Lock()


class VectorStore:
    _instance: "VectorStore | None" = None

    def __init__(self):
        self.dir = Path(settings.faiss_dir)
        self.dir.mkdir(parents=True, exist_ok=True)
        self.index_path = self.dir / INDEX_FILE
        self.metadata_path = self.dir / METADATA_FILE

        self.chunks: dict[str, dict] = {}          # chunk_id -> {text, metadata}
        self.chunk_to_id: dict[str, int] = {}       # chunk_id -> faiss int id
        self.id_to_chunk: dict[int, str] = {}       # faiss int id -> chunk_id
        self.next_id: int = 0
        self.dimension: int | None = None
        self.index: faiss.IndexIDMap | None = None

        self._load()

    @classmethod
    def get(cls) -> "VectorStore":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    def _load(self) -> None:
        if self.metadata_path.exists():
            with open(self.metadata_path, "r") as f:
                data = json.load(f)
            self.chunks = data.get("chunks", {})
            self.chunk_to_id = {k: int(v) for k, v in data.get("chunk_to_id", {}).items()}
            self.id_to_chunk = {int(k): v for k, v in data.get("id_to_chunk", {}).items()}
            self.next_id = data.get("next_id", 0)
            self.dimension = data.get("dimension")

        if self.dimension and self.index_path.exists():
            base_index = faiss.read_index(str(self.index_path))
            self.index = base_index if isinstance(base_index, faiss.IndexIDMap) else faiss.IndexIDMap(base_index)
        elif self.dimension:
            self.index = faiss.IndexIDMap(faiss.IndexFlatIP(self.dimension))

    def _save(self) -> None:
        with _LOCK:
            if self.index is not None:
                faiss.write_index(self.index, str(self.index_path))
            with open(self.metadata_path, "w") as f:
                json.dump(
                    {
                        "chunks": self.chunks,
                        "chunk_to_id": self.chunk_to_id,
                        "id_to_chunk": self.id_to_chunk,
                        "next_id": self.next_id,
                        "dimension": self.dimension,
                    },
                    f,
                )

    def _ensure_index(self, dimension: int) -> None:
        if self.index is None:
            self.dimension = dimension
            self.index = faiss.IndexIDMap(faiss.IndexFlatIP(dimension))
        elif self.dimension != dimension:
            raise ValueError(
                f"Embedding dimension changed ({self.dimension} -> {dimension}). "
                "Switching embedding models after documents were already indexed "
                "requires re-uploading existing documents."
            )

    # ------------------------------------------------------------------
    # Public API (kept identical to the previous ChromaDB implementation)
    # ------------------------------------------------------------------

    def add_chunks(self, chunks: list[Chunk], filename: str, embedding_model_name: str | None = None) -> None:
        if not chunks:
            return
        embedder = EmbeddingModel.get(embedding_model_name)
        texts = [c.text for c in chunks]
        vectors = np.array(embedder.embed_texts(texts), dtype="float32")

        self._ensure_index(vectors.shape[1])

        int_ids = []
        for c in chunks:
            int_id = self.next_id
            self.next_id += 1
            self.chunk_to_id[c.chunk_id] = int_id
            self.id_to_chunk[int_id] = c.chunk_id
            self.chunks[c.chunk_id] = {
                "text": c.text,
                "metadata": {
                    "doc_id": c.doc_id,
                    "filename": filename,
                    "page": c.page,
                    "content_type": c.content_type,
                    "section_heading": c.section_heading,
                },
            }
            int_ids.append(int_id)

        self.index.add_with_ids(vectors, np.array(int_ids, dtype="int64"))
        self._save()

    def query(self, query_text: str, top_k: int = 5, doc_ids: list[str] | None = None,
              embedding_model_name: str | None = None) -> list[dict]:
        if self.index is None or self.index.ntotal == 0:
            return []

        embedder = EmbeddingModel.get(embedding_model_name)
        vector = np.array([embedder.embed_query(query_text)], dtype="float32")

        # No native metadata filter in FAISS: over-fetch when scoping to
        # specific documents, then filter in Python.
        search_k = top_k if not doc_ids else min(self.index.ntotal, max(top_k * 20, 50))
        scores, ids = self.index.search(vector, search_k)

        hits = []
        for score, int_id in zip(scores[0], ids[0]):
            if int_id == -1:
                continue
            chunk_id = self.id_to_chunk.get(int(int_id))
            if chunk_id is None:
                continue
            record = self.chunks.get(chunk_id)
            if record is None:
                continue
            if doc_ids and record["metadata"]["doc_id"] not in doc_ids:
                continue
            hits.append(
                {
                    "chunk_id": chunk_id,
                    "text": record["text"],
                    "metadata": record["metadata"],
                    # Cosine similarity (via inner product on normalized vectors) is
                    # in [-1, 1]; convert to a "distance" so callers computing
                    # `1 - distance` (as a 0..1-ish similarity score for display)
                    # behave the same way they did with Chroma's cosine distance.
                    "distance": float(1 - score),
                }
            )
            if len(hits) >= top_k:
                break

        return hits

    def delete_document(self, doc_id: str) -> None:
        int_ids_to_remove = [
            int_id for chunk_id, int_id in self.chunk_to_id.items()
            if self.chunks.get(chunk_id, {}).get("metadata", {}).get("doc_id") == doc_id
        ]
        if not int_ids_to_remove:
            return

        if self.index is not None:
            self.index.remove_ids(np.array(int_ids_to_remove, dtype="int64"))

        chunk_ids_to_remove = [self.id_to_chunk[i] for i in int_ids_to_remove if i in self.id_to_chunk]
        for chunk_id in chunk_ids_to_remove:
            self.chunks.pop(chunk_id, None)
            int_id = self.chunk_to_id.pop(chunk_id, None)
            if int_id is not None:
                self.id_to_chunk.pop(int_id, None)

        self._save()

    def get_all_chunks_for_doc(self, doc_id: str) -> list[dict]:
        return [
            {"chunk_id": chunk_id, "text": record["text"], "metadata": record["metadata"]}
            for chunk_id, record in self.chunks.items()
            if record["metadata"]["doc_id"] == doc_id
        ]
