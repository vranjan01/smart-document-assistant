"use client";

import { useEffect, useState } from "react";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { api } from "@/lib/api";
import type { ChatMessage, ChatSessionSummary, DocumentMeta } from "@/lib/types";

export default function ChatPage() {
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  async function loadSessions() {
    try {
      setSessions(await api.chat.sessions());
    } catch {
      /* backend not reachable yet; ignore */
    }
  }

  useEffect(() => {
    api.documents.list().then(setDocuments).catch(() => {});
    loadSessions();
  }, []);

  async function selectSession(sessionId: string) {
    setActiveSessionId(sessionId);
    try {
      const res = await api.chat.history(sessionId);
      setMessages(res.messages);
    } catch {
      setMessages([]);
    }
  }

  function startNewChat() {
    setActiveSessionId(null);
    setMessages([]);
  }

  async function deleteSession(sessionId: string) {
    setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
    if (activeSessionId === sessionId) startNewChat();
    try {
      await api.chat.deleteSession(sessionId);
    } catch {
      loadSessions();
    }
  }

  function handleSessionCreated(sessionId: string) {
    setActiveSessionId(sessionId);
    loadSessions();
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <ChatSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelect={selectSession}
        onNew={startNewChat}
        onDelete={deleteSession}
      />
      <ChatWindow
        documents={documents}
        sessionId={activeSessionId}
        initialMessages={messages}
        onSessionCreated={handleSessionCreated}
      />
    </div>
  );
}
