import "server-only"

import { createHash, timingSafeEqual } from "node:crypto"

import { serverEnv } from "@/lib/env.server"
import { errorResponse } from "@/server/http/route"
import { enforceRateLimit } from "@/server/platform/guards"
import { DomainError } from "@/server/shared/errors"

export type ApiScope = "read" | "write"
export type ApiClient = { name: string; scopes: ApiScope[] }

/** API_KEYS="name:key:read+write,other:key2:read". Keys are compared as SHA-256 digests in constant time. */
function clients() {
  return serverEnv.API_KEYS.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [name, key, scopes = "read"] = entry.split(":")
      return { name, digest: createHash("sha256").update(key ?? "").digest(), scopes: scopes.split("+") as ApiScope[] }
    })
}

function authenticate(request: Request, scope: ApiScope): ApiClient {
  const key = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? request.headers.get("x-api-key") ?? ""
  const digest = createHash("sha256").update(key).digest()
  const client = key ? clients().find((item) => timingSafeEqual(item.digest, digest)) : undefined
  if (!client) throw new DomainError("unauthorized", "Missing or invalid API key.")
  if (!client.scopes.includes(scope)) throw new DomainError("forbidden", `This key lacks the "${scope}" scope.`)
  return { name: client.name, scopes: client.scopes }
}

/** Headless API handler: API-key auth with scopes, per-client rate limit, JSON errors. */
export function apiV1<Context = unknown>(scope: ApiScope, handler: (request: Request, client: ApiClient, context: Context) => Promise<Response>) {
  return async (request: Request, context: Context) => {
    try {
      const client = authenticate(request, scope)
      await enforceRateLimit("api", `client:${client.name}`)
      const response = await handler(request, client, context)
      response.headers.set("x-api-version", "1")
      if (!response.headers.has("cache-control")) response.headers.set("cache-control", "no-store")
      return response
    } catch (error) {
      return errorResponse(error)
    }
  }
}
