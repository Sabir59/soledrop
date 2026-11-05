"use client"

import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react"

import {
  initialPreferences,
  normalize,
  PREFERENCES_KEY,
  preferencesReducer,
  type PreferencesAction,
  type PreferencesState,
} from "@/context/preferences-reducer"

type PreferencesValue = { state: PreferencesState; dispatch: (action: PreferencesAction) => void }

const PreferencesContext = createContext<PreferencesValue | null>(null)

function readStored(): string | null {
  try {
    return window.localStorage.getItem(PREFERENCES_KEY)
  } catch {
    return null
  }
}

function parse(raw: string | null): PreferencesState {
  try {
    return raw ? normalize(JSON.parse(raw)) : initialPreferences
  } catch {
    return initialPreferences
  }
}

/**
 * The one persisted client context (localStorage, versioned key). Server render and first paint use
 * the empty state, then storage is read, so markup never mismatches. Writes are queued to the next
 * task and coalesced, and skipped when storage already holds the same state; other tabs' writes
 * arrive through the storage event.
 */
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(preferencesReducer, initialPreferences)

  useEffect(() => {
    dispatch({ type: "hydrate", state: parse(readStored()) })
    const onStorage = (event: StorageEvent) => {
      if (event.key === PREFERENCES_KEY) dispatch({ type: "hydrate", state: parse(event.newValue) })
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  useEffect(() => {
    // The untouched initial object means "not read from storage yet": writing it would wipe what is stored.
    if (state === initialPreferences) return
    const handle = window.setTimeout(() => {
      const next = JSON.stringify(state)
      if (readStored() === next) return
      try {
        window.localStorage.setItem(PREFERENCES_KEY, next)
      } catch {
        // Storage full or blocked (private mode): preferences stay in memory for this visit.
      }
    }, 0)
    return () => window.clearTimeout(handle)
  }, [state])

  const value = useMemo(() => ({ state, dispatch }), [state])
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}

export function usePreferences(): PreferencesValue {
  const value = useContext(PreferencesContext)
  if (!value) throw new Error("usePreferences must be used inside PreferencesProvider")
  return value
}
