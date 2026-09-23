"""
Documents API.

Handles the full ingestion pipeline on upload:
  upload -> parse (layout-aware) -> chunk (semantic) -> embed -> store in FAISS
and exposes per-document intelligence: summaries, key points, FAQs, and
auto-generated charts extracted from tables.
"""

from __future__ import annotations
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException

from app.core import store
from app.core.pdf_processor import parse_pdf
from app.core.chunker import chunk_document
from app.core.vectorstore import VectorStore
from app.core.summarizer import generate_summary, generate_faqs
from app.core.chart_extractor import extract_charts_for_document
from app.utils.file_utils import generate_doc_id, save_upload_file, file_size_kb, delete_upload_file
from app.models.schemas import (
    DocumentMeta, UploadResponse, DeleteResponse,
    SummaryResponse, FAQResponse, ChartsResponse, TablesResponse
)

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.post("/upload", response_model=UploadResponse)
async def upload_documents(files: list[UploadFile] = File(...)):
    """Accepts one or more PDFs (multi-upload supported) and runs each
    through the full ingestion pipeline synchronously."""
    settings_cfg = store.get_settings()
    results: list[DocumentMeta] = []

    for file in files:
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(400, f"'{file.filename}' is not a PDF file.")

        doc_id = generate_doc_id()
        content = await file.read()
        path = save_upload_file(doc_id, file.filename, content)

        try:
            parsed = parse_pdf(path)
            chunks = chunk_document(
                parsed, doc_id,
                chunk_size=settings_cfg["chunk_size"],
                chunk_overlap=settings_cfg["chunk_overlap"],
            )
            VectorStore.get().add_chunks(chunks, filename=file.filename,
                                          embedding_model_name=settings_cfg["embedding_model"])

            # Persist raw tables separately for chart extraction
            tables = [
                {"page": t.page, "rows": t.rows}
                for page in parsed.pages
                for t in page.tables
            ]
            store.save_tables(doc_id, tables)

            doc_record = {
                "doc_id": doc_id,
                "filename": file.filename,
                "num_pages": parsed.num_pages,
                "num_chunks": len(chunks),
                "has_tables": parsed.has_tables,
                "uploaded_at": datetime.utcnow().isoformat(),
                "status": "ready",
                "size_kb": file_size_kb(path),
                "path": path,
            }
            store.save_document(doc_record)
            results.append(DocumentMeta(**{k: v for k, v in doc_record.items() if k != "path"}))
        except Exception as e:
            delete_upload_file(path)
            raise HTTPException(500, f"Failed to process '{file.filename}': {e}")

    return UploadResponse(documents=results)


@router.get("", response_model=list[DocumentMeta])
async def list_documents():
    docs = store.list_documents()
    return [DocumentMeta(**{k: v for k, v in d.items() if k != "path"}) for d in docs]


@router.delete("/{doc_id}", response_model=DeleteResponse)
async def delete_document(doc_id: str):
    doc = store.get_document(doc_id)
    if not doc:
        raise HTTPException(404, "Document not found.")

    VectorStore.get().delete_document(doc_id)
    store.delete_tables(doc_id)
    if doc.get("path"):
        delete_upload_file(doc["path"])
    store.delete_document_record(doc_id)

    return DeleteResponse(doc_id=doc_id, deleted=True)


@router.get("/{doc_id}/summary", response_model=SummaryResponse)
async def get_summary(doc_id: str):
    _require_doc(doc_id)
    cfg = store.get_settings()
    result = generate_summary(doc_id, model=cfg["model"], temperature=cfg["temperature"])
    return SummaryResponse(doc_id=doc_id, **result)


@router.get("/{doc_id}/faqs", response_model=FAQResponse)
async def get_faqs(doc_id: str):
    _require_doc(doc_id)
    cfg = store.get_settings()
    faqs = generate_faqs(doc_id, model=cfg["model"], temperature=cfg["temperature"])
    return FAQResponse(doc_id=doc_id, faqs=faqs)


@router.get("/{doc_id}/charts", response_model=ChartsResponse)
async def get_charts(doc_id: str):
    _require_doc(doc_id)
    charts = extract_charts_for_document(doc_id)
    return ChartsResponse(doc_id=doc_id, charts=charts)

@router.get("/{doc_id}/tables", response_model=TablesResponse)
async def get_tables(doc_id: str):
    _require_doc(doc_id)
    tables = store.get_tables(doc_id)
    return TablesResponse(doc_id=doc_id, tables=tables)

def _require_doc(doc_id: str) -> dict:
    doc = store.get_document(doc_id)
    if not doc:
        raise HTTPException(404, "Document not found.")
    return doc
