/** Product evidence shape (pre-launch YAML port). Missing fields = insufficient evidence. */

export type Mode = "pre" | "now";

export type PainKind = "抱怨" | "愿付钱" | "拒绝" | "假设" | "同类付费" | "其它" | string;

export interface SrcItem {
  src?: string;
  phase?: string;
}

export interface DistAsset extends SrcItem {
  what?: string;
  size?: number | string;
  at_launch?: string;
}

export interface DistChannel extends SrcItem {
  what?: string;
}

export interface TrackRecord extends SrcItem {
  what?: string;
  monthly_usd?: number | string;
}

export interface Keyword {
  keyword?: string;
  volume?: string | number;
  allintitle?: number | string;
  cpc_low?: number | string;
  cpc_high?: number | string;
}

export interface PaidComp {
  name?: string;
  price?: string;
  price_low_usd?: number | string;
  tier?: string;
  verified_annual_usd?: number | string;
  verified_note?: string;
  tranco?: { rank?: number | string; date?: string; src?: string };
  src?: string;
}

export interface PainEvidence extends SrcItem {
  kind?: PainKind;
  people?: number | string;
  fact?: string;
}

export interface TechSpec {
  parts?: string[];
  why?: string;
  src?: string;
  built?: string;
}

export interface Product {
  name?: string;
  concept?: string;
  site?: string;
  status?: string;
  keywords?: Keyword[];
  keywords_src?: string;
  ads?: { cpc_low?: number | string; cpc_high?: number | string; src?: string };
  paid_comps?: PaidComp[];
  pain_evidence?: PainEvidence[];
  free_or_ai_substitute?: { answer?: string; why?: string; src?: string };
  price?: { tiers?: Array<number | string>; src?: string };
  distribution?: {
    channels?: DistChannel[];
    assets?: DistAsset[];
    proven_channels?: DistChannel[];
    track_record?: TrackRecord[];
    comp_cpa?: { usd?: number | string; src?: string };
  };
  tech?: TechSpec;
  trend?: { direction?: string; src?: string };
  payments?: { stranger_count?: number | string; amounts_usd?: Array<number | string>; src?: string; note?: string };
  trials?: Array<{ price?: number | string; people?: number | string; paid?: number | string; src?: string }>;
  funnel?: Record<string, unknown>;
  gaps?: string[];
}

export interface FunnelEstimate {
  days?: number | null;
  reached?: number | null;
  looked?: number | null;
  paid?: number | null;
  revenue?: number | null;
  small_sample?: boolean;
}

export type DimKey =
  | "推广难度"
  | "技术难度"
  | "需求市场"
  | "性价比"
  | "价格"
  | "收益";

export interface DimResult {
  star: number | null;
  why: string[];
  insuff: boolean;
  dist?: number[] | null;
}

export interface ScoreResult {
  dims: Record<DimKey, DimResult>;
  total: number;
  caps: string[];
  mode: Mode;
}

/** Public API dimension keys (stable English snake_case). */
export type ApiDimKey =
  | "promotion_difficulty"
  | "technical_difficulty"
  | "market_demand"
  | "value"
  | "price"
  | "revenue";

export const DIM_TO_API: Record<DimKey, ApiDimKey> = {
  推广难度: "promotion_difficulty",
  技术难度: "technical_difficulty",
  需求市场: "market_demand",
  性价比: "value",
  价格: "price",
  收益: "revenue",
};

export const API_TO_DIM: Record<ApiDimKey, DimKey> = {
  promotion_difficulty: "推广难度",
  technical_difficulty: "技术难度",
  market_demand: "需求市场",
  value: "性价比",
  price: "价格",
  revenue: "收益",
};

export const API_DIM_LABELS: Record<ApiDimKey, string> = {
  promotion_difficulty: "Promotion difficulty",
  technical_difficulty: "Technical difficulty",
  market_demand: "Market demand",
  value: "Value (cost-effectiveness)",
  price: "Price",
  revenue: "Revenue",
};

export const UI_DIM_LABELS: Record<ApiDimKey, string> = {
  promotion_difficulty: "Easy to promote",
  technical_difficulty: "Easy to build",
  market_demand: "Market demand",
  value: "Value for money",
  price: "Pricing fit",
  revenue: "Revenue prospect",
};

export const MAGNITUDE_LEVELS = [
  "under_1k",
  "around_1k",
  "around_10k",
  "around_100k",
] as const;

export const MAGNITUDE_LABELS: Record<(typeof MAGNITUDE_LEVELS)[number], string> = {
  under_1k: "Under $1k / year",
  around_1k: "Around $1k / year",
  around_10k: "Around $10k / year",
  around_100k: "Around $100k+ / year",
};
