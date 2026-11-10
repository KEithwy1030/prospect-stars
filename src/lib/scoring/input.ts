import { z } from "zod";
import type { Product } from "./types";
import { TECH_COST } from "./stars";

/** English → Chinese tech part aliases accepted by the API/form. */
export const TECH_PART_ALIASES: Record<string, string> = {
  landing_page: "落地页",
  "landing page": "落地页",
  static_files: "静态文件/模板",
  payments: "支付接入",
  payment: "支付接入",
  llm: "调用大模型",
  "large language model": "调用大模型",
  vision: "视觉/多模态模型",
  multimodal: "视觉/多模态模型",
  reports: "生成报告",
  scraping: "抓取公开网页",
  scrape: "抓取公开网页",
  accounts: "用户账户/订阅",
  subscriptions: "用户账户/订阅",
  mcp: "MCP/开发者接口",
  api: "MCP/开发者接口",
  kyc: "第三方平台审核/KYC",
  manual_delivery: "持续人工交付",
  browser_automation: "浏览器自动化/批量抓取",
  compliance: "合规/法律风险",
  legal: "合规/法律风险",
  heavy_content: "大量人工内容（组件/剧本等）",
  realtime: "实时多人",
  multiplayer: "实时多人",
  video: "视频/音频生成渲染",
  audio: "视频/音频生成渲染",
  multi_platform_publish: "第三方平台发布接口（多平台授权）",
};

export function normalizeTechPart(raw: string): string {
  const t = raw.trim();
  if (t in TECH_COST) return t;
  const key = t.toLowerCase();
  if (key in TECH_PART_ALIASES) return TECH_PART_ALIASES[key]!;
  return t;
}

const competitorSchema = z.object({
  name: z.string().min(1).max(120),
  price_usd: z.number().positive().max(1_000_000).optional(),
  verified_annual_usd: z.number().nonnegative().max(1e9).optional(),
  tier: z.enum(["peer", "incumbent", "同级", "头部"]).optional(),
  tranco_rank: z.number().int().positive().max(1e8).optional(),
});

const keywordSchema = z.union([
  z.string().min(1).max(120),
  z.object({
    keyword: z.string().min(1).max(120),
    volume: z.union([z.string(), z.number()]).optional(),
    allintitle: z.number().int().nonnegative().optional(),
    cpc_low: z.number().nonnegative().optional(),
    cpc_high: z.number().nonnegative().optional(),
  }),
]);

export const scoreRequestSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().min(1).max(500),
  site_url: z
    .string()
    .url()
    .max(500)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  price_usd: z.number().positive().max(1_000_000).optional(),
  keywords: z.array(keywordSchema).max(20).optional(),
  has_audience: z.boolean().optional(),
  audience_size: z.number().int().nonnegative().max(1e9).optional(),
  audience_type: z.string().max(80).optional(),
  competitors: z.array(competitorSchema).max(10).optional(),
  build_note: z.string().max(1000).optional(),
  tech_parts: z.array(z.string().max(80)).max(20).optional(),
  free_or_ai_substitute: z
    .enum(["yes", "partial", "no", "能", "部分能", "否"])
    .optional(),
  free_or_ai_why: z.string().max(500).optional(),
  low_cost_channels: z
    .array(z.object({ what: z.string().max(160), src: z.string().max(300).optional() }))
    .max(10)
    .optional(),
  pain_evidence: z
    .array(
      z.object({
        kind: z
          .enum([
            "complaint",
            "willing_to_pay",
            "refusal",
            "similar_paid",
            "抱怨",
            "愿付钱",
            "拒绝",
            "同类付费",
          ])
          .optional()
          .default("抱怨"),
        people: z.number().int().positive().max(10000).optional(),
        fact: z.string().max(400).optional(),
        src: z.string().max(300).optional(),
      }),
    )
    .max(20)
    .optional(),
  payments: z
    .object({
      stranger_count: z.union([z.number(), z.string()]).optional(),
      amounts_usd: z.array(z.union([z.number(), z.string()])).optional(),
      amount_range: z.string().max(100).optional(),
      src: z.string().max(300).optional(),
      note: z.string().max(500).optional(),
    })
    .optional(),
  trend: z.enum(["up", "flat", "down", "涨", "平", "跌"]).optional(),
  trend_src: z.string().max(300).optional(),
  idea_source: z
    .enum([
      "paid_market",
      "own_pain",
      "both",
      "已有付费竞品的市场",
      "自己痛点出发",
      "两者都有",
    ])
    .optional(),
  lookup_tranco: z.boolean().optional(),
  expected_revenue_tier: z
    .enum([
      "under_1k",
      "around_1k",
      "around_10k",
      "around_100k",
      "不到一千",
      "不到一千美元",
      "一千档",
      "一万档",
      "十万以上",
    ])
    .optional()
    .default("around_10k")
    .transform((val) => {
      if (val === "不到一千" || val === "不到一千美元") return "under_1k" as const;
      if (val === "一千档") return "around_1k" as const;
      if (val === "一万档") return "around_10k" as const;
      if (val === "十万以上") return "around_100k" as const;
      return val as "under_1k" | "around_1k" | "around_10k" | "around_100k";
    }),
  consent_calibration: z.boolean().optional().default(false),
  allow_calibration: z.boolean().optional(),
}).transform((data) => ({
  ...data,
  consent_calibration: Boolean(data.consent_calibration || data.allow_calibration),
}));

