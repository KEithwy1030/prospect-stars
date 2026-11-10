import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/v1/score/route";
import {
  requestToProduct,
  score,
  scoreRequestSchema,
} from "@/lib/scoring";

describe("Issue #3: Evidence Inputs Contract & Acceptance", () => {
  it("验收标准 1: 表单填一条带链接的抱怨 + 3 个陌生人付款 + 趋势“涨”，提交后需求市场维与收益维不再是“证据不足”，且扣分理由里出现对应证据", async () => {
    const rawPayload = {
      name: "SaaS Price Monitor",
      description: "Automated competitor pricing tracker",
      idea_source: "两者都有",
      pain_evidence: [
        {
          kind: "抱怨",
          fact: "每次手动对比竞品价格都要耗上两小时，太痛苦了",
          src: "https://news.ycombinator.com/item?id=12345",
        },
      ],
      payments: {
        stranger_count: 3,
        amount_range: "$29/mo",
      },
      trend: "涨",
      trend_src: "Google Trends 过去 12 个月持续上升",
    };

    // 1. Schema 解析验证
    const parsed = scoreRequestSchema.parse(rawPayload);
    expect(parsed.payments?.stranger_count).toBe(3);
    expect(parsed.trend).toBe("涨");
    expect(parsed.trend_src).toBe("Google Trends 过去 12 个月持续上升");
    expect(parsed.pain_evidence).toHaveLength(1);
    expect(parsed.pain_evidence![0].src).toBe("https://news.ycombinator.com/item?id=12345");

    // 2. 映射为 Product
    const product = requestToProduct(parsed);
    expect(product.pain_evidence).toHaveLength(1);
    expect(product.pain_evidence![0].kind).toBe("抱怨");
    expect(product.pain_evidence![0].src).toBe("https://news.ycombinator.com/item?id=12345");
    expect(product.trend?.direction).toBe("涨");
    expect(product.trend?.src).toBe("Google Trends 过去 12 个月持续上升");
    expect(product.payments?.stranger_count).toBe(3);

    // 3. API 路由端到端验证
    const req = new Request("http://localhost:3000/api/v1/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rawPayload),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    const demandDim = data.dimensions.find(
      (d: { key: string }) => d.key === "market_demand",
    );
    const revenueDim = data.dimensions.find(
      (d: { key: string }) => d.key === "revenue",
    );

    // 需求市场维不再是“证据不足”
    expect(demandDim.insufficient_evidence).toBe(false);
    expect(demandDim.stars).not.toBeNull();
    expect(demandDim.stars).toBeGreaterThanOrEqual(2.5);

    // 需求市场维理由里包含抱怨证据与趋势信息
    const demandReasons = demandDim.reasons.join(" ");
    expect(demandReasons).toMatch(/Pain: 1 complaint/i);
    expect(demandReasons).toMatch(/Trend: up/i);

    // 收益维不再是“证据不足”
    expect(revenueDim.insufficient_evidence).toBe(false);
    expect(revenueDim.stars).not.toBeNull();

    // 收益维理由里包含对应证据 (real funnel)
    const revenueReasons = revenueDim.reasons.join(" ");
    expect(revenueReasons).toMatch(/Real funnel:/i);

    // 缺失证据列表中不再包含 demand 与 same-tier revenue
    expect(data.missing_evidence).not.toContain(
      "demand evidence (search volume, pain quotes, or peer revenue)",
    );
    expect(data.missing_evidence).not.toContain(
      "same-tier peer verified revenue",
    );
  });

  it("验收标准 2: 什么都不填提交（仅必填名和简介），总分仍按现有规则走，不报错", async () => {
    const rawPayload = {
      name: "Minimal Idea",
      description: "Just a blank idea without optional evidence",
    };

    const req = new Request("http://localhost:3000/api/v1/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rawPayload),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.overall.stars).toBeDefined();
    expect(typeof data.overall.stars).toBe("number");
    expect(data.overall.verdict).toBeDefined();

    // 未填证据时，需求市场和收益维保持证据不足规则
    const demandDim = data.dimensions.find(
      (d: { key: string }) => d.key === "market_demand",
    );
    const revenueDim = data.dimensions.find(
      (d: { key: string }) => d.key === "revenue",
    );
    expect(demandDim.insufficient_evidence).toBe(true);
    expect(revenueDim.insufficient_evidence).toBe(true);
  });

  it("只写“我觉得大家很痛”没有链接的，按证据不足处理", async () => {
    const rawPayload = {
      name: "No Link Pain Idea",
      description: "Testing pain quote without link",
      pain_evidence: [
        {
          kind: "抱怨",
          fact: "我觉得大家都很痛很需要这个工具，但是没有来源链接",
          // src 未填 / 空链接
        },
      ],
    };

    const parsed = scoreRequestSchema.parse(rawPayload);
    const product = requestToProduct(parsed);

    // 无链接项 src 保持 undefined，不发明假来源
    expect(product.pain_evidence?.[0]?.src).toBeUndefined();

    // 评分引擎检测到缺少 src，跳过计入有效证据
    const sc = score(product, "pre");
    expect(sc.dims["需求市场"].insuff).toBe(true);
    expect(sc.dims["需求市场"].why.join(" ")).toMatch(
      /no sourced user quotes \(insufficient evidence\)/i,
    );
  });

  it("支持陌生人付款三档（0 / 1–2 / 3+）及金额区间映射", () => {
    const t0 = requestToProduct(
      scoreRequestSchema.parse({
        name: "T0",
        description: "Test 0",
        payments: { stranger_count: "0" },
      }),
    );
    expect(t0.payments?.stranger_count).toBe(0);

    const t1 = requestToProduct(
      scoreRequestSchema.parse({
        name: "T1",
        description: "Test 1",
        payments: { stranger_count: "1-2", amount_range: "$19 - $49" },
      }),
    );
    expect(t1.payments?.stranger_count).toBe(1);
    expect(t1.payments?.note).toContain("$19 - $49");

    const t3 = requestToProduct(
      scoreRequestSchema.parse({
        name: "T3",
        description: "Test 3",
        payments: { stranger_count: "3+" },
      }),
    );
    expect(t3.payments?.stranger_count).toBe(3);
  });

  it("支持想法来源三选一（已有付费竞品的市场 / 自己痛点出发 / 两者都有）", () => {
    for (const source of ["已有付费竞品的市场", "自己痛点出发", "两者都有"] as const) {
      const parsed = scoreRequestSchema.parse({
        name: "Idea Source Test",
        description: "Testing idea source field",
        idea_source: source,
      });
      expect(parsed.idea_source).toBe(source);
    }
  });

  it("支持趋势方向（涨 / 平 / 跌）及来源", () => {
    const parsedUp = scoreRequestSchema.parse({
      name: "Trend Test",
      description: "Testing trend",
      trend: "涨",
      trend_src: "Google Trends",
    });
    const pUp = requestToProduct(parsedUp);
    expect(pUp.trend?.direction).toBe("涨");
    expect(pUp.trend?.src).toBe("Google Trends");

    const parsedFlat = scoreRequestSchema.parse({
      name: "Trend Test Flat",
      description: "Testing flat trend",
      trend: "flat",
    });
    const pFlat = requestToProduct(parsedFlat);
    expect(pFlat.trend?.direction).toBe("平");
  });
});
