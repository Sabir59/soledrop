import { dataDriver } from "@/server/db/driver"
import { platform } from "@/server/platform"

/** Readiness: the data store answers. Load balancers stop routing here when this is 503. */
export async function GET() {
  const started = performance.now()
  let database = false
  try {
    database = await platform().ping()
  } catch {
    database = false
  }
  const body = { status: database ? "ready" : "unavailable", driver: dataDriver(), checks: { database }, latencyMs: Math.round(performance.now() - started) }
  return Response.json(body, { status: database ? 200 : 503, headers: { "cache-control": "no-store" } })
}
