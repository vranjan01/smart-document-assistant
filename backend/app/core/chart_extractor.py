"""
Automatic chart generation from extracted tables.

Takes the raw table grids captured during PDF parsing (core/pdf_processor
-> core/chunker, stored as chunk metadata with content_type="table") and
converts numeric tables into Recharts-ready series: [{x: ..., seriesA: 1.2, ...}].

Heuristics (kept simple and explainable for a final-year demo):
  - First row = header labels.
  - First column = categorical/x-axis labels (e.g. year, category, month).
  - Any other column where >= 60% of values parse as numbers becomes a
    numeric series.
  - Tables with fewer than 2 numeric columns-worth of data, or no usable
    rows, are skipped (not every table is chart-worthy).
"""

from __future__ import annotations
import re
import uuid

from app.core import store

_NUM_RE = re.compile(r"^-?[\d,]+\.?\d*%?$")


def _try_parse_number(s: str) -> float | None:
    s = s.strip().replace(",", "").replace("%", "")
    if not s or not _NUM_RE.match(s.strip() + ("%" if "%" in s else "")):
        pass
    try:
        return float(s)
    except (ValueError, TypeError):
        return None


def _rows_to_chart(rows: list[list[str]], page: int) -> dict | None:
    if not rows or len(rows) < 2:
        return None
    header = [str(h).strip() if h else f"col_{i}" for i, h in enumerate(rows[0])]
    body = rows[1:]
    if len(header) < 2:
        return None

    x_key = header[0]
    numeric_cols: list[int] = []
    for col_idx in range(1, len(header)):
        values = [row[col_idx] if col_idx < len(row) else "" for row in body]
        numeric_count = sum(1 for v in values if _try_parse_number(v) is not None)
        if values and numeric_count / len(values) >= 0.6:
            numeric_cols.append(col_idx)

    if len(numeric_cols) < 1:
        return None

    y_keys = [header[i] for i in numeric_cols]
    data = []
    for row in body:
        if not row or not str(row[0]).strip():
            continue
        entry = {x_key: str(row[0]).strip()}
        for i in numeric_cols:
            val = row[i] if i < len(row) else None
            parsed = _try_parse_number(val) if val else None
            entry[header[i]] = parsed if parsed is not None else 0
        data.append(entry)

    if len(data) < 2:
        return None

    chart_type = "line" if len(data) > 6 else "bar"

    return {
        "chart_id": str(uuid.uuid4())[:8],
        "title": f"Data from page {page}",
        "chart_type": chart_type,
        "page": page,
        "x_key": x_key,
        "y_keys": y_keys,
        "data": data,
    }


def extract_charts_for_document(doc_id: str) -> list[dict]:
    """Scan every table extracted for a document and return any that
    can be rendered as a Recharts-ready chart."""
    tables = store.get_tables(doc_id)
    charts = []
    for table in tables:
        raw_rows = table.get("rows")
        page = table.get("page", 1)
        if not raw_rows:
            continue
        chart = _rows_to_chart(raw_rows, page)
        if chart:
            charts.append(chart)
    return charts
