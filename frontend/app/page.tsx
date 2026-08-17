"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, MessagesSquare, Search, Table2, ArrowRight, UploadCloud } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { api } from "@/lib/api";
import type { DocumentMeta, ChatSessionSummary } from "@/lib/types";

export default function DashboardPage() {
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);

  useEffect(() => {
    api.documents.list().then(setDocuments).catch(() => {});
    api.chat.sessions().then(setSessions).catch(() => {});
  }, []);

  const totalChunks = documents.reduce((sum, d) => sum + d.num_chunks, 0);
  const totalWithTables = documents.filter((d) => d.has_tables).length;

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <div>
        <h2 className="text-xl font-semibold">Welcome back 👋</h2>
        <p className="text-sm text-muted-foreground">
          Here's an overview of your document library and assistant activity.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon={FileText} label="Documents" value={documents.length} />
        <StatCard icon={Table2} label="Chunks indexed" value={totalChunks} />
        <StatCard icon={Table2} label="With tables" value={totalWithTables} />
        <StatCard icon={MessagesSquare} label="Chat sessions" value={sessions.length} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <QuickAction
          href="/documents"
          icon={UploadCloud}
          title="Upload documents"
          description="Add single or multiple PDFs and let the pipeline parse, chunk, and index them."
        />
        <QuickAction
          href="/chat"
          icon={MessagesSquare}
          title="Chat with your PDFs"
          description="Ask questions and get grounded answers with page-level citations."
        />
        <QuickAction
          href="/search"
          icon={Search}
          title="Semantic search"
          description="Find relevant passages across your library by meaning, not keywords."
        />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Recent documents</h3>
          <Link href="/documents" className="text-xs text-primary hover:underline flex items-center gap-1">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {documents.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No documents yet.{" "}
              <Link href="/documents" className="text-primary hover:underline">
                Upload your first PDF
              </Link>
              .
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {documents.slice(0, 5).map((doc) => (
              <div
                key={doc.doc_id}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{doc.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.num_pages} pages · uploaded {formatDate(doc.uploaded_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-lg font-semibold leading-none">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: any;
  title: string;
  description: string;
}) {
  return (
    <Link href={href}>
      <Card className="h-full transition-colors hover:border-primary/40">
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium">{title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          </div>
          <Button variant="ghost" size="sm" className="w-fit p-0 text-primary hover:bg-transparent">
            Go <ArrowRight className="h-3 w-3" />
          </Button>
        </CardContent>
      </Card>
    </Link>
  );
}
