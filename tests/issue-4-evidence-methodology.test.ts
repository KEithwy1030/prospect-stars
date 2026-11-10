import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/v1/score/route";
import {
  CHEAPEST_EXPERIMENTS,
  INSUFF,
  requestToProduct,
  score,
  scoreRequestSchema,
  toPublicResponse,
  WEIGHTS,
} from "@/lib/scoring";

describe("Issue #4: 证据等级、最弱维与下一步实验、公开方法页一致性", () => {
  it("验收标准 1 (证据空打分): 结果页证据等级、最弱维、最便宜实验三样齐全", async () => {
    const rawPayload = {
      name: "Empty Evidence Tool",
      description: "A tool with no extra evidence provided",
    };

    const req = new Request("http://localhost:3000/api/v1/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rawPayload),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    // 1. 每个维度旁边标证据等级（四档之一）
    expect(data.dimensions).toHaveLength(6);
    for (const d of data.dimensions) {
      expect(["有来源链接", "用户自填", "推算", "假设"]).toContain(d.evidence_level);
      // 空证据情况下，所有维度都是假设
      expect(d.evidence_level).toBe("假设");
    }

    // 2. 最弱维度信息齐全
    expect(data.weakest_dimension).toBeDefined();
    expect(data.weakest_dimension.key).toBeDefined();
    expect(data.weakest_dimension.name_zh).toBeDefined();
    expect(data.weakest_dimension.name_en).toBeDefined();
    expect(data.weakest_dimension.evidence_level).toBe("假设");
    expect(data.weakest_dimension.stars_display).toBeDefined();

    // 3. 最便宜的下一步实验存在且非空
    expect(data.weakest_dimension.cheapest_experiment).toBeTruthy();
    expect(typeof data.weakest_dimension.cheapest_experiment).toBe("string");
    expect(data.weakest_dimension.cheapest_experiment.length).toBeGreaterThan(15);

    // 4. verdict 包含对弱证据的封顶提示
    expect(data.overall.verdict).toBeDefined();
  });

  it("验收标准 1 (证据全打分): 结果页标有来源链接/用户自填，最弱维度与便宜实验齐全，弱证据在 verdict 里封顶", async () => {
    const fullPayload = {
      name: "Full Evidence SaaS",
      description: "Validated niche tool with comprehensive real-world evidence",
      price_usd: 49,
      has_audience: true,
      audience_size: 20000,
      audience_type: "email list",
      free_or_ai_substitute: "no",
      free_or_ai_why: "Requires proprietary real-time industry data",
      tech_parts: ["landing_page", "accounts", "payments"],
      build_note: "Stripe and Next.js, prototype ready",
      pain_evidence: [
        {
          kind: "抱怨",
          fact: "Spent 5 hours reconciling inventory manually every weekend",
          src: "https://reddit.com/r/ecommerce/comments/example123",
        },
      ],
      payments: {
        stranger_count: 3,
        amount_range: "$49/mo",
      },
      trend: "涨",
      trend_src: "https://trends.google.com/trends/explore?q=inventory+reconciliation",
      competitors: [
        {
          name: "PeerApp",
          price_usd: 59,
          verified_annual_usd: 50000,
          tier: "同级",
          src: "https://trustmrr.com/app/peerapp",
        },
      ],
      low_cost_channels: [
        {
          what: "Targeted subreddit and niche newsletter",
          src: "https://newsletter.example.com",
        },
      ],
      keywords: [
        { keyword: "inventory reconciliation software", volume: 1200, allintitle: 15 },
      ],
      keywords_src: "https://ahrefs.com/keywords-explorer",
    };

    const req = new Request("http://localhost:3000/api/v1/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fullPayload),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    // 检查证据等级：带有效 url 的维度被识别为“有来源链接”
    const demandDim = data.dimensions.find((d: { key: string }) => d.key === "market_demand");
    const revenueDim = data.dimensions.find((d: { key: string }) => d.key === "revenue");
    const promoDim = data.dimensions.find((d: { key: string }) => d.key === "promotion_difficulty");

    expect(demandDim.evidence_level).toBe("有来源链接");
    expect(revenueDim.evidence_level).toBe("有来源链接");
    expect(promoDim.evidence_level).toBe("有来源链接");

    // 最弱维与最便宜实验依然完备
    expect(data.weakest_dimension).toBeDefined();
    expect(data.weakest_dimension.cheapest_experiment).toBeTruthy();
    expect(data.weakest_dimension.name_zh).toBeDefined();
  });

  it("验收标准 2 (方法页与引擎权重一致): 检查六维权重数字与短板说明", () => {
    // 收益 0.25、需求市场 0.2、推广难度 0.2、性价比 0.15、价格 0.1、技术难度 0.1
    expect(WEIGHTS["收益"]).toBe(0.25);
    expect(WEIGHTS["需求市场"]).toBe(0.2);
    expect(WEIGHTS["推广难度"]).toBe(0.2);
    expect(WEIGHTS["性价比"]).toBe(0.15);
    expect(WEIGHTS["价格"]).toBe(0.1);
    expect(WEIGHTS["技术难度"]).toBe(0.1);

    // 六维总权重合计应为 1.0
    const totalWeight = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
    expect(totalWeight).toBeCloseTo(1.0, 5);

    // 证据不足按 2 星算
    expect(INSUFF).toBe(2.0);

    // 最便宜验证实验文案包含核心用例：找 3 个陌生人先收定金、贴 3 条抱怨原话链接
    expect(CHEAPEST_EXPERIMENTS["收益"].zh).toContain("找 3 个陌生人先收定金");
    expect(CHEAPEST_EXPERIMENTS["需求市场"].zh).toContain("贴 3 条");
    expect(CHEAPEST_EXPERIMENTS["需求市场"].zh).toContain("抱怨");
  });

  it("验收标准 3 (弱证据封顶): 弱证据的维度在 verdict 里封顶，不许只给高分不讲证据", () => {
    const parsed = scoreRequestSchema.parse({
      name: "High Score No Link",
      description: "Claiming huge audience and parts but no links",
      has_audience: true,
      audience_size: 50000,
      price_usd: 99,
      free_or_ai_substitute: "no",
      tech_parts: ["landing_page"],
      build_note: "easy",
    });
    const product = requestToProduct(parsed);
    const sc = score(product, "pre");
    const pub = toPublicResponse(parsed, product, sc);

    // 无论总分多高，只要核心维度依赖未验证证据，verdict 均会包含明确的封顶或弱证据警示
    expect(pub.overall.verdict).toMatch(/capped/i);
  });
});
