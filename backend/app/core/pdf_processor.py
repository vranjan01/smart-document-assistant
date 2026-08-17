"""
Layout-aware PDF processing.

Combines two libraries deliberately:
  - PyMuPDF (fitz): fast text + block/line layout extraction (reading order,
    headings via font-size heuristics), used for the semantic text stream.
  - pdfplumber: dedicated table detection/extraction, since PyMuPDF's raw
    text stream flattens table grids into unreadable strings (the exact
    "Table Scrambling" failure mode called out in the project dossier).

Design goal: never hand the chunker a flat character blob. Each page is
returned as a structured `PageContent` object containing ordered text
blocks (with heading-level hints) *and* separately-extracted tables, so
the chunker (core/chunker.py) can chunk prose and tables using different
strategies instead of naive fixed-length splitting.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from pathlib import Path

import fitz  # PyMuPDF
import pdfplumber


@dataclass
class TextBlock:
    text: str
    page: int
    is_heading: bool = False
    font_size: float = 0.0


@dataclass
class TableBlock:
    page: int
    rows: list[list[str]]
    markdown: str


@dataclass
class PageContent:
    page: int
    blocks: list[TextBlock] = field(default_factory=list)
    tables: list[TableBlock] = field(default_factory=list)

    @property
    def plain_text(self) -> str:
        return "\n".join(b.text for b in self.blocks if b.text.strip())


@dataclass
class ParsedDocument:
    filename: str
    num_pages: int
    pages: list[PageContent]

    @property
    def has_tables(self) -> bool:
        return any(p.tables for p in self.pages)


def _table_to_markdown(rows: list[list[str]]) -> str:
    """Render an extracted table grid as a Markdown table so structural
    relationships (columns/headers) survive as text the LLM can reason
    about, instead of collapsing into a comma-separated blob."""
    if not rows:
        return ""
    clean_rows = [[(c or "").strip().replace("\n", " ") for c in row] for row in rows]
    header, *body = clean_rows
    lines = ["| " + " | ".join(header) + " |", "| " + " | ".join(["---"] * len(header)) + " |"]
    for row in body:
        # pad short rows so column count matches header
        row = row + [""] * (len(header) - len(row))
        lines.append("| " + " | ".join(row[: len(header)]) + " |")
    return "\n".join(lines)


def _extract_text_blocks(page: fitz.Page, page_num: int) -> list[TextBlock]:
    """Extract text preserving reading order and flag probable headings
    using relative font-size (a lightweight layout signal in place of a
    full layout model)."""
    blocks: list[TextBlock] = []
    raw = page.get_text("dict")
    sizes = [
        span["size"]
        for b in raw.get("blocks", [])
        for l in b.get("lines", [])
        for span in l.get("spans", [])
    ]
    avg_size = sum(sizes) / len(sizes) if sizes else 10.0

    for b in raw.get("blocks", []):
        if b.get("type") != 0:  # skip images
            continue
        block_text_parts = []
        max_size = 0.0
        for line in b.get("lines", []):
            line_text = "".join(span["text"] for span in line.get("spans", []))
            for span in line.get("spans", []):
                max_size = max(max_size, span["size"])
            if line_text.strip():
                block_text_parts.append(line_text)
        block_text = "\n".join(block_text_parts).strip()
        if not block_text:
            continue
        is_heading = max_size > avg_size * 1.25 and len(block_text) < 120
        blocks.append(TextBlock(text=block_text, page=page_num, is_heading=is_heading, font_size=max_size))
    return blocks


def _extract_tables(pdf_path: str, page_num: int, plumber_page) -> list[TableBlock]:
    tables: list[TableBlock] = []
    try:
        raw_tables = plumber_page.extract_tables()
    except Exception:
        raw_tables = []
    for rows in raw_tables or []:
        if not rows or len(rows) < 2:
            continue
        md = _table_to_markdown(rows)
        tables.append(TableBlock(page=page_num, rows=rows, markdown=md))
    return tables


def parse_pdf(pdf_path: str) -> ParsedDocument:
    """Parse a PDF into a layout-aware structure: per-page text blocks
    (with heading hints) and per-page tables (as Markdown grids)."""
    filename = Path(pdf_path).name
    doc = fitz.open(pdf_path)
    pages: list[PageContent] = []

    with pdfplumber.open(pdf_path) as plumber_pdf:
        for i in range(len(doc)):
            fitz_page = doc[i]
            page_num = i + 1  # 1-indexed for human-facing citations
            blocks = _extract_text_blocks(fitz_page, page_num)

            tables: list[TableBlock] = []
            if i < len(plumber_pdf.pages):
                tables = _extract_tables(pdf_path, page_num, plumber_pdf.pages[i])

            pages.append(PageContent(page=page_num, blocks=blocks, tables=tables))

    num_pages = len(doc)
    doc.close()
    return ParsedDocument(filename=filename, num_pages=num_pages, pages=pages)
