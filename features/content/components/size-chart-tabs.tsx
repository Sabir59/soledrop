"use client"

import { useId, useRef, useState, type KeyboardEvent } from "react"

import type { SizeChartId, SizeRow } from "@/content/size-guide"
import { cn } from "@/lib/utils"

type Chart = { id: SizeChartId; label: string; rows: SizeRow[] }

/** Tab widths are the design's fixed frames (110 / 130 / 110), not padding. */
const tabWidth: Record<SizeChartId, string> = { men: "md:w-27.5", women: "md:w-32.5", kids: "md:w-27.5" }

const columns: { key: keyof SizeRow; label: string }[] = [
  { key: "eu", label: "EU" },
  { key: "uk", label: "UK" },
  { key: "us", label: "US" },
  { key: "cm", label: "CM" },
]

/**
 * Size Guide chart switcher (screen 08): an ARIA tab list (arrow keys, Home/End, roving tab
 * stop) over one conversion table per chart. Every table is in the HTML, so the chart reads
 * without script.
 */
export function SizeChartTabs({ charts }: { charts: Chart[] }) {
  const id = useId()
  const [active, setActive] = useState<SizeChartId>(charts[0].id)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = charts.findIndex((chart) => chart.id === active)
    const next =
      event.key === "ArrowRight" ? (index + 1) % charts.length
      : event.key === "ArrowLeft" ? (index - 1 + charts.length) % charts.length
      : event.key === "Home" ? 0
      : event.key === "End" ? charts.length - 1
      : null
    if (next === null) return
    event.preventDefault()
    setActive(charts[next].id)
    tabs.current[next]?.focus()
  }

  return (
    <div className="flex w-full flex-col gap-6 md:gap-10">
      <div role="tablist" aria-label="Size chart" onKeyDown={onKeyDown} className="flex gap-1.5">
        {charts.map((chart, index) => {
          const selected = chart.id === active
          return (
            <button
              key={chart.id}
              ref={(node) => {
                tabs.current[index] = node
              }}
              type="button"
              role="tab"
              id={`${id}-${chart.id}-tab`}
              aria-selected={selected}
              aria-controls={`${id}-${chart.id}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(chart.id)}
              className={cn(
                "flex h-12 flex-1 items-center justify-center font-display text-18 font-bold uppercase transition-colors md:h-14.5 md:flex-none md:text-20",
                tabWidth[chart.id],
                selected ? "bg-foreground text-background" : "bg-background text-subtle-foreground hover:text-foreground",
              )}
            >
              {chart.label}
            </button>
          )
        })}
      </div>

      {charts.map((chart) => (
        <div
          key={chart.id}
          role="tabpanel"
          id={`${id}-${chart.id}-panel`}
          aria-labelledby={`${id}-${chart.id}-tab`}
          hidden={chart.id !== active}
        >
          <table className="w-full table-fixed border-collapse font-display">
            <caption className="sr-only">Shoe sizes for {chart.label.toLowerCase()}: EU, UK, US and foot length in centimetres</caption>
            <thead className="bg-foreground text-background shadow-table-head">
              <tr>
                {columns.map((column, index) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={cn("h-14 text-center align-middle text-18 font-bold md:h-17.5 md:text-22 3xl:ps-6.5 3xl:pt-5.75 3xl:align-top 3xl:text-start", index < 3 && "3xl:w-88.5")}
                  >
                    <span className="3xl:inline-block 3xl:w-20 3xl:text-center">{column.label}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chart.rows.map((row) => (
                <tr key={row.eu} className="bg-background even:bg-surface-stripe">
                  {columns.map((column, index) =>
                    index === 0 ? (
                      <th
                        key={column.key}
                        scope="row"
                        className="h-14 text-center align-middle text-20 font-bold md:h-17.5 md:text-26 md:leading-8 3xl:ps-6.5 3xl:text-start"
                      >
                        <span className="3xl:inline-block 3xl:w-20 3xl:text-center">{row[column.key]}</span>
                      </th>
                    ) : (
                      <td
                        key={column.key}
                        className="text-center align-middle text-20 font-semibold text-subtle-foreground md:text-26 md:leading-8 3xl:ps-6.5 3xl:text-start"
                      >
                        <span className="3xl:inline-block 3xl:w-20 3xl:text-center">{row[column.key]}</span>
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
