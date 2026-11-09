import { ZodError } from "zod";
import { withCors, preflight } from "@/lib/cors";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import {
  requestToProduct,
  score,
  scoreRequestSchema,
  toPublicResponse,
} from "@/lib/scoring";
import { hostnameFromUrl, lookupTrancoRank } from "@/lib/tranco";
import { saveCalibrationSubmission } from "@/lib/storage/calibration";


export function OPTIONS(req: Request) {
  return preflight(req);
}

export async function POST(req: Request) {
  const rl = rateLimit(`score:${clientKey(req)}`, 30, 60_000);
  const rateHeaders = {
    "X-RateLimit-Limit": String(rl.limit),
    "X-RateLimit-Remaining": String(rl.remaining),
    "X-RateLimit-Reset": String(rl.reset),
  };

  if (!rl.ok) {
    return withCors(
      Response.json(
        {
          error: "rate_limited",
          message: "Too many score requests. Limit is 30 per minute per IP.",
        },
        { status: 429, headers: rateHeaders },
      ),
      req,
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return withCors(
      Response.json(
        { error: "invalid_json", message: "Request body must be JSON." },
        { status: 400, headers: rateHeaders },
      ),
      req,
    );
  }

  try {
    const parsed = scoreRequestSchema.parse(body);
    const product = requestToProduct(parsed);

    // Optional free Tranco enrichment for the user's own site URL
    if (parsed.lookup_tranco !== false && parsed.site_url) {
      const host = hostnameFromUrl(parsed.site_url);
      if (host) {
        const rank = await lookupTrancoRank(host);
        if (rank != null) {
          // Attach as a note on the product site; does not invent revenue.
          // Peers need explicit competitor entries for demand/traffic signals.
          product.status = `Tranco rank for ${host}: ~${rank.toLocaleString("en-US")}`;
        }
      }
    }

    // Also try Tranco for competitors missing ranks when lookup requested
    if (parsed.lookup_tranco && product.paid_comps?.length) {
      await Promise.all(
        product.paid_comps.map(async (c) => {
          if (c.tranco?.rank || !c.name) return;
          // Only look up if name looks like a hostname
          if (!c.name.includes(".")) return;
          const rank = await lookupTrancoRank(c.name);
          if (rank != null) {
            c.tranco = {
              rank,
              date: new Date().toISOString().slice(0, 10),
              src: "https://tranco-list.eu/",
            };
          }
        }),
      );
    }

    const sc = score(product, "pre");

    // Only save submission content for model calibration when explicitly consented.
    // When consent_calibration is false, submissions are never saved or added to calibration pools.
    if (parsed.consent_calibration) {
      await saveCalibrationSubmission(parsed, sc);
    }

    const result = toPublicResponse(parsed, product, sc);
    return withCors(
      Response.json(result, { status: 200, headers: rateHeaders }),
      req,
    );
  } catch (err) {
    if (err instanceof ZodError) {
      return withCors(
        Response.json(
          {
            error: "validation_error",
            message: "Invalid score request.",
            details: err.issues.map((i) => ({
              path: i.path.join("."),
              message: i.message,
            })),
          },
          { status: 400, headers: rateHeaders },
        ),
        req,
      );
    }
    console.error(err);
    return withCors(
      Response.json(
        { error: "server_error", message: "Unexpected scoring error." },
        { status: 500, headers: rateHeaders },
      ),
      req,
    );
  }
}
