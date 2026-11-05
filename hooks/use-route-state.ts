"use client"

import { usePathname } from "next/navigation"
import { useCallback, useState } from "react"

/**
 * State that belongs to the page it was set on: after a navigation it reads as `initial` again,
 * so menus and panels close on route change without an effect.
 */
export function useRouteState<T>(initial: T): readonly [T, (next: T) => void] {
  const pathname = usePathname()
  const [state, setState] = useState({ pathname, value: initial })
  const value = state.pathname === pathname ? state.value : initial
  const set = useCallback((next: T) => setState({ pathname, value: next }), [pathname])
  return [value, set] as const
}
