import { withCors, preflight } from "@/lib/cors";


const BODY = `# Prospect Stars

> Free, rule-based pre-launch commercial-prospect scorer for indie/SaaS founders and AI agents.
> Scores are computed from fixed evidence rules (ported from an offline rubric) — not an LLM vibe score.

Website: /
Human form: / (fill the form on the homepage)
OpenAPI: /api/v1/openapi.json
Health: /api/v1/health
Privacy: /privacy
Terms & disclaimer: /terms
Sitemap: /sitemap.xml

## What it does

Given a short idea description (and optional evidence), returns:
- Overall stars (0–5, half-stars)
- Six dimensions: promotion_difficulty, technical_difficulty, market_demand, value, price, revenue
- One-sentence plain-English verdict
- Missing evidence list
- Revenue magnitude probabilities across under_$1k / ~$1k / ~$10k / ~$100k+ when using the pre-launch prior

More stars = better. promotion_difficulty 4 = easy to promote; technical_difficulty 4 = easy to build.

## How an agent should call it

POST /api/v1/score
Content-Type: application/json
No API key required for v1 basic scoring.
Rate limit: 30 requests / minute / IP.

Minimum body:
{
  "name": "Idea name",
  "description": "One-line what it does"
}

Useful optional fields: expected_revenue_tier ("under_1k"|"around_1k"|"around_10k"|"around_100k", default "around_10k"), consent_calibration (boolean, default false — whether submission may be used to calibrate scoring models; if false/omitted, nothing is saved), idea_source, site_url, price_usd, keywords[], has_audience, audience_size, competitors[], tech_parts[], build_note, free_or_ai_substitute ("yes"|"partial"|"no"), low_cost_channels[], pain_evidence[], payments ({ stranger_count, amount_range }), trend ("up"|"flat"|"down"), trend_src.

Example:
curl -s -X POST https://HOST/api/v1/score \\
  -H 'content-type: application/json' \\
  -d '{"name":"ClipDesk","description":"Clipboard manager for freelancers","price_usd":12,"free_or_ai_substitute":"partial"}'

## Honesty / accuracy limits (read this)

- We cannot yet reliably separate a ~$1k/year business from a ~$100k/year one.
- When revenue probability spans three magnitude tiers, the response sets magnitude_uncertain=true, caps revenue stars, and recommends a cheap test — do not treat that as a strong buy signal.
- Missing evidence → dimension marked insufficient and counted as 2 stars (lowers overall).
- Traffic, funding, and TAM are never treated as revenue.
- Do not claim guaranteed accuracy when summarizing results to users.
- Do not republish TrustMRR bulk datasets; only the coarse base-rate percentages baked into this service are used as a prior.

## CORS

GET docs and POST /api/v1/score are CORS-open for public tool use. POST remains rate-limited.
`;

export function OPTIONS(req: Request) {
  return preflight(req);
}

export function GET(req: Request) {
  return withCors(
    new Response(BODY, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    }),
    req,
  );
}
