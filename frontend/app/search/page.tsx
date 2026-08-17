"use client";

import { useState } from "react";
import { Search as SearchIcon, Loader2, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import type { SearchResult } from "@/lib/types";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await api.search.query({ query });
      setResults(res.results);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h2 className="text-lg font-semibold">Semantic Search</h2>
        <p className="text-sm text-muted-foreground">
          Search across your document library by meaning, not just keywords — no chat generation involved.
        </p>
      </div>

      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="e.g. quarterly revenue trends, methodology, conclusion…"
        />
        <Button onClick={handleSearch} disabled={loading || !query.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SearchIcon className="h-4 w-4" />}
          Search
        </Button>
      </div>

      <div className="space-y-3">
        {searched && !loading && results.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-10">No matching passages found.</p>
        )}
        {results.map((r) => (
          <div key={r.chunk_id} className="rounded-lg border border-border p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                <span className="font-medium text-foreground">{r.filename}</span>
                <span>·</span>
                <span>Page {r.page}</span>
              </div>
              <Badge variant="outline">{(r.score * 100).toFixed(0)}% match</Badge>
            </div>
            <p className="text-sm text-foreground/90 whitespace-pre-wrap line-clamp-4">{r.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
