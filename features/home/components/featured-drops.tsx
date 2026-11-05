"use client"

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import Image from "next/image"
import { useRef, useState, useSyncExternalStore, type MouseEvent, type ReactNode } from "react"

import { Container } from "@/components/shared/container"
import { KIND_BADGE } from "@/features/home/components/featured-buy-box"
import { cn } from "@/lib/utils"
import type { ProductKind } from "@/server/catalog/types"

export type FeaturedSlide = { kind: ProductKind; image: { url: string; alt: string } | null; content: ReactNode }

const noop = () => () => {}
const slideId = (kind: ProductKind) => `featured-drop-${kind}`
const arrow =
  "pointer-events-auto absolute top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-foreground text-background transition-colors hover:bg-brand hover:text-brand-foreground"

/**
 * Featured Drop (D-048): a two-slide slider, Brand New then Pre-Loved. The controls sit on the
 * shoe photo, where the eye already is: the switcher names both drops in their badge colours at
 * the top, and arrows on either edge step between them (wrapping round). Phones also swipe (scroll
 * snap). It never autoplays, because each slide is a buy box a shopper may be filling in. Without
 * JavaScript the switcher links jump to each slide and the track still scrolls.
 */
export function FeaturedDrops({ slides }: { slides: FeaturedSlide[] }) {
  const hydrated = useSyncExternalStore(noop, () => true, () => false)
  const [active, setActive] = useState(0)
  const track = useRef<HTMLDivElement>(null)

  const goTo = (index: number) => {
    const node = track.current
    if (!node) return
    const next = (index + slides.length) % slides.length
    const direction = getComputedStyle(node).direction === "rtl" ? -1 : 1
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    node.scrollTo({ left: next * node.clientWidth * direction, behavior: smooth ? "smooth" : "instant" })
    setActive(next)
  }

  const onScroll = () => {
    const node = track.current
    if (!node) return
    const index = Math.round(Math.abs(node.scrollLeft) / node.clientWidth)
    if (index !== active && index < slides.length) setActive(index)
  }

  const onPick = (event: MouseEvent<HTMLAnchorElement>, index: number) => {
    event.preventDefault()
    goTo(index)
  }

  return (
    <section aria-roledescription="carousel" aria-label="Featured drops" className="relative bg-foreground py-12 text-background md:py-17.5">
      {slides.length > 1 ? (
        // Laid over the photo: an empty copy of the slide's photo box carries the controls.
        <Container className="pointer-events-none absolute inset-x-0 top-12 z-10 md:top-17.5">
          <div className="relative aspect-square w-full lg:w-1/2 3xl:w-180">
            <nav aria-label="Featured drops" className="pointer-events-auto absolute start-4 top-4 flex rounded-full bg-foreground p-1 md:start-6 md:top-6">
              {slides.map((slide, index) => (
                <a
                  key={slide.kind}
                  href={`#${slideId(slide.kind)}`}
                  aria-current={hydrated && index === active ? "true" : undefined}
                  onClick={(event) => onPick(event, index)}
                  className={cn(
                    "flex min-h-11 items-center rounded-full px-4 text-14 font-bold uppercase transition-colors md:px-5 md:text-16",
                    hydrated && index === active ? KIND_BADGE[slide.kind].className : "text-background hover:text-brand",
                  )}
                >
                  {KIND_BADGE[slide.kind].label}
                </a>
              ))}
            </nav>
            {hydrated ? (
              <>
                <button type="button" aria-label="Previous drop" onClick={() => goTo(active - 1)} className={cn(arrow, "start-4 md:start-6")}>
                  <ChevronLeftIcon aria-hidden="true" className="size-6 rtl:-scale-x-100" />
                </button>
                <button type="button" aria-label="Next drop" onClick={() => goTo(active + 1)} className={cn(arrow, "end-4 md:end-6")}>
                  <ChevronRightIcon aria-hidden="true" className="size-6 rtl:-scale-x-100" />
                </button>
              </>
            ) : null}
          </div>
        </Container>
      ) : null}

      <div ref={track} onScroll={onScroll} aria-live="polite" className="relative flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none]">
        {slides.map((slide, index) => (
          <div
            key={slide.kind}
            id={slideId(slide.kind)}
            role="group"
            aria-roledescription="slide"
            aria-label={`${KIND_BADGE[slide.kind].label} featured drop, ${index + 1} of ${slides.length}`}
            inert={hydrated && index !== active}
            className="w-full shrink-0 snap-start"
          >
            <Container className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-16 3xl:gap-22.5">
              <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-4xl bg-well-dark lg:w-1/2 3xl:w-180">
                {slide.image ? (
                  <Image src={slide.image.url} alt={slide.image.alt} fill sizes="(min-width: 1920px) 720px, (min-width: 1024px) 45vw, 100vw" className="object-cover" />
                ) : null}
              </div>
              {slide.content}
            </Container>
          </div>
        ))}
      </div>
    </section>
  )
}
