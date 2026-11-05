import fs from "node:fs"
import path from "node:path"

import { PGlite } from "@electric-sql/pglite"
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm"

const MIGRATIONS = path.resolve(import.meta.dirname, "../../supabase/migrations")

/**
 * What Supabase provides before our migrations run: the API roles and `auth.uid()` reading the
 * JWT subject. Tests impersonate a role with `as(db, role, userId, work)`.
 */
const SUPABASE_BOOTSTRAP = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
`

export const STORE = "soledrop"

/** A new in-memory Postgres with every migration applied in file-name order. */
export async function freshDatabase() {
  // Supabase ships pg_trgm; PGlite loads it as a contrib module (migration 20261105090000).
  const db = new PGlite({ extensions: { pg_trgm } })
  await db.exec(SUPABASE_BOOTSTRAP)
  for (const file of fs.readdirSync(MIGRATIONS).filter((name) => name.endsWith(".sql")).sort()) {
    await db.exec(fs.readFileSync(path.join(MIGRATIONS, file), "utf8"))
  }
  return db
}

/** Runs `work` as an API role (optionally as a signed-in user), then switches back. */
export async function as<T>(db: PGlite, role: "anon" | "authenticated" | "service_role", userId: string | null, work: () => Promise<T>): Promise<T> {
  await db.exec(`set request.jwt.claim.sub = '${userId ?? ""}'; set role ${role};`)
  try {
    return await work()
  } finally {
    await db.exec("reset role; reset request.jwt.claim.sub;")
  }
}

export const ids = {
  brand: "10000000-0000-4000-8000-000000000001",
  product: "20000000-0000-4000-8000-000000000001",
  draftProduct: "20000000-0000-4000-8000-000000000002",
  variantA: "30000000-0000-4000-8000-000000000001",
  variantB: "30000000-0000-4000-8000-000000000002",
  priceList: "50000000-0000-4000-8000-000000000001",
  promotionLimited: "40000000-0000-4000-8000-000000000001",
  promotionOncePerShopper: "40000000-0000-4000-8000-000000000002",
  owner: "90000000-0000-4000-8000-000000000001",
  support: "90000000-0000-4000-8000-000000000002",
  stranger: "90000000-0000-4000-8000-000000000003",
}

/** One store, one active product with two sizes (stock 3 and 1), one draft, two promotions, staff. */
export async function seed(db: PGlite, stock: { a: number; b: number } = { a: 3, b: 1 }) {
  await db.exec(`
    insert into public.stores (id, name) values ('${STORE}', 'Sole Drop');
    insert into public.brands (id, store_id, slug, name) values ('${ids.brand}', '${STORE}', 'asics', 'ASICS');
    insert into public.products (id, store_id, slug, title, brand_id, kind, gender, status)
      values ('${ids.product}', '${STORE}', 'asics-gel-kayano', 'ASICS Gel-Kayano 14', '${ids.brand}', 'new', 'men', 'active'),
             ('${ids.draftProduct}', '${STORE}', 'unreleased', 'Unreleased', '${ids.brand}', 'new', 'men', 'draft');
    insert into public.variants (id, product_id, sku, size_eu, size_uk, size_us, size_cm)
      values ('${ids.variantA}', '${ids.product}', 'GK14-44', '44', '9', '10', '28'),
             ('${ids.variantB}', '${ids.product}', 'GK14-45', '45', '10', '11', '28.5');
    insert into public.inventory_levels (variant_id, on_hand) values ('${ids.variantA}', ${stock.a}), ('${ids.variantB}', ${stock.b});
    insert into public.price_lists (id, store_id, code, currency) values ('${ids.priceList}', '${STORE}', 'retail-pkr', 'PKR');
    insert into public.prices (price_list_id, variant_id, amount) values ('${ids.priceList}', '${ids.variantA}', 1499900), ('${ids.priceList}', '${ids.variantB}', 1499900);
    insert into public.promotions (id, store_id, code, title, usage_limit, actions)
      values ('${ids.promotionLimited}', '${STORE}', 'PRELOVED500', 'Rs. 500 off', 2, '[]');
    insert into public.promotions (id, store_id, code, title, per_customer_limit, actions)
      values ('${ids.promotionOncePerShopper}', '${STORE}', 'WELCOME10', '10% off your first order', 1, '[]');
    insert into public.staff_members (user_id, store_id, role) values ('${ids.owner}', '${STORE}', 'owner'), ('${ids.support}', '${STORE}', 'support');
  `)
}

/** Creates an active cart holding `lines` and returns its id. */
export async function cart(db: PGlite, lines: { variantId: string; quantity: number }[]) {
  const { rows } = await db.query<{ id: string }>(`insert into public.carts (store_id, token_hash) values ($1, md5(random()::text)) returning id`, [STORE])
  const id = rows[0].id
  for (const line of lines) {
    await db.query(`insert into public.cart_lines (cart_id, variant_id, quantity) values ($1, $2, $3)`, [id, line.variantId, line.quantity])
  }
  return id
}

/** The p_order payload the app sends (server/orders/supabase.repository.ts). */
export function orderPayload(key: string, lines: { variantId: string; quantity: number }[], email = "ayesha@example.com") {
  const total = lines.reduce((sum, line) => sum + line.quantity * 1499900, 0)
  return {
    store_id: STORE,
    customer_id: null,
    email,
    phone: "03001234567",
    status: "confirmed",
    payment_status: "unpaid",
    fulfillment_status: "unfulfilled",
    currency: "PKR",
    subtotal: total,
    discount_total: 0,
    shipping_total: 0,
    tax_total: 0,
    tax_included: true,
    total,
    promotion_codes: [],
    shipping_address: { fullName: "Ayesha Khan", phone: "03001234567", line1: "House 12", city: "Lahore", province: "Punjab", country: "PK" },
    shipping_method: { code: "standard", label: "Standard", amount: 0 },
    payment_method: "cod",
    idempotency_key: key,
    access_token_hash: `hash-${key}`,
    custom_fields: {},
    note: null,
    lines: lines.map((line, position) => ({
      variant_id: line.variantId,
      product_id: ids.product,
      slug: "asics-gel-kayano",
      title: "ASICS Gel-Kayano 14",
      brand: "ASICS",
      kind: "new",
      condition: null,
      size: { eu: line.variantId === ids.variantA ? "44" : "45" },
      image_url: "/images/products/asics.webp",
      sku: "GK14",
      quantity: line.quantity,
      unit_price: 1499900,
      compare_at: null,
      discount: 0,
      tax: 0,
      total: line.quantity * 1499900,
      position,
    })),
  }
}

/** Calls place_order the way the app does and resolves to the result or the raised message. */
export async function placeOrder(db: PGlite, cartId: string, key: string, lines: { variantId: string; quantity: number }[], promotionIds: string[] = [], email?: string) {
  try {
    const { rows } = await db.query<{ result: { order_id: string; replayed: boolean } }>(
      `select public.place_order($1::jsonb, $2::uuid, $3::uuid[], 'order.placed', '{}'::jsonb) as result`,
      [JSON.stringify(orderPayload(key, lines, email)), cartId, promotionIds],
    )
    return { ok: true as const, ...rows[0].result }
  } catch (error) {
    return { ok: false as const, message: (error as Error).message }
  }
}

export async function level(db: PGlite, variantId: string) {
  const { rows } = await db.query<{ on_hand: number; reserved: number }>(`select on_hand, reserved from public.inventory_levels where variant_id = $1`, [variantId])
  return rows[0]
}
