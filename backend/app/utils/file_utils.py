"""Small filesystem helpers used by the upload endpoint."""

from __future__ import annotations
import uuid
from pathlib import Path

from app.config import settings


def generate_doc_id() -> str:
    return str(uuid.uuid4())[:12]


def save_upload_file(doc_id: str, filename: str, content: bytes) -> str:
    """Persist an uploaded PDF to disk under a unique doc-id-prefixed name
    (avoids collisions between different users uploading files with the
    same original name) and returns the saved path."""
    safe_name = filename.replace("/", "_").replace("\\", "_")
    dest = Path(settings.upload_dir) / f"{doc_id}_{safe_name}"
    dest.write_bytes(content)
    return str(dest)


def file_size_kb(path: str) -> float:
    return round(Path(path).stat().st_size / 1024, 2)


def delete_upload_file(path: str) -> None:
    p = Path(path)
    if p.exists():
        p.unlink()
