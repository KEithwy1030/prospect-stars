import { describe, it, expect } from "vitest";
import {
  scoreRequestSchema,
  requestToProduct,
  score,
  toPublicResponse,
} from "@/lib/scoring";
import { POST } from "@/app/api/v1/score/route";

describe("Follow-up Consent & Contact Schema and Scoring Invariance", () => {
  it("defaults consent_followup to false and contact to undefined when omitted", () => {
    const req = scoreRequestSchema.parse({
      name: "NoFollowupApp",
      description: "An app submitted without followup fields",
    });

    expect(req.consent_followup).toBe(false);
    expect(req.consent_followup_6m).toBe(false);
    expect(req.consent_followup_12m).toBe(false);
    expect(req.followup_intervals).toEqual([]);
    expect(req.followup_contact).toBeUndefined();

    const product = requestToProduct(req);
    const sc = score(product, "pre");
    const pub = toPublicResponse(req, product, sc);

    expect(pub.consent_followup).toBe(false);
    expect(pub.followup_contact).toBeNull();
    expect(pub.followup.consent).toBe(false);
    expect(pub.followup.contact).toBeNull();
  });

  it("handles explicit consent_followup: true with contact info", () => {
    const req = scoreRequestSchema.parse({
      name: "FollowupApp",
      description: "App with 6/12 month followup consent",
      consent_followup: true,
      followup_contact: "keith@example.com",
    });

    expect(req.consent_followup).toBe(true);
    expect(req.consent_followup_6m).toBe(true);
    expect(req.consent_followup_12m).toBe(true);
    expect(req.followup_intervals).toEqual(["6m", "12m"]);
    expect(req.followup_contact).toBe("keith@example.com");

    const product = requestToProduct(req);
    const sc = score(product, "pre");
    const pub = toPublicResponse(req, product, sc);

    expect(pub.consent_followup).toBe(true);
    expect(pub.followup_contact).toBe("keith@example.com");
    expect(pub.followup.consent).toBe(true);
    expect(pub.followup.contact).toBe("keith@example.com");
    expect(pub.followup_intervals).toEqual(["6m", "12m"]);
  });

  it("supports individual separate checkboxes for 6m and 12m intervals", () => {
    // 6m only
    const req6m = scoreRequestSchema.parse({
      name: "App6m",
      description: "Only agreed to 6 months",
      consent_followup_6m: true,
      followup_contact: "wechat:my_id",
    });
    expect(req6m.consent_followup).toBe(true);
    expect(req6m.consent_followup_6m).toBe(true);
    expect(req6m.consent_followup_12m).toBe(false);
    expect(req6m.followup_intervals).toEqual(["6m"]);
    expect(req6m.followup_contact).toBe("wechat:my_id");

    // 12m only
    const req12m = scoreRequestSchema.parse({
      name: "App12m",
      description: "Only agreed to 12 months",
      consent_followup_12m: true,
      followup_contact: "tg:@tester",
    });
    expect(req12m.consent_followup).toBe(true);
    expect(req12m.consent_followup_6m).toBe(false);
    expect(req12m.consent_followup_12m).toBe(true);
    expect(req12m.followup_intervals).toEqual(["12m"]);
    expect(req12m.followup_contact).toBe("tg:@tester");
  });

  it("supports object format and alias fields (followup_consent, contact, followup object)", () => {
    const req = scoreRequestSchema.parse({
      name: "AliasApp",
      description: "Using aliases",
      followup: {
        consent: true,
        consent_6m: true,
        contact: "founder@prospect.xyz",
      },
    });

    expect(req.consent_followup).toBe(true);
    expect(req.followup_contact).toBe("founder@prospect.xyz");
  });

  it("does not retain contact if consent_followup is false/withheld", () => {
    const req = scoreRequestSchema.parse({
      name: "NoConsentWithContact",
      description: "User filled contact but did not check follow-up consent",
      consent_followup: false,
      followup_contact: "should_not_retain@example.com",
    });

    expect(req.consent_followup).toBe(false);
    expect(req.followup_contact).toBeUndefined();

    const product = requestToProduct(req);
    const sc = score(product, "pre");
    const pub = toPublicResponse(req, product, sc);

    expect(pub.consent_followup).toBe(false);
    expect(pub.followup_contact).toBeNull();
  });

  it("strictly guarantees that scoring results are completely unaffected by followup consent or contact", () => {
    const basePayload = {
      name: "ScoringInvarianceApp",
      description: "Testing that scoring logic produces identical stars regardless of followup",
      price_usd: 29,
      keywords: ["test keyword"],
      has_audience: true,
      audience_size: 500,
      competitors: [{ name: "CompA", price_usd: 19 }],
      tech_parts: ["landing_page", "payments"],
      free_or_ai_substitute: "partial" as const,
    };

    const reqWithout = scoreRequestSchema.parse({
      ...basePayload,
      consent_followup: false,
    });
    const productWithout = requestToProduct(reqWithout);
    const scoreWithout = score(productWithout, "pre");
    const pubWithout = toPublicResponse(reqWithout, productWithout, scoreWithout);

    const reqWith = scoreRequestSchema.parse({
      ...basePayload,
      consent_followup: true,
      consent_followup_6m: true,
      consent_followup_12m: true,
      followup_contact: "hello@startup.io",
    });
    const productWith = requestToProduct(reqWith);
    const scoreWith = score(productWith, "pre");
    const pubWith = toPublicResponse(reqWith, productWith, scoreWith);

    expect(scoreWith.total).toBe(scoreWithout.total);
    expect(pubWith.overall.stars).toBe(pubWithout.overall.stars);
    expect(pubWith.overall.verdict).toBe(pubWithout.overall.verdict);
    expect(pubWith.dimensions).toEqual(pubWithout.dimensions);
    expect(pubWith.weakest_dimension).toEqual(pubWithout.weakest_dimension);
    expect(pubWith.caps_applied).toEqual(pubWithout.caps_applied);
  });
});

