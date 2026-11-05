"use client"

import { PauseIcon, PlayIcon } from "lucide-react"
import Image from "next/image"
import { useId, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react"

import { gradeDetails, inspectedParts, type GradeDetail } from "@/content/condition-guide"
import { CONDITION_GUIDE } from "@/features/catalog/lib/condition-grades"
import { conditionLabel } from "@/lib/format"
import { cn } from "@/lib/utils"

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)"

const noop = () => () => {}
const subscribeMotion = (onChange: () => void) => {
  const query = window.matchMedia(REDUCED_MOTION)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

const guideFor = (detail: GradeDetail) => CONDITION_GUIDE.find((entry) => entry.grade === detail.grade)!

/**
 * The five grades as a self-playing story (D-046): each grade shows for a few seconds with its
 * progress bar filling, then the next. Hover or focus holds it, the Pause button stops it, and
 * choosing a grade takes over from the autoplay. Reduced motion never autoplays. Before hydration
 * (or without JavaScript) every grade is listed in full.
 */
export function ConditionExplorer() {
  const hydrated = useSyncExternalStore(noop, () => true, () => false)
  const reducedMotion = useSyncExternalStore(subscribeMotion, () => window.matchMedia(REDUCED_MOTION).matches, () => true)
  const [active, setActive] = useState(0)
  const [stopped, setStopped] = useState(false)
  const [held, setHeld] = useState(false)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const baseId = useId()

  if (!hydrated) {
    return (
      <ul className="flex flex-col gap-4 md:gap-6">
        {gradeDetails.map((detail) => (
          <li key={detail.grade}>
            <GradePanel detail={detail} />
          </li>
        ))}
      </ul>
    )
  }

  const autoplay = !reducedMotion && !stopped
  const select = (index: number, focus = false) => {
    setActive(index)
    setStopped(true)
    if (focus) tabs.current[index]?.focus()
  }

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const last = gradeDetails.length - 1
    const forward = ["ArrowDown", "ArrowRight"].includes(event.key)
    const backward = ["ArrowUp", "ArrowLeft"].includes(event.key)
    if (!forward && !backward && event.key !== "Home" && event.key !== "End") return
    event.preventDefault()
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl"
    const step = event.key === "ArrowRight" || event.key === "ArrowLeft" ? (forward !== rtl ? 1 : -1) : forward ? 1 : -1
    const next = event.key === "Home" ? 0 : event.key === "End" ? last : (active + step + gradeDetails.length) % gradeDetails.length
    select(next, true)
  }

  return (
    <div
      className="grid gap-4 lg:grid-cols-condition-explorer lg:gap-6"
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHeld(false)
      }}
    >
      <div className="flex flex-col gap-3">
        <div role="tablist" aria-label="Condition grades" aria-orientation="vertical" className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
          {gradeDetails.map((detail, index) => {
            const selected = index === active
            return (
              <button
                key={detail.grade}
                ref={(node) => {
                  tabs.current[index] = node
                }}
                type="button"
                role="tab"
                id={`${baseId}-tab-${index}`}
                aria-selected={selected}
                aria-controls={`${baseId}-panel`}
                tabIndex={selected ? 0 : -1}
                onClick={() => select(index)}
                onKeyDown={onTabKeyDown}
                className={cn(
                  "relative flex min-h-16 items-center gap-4 overflow-hidden rounded-2xl px-5 py-3 text-start transition-colors",
                  selected ? "bg-foreground text-background" : "bg-background hover:bg-surface",
                )}
              >
                <span aria-hidden="true" className={cn("w-6 shrink-0 font-display text-18 font-bold", selected ? "text-brand" : "text-subtle-foreground")}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-20 font-black tracking-tight-1">{conditionLabel(detail.grade)}</span>
                  <span className={cn("truncate text-14 font-medium", selected ? "text-muted-foreground" : "text-subtle-foreground")}>{detail.wear}</span>
                </span>
                {selected && autoplay ? (
                  <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-ink-raised">
                    <span
                      key={active}
                      onAnimationEnd={() => setActive((index + 1) % gradeDetails.length)}
                      className={cn("block h-full bg-brand animate-grade-progress", held && "animation-paused")}
                    />
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
        {reducedMotion ? null : (
          <button
            type="button"
            onClick={() => setStopped((value) => !value)}
            className="flex min-h-11 w-fit items-center gap-2 rounded-lg px-3 text-16 font-bold text-subtle-foreground transition-colors hover:text-foreground"
          >
            {stopped ? <PlayIcon aria-hidden="true" className="size-4" /> : <PauseIcon aria-hidden="true" className="size-4" />}
            {stopped ? "Play the guide" : "Pause the guide"}
          </button>
        )}
      </div>

      <div role="tabpanel" id={`${baseId}-panel`} aria-labelledby={`${baseId}-tab-${active}`} tabIndex={0} className="rounded-3xl">
        <GradePanel key={active} detail={gradeDetails[active]} animate />
      </div>
    </div>
  )
}

/** One grade: illustration, summary, wear meter and what to expect on each part of the pair. */
function GradePanel({ detail, animate = false }: { detail: GradeDetail; animate?: boolean }) {
  const guide = guideFor(detail)
  const label = conditionLabel(detail.grade)
  return (
    <article
      aria-label={label}
      className={cn(
        "grid h-full gap-6 overflow-hidden rounded-3xl p-5 md:grid-cols-2 md:items-center md:gap-8 md:p-8",
        guide.tone,
        animate && "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300",
      )}
    >
      <Image
        src={`/images/site/condition-${detail.grade}.png`}
        alt={`Illustration: ${label}`}
        width={305}
        height={175}
        sizes="(min-width: 768px) 30rem, 100vw"
        className="h-auto w-full rounded-2xl"
      />
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <h3 className="text-34 leading-none font-black tracking-tight-3 md:text-40">{label}</h3>
          <p className="text-18 font-medium text-subtle-foreground">{guide.text}</p>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-14 font-bold tracking-wide-2 text-subtle-foreground uppercase">Wear level</p>
          <div role="meter" aria-label="Wear level" aria-valuemin={1} aria-valuemax={5} aria-valuenow={detail.level} aria-valuetext={`${detail.level} of 5: ${detail.wear}`} className="grid grid-cols-5 gap-1.5">
            {[1, 2, 3, 4, 5].map((step) => (
              <span key={step} className={cn("h-2 rounded-full", step <= detail.level ? "bg-foreground" : "bg-background")} />
            ))}
          </div>
          <p aria-hidden="true" className="flex justify-between text-14 font-medium text-subtle-foreground">
            <span>Barely worn</span>
            <span>Clearly worn</span>
          </p>
        </div>

        <dl className="flex flex-col divide-y divide-foreground/10">
          {inspectedParts.map((part, index) => (
            <div key={part} className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
              <dt className="text-16 font-bold">{part}</dt>
              <dd className="text-end text-16 font-medium text-subtle-foreground">{detail.parts[index]}</dd>
            </div>
          ))}
        </dl>
      </div>
    </article>
  )
}
