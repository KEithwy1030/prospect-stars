import { describe, expect, it } from "vitest";
import {
  scoreRequestSchema,
  requestToProduct,
  score,
  toPublicResponse,
} from "@/lib/scoring";
import {
  REALITY_ANCHOR_STATS,
  type ExpectedRevenueTier,
} from "@/lib/scoring/types";
import { buildRealityComparison } from "@/lib/scoring/response";
import { POST } from "@/app/api/v1/score/route";
import { NextRequest } from "next/server";

describe("Revenue Reality Anchor & Comparison Contract", () => {
  it("maintains the exact TrustMRR 2026-11-10 coarse base-rate numbers", () => {
    expect(REALITY_ANCHOR_STATS.source).toBe("TrustMRR");
    expect(REALITY_ANCHOR_STATS.snapshot_date).toBe("2026-11-10");

    const { tiers } = REALITY_ANCHOR_STATS;
    expect(tiers.under_1k.percentageText).toBe("67.6%");
    expect(tiers.under_1k.share).toBe(0.676);
    expect(tiers.under_1k.labelZh).toBe("不到一千美元");

    expect(tiers.around_1k.percentageText).toBe("17%");
    expect(tiers.around_1k.share).toBe(0.17);
    expect(tiers.around_1k.labelZh).toBe("一千档");

    expect(tiers.around_10k.percentageText).toBe("10.3%");
    expect(tiers.around_10k.share).toBe(0.103);
    expect(tiers.around_10k.labelZh).toBe("一万档");

    expect(tiers.around_100k.percentageText).toBe("5%");
    expect(tiers.around_100k.share).toBe(0.05);
    expect(tiers.around_100k.labelZh).toBe("十万以上");
  });

  it("builds the exact reality comparison sentence for each tier", () => {
    const cases: Array<{
      tier: ExpectedRevenueTier;
      expectedShare: number;
      expectedZh: string;
      expectedPercent: string;
    }> = [
      {
        tier: "under_1k",
        expectedShare: 0.676,
        expectedZh: "不到一千美元",
        expectedPercent: "67.6%",
      },
      {
        tier: "around_1k",
        expectedShare: 0.17,
        expectedZh: "一千档",
        expectedPercent: "17%",
      },
      {
        tier: "around_10k",
        expectedShare: 0.103,
        expectedZh: "一万档",
        expectedPercent: "10.3%",
      },
      {
        tier: "around_100k",
        expectedShare: 0.05,
        expectedZh: "十万以上",
        expectedPercent: "5%",
      },
    ];

    for (const c of cases) {
      const res = buildRealityComparison(c.tier);
      expect(res.tier).toBe(c.tier);
      expect(res.share).toBe(c.expectedShare);
      expect(res.text).toContain(`用户预期的收入档位（${c.expectedZh}）`);
      expect(res.text).toContain(`在历史上占 ${c.expectedPercent}`);
      expect(res.text).toContain("来源：TrustMRR 2026-11-10 快照底数");
    }
  });

  it("parses request schema with expected_revenue_tier and supports aliases", () => {
    const def = scoreRequestSchema.parse({
      name: "DefaultTest",
      description: "Testing default tier",
    });
    expect(def.expected_revenue_tier).toBe("around_10k");

    const zh10k = scoreRequestSchema.parse({
      name: "ZhTest",
      description: "Testing zh alias",
      expected_revenue_tier: "一万档",
    });
    expect(zh10k.expected_revenue_tier).toBe("around_10k");

    const zh100k = scoreRequestSchema.parse({
      name: "Zh100kTest",
      description: "Testing 100k zh alias",
      expected_revenue_tier: "十万以上",
    });
    expect(zh100k.expected_revenue_tier).toBe("around_100k");
  });

  it("populates expected_revenue_tier and reality_comparison in toPublicResponse", () => {
    const req = scoreRequestSchema.parse({
      name: "SaaSClip",
      description: "Clipboard SaaS tool",
      expected_revenue_tier: "around_100k",
    });
    const product = requestToProduct(req);
    const sc = score(product, "pre");
    const pub = toPublicResponse(req, product, sc);

    expect(pub.expected_revenue_tier).toBe("around_100k");
    expect(pub.expected_revenue_share).toBe(0.05);
    expect(pub.reality_comparison).toContain("用户预期的收入档位（十万以上）在历史上占 5%");
    expect(pub.reality_comparison).toContain("TrustMRR 2026-11-10");
  });

  it("API route: correctly accepts expected_revenue_tier and returns reality_comparison", async () => {
    const req = new NextRequest("http://127.0.0.1:43123/api/v1/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "APIRealityCheck",
        description: "Checking reality comparison via API route",
        expected_revenue_tier: "around_10k",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.expected_revenue_tier).toBe("around_10k");
    expect(data.expected_revenue_share).toBe(0.103);
    expect(data.reality_comparison).toContain("用户预期的收入档位（一万档）在历史上占 10.3%");
    expect(data.reality_comparison).toContain("TrustMRR 2026-11-10");
  });
});
