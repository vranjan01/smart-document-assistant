# Smart Document Assistant for Information Retrieval and Visualization

A full-stack, layout-aware **RAG** (Retrieval-Augmented Generation) application for
conversational document intelligence: upload PDFs, chat with them using page-level
citations, run semantic search, auto-generate summaries/FAQs/key points, and
auto-visualize numeric tables as charts.

Built as a final-year engineering project MVP — feature-complete, modular, and
demo-ready.

---

## ✨ Features

- 📄 **PDF upload** — single or multiple files, drag-and-drop
- 🧠 **Layout-aware parsing** — PyMuPDF (text/headings) + pdfplumber (tables), so
  tables never get scrambled into flat text
- ✂️ **Semantic chunking** — heading-aware section splitting + atomic table chunks
  (never blind fixed-length slicing)
- 🔎 **Embeddings** — local Sentence-Transformers (no API cost)
- 🗄️ **Vector store** — FAISS (persistent, local, no external DB service)
- 💬 **Chat with your PDFs** — LangChain + Google Gemini RAG pipeline, grounded answers,
  **page-level citations** on every response
- 🔍 **Semantic search** — browse raw matching passages without invoking the LLM
- 📝 **Document summaries, key points, and FAQ generation**
- 📊 **Automatic chart generation** from numeric tables (Recharts)
- 🗂️ **Chat history** — multiple sessions, revisit any time
- 🗑️ **Delete documents** — removes vectors, tables, and file from disk
- ⚙️ **Settings** — chunk size, overlap, top-k, temperature, LLM + embedding model
- 🌙 **Responsive dark-mode UI** — inspired by ChatGPT / Perplexity / Notion AI

---

## 🏗️ Architecture

```
PDF Upload
   │
   ▼
PyMuPDF (text + headings)  +  pdfplumber (tables)
   │
   ▼
Semantic Chunker (heading-aware sections + atomic tables)
   │
   ▼
Sentence-Transformers Embeddings
   │
   ▼
FAISS (persistent local vector index)
   │
   ├──► Chat (LangChain + Gemini) ──► grounded answer + page citations
   ├──► Semantic Search ──► ranked passages
   ├──► Summarizer ──► summary / key points / FAQs
   └──► Chart Extractor ──► Recharts-ready numeric series
```

**Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui-style
components (Radix primitives) + Framer Motion + Recharts.

**Backend:** FastAPI + LangChain + Google Gemini (`langchain-google-genai`) + FAISS +
Sentence-Transformers + PyMuPDF + pdfplumber + Pandas.

No Firebase / Supabase / MongoDB / PostgreSQL / Redis / Docker Swarm / Kubernetes /
microservices — document, chat, and settings metadata are persisted as simple JSON
files under `backend/app/storage/`, and vectors live in a local FAISS index.

---

## 🚀 Getting started

### 1. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# edit .env → set GOOGLE_API_KEY=... (get one at https://aistudio.google.com/apikey)

uvicorn app.main:app --reload --port 8000
```

Backend runs at `http://localhost:8000` (interactive docs at `/docs`).

> The first request will download the local embedding model (~80MB) from Hugging
> Face — requires internet access on first run only.

### 2. Frontend

```bash
cd frontend
npm install

cp .env.example .env.local
# defaults to NEXT_PUBLIC_API_URL=http://localhost:8000, edit if needed

npm run dev
```

Frontend runs at `http://localhost:3000`.

### 3. Use it

1. Go to **Documents**, drag in one or more PDFs.
2. Click **Insights** on any document for its summary, key points, FAQs, and
   auto-generated charts.
3. Go to **Chat**, ask questions — answers cite the exact page(s) they came from.
4. Use **Semantic Search** to browse raw matching passages.
5. Tune chunking/retrieval/model behavior in **Settings**.

---

## 📁 Project structure

```
smart-document-assistant/
├── backend/            FastAPI app (see backend/README.md)
│   ├── app/
│   │   ├── core/       PDF parsing, chunking, embeddings, vector store, RAG, etc.
│   │   ├── api/        REST routes: documents, chat, search, settings
│   │   ├── models/     Pydantic schemas
│   │   └── storage/    Uploaded PDFs, FAISS index, JSON metadata (gitignored)
│   ├── requirements.txt
│   └── .env.example
└── frontend/           Next.js app
    ├── app/            Pages: dashboard, documents, chat, search, settings
    ├── components/      ui/, layout/, documents/, chat/, charts/, search/
    ├── lib/             api client, types, utils
    └── package.json
```

## ⚙️ Configuration reference

| Setting | Where | Default |
|---|---|---|
| Google Gemini API key | `backend/.env` → `GOOGLE_API_KEY` | — (required) |
| Chat/generation model | Settings page or `.env` → `DEFAULT_LLM_MODEL` | `gemini-2.5-flash` |
| Embedding model | Settings page or `.env` → `EMBEDDING_MODEL` | `all-MiniLM-L6-v2` |
| Chunk size / overlap | Settings page | 1000 / 200 chars |
| Top-K retrieved chunks | Settings page | 5 |
| Temperature | Settings page | 0.3 |
| Backend URL (frontend) | `frontend/.env.local` → `NEXT_PUBLIC_API_URL` | `http://localhost:8000` |

## 🤖 LLM provider: Google Gemini

All text generation (chat answers, summaries, key points, FAQs) is powered by
**Google Gemini** via `langchain-google-genai` (`ChatGoogleGenerativeAI`),
default model `gemini-2.5-flash`. There is no OpenAI dependency anywhere in
this project. Get a free API key at https://aistudio.google.com/apikey and
set it as `GOOGLE_API_KEY` in `backend/.env`.

If the key is missing or Google rejects it, the backend returns a clear error
message via the API instead of crashing — no key needed to browse the app,
only to actually chat/summarize/generate FAQs.

Embeddings (used for chunk similarity/retrieval) are unaffected by this and
continue to run **locally** via `sentence-transformers` — no embeddings are
ever sent to Google.

## 🪟 Windows notes

- `faiss-cpu` ships prebuilt wheels for Windows — `pip install -r requirements.txt`
  should just work with no C++ build tools required.
- Use `venv\Scripts\activate` (not `source venv/bin/activate`) to activate the
  virtual environment, as shown below.

## 🧪 Notes for the demo

- Both the backend (`python3 -m py_compile`) and frontend (`tsc --noEmit`,
  `next build`) have been verified to compile/build cleanly.
- Try uploading a PDF with at least one data table to showcase the automatic
  chart generation feature.
- Ask a question that spans two uploaded documents (leave the doc-scope picker
  on "All documents" in Chat) to demonstrate cross-document retrieval.
