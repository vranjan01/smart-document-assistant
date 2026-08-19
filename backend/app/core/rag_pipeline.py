"""
RAG pipeline: retrieve -> build a citation-anchored prompt -> generate.

Directly targets two failure modes named in the project dossier:
  - Hallucination: the system prompt forces the model to answer *only*
    from supplied context and to say so explicitly when the answer
    isn't present, rather than inventing content.
  - Weak traceability: every retrieved chunk is tagged [S1], [S2]... in
    the prompt, the model is instructed to cite sources by tag inline,
    and we independently attach the underlying (doc, page, snippet) for
    every source used so the UI can render precise page-level citations
    even if the model's inline tags are imperfect.

Generation is powered by Google Gemini (langchain-google-genai /
ChatGoogleGenerativeAI) via the centralized app.core.llm helper — no
OpenAI dependency anywhere in this module.
"""

from __future__ import annotations
from langchain.schema import SystemMessage, HumanMessage

from app.core.vectorstore import VectorStore
from app.core.llm import get_llm, invoke_llm

SYSTEM_PROMPT = """You are a Smart Document Assistant. Answer the user's question using ONLY
the provided context sources below, which are excerpts from the user's uploaded PDF document(s).

Rules:
- Ground every claim strictly in the given sources. Never invent facts, numbers, or citations.
- If the answer is not contained in the sources, clearly say the document does not contain that information.
- When you use information from a source, cite it inline using its tag, e.g. [S1], [S2].
- If multiple sources support a point, cite all of them, e.g. [S1][S3].
- Prefer concise, well-structured answers. Use bullet points for lists or multi-part answers.
- If the sources contain a table (marked "[Table on page N]"), preserve numeric relationships accurately.
"""


def _build_context(hits: list[dict]) -> tuple[str, list[dict]]:
    context_parts = []
    sources = []
    for i, hit in enumerate(hits, start=1):
        tag = f"S{i}"
        meta = hit["metadata"]
        context_parts.append(f"[{tag}] (Document: {meta['filename']}, Page {meta['page']})\n{hit['text']}")
        sources.append(
            {
                "tag": tag,
                "doc_id": meta["doc_id"],
                "filename": meta["filename"],
                "page": meta["page"],
                "chunk_id": hit["chunk_id"],
                "snippet": hit["text"][:280],
                "score": 1 - hit["distance"] if hit.get("distance") is not None else None,
            }
        )
    return "\n\n---\n\n".join(context_parts), sources


def answer_query(
    query: str,
    doc_ids: list[str] | None = None,
    top_k: int = 5,
    temperature: float = 0.3,
    model: str = "gemini-3.6-flash",
) -> dict:
    """Run retrieval + generation for a single chat turn. Returns the
    answer text plus the list of citation dicts actually retrieved."""
    store = VectorStore.get()
    hits = store.query(query, top_k=top_k, doc_ids=doc_ids)

    if not hits:
        return {
            "answer": "I couldn't find any relevant information in the uploaded document(s) to answer that. "
                       "Try rephrasing your question, or upload a document that covers this topic.",
            "citations": [],
        }

    context, sources = _build_context(hits)

    llm = get_llm(model=model, temperature=temperature)

    user_prompt = f"""Context sources:

{context}

---

Question: {query}

Answer the question using only the context sources above, citing tags like [S1] inline."""

    answer_text = invoke_llm(llm, [SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=user_prompt)])

    citations = [
        {
            "doc_id": s["doc_id"],
            "filename": s["filename"],
            "page": s["page"],
            "chunk_id": s["chunk_id"],
            "snippet": s["snippet"],
            "score": s["score"],
        }
        for s in sources
    ]

    return {"answer": answer_text, "citations": citations}
