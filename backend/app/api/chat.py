"""
Chat API: conversational RAG over uploaded documents, with page-level
citations attached to every assistant message, plus session history
persistence so users can revisit previous conversations.
"""

from __future__ import annotations
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException

from app.core import store
from app.core.rag_pipeline import answer_query
from app.models.schemas import (
    ChatRequest, ChatResponse, ChatMessage, Citation,
    ChatSessionSummary, ChatHistoryResponse,
)

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat(req: ChatRequest):
    if not req.query.strip():
        raise HTTPException(400, "Query cannot be empty.")

    cfg = store.get_settings()
    session_id = req.session_id or str(uuid.uuid4())[:12]

    result = answer_query(
        query=req.query,
        doc_ids=req.doc_ids,
        top_k=req.top_k or cfg["top_k"],
        temperature=req.temperature if req.temperature is not None else cfg["temperature"],
        model=req.model or cfg["model"],
    )

    user_msg = {"role": "user", "content": req.query, "citations": [], "timestamp": datetime.utcnow().isoformat()}
    assistant_msg = {
        "role": "assistant",
        "content": result["answer"],
        "citations": result["citations"],
        "timestamp": datetime.utcnow().isoformat(),
    }

    store.append_message(session_id, user_msg, title_hint=req.query)
    store.append_message(session_id, assistant_msg, title_hint=req.query)

    return ChatResponse(
        session_id=session_id,
        message=ChatMessage(
            role="assistant",
            content=result["answer"],
            citations=[Citation(**c) for c in result["citations"]],
        ),
    )


@router.get("/sessions", response_model=list[ChatSessionSummary])
async def list_sessions():
    sessions = store.list_sessions()
    summaries = [
        ChatSessionSummary(
            session_id=s["session_id"],
            title=s["title"],
            created_at=s["created_at"],
            updated_at=s["updated_at"],
            message_count=len(s["messages"]),
        )
        for s in sessions.values()
    ]
    return sorted(summaries, key=lambda s: s.updated_at, reverse=True)


@router.get("/sessions/{session_id}", response_model=ChatHistoryResponse)
async def get_session_history(session_id: str):
    session = store.get_session(session_id)
    if not session:
        raise HTTPException(404, "Chat session not found.")
    return ChatHistoryResponse(session_id=session_id, messages=session["messages"])


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    deleted = store.delete_session(session_id)
    if not deleted:
        raise HTTPException(404, "Chat session not found.")
    return {"session_id": session_id, "deleted": True}

@router.post("/synthesize", response_model=ChatResponse)
async def synthesize(req: ChatRequest):
    if not req.query.strip():
        raise HTTPException(400, "Synthesis query cannot be empty.")

    if not req.doc_ids or len(req.doc_ids) < 2:
        raise HTTPException(
            400,
            "Select at least two documents for multi-document synthesis."
        )

    cfg = store.get_settings()
    session_id = req.session_id or str(uuid.uuid4())[:12]

    synthesis_query = f"""
Perform a multi-document synthesis using the provided documents.

User request:
{req.query}

Requirements:
- Combine information from the selected documents.
- Compare or connect information across documents when relevant.
- Clearly identify differences or similarities when applicable.
- Do not invent information that is not present in the documents.
- Use the available source citations.
"""

    result = answer_query(
        query=synthesis_query,
        doc_ids=req.doc_ids,
        top_k=req.top_k or cfg["top_k"],
        temperature=(
            req.temperature
            if req.temperature is not None
            else cfg["temperature"]
        ),
        model=req.model or cfg["model"],
    )

    return ChatResponse(
        session_id=session_id,
        message=ChatMessage(
            role="assistant",
            content=result["answer"],
            citations=[Citation(**c) for c in result["citations"]],
        ),
    )