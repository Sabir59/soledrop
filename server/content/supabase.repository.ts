import "server-only"

import type { ContentRepository } from "@/server/content/repository"
import type { Faq, Page } from "@/server/content/types"
import { supabase, unwrap } from "@/server/db/supabase"

type PageRecord = { slug: string; title: string; description: string; blocks: Page["blocks"]; updated_at: string; seo: Page["seo"] }
const toPage = (row: PageRecord): Page => ({ slug: row.slug, title: row.title, description: row.description, blocks: row.blocks, updatedAt: row.updated_at, seo: row.seo })

export function createSupabaseContentRepository(): ContentRepository {
  return {
    async listPages(storeId) {
      const rows = unwrap(await supabase().from("pages").select("*").eq("store_id", storeId).eq("published", true)) as PageRecord[]
      return rows.map(toPage)
    },
    async getPage(storeId, slug) {
      const row = unwrap(await supabase().from("pages").select("*").eq("store_id", storeId).eq("slug", slug).eq("published", true).maybeSingle()) as PageRecord | null
      return row ? toPage(row) : null
    },
    async listFaqs(storeId) {
      return unwrap(await supabase().from("faqs").select("id, category, question, answer, position").eq("store_id", storeId).order("position")) as Faq[]
    },
    async subscribe(storeId, subscriber) {
      return unwrap(
        await supabase().rpc("subscribe_newsletter", { p_store_id: storeId, p_email: subscriber.email, p_source: subscriber.source }),
      ) as boolean
    },
    async unsubscribe(storeId, email) {
      unwrap(await supabase().from("newsletter_subscribers").update({ status: "unsubscribed" }).eq("store_id", storeId).eq("email", email))
    },
    async saveContactMessage(storeId, message) {
      unwrap(
        await supabase().from("contact_messages").insert({
          id: message.id,
          store_id: storeId,
          name: message.name,
          email: message.email,
          order_number: message.orderNumber,
          message: message.message,
        }),
      )
    },
  }
}
