import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  requestToProduct,
  score,
  scoreRequestSchema,
  toPublicResponse,
  type Product,
} from "@/lib/scoring";

interface GoldenDim {
  star: number | null;
  insuff: boolean;
  brief: string;
  dist: number[] | null;
}

interface GoldenCase {
  product: Product;
  total: number;
  caps: string[];
  verdict: string;
  dims: Record<string, GoldenDim>;
}

const goldens = JSON.parse(
  readFileSync(join(__dirname, "goldens.json"), "utf8"),
) as Record<string, GoldenCase>;

describe("stars.py parity (half-star rounding)", () => {
  for (const [name, g] of Object.entries(goldens)) {
    it(`matches golden fixture: ${name}`, () => {
      const sc = score(g.product, "pre");
      expect(sc.total).toBe(g.total);
      for (const [dim, expected] of Object.entries(g.dims)) {
        const got = sc.dims[dim as keyof typeof sc.dims];
        expect(got.star, `${name}/${dim} star`).toBe(expected.star);
        expect(got.insuff, `${name}/${dim} insuff`).toBe(expected.insuff);
        if (expected.dist) {
          expect(got.dist).toBeTruthy();
          for (let i = 0; i < expected.dist.length; i++) {
            expect(got.dist![i]!).toBeCloseTo(expected.dist[i]!, 5);
          }
        } else {
          expect(got.dist == null || got.dist === undefined).toBe(true);
        }
      }
      // Cap count should match even if English wording differs
      expect(sc.caps.length).toBe(g.caps.length);
    });
  }
});

describe("public request mapping + response", () => {
  it("scores a thin form submission without inventing evidence", () => {
    const req = scoreRequestSchema.parse({
      name: "NoteClip",
      description: "Clipboard notes for freelancers.",
      price_usd: 12,
      free_or_ai_substitute: "partial",
      free_or_ai_why: "Notion templates cover some of this.",
      has_audience: false,
      tech_parts: ["landing_page", "payments"],
      build_note: "Simple Stripe checkout and a static marketing site.",
    });
    const product = requestToProduct(req);
    const sc = score(product, "pre");
    const pub = toPublicResponse(req, product, sc);
    expect(pub.api_version).toBe("v1");
    expect(pub.mode).toBe("pre_launch");
    expect(pub.overall.stars).toBeGreaterThanOrEqual(0);
    expect(pub.overall.stars).toBeLessThanOrEqual(5);
    expect(pub.overall.verdict.length).toBeGreaterThan(10);
    expect(pub.dimensions).toHaveLength(6);
    expect(pub.dimensions.map((d) => d.key)).toEqual([
      "promotion_difficulty",
      "technical_difficulty",
      "market_demand",
      "value",
      "price",
      "revenue",
    ]);
    // No peer prices → price insufficient; no demand evidence → demand insufficient
    const price = pub.dimensions.find((d) => d.key === "price")!;
    const demand = pub.dimensions.find((d) => d.key === "market_demand")!;
    expect(price.insufficient_evidence).toBe(true);
    expect(demand.insufficient_evidence).toBe(true);
    expect(pub.missing_evidence.length).toBeGreaterThan(0);
    expect(pub.disclaimer).toMatch(/\$1k\/year/);
  });

  it("applies distribution when audience size is provided", () => {
    const req = scoreRequestSchema.parse({
      name: "ListLaunch",
      description: "Launch checklist for indie SaaS.",
      price_usd: 29,
      has_audience: true,
      audience_size: 15000,
      audience_type: "email list",
      free_or_ai_substitute: "no",
      free_or_ai_why: "Needs structured launch playbooks tied to a list.",
      tech_parts: ["landing_page", "accounts", "payments"],
      build_note: "Auth + Stripe + checklist CMS.",
      competitors: [
        {
          name: "LaunchPeer",
          price_usd: 39,
          verified_annual_usd: 18000,
          tier: "peer",
        },
      ],
      low_cost_channels: [{ what: "Own email list", src: "user" }],
      keywords: [{ keyword: "saas launch checklist", volume: 900, allintitle: 30 }],
    });
    const product = requestToProduct(req);
    const sc = score(product, "pre");
    expect(sc.dims["推广难度"].star!).toBeGreaterThan(2);
    expect(sc.dims["收益"].star!).toBeGreaterThan(2);
    const pub = toPublicResponse(req, product, sc);
    expect(pub.magnitudes).not.toBeNull();
    expect(pub.magnitudes!.reduce((a, t) => a + t.probability, 0)).toBeCloseTo(1, 2);
  });

  it("rejects empty name", () => {
    expect(() =>
      scoreRequestSchema.parse({ name: "", description: "x" }),
    ).toThrow();
  });
});
