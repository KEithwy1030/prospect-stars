import {
  DIMS,
  INSUFF,
  plain,
  shortReason,
  starsGlyph,
  verdict,
  WEIGHTS,
} from "./stars";
import { missingEvidence, type ScoreRequest } from "./input";
import type { Product, ScoreResult } from "./types";
import {
  API_DIM_LABELS,
  DIM_TO_API,
  MAGNITUDE_LABELS,
  MAGNITUDE_LEVELS,
  type ApiDimKey,
} from "./types";

export interface PublicDimScore {
  key: ApiDimKey;
  label: string;
  stars: number | null;
  stars_display: string;
  insufficient_evidence: boolean;
  counted_as: number;
  weight: number;
  plain_english: string;
  summary: string;
  reasons: string[];
}

export interface MagnitudeTier {
  key: (typeof MAGNITUDE_LEVELS)[number];
  label: string;
  probability: number;
}

export interface PublicScoreResponse {
  api_version: "v1";
  mode: "pre_launch";
  name: string;
  description: string;
  overall: {
    stars: number;
    stars_display: string;
    verdict: string;
  };
  dimensions: PublicDimScore[];
  magnitudes: MagnitudeTier[] | null;
  magnitude_uncertain: boolean;
  missing_evidence: string[];
  caps_applied: string[];
  disclaimer: string;
  limitations: string[];
  scored_at: string;
  consent_calibration: boolean;
}

export const DISCLAIMER =
  "Prospect Stars is a free, rule-based pre-launch commercial-prospect scorer. It does not predict guaranteed revenue. When evidence is thin, dimensions are marked insufficient and counted as 2 stars (which lowers the total). We cannot yet reliably separate a ~$1k/year business from a ~$100k/year one — if probability spans three magnitude tiers, we say so and recommend a cheap test instead of assigning 4+ revenue stars.";

export const LIMITATIONS = [
  "Scoring uses fixed evidence rules — not an LLM judge.",
  "Traffic, funding, and TAM are never treated as revenue.",
  "Pre-launch mode ignores post-launch funnel/payment evidence.",
  "Optional Tranco rank lookup is best-effort and may be unavailable.",
];

export function toPublicResponse(
  req: ScoreRequest,
  product: Product,
  sc: ScoreResult,
): PublicScoreResponse {
  const dist = sc.dims["收益"].dist;
  const magnitude_uncertain =
    dist != null && dist.filter((x) => x >= 0.15).length >= 3;

  const dimensions: PublicDimScore[] = DIMS.map((k) => {
    const d = sc.dims[k];
    const key = DIM_TO_API[k];
    return {
      key,
      label: API_DIM_LABELS[key],
      stars: d.star,
      stars_display: d.star === null ? "insufficient" : starsGlyph(d.star),
      insufficient_evidence: d.insuff || d.star === null,
      counted_as: d.star !== null ? d.star : INSUFF,
      weight: WEIGHTS[k],
      plain_english: plain(k, d.star),
      summary: shortReason(d),
      reasons: d.why.filter((x) => !x.startsWith("BRIEF:")),
    };
  });

  return {
    api_version: "v1",
    mode: "pre_launch",
    name: req.name,
    description: req.description,
    overall: {
      stars: sc.total,
      stars_display: starsGlyph(sc.total),
      verdict: verdict(sc),
    },
    dimensions,
    magnitudes: dist
      ? MAGNITUDE_LEVELS.map((key, i) => ({
          key,
          label: MAGNITUDE_LABELS[key],
          probability: Math.round(dist[i]! * 1000) / 1000,
        }))
      : null,
    magnitude_uncertain,
    missing_evidence: missingEvidence(product, sc),
    caps_applied: sc.caps,
    disclaimer: DISCLAIMER,
    limitations: LIMITATIONS,
    scored_at: new Date().toISOString(),
    consent_calibration: Boolean(req.consent_calibration),
  };
}
