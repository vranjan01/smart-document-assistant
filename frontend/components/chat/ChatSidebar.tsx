"use client";

import { MessageSquarePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, truncate, formatDate } from "@/lib/utils";
import type { ChatSessionSummary } from "@/lib/types";

interface ChatSidebarProps {
  sessions: ChatSessionSummary[];
  activeSessionId: string | null;
  onSelect: (sessionId: string) => void;
  onNew: () => void;
  onDelete: (sessionId: string) => void;
}

export function ChatSidebar({ sessions, activeSessionId, onSelect, onNew, onDelete }: ChatSidebarProps) {
  return (
    <div className="flex h-full w-64 flex-shrink-0 flex-col border-r border-border">
      <div className="p-3">
        <Button onClick={onNew} className="w-full" size="sm">
          <MessageSquarePlus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-2">
        {sessions.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">
            No previous chats yet.
          </p>
        ) : (
          <div className="space-y-1">
            {sessions.map((s) => (
              <div
                key={s.session_id}
                onClick={() => onSelect(s.session_id)}
                className={cn(
                  "group flex cursor-pointer items-center justify-between rounded-md px-2.5 py-2 text-sm transition-colors",
                  activeSessionId === s.session_id
                    ? "bg-primary/15 text-primary"
                    : "hover:bg-accent text-foreground/90"
                )}
              >
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-xs font-medium">{truncate(s.title, 30)}</p>
                  <p className="text-[10px] text-muted-foreground">{formatDate(s.updated_at)}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(s.session_id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
