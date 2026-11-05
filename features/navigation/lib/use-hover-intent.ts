"use client"

import { useCallback, useEffect, useRef } from "react"

/**
 * Delayed open/close for pointer hover: a pass across the nav on the way to something else never
 * opens a panel, and a short trip outside it on the way into the panel never closes it.
 */
export function useHoverIntent({ openDelay, closeDelay }: { openDelay: number; closeDelay: number }) {
  const timer = useRef<number | null>(null)

  const cancel = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = null
  }, [])

  const schedule = useCallback(
    (kind: "open" | "close", action: () => void) => {
      cancel()
      timer.current = window.setTimeout(() => {
        timer.current = null
        action()
      }, kind === "open" ? openDelay : closeDelay)
    },
    [cancel, openDelay, closeDelay],
  )

  useEffect(() => cancel, [cancel])

  return { schedule, cancel }
}
