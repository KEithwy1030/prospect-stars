import { withCors, preflight } from "@/lib/cors";
import { openApiDocument } from "@/lib/openapi";


export function OPTIONS(req: Request) {
  return preflight(req);
}

export function GET(req: Request) {
  return withCors(
    Response.json(openApiDocument, {
      headers: {
        "Cache-Control": "public, max-age=3600",
      },
    }),
    req,
  );
}
