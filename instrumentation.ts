import type { Instrumentation } from "next"

/**
 * Runs once per server start. Validating the server environment here makes a misconfigured
 * deployment fail at boot with a readable message instead of on the first checkout.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnvironment } = await import("./instrumentation-node")
    await validateEnvironment()
  }
}

/**
 * Server errors as one JSON line each (stdout is collected by the host; docs/DEPLOYMENT-RUNBOOK.md).
 * The digest matches the "Reference" shown on the error page, so a shopper's report can be traced.
 * Headers and bodies are not logged: they can carry cookies and personal data.
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const digest = typeof error === "object" && error !== null && "digest" in error ? String(error.digest) : undefined
  console.error(
    JSON.stringify({
      level: "error",
      at: new Date().toISOString(),
      message: error instanceof Error ? error.message : String(error),
      digest,
      method: request.method,
      path: request.path.split("?")[0],
      route: context.routePath,
      routeType: context.routeType,
    }),
  )
}
