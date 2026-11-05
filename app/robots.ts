import type { MetadataRoute } from "next"

import { siteConfig } from "@/lib/site"

/** Crawl the shop; keep personal and transactional paths (and the API) out of search. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/cart", "/checkout", "/account", "/orders/", "/search", "/newsletter/"] },
    sitemap: new URL("/sitemap.xml", siteConfig.url).toString(),
    host: siteConfig.url,
  }
}
