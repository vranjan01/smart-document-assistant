import type {
  DocumentMeta,
  ChatMessage,
  ChatSessionSummary,
  SearchResult,
  FAQItem,
  ExtractedChart,
  AppSettings,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options?.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export const api = {
  documents: {
    list: () => request<DocumentMeta[]>("/api/documents"),
    upload: (files: File[]) => {
      const form = new FormData();
      files.forEach((f) => form.append("files", f));
      return request<{ documents: DocumentMeta[] }>("/api/documents/upload", {
        method: "POST",
        body: form,
      });
    },
    delete: (docId: string) =>
      request<{ doc_id: string; deleted: boolean }>(`/api/documents/${docId}`, {
        method: "DELETE",
      }),
    summary: (docId: string) =>
      request<{ doc_id: string; summary: string; key_points: string[] }>(
        `/api/documents/${docId}/summary`
      ),
    faqs: (docId: string) =>
      request<{ doc_id: string; faqs: FAQItem[] }>(`/api/documents/${docId}/faqs`),
    charts: (docId: string) =>
      request<{ doc_id: string; charts: ExtractedChart[] }>(
        `/api/documents/${docId}/charts`
      ),
  },

  chat: {
    send: (payload: {
      query: string;
      doc_ids?: string[];
      session_id?: string;
      top_k?: number;
      temperature?: number;
      model?: string;
    }) =>
      request<{ session_id: string; message: ChatMessage }>("/api/chat", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    sessions: () => request<ChatSessionSummary[]>("/api/chat/sessions"),
    history: (sessionId: string) =>
      request<{ session_id: string; messages: ChatMessage[] }>(
        `/api/chat/sessions/${sessionId}`
      ),
    deleteSession: (sessionId: string) =>
      request<{ session_id: string; deleted: boolean }>(
        `/api/chat/sessions/${sessionId}`,
        { method: "DELETE" }
      ),
  },

  search: {
    query: (payload: { query: string; doc_ids?: string[]; top_k?: number }) =>
      request<{ results: SearchResult[] }>("/api/search", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },

  settings: {
    get: () => request<AppSettings>("/api/settings"),
    update: (settings: AppSettings) =>
      request<AppSettings>("/api/settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      }),
    options: () =>
      request<{ models: string[]; embedding_models: string[] }>(
        "/api/settings/options"
      ),
  },
};
