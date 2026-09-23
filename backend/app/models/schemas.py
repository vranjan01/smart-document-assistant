"""
Pydantic schemas shared across the API layer.
Keeping these centralized avoids duplicated response shapes between
documents / chat / search / settings routes.
"""

from __future__ import annotations
from typing import Optional, Literal
from pydantic import BaseModel, Field
from datetime import datetime


# ---------------------------------------------------------------------------
# Documents
# ---------------------------------------------------------------------------

class DocumentMeta(BaseModel):
    doc_id: str
    filename: str
    num_pages: int
    num_chunks: int
    has_tables: bool
    uploaded_at: datetime
    status: Literal["processing", "ready", "failed"] = "ready"
    size_kb: float = 0.0


class UploadResponse(BaseModel):
    documents: list[DocumentMeta]


class DeleteResponse(BaseModel):
    doc_id: str
    deleted: bool


# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------

class Citation(BaseModel):
    doc_id: str
    filename: str
    page: int
    snippet: str
    chunk_id: str
    score: Optional[float] = None


class ChatRequest(BaseModel):
    query: str
    doc_ids: Optional[list[str]] = None  # None = search across all documents
    session_id: Optional[str] = None
    top_k: Optional[int] = None
    temperature: Optional[float] = None
    model: Optional[str] = None


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    citations: list[Citation] = Field(default_factory=list)
    chart: Optional[dict] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ChatResponse(BaseModel):
    session_id: str
    message: ChatMessage


class ChatSessionSummary(BaseModel):
    session_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int


class ChatHistoryResponse(BaseModel):
    session_id: str
    messages: list[ChatMessage]


# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------

class SearchRequest(BaseModel):
    query: str
    doc_ids: Optional[list[str]] = None
    top_k: Optional[int] = None


class SearchResult(BaseModel):
    doc_id: str
    filename: str
    page: int
    chunk_id: str
    text: str
    score: float


class SearchResponse(BaseModel):
    results: list[SearchResult]


# ---------------------------------------------------------------------------
# Document intelligence: summary / FAQ / key points / charts
# ---------------------------------------------------------------------------

class SummaryResponse(BaseModel):
    doc_id: str
    summary: str
    key_points: list[str]


class FAQItem(BaseModel):
    question: str
    answer: str
    page: Optional[int] = None


class FAQResponse(BaseModel):
    doc_id: str
    faqs: list[FAQItem]


class ChartSeries(BaseModel):
    name: str
    data: list[dict]


class ExtractedChart(BaseModel):
    chart_id: str
    title: str
    chart_type: Literal["bar", "line", "pie"] = "bar"
    page: int
    x_key: str
    y_keys: list[str]
    data: list[dict]


class ChartsResponse(BaseModel):
    doc_id: str
    charts: list[ExtractedChart]

class ExtractedTable(BaseModel):
    page: int
    rows: list[list[Optional[str]]]


class TablesResponse(BaseModel):
    doc_id: str
    tables: list[ExtractedTable]

# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------

class AppSettings(BaseModel):
    chunk_size: int = 1000
    chunk_overlap: int = 200
    top_k: int = 5
    temperature: float = 0.3
    model: str = "gemini-3.6-flash"
    embedding_model: str = "all-MiniLM-L6-v2"
