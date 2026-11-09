/**
 * Lightweight in-memory rate limiter for serverless / single-instance use.
 * Good enough for v1 free public scoring; not a global distributed limiter.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export function rateLimit(
  key: string,
  limit = 30,
  windowMs = 60_000,
): RateLimitResult {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  b.count += 1;
  // Opportunistic cleanup
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (now >= v.resetAt) buckets.delete(k);
    }
  }
  return {
    ok: b.count <= limit,
    limit,
    remaining: Math.max(0, limit - b.count),
    reset: Math.ceil(b.resetAt / 1000),
  };
}

export function clientKey(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]!.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "anonymous";
}
