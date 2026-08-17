"""Standalone semantic search API (no generation) — lets users browse raw
matching passages across their document library without invoking the LLM."""

from __future__ import annotations
from fastapi import APIRouter, HTTPException

from app.core import store
from app.core.vectorstore import VectorStore
from app.models.schemas import SearchRequest, SearchResponse, SearchResult

router = APIRouter(prefix="/api/search", tags=["search"])


@router.post("", response_model=SearchResponse)
async def semantic_search(req: SearchRequest):
    if not req.query.strip():
        raise HTTPException(400, "Query cannot be empty.")

    cfg = store.get_settings()
    hits = VectorStore.get().query(
        req.query,
        top_k=req.top_k or cfg["top_k"],
        doc_ids=req.doc_ids,
        embedding_model_name=cfg["embedding_model"],
    )

    results = [
        SearchResult(
            doc_id=h["metadata"]["doc_id"],
            filename=h["metadata"]["filename"],
            page=h["metadata"]["page"],
            chunk_id=h["chunk_id"],
            text=h["text"],
            score=round(1 - h["distance"], 4) if h.get("distance") is not None else 0.0,
        )
        for h in hits
    ]
    return SearchResponse(results=results)
