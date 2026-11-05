import "server-only"

import { catalog } from "@/server/catalog"
import { createProductTransfer } from "@/server/import-export/products"
import { inventory } from "@/server/inventory"
import { pricing } from "@/server/pricing"

export const productTransfer = () => createProductTransfer({ catalog: catalog(), pricing: pricing(), inventory: inventory() })

export { PRODUCT_COLUMNS, type ImportReport } from "@/server/import-export/products"
