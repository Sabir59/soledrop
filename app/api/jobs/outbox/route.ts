import { job } from "@/server/http/jobs"
import { drainOutbox } from "@/server/platform/events"

/** Every minute: deliver pending emails and webhooks with retry/backoff. */
export const POST = job(() => drainOutbox())
