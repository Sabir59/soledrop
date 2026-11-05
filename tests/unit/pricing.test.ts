import { describe, expect, it } from "vitest"

import { evaluatePromotions, type PromotionContext } from "@/server/promotions/evaluate"
import type { Promotion } from "@/server/promotions/types"
import { allocate, discountPercent, fromMajor, money, percentOf, sum } from "@/server/shared/money"
import { quoteRates, taxFor, taxRateFor, zoneFor } from "@/server/shipping/calculate"
import type { ShippingZone, TaxRate } from "@/server/shipping/types"

describe("money", () => {
  it("refuses fractional minor units", () => {
    expect(() => money(10.5, "PKR")).toThrow()
    expect(money(1499900, "PKR")).toEqual({ amount: 1499900, currency: "PKR" })
  })

  it("converts, sums and refuses mixed currencies", () => {
    expect(fromMajor(14999, "PKR")).toBe(1499900)
    expect(sum([money(100, "PKR"), money(250, "PKR")], "PKR").amount).toBe(350)
    expect(() => sum([money(100, "PKR"), money(1, "USD")], "PKR")).toThrow(/Currency mismatch/)
    expect(percentOf(money(1499900, "PKR"), 1800).amount).toBe(269982)
  })

  it("allocates so parts always add up to the whole", () => {
    for (const [total, weights] of [
      [100, [1, 1, 1]],
      [149990, [1499900, 960000, 1200000]],
      [7, [0, 5, 0]],
      [0, [3, 4]],
    ] as const) {
      const parts = allocate(total, [...weights])
      expect(parts.reduce((a, b) => a + b, 0)).toBe(total)
      parts.forEach((part) => expect(Number.isInteger(part)).toBe(true))
    }
    expect(allocate(50, [0, 0])).toEqual([0, 0])
  })

  it("rounds the shown discount percentage down", () => {
    expect(discountPercent(960000, 1200000)).toBe(20)
    expect(discountPercent(2899900, 3499900)).toBe(17)
    expect(discountPercent(100, null)).toBeNull()
    expect(discountPercent(100, 100)).toBeNull()
  })
})

const promotion = (overrides: Partial<Promotion>): Promotion => ({
  id: overrides.code ?? "auto",
  storeId: "soledrop",
  code: null,
  title: "Promotion",
  conditions: [],
  actions: [],
  startsAt: null,
  endsAt: null,
  usageLimit: null,
  perCustomerLimit: null,
  timesUsed: 0,
  active: true,
  combinable: false,
  ...overrides,
})

const context = (overrides: Partial<PromotionContext> = {}): PromotionContext => ({
  lines: [
    { lineId: "a", kind: "new", collections: ["new-arrival"], quantity: 1, lineTotal: 1499900 },
    { lineId: "b", kind: "preloved", collections: ["pre-loved"], quantity: 1, lineTotal: 960000 },
  ],
  subtotal: 2459900,
  customerGroup: null,
  previousOrders: 0,
  redemptionsByPromotion: new Map(),
  at: new Date("2026-11-04T10:00:00Z"),
  ...overrides,
})

