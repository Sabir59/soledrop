"use client"

import { cn } from "@/lib/utils"

type QuantityStepperProps = {
  value: number
  max: number
  onChange: (value: number) => void
  tone?: "light" | "dark"
  label?: string
  disabled?: boolean
}

/** The design's − 1 + stepper: three 64 px squares with a 1.37 px rule, bounded by stock. */
export function QuantityStepper({ value, max, onChange, tone = "light", label = "Quantity", disabled = false }: QuantityStepperProps) {
  const cell = cn(
    "flex size-14 items-center justify-center border-[1.37px] border-border-strong text-26 font-bold md:size-16 md:text-30",
    tone === "dark" ? "text-background" : "bg-background text-foreground",
  )
  const step = cn(cell, "transition-colors disabled:cursor-not-allowed disabled:text-faint-foreground", tone === "dark" ? "enabled:hover:bg-ink-field" : "enabled:hover:bg-surface")

  return (
    <div role="group" aria-label={label} className="flex">
      <button type="button" aria-label="Decrease quantity" disabled={disabled || value <= 1} onClick={() => onChange(value - 1)} className={step}>
        -
      </button>
      <output aria-live="polite" aria-label={`${label}: ${value}`} className={cn(cell, "border-x-0")}>
        {value}
      </output>
      <button type="button" aria-label="Increase quantity" disabled={disabled || value >= max} onClick={() => onChange(value + 1)} className={step}>
        +
      </button>
    </div>
  )
}
