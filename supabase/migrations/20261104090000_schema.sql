-- Sole Drop schema. Forward-only: never edit a committed migration, add a new one.
-- Money is integer minor units (paisa for PKR) in bigint columns; the server computes every total.
-- Mirrors the domain types in server/*/types.ts and the fixtures driver (server/fixtures).
-- gen_random_uuid() is core Postgres (13+); no extension needed.

-- ─── Enums ──────────────────────────────────────────────────────────────────
create type public.product_kind as enum ('new', 'preloved');
create type public.product_gender as enum ('men', 'women', 'kids', 'unisex');
create type public.product_status as enum ('draft', 'active', 'archived');
-- The five grades of the Condition Guide (design-decisions D-015): one vocabulary everywhere.
create type public.condition_grade as enum ('like-new', 'excellent', 'great', 'good', 'minor-marks');
create type public.image_role as enum ('card', 'gallery');
create type public.currency_code as enum ('PKR', 'USD', 'AED', 'GBP');
create type public.customer_group as enum ('retail', 'wholesale');
create type public.cart_status as enum ('active', 'converted', 'merged');
create type public.order_status as enum ('pending_payment', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned');
create type public.payment_status as enum ('unpaid', 'authorized', 'paid', 'partially_refunded', 'refunded', 'failed');
create type public.fulfillment_status as enum ('unfulfilled', 'fulfilled', 'returned');
create type public.payment_record_status as enum ('pending', 'authorized', 'captured', 'failed', 'refunded', 'partially_refunded');
create type public.return_status as enum ('requested', 'approved', 'received', 'rejected');
create type public.outbox_status as enum ('pending', 'delivered', 'failed');
create type public.staff_role as enum ('owner', 'manager', 'fulfilment', 'support');

-- ─── Stores and staff ───────────────────────────────────────────────────────
create table public.stores (
  id text primary key,
  name text not null,
  default_currency public.currency_code not null default 'PKR',
  order_prefix text not null default 'SD',
  next_order_number bigint not null default 10001 check (next_order_number > 0),
  created_at timestamptz not null default now()
);

-- Staff are Supabase Auth users (phase 2 admin); shoppers use the app's own sessions table.
create table public.staff_members (
  user_id uuid not null,
  store_id text not null references public.stores (id) on delete cascade,
  role public.staff_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, store_id)
);

-- ─── Catalogue ──────────────────────────────────────────────────────────────
create table public.brands (
  id uuid primary key default gen_random_uuid(),
  store_id text not null references public.stores (id) on delete cascade,
  slug text not null,
  name text not null,
  position integer not null default 0,
  unique (store_id, slug)
);

create table public.attribute_definitions (
  store_id text not null references public.stores (id) on delete cascade,
  code text not null,
  label text not null,
  type text not null check (type in ('text', 'number', 'boolean', 'enum', 'multi_enum')),
  scope text not null check (scope in ('product', 'variant')),
  options jsonb,
  filterable boolean not null default false,
  position integer not null default 0,
  primary key (store_id, code)
);

create table public.custom_field_definitions (
  store_id text not null references public.stores (id) on delete cascade,
  entity text not null check (entity in ('product', 'order', 'customer')),
  code text not null,
  label text not null,
  type text not null check (type in ('text', 'number', 'boolean', 'date', 'url')),
  required boolean not null default false,
  visible_on_storefront boolean not null default false,
  primary key (store_id, entity, code)
);

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  store_id text not null references public.stores (id) on delete cascade,
  slug text not null,
  title text not null,
  headline jsonb not null default '["", ""]' check (jsonb_typeof(headline) = 'array'),
  description text not null default '',
  kind text not null check (kind in ('manual', 'rule')),
  rules jsonb,
  image jsonb,
  position integer not null default 0,
  seo jsonb not null default '{}',
  unique (store_id, slug)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id text not null references public.stores (id) on delete cascade,
  slug text not null,
  title text not null,
  brand_id uuid not null references public.brands (id),
  kind public.product_kind not null,
  gender public.product_gender not null,
  status public.product_status not null default 'draft',
  description text not null default '',
  condition_grade public.condition_grade,
  condition_notes text,
  attributes jsonb not null default '{}',
  custom_fields jsonb not null default '{}',
  tags text[] not null default '{}',
  position integer not null default 0,
  published_at timestamptz not null default now(),
  seo jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, slug),
  -- Every pre-loved pair carries a grade; new pairs never do.
  check ((kind = 'preloved') = (condition_grade is not null))
);
create index products_store_status_position on public.products (store_id, status, position);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url text not null,
  alt text not null default '',
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  role public.image_role not null default 'gallery',
  position integer not null default 0
);
create index product_images_product on public.product_images (product_id, position);

create table public.variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  sku text not null unique,
  size_eu text not null,
  size_uk text not null,
  size_us text not null,
  size_cm text not null,
  attributes jsonb not null default '{}',
  weight_grams integer not null default 0 check (weight_grams >= 0),
  position integer not null default 0
);
create index variants_product on public.variants (product_id, position);

create table public.collection_products (
  collection_id uuid not null references public.collections (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  position integer not null default 0,
  primary key (collection_id, product_id)
);
create index collection_products_product on public.collection_products (product_id);

-- ─── Inventory: on_hand never negative, reserved never above on_hand ────────
create table public.inventory_levels (
  variant_id uuid primary key references public.variants (id) on delete cascade,
  on_hand integer not null default 0 check (on_hand >= 0),
  reserved integer not null default 0 check (reserved >= 0),
  updated_at timestamptz not null default now(),
  constraint inventory_reserved_within_on_hand check (reserved <= on_hand)
);

create table public.inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null,
  variant_id uuid not null references public.variants (id) on delete cascade,
  quantity integer not null check (quantity > 0),
  expires_at timestamptz not null
);
create index inventory_reservations_cart on public.inventory_reservations (cart_id);
create index inventory_reservations_expiry on public.inventory_reservations (expires_at);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.variants (id) on delete cascade,
  delta integer not null,
  reason text not null,
  actor text not null,
  at timestamptz not null default now()
);

-- ─── Pricing ────────────────────────────────────────────────────────────────
create table public.price_lists (
  id uuid primary key default gen_random_uuid(),
  store_id text not null references public.stores (id) on delete cascade,
  code text not null,
  currency public.currency_code not null,
  customer_group public.customer_group,
  priority integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  unique (store_id, code),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table public.prices (
  price_list_id uuid not null references public.price_lists (id) on delete cascade,
  variant_id uuid not null references public.variants (id) on delete cascade,
  amount bigint not null check (amount >= 0),
  compare_at bigint check (compare_at is null or compare_at > amount),
  primary key (price_list_id, variant_id)
);
create index prices_variant on public.prices (variant_id);

create table public.exchange_rates (
  store_id text primary key references public.stores (id) on delete cascade,
  base public.currency_code not null,
  rates jsonb not null,
  updated_at timestamptz not null default now()
);

-- ─── Shipping and tax ───────────────────────────────────────────────────────
create table public.shipping_zones (
  id uuid primary key default gen_random_uuid(),
  store_id text not null references public.stores (id) on delete cascade,
  name text not null,
  countries text[] not null default '{}',
  cities text[] not null default '{}',
  position integer not null default 0
);

create table public.shipping_rates (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references public.shipping_zones (id) on delete cascade,
  code text not null,
  label text not null,
  amount bigint not null check (amount >= 0),
  free_over bigint check (free_over is null or free_over > 0),
  min_days integer not null check (min_days >= 0),
  max_days integer not null,
  cash_on_delivery boolean not null default false,
  unique (zone_id, code),
  check (max_days >= min_days)
);

create table public.tax_rates (
  id uuid primary key default gen_random_uuid(),
  store_id text not null references public.stores (id) on delete cascade,
  country text not null,
  province text,
  label text not null,
  basis_points integer not null check (basis_points between 0 and 10000),
  inclusive boolean not null default true
);

-- ─── Promotions ─────────────────────────────────────────────────────────────
create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  store_id text not null references public.stores (id) on delete cascade,
  code text,
  title text not null,
  conditions jsonb not null default '[]',
  actions jsonb not null default '[]',
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  per_customer_limit integer check (per_customer_limit is null or per_customer_limit > 0),
  times_used integer not null default 0 check (times_used >= 0),
  active boolean not null default true,
  combinable boolean not null default false,
  constraint promotions_usage_within_limit check (usage_limit is null or times_used <= usage_limit)
);
create unique index promotions_store_code on public.promotions (store_id, upper(code)) where code is not null;

-- ─── Customers (the app's own auth; passwords are scrypt hashes) ────────────
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  store_id text not null references public.stores (id) on delete cascade,
  email text not null check (email = lower(email)),
  password_hash text not null,
  full_name text not null,
  phone text,
  customer_group public.customer_group not null default 'retail',
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  deletion_requested_at timestamptz,
  unique (store_id, email)
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  full_name text not null,
  phone text not null,
  line1 text not null,
  line2 text,
  city text not null,
  province text not null,
  postal_code text,
  country text not null default 'PK',
  is_default boolean not null default false
);
create unique index addresses_one_default on public.addresses (customer_id) where is_default;

create table public.sessions (
  token_hash text primary key,
  customer_id uuid not null references public.customers (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index sessions_customer on public.sessions (customer_id);

create table public.password_resets (
  token_hash text primary key,
  customer_id uuid not null references public.customers (id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz
);

-- ─── Carts ──────────────────────────────────────────────────────────────────
create table public.carts (
  id uuid primary key default gen_random_uuid(),
  store_id text not null references public.stores (id) on delete cascade,
  token_hash text not null,
  customer_id uuid references public.customers (id) on delete set null,
  currency public.currency_code not null default 'PKR',
  promotion_codes text[] not null default '{}',
  status public.cart_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index carts_token on public.carts (store_id, token_hash) where status = 'active';
create index carts_customer on public.carts (store_id, customer_id) where status = 'active';

create table public.cart_lines (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts (id) on delete cascade,
  variant_id uuid not null references public.variants (id) on delete cascade,
  quantity integer not null check (quantity between 1 and 10),
  added_at timestamptz not null default now(),
  unique (cart_id, variant_id)
);

-- ─── Orders ─────────────────────────────────────────────────────────────────
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  store_id text not null references public.stores (id),
  number text not null,
  customer_id uuid references public.customers (id) on delete set null,
  email text not null,
  phone text not null,
  status public.order_status not null,
  payment_status public.payment_status not null default 'unpaid',
  fulfillment_status public.fulfillment_status not null default 'unfulfilled',
  currency public.currency_code not null,
  subtotal bigint not null check (subtotal >= 0),
  discount_total bigint not null default 0 check (discount_total >= 0),
  shipping_total bigint not null default 0 check (shipping_total >= 0),
  tax_total bigint not null default 0 check (tax_total >= 0),
  tax_included boolean not null,
  total bigint not null check (total >= 0),
  refunded_total bigint not null default 0 check (refunded_total >= 0),
  promotion_codes text[] not null default '{}',
  shipping_address jsonb not null,
  shipping_method jsonb not null,
  payment_method text not null,
  idempotency_key text not null,
  access_token_hash text not null,
  custom_fields jsonb not null default '{}',
  note text,
  tracking_number text,
  history jsonb not null default '[]',
  placed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, number),
  unique (store_id, idempotency_key),
  constraint orders_refund_within_total check (refunded_total <= total)
);
create index orders_customer on public.orders (store_id, customer_id, placed_at desc);
create index orders_email on public.orders (store_id, lower(email));

create table public.order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  -- Snapshots: the line keeps what was bought even if the product changes or is deleted.
  variant_id uuid not null,
  product_id uuid not null,
  slug text not null,
  title text not null,
  brand text not null,
  kind public.product_kind not null,
  condition public.condition_grade,
  size jsonb not null,
  image_url text not null,
  sku text not null,
  quantity integer not null check (quantity > 0),
  unit_price bigint not null check (unit_price >= 0),
  compare_at bigint,
  discount bigint not null default 0 check (discount >= 0),
  tax bigint not null default 0 check (tax >= 0),
  total bigint not null check (total >= 0),
  refunded_quantity integer not null default 0 check (refunded_quantity >= 0),
  position integer not null default 0,
  constraint order_lines_refund_within_quantity check (refunded_quantity <= quantity)
);
create index order_lines_order on public.order_lines (order_id, position);

create table public.promotion_redemptions (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.promotions (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  email text not null check (email = lower(email)),
  at timestamptz not null default now(),
  unique (promotion_id, order_id)
);
create index promotion_redemptions_email on public.promotion_redemptions (promotion_id, email);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  provider text not null,
  status public.payment_record_status not null,
  amount bigint not null check (amount >= 0),
  refunded_amount bigint not null default 0 check (refunded_amount >= 0),
  currency public.currency_code not null,
  provider_ref text,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (order_id, idempotency_key),
  constraint payments_refund_within_amount check (refunded_amount <= amount)
);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  payment_id uuid references public.payments (id),
  amount bigint not null check (amount > 0),
  reason text not null,
  lines jsonb not null default '[]',
  restock boolean not null default false,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (order_id, idempotency_key)
);

create table public.returns (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  status public.return_status not null default 'requested',
  lines jsonb not null,
  reason text not null,
  created_at timestamptz not null default now()
);
-- At most one open (not rejected) return per order.
create unique index returns_one_open on public.returns (order_id) where status <> 'rejected';

-- ─── Content ────────────────────────────────────────────────────────────────
create table public.pages (
  store_id text not null references public.stores (id) on delete cascade,
  slug text not null,
  title text not null,
  description text not null default '',
  blocks jsonb not null default '[]',
  seo jsonb not null default '{}',
  published boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (store_id, slug)
);

create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  store_id text not null references public.stores (id) on delete cascade,
  category text not null,
  question text not null,
  answer text not null,
  position integer not null default 0
);

create table public.newsletter_subscribers (
  store_id text not null references public.stores (id) on delete cascade,
  email text not null check (email = lower(email)),
  source text not null,
  status text not null default 'subscribed' check (status in ('subscribed', 'unsubscribed')),
  consent_at timestamptz not null default now(),
  primary key (store_id, email)
);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  store_id text not null references public.stores (id) on delete cascade,
  name text not null,
  email text not null,
  order_number text,
  message text not null,
  created_at timestamptz not null default now()
);

-- ─── Platform: flags, outbox, webhooks, audit, rate limits, idempotency ─────
create table public.feature_flags (
  store_id text not null references public.stores (id) on delete cascade,
  key text not null,
  description text not null default '',
  enabled boolean not null default false,
  customer_groups text[],
  primary key (store_id, key)
);

create table public.outbox_events (
  id uuid primary key default gen_random_uuid(),
  store_id text not null references public.stores (id) on delete cascade,
  topic text not null,
  payload jsonb not null,
  status public.outbox_status not null default 'pending',
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  delivered_at timestamptz,
  last_error text
);
create index outbox_due on public.outbox_events (available_at) where status = 'pending';

create table public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.outbox_events (id) on delete cascade,
  endpoint text not null,
  status text not null check (status in ('delivered', 'failed')),
  response_status integer,
  at timestamptz not null default now()
);

-- Append-only: UPDATE and DELETE are rejected by trigger (see *_rls.sql).
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  action text not null,
  entity text not null,
  entity_id text not null,
  before jsonb,
  after jsonb,
  at timestamptz not null default now()
);
create index audit_log_entity on public.audit_log (entity, entity_id, at);

create table public.rate_limits (
  key text primary key,
  window_start timestamptz not null,
  count integer not null
);

create table public.idempotency_keys (
  key text primary key,
  status integer not null,
  body jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);
