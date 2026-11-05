import type { Metadata } from "next"
import Link from "next/link"

import { SiteFooter } from "@/components/shared/site-footer"
import { SiteHeader } from "@/components/shared/site-header"
import { StatusMessage, statusAction, statusActionAlt } from "@/components/shared/status-message"

export const metadata: Metadata = { title: "Page not found", robots: { index: false, follow: true } }

/** 404 for unknown URLs and for `notFound()` anywhere (sold-through products, retired pages). */
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1}>
        <StatusMessage
          code="404"
          title="This pair walked off"
          actions={
            <>
              <Link href="/new-arrivals" className={statusAction}>
                Shop new arrivals
              </Link>
              <Link href="/search" className={statusActionAlt}>
                Search the shop
              </Link>
            </>
          }
        >
          The page you&rsquo;re after doesn&rsquo;t exist or has moved. Pre-loved pairs are one of a kind, so a sold one disappears from the shop.
        </StatusMessage>
      </main>
      <SiteFooter />
    </>
  )
}
