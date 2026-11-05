"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useId, useTransition } from "react"

import { listingHref, type ListingState } from "@/features/catalog/lib/listing-url"
import { SORT_OPTIONS } from "@/features/catalog/schemas/query"
import { cn } from "@/lib/utils"

export type ListingView = "grid" | "list"

function GridGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5 fill-current">
      <path d="M0 0h8.5v8.5H0zM11.5 0H20v8.5h-8.5zM0 11.5h8.5V20H0zM11.5 11.5H20V20h-8.5z" />
    </svg>
  )
}

function ListGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 14 14" className="h-3.5 w-3.5 fill-current">
      <path d="M0 0h14v2.5H0zM0 5.75h14v2.5H0zM0 11.5h14V14H0z" />
    </svg>
  )
}

/** Sort ("Featured") and the grid/list switch above the product grid (Frame 138 + image 153). */
export function ListingToolbar({ pathname, state, view, className }: { pathname: string; state: ListingState; view: ListingView; className?: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const sortId = useId()
  const sort = state.sort?.[0] ?? "featured"

  const views = [
    { value: "grid" as const, label: "Grid view", Glyph: GridGlyph },
    { value: "list" as const, label: "List view", Glyph: ListGlyph },
  ]

  return (
    <div className={cn("flex items-start justify-end gap-5.75 3xl:pe-3.75", className)} aria-busy={pending}>
      <label htmlFor={sortId} className="sr-only">
        Sort by
      </label>
      <select
        id={sortId}
        value={sort}
        onChange={(event) =>
          startTransition(() => router.push(listingHref(pathname, state, { sort: event.target.value === "featured" ? null : event.target.value }), { scroll: false }))
        }
        className="h-14 w-full max-w-75 cursor-pointer appearance-none bg-background ps-5.5 pe-5.5 text-18 font-semibold md:h-18 md:text-24"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <div className="flex pt-0 md:pt-2.75">
        <ul aria-label="Layout" className="flex h-13.5 border border-border-subtle bg-background">
          {views.map(({ value, label, Glyph }) => {
            const current = view === value
            return (
              <li key={value} className="flex">
                <Link
                  href={listingHref(pathname, state, { view: value === "grid" ? null : value, page: state.page ?? null })}
                  scroll={false}
                  replace
                  aria-label={label}
                  aria-current={current ? "true" : undefined}
                  className={cn(
                    "flex w-12.75 items-center justify-center transition-colors",
                    current ? "bg-ink-control text-background" : "text-faint-foreground hover:text-foreground",
                  )}
                >
                  <Glyph />
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
