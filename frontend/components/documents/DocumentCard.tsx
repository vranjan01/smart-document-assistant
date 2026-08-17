"use client";

import { useState } from "react";
import { FileText, Trash2, Sparkles, Table2, MoreVertical } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, truncate } from "@/lib/utils";
import type { DocumentMeta } from "@/lib/types";

interface DocumentCardProps {
  doc: DocumentMeta;
  onDelete: (docId: string) => void;
  onInspect: (doc: DocumentMeta) => void;
}

export function DocumentCard({ doc, onDelete, onInspect }: DocumentCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <Card className="group relative flex flex-col gap-3 p-4 transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FileText className="h-4.5 w-4.5" />
        </div>
        <button
          onClick={() => setConfirmDelete((v) => !v)}
          className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-destructive group-hover:opacity-100"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>

      <div>
        <p className="line-clamp-2 text-sm font-medium" title={doc.filename}>
          {truncate(doc.filename, 48)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {doc.num_pages} pages · {doc.size_kb.toFixed(0)} KB · {formatDate(doc.uploaded_at)}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge variant="secondary">{doc.num_chunks} chunks</Badge>
        {doc.has_tables && (
          <Badge variant="warning" className="gap-1">
            <Table2 className="h-3 w-3" /> Tables
          </Badge>
        )}
        <Badge variant={doc.status === "ready" ? "success" : "outline"}>{doc.status}</Badge>
      </div>

      {confirmDelete ? (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-2 text-xs">
          <span className="flex-1 text-destructive">Delete this document?</span>
          <Button size="sm" variant="destructive" onClick={() => onDelete(doc.doc_id)}>
            Delete
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button size="sm" className="flex-1" onClick={() => onInspect(doc)}>
            <Sparkles className="h-3.5 w-3.5" />
            Insights
          </Button>
          <Button size="sm" variant="outline" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </Card>
  );
}
