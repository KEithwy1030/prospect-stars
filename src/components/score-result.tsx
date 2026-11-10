"use client";

import Link from "next/link";
import type { PublicScoreResponse } from "@/lib/scoring";
import { UI_DIM_LABELS } from "@/lib/scoring";
import { StarRating } from "./star-rating";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export function ScoreResult({ result }: { result: PublicScoreResponse }) {
  return (
    <section
      id="result"
      className="animate-rise space-y-8 scroll-mt-8"
      aria-live="polite"
    >
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">
          Result for {result.name}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-3xl text-ink sm:text-4xl">Overall score</h2>
            <p className="mt-2 max-w-2xl text-base text-foreground/90">
              {result.overall.verdict}
            </p>
          </div>
          <StarRating value={result.overall.stars} size="lg" />
        </div>
      </div>

      {/* 现实底数对照句 */}
      <div
        className="rounded-xl border border-star/40 bg-star/[0.05] p-4 text-sm"
        aria-label="Reality comparison"
      >
        <div className="flex items-start gap-2.5">
          <span className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-star" />
          <div className="space-y-1">
            <p className="font-medium text-ink">
              {result.reality_comparison}
            </p>
            <p className="text-xs text-muted-foreground">
              Reality benchmark: The user&apos;s expected revenue tier historically accounts for{" "}
              {result.expected_revenue_share != null
                ? `${(result.expected_revenue_share * 100).toFixed(1).replace(/\.0$/, "")}%`
                : "10.3%"}{" "}
              of indie projects (Source: TrustMRR 2026-11-10 snapshot prior; under $1k: 67.6%, $1k tier: 17%, $10k tier: 10.3%, $100k+: 5%).
            </p>
          </div>
        </div>
      </div>

      {result.magnitude_uncertain ? (
        <Alert className="border-star/40 bg-accent/50">
          <AlertTitle>Revenue magnitude is still unclear</AlertTitle>
          <AlertDescription>
            Probability spans three tiers — we cannot yet tell ~$1k/year from ~$100k/year.
            Run a cheap test before treating this as a strong prospect.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        {result.dimensions.map((d, i) => (
          <article
            key={d.key}
            className="animate-rise space-y-2 border-t border-border/80 pt-4"
            style={{ animationDelay: `${80 + i * 50}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium text-foreground">
                    {UI_DIM_LABELS[d.key] || d.label}
                  </h3>
                  <span
                    className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                      d.evidence_level === "有来源链接"
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                        : d.evidence_level === "用户自填"
                          ? "bg-blue-50 text-blue-700 ring-blue-700/10"
                          : d.evidence_level === "推算"
                            ? "bg-amber-50 text-amber-800 ring-amber-600/20"
                            : "bg-rose-50 text-rose-700 ring-rose-600/20"
                    }`}
                    data-testid={`evidence-level-${d.key}`}
                  >
                    证据：{d.evidence_level}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Weight {(d.weight * 100).toFixed(0)}%
                  {d.insufficient_evidence ? " · counted as 2★" : ""}
                </p>
              </div>
              <StarRating value={d.stars} size="sm" />
            </div>
            <p className="text-sm text-foreground/85">{d.plain_english}</p>
            <p className="text-sm text-muted-foreground">{d.summary}</p>
          </article>
        ))}
      </div>

      {result.magnitudes ? (
        <div className="space-y-3">
          <h3 className="font-display text-2xl text-ink">Revenue magnitude prior</h3>
          <p className="text-sm text-muted-foreground">
            Pre-launch probability across yearly revenue tiers (base rate + same-tier peers +
            distribution shift). Not a forecast.
          </p>
          <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-xs text-foreground/80">
            {result.reality_comparison}
          </div>
          <ul className="space-y-2">
            {result.magnitudes.map((m) => (
              <li key={m.key} className="grid grid-cols-[1fr_auto] items-center gap-3 text-sm">
                <div>
                  <div className="mb-1 flex justify-between gap-2">
                    <span>{m.label}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {(m.probability * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="animate-bar-fill h-full rounded-full bg-star/80"
                      style={{ width: `${Math.max(m.probability * 100, 1)}%` }}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Separator />

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 font-medium">Missing evidence</h3>
          {result.missing_evidence.length ? (
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {result.missing_evidence.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No major gaps flagged.</p>
          )}
        </div>
        <div>
          <h3 className="mb-2 font-medium">Caps applied</h3>
          {result.caps_applied.length ? (
            <ul className="space-y-2">
              {result.caps_applied.map((c) => (
                <li key={c}>
                  <Badge variant="secondary" className="whitespace-normal text-left font-normal">
                    {c}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No overall caps triggered.</p>
          )}
        </div>
      </div>

      {/* 底部两行：最弱维度与最便宜的下一步实验 */}
      {result.weakest_dimension ? (
        <div
          className="rounded-xl border border-star/40 bg-star/[0.04] p-5 space-y-3"
          data-testid="weakest-dimension-card"
        >
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
            <span className="font-semibold text-foreground text-sm shrink-0">
              最弱维度：
            </span>
            <span className="text-sm text-foreground font-medium" data-testid="weakest-dimension-name">
              {result.weakest_dimension.name_zh} / {result.weakest_dimension.name_en}（
              {result.weakest_dimension.stars_display} · 证据等级：
              <span className="font-semibold">{result.weakest_dimension.evidence_level}</span>）
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
            <span className="font-semibold text-foreground text-sm shrink-0">
              针对它最便宜的一次验证实验：
            </span>
            <span className="text-sm text-foreground/90 leading-relaxed" data-testid="cheapest-experiment">
              {result.weakest_dimension.cheapest_experiment}
            </span>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
        <span>想了解六维权重、证据不足按 2 星算与“分不清年入一千与十万”的短板？</span>
        <Link
          href="/methodology"
          className="font-medium text-foreground underline underline-offset-4 hover:text-star transition-colors"
          data-testid="result-methodology-link"
        >
          查看公开打分方法与已知短板 →
        </Link>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">{result.disclaimer}</p>
    </section>
  );
}
