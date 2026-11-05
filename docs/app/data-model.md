# Data model

Source of truth: `supabase/migrations/` (schema → RLS → functions, forward only), mirrored by the
TypeScript domain types in `server/<domain>/types.ts`. Tests run the migrations in PGlite
(`tests/db`). 42 tables, all in `public`, all with RLS enabled and denied by default.

## Conventions

- **Money:** `bigint` minor units (paisa); `Rs. 14,999` = `1499900`. Computed only on the server.
- **Ids:** `uuid` (`gen_random_uuid()`), except `stores.id` (text: one store per deployment, `STORE_ID`).
- **Time:** `timestamptz`.
- **Tenancy:** every top-level row has `store_id` (multi-store ready).
- **Flexible data:** `jsonb` for attributes, custom fields, rules, blocks, SEO.
- **Errors:** functions raise `code: shopper message`, which the app maps to HTTP (`api.md`).

## Domains

| Domain | Tables | Notes |
| --- | --- | --- |
| Store & staff | `stores`, `staff_members` | `staff_role` enum: owner, manager, fulfilment, support. Staff are Supabase Auth users (`auth.uid()`). `stores.next_order_number` feeds `SD10001…`. |
| Catalogue | `brands`, `collections`, `collection_products`, `products`, `product_images`, `variants`, `attribute_definitions`, `custom_field_definitions` | `products.kind` new\|preloved; `check ((kind='preloved') = (condition_grade is not null))`. Grades: like-new, excellent, great, good, minor-marks (D-015). Image `role` card\|gallery (D-016). Collections are manual or rule-based (`rules` jsonb, `server/rules/engine.ts`). |
| Inventory | `inventory_levels`, `inventory_reservations`, `inventory_movements` | `on_hand ≥ 0`, `reserved ≥ 0`, `reserved ≤ on_hand` (checks), so stock can never go negative. Every change writes a movement (ledger). |
| Pricing | `price_lists`, `prices`, `exchange_rates`, `tax_rates` | Price lists by currency, customer group, priority and date window (B2B wholesale list behind `b2b-pricing`). GST 18 % inclusive (basis points). |
| Shipping | `shipping_zones`, `shipping_rates` | Zones by country/city; rates with `free_over` and a COD allowance. |
| Promotions | `promotions`, `promotion_redemptions` | Conditions/actions as jsonb. `times_used ≤ usage_limit` (check); per-customer limit enforced in `redeem_promotion`. |
| Customers | `customers`, `addresses`, `sessions`, `password_resets` | Shopper accounts are separate from staff auth: scrypt hashes, hashed session tokens. One default address (partial unique index). |
| Cart | `carts`, `cart_lines` | Quantity 1–10, one line per variant. Merged into the customer's cart on sign-in (`merge_carts`). |
| Orders | `orders`, `order_lines`, `payments`, `refunds`, `returns` | Unique `(store_id, number)` and `(store_id, idempotency_key)`. Lines snapshot title/price. Refunds stay within the paid amount and line quantity (checks). One open return per order. |
| Content | `pages`, `faqs`, `newsletter_subscribers`, `contact_messages` | Pages are block lists rendered by the block registry. |
| Platform | `feature_flags`, `outbox_events`, `webhook_deliveries`, `audit_log`, `rate_limits`, `idempotency_keys` | `audit_log` is append-only (trigger). |

## Order state machine

```
pending_payment → confirmed → processing → shipped → delivered
       ↓              ↓            ↓            ↓          ↓
   cancelled      cancelled    cancelled     returned   returned        refunds: any paid state
```

The SQL `can_transition()` and `server/orders/state-machine.ts` are the same table (checked by
`tests/unit/orders.test.ts`). Cancelling restocks; delivered orders can request a return inside the
window; `restock_return` puts pairs back.

## Database functions (RPC)

All are `set search_path = ''`, executable by `service_role` only, and each has a contention test in
`tests/db/rpc.test.ts`.

| Function | Guarantees |
| --- | --- |
| `place_order` | One transaction: advisory lock on (store, idempotency key), replay if the key exists, lock inventory rows in `variant_id` order, re-check stock, redeem promotions (`redeem_promotion`), `next_order_number`, insert order + lines + movements + outbox event. |
| `reserve_stock` / `release_expired_reservations` | Checkout holds expire after `RESERVATION_TTL_MINUTES`. |
| `merge_carts` | Guest bag into account bag, quantities capped by the line limit. |
| `transition_order` | Validates the transition, restocks on cancel, writes history and an event. |
| `record_payment` / `create_refund` / `restock_return` | Idempotent by key; amounts bounded by checks. |
| `import_products` | Upsert by slug, used by both the seed and the import API. |
| `claim_outbox_events` / `fail_outbox_event` | `SKIP LOCKED` claims; exponential back-off. |
| `rate_limit_hit` | Fixed-window counter. |
| `anonymise_customer_orders`, `scrub_customer` | Right to erasure (amounts kept for tax). |

## Row-level security

- **anon/authenticated:** read published catalogue, prices, shipping, tax, pages and FAQs only.
  Nothing private, and no RPCs.
- **Staff** (`has_staff_role`, SECURITY DEFINER): owner/manager manage the catalogue and
  configuration; fulfilment/support read orders, inventory and customers per role. Orders and stock
  change only through the functions above.
- **service_role** (the server) bypasses RLS. The key never leaves the server.

Verified by `tests/db/rls.test.ts`.
