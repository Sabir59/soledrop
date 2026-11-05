"use client"

import { Dialog } from "@base-ui/react/dialog"
import { ArrowRightIcon, XIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useId, useRef, useState, useSyncExternalStore, type FormEvent, type KeyboardEvent, type ReactNode } from "react"

import { SearchIcon } from "@/components/icons"
import { Container } from "@/components/shared/container"
import { popularCollections } from "@/content/navigation"
import { usePreferences } from "@/context/PreferencesContext"
import { MiniProduct } from "@/features/catalog/components/mini-product"
import { highlight } from "@/features/search/lib/highlight"
import type { SuggestProduct, SuggestResponse } from "@/features/search/types"
import { useSearchEvents, useSuggest } from "@/hooks/api/search/queries"
import { useRouteState } from "@/hooks/use-route-state"
import { cn } from "@/lib/utils"

const DEBOUNCE_MS = 150
const MIN_QUERY = 2

const heading = "text-14 font-extrabold tracking-wide-2 text-faint-foreground uppercase"
const textOption = "flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-start text-16 font-semibold transition-colors hover:bg-surface aria-selected:bg-surface aria-selected:outline-2 aria-selected:outline-foreground"
const tileOption = "rounded-xl p-1.5 hover:bg-surface aria-selected:bg-surface aria-selected:outline-2 aria-selected:outline-foreground"
const productGrid = "grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 xl:grid-cols-4"
const productSizes = "(min-width: 1920px) 300px, (min-width: 1280px) 18vw, (min-width: 640px) 30vw, 45vw"

function useDebounced(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])
  return debounced
}

function subscribeOnline(onChange: () => void) {
  window.addEventListener("online", onChange)
  window.addEventListener("offline", onChange)
  return () => {
    window.removeEventListener("online", onChange)
    window.removeEventListener("offline", onChange)
  }
}

/** Collects the panel's options in render order so Arrow keys, Enter and aria-activedescendant agree. */
function createOptionRegistry(listboxId: string, active: number) {
  let count = 0
  return {
    next() {
      const index = count++
      return { id: `${listboxId}-option-${index}`, role: "option", "aria-selected": index === active, tabIndex: -1 }
    },
    get count() {
      return count
    },
  }
}

/**
 * Header search (derived, D-041): an APG combobox in a dialog — a sheet with Cancel on mobile, a
 * container-wide panel over a dimmed page on desktop. Before typing: recent searches (clearable),
 * trending searches, popular collections and recently viewed pairs. While typing (150 ms
 * debounce, previous request aborted, each query cached): highlighted suggestions, collections
 * and brands beside up to eight products, then "View all N results". No results: did you mean,
 * trending searches and popular pairs. Enter opens /search?q=, which works without JavaScript.
 */
