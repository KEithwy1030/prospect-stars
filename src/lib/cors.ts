const ALLOW_HEADERS = "Content-Type, Accept, Authorization";
const ALLOW_METHODS = "GET, POST, OPTIONS";

export function corsHeaders(origin?: string | null): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": ALLOW_METHODS,
    "Access-Control-Allow-Headers": ALLOW_HEADERS,
    "Access-Control-Max-Age": "86400",
    "Access-Control-Expose-Headers":
      "X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset",
  };
}

export function withCors(res: Response, req?: Request): Response {
  const headers = new Headers(res.headers);
  const origin = req?.headers.get("origin");
  for (const [k, v] of Object.entries(corsHeaders(origin))) {
    headers.set(k, v);
  }
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

export function preflight(req: Request): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(req.headers.get("origin")),
  });
}
