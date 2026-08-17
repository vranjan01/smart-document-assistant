"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Loader2, Bot } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { DocScopePicker } from "@/components/chat/DocScopePicker";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { api } from "@/lib/api";
import type { ChatMessage, DocumentMeta } from "@/lib/types";

interface ChatWindowProps {
  documents: DocumentMeta[];
  sessionId: string | null;
  initialMessages: ChatMessage[];
  onSessionCreated: (sessionId: string) => void;
}

export function ChatWindow({ documents, sessionId, initialMessages, onSessionCreated }: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function handleSend() {
    const query = input.trim();
    if (!query || sending) return;

    const userMsg: ChatMessage = { role: "user", content: query, citations: [] };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const res = await api.chat.send({
        query,
        doc_ids: selectedDocs.length > 0 ? selectedDocs : undefined,
        session_id: sessionId || undefined,
      });
      setMessages((prev) => [...prev, res.message]);
      if (!sessionId) onSessionCreated(res.session_id);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ ${e instanceof Error ? e.message : "Something went wrong."}`,
          citations: [],
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex h-full flex-1 flex-col">
      <DocScopePicker documents={documents} selected={selectedDocs} onChange={setSelectedDocs} />

      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-6">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bot className="h-6 w-6" />
            </div>
            <p className="text-sm">Ask anything about your uploaded documents.</p>
            <p className="text-xs">Answers are grounded in your PDFs with page-level citations.</p>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-6">
            {messages.map((m, i) => (
              <MessageBubble key={i} message={m} />
            ))}
            {sending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Thinking through your documents…
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="border-t border-border p-4">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your documents… (Enter to send, Shift+Enter for new line)"
            className="max-h-40"
            rows={1}
          />
          <Button onClick={handleSend} disabled={sending || !input.trim()} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
