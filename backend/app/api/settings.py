"""Settings API: read/update RAG-tunable parameters (chunk size, overlap,
top-k, temperature, LLM model, embedding model). Persisted to
app_settings.json so they survive backend restarts."""

from __future__ import annotations
from fastapi import APIRouter

from app.core import store
from app.models.schemas import AppSettings

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=AppSettings)
async def get_settings():
    return AppSettings(**store.get_settings())


@router.put("", response_model=AppSettings)
async def update_settings(new_settings: AppSettings):
    updated = store.save_settings(new_settings.model_dump())
    return AppSettings(**updated)


AVAILABLE_MODELS = ["gemini-3.6-flash", "gemini-2.5-pro", "gemini-2.0-flash"]
AVAILABLE_EMBEDDING_MODELS = ["all-MiniLM-L6-v2", "all-mpnet-base-v2", "multi-qa-MiniLM-L6-cos-v1"]


@router.get("/options")
async def get_options():
    return {"models": AVAILABLE_MODELS, "embedding_models": AVAILABLE_EMBEDDING_MODELS}
