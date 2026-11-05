"use client"


type CartQuantityProps = {
  value: number
  max: number
  onChange: (value: number) => void
  label: string
  disabled?: boolean
}

const step =
  "flex h-full w-14.5 items-center justify-center rounded-full transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"

/** The bag's pill stepper (design 10, "count"): − | 1 | + in a 172×52 pill, bounded by stock. */
export function CartQuantity({ value, max, onChange, label, disabled = false }: CartQuantityProps) {
  return (
    <div role="group" aria-label={label} className="flex h-13 w-43 items-center rounded-full border-2 border-subtle-foreground bg-background">
      <button type="button" aria-label="Decrease quantity" disabled={disabled || value <= 1} onClick={() => onChange(value - 1)} className={step}>
        <span aria-hidden="true" className="block h-0.5 w-4 bg-foreground" />
      </button>
      <span aria-hidden="true" className="h-5 w-px bg-border-strong" />
      <output aria-live="polite" aria-label={`${label}: ${value}`} className="flex w-13.5 justify-center text-22 font-semibold">
        {value}
      </output>
      <span aria-hidden="true" className="h-5 w-px bg-border-strong" />
      <button type="button" aria-label="Increase quantity" disabled={disabled || value >= max} onClick={() => onChange(value + 1)} className={step}>
        <span aria-hidden="true" className="relative block size-4">
          <span className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-foreground" />
          <span className="absolute inset-y-0 start-1/2 w-0.5 -translate-x-1/2 bg-foreground" />
        </span>
      </button>
    </div>
  )
}
