export interface DocumentMeta {
  doc_id: string;
  filename: string;
  num_pages: number;
  num_chunks: number;
  has_tables: boolean;
  uploaded_at: string;
  status: "processing" | "ready" | "failed";
  size_kb: number;
}

export interface Citation {
  doc_id: string;
  filename: string;
  page: number;
  snippet: string;
  chunk_id: string;
  score?: number | null;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
  timestamp?: string;
}

export interface ChatSessionSummary {
  session_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface SearchResult {
  doc_id: string;
  filename: string;
  page: number;
  chunk_id: string;
  text: string;
  score: number;
}

export interface FAQItem {
  question: string;
  answer: string;
  page?: number | null;
}

export interface ExtractedChart {
  chart_id: string;
  title: string;
  chart_type: "bar" | "line" | "pie";
  page: number;
  x_key: string;
  y_keys: string[];
  data: Record<string, string | number>[];
}

export interface ExtractedTable {
  page: number;
  rows: (string | number | null)[][];
}

export interface AppSettings {
  chunk_size: number;
  chunk_overlap: number;
  top_k: number;
  temperature: number;
  model: string;
  embedding_model: string;
}
