"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScoreResult } from "@/components/score-result";
import { RealityAnchor } from "@/components/reality-anchor";
import type { PublicScoreResponse } from "@/lib/scoring";

export type PainEvidenceItem = {
  id: string;
  fact: string;
  src: string;
};

export type FormState = {
  idea_source: "" | "已有付费竞品的市场" | "自己痛点出发" | "两者都有";
  name: string;
  description: string;
  site_url: string;
  price_usd: string;
  expected_revenue_tier: "under_1k" | "around_1k" | "around_10k" | "around_100k";
  stranger_count: "" | "0" | "1-2" | "3+";
  payment_amount_range: string;
  keywords: string;
  trend: "" | "涨" | "平" | "跌";
  trend_src: string;
  pain_evidence: PainEvidenceItem[];
  has_audience: boolean;
  audience_size: string;
  audience_type: string;
  competitors: string;
  build_note: string;
  tech_parts: string;
  free_or_ai_substitute: "" | "yes" | "partial" | "no";
  free_or_ai_why: string;
  consent_calibration: boolean;
  consent_followup: boolean;
  consent_followup_6m: boolean;
  consent_followup_12m: boolean;
  followup_contact: string;
};

const initial: FormState = {
  idea_source: "",
  name: "",
  description: "",
  site_url: "",
  price_usd: "",
  expected_revenue_tier: "around_10k",
  stranger_count: "",
  payment_amount_range: "",
  keywords: "",
  trend: "",
  trend_src: "",
  pain_evidence: [{ id: "p-1", fact: "", src: "" }],
  has_audience: false,
  audience_size: "",
  audience_type: "",
  competitors: "",
  build_note: "",
  tech_parts: "",
  free_or_ai_substitute: "",
  free_or_ai_why: "",
  consent_calibration: false,
  consent_followup: false,
  consent_followup_6m: false,
  consent_followup_12m: false,
  followup_contact: "",
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
          expected_revenue_tier: form.expected_revenue_tier,
          consent_calibration: form.consent_calibration,
          consent_followup: form.consent_followup,
        };
        if (form.consent_followup) {
          body.consent_followup_6m = form.consent_followup_6m;
          body.consent_followup_12m = form.consent_followup_12m;
          const intervals: string[] = [];
          if (form.consent_followup_6m) intervals.push("6m");
          if (form.consent_followup_12m) intervals.push("12m");
          if (intervals.length) body.followup_intervals = intervals;
          if (form.followup_contact.trim()) {
            body.followup_contact = form.followup_contact.trim();
          }
        }
        if (form.idea_source) body.idea_source = form.idea_source;
        if (form.site_url.trim()) body.site_url = form.site_url.trim();
        if (form.price_usd.trim()) body.price_usd = Number(form.price_usd);

        if (form.stranger_count || form.payment_amount_range.trim()) {
          const stranger_count =
            form.stranger_count === "3+"
              ? 3
              : form.stranger_count === "1-2"
                ? 1
                : form.stranger_count === "0"
                  ? 0
                  : undefined;
          body.payments = {
            stranger_count,
            amount_range: form.payment_amount_range.trim() || undefined,
          };
        }

        if (keywords.length) body.keywords = keywords;
        if (form.trend) {
          body.trend = form.trend;
          if (form.trend_src.trim()) {
            body.trend_src = form.trend_src.trim();
          }
        }

        const validPain = form.pain_evidence
          .filter((p) => p.fact.trim() || p.src.trim())
          .map((p) => ({
            kind: "抱怨" as const,
            fact: p.fact.trim() || undefined,
            src: p.src.trim() || undefined,
          }));
        if (validPain.length) {
          body.pain_evidence = validPain;
        }

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

  function fillExample() {
    setForm({
      idea_source: "两者都有",
      name: "NoteClip",
      description: "Clipboard snippet manager for freelance developers and creators.",
      site_url: "https://noteclip.example.com",
      price_usd: "19",
      expected_revenue_tier: "around_10k",
      stranger_count: "3+",
      payment_amount_range: "$19 - $29",
      keywords: "clipboard manager, code snippets, notes sync",
      trend: "涨",
      trend_src: "Google Trends: clipboard manager",
      pain_evidence: [
        {
          id: "p-example",
          fact: "Developers complain about lost clipboard history and lack of sync across machines",
          src: "https://news.ycombinator.com/item?id=example",
        },
      ],
      has_audience: true,
      audience_size: "1500",
      audience_type: "newsletter subscribers",
      competitors: "SnipEase | 29 | 12000\nClipFlow | 19",
      build_note: "Next.js web app + Stripe checkout + SQLite sync.",
      tech_parts: "landing_page, payments, accounts",
      free_or_ai_substitute: "partial",
      free_or_ai_why: "Basic clipboard is free in OS, but structured search & sync are paid.",
      consent_calibration: false,
      consent_followup: false,
      consent_followup_6m: false,
      consent_followup_12m: false,
      followup_contact: "",
    });
  }

  return (
    <div className="space-y-8">
      <RealityAnchor />

      <form onSubmit={onSubmit} className="space-y-6" noValidate>
        {/* 表单首题：想法来源三选一 */}
        <div className="space-y-3 rounded-xl border border-border/80 bg-background/60 p-4">
          <div className="space-y-1">
            <Label className="text-sm font-medium text-foreground">
              想法来源 (Idea origin) · 选填
            </Label>
            <p className="text-xs text-muted-foreground">
              想法最初从何而来？（全部选填，不填不卡提交）
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {[
              { id: "paid_market", label: "已有付费竞品的市场", desc: "市场上已有被验证的付费标杆" },
              { id: "own_pain", label: "自己痛点出发", desc: "自己工作中切实遇到的强烈痛点" },
              { id: "both", label: "两者都有", desc: "既有自身切肤之痛，也有竞品在收费" },
            ].map((opt) => {
              const selected = form.idea_source === opt.label;
              return (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() =>
                    set("idea_source", selected ? "" : (opt.label as FormState["idea_source"]))
                  }
                  className={`flex flex-col items-start rounded-lg border p-3 text-left transition-all cursor-pointer ${
                    selected
                      ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary/40"
                      : "border-border/70 bg-background hover:bg-muted/40 text-foreground"
                  }`}
                >
                  <span className="text-sm font-medium">{opt.label}</span>
                  <span className="mt-1 text-xs text-muted-foreground">{opt.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

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
          <div className="space-y-2 sm:col-span-2">
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
          <div className="space-y-2">
            <Label htmlFor="expected_revenue_tier">
              预期年收入档位 (Expected annual revenue tier)
            </Label>
            <select
              id="expected_revenue_tier"
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
              value={form.expected_revenue_tier}
              onChange={(e) =>
                set(
                  "expected_revenue_tier",
                  e.target.value as FormState["expected_revenue_tier"],
                )
              }
            >
              <option value="under_1k">不到一千美元 / 年 (&lt; $1k/yr · 历史 67.6%)</option>
              <option value="around_1k">一千档 (~$1k/yr · 历史 17%)</option>
              <option value="around_10k">一万档 (~$10k/yr · 历史 10.3%)</option>
              <option value="around_100k">十万以上 ($100k+/yr · 历史 5%)</option>
            </select>
          </div>

          {/* 陌生人付款栏 */}
          <div className="space-y-3 sm:col-span-2 rounded-xl border border-border/80 bg-background/60 p-4">
            <div>
              <Label className="text-sm font-medium text-foreground">
                陌生人付款栏 (Stranger payments) · 选填
              </Label>
              <p className="text-xs text-muted-foreground">
                已付费陌生人数（0 / 1–2 / 3+ 三档）+ 金额区间。非亲友付费是验证价格成立最关键的真实证据。
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs">已付费陌生人数</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["0", "1-2", "3+"] as const).map((tier) => {
                    const selected = form.stranger_count === tier;
                    const display = tier === "1-2" ? "1–2 人" : tier === "3+" ? "3+ 人" : "0 人";
                    return (
                      <button
                        type="button"
                        key={tier}
                        onClick={() =>
                          set("stranger_count", selected ? "" : tier)
                        }
                        className={`h-8 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                          selected
                            ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary/40 shadow-xs"
                            : "border-border/70 bg-background hover:bg-muted/40 text-foreground"
                        }`}
                      >
                        {display}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_amount_range" className="text-xs">
                  金额区间 (选填)
                </Label>
                <Input
                  id="payment_amount_range"
                  placeholder="如：$19 - $49 或 $29"
                  value={form.payment_amount_range}
                  onChange={(e) => set("payment_amount_range", e.target.value)}
                />
              </div>
            </div>
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

          {/* 趋势方向 */}
          <div className="space-y-3 sm:col-span-2 rounded-xl border border-border/80 bg-background/60 p-4">
            <div>
              <Label className="text-sm font-medium text-foreground">
                趋势方向 (Market trend) · 选填
              </Label>
              <p className="text-xs text-muted-foreground">
                涨 / 平 / 跌三选一 + 来源。涨/跌将对需求市场维度打分微调 ±0.5★。
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs">趋势方向三选一</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "涨", label: "涨 ↗", desc: "+0.5★" },
                    { value: "平", label: "平 →", desc: "基准" },
                    { value: "跌", label: "跌 ↘", desc: "-0.5★" },
                  ].map((item) => {
                    const selected = form.trend === item.value;
                    return (
                      <button
                        type="button"
                        key={item.value}
                        onClick={() =>
                          set("trend", selected ? "" : (item.value as FormState["trend"]))
                        }
                        className={`h-8 flex items-center justify-center gap-1 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                          selected
                            ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary/40 shadow-xs"
                            : "border-border/70 bg-background hover:bg-muted/40 text-foreground"
                        }`}
                      >
                        <span>{item.label}</span>
                        <span className="text-[10px] text-muted-foreground">({item.desc})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="trend_src" className="text-xs">
                  趋势来源 (选填)
                </Label>
                <Input
                  id="trend_src"
                  placeholder="如：Google Trends 过去 12 个月持续上升、行业研报链接等"
                  value={form.trend_src}
                  onChange={(e) => set("trend_src", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 抱怨证据栏 */}
          <div className="space-y-3 sm:col-span-2 rounded-xl border border-border/80 bg-background/60 p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Label className="text-sm font-medium text-foreground">
                  抱怨证据栏 (Pain quotes & evidence) · 选填
                </Label>
                <p className="text-xs text-muted-foreground">
                  可填多条，每条含原话 + 来源链接；只写“我觉得大家很痛”没有链接的，按证据不足处理。
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    pain_evidence: [
                      ...f.pain_evidence,
                      { id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, fact: "", src: "" },
                    ],
                  }))
                }
                className="h-7 text-xs"
              >
                + 添加一条抱怨证据
              </Button>
            </div>

            <div className="space-y-3 pt-1">
              {form.pain_evidence.map((item, index) => {
                const missingLink = Boolean(item.fact.trim() && !item.src.trim());
                return (
                  <div
                    key={item.id}
                    className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        抱怨证据 #{index + 1}
                      </span>
                      {form.pain_evidence.length > 1 ? (
                        <button
                          type="button"
                          onClick={() =>
                            setForm((f) => ({
                              ...f,
                              pain_evidence: f.pain_evidence.filter((p) => p.id !== item.id),
                            }))
                          }
                          className="text-xs text-muted-foreground hover:text-destructive cursor-pointer"
                        >
                          删除
                        </button>
                      ) : null}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor={`pain-fact-${item.id}`} className="text-xs">
                          用户原话 / 抱怨
                        </Label>
                        <Input
                          id={`pain-fact-${item.id}`}
                          placeholder="如：'每次手动对比竞品价格都要耗上两小时'"
                          value={item.fact}
                          onChange={(e) => {
                            const val = e.target.value;
                            setForm((f) => ({
                              ...f,
                              pain_evidence: f.pain_evidence.map((p) =>
                                p.id === item.id ? { ...p, fact: val } : p,
                              ),
                            }));
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`pain-src-${item.id}`} className="text-xs">
                          来源链接 (URL)
                        </Label>
                        <Input
                          id={`pain-src-${item.id}`}
                          type="url"
                          placeholder="如：https://reddit.com/r/... 或推文链接"
                          value={item.src}
                          onChange={(e) => {
                            const val = e.target.value;
                            setForm((f) => ({
                              ...f,
                              pain_evidence: f.pain_evidence.map((p) =>
                                p.id === item.id ? { ...p, src: val } : p,
                              ),
                            }));
                          }}
                        />
                      </div>
                    </div>
                    {missingLink ? (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        ⚠️ 提示：只写“我觉得大家很痛”没有链接的，引擎将按证据不足处理（需填入有效来源链接）。
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
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

        <div className="rounded-xl border border-border/80 bg-background/60 p-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="consent_calibration"
              checked={form.consent_calibration}
              onCheckedChange={(v) => set("consent_calibration", v === true)}
              className="mt-0.5"
            />
            <div className="space-y-1">
              <Label
                htmlFor="consent_calibration"
                className="text-sm font-medium leading-normal cursor-pointer text-foreground"
              >
                提交可用于校准评分模型 (Allow submission to be used to calibrate scoring models)
              </Label>
              <p className="text-xs leading-relaxed text-muted-foreground">
                默认不存；只有勾选同意后才保存提交内容用于校准与改进评分模型。不勾选也能正常打分（绝不捆绑），并可随时撤回。
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-background/60 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Checkbox
              id="consent_followup"
              checked={form.consent_followup}
              onCheckedChange={(v) => {
                const checked = v === true;
                setForm((f) => ({
                  ...f,
                  consent_followup: checked,
                  consent_followup_6m: checked,
                  consent_followup_12m: checked,
                }));
              }}
              className="mt-0.5"
            />
            <div className="space-y-1">
              <Label
                htmlFor="consent_followup"
                className="text-sm font-medium leading-normal cursor-pointer text-foreground"
              >
                同意 6 个月 / 12 个月后回访 (Agree to 6 / 12-month follow-up)
              </Label>
              <p className="text-xs leading-relaxed text-muted-foreground">
                选填。用于在 6 / 12 个月后进行极简进展回访（核对成活与商业化进展以校准模型）。不勾选绝不影响打分。
              </p>
            </div>
          </div>

          <div className="pl-7 space-y-3 pt-1 border-t border-border/40">
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="text-foreground/80 font-medium">回访周期 (选填 · 单独勾选)：</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <Checkbox
                  id="consent_followup_6m"
                  checked={form.consent_followup_6m}
                  onCheckedChange={(v) => {
                    const c6 = v === true;
                    setForm((f) => ({
                      ...f,
                      consent_followup_6m: c6,
                      consent_followup: c6 || f.consent_followup_12m,
                    }));
                  }}
                />
                <span>6 个月后 (6 months)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <Checkbox
                  id="consent_followup_12m"
                  checked={form.consent_followup_12m}
                  onCheckedChange={(v) => {
                    const c12 = v === true;
                    setForm((f) => ({
                      ...f,
                      consent_followup_12m: c12,
                      consent_followup: f.consent_followup_6m || c12,
                    }));
                  }}
                />
                <span>12 个月后 (12 months)</span>
              </label>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="followup_contact"
                className="text-xs font-medium text-foreground"
              >
                联系方式 (Contact info · 选填，仅用于回访)
              </Label>
              <Input
                id="followup_contact"
                type="text"
                placeholder="邮箱 / 微信 / X (Twitter) / Telegram 等（选填）"
                value={form.followup_contact}
                onChange={(e) => set("followup_contact", e.target.value)}
                className="text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                仅用于回访联系，绝不公开；不留联系方式或不同意回访也能正常打分。
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button type="submit" size="lg" disabled={pending} className="min-w-44">
            {pending ? "Scoring…" : "Score this idea"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={fillExample}
          >
            Try an example (填入示例)
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
