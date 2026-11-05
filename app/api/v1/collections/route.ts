import { catalog } from "@/server/catalog"
import { currentStoreId } from "@/server/db/driver"
import { apiV1 } from "@/server/http/api-v1"

export const GET = apiV1("read", async () => Response.json({ collections: await catalog().collections(currentStoreId()) }))
