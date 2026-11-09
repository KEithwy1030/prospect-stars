import { describe, expect, it } from "vitest";
import {
  requestToProduct,
  score,
  scoreRequestSchema,
  toPublicResponse,
} from "@/lib/scoring";
import { saveCalibrationSubmission } from "@/lib/storage/calibration";
import { POST } from "@/app/api/v1/score/route";
import fs from "node:fs";
import path from "node:path";

describe("Calibration Consent & Policy Contract", () => {
  it("defaults consent_calibration to false when omitted", () => {
    const req = scoreRequestSchema.parse({
      name: "DefaultIdea",
      description: "Idea without explicit calibration consent",
    });
    expect(req.consent_calibration).toBe(false);

    const product = requestToProduct(req);
    const sc = score(product, "pre");
    const pub = toPublicResponse(req, product, sc);

    expect(pub.consent_calibration).toBe(false);
    expect(pub.overall.stars).toBeGreaterThanOrEqual(0);
  });

  it("preserves explicit consent_calibration: false", () => {
    const req = scoreRequestSchema.parse({
      name: "NoConsentIdea",
      description: "Idea with explicit false consent",
      consent_calibration: false,
    });
    expect(req.consent_calibration).toBe(false);

    const product = requestToProduct(req);
    const sc = score(product, "pre");
    const pub = toPublicResponse(req, product, sc);

    expect(pub.consent_calibration).toBe(false);
  });

  it("handles explicit consent_calibration: true and saves calibration record", async () => {
    const req = scoreRequestSchema.parse({
      name: "ConsentedIdea",
      description: "Idea with explicit consent for model calibration",
      consent_calibration: true,
      price_usd: 19,
    });
    expect(req.consent_calibration).toBe(true);

    const product = requestToProduct(req);
    const sc = score(product, "pre");
    const pub = toPublicResponse(req, product, sc);

    expect(pub.consent_calibration).toBe(true);
    expect(pub.overall.stars).toBeGreaterThanOrEqual(0);

    const id = await saveCalibrationSubmission(req, sc);
    expect(id).toMatch(/^cal_/);

    const logFile = path.resolve(process.cwd(), "data", "calibration-submissions.jsonl");
    expect(fs.existsSync(logFile)).toBe(true);
    const content = fs.readFileSync(logFile, "utf8");
    expect(content).toContain(id);
    expect(content).toContain("ConsentedIdea");
    expect(content).toContain('"consent_calibration":true');
  });

  it("supports alias allow_calibration for compatibility", () => {
    const req = scoreRequestSchema.parse({
      name: "AliasIdea",
      description: "Idea using allow_calibration alias",
      allow_calibration: true,
    });
    expect(req.consent_calibration).toBe(true);
  });

  it("API route: correctly accepts consent_calibration=false and returns valid score", async () => {
    const request = new Request("http://localhost/api/v1/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "ApiNoConsent",
        description: "Checking route behavior with consent false",
        consent_calibration: false,
      }),
    });

    const res = await POST(request);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("ApiNoConsent");
    expect(body.consent_calibration).toBe(false);
    expect(body.overall).toBeDefined();
    expect(typeof body.overall.stars).toBe("number");
  });

  it("API route: correctly accepts consent_calibration=true and returns valid score", async () => {
    const request = new Request("http://localhost/api/v1/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "ApiWithConsent",
        description: "Checking route behavior with consent true",
        consent_calibration: true,
      }),
    });

    const res = await POST(request);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("ApiWithConsent");
    expect(body.consent_calibration).toBe(true);
    expect(body.overall).toBeDefined();
    expect(typeof body.overall.stars).toBe("number");
  });
});
