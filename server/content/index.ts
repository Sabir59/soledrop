import "server-only"

import { serverEnv } from "@/lib/env.server"
import { createFixturesContentRepository } from "@/server/content/fixtures.repository"
import { createContentService } from "@/server/content/service"
import { createSupabaseContentRepository } from "@/server/content/supabase.repository"
import { selectRepository } from "@/server/db/driver"
import { publish } from "@/server/platform/events"

const repository = selectRepository({ fixtures: createFixturesContentRepository, supabase: createSupabaseContentRepository })

export const contentService = () => createContentService({ content: repository(), publish, secret: serverEnv.SESSION_SECRET })

export type * from "@/server/content/types"