describe("API Route Follow-up Acceptance Criteria Tests", () => {
  it("验收用例1: 勾选回访并留联系方式提交一次，接口收到该字段且打分不受影响", async () => {
    const request = new Request("http://localhost/api/v1/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "AcceptedFollowupIdea",
        description: "Checking route receives followup consent and contact info",
        consent_followup: true,
        followup_contact: "founder@mytest.io",
      }),
    });

    const res = await POST(request);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.name).toBe("AcceptedFollowupIdea");
    expect(body.consent_followup).toBe(true);
    expect(body.followup_contact).toBe("founder@mytest.io");
    expect(body.followup.consent).toBe(true);
    expect(body.followup.contact).toBe("founder@mytest.io");
    expect(body.overall).toBeDefined();
    expect(typeof body.overall.stars).toBe("number");
  });

  it("验收用例2: 不勾选提交一次，接口里该字段为空且打分不受影响", async () => {
    const request = new Request("http://localhost/api/v1/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "AcceptedNoFollowupIdea",
        description: "Checking route when followup is not checked",
      }),
    });

    const res = await POST(request);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.name).toBe("AcceptedNoFollowupIdea");
    expect(body.consent_followup).toBe(false);
    expect(body.followup_contact).toBeNull();
    expect(body.followup.consent).toBe(false);
    expect(body.followup.contact).toBeNull();
    expect(body.overall).toBeDefined();
    expect(typeof body.overall.stars).toBe("number");
  });

  it("对比验证: 两种情况打分结果完全不受影响", async () => {
    const payload = {
      name: "ComparisonIdea",
      description: "Identical description for strict scoring comparison",
      price_usd: 15,
      expected_revenue_tier: "around_10k",
    };

    const resWith = await POST(
      new Request("http://localhost/api/v1/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          consent_followup: true,
          followup_contact: "contact@comparison.org",
        }),
      }),
    );
    const bodyWith = await resWith.json();

    const resWithout = await POST(
      new Request("http://localhost/api/v1/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          consent_followup: false,
        }),
      }),
    );
    const bodyWithout = await resWithout.json();

    expect(bodyWith.overall.stars).toBe(bodyWithout.overall.stars);
    expect(bodyWith.overall.verdict).toBe(bodyWithout.overall.verdict);
    expect(bodyWith.dimensions).toEqual(bodyWithout.dimensions);
    expect(bodyWith.weakest_dimension).toEqual(bodyWithout.weakest_dimension);
  });
});
