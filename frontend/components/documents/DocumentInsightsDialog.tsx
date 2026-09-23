"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChartRenderer } from "@/components/charts/ChartRenderer";
import { api } from "@/lib/api";
import type { DocumentMeta, FAQItem, ExtractedChart, ExtractedTable } from "@/lib/types";
import { TableRenderer } from "@/components/tables/TableRenderer";

interface DocumentInsightsDialogProps {
  doc: DocumentMeta | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentInsightsDialog({ doc, open, onOpenChange }: DocumentInsightsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string>("");
  const [keyPoints, setKeyPoints] = useState<string[]>([]);
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [charts, setCharts] = useState<ExtractedChart[]>([]);
  const [tables, setTables] = useState<ExtractedTable[]>([]);
  const [loaded, setLoaded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!doc || !open) return;
    setSummary("");
    setKeyPoints([]);
    setFaqs([]);
    setCharts([]);
    setTables([]);
    setLoaded(new Set());
    loadTab("summary", doc.doc_id);
  }, [doc, open]);

  async function loadTab(tab: string, docId: string) {
    if (loaded.has(tab)) return;
    setLoading(true);
    try {
      if (tab === "summary") {
        const res = await api.documents.summary(docId);
        setSummary(res.summary);
        setKeyPoints(res.key_points);
      } else if (tab === "faqs") {
        const res = await api.documents.faqs(docId);
        setFaqs(res.faqs);
      } else if (tab === "charts") {
        const res = await api.documents.charts(docId);
        setCharts(res.charts);
      } else if (tab === "tables") {
        const res = await api.documents.tables(docId);
        setTables(res.tables);
      }
      setLoaded((prev) => new Set(prev).add(tab));
    } catch {
      // surfaced implicitly via empty state below
    } finally {
      setLoading(false);
    }
  }

  if (!doc) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {doc.filename}
          </DialogTitle>
          <DialogDescription>
            {doc.num_pages} pages · {doc.num_chunks} chunks{doc.has_tables ? " · contains tables" : ""}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="summary" onValueChange={(v) => loadTab(v, doc.doc_id)}>
          <TabsList>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="faqs">FAQs</TabsTrigger>
            <TabsTrigger value="charts">Charts</TabsTrigger>
            <TabsTrigger value="tables">Tables</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4">
            {loading && !loaded.has("summary") ? (
              <LoadingState label="Summarizing document…" />
            ) : (
              <>
                <p className="text-sm leading-relaxed text-foreground/90">{summary}</p>
                {keyPoints.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Key Points</h4>
                    <ul className="space-y-1.5">
                      {keyPoints.map((point, i) => (
                        <li key={i} className="flex gap-2 text-sm">
                          <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="faqs" className="space-y-3">
            {loading && !loaded.has("faqs") ? (
              <LoadingState label="Generating FAQs…" />
            ) : faqs.length === 0 ? (
              <EmptyState text="No FAQs generated yet." />
            ) : (
              faqs.map((faq, i) => (
                <div key={i} className="rounded-md border border-border p-3">
                  <p className="text-sm font-medium">{faq.question}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{faq.answer}</p>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="charts" className="space-y-4">
            {loading && !loaded.has("charts") ? (
              <LoadingState label="Extracting charts from tables…" />
            ) : charts.length === 0 ? (
              <EmptyState text="No chartable numeric tables were found in this document." />
            ) : (
              charts.map((chart) => <ChartRenderer key={chart.chart_id} chart={chart} />)
            )}
          </TabsContent>
          <TabsContent value="tables" className="space-y-4">
            {loading && !loaded.has("tables") ? (
              <LoadingState label="Extracting tables…" />
            ) : tables.length === 0 ? (
              <EmptyState text="No tables found in this document." />
            ) : (
              tables.map((table, index) => (
                <TableRenderer key={index} table={table} index={index} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{text}</p>;
}
