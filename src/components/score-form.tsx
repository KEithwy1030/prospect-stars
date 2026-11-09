"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScoreResult } from "@/components/score-result";
import type { PublicScoreResponse } from "@/lib/scoring";

type FormState = {
  name: string;
  description: string;
  site_url: string;
  price_usd: string;
  keywords: string;
  has_audience: boolean;
  audience_size: string;
  audience_type: string;
  competitors: string;
  build_note: string;
  tech_parts: string;
  free_or_ai_substitute: "" | "yes" | "partial" | "no";
  free_or_ai_why: string;
};

const initial: FormState = {
  name: "",
  description: "",
  site_url: "",
  price_usd: "",
  keywords: "",
  has_audience: false,
  audience_size: "",
  audience_type: "",
  competitors: "",
  build_note: "",
  tech_parts: "",
  free_or_ai_substitute: "",
  free_or_ai_why: "",
};

function parseCompetitors(raw: string) {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      // "Name | 29 | 12000" → name, price, optional verified annual
      const parts = line.split("|").map((p) => p.trim());
      const name = parts[0] || "";
      const price = parts[1] ? Number(parts[1]) : undefined;
      const verified = parts[2] ? Number(parts[2]) : undefined;
      return {
        name,
        price_usd: Number.isFinite(price) ? price : undefined,
        verified_annual_usd: Number.isFinite(verified) ? verified : undefined,
        tier: verified != null && Number.isFinite(verified) ? ("peer" as const) : undefined,
      };
    })
    .filter((c) => c.name);
}

export function ScoreForm() {
  const [form, setForm] = useState<FormState>(initial);
  const [result, setResult] = useState<PublicScoreResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const keywords = form.keywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean);
        const tech_parts = form.tech_parts
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean);
        const body: Record<string, unknown> = {
          name: form.name.trim(),
          description: form.description.trim(),
        };
        if (form.site_url.trim()) body.site_url = form.site_url.trim();
        if (form.price_usd.trim()) body.price_usd = Number(form.price_usd);
        if (keywords.length) body.keywords = keywords;
        if (form.has_audience) {
          body.has_audience = true;
          if (form.audience_size.trim())
            body.audience_size = Number(form.audience_size);
          if (form.audience_type.trim()) body.audience_type = form.audience_type.trim();
        }
        const comps = parseCompetitors(form.competitors);
        if (comps.length) body.competitors = comps;
        if (form.build_note.trim()) body.build_note = form.build_note.trim();
        if (tech_parts.length) body.tech_parts = tech_parts;
        if (form.free_or_ai_substitute) {
          body.free_or_ai_substitute = form.free_or_ai_substitute;
          if (form.free_or_ai_why.trim())
            body.free_or_ai_why = form.free_or_ai_why.trim();
        }

        const res = await fetch("/api/v1/score", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          setResult(null);
          setError(data.message || "Scoring failed.");
          return;
        }
        setResult(data as PublicScoreResponse);
        requestAnimationFrame(() => {
          document.getElementById("result")?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      } catch {
        setError("Network error — try again in a moment.");
        setResult(null);
      }
    });
  }

  return (
    <div className="space-y-12">
      <form onSubmit={onSubmit} className="space-y-6" noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Idea name *</Label>
            <Input
              id="name"
              required
              maxLength={120}
              placeholder="e.g. PriceLens"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">One-line description *</Label>
            <Input
              id="description"
              required
              maxLength={500}
              placeholder="What does it do for whom?"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="site_url">Site URL (optional)</Label>
            <Input
              id="site_url"
              type="url"
              placeholder="https://"
              value={form.site_url}
              onChange={(e) => set("site_url", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price_usd">Listed price USD (optional)</Label>
            <Input
              id="price_usd"
              type="number"
              min={0}
              step="0.01"
              placeholder="29"
              value={form.price_usd}
              onChange={(e) => set("price_usd", e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="keywords">Keywords (optional, comma-separated)</Label>
            <Input
              id="keywords"
              placeholder="saas pricing page, pricing analyzer"
              value={form.keywords}
              onChange={(e) => set("keywords", e.target.value)}
            />
          </div>
          <div className="space-y-3 sm:col-span-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="has_audience"
                checked={form.has_audience}
                onCheckedChange={(v) => set("has_audience", v === true)}
              />
              <Label htmlFor="has_audience" className="font-normal">
                I already have a built-in audience (followers, email list, or a working channel)
              </Label>
            </div>
            {form.has_audience ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="audience_size">Audience size (countable)</Label>
                  <Input
                    id="audience_size"
                    type="number"
                    min={0}
                    placeholder="12000"
                    value={form.audience_size}
                    onChange={(e) => set("audience_size", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="audience_type">Audience type</Label>
                  <Input
                    id="audience_type"
                    placeholder="email list / X followers / Discord"
                    value={form.audience_type}
                    onChange={(e) => set("audience_type", e.target.value)}
                  />
                </div>
              </div>
            ) : null}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="competitors">
              Competitors (optional — one per line: Name | price | verified annual USD)
            </Label>
            <Textarea
              id="competitors"
              rows={3}
              placeholder={"PriceIntello | 79 | 48000\nCompWatch | 39"}
              value={form.competitors}
              onChange={(e) => set("competitors", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="free_or_ai_substitute">Can free tools or AI replace this?</Label>
            <select
              id="free_or_ai_substitute"
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
              value={form.free_or_ai_substitute}
              onChange={(e) =>
                set(
                  "free_or_ai_substitute",
                  e.target.value as FormState["free_or_ai_substitute"],
                )
              }
            >
              <option value="">Not sure / skip</option>
              <option value="no">No</option>
              <option value="partial">Partly</option>
              <option value="yes">Yes</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="free_or_ai_why">Why (optional)</Label>
            <Input
              id="free_or_ai_why"
              placeholder="What free/AI still cannot do"
              value={form.free_or_ai_why}
              onChange={(e) => set("free_or_ai_why", e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="tech_parts">
              Build parts (optional — e.g. landing_page, payments, llm, scraping, accounts)
            </Label>
            <Input
              id="tech_parts"
              placeholder="landing_page, payments, scraping"
              value={form.tech_parts}
              onChange={(e) => set("tech_parts", e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="build_note">How hard is it to build? (optional note)</Label>
            <Textarea
              id="build_note"
              rows={2}
              placeholder="Short note on the build — parts + rationale scores technical difficulty."
              value={form.build_note}
              onChange={(e) => set("build_note", e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button type="submit" size="lg" disabled={pending} className="min-w-44">
            {pending ? "Scoring…" : "Score this idea"}
          </Button>
          <p className="text-xs text-muted-foreground">
            No account. Thin evidence lowers the score on purpose — we say when we cannot tell.
          </p>
        </div>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {pending && !result ? (
          <p className="animate-rise text-sm text-muted-foreground">Running the rule-based scorer…</p>
        ) : null}
      </form>

      {result ? <ScoreResult result={result} /> : null}
    </div>
  );
}
