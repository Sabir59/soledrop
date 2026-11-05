"use client"

import "./globals.css"
import { StatusMessage, statusAction } from "@/components/shared/status-message"
import { siteConfig } from "@/lib/site"

/** Last-resort boundary when the root layout itself fails: its own document, no providers. */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null
  return (
    <html lang={siteConfig.locale} dir={siteConfig.dir} className="antialiased">
      <body>
        <title>{`Something went wrong · ${siteConfig.name}`}</title>
        <main id="main">
          <StatusMessage
            code="500"
            title="Something went wrong"
            actions={
              <button type="button" onClick={() => retry()} className={statusAction}>
                Try again
              </button>
            }
          >
            <p>The shop didn&rsquo;t load. Please try again in a moment.</p>
            {digest ? <p className="pt-2 text-16">Reference: {digest}</p> : null}
          </StatusMessage>
        </main>
      </body>
    </html>
  )
}
