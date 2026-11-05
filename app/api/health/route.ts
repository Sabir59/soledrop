/** Liveness: the process is up. No dependencies are checked here (see /api/ready). */
export function GET() {
  return Response.json({ status: "ok", time: new Date().toISOString() }, { headers: { "cache-control": "no-store" } })
}
