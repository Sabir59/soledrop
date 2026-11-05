import "server-only"

import { selectRepository } from "@/server/db/driver"
import { createFixturesSearchRepository } from "@/server/search/fixtures.repository"
import { createSearchService } from "@/server/search/service"
import { createSupabaseSearchRepository } from "@/server/search/supabase.repository"

const repository = selectRepository({ fixtures: createFixturesSearchRepository, supabase: createSupabaseSearchRepository })

export const searchService = () => createSearchService({ search: repository() })

export type * from "@/server/search/types"
