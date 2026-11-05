import type { ContactMessage, Faq, NewsletterSubscriber, Page } from "@/server/content/types"

export interface ContentRepository {
  listPages(storeId: string): Promise<Page[]>
  getPage(storeId: string, slug: string): Promise<Page | null>
  listFaqs(storeId: string): Promise<Faq[]>
  /** Upsert by email; returns true when the address is newly subscribed. */
  subscribe(storeId: string, subscriber: NewsletterSubscriber): Promise<boolean>
  unsubscribe(storeId: string, email: string): Promise<void>
  saveContactMessage(storeId: string, message: ContactMessage): Promise<void>
}