describe("promotions", () => {
  const welcome = promotion({ code: "WELCOME10", title: "10% off your first order", perCustomerLimit: 1, conditions: [{ type: "first_order" }], actions: [{ type: "percent_off_order", basisPoints: 1000 }] })

  it("rounds percentage discounts down to a whole rupee and splits them across lines exactly", () => {
    const { applied } = evaluatePromotions([welcome], ["welcome10"], context())
    expect(applied).toHaveLength(1)
    expect(applied[0].amount).toBe(245900)
    expect(applied[0].amount % 100).toBe(0)
    expect([...applied[0].perLine.values()].reduce((a, b) => a + b, 0)).toBe(applied[0].amount)
  })

  it("explains why a code does not apply", () => {
    expect(evaluatePromotions([welcome], ["NOPE"], context()).rejected).toEqual([{ code: "NOPE", reason: "We don't recognise this code." }])
    expect(evaluatePromotions([welcome], ["WELCOME10"], context({ previousOrders: 1 })).rejected[0].reason).toBe("This code is for first orders only.")
    expect(evaluatePromotions([welcome], ["WELCOME10"], context({ redemptionsByPromotion: new Map([["WELCOME10", 1]]) })).rejected[0].reason).toBe("You've already used this code.")
    const expired = promotion({ code: "OLD", endsAt: "2026-01-01T00:00:00Z", actions: [{ type: "fixed_off_order", amount: 50000 }] })
    expect(evaluatePromotions([expired], ["OLD"], context()).rejected[0].reason).toBe("This code has expired.")
    const spend = promotion({ code: "BIG", conditions: [{ type: "subtotal_at_least", amount: 5000000 }], actions: [{ type: "fixed_off_order", amount: 50000 }] })
    expect(evaluatePromotions([spend], ["BIG"], context()).rejected[0].reason).toBe("Spend Rs. 50,000 or more to use this code.")
  })

  it("limits item discounts to matching lines and never below zero", () => {
    const preloved = promotion({ code: "PRELOVED500", actions: [{ type: "percent_off_items", basisPoints: 10000, kind: "preloved" }] })
    const { applied } = evaluatePromotions([preloved], ["PRELOVED500"], context())
    expect(applied[0].perLine.get("a") ?? 0).toBe(0)
    expect(applied[0].perLine.get("b")).toBe(960000)
    const huge = promotion({ code: "HUGE", actions: [{ type: "fixed_off_order", amount: 99999999 }] })
    expect(evaluatePromotions([huge], ["HUGE"], context()).applied[0].amount).toBe(2459900)
  })

  it("keeps the best non-combinable promotion and tells the shopper about the other", () => {
    const small = promotion({ code: "SMALL", actions: [{ type: "fixed_off_order", amount: 10000 }] })
    const { applied, rejected } = evaluatePromotions([welcome, small], ["SMALL", "WELCOME10"], context())
    expect(applied.map((result) => result.promotion.code)).toEqual(["WELCOME10"])
    expect(rejected).toEqual([{ code: "SMALL", reason: "This code can't be combined with your other discount." }])
  })

  it("stacks combinable promotions without discounting a line twice", () => {
    const a = promotion({ code: "A", combinable: true, actions: [{ type: "percent_off_items", basisPoints: 10000, kind: "preloved" }] })
    const b = promotion({ code: "B", combinable: true, actions: [{ type: "fixed_off_order", amount: 99999999 }] })
    const { applied } = evaluatePromotions([a, b], ["A", "B"], context())
    expect(applied.reduce((total, result) => total + result.amount, 0)).toBe(2459900)
  })
})

describe("shipping and tax", () => {
  const zones: ShippingZone[] = [
    { id: "pk", name: "Pakistan", countries: ["PK"], cities: [], position: 1, rates: [
      { code: "standard", label: "Standard", amount: 25000, freeOver: 500000, minDays: 3, maxDays: 5, cashOnDelivery: true },
      { code: "express", label: "Express", amount: 60000, freeOver: null, minDays: 1, maxDays: 2, cashOnDelivery: true },
    ] },
    { id: "metro", name: "Metro", countries: ["PK"], cities: ["lahore"], position: 0, rates: [] },
  ]

  it("prefers a city zone, then the country zone", () => {
    expect(zoneFor(zones, "PK", " Lahore ")?.id).toBe("metro")
    expect(zoneFor(zones, "PK", "Multan")?.id).toBe("pk")
    expect(zoneFor(zones, "AE", "Dubai")).toBeNull()
  })

  it("makes standard delivery free at the threshold", () => {
    const [standard, express] = quoteRates(zones[0], 500000, false)
    expect(standard).toMatchObject({ free: true, effectiveAmount: 0 })
    expect(express).toMatchObject({ free: false, effectiveAmount: 60000 })
    expect(quoteRates(zones[0], 499900, false)[0].effectiveAmount).toBe(25000)
    expect(quoteRates(zones[0], 0, true).every((rate) => rate.effectiveAmount === 0)).toBe(true)
  })

  it("extracts inclusive GST and adds exclusive tax", () => {
    const gst: TaxRate = { country: "PK", province: null, label: "GST", basisPoints: 1800, inclusive: true }
    expect(taxFor(1180000, gst)).toEqual({ tax: 180000, inclusive: true })
    expect(taxFor(1000000, { ...gst, inclusive: false })).toEqual({ tax: 180000, inclusive: false })
    expect(taxFor(0, gst).tax).toBe(0)
    const punjab = { ...gst, province: "Punjab", basisPoints: 1600 }
    expect(taxRateFor([gst, punjab], "PK", "Punjab")).toBe(punjab)
    expect(taxRateFor([gst, punjab], "PK", "Sindh")).toBe(gst)
  })
})
