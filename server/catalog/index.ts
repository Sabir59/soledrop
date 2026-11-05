import "server-only"

import { createFixturesCatalogRepository } from "@/server/catalog/fixtures.repository"
import { createCatalogService } from "@/server/catalog/service"
import { createSupabaseCatalogRepository } from "@/server/catalog/supabase.repository"
import { selectRepository } from "@/server/db/driver"
import { inventory } from "@/server/inventory"
import { pricing } from "@/server/pricing"
import { searchService } from "@/server/search"

const repository = selectRepository({ fixtures: createFixturesCatalogRepository, supabase: createSupabaseCatalogRepository })

export const catalog = () =>
  createCatalogService({ catalog: repository(), pricing: pricing(), inventory: inventory(), synonyms: (storeId) => searchService().synonymMap(storeId) })
export type * from "@/server/catalog/types"
