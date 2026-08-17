"""
Semantic / layout-aware chunking.

Directly addresses the "Context Fragmentation" and "Table Scrambling"
root causes named in the project dossier: naive fixed-character
splitting cuts through paragraphs and shreds tables. Here we:

  1. Group text blocks into sections using heading boundaries (a
     section = a heading + the prose that follows it, until the next
     heading). Sections are then split with a recursive, sentence/paragraph
     -aware splitter (LangChain's RecursiveCharacterTextSplitter) instead
     of blind character counting, and each resulting chunk is prefixed
     with its section heading so context ("what is this chunk about") is
     never lost even after retrieval.
  2. Keep every extracted table as its own atomic chunk (never split),
     tagged with `content_type="table"`, so numeric grids retrieved by
     the RAG pipeline stay structurally intact and citable.

Every chunk carries page-level metadata for citation traceability.
"""

from __future__ import annotations
from dataclasses import dataclass, field
import uuid

from langchain.text_splitter import RecursiveCharacterTextSplitter

from app.core.pdf_processor import ParsedDocument


@dataclass
class Chunk:
    chunk_id: str
    doc_id: str
    text: str
    page: int
    content_type: str = "text"  # "text" | "table" | "heading_section"
    section_heading: str = ""
    metadata: dict = field(default_factory=dict)


def _group_into_sections(parsed: ParsedDocument) -> list[dict]:
    """Walk all pages in order and group consecutive blocks into
    sections, where a heading block starts a new section."""
    sections: list[dict] = []
    current = {"heading": "Document Start", "page": 1, "text_parts": []}

    for page_content in parsed.pages:
        for block in page_content.blocks:
            if block.is_heading:
                if current["text_parts"]:
                    sections.append(current)
                current = {"heading": block.text, "page": block.page, "text_parts": []}
            else:
                current["text_parts"].append((block.page, block.text))
    if current["text_parts"]:
        sections.append(current)
    return sections


def chunk_document(parsed: ParsedDocument, doc_id: str, chunk_size: int = 1000,
                    chunk_overlap: int = 200) -> list[Chunk]:
    """Produce citation-ready chunks from a parsed document."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
    )

    chunks: list[Chunk] = []

    # 1) Prose sections -> recursive split, tagged with heading + page
    sections = _group_into_sections(parsed)
    for section in sections:
        heading = section["heading"]
        text_parts = section["text_parts"]
        if not text_parts:
            continue
        full_text = "\n".join(t for _, t in text_parts)
        # page of a sub-chunk = page of the nearest preceding text part
        page_boundaries = text_parts
        splits = splitter.split_text(full_text)
        for split_text in splits:
            page = _estimate_page_for_split(split_text, page_boundaries)
            chunks.append(
                Chunk(
                    chunk_id=str(uuid.uuid4())[:8],
                    doc_id=doc_id,
                    text=f"[Section: {heading}]\n{split_text}",
                    page=page,
                    content_type="text",
                    section_heading=heading,
                )
            )

    # 2) Tables -> atomic chunks, never split
    for page_content in parsed.pages:
        for table in page_content.tables:
            chunks.append(
                Chunk(
                    chunk_id=str(uuid.uuid4())[:8],
                    doc_id=doc_id,
                    text=f"[Table on page {table.page}]\n{table.markdown}",
                    page=table.page,
                    content_type="table",
                    section_heading="Table",
                    metadata={"raw_rows": table.rows},
                )
            )

    return chunks


def _estimate_page_for_split(split_text: str, text_parts: list[tuple[int, str]]) -> int:
    """Best-effort page attribution: find which original (page, text) pair
    this split most overlaps with, so citations point to the correct page
    even after re-chunking merges/splits the underlying blocks."""
    if not text_parts:
        return 1
    snippet = split_text[:60].strip()
    for page, text in text_parts:
        if snippet and snippet[:30] in text:
            return page
    return text_parts[0][0]
