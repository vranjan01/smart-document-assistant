"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Bot, User, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/types";

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const [showCitations, setShowCitations] = useState(false);

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-secondary" : "bg-primary/15 text-primary"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div className={cn("flex max-w-[75%] flex-col gap-2", isUser && "items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser ? "bg-primary text-primary-foreground" : "bg-card border border-border"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm prose-invert max-w-none [&_p]:my-1.5 [&_ul]:my-1.5 [&_li]:my-0.5">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {!isUser && message.citations.length > 0 && (
          <div className="w-full">
            <button
              onClick={() => setShowCitations((v) => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <FileText className="h-3 w-3" />
              {message.citations.length} source{message.citations.length > 1 ? "s" : ""}
              {showCitations ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {showCitations && (
              <div className="mt-2 space-y-1.5">
                {message.citations.map((c, i) => (
                  <div key={i} className="rounded-md border border-amber-500/20 bg-amber-500/5 p-2">
                    <div className="mb-1 flex items-center gap-1.5">
                      <span className="citation-chip">Page {c.page}</span>
                      <span className="truncate text-xs font-medium text-foreground/80">{c.filename}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{c.snippet}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
