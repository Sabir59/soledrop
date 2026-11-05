import "server-only"

import type { Collection, Product } from "@/server/catalog/types"
import {
  attributeDefinitions,
  basePrices,
  brands,
  collections,
  customFieldDefinitions,
  openingStock,
  products,
  STORE_ID,
} from "@/server/fixtures/seed"
import { contentSeed } from "@/server/fixtures/content-seed"
import { commerceSeed } from "@/server/fixtures/commerce-seed"
import { searchSeed } from "@/server/fixtures/search-seed"
import type { FixtureTables } from "@/server/fixtures/tables"

/**
 * The in-memory database behind DATA_DRIVER=fixtures. Tables mirror the Postgres schema
 * (supabase/migrations) and the fixtures repositories reproduce each RPC's guarantees —
 * stock never below zero, idempotent order placement, legal state transitions — so the
 * storefront behaves the same on both drivers. Data lives for the life of the server process.
 */
function createTables(): FixtureTables {
  return {
    stores: [{ id: STORE_ID, slug: "soledrop", name: "Sole Drop", defaultCurrency: "PKR", defaultLocale: "en" }],
    brands: structuredClone(brands),
    products: structuredClone(products) as Product[],
    collections: structuredClone(collections) as Collection[],
    attributeDefinitions: structuredClone(attributeDefinitions),
    customFieldDefinitions: structuredClone(customFieldDefinitions),
    priceLists: commerceSeed.priceLists,
    prices: [
      ...basePrices.map((price) => ({ ...price, priceListId: commerceSeed.priceLists[0].id })),
      ...commerceSeed.extraPrices,
    ],
    inventory: openingStock.map((row) => ({ variantId: row.variantId, onHand: row.onHand, reserved: 0 })),
    reservations: [],
    carts: [],
    promotions: structuredClone(commerceSeed.promotions),
    promotionRedemptions: [],
    shippingZones: structuredClone(commerceSeed.shippingZones),
    taxRates: structuredClone(commerceSeed.taxRates),
    orders: [],
    payments: [],
    refunds: [],
    returns: [],
    orderSequence: { prefix: "SD", next: 10001 },
    customers: [],
    addresses: [],
    sessions: [],
    passwordResets: [],
    staffRoles: [],
    pages: structuredClone(contentSeed.pages),
    faqs: structuredClone(contentSeed.faqs),
    newsletter: [],
    contactMessages: [],
    searchSynonyms: structuredClone(searchSeed.synonyms),
    searchEvents: [],
    flags: structuredClone(commerceSeed.flags),
    outbox: [],
    webhookDeliveries: [],
    audit: [],
    rateLimits: new Map(),
    idempotency: new Map(),
    exchangeRates: structuredClone(commerceSeed.exchangeRates),
  }
}

const globalStore = globalThis as unknown as { __soledropFixtures?: FixtureTables }

/** The process-wide fixture tables (kept on globalThis so dev reloads don't reset carts). */
export function db(): FixtureTables {
  globalStore.__soledropFixtures ??= createTables()
  return globalStore.__soledropFixtures
}

/** Restores the seed state; used by tests (tests/integration). */
export function resetFixtures(): void {
  globalStore.__soledropFixtures = createTables()
}

/**
 * Runs `work` as one atomic unit: on any throw the tables are restored, which is how the
 * fixtures driver mirrors a Postgres transaction. Node runs it without interleaving because
 * `work` is synchronous.
 */
export function transaction<T>(work: (tables: FixtureTables) => T): T {
  const tables = db()
  const snapshot = structuredClone({ ...tables, rateLimits: undefined, idempotency: undefined })
  try {
    return work(tables)
  } catch (error) {
    Object.assign(tables, snapshot, { rateLimits: tables.rateLimits, idempotency: tables.idempotency })
    throw error
  }
}
