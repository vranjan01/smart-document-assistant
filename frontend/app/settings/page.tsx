"use client";

import { useEffect, useState } from "react";
import { Save, CheckCircle2, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import type { AppSettings } from "@/lib/types";

const DEFAULTS: AppSettings = {
  chunk_size: 1000,
  chunk_overlap: 200,
  top_k: 5,
  temperature: 0.3,
  model: "gpt-4o-mini",
  embedding_model: "all-MiniLM-L6-v2",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const [models, setModels] = useState<string[]>([]);
  const [embeddingModels, setEmbeddingModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([api.settings.get(), api.settings.options()])
      .then(([s, opts]) => {
        setSettings(s);
        setModels(opts.models);
        setEmbeddingModels(opts.embedding_models);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const updated = await api.settings.update(settings);
      setSettings(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading settings…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h2 className="text-lg font-semibold">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Tune the RAG pipeline. Changes apply to newly uploaded documents (chunking) and all future queries (retrieval/generation).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Chunking</CardTitle>
          <CardDescription>Controls how new documents are split during ingestion.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <SliderField
            label="Chunk size"
            value={settings.chunk_size}
            min={300}
            max={2000}
            step={50}
            suffix=" chars"
            onChange={(v) => setSettings((s) => ({ ...s, chunk_size: v }))}
          />
          <SliderField
            label="Chunk overlap"
            value={settings.chunk_overlap}
            min={0}
            max={500}
            step={25}
            suffix=" chars"
            onChange={(v) => setSettings((s) => ({ ...s, chunk_overlap: v }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Retrieval & Generation</CardTitle>
          <CardDescription>Controls how answers are retrieved and generated during chat/search.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <SliderField
            label="Top-K retrieved chunks"
            value={settings.top_k}
            min={1}
            max={15}
            step={1}
            onChange={(v) => setSettings((s) => ({ ...s, top_k: v }))}
          />
          <SliderField
            label="Temperature"
            value={settings.temperature}
            min={0}
            max={1}
            step={0.05}
            format={(v) => v.toFixed(2)}
            onChange={(v) => setSettings((s) => ({ ...s, temperature: v }))}
          />

          <div className="space-y-1.5">
            <Label>Chat / generation model</Label>
            <Select value={settings.model} onValueChange={(v) => setSettings((s) => ({ ...s, model: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Embedding model</Label>
            <Select
              value={settings.embedding_model}
              onValueChange={(v) => setSettings((s) => ({ ...s, embedding_model: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {embeddingModels.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Changing this only affects documents uploaded after the change.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Settings
        </Button>
        {saved && (
          <span className="flex items-center gap-1 text-sm text-emerald-400">
            <CheckCircle2 className="h-4 w-4" /> Saved
          </span>
        )}
      </div>
    </div>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  suffix = "",
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="text-xs font-medium text-primary">
          {format ? format(value) : value}
          {suffix}
        </span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}
