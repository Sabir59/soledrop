"use client"

import Link from "next/link"
import { useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type ArrivalsTabId = "new" | "preloved"

export type ArrivalsTab = {
  id: ArrivalsTabId
  label: string
  /** "brand-new" / "pre-loved", used in the status line ("Showing 8 of 24 brand-new pairs"). */
  noun: string
  /** Every arrival of this kind; `cards` holds the newest of them, rendered on the server. */
  total: number
  cards: ReactNode[]
  /** The full listing, offered once every loaded card is showing and more exist. */
  seeAllHref: string
}

/** 12 fills whole rows at every column count the grid uses (1, 2, 3 and 4). */
export const ARRIVALS_STEP = 12

const PATHNAME = "/new-arrivals"

const tabHref = (id: ArrivalsTabId, shown = ARRIVALS_STEP) => {
  const params = new URLSearchParams()
  if (id !== "new") params.set("tab", id)
  if (shown > ARRIVALS_STEP) params.set("show", String(shown))
  const query = params.toString()
  return query ? `${PATHNAME}?${query}` : PATHNAME
}

/** A plain click (no new-tab modifier) that this component handles in place of following the link. */
const isPlainClick = (event: MouseEvent) => event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey

/**
 * Brand New / Pre-Loved on the New Arrivals page (D-052). The tabs swap the grid in place and keep
 * the URL in step (`?tab=preloved`) without a navigation, so a refresh or a shared link opens the
 * same tab. Without JavaScript the tabs and LOAD MORE are ordinary links the server answers.
 * Arrow keys, Home and End move between the tabs (automatic activation).
 */
export function ArrivalsTabs({ tabs, initialTab, initialShown }: { tabs: ArrivalsTab[]; initialTab: ArrivalsTabId; initialShown: number }) {
  const [active, setActive] = useState(initialTab)
  const [shown, setShown] = useState<Record<ArrivalsTabId, number>>({
    new: initialTab === "new" ? initialShown : ARRIVALS_STEP,
    preloved: initialTab === "preloved" ? initialShown : ARRIVALS_STEP,
  })
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const grids = useRef<Partial<Record<ArrivalsTabId, HTMLUListElement | null>>>({})

  const sync = (id: ArrivalsTabId, count: number) => window.history.replaceState(window.history.state, "", tabHref(id, count))

  const select = (id: ArrivalsTabId) => {
    setActive(id)
    sync(id, shown[id])
  }

  const onTabKeyDown = (event: KeyboardEvent<HTMLAnchorElement>, index: number) => {
    const last = tabs.length - 1
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl"
    const step = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 }[event.key as "ArrowRight" | "ArrowLeft"]
    const next = event.key === "Home" ? 0 : event.key === "End" ? last : step === undefined ? null : (index + step + tabs.length) % tabs.length
    if (next === null) return
    event.preventDefault()
    const tab = tabs[next]
    if (!tab) return
    tabRefs.current[next]?.focus()
    select(tab.id)
  }

  const loadMore = (tab: ArrivalsTab) => {
    const from = shown[tab.id]
    const count = Math.min(from + ARRIVALS_STEP, tab.cards.length)
    setShown((current) => ({ ...current, [tab.id]: count }))
    sync(tab.id, count)
    // Focus moves to the first pair just revealed, so keyboard users continue where the new cards start.
    requestAnimationFrame(() => {
      grids.current[tab.id]?.children[from]?.querySelector<HTMLAnchorElement>("a:not([tabindex='-1'])")?.focus()
    })
  }

  return (
    <div className="flex flex-col gap-6 md:gap-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div role="tablist" aria-label="New arrivals" className="flex rounded-full border-2 border-border bg-background p-1.5 md:self-start">
          {tabs.map((tab, index) => {
            const selected = tab.id === active
            return (
              <a
                key={tab.id}
                ref={(node) => {
                  tabRefs.current[index] = node
                }}
                id={`arrivals-tab-${tab.id}`}
                href={tabHref(tab.id, shown[tab.id])}
                role="tab"
                aria-selected={selected}
                aria-controls={`arrivals-panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={(event) => {
                  if (!isPlainClick(event)) return
                  event.preventDefault()
                  select(tab.id)
                }}
                onKeyDown={(event) => onTabKeyDown(event, index)}
                className={cn(
                  "flex min-h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-full px-3 text-16 font-bold whitespace-nowrap transition-colors md:min-w-50 md:flex-none md:gap-3 md:px-6 md:text-20",
                  selected ? "bg-foreground text-background" : "text-subtle-foreground hover:text-foreground",
                )}
              >
                {`${tab.label} `}
                <span
                  className={cn(
                    "flex h-7 min-w-9 items-center justify-center rounded-full px-2 text-14 font-bold tabular-nums",
                    selected ? "bg-brand text-brand-foreground" : "bg-well text-subtle-foreground",
                  )}
                >
                  {tab.total}
                  <span className="sr-only"> pairs</span>
                </span>
              </a>
            )
          })}
        </div>
        {tabs.map((tab) =>
          tab.id === active ? (
            <p key={tab.id} className="text-16 font-medium text-subtle-foreground md:text-18">
              {tab.total === 0 ? `No ${tab.noun} pairs yet` : `Showing ${Math.min(shown[tab.id], tab.cards.length)} of ${tab.total} ${tab.noun} pairs`}
              <span aria-hidden="true"> · </span>
              <span className="sr-only">, </span>
              Newest first
            </p>
          ) : null,
        )}
      </div>

      {tabs.map((tab) => {
        const visible = Math.min(shown[tab.id], tab.cards.length)
        const more = visible < tab.cards.length
        return (
          <div key={tab.id} id={`arrivals-panel-${tab.id}`} role="tabpanel" aria-labelledby={`arrivals-tab-${tab.id}`} hidden={tab.id !== active} className="flex flex-col gap-10 md:gap-14">
            {tab.cards.length === 0 ? (
              <div className="flex flex-col items-start gap-6 rounded-xl border-2 border-border bg-background p-8 md:p-12">
                <p className="text-28 font-extrabold uppercase md:text-40">Nothing new just yet</p>
                <p className="max-w-130 text-18 text-subtle-foreground">New {tab.noun} pairs land every week. Check back soon, or browse everything in stock.</p>
                <Link href={tab.seeAllHref} className={cn(buttonVariants({ tone: "ink-light", size: "md" }), "rounded-md")}>
                  Browse {tab.label}
                </Link>
              </div>
            ) : (
              <>
                <ul
                  ref={(node) => {
                    grids.current[tab.id] = node
                  }}
                  className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3 2xl:grid-cols-4 3xl:gap-8.5"
                >
                  {tab.cards.slice(0, visible).map((card, index) => (
                    <li key={index}>{card}</li>
                  ))}
                </ul>
                <div className="flex flex-col items-center gap-5">
                  <p aria-live="polite" className="text-16 text-subtle-foreground">
                    You&apos;ve seen {visible} of {tab.total} {tab.noun} pairs
                  </p>
                  {more ? (
                    <a
                      href={tabHref(tab.id, visible + ARRIVALS_STEP)}
                      onClick={(event) => {
                        if (!isPlainClick(event)) return
                        event.preventDefault()
                        loadMore(tab)
                      }}
                      className={cn(buttonVariants({ tone: "ink-light", size: "md" }), "w-full rounded-md sm:w-80")}
                    >
                      Load more
                    </a>
                  ) : tab.total > visible ? (
                    <Link href={tab.seeAllHref} className={cn(buttonVariants({ tone: "ink-light", size: "md" }), "w-full rounded-md sm:w-80")}>
                      See all {tab.label}
                    </Link>
                  ) : null}
                </div>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
