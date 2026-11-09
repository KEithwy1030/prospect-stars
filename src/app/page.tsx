import { ScoreForm } from "@/components/score-form";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <section className="mb-10 max-w-3xl animate-rise">
        <p className="mb-3 text-sm uppercase tracking-[0.2em] text-star">Free · rule-based · no login</p>
        <h1 className="font-display text-4xl leading-[1.05] tracking-tight text-ink sm:text-6xl">
          Prospect Stars
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-foreground/85 sm:text-xl">
          Score a pre-launch SaaS or website idea on six evidence dimensions — not an LLM vibe
          rating. Missing evidence lowers the score on purpose.
        </p>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Known limit: we cannot yet reliably separate ~$1k/year from ~$100k/year. When the
          revenue interval spans three tiers, we say so and recommend a cheap test.
        </p>
      </section>

      <section
        aria-label="Score your idea"
        className="animate-rise rounded-2xl border border-border/80 bg-white/55 p-5 shadow-[0_20px_60px_-40px_rgb(21_32_51/0.45)] backdrop-blur-sm sm:p-8"
        style={{ animationDelay: "80ms" }}
      >
        <ScoreForm />
      </section>

      <section className="mt-14 max-w-3xl space-y-3 text-sm text-muted-foreground">
        <h2 className="font-display text-2xl text-ink">For AI agents</h2>
        <p>
          <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">POST /api/v1/score</code>{" "}
          — JSON in, JSON out. Spec:{" "}
          <a className="underline underline-offset-2 hover:text-foreground" href="/api/v1/openapi.json">
            OpenAPI
          </a>
          . Agent brief:{" "}
          <a className="underline underline-offset-2 hover:text-foreground" href="/llms.txt">
            llms.txt
          </a>
          . No API key for basic v1; 30 req/min/IP.
        </p>
      </section>
    </div>
  );
}
