import { cartService } from "@/server/cart"
import { job } from "@/server/http/jobs"

const ABANDONED_AFTER_DAYS = 30

/** Daily: delete guest carts untouched for 30 days (data minimisation). */
export const POST = job(async () => ({ purged: await cartService().purgeAbandoned(ABANDONED_AFTER_DAYS) }))
