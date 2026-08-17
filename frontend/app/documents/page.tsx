"use client";

import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { UploadZone } from "@/components/documents/UploadZone";
import { DocumentCard } from "@/components/documents/DocumentCard";
import { DocumentInsightsDialog } from "@/components/documents/DocumentInsightsDialog";
import { api } from "@/lib/api";
import type { DocumentMeta } from "@/lib/types";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inspectDoc, setInspectDoc] = useState<DocumentMeta | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function refresh() {
    try {
      const docs = await api.documents.list();
      setDocuments(docs);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load documents.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function handleUploaded(newDocs: DocumentMeta[]) {
    setDocuments((prev) => [...newDocs, ...prev]);
  }

  async function handleDelete(docId: string) {
    setDocuments((prev) => prev.filter((d) => d.doc_id !== docId));
    try {
      await api.documents.delete(docId);
    } catch {
      refresh();
    }
  }

  function handleInspect(doc: DocumentMeta) {
    setInspectDoc(doc);
    setDialogOpen(true);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <UploadZone onUploaded={handleUploaded} />

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error} — is the backend running at the configured NEXT_PUBLIC_API_URL?
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading documents…</p>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
          <FileText className="h-8 w-8" />
          <p className="text-sm">No documents uploaded yet. Drag a PDF above to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <DocumentCard key={doc.doc_id} doc={doc} onDelete={handleDelete} onInspect={handleInspect} />
          ))}
        </div>
      )}

      <DocumentInsightsDialog doc={inspectDoc} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
