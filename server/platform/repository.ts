import type { AuditEntry, EventTopic, FeatureFlag, OutboxEvent, WebhookDelivery } from "@/server/platform/types"

export interface PlatformRepository {
  listFlags(storeId: string): Promise<FeatureFlag[]>
  enqueue(storeId: string, topic: EventTopic, payload: Record<string, unknown>): Promise<OutboxEvent>
  /** Claims up to `limit` due events (status pending, available_at ≤ now) for delivery. */
  claimDue(limit: number): Promise<OutboxEvent[]>
  markDelivered(id: string): Promise<void>
  /** Exponential backoff; after `maxAttempts` the event is parked as failed. */
  markFailed(id: string, error: string, maxAttempts: number): Promise<void>
  recordDelivery(delivery: WebhookDelivery): Promise<void>
  audit(entry: Omit<AuditEntry, "id" | "at">): Promise<void>
  listAudit(entity: string, entityId: string): Promise<AuditEntry[]>
  /** Fixed-window counter; returns the count after incrementing. */
  hit(key: string, windowSeconds: number): Promise<number>
  getIdempotent(key: string): Promise<{ status: number; body: unknown } | null>
  saveIdempotent(key: string, status: number, body: unknown): Promise<void>
  ping(): Promise<boolean>
}
