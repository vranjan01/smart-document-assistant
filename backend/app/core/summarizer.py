"""
Document-level intelligence: summaries, key points, and FAQ generation.

Rather than summarizing raw page text (which re-introduces the "lost in
the middle" problem on long PDFs), we retrieve a broad, diverse sample
of a document's own chunks from the vector store (already page/section
-tagged) and summarize *those*, keeping the LLM's context small,
relevant, and traceable.

Generation is powered by Google Gemini (langchain-google-genai /
ChatGoogleGenerativeAI) via the centralized app.core.llm helper — no
OpenAI dependency anywhere in this module.
"""

from __future__ import annotations
import json
from langchain.schema import SystemMessage, HumanMessage

from app.core.vectorstore import VectorStore
from app.core.llm import get_llm, invoke_llm


def _get_document_context(doc_id: str, max_chunks: int = 40) -> str:
    store = VectorStore.get()
    chunks = store.get_all_chunks_for_doc(doc_id)
    # order by page for a coherent read-through
    chunks.sort(key=lambda c: c["metadata"].get("page", 0))
    chunks = chunks[:max_chunks]
    return "\n\n".join(c["text"] for c in chunks)


def generate_summary(doc_id: str, model: str = "gemini-3.6-flash", temperature: float = 0.3) -> dict:
    context = _get_document_context(doc_id)
    llm = get_llm(model=model, temperature=temperature)

    prompt = f"""Below are excerpts from a document, in page order.

{context}

---
Respond ONLY with valid JSON (no markdown fences), in this exact shape:
{{
  "summary": "<a concise 4-6 sentence summary of the document>",
  "key_points": ["<key point 1>", "<key point 2>", "... 5-8 bullet points total"]
}}"""

    content = invoke_llm(llm, [
        SystemMessage(content="You are a precise technical document summarizer. Base your output strictly on the given text."),
        HumanMessage(content=prompt),
    ])
    data = _safe_json(content)
    return {
        "summary": data.get("summary", content),
        "key_points": data.get("key_points", []),
    }


def generate_faqs(doc_id: str, model: str = "gemini-3.6-flash", temperature: float = 0.3, num_faqs: int = 6) -> list[dict]:
    context = _get_document_context(doc_id)
    llm = get_llm(model=model, temperature=temperature)

    prompt = f"""Below are excerpts from a document, in page order.

{context}

---
Generate {num_faqs} frequently-asked-questions a reader might have about this document,
each with a concise, accurate answer grounded strictly in the text above.

Respond ONLY with valid JSON (no markdown fences), as a JSON array:
[{{"question": "...", "answer": "..."}}, ...]"""

    content = invoke_llm(llm, [
        SystemMessage(content="You generate grounded FAQs strictly from provided document text."),
        HumanMessage(content=prompt),
    ])
    data = _safe_json(content, default=[])
    if isinstance(data, dict) and "faqs" in data:
        data = data["faqs"]
    return data if isinstance(data, list) else []


def _safe_json(text: str, default=None):
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:]
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return default if default is not None else {}
