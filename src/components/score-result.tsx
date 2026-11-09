"use client";

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
                <h3 className="font-medium text-foreground">
                  {UI_DIM_LABELS[d.key] || d.label}
                </h3>
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

      <p className="text-xs leading-relaxed text-muted-foreground">{result.disclaimer}</p>
    </section>
  );
}
