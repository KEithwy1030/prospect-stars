import { withCors, preflight } from "@/lib/cors";


export function OPTIONS(req: Request) {
  return preflight(req);
}

export function GET(req: Request) {
  return withCors(
    Response.json({
      ok: true,
      service: "prospect-stars",
      api_version: "v1",
      time: new Date().toISOString(),
    }),
    req,
  );
}
