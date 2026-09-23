from __future__ import annotations

import uuid
from app.core import store


def _to_number(value):
    """Convert table value to a number."""
    if value is None:
        return None

    value = str(value).strip()
    value = value.replace(",", "")
    value = value.replace("%", "")

    try:
        return float(value)
    except ValueError:
        return None


def _rows_to_chart(rows, page):
    """Convert an extracted table into chart data."""

    if not rows or len(rows) < 2:
        return None

    # First row = column names
    headers = [str(x).strip() for x in rows[0]]

    if len(headers) < 2:
        return None

    # First column = X-axis
    x_key = headers[0]

    numeric_columns = []

    # Check every column after first column
    for col in range(1, len(headers)):

        values = []

        for row in rows[1:]:
            if col < len(row):
                values.append(_to_number(row[col]))

        valid_numbers = [v for v in values if v is not None]

        # At least 60% of values must be numbers
        if values and len(valid_numbers) / len(values) >= 0.6:
            numeric_columns.append(col)

    # No numeric column = cannot make chart
    if not numeric_columns:
        return None

    chart_data = []

    for row in rows[1:]:

        if not row or not str(row[0]).strip():
            continue

        item = {
            x_key: str(row[0]).strip()
        }

        for col in numeric_columns:

            value = None

            if col < len(row):
                value = _to_number(row[col])

            if value is not None:
                item[headers[col]] = value

        chart_data.append(item)

    if len(chart_data) < 2:
        return None

    # More than 6 rows → line chart
    # Otherwise → bar chart
    chart_type = "line" if len(chart_data) > 6 else "bar"

    return {
        "chart_id": str(uuid.uuid4())[:8],
        "title": f"Data from page {page}",
        "chart_type": chart_type,
        "page": page,
        "x_key": x_key,
        "y_keys": [headers[i] for i in numeric_columns],
        "data": chart_data,
    }


def extract_charts_for_document(doc_id: str):

    tables = store.get_tables(doc_id)

    charts = []

    for table in tables:

        rows = table.get("rows")
        page = table.get("page", 1)

        if not rows:
            continue

        chart = _rows_to_chart(rows, page)

        if chart:
            charts.append(chart)

    return charts