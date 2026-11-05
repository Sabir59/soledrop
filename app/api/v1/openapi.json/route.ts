import { openApiDocument } from "@/server/http/openapi"

/** Public: the API description itself carries no data. */
export function GET() {
  return Response.json(openApiDocument(), { headers: { "cache-control": "public, max-age=3600" } })
}