export function SearchOverlay({ className }: { className: string }) {
  const [open, setOpen] = useRouteState(false)
  const [input, setInput] = useState("")
  const [cursor, setCursor] = useState<{ query: string; data: SuggestResponse | undefined; index: number }>({ query: "", data: undefined, index: -1 })
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true)
  const inputRef = useRef<HTMLInputElement>(null)
  const listboxId = useId()
  const router = useRouter()
  const { state: preferences, dispatch } = usePreferences()
  const events = useSearchEvents()
  const logged = useRef(new Set<string>())

  const typed = input.trim()
  const debounced = useDebounced(typed, DEBOUNCE_MS)
  const searching = debounced.length >= MIN_QUERY
  const suggest = useSuggest(searching ? debounced : "", open)
  const data = suggest.data
  const stale = suggest.isPlaceholderData || (searching && data?.query !== debounced) || typed !== debounced

  // The active option belongs to one result set: new results (or a new query) start unselected.
  const active = cursor.query === debounced && cursor.data === data ? cursor.index : -1
  const setActive = (next: number | ((current: number) => number)) =>
    setCursor({ query: debounced, data, index: typeof next === "function" ? next(active) : next })

  /** Settled queries that found nothing are logged once each, so merchandisers see the gaps. */
  useEffect(() => {
    if (!searching || stale || !data || data.total > 0 || logged.current.has(debounced)) return
    logged.current.add(debounced)
    events.logSearch(debounced)
  }, [searching, stale, data, debounced, events])

  useEffect(() => {
    if (active >= 0) document.getElementById(`${listboxId}-option-${active}`)?.scrollIntoView({ block: "nearest" })
  }, [active, listboxId])

  const changeOpen = (next: boolean) => {
    setOpen(next)
    if (!next) {
      setInput("")
      setActive(-1)
    }
  }

  const remember = (query: string) => {
    if (query.trim().length >= MIN_QUERY) dispatch({ type: "search", query })
  }

  const goTo = (href: string) => {
    changeOpen(false)
    router.push(href)
  }

  const submit = (query: string) => {
    const q = query.trim()
    if (q.length < MIN_QUERY) return
    remember(q)
    goTo(`/search?q=${encodeURIComponent(q)}`)
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (active >= 0) document.getElementById(`${listboxId}-option-${active}`)?.click()
    else submit(input)
  }

  const options = createOptionRegistry(listboxId, active)

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const total = options.count
    if (total === 0) return
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActive((current) => (current + 1) % total)
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setActive((current) => (current <= 0 ? total - 1 : current - 1))
    } else if ((event.key === "Home" || event.key === "End") && active >= 0) {
      event.preventDefault()
      setActive(event.key === "Home" ? 0 : total - 1)
    }
  }

  const onProduct = (product: SuggestProduct) => {
    if (searching) {
      remember(debounced)
      events.logClick({ query: debounced, slug: product.slug })
    }
    changeOpen(false)
  }

  const textLink = (label: ReactNode, href: string, onSelect?: () => void, extra?: ReactNode) => (
    <Link
      key={href}
      href={href}
      onClick={() => {
        onSelect?.()
        changeOpen(false)
      }}
      className={textOption}
      {...options.next()}
    >
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {extra}
    </Link>
  )

  const queryOption = (query: string, icon: boolean) => (
    <button key={query} type="button" onClick={() => submit(query)} className={textOption} {...options.next()}>
      {icon ? <SearchIcon className="size-4 shrink-0 text-subtle-foreground" /> : null}
      <span className="min-w-0 flex-1 truncate">{searching ? highlight(query, debounced) : query}</span>
    </button>
  )

  const productTiles = (products: SuggestProduct[]) => (
    <div className={productGrid}>
      {products.map((product) => (
        <MiniProduct key={product.slug} product={product} sizes={productSizes} onSelect={() => onProduct(product)} className={tileOption} linkProps={options.next()} />
      ))}
    </div>
  )

  const group = (id: string, title: string, children: ReactNode, action?: ReactNode) => (
    <div role="group" aria-labelledby={id} className="flex min-w-0 flex-col gap-2">
      <div className="flex min-h-8 items-center justify-between gap-3 px-3">
        <span id={id} className={heading}>
          {title}
        </span>
        {action}
      </div>
      {children}
    </div>
  )

  /** `fallback` replaces the listbox (offline, error, first load); `notice` sits above it; `body` holds only option groups. */
  let fallback: ReactNode = null
  let notice: ReactNode = null
  let body: ReactNode = null
  if (!online) {
    fallback = <PanelMessage title="You're offline" text="Check your connection — search will work again as soon as you're back online." onRetry={() => suggest.refetch()} />
  } else if (suggest.isError && !data) {
    fallback = <PanelMessage title="Search is taking a break" text="We couldn't load suggestions. Try again, or press Enter to see the full results page." onRetry={() => suggest.refetch()} />
  } else if (!data || (searching && suggest.isPending)) {
    fallback = <PanelSkeleton />
  } else if (!searching) {
    if (preferences.recentlyViewed.length === 0) notice = <p className="px-3 text-18 text-subtle-foreground">Search by model, brand, colour, size or SKU — for example “Air Max”, “running” or “42”.</p>
    body = (
      <div className={cn("grid gap-8 lg:gap-12", preferences.recentlyViewed.length > 0 && "lg:grid-cols-search")}>
        {/* Without recently viewed pairs the lists sit side by side instead of leaving the wide panel empty. */}
        <div className={cn("min-w-0 gap-6", preferences.recentlyViewed.length > 0 ? "flex flex-col" : "grid lg:grid-cols-3 lg:gap-12")}>
          {preferences.recentSearches.length > 0
            ? group(
                `${listboxId}-recent`,
                "Recent searches",
                preferences.recentSearches.map((query) => queryOption(query, true)),
                <button type="button" onClick={() => dispatch({ type: "clearSearches" })} className="min-h-8 text-14 font-bold underline underline-offset-4">
                  Clear<span className="sr-only"> recent searches</span>
                </button>,
              )
            : null}
          {data.trending.length > 0 ? group(`${listboxId}-trending`, "Trending", data.trending.map((query) => queryOption(query, false))) : null}
          {group(`${listboxId}-collections`, "Popular collections", data.collections.map((link) => textLink(link.label, link.href)))}
        </div>
        {preferences.recentlyViewed.length > 0 ? (
          <div className="flex min-w-0 flex-col gap-4">
            {group(
              `${listboxId}-viewed`,
              "Recently viewed",
              <div className={productGrid}>
                {preferences.recentlyViewed.map((product) => (
                  <MiniProduct key={product.slug} product={product} sizes={productSizes} onSelect={() => changeOpen(false)} className={tileOption} linkProps={options.next()} />
                ))}
              </div>,
            )}
          </div>
        ) : null}
      </div>
    )
  } else if (data.total === 0 && data.collections.length === 0 && data.brands.length === 0) {
    notice = (
      <div className="flex flex-col gap-2 px-3">
        <p className="text-22 font-extrabold">No results for “{data.query}”</p>
        {data.didYouMean ? (
          <p className="text-16">
            Did you mean{" "}
            <button type="button" onClick={() => setInput(data.didYouMean ?? "")} className="font-bold underline underline-offset-4">
              {data.didYouMean}
            </button>
            ?
          </p>
        ) : (
          <p className="text-16 text-subtle-foreground">Check the spelling, or try a brand or style.</p>
        )}
      </div>
    )
    body = (
      <div className="grid gap-8 lg:grid-cols-search lg:gap-12">
        <div className="flex min-w-0 flex-col gap-6">
          {data.trending.length > 0 ? group(`${listboxId}-trending`, "Trending", data.trending.map((query) => queryOption(query, false))) : null}
          {group(`${listboxId}-collections`, "Popular categories", popularCollections.map((link) => textLink(link.label, link.href)))}
        </div>
        {data.popular.length > 0 ? group(`${listboxId}-popular`, "Popular right now", productTiles(data.popular)) : null}
      </div>
    )
  } else {
    body = (
      <div className="grid gap-8 lg:grid-cols-search lg:gap-12">
        <div className="flex min-w-0 flex-col gap-6">
          {data.suggestions.length > 0 ? group(`${listboxId}-suggestions`, "Suggestions", data.suggestions.map((query) => queryOption(query, true))) : null}
          {data.collections.length > 0 ? group(`${listboxId}-collections`, "Collections", data.collections.map((link) => textLink(highlight(link.label, debounced), link.href, () => remember(debounced)))) : null}
          {data.brands.length > 0 ? group(`${listboxId}-brands`, "Brands", data.brands.map((link) => textLink(highlight(link.label, debounced), link.href, () => remember(debounced)))) : null}
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          {data.products.length > 0 ? group(`${listboxId}-products`, "Products", productTiles(data.products)) : null}
          {data.total > 0
            ? textLink(
                <>
                  View all {data.total} {data.total === 1 ? "result" : "results"} for “{data.query}”
                </>,
                `/search?q=${encodeURIComponent(data.query)}`,
                () => remember(data.query),
                <ArrowRightIcon aria-hidden="true" className="size-4 shrink-0 rtl:-scale-x-100" />,
              )
            : null}
        </div>
      </div>
    )
    if (suggest.isError) {
      notice = (
        <p role="alert" className="flex flex-wrap items-center gap-3 px-3 text-16 text-destructive">
          Couldn&apos;t refresh results.
          <button type="button" onClick={() => suggest.refetch()} className="font-bold underline underline-offset-4">
            Retry
          </button>
        </p>
      )
    }
  }

  const status = !searching || !data || stale ? "" : statusText(data)
  const expanded = open && options.count > 0

  return (
    <Dialog.Root open={open} onOpenChange={changeOpen}>
      <Dialog.Trigger nativeButton={false} render={<Link href="/search" onClick={(event) => event.preventDefault()} />} aria-label="Search" className={className}>
        <SearchIcon />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-overlay bg-foreground/60 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup
          initialFocus={inputRef}
          className="fixed inset-0 z-overlay flex flex-col bg-background transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 lg:bottom-auto lg:bg-transparent"
        >
          <Dialog.Title className="sr-only">Search</Dialog.Title>
          <div className="bg-foreground pt-[env(safe-area-inset-top)] text-background shadow-header-rule">
            <Container className="flex h-14 items-center gap-3 lg:h-21.5 lg:gap-6">
              <form role="search" action="/search" onSubmit={onSubmit} className="flex h-11 min-w-0 flex-1 items-center gap-3 rounded-lg bg-background px-3 text-foreground outline-offset-2 outline-ring focus-within:outline-3 lg:h-14 lg:px-5">
                <SearchIcon className="size-5 shrink-0" />
                <input
                  ref={inputRef}
                  name="q"
                  type="search"
                  role="combobox"
                  aria-label="Search shoes, brands and styles"
                  aria-autocomplete="list"
                  aria-expanded={expanded}
                  aria-controls={listboxId}
                  aria-activedescendant={active >= 0 ? `${listboxId}-option-${active}` : undefined}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Search shoes, brands and styles"
                  maxLength={80}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="search"
                  className="h-full min-w-0 flex-1 bg-transparent text-16 outline-none placeholder:text-faint-foreground focus-visible:shadow-none lg:text-20 [&::-webkit-search-cancel-button]:hidden"
                />
                {input ? (
                  <button
                    type="button"
                    onClick={() => {
                      setInput("")
                      inputRef.current?.focus()
                    }}
                    aria-label="Clear search"
                    className="flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-surface"
                  >
                    <XIcon aria-hidden="true" className="size-4" />
                  </button>
                ) : null}
              </form>
              <Dialog.Close className="flex min-h-11 shrink-0 items-center gap-2 text-16 font-bold hover:text-brand lg:text-18">
                <span className="lg:hidden">Cancel</span>
                <span className="hidden lg:inline">Close</span>
                <XIcon aria-hidden="true" className="hidden size-5 lg:block" />
              </Dialog.Close>
            </Container>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-background lg:max-h-below-header lg:flex-none lg:shadow-card-lift">
            <Container className="flex flex-col gap-6 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))] lg:py-10">
              {fallback ?? (
                <>
                  {notice}
                  <div id={listboxId} role="listbox" aria-label="Search suggestions" aria-busy={stale || undefined} className={cn("transition-opacity", stale && searching && "opacity-60")}>
                    {body}
                  </div>
                </>
              )}
            </Container>
          </div>
          <p role="status" className="sr-only">
            {status}
          </p>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function statusText(data: SuggestResponse) {
  if (data.total === 0) return data.didYouMean ? `No results. Did you mean ${data.didYouMean}?` : "No results."
  const shown = data.products.length
  return `${data.total} ${data.total === 1 ? "result" : "results"}${shown < data.total ? `, showing ${shown}` : ""}. Use the arrow keys to browse.`
}

function PanelMessage({ title, text, onRetry }: { title: string; text: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 px-3 py-6">
      <p className="text-22 font-extrabold">{title}</p>
      <p className="max-w-150 text-16 text-subtle-foreground">{text}</p>
      <button type="button" onClick={onRetry} className="min-h-11 rounded-md bg-foreground px-5 text-16 font-bold text-background hover:bg-brand hover:text-brand-foreground">
        Try again
      </button>
    </div>
  )
}

function PanelSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-8 lg:grid-cols-search lg:gap-12">
      <div className="flex flex-col gap-3 px-3">
        {[0, 1, 2, 3].map((key) => (
          <span key={key} className="h-6 animate-pulse rounded-xs bg-surface-sunken" />
        ))}
      </div>
      <div className={productGrid}>
        {[0, 1, 2, 3].map((key) => (
          <span key={key} className="flex flex-col gap-2">
            <span className="aspect-square animate-pulse rounded-xl bg-surface-sunken" />
            <span className="h-4 w-1/2 animate-pulse rounded-xs bg-surface-sunken" />
            <span className="h-5 w-3/4 animate-pulse rounded-xs bg-surface-sunken" />
          </span>
        ))}
      </div>
    </div>
  )
}