export type ScoreRequest = z.infer<typeof scoreRequestSchema>;

function mapSubstitute(v?: string): string | undefined {
  if (!v) return undefined;
  if (v === "yes" || v === "能") return "能";
  if (v === "partial" || v === "部分能") return "部分能";
  if (v === "no" || v === "否") return "否";
  return undefined;
}

function mapPainKind(k?: string): string {
  if (!k) return "抱怨";
  if (k === "complaint" || k === "抱怨") return "抱怨";
  if (k === "willing_to_pay" || k === "愿付钱") return "愿付钱";
  if (k === "refusal" || k === "拒绝") return "拒绝";
  if (k === "similar_paid" || k === "同类付费") return "同类付费";
  return k;
}

function mapTier(t?: string): string | undefined {
  if (!t) return undefined;
  if (t === "peer" || t === "同级") return "同级";
  if (t === "incumbent" || t === "头部") return "头部";
  return t;
}

function mapTrend(t?: string): string | undefined {
  if (!t) return undefined;
  if (t === "up" || t === "涨") return "涨";
  if (t === "down" || t === "跌") return "跌";
  if (t === "flat" || t === "平") return "平";
  return t;
}

/** Map public form/API request into the internal product evidence shape. */
export function requestToProduct(req: ScoreRequest): Product {
  const product: Product = {
    name: req.name,
    concept: req.description,
    site: req.site_url,
  };

  if (req.price_usd != null) {
    product.price = { tiers: [req.price_usd], src: "user-submitted list price" };
  }

  if (req.keywords?.length) {
    product.keywords = req.keywords.map((k) => {
      if (typeof k === "string") return { keyword: k };
      return {
        keyword: k.keyword,
        volume: k.volume,
        allintitle: k.allintitle,
        cpc_low: k.cpc_low,
        cpc_high: k.cpc_high,
      };
    });
  }

  const ans = mapSubstitute(req.free_or_ai_substitute);
  if (ans) {
    product.free_or_ai_substitute = {
      answer: ans,
      why: req.free_or_ai_why || "user-submitted",
      src: "user-submitted",
    };
  }

  if (req.competitors?.length) {
    product.paid_comps = req.competitors.map((c) => ({
      name: c.name,
      price_low_usd: c.price_usd,
      verified_annual_usd: c.verified_annual_usd,
      tier: mapTier(c.tier) || (c.verified_annual_usd != null ? "同级" : undefined),
      tranco: c.tranco_rank
        ? { rank: c.tranco_rank, src: "user-submitted or Tranco lookup" }
        : undefined,
      src: "user-submitted",
    }));
  }

  if (req.tech_parts?.length || req.build_note) {
    const parts = (req.tech_parts || []).map(normalizeTechPart);
    // If only a free-text build note, still require parts for a scored tech dim;
    // without parts/why the engine correctly marks insufficient.
    product.tech = {
      parts: parts.length ? parts : undefined,
      why: req.build_note || (parts.length ? "user-submitted tech parts" : undefined),
      src: "user-submitted",
    };
  }

  const dist: NonNullable<Product["distribution"]> = {};
  if (req.low_cost_channels?.length) {
    dist.channels = req.low_cost_channels.map((c) => ({
      what: c.what,
      src: c.src || "user-submitted",
    }));
  }
  if (req.has_audience) {
    const size = req.audience_size;
    if (size != null && size > 0) {
      dist.assets = [
        {
          what: req.audience_type || "Built-in audience",
          size,
          at_launch: "是",
          src: "user-submitted",
        },
      ];
    } else {
      // Claimed audience without a countable size does not earn distribution points
      // (stars.py only counts assets with a numeric size). Mark as a channel note only.
      dist.channels = [
        ...(dist.channels || []),
        {
          what: `Built-in audience claimed (${req.audience_type || "followers/list/channel"}) — size not provided`,
          src: "user-submitted",
        },
      ];
    }
  }
  if (dist.channels || dist.assets) product.distribution = dist;

  if (req.pain_evidence?.length) {
    product.pain_evidence = req.pain_evidence
      .filter((x) => (x.fact && x.fact.trim()) || (x.src && x.src.trim()))
      .map((x) => ({
        kind: mapPainKind(x.kind),
        people: x.people,
        fact: x.fact?.trim(),
        // Only provide src if user actually supplied one; empty src remains undefined
        // so the scoring engine treats quotes without links as insufficient evidence.
        src: x.src?.trim() || undefined,
      }));
  }

  const trend = mapTrend(req.trend);
  if (trend) {
    product.trend = {
      direction: trend,
      src: req.trend_src?.trim() || "user-submitted",
    };
  }

  if (req.payments) {
    let stranger_count: number | undefined;
    if (typeof req.payments.stranger_count === "number") {
      stranger_count = req.payments.stranger_count;
    } else if (typeof req.payments.stranger_count === "string") {
      const s = req.payments.stranger_count.trim();
      if (s === "3+" || s === "3") stranger_count = 3;
      else if (s === "1-2" || s === "1–2" || s === "1" || s === "2") stranger_count = 1;
      else if (s === "0") stranger_count = 0;
      else {
        const parsed = parseInt(s, 10);
        if (!isNaN(parsed)) stranger_count = parsed;
      }
    }
    const note = [req.payments.amount_range, req.payments.note].filter(Boolean).join(" ");
    product.payments = {
      stranger_count,
      amounts_usd: req.payments.amounts_usd?.map(Number).filter((n) => Number.isFinite(n)),
      note: note || undefined,
      src: req.payments.src || "user-submitted",
    };
  }

  return product;
}

export function missingEvidence(product: Product, sc: import("./types").ScoreResult): string[] {
  const missing: string[] = [];
  for (const [k, d] of Object.entries(sc.dims)) {
    if (d.insuff || d.star === null) {
      const label =
        k === "推广难度"
          ? "promotion / distribution evidence"
          : k === "技术难度"
            ? "tech parts and build rationale"
            : k === "需求市场"
              ? "demand evidence (search volume, pain quotes, or peer revenue)"
              : k === "性价比"
                ? "whether free tools or AI can substitute"
                : k === "价格"
                  ? "peer list prices"
                  : "same-tier peer verified revenue";
      missing.push(label);
    }
  }
  // Extra clarity for common thin pre-launch cases
  if (!(product.distribution?.channels || []).length && !(product.distribution?.assets || []).length) {
    if (!missing.includes("promotion / distribution evidence")) {
      // promo is not marked insuff=true when it scores with the 2-star cap; still surface gap
      missing.push("low-cost reach channel or verifiable audience");
    }
  }
  if (!product.price?.tiers?.length) missing.push("your list price");
  // de-dupe
  return [...new Set(missing)];
}
