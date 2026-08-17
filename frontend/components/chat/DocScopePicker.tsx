"use client";

import { Check, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocumentMeta } from "@/lib/types";

interface DocScopePickerProps {
  documents: DocumentMeta[];
  selected: string[];
  onChange: (docIds: string[]) => void;
}

export function DocScopePicker({ documents, selected, onChange }: DocScopePickerProps) {
  const allSelected = selected.length === 0;

  function toggle(docId: string) {
    if (selected.includes(docId)) {
      onChange(selected.filter((id) => id !== docId));
    } else {
      onChange([...selected, docId]);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-4 py-2.5">
      <span className="text-xs text-muted-foreground mr-1">Chatting with:</span>
      <button
        onClick={() => onChange([])}
        className={cn(
          "flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors",
          allSelected ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:bg-accent"
        )}
      >
        {allSelected && <Check className="h-3 w-3" />}
        All documents
      </button>
      {documents.map((doc) => {
        const active = selected.includes(doc.doc_id);
        return (
          <button
            key={doc.doc_id}
            onClick={() => toggle(doc.doc_id)}
            className={cn(
              "flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors max-w-[180px]",
              active ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:bg-accent"
            )}
            title={doc.filename}
          >
            {active && <Check className="h-3 w-3 flex-shrink-0" />}
            <FileText className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{doc.filename}</span>
          </button>
        );
      })}
    </div>
  );
}
