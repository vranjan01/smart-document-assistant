"""
Lightweight JSON-file persistence layer.

The project spec explicitly excludes Firebase/Supabase/Mongo/Postgres/
Redis. For an MVP the metadata volume is small (document records, chat
sessions), so plain JSON files under app/storage/ are sufficient and
keep the stack dependency-free. All access is funneled through this
module so it can be swapped for a real DB later without touching
callers.
"""

from __future__ import annotations
import json
import threading
from pathlib import Path
from datetime import datetime

from app.config import settings

_LOCK = threading.Lock()

DOCS_FILE = Path(settings.data_dir) / "documents.json"
CHATS_FILE = Path(settings.data_dir) / "chat_sessions.json"
SETTINGS_FILE = Path(settings.data_dir) / "app_settings.json"
TABLES_FILE = Path(settings.data_dir) / "tables.json"


def _read(path: Path, default):
    if not path.exists():
        return default
    with open(path, "r") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return default


def _write(path: Path, data) -> None:
    with _LOCK:
        with open(path, "w") as f:
            json.dump(data, f, indent=2, default=str)


# ---------------------------------------------------------------------------
# Documents
# ---------------------------------------------------------------------------

def list_documents() -> list[dict]:
    return _read(DOCS_FILE, [])


def save_document(doc: dict) -> None:
    docs = list_documents()
    docs = [d for d in docs if d["doc_id"] != doc["doc_id"]]
    docs.append(doc)
    _write(DOCS_FILE, docs)


def get_document(doc_id: str) -> dict | None:
    for d in list_documents():
        if d["doc_id"] == doc_id:
            return d
    return None


def delete_document_record(doc_id: str) -> bool:
    docs = list_documents()
    new_docs = [d for d in docs if d["doc_id"] != doc_id]
    _write(DOCS_FILE, new_docs)
    return len(new_docs) != len(docs)


# ---------------------------------------------------------------------------
# Chat sessions
# ---------------------------------------------------------------------------

def list_sessions() -> dict:
    return _read(CHATS_FILE, {})


def get_session(session_id: str) -> dict | None:
    return list_sessions().get(session_id)


def save_session(session_id: str, session: dict) -> None:
    sessions = list_sessions()
    sessions[session_id] = session
    _write(CHATS_FILE, sessions)


def append_message(session_id: str, message: dict, title_hint: str = "") -> dict:
    sessions = list_sessions()
    now = datetime.utcnow().isoformat()
    if session_id not in sessions:
        sessions[session_id] = {
            "session_id": session_id,
            "title": title_hint[:60] or "New Chat",
            "created_at": now,
            "updated_at": now,
            "messages": [],
        }
    sessions[session_id]["messages"].append(message)
    sessions[session_id]["updated_at"] = now
    _write(CHATS_FILE, sessions)
    return sessions[session_id]


def delete_session(session_id: str) -> bool:
    sessions = list_sessions()
    if session_id in sessions:
        del sessions[session_id]
        _write(CHATS_FILE, sessions)
        return True
    return False


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------

DEFAULT_SETTINGS = {
    "chunk_size": settings.default_chunk_size,
    "chunk_overlap": settings.default_chunk_overlap,
    "top_k": settings.default_top_k,
    "temperature": settings.default_temperature,
    "model": settings.default_llm_model,
    "embedding_model": settings.embedding_model,
}


def get_settings() -> dict:
    return _read(SETTINGS_FILE, DEFAULT_SETTINGS)


def save_settings(new_settings: dict) -> dict:
    current = get_settings()
    current.update(new_settings)
    _write(SETTINGS_FILE, current)
    return current


# ---------------------------------------------------------------------------
# Raw extracted tables (kept in their own JSON file, separate from the
# chunk text/metadata store in vectorstore.py, purely for organizational
# clarity). Used by the chart extractor to turn numeric tables into
# Recharts-ready series.
# ---------------------------------------------------------------------------

def save_tables(doc_id: str, tables: list[dict]) -> None:
    all_tables = _read(TABLES_FILE, {})
    all_tables[doc_id] = tables
    _write(TABLES_FILE, all_tables)


def get_tables(doc_id: str) -> list[dict]:
    all_tables = _read(TABLES_FILE, {})
    return all_tables.get(doc_id, [])


def delete_tables(doc_id: str) -> None:
    all_tables = _read(TABLES_FILE, {})
    if doc_id in all_tables:
        del all_tables[doc_id]
        _write(TABLES_FILE, all_tables)
