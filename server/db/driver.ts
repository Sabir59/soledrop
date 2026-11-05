import "server-only"

import { serverEnv } from "@/lib/env.server"

export type DataDriver = "fixtures" | "supabase"

/** Active data driver (DATA_DRIVER). Each domain's index.ts picks its repository from this. */
export function dataDriver(): DataDriver {
  return serverEnv.DATA_DRIVER
}

/** The store this deployment serves (multi-store: one store per deployment, data scoped by store_id). */
export function currentStoreId(): string {
  return serverEnv.STORE_ID
}

/** Picks the repository implementation for the active driver, creating it once. */
export function selectRepository<T>(implementations: { fixtures: () => T; supabase: () => T }): () => T {
  let instance: T | undefined
  return () => {
    instance ??= implementations[dataDriver()]()
    return instance
  }
}
