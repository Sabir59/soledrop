import { job } from "@/server/http/jobs"
import { inventory } from "@/server/inventory"

/** Every 5 minutes: return expired checkout holds to available stock. */
export const POST = job(async () => ({ released: await inventory().releaseExpired() }))
