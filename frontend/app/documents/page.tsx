"use client";

import { useEffect, useState } from "react";
import { FileText, Sparkles } from "lucide-react";
import { UploadZone } from "@/components/documents/UploadZone";
import { DocumentCard } from "@/components/documents/DocumentCard";
import { DocumentInsightsDialog } from "@/components/documents/DocumentInsightsDialog";
import { DocumentSynthesisDialog } from "@/components/documents/DocumentSynthesisDialog";
import { api } from "@/lib/api";
import type { DocumentMeta } from "@/lib/types";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inspectDoc, setInspectDoc] = useState<DocumentMeta | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [synthesisOpen, setSynthesisOpen] = useState(false);

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

    setSelectedDocs((prev) =>
      prev.filter((id) => id !== docId)
    );

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

  function toggleDocument(docId: string) {
    setSelectedDocs((prev) =>
      prev.includes(docId)
        ? prev.filter((id) => id !== docId)
        : [...prev, docId]
    );
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
        <p className="text-sm text-muted-foreground">
          Loading documents…
        </p>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
          <FileText className="h-8 w-8" />
          <p className="text-sm">
            No documents uploaded yet. Drag a PDF above to get started.
          </p>
        </div>
      ) : (
        <>
          {/* Multi-document synthesis controls */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
            <div>
              <p className="text-sm font-medium">
                Multi-Document Synthesis
              </p>

              <p className="text-xs text-muted-foreground">
                Select at least 2 documents to compare and synthesize their
                content.
              </p>

              {selectedDocs.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedDocs.length} document
                  {selectedDocs.length !== 1 ? "s" : ""} selected
                </p>
              )}
            </div>

            <button
              type="button"
              disabled={selectedDocs.length < 2}
              onClick={() => setSynthesisOpen(true)}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              Synthesize
            </button>
          </div>

          {/* Document cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {documents.map((doc) => {
    const isSelected = selectedDocs.includes(doc.doc_id);

    return (
      <div key={doc.doc_id} className="relative">
        <DocumentCard
          doc={doc}
          onDelete={handleDelete}
          onInspect={handleInspect}
        />

        <label
          className={`absolute right-3 top-3 z-10 flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-medium shadow-sm transition-colors ${
            isSelected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background/95 text-muted-foreground hover:bg-muted"
          }`}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleDocument(doc.doc_id)}
            className="h-3.5 w-3.5 accent-primary"
          />
          {isSelected ? "Selected" : "Select"}
        </label>
      </div>
    );
  })}
</div>
        </>
      )}

      <DocumentInsightsDialog
        doc={inspectDoc}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      <DocumentSynthesisDialog
        documents={documents}
        selectedDocIds={selectedDocs}
        open={synthesisOpen}
        onOpenChange={setSynthesisOpen}
      />
    </div>
  );
}