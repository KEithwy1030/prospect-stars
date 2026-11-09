# Prospect Stars

Free, public, rule-based **pre-launch commercial-prospect scorer** for indie/SaaS founders and AI agents.

Fill a short form (or `POST /api/v1/score`) and get:

- Overall stars (0–5, half-stars)
- Six dimensions: promotion difficulty, technical difficulty, market demand, value, price, revenue
- A plain-English verdict, missing evidence, and revenue magnitude probabilities when applicable

Scores come from fixed evidence rules ported from `stars.py` — **not** an LLM judge. Missing evidence is marked insufficient and counted as 2 stars. Traffic, funding, and TAM are never treated as revenue.

**Known limit (stated on the site and in the API):** we cannot yet reliably separate ~$1k/year from ~$100k/year. When probability spans three tiers, we say so and recommend a cheap test.

Made by **Kaimo**. No login wall, no paid third-party APIs, no custom domain required.

## Local development

```bash
npm install
npm run dev -- --port 43123
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123).

```bash
npm test          # scoring parity + request mapping
npm run build     # production build
```

Optional: set `NEXT_PUBLIC_SITE_URL` to your deployment origin (used in sitemap / canonical).

## API

| Method | Path | Notes |
|--------|------|--------|
| `POST` | `/api/v1/score` | JSON in → score out. No API key. 30 req/min/IP |
| `GET`  | `/api/v1/health` | Liveness |
| `GET`  | `/api/v1/openapi.json` | OpenAPI 3.1 |
| `GET`  | `/llms.txt` | Agent-oriented usage notes |

Example:

```bash
curl -s -X POST http://127.0.0.1:43123/api/v1/score \
  -H 'content-type: application/json' \
  -d '{"name":"ClipDesk","description":"Clipboard manager for freelancers","price_usd":12,"free_or_ai_substitute":"partial"}'
```

## Deploy on Vercel

This is a standard Next.js App Router project. From a linked Vercel project:

```bash
npx vercel --yes
```

Or push to GitHub/Origin and import the repo in the Vercel dashboard. No secrets required for v1.

## Scoring source of truth

TypeScript engine: `src/lib/scoring/stars.ts`  
Base-rate prior: `src/data/base-rate.json` (from `base-rate.yaml`)  
Golden fixtures: `tests/goldens.json` (generated via `scripts/gen_goldens.py` against the original Python)

## Privacy / terms

- [/privacy](/privacy) — no email required; logging for rate limits
- [/terms](/terms) — disclaimer and acceptable use
