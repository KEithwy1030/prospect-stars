import {
  DIMS,
  determineEvidenceLevel,
  findWeakestDimension,
  INSUFF,
  plain,
  shortReason,
  starsGlyph,
  verdict,
  WEIGHTS,
} from "./stars";
import { missingEvidence, type ScoreRequest } from "./input";
import type {
  DimKey,
  EvidenceLevel,
  Product,
  ScoreResult,
  WeakestDimensionInfo,
} from "./types";
import {
  API_DIM_LABELS,
  DIM_TO_API,
  MAGNITUDE_LABELS,
  MAGNITUDE_LEVELS,
  REALITY_ANCHOR_STATS,
  type ApiDimKey,
  type ExpectedRevenueTier,
} from "./types";

export interface PublicDimScore {
  key: ApiDimKey;
  label: string;
  stars: number | null;
  stars_display: string;
  evidence_level: EvidenceLevel;
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
  weakest_dimension: WeakestDimensionInfo;
  magnitudes: MagnitudeTier[] | null;
  magnitude_uncertain: boolean;
  expected_revenue_tier: ExpectedRevenueTier;
  expected_revenue_share: number;
  reality_comparison: string;
  missing_evidence: string[];
  caps_applied: string[];
  disclaimer: string;
  limitations: string[];
  scored_at: string;
  consent_calibration: boolean;
  consent_followup: boolean;
  consent_followup_6m: boolean;
  consent_followup_12m: boolean;
  followup_intervals: string[];
  followup_contact: string | null;
  followup: {
    consent: boolean;
    consent_6m: boolean;
    consent_12m: boolean;
    intervals: string[];
    contact: string | null;
  };
}

export function buildRealityComparison(tier?: string): {
  tier: ExpectedRevenueTier;
  share: number;
  text: string;
} {
  const normalizedTier = (
    tier && tier in REALITY_ANCHOR_STATS.tiers ? tier : "around_10k"
  ) as ExpectedRevenueTier;
  const stat = REALITY_ANCHOR_STATS.tiers[normalizedTier];
  const share = stat.share;
  const text = `对照现实底数：用户预期的收入档位（${stat.labelZh}）在历史上占 ${stat.percentageText}（来源：${REALITY_ANCHOR_STATS.source} ${REALITY_ANCHOR_STATS.snapshot_date} 快照底数）。`;
  return { tier: normalizedTier, share, text };
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

  const evidenceLevels: Record<DimKey, EvidenceLevel> = {} as Record<DimKey, EvidenceLevel>;
  for (const k of DIMS) {
    evidenceLevels[k] = determineEvidenceLevel(k, product, sc.dims[k], sc.mode);
  }

  const dimensions: PublicDimScore[] = DIMS.map((k) => {
    const d = sc.dims[k];
    const key = DIM_TO_API[k];
    return {
      key,
      label: API_DIM_LABELS[key],
      stars: d.star,
      stars_display: d.star === null ? "insufficient" : starsGlyph(d.star),
      evidence_level: evidenceLevels[k],
      insufficient_evidence: d.insuff || d.star === null,
      counted_as: d.star !== null ? d.star : INSUFF,
      weight: WEIGHTS[k],
      plain_english: plain(k, d.star),
      summary: shortReason(d),
      reasons: d.why.filter((x) => !x.startsWith("BRIEF:")),
    };
  });

  const weakest_dimension = findWeakestDimension(sc.dims, evidenceLevels);
  const reality = buildRealityComparison(req.expected_revenue_tier);

  return {
    api_version: "v1",
    mode: "pre_launch",
    name: req.name,
    description: req.description,
    overall: {
      stars: sc.total,
      stars_display: starsGlyph(sc.total),
      verdict: verdict(sc, evidenceLevels),
    },
    dimensions,
    weakest_dimension,
    magnitudes: dist
      ? MAGNITUDE_LEVELS.map((key, i) => ({
          key,
          label: MAGNITUDE_LABELS[key],
          probability: Math.round(dist[i]! * 1000) / 1000,
        }))
      : null,
    magnitude_uncertain,
    expected_revenue_tier: reality.tier,
    expected_revenue_share: reality.share,
    reality_comparison: reality.text,
    missing_evidence: missingEvidence(product, sc),
    caps_applied: sc.caps,
    disclaimer: DISCLAIMER,
    limitations: LIMITATIONS,
    scored_at: new Date().toISOString(),
    consent_calibration: Boolean(req.consent_calibration),
    consent_followup: Boolean(req.consent_followup),
    consent_followup_6m: Boolean(req.consent_followup_6m),
    consent_followup_12m: Boolean(req.consent_followup_12m),
    followup_intervals: req.consent_followup ? (req.followup_intervals ?? []) : [],
    followup_contact: req.consent_followup ? (req.followup_contact || null) : null,
    followup: {
      consent: Boolean(req.consent_followup),
      consent_6m: Boolean(req.consent_followup_6m),
      consent_12m: Boolean(req.consent_followup_12m),
      intervals: req.consent_followup ? (req.followup_intervals ?? []) : [],
      contact: req.consent_followup ? (req.followup_contact || null) : null,
    },
  };
}
