"use client"

import Link from "next/link"
import { useEffect } from "react"

import { StatusMessage, statusAction, statusActionAlt } from "@/components/shared/status-message"

/**
 * Error boundary body shared by the route groups (so the header and footer stay). Server errors
 * reach the browser as a digest only; the digest is shown so support can find the log line.
 */
export function RouteError({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <StatusMessage
      code="500"
      title="Something went wrong"
      actions={
        <>
          <button type="button" onClick={() => retry()} className={statusAction}>
            Try again
          </button>
          <Link href="/contact" className={statusActionAlt}>
            Contact us
          </Link>
        </>
      }
    >
      <p>We couldn&rsquo;t load this page. Your bag is safe — try again in a moment.</p>
      {digest ? <p className="pt-2 text-16">Reference: {digest}</p> : null}
    </StatusMessage>
  )
}
