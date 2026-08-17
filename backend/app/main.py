"""
Smart Document Assistant — FastAPI application entrypoint.

Run with:
    uvicorn app.main:app --reload --port 8000
(from the backend/ directory)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api import documents, chat, search, settings as settings_api

app = FastAPI(
    title="Smart Document Assistant API",
    description="Layout-aware RAG backend for conversational document intelligence and visualization.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router)
app.include_router(chat.router)
app.include_router(search.router)
app.include_router(settings_api.router)


@app.get("/")
async def root():
    return {"status": "ok", "service": "Smart Document Assistant API"}


@app.get("/api/health")
async def health():
    return {"status": "healthy"}
