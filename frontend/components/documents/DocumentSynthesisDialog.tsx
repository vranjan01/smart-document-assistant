"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import type { DocumentMeta, Citation } from "@/lib/types";

interface DocumentSynthesisDialogProps {
  documents: DocumentMeta[];
  selectedDocIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentSynthesisDialog({
  documents,
  selectedDocIds,
  open,
  onOpenChange,
}: DocumentSynthesisDialogProps) {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [citations, setCitations] = useState<Citation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedDocuments = documents.filter((doc) =>
    selectedDocIds.includes(doc.doc_id)
  );

  async function handleSynthesize() {
    if (!query.trim() || selectedDocIds.length < 2) return;

    setLoading(true);
    setError("");
    setAnswer("");
    setCitations([]);

    try {
      const result = await api.chat.synthesize({
        query: query.trim(),
        doc_ids: selectedDocIds,
      });

      setAnswer(result.message.content);
      setCitations(result.message.citations || []);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Failed to synthesize the selected documents."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleClose(open: boolean) {
    if (!open) {
      setQuery("");
      setAnswer("");
      setCitations([]);
      setError("");
    }

    onOpenChange(open);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[80vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Multi-Document Synthesis
          </DialogTitle>

          <DialogDescription>
            Combine information from your selected documents into one
            grounded answer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
              Selected Documents
            </h4>

            <div className="space-y-1">
              {selectedDocuments.map((doc) => (
                <div
                  key={doc.doc_id}
                  className="rounded-md border border-border px-3 py-2 text-sm"
                >
                  {doc.filename}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="synthesis-query"
              className="mb-2 block text-sm font-medium"
            >
              What would you like to know?
            </label>

            <textarea
              id="synthesis-query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Example: Compare the key findings across these documents."
              className="min-h-24 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              disabled={loading}
            />
          </div>

          <button
            type="button"
            onClick={handleSynthesize}
            disabled={loading || !query.trim() || selectedDocIds.length < 2}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Synthesizing…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Synthesis
              </>
            )}
          </button>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {answer && (
            <div className="space-y-4">
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                  Synthesis
                </h4>

                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {answer}
                  </p>
                </div>
              </div>

              {citations.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                    Sources
                  </h4>

                  <div className="space-y-2">
                    {citations.map((citation, index) => (
                      <div
                        key={`${citation.doc_id}-${citation.page}-${index}`}
                        className="rounded-md border border-border p-3"
                      >
                        <p className="text-sm font-medium">
                          {citation.filename}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          Page {citation.page}
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          {citation.snippet}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}