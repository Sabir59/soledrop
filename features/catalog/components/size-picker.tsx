"use client"

import { useId } from "react"

import { cn } from "@/lib/utils"

export type SizeOption = { variantId: string; label: string; available: boolean }

type SizePickerProps = {
  legend: string
  options: SizeOption[]
  value: string | null
  onChange: (variantId: string) => void
  /** `featured`: dark 55×50 chips (Home); `pdp`: 74×66 chips on white (product page). */
  variant: "featured" | "pdp"
  legendClassName?: string
  invalid?: boolean
  describedBy?: string
}

/** Radio-group size chips. Sold-out sizes stay visible, struck through and unselectable. */
export function SizePicker({ legend, options, value, onChange, variant, legendClassName, invalid, describedBy }: SizePickerProps) {
  const name = useId()
  return (
    <fieldset aria-describedby={describedBy} aria-invalid={invalid || undefined} className={cn("flex flex-col", variant === "featured" ? "gap-5.25" : "gap-3.25")}>
      <legend className={cn("float-start w-full", legendClassName)}>{legend}</legend>
      <div className={cn("flex flex-wrap", variant === "featured" ? "gap-3.25 ps-1.25" : "gap-3")}>
        {options.map((option) => (
          <label key={option.variantId} className="relative">
            <input
              type="radio"
              name={name}
              value={option.variantId}
              checked={value === option.variantId}
              disabled={!option.available}
              onChange={() => onChange(option.variantId)}
              className="peer sr-only"
            />
            <span
              className={cn(
                "flex cursor-pointer items-center justify-center transition-colors peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring peer-disabled:cursor-not-allowed peer-disabled:line-through",
                variant === "featured"
                  ? "h-12.5 w-14 rounded-chip border-[1.89px] border-border-strong text-25 leading-0 font-semibold tracking-tight-1 text-background peer-hover:border-background peer-checked:border-brand peer-checked:bg-brand peer-checked:text-brand-foreground peer-disabled:text-subtle-foreground"
                  : "h-16.5 w-18.5 rounded-lg border-[1.37px] border-foreground bg-background text-30 font-bold peer-hover:bg-surface peer-checked:bg-foreground peer-checked:text-background peer-disabled:border-border peer-disabled:text-faint-foreground",
                invalid && "border-destructive",
              )}
            >
              {option.label}
              {option.available ? null : <span className="sr-only"> (sold out)</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
