"""
Centralized Google Gemini LLM client construction and invocation.

Every place in the backend that needs to call an LLM (chat RAG, document
summaries, FAQ generation) goes through `get_llm()` / `invoke_llm()`
instead of constructing `ChatGoogleGenerativeAI` directly. This keeps
API-key validation and error handling in exactly one place, and ensures
a missing or invalid `GOOGLE_API_KEY` surfaces as a clear, catchable
`HTTPException` (400/401/500) instead of an unhandled crash that would
otherwise bubble up as an opaque 500 Internal Server Error.
"""

from __future__ import annotations
from fastapi import HTTPException
from langchain_google_genai import ChatGoogleGenerativeAI

from app.config import settings

# Substrings seen in Google API error messages for an invalid/unauthorized key.
_AUTH_ERROR_MARKERS = (
    "api key not valid",
    "api_key_invalid",
    "invalid api key",
    "permission_denied",
    "unauthenticated",
    "401",
    "403",
)


def _require_api_key() -> None:
    if not settings.google_api_key or not settings.google_api_key.strip():
        raise HTTPException(
            status_code=400,
            detail=(
                "GOOGLE_API_KEY is not configured. Set GOOGLE_API_KEY in backend/.env "
                "(see backend/.env.example) and restart the server."
            ),
        )


def get_llm(model: str | None = None, temperature: float = 0.3) -> ChatGoogleGenerativeAI:
    """Construct a Gemini chat model, raising a clear HTTPException if the
    API key is missing or the client fails to initialize."""
    _require_api_key()
    try:
        print("API KEY =", settings.google_api_key[:10])
        return ChatGoogleGenerativeAI(
            model=model or settings.default_llm_model,
            temperature=temperature,
            google_api_key=settings.google_api_key,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to initialize Gemini model '{model or settings.default_llm_model}': {e}",
        )


def invoke_llm(llm: ChatGoogleGenerativeAI, messages: list) -> str:
    """Invoke Gemini and expose the actual error while debugging."""
    try:
        response = llm.invoke(messages)
        return response.content

    except Exception as e:
        import traceback

        print("\n" + "=" * 70)
        print("ACTUAL GEMINI ERROR:")
        print(repr(e))
        print("=" * 70)
        traceback.print_exc()
        print("=" * 70 + "\n")

        raise HTTPException(
            status_code=502,
            detail=f"Gemini request failed: {str(e)}",
        )