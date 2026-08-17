# Smart Document Assistant — Backend

FastAPI backend implementing a layout-aware RAG pipeline: PDF upload →
structured parsing (PyMuPDF + pdfplumber) → semantic/table-aware chunking →
Sentence-Transformer embeddings → FAISS → LangChain + Google Gemini generation
with page-level citations, plus summaries, FAQs, and auto-generated charts.

## Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

pip install -r requirements.txt

cp .env.example .env
# then edit .env and set GOOGLE_API_KEY=... (get one at https://aistudio.google.com/apikey)

uvicorn app.main:app --reload --port 8000
```

The API will be live at `http://localhost:8000`, with interactive docs at
`http://localhost:8000/docs`.

## Project layout

```
app/
  main.py              FastAPI app + router registration
  config.py            Environment-driven settings (reads GOOGLE_API_KEY)
  models/schemas.py    Pydantic request/response models
  core/
    pdf_processor.py   Layout-aware PDF parsing (text blocks + tables)
    chunker.py         Semantic + table-aware chunking
    embeddings.py       Sentence-Transformers wrapper (local, unrelated to Gemini)
    vectorstore.py      FAISS wrapper (IndexIDMap + JSON metadata sidecar)
    llm.py               Centralized Gemini client construction + error handling
    rag_pipeline.py      Retrieval + LangChain/Gemini generation + citations
    summarizer.py        Summary / key points / FAQ generation (Gemini)
    chart_extractor.py   Table → Recharts-ready chart conversion
    store.py             JSON-file persistence (documents, chats, settings)
  api/
    documents.py   upload / list / delete / summary / faqs / charts
    chat.py         RAG chat + session history
    search.py       standalone semantic search
    settings.py     runtime-tunable RAG settings
  utils/file_utils.py
  storage/          uploaded PDFs, faiss_index/, json metadata (gitignored)
```

## LLM provider: Google Gemini

This backend uses **Google Gemini** exclusively for text generation (chat
answers, summaries, key points, FAQs), via `langchain-google-genai` /
`ChatGoogleGenerativeAI`. There is no OpenAI dependency anywhere in this
project — the only LLM-related environment variable is `GOOGLE_API_KEY`.

- Default model: `gemini-2.5-flash` (configurable via `DEFAULT_LLM_MODEL`
  in `.env`, or per-request from the Settings page — options include
  `gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-2.0-flash`).
- All Gemini client construction and invocation goes through
  `app/core/llm.py`. If `GOOGLE_API_KEY` is missing, or Google rejects it
  as invalid, the API returns a clear `HTTPException` (400 for a missing
  key, 401 for a rejected/invalid key, 502 for other Gemini request
  failures) — never an unhandled 500 crash.
- Embeddings are **not** affected by this: they run locally via
  `sentence-transformers` (`all-MiniLM-L6-v2` by default) and are never
  sent to Google.

## Notes

- No external database is used (per project constraints) — document,
  chat, and settings metadata are persisted as JSON files under
  `app/storage/`. This is intentional for an MVP; swap `core/store.py`
  for a real DB later without touching the API layer.
- Embeddings run locally via `sentence-transformers` (no API cost); only
  chat/summary/FAQ generation calls the Gemini API.
- The first request will download the embedding model (~80MB) from
  Hugging Face — this requires internet access on first run.
