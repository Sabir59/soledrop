-- Commerce RPCs. Each runs in one transaction, locks rows in a fixed order (variant id, then
-- promotion id) so concurrent calls queue instead of deadlocking, and mirrors the fixtures driver
-- (server/*/fixtures.repository.ts) line for line.
-- Expected failures raise 'code: shopper-safe message'; server/db/supabase.ts maps the code to a DomainError.
-- Every function pins search_path to '' and names objects with their schema.

-- ─── Inventory ──────────────────────────────────────────────────────────────

-- Gives back a set of holds (already deleted) to inventory_levels, locking levels in variant order.
create function public.restore_reserved(p_released jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  r record;
begin
  for r in
    select x.variant_id, sum(x.quantity)::integer as quantity
    from jsonb_to_recordset(p_released) as x(variant_id uuid, quantity integer)
    group by x.variant_id
    order by x.variant_id
  loop
    update public.inventory_levels
      set reserved = reserved - r.quantity, updated_at = now()
      where variant_id = r.variant_id;
  end loop;
end
$$;

-- Releases one cart's holds and any expired holds on the given variants.
create function public.release_holds(p_cart_id uuid, p_variant_ids uuid[])
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_released jsonb;
begin
  with gone as (
    delete from public.inventory_reservations
    where cart_id = p_cart_id or (expires_at <= now() and variant_id = any (p_variant_ids))
    returning variant_id, quantity
  )
  select coalesce(jsonb_agg(jsonb_build_object('variant_id', variant_id, 'quantity', quantity)), '[]') into v_released from gone;
  perform public.restore_reserved(v_released);
  return jsonb_array_length(v_released);
end
$$;

create function public.release_expired_reservations()
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_released jsonb;
begin
  with gone as (
    delete from public.inventory_reservations where expires_at <= now() returning variant_id, quantity
  )
  select coalesce(jsonb_agg(jsonb_build_object('variant_id', variant_id, 'quantity', quantity)), '[]') into v_released from gone;
  perform public.restore_reserved(v_released);
  return jsonb_array_length(v_released);
end
$$;

-- Replaces a cart's holds with p_items ([{variant_id, quantity}]); all or nothing.
create function public.reserve_stock(p_cart_id uuid, p_items jsonb, p_ttl_minutes integer)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_ids uuid[];
  r record;
begin
  select coalesce(array_agg(distinct x.variant_id order by x.variant_id), '{}') into v_ids
  from jsonb_to_recordset(p_items) as x(variant_id uuid, quantity integer);
  perform 1 from public.inventory_levels where variant_id = any (v_ids) order by variant_id for update;
  perform public.release_holds(p_cart_id, v_ids);

  for r in
    select x.variant_id, sum(x.quantity)::integer as quantity
    from jsonb_to_recordset(p_items) as x(variant_id uuid, quantity integer)
    group by x.variant_id
    order by x.variant_id
  loop
    update public.inventory_levels
      set reserved = reserved + r.quantity, updated_at = now()
      where variant_id = r.variant_id and on_hand - reserved >= r.quantity;
    if not found then
      raise exception 'out_of_stock: Some items are no longer available in that quantity.';
    end if;
    insert into public.inventory_reservations (cart_id, variant_id, quantity, expires_at)
      values (p_cart_id, r.variant_id, r.quantity, now() + make_interval(mins => p_ttl_minutes));
  end loop;
end
$$;

-- Free stock per variant, counting the given cart's own holds as free for that cart.
create function public.stock_availability(p_variant_ids uuid[], p_cart_id uuid)
returns table (variant_id uuid, available integer)
language sql
stable
set search_path = ''
as $$
  select ids.id,
    coalesce(level.on_hand - level.reserved, 0)
      + coalesce((select sum(h.quantity) from public.inventory_reservations as h where h.cart_id = p_cart_id and h.variant_id = ids.id), 0)::integer
  from unnest(p_variant_ids) as ids (id)
  left join public.inventory_levels as level on level.variant_id = ids.id
$$;

create function public.adjust_stock(p_variant_id uuid, p_delta integer, p_reason text, p_actor text)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_before integer;
  v_after integer;
begin
  select on_hand into v_before from public.inventory_levels where variant_id = p_variant_id for update;
  if not found then
    raise exception 'not_found: Unknown variant.';
  end if;
  if v_before + p_delta < 0 then
    raise exception 'out_of_stock: Some items are no longer available in that quantity.';
  end if;
  update public.inventory_levels set on_hand = on_hand + p_delta, updated_at = now()
    where variant_id = p_variant_id returning on_hand into v_after;
  insert into public.inventory_movements (variant_id, delta, reason, actor) values (p_variant_id, p_delta, p_reason, p_actor);
  insert into public.audit_log (actor, action, entity, entity_id, before, after)
    values (p_actor, 'inventory.adjust', 'variant', p_variant_id::text, jsonb_build_object('onHand', v_before), jsonb_build_object('onHand', v_after, 'reason', p_reason));
  return v_after;
end
$$;

-- Puts quantities ([{variant_id, quantity}]) back on the shelf, locking in variant order.
create function public.restock(p_items jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  r record;
begin
  for r in
    select x.variant_id, sum(x.quantity)::integer as quantity
    from jsonb_to_recordset(p_items) as x(variant_id uuid, quantity integer)
    group by x.variant_id
    having sum(x.quantity) > 0
    order by x.variant_id
  loop
    update public.inventory_levels set on_hand = on_hand + r.quantity, updated_at = now() where variant_id = r.variant_id;
  end loop;
end
$$;

-- ─── Carts ──────────────────────────────────────────────────────────────────

create function public.save_cart(p_cart_id uuid, p_customer_id uuid, p_promotion_codes text[], p_lines jsonb)
returns void
language plpgsql
set search_path = ''
as $$
begin
  update public.carts
    set customer_id = p_customer_id, promotion_codes = p_promotion_codes, updated_at = now()
    where id = p_cart_id;
  if not found then
    raise exception 'not_found: Your bag has expired.';
  end if;
  delete from public.cart_lines
    where cart_id = p_cart_id
      and id not in (select x.id from jsonb_to_recordset(p_lines) as x(id uuid));
  insert into public.cart_lines (id, cart_id, variant_id, quantity, added_at)
    select x.id, p_cart_id, x.variant_id, x.quantity, x.added_at
    from jsonb_to_recordset(p_lines) as x(id uuid, variant_id uuid, quantity integer, added_at timestamptz)
  on conflict (id) do update set quantity = excluded.quantity;
end
$$;

-- Moves a guest bag into the shopper's bag at sign-in (quantities capped by stock and 10 per line).
create function public.merge_carts(p_guest_cart_id uuid, p_customer_cart_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_found integer;
  v_ids uuid[];
  v_codes text[];
begin
  -- Lock both carts in id order.
  select count(*) into v_found from (
    select id from public.carts where id in (p_guest_cart_id, p_customer_cart_id) order by id for update
  ) as locked;
  if v_found <> 2 then
    raise exception 'not_found: Cart not found.';
  end if;

  insert into public.cart_lines (cart_id, variant_id, quantity, added_at)
    select p_customer_cart_id, g.variant_id, least(10, coalesce(level.on_hand, 0), g.quantity), g.added_at
    from public.cart_lines as g
    left join public.inventory_levels as level on level.variant_id = g.variant_id
    where g.cart_id = p_guest_cart_id and least(10, coalesce(level.on_hand, 0), g.quantity) > 0
  on conflict (cart_id, variant_id) do update
    set quantity = least(
      10,
      coalesce((select l.on_hand from public.inventory_levels as l where l.variant_id = excluded.variant_id), 0),
      public.cart_lines.quantity + (select g2.quantity from public.cart_lines as g2 where g2.cart_id = p_guest_cart_id and g2.variant_id = excluded.variant_id)
    );
  delete from public.cart_lines where cart_id = p_customer_cart_id and quantity <= 0;

  select array(select distinct unnest(t.promotion_codes || g.promotion_codes)) into v_codes
    from public.carts as t, public.carts as g
    where t.id = p_customer_cart_id and g.id = p_guest_cart_id;
  update public.carts set promotion_codes = v_codes, updated_at = now() where id = p_customer_cart_id;

  delete from public.cart_lines where cart_id = p_guest_cart_id;
  update public.carts set status = 'merged', updated_at = now() where id = p_guest_cart_id;
  select coalesce(array_agg(distinct variant_id order by variant_id), '{}') into v_ids from public.inventory_reservations where cart_id = p_guest_cart_id;
  perform 1 from public.inventory_levels where variant_id = any (v_ids) order by variant_id for update;
  perform public.release_holds(p_guest_cart_id, '{}');
end
$$;

-- Deletes guest carts untouched for p_older_than_days and their holds.
create function public.purge_abandoned_carts(p_older_than_days integer)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_cart uuid;
  v_count integer := 0;
begin
  for v_cart in
    select id from public.carts
    where customer_id is null and updated_at < now() - make_interval(days => p_older_than_days)
    order by id
    for update skip locked
  loop
    perform public.release_holds(v_cart, '{}');
    delete from public.carts where id = v_cart;
    v_count := v_count + 1;
  end loop;
  return v_count;
end
$$;

-- ─── Promotions ─────────────────────────────────────────────────────────────

-- Records one use of a promotion by an order. Locks the promotion row, so its usage limit holds
-- under concurrent checkouts; the per-shopper limit is counted by email (guests have no account).
create function public.redeem_promotion(p_promotion_id uuid, p_order_id uuid, p_customer_id uuid, p_email text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_promotion public.promotions;
  v_used integer;
begin
  select * into v_promotion from public.promotions where id = p_promotion_id for update;
  if not found or not v_promotion.active then
    raise exception 'promotion_invalid: A discount on your bag is no longer available.';
  end if;
  if v_promotion.usage_limit is not null and v_promotion.times_used >= v_promotion.usage_limit then
    raise exception 'promotion_invalid: "%" has been fully redeemed.', v_promotion.title;
  end if;
  select count(*) into v_used from public.promotion_redemptions where promotion_id = p_promotion_id and email = lower(p_email);
  if v_promotion.per_customer_limit is not null and v_used >= v_promotion.per_customer_limit then
    raise exception 'promotion_invalid: You have already used "%".', v_promotion.title;
  end if;
  update public.promotions set times_used = times_used + 1 where id = p_promotion_id;
  insert into public.promotion_redemptions (promotion_id, order_id, customer_id, email)
    values (p_promotion_id, p_order_id, p_customer_id, lower(p_email));
end
$$;

create function public.promotion_redemption_counts(p_store_id text, p_customer_id uuid, p_email text)
returns table (promotion_id uuid, redemptions integer)
language sql
stable
set search_path = ''
as $$
  select r.promotion_id, count(*)::integer
  from public.promotion_redemptions as r
  join public.promotions as p on p.id = r.promotion_id
  where p.store_id = p_store_id
    and ((p_customer_id is not null and r.customer_id = p_customer_id) or (p_email is not null and r.email = lower(p_email)))
  group by r.promotion_id
$$;

create function public.shopper_order_count(p_store_id text, p_customer_id uuid, p_email text)
returns integer
language sql
stable
set search_path = ''
as $$
  select count(*)::integer from public.orders as o
  where o.store_id = p_store_id
    and ((p_customer_id is not null and o.customer_id = p_customer_id) or (p_email is not null and lower(o.email) = lower(p_email)))
$$;

-- ─── Orders ─────────────────────────────────────────────────────────────────

create function public.next_order_number(p_store_id text)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_number text;
begin
  update public.stores set next_order_number = next_order_number + 1
    where id = p_store_id
    returning order_prefix || (next_order_number - 1)::text into v_number;
  if v_number is null then
    raise exception 'not_found: Unknown store.';
  end if;
  return v_number;
end
$$;

-- Places an order atomically: replays on a repeated idempotency key, converts the cart, takes
-- stock (the cart's own holds count as free), redeems promotions, numbers the order and queues
-- the event. Any failure rolls the whole thing back.
create function public.place_order(p_order jsonb, p_cart_id uuid, p_promotion_ids uuid[], p_event_topic text, p_event_payload jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_store text := p_order ->> 'store_id';
  v_key text := p_order ->> 'idempotency_key';
  v_existing uuid;
  v_cart_status public.cart_status;
  v_ids uuid[];
  v_promotion uuid;
  v_order_id uuid;
  v_number text;
  r record;
begin
  -- Serialise attempts with the same key, then replay if one already succeeded.
  perform pg_advisory_xact_lock(hashtextextended(v_store || ':' || v_key, 0));
  select id into v_existing from public.orders where store_id = v_store and idempotency_key = v_key;
  if found then
    return jsonb_build_object('order_id', v_existing, 'replayed', true);
  end if;

  select status into v_cart_status from public.carts where id = p_cart_id for update;
  if not found or v_cart_status <> 'active' then
    raise exception 'conflict: This bag has already been checked out.';
  end if;

  select coalesce(array_agg(distinct x.variant_id order by x.variant_id), '{}') into v_ids
    from jsonb_to_recordset(p_order -> 'lines') as x(variant_id uuid);
  perform 1 from public.inventory_levels where variant_id = any (v_ids) order by variant_id for update;
  perform public.release_holds(p_cart_id, v_ids);

  for r in
    select x.variant_id, sum(x.quantity)::integer as quantity, min(x.title) as title, min(x.size ->> 'eu') as size_eu
    from jsonb_to_recordset(p_order -> 'lines') as x(variant_id uuid, quantity integer, title text, size jsonb)
    group by x.variant_id
    order by x.variant_id
  loop
    update public.inventory_levels
      set on_hand = on_hand - r.quantity, updated_at = now()
      where variant_id = r.variant_id and on_hand - reserved >= r.quantity;
    if not found then
      raise exception 'out_of_stock: % (EU %) is no longer available in that quantity.', r.title, r.size_eu;
    end if;
  end loop;

  v_number := public.next_order_number(v_store);
  insert into public.orders (
    store_id, number, customer_id, email, phone, status, payment_status, fulfillment_status, currency,
    subtotal, discount_total, shipping_total, tax_total, tax_included, total, promotion_codes,
    shipping_address, shipping_method, payment_method, idempotency_key, access_token_hash, custom_fields, note, history
  )
  select
    v_store, v_number, (p_order ->> 'customer_id')::uuid, p_order ->> 'email', p_order ->> 'phone',
    (p_order ->> 'status')::public.order_status, (p_order ->> 'payment_status')::public.payment_status,
    (p_order ->> 'fulfillment_status')::public.fulfillment_status, (p_order ->> 'currency')::public.currency_code,
    (p_order ->> 'subtotal')::bigint, (p_order ->> 'discount_total')::bigint, (p_order ->> 'shipping_total')::bigint,
    (p_order ->> 'tax_total')::bigint, (p_order ->> 'tax_included')::boolean, (p_order ->> 'total')::bigint,
    array(select jsonb_array_elements_text(coalesce(p_order -> 'promotion_codes', '[]'))),
    p_order -> 'shipping_address', p_order -> 'shipping_method', p_order ->> 'payment_method', v_key,
    p_order ->> 'access_token_hash', coalesce(p_order -> 'custom_fields', '{}'), p_order ->> 'note',
    jsonb_build_array(jsonb_build_object('from', null, 'to', p_order ->> 'status', 'at', now(), 'actor', 'customer'))
  returning id into v_order_id;

  insert into public.order_lines (
    order_id, variant_id, product_id, slug, title, brand, kind, condition, size, image_url, sku,
    quantity, unit_price, compare_at, discount, tax, total, position
  )
  select v_order_id, x.variant_id, x.product_id, x.slug, x.title, x.brand, x.kind::public.product_kind,
    x.condition::public.condition_grade, x.size, x.image_url, x.sku, x.quantity, x.unit_price, x.compare_at,
    x.discount, x.tax, x.total, x.position
  from jsonb_to_recordset(p_order -> 'lines') as x(
    variant_id uuid, product_id uuid, slug text, title text, brand text, kind text, condition text, size jsonb,
    image_url text, sku text, quantity integer, unit_price bigint, compare_at bigint, discount bigint, tax bigint,
    total bigint, position integer
  );

  foreach v_promotion in array (select coalesce(array_agg(id order by id), '{}') from unnest(p_promotion_ids) as id) loop
    perform public.redeem_promotion(v_promotion, v_order_id, (p_order ->> 'customer_id')::uuid, p_order ->> 'email');
  end loop;

  update public.carts set status = 'converted', updated_at = now() where id = p_cart_id;
  insert into public.outbox_events (store_id, topic, payload)
    values (v_store, p_event_topic, coalesce(p_event_payload, '{}') || jsonb_build_object('orderId', v_order_id, 'number', v_number));

  return jsonb_build_object('order_id', v_order_id, 'replayed', false);
end
$$;

-- The order state machine. Same table as server/orders/state-machine.ts.
create function public.can_transition(p_from public.order_status, p_to public.order_status)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select (p_from, p_to) in (
    ('pending_payment'::public.order_status, 'confirmed'::public.order_status),
    ('pending_payment', 'cancelled'),
    ('confirmed', 'processing'),
    ('confirmed', 'cancelled'),
    ('processing', 'shipped'),
    ('processing', 'cancelled'),
    ('shipped', 'delivered'),
    ('shipped', 'returned'),
    ('delivered', 'returned')
  )
$$;

create function public.status_event(p_order public.orders, p_from public.order_status, p_tracking_number text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object('orderId', p_order.id, 'number', p_order.number, 'email', p_order.email,
    'from', p_from, 'to', p_order.status, 'trackingNumber', coalesce(p_tracking_number, p_order.tracking_number))
$$;

create function public.transition_order(p_order_id uuid, p_to text, p_actor text, p_note text, p_tracking_number text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_order public.orders;
  v_from public.order_status;
  v_to public.order_status := p_to::public.order_status;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'not_found: Order not found.';
  end if;
  v_from := v_order.status;
  if not public.can_transition(v_from, v_to) then
    raise exception 'invalid_transition: An order that is % can''t become %.', replace(v_from::text, '_', ' '), replace(v_to::text, '_', ' ');
  end if;

  -- Stock goes back when an order is cancelled before it leaves the warehouse.
  if v_to = 'cancelled' and v_from not in ('shipped', 'delivered') then
    perform public.restock(
      (select coalesce(jsonb_agg(jsonb_build_object('variant_id', l.variant_id, 'quantity', l.quantity - l.refunded_quantity)), '[]')
       from public.order_lines as l where l.order_id = p_order_id)
    );
  end if;

  update public.orders set
    status = v_to,
    fulfillment_status = case when v_to in ('shipped', 'delivered') then 'fulfilled' when v_to = 'returned' then 'returned' else fulfillment_status end,
    tracking_number = coalesce(p_tracking_number, tracking_number),
    updated_at = now(),
    history = history || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object('from', v_from, 'to', v_to, 'at', now(), 'actor', p_actor, 'note', p_note)))
  where id = p_order_id
  returning * into v_order;

  insert into public.audit_log (actor, action, entity, entity_id, before, after)
    values (p_actor, 'order.transition', 'order', p_order_id::text, jsonb_build_object('status', v_from), jsonb_strip_nulls(jsonb_build_object('status', v_to, 'note', p_note)));
  insert into public.outbox_events (store_id, topic, payload)
    values (v_order.store_id, 'order.status_changed', public.status_event(v_order, v_from, p_tracking_number));
end
$$;

-- Records a payment or advances it (replayed webhooks only move the status). Paid in full
-- confirms a pending order.
create function public.record_payment(
  p_order_id uuid, p_provider text, p_status text, p_amount bigint, p_currency text, p_provider_ref text, p_idempotency_key text
)
returns public.payments
language plpgsql
set search_path = ''
as $$
declare
  v_order public.orders;
  v_payment public.payments;
  v_status public.payment_record_status := p_status::public.payment_record_status;
  v_captured bigint;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'not_found: Order not found.';
  end if;
  if p_amount < 0 then
    raise exception 'validation: Payment amount must be positive.';
  end if;

  insert into public.payments (order_id, provider, status, amount, currency, provider_ref, idempotency_key)
    values (p_order_id, p_provider, v_status, p_amount, p_currency::public.currency_code, p_provider_ref, p_idempotency_key)
  on conflict (order_id, idempotency_key) do update
    set status = excluded.status, provider_ref = coalesce(excluded.provider_ref, public.payments.provider_ref)
    where public.payments.status <> excluded.status;
  select * into v_payment from public.payments where order_id = p_order_id and idempotency_key = p_idempotency_key;

  select coalesce(sum(amount), 0) into v_captured from public.payments where order_id = p_order_id and status = 'captured';
  if v_status = 'failed' and v_captured = 0 then
    update public.orders set payment_status = 'failed' where id = p_order_id;
  end if;
  if v_status = 'authorized' then
    update public.orders set payment_status = 'authorized' where id = p_order_id;
  end if;
  if v_captured >= v_order.total then
    update public.orders set payment_status = 'paid' where id = p_order_id;
    if v_order.status = 'pending_payment' then
      update public.orders set
        status = 'confirmed',
        history = history || jsonb_build_array(jsonb_build_object('from', 'pending_payment', 'to', 'confirmed', 'at', now(), 'actor', 'payment:' || p_provider))
      where id = p_order_id
      returning * into v_order;
      insert into public.outbox_events (store_id, topic, payload)
        values (v_order.store_id, 'order.status_changed', public.status_event(v_order, 'pending_payment', null));
    end if;
  end if;
  update public.orders set updated_at = now() where id = p_order_id;
  insert into public.outbox_events (store_id, topic, payload)
    values (v_order.store_id, 'payment.recorded', jsonb_build_object('orderId', v_order.id, 'number', v_order.number,
      'provider', v_payment.provider, 'status', v_payment.status, 'amount', v_payment.amount));
  return v_payment;
end
$$;

-- Refunds up to what was paid; optional per-line quantities and restock. Idempotent per key.
create function public.create_refund(
  p_order_id uuid, p_payment_id uuid, p_amount bigint, p_reason text, p_lines jsonb, p_restock boolean, p_idempotency_key text
)
returns public.refunds
language plpgsql
set search_path = ''
as $$
declare
  v_order public.orders;
  v_refund public.refunds;
  v_paid bigint;
  v_restock jsonb := '[]';
  r record;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'not_found: Order not found.';
  end if;
  select * into v_refund from public.refunds where order_id = p_order_id and idempotency_key = p_idempotency_key;
  if found then
    return v_refund;
  end if;

  select coalesce(sum(amount), 0) into v_paid from public.payments where order_id = p_order_id and status not in ('failed', 'pending');
  if p_amount <= 0 or v_order.refunded_total + p_amount > v_paid then
    raise exception 'validation: Refund exceeds the amount paid.';
  end if;

  for r in select x.order_line_id, x.quantity from jsonb_to_recordset(p_lines) as x(order_line_id uuid, quantity integer) order by x.order_line_id loop
    update public.order_lines
      set refunded_quantity = refunded_quantity + r.quantity
      where id = r.order_line_id and order_id = p_order_id and r.quantity > 0 and refunded_quantity + r.quantity <= quantity;
    if not found then
      raise exception 'validation: Refund quantity exceeds the quantity bought.';
    end if;
    v_restock := v_restock || jsonb_build_array(jsonb_build_object('variant_id', (select variant_id from public.order_lines where id = r.order_line_id), 'quantity', r.quantity));
  end loop;
  if p_restock then
    perform public.restock(v_restock);
  end if;

  update public.orders set
    refunded_total = refunded_total + p_amount,
    payment_status = case when refunded_total + p_amount >= v_paid then 'refunded' else 'partially_refunded' end::public.payment_status,
    updated_at = now()
  where id = p_order_id;
  if p_payment_id is not null then
    update public.payments set
      refunded_amount = refunded_amount + p_amount,
      status = case when refunded_amount + p_amount >= amount then 'refunded' else 'partially_refunded' end::public.payment_record_status
    where id = p_payment_id and order_id = p_order_id;
  end if;

  insert into public.refunds (order_id, payment_id, amount, reason, lines, restock, idempotency_key)
    values (p_order_id, p_payment_id, p_amount, p_reason, p_lines, p_restock, p_idempotency_key)
    returning * into v_refund;
  insert into public.outbox_events (store_id, topic, payload)
    values (v_order.store_id, 'refund.created', jsonb_build_object('orderId', v_order.id, 'number', v_order.number, 'email', v_order.email, 'amount', p_amount));
  return v_refund;
end
$$;

create function public.create_return(p_order_id uuid, p_lines jsonb, p_reason text)
returns public.returns
language plpgsql
set search_path = ''
as $$
declare
  v_order public.orders;
  v_return public.returns;
  r record;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'not_found: Order not found.';
  end if;
  if exists (select 1 from public.returns where order_id = p_order_id and status <> 'rejected') then
    raise exception 'conflict: A return is already open for this order.';
  end if;
  for r in select x.order_line_id, x.quantity from jsonb_to_recordset(p_lines) as x(order_line_id uuid, quantity integer) loop
    if not exists (
      select 1 from public.order_lines
      where id = r.order_line_id and order_id = p_order_id and r.quantity > 0 and r.quantity <= quantity - refunded_quantity
    ) then
      raise exception 'validation: Return quantity exceeds the quantity bought.';
    end if;
  end loop;
  insert into public.returns (order_id, lines, reason) values (p_order_id, p_lines, p_reason) returning * into v_return;
  insert into public.outbox_events (store_id, topic, payload)
    values (v_order.store_id, 'return.requested', jsonb_build_object('orderId', v_order.id, 'number', v_order.number, 'email', v_order.email, 'returnId', v_return.id));
  return v_return;
end
$$;

-- Receives a return and restocks its lines; receiving twice is a no-op.
create function public.restock_return(p_return_id uuid, p_actor text)
returns public.returns
language plpgsql
set search_path = ''
as $$
declare
  v_return public.returns;
begin
  select * into v_return from public.returns where id = p_return_id for update;
  if not found then
    raise exception 'not_found: Return not found.';
  end if;
  if v_return.status = 'received' then
    return v_return;
  end if;
  if v_return.status = 'rejected' then
    raise exception 'invalid_transition: A rejected return can''t be received.';
  end if;
  perform public.restock(
    (select coalesce(jsonb_agg(jsonb_build_object('variant_id', l.variant_id, 'quantity', x.quantity)), '[]')
     from jsonb_to_recordset(v_return.lines) as x(order_line_id uuid, quantity integer)
     join public.order_lines as l on l.id = x.order_line_id)
  );
  update public.returns set status = 'received' where id = p_return_id returning * into v_return;
  insert into public.audit_log (actor, action, entity, entity_id, before, after)
    values (p_actor, 'return.restock', 'return', p_return_id::text, null, v_return.lines);
  return v_return;
end
$$;

create function public.anonymise_customer_orders(p_customer_id uuid)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.orders set
    email = 'deleted+' || left(id::text, 8) || '@invalid',
    phone = '',
    shipping_address = jsonb_build_object('fullName', 'Deleted customer', 'phone', '', 'line1', '',
      'city', shipping_address ->> 'city', 'province', shipping_address ->> 'province', 'country', shipping_address ->> 'country'),
    customer_id = null,
    updated_at = now()
  where customer_id = p_customer_id;
  get diagnostics v_count = row_count;
  return v_count;
end
$$;

-- ─── Customers ──────────────────────────────────────────────────────────────

create function public.save_address(p_customer_id uuid, p_address jsonb)
returns public.addresses
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid := (p_address ->> 'id')::uuid;
  v_default boolean;
  v_saved public.addresses;
begin
  perform 1 from public.customers where id = p_customer_id for update;
  v_default := coalesce((p_address ->> 'is_default')::boolean, false)
    or not exists (select 1 from public.addresses where customer_id = p_customer_id and id is distinct from v_id);
  if v_id is not null and not exists (select 1 from public.addresses where id = v_id and customer_id = p_customer_id) then
    raise exception 'not_found: Address not found.';
  end if;
  if v_default then
    update public.addresses set is_default = false where customer_id = p_customer_id and is_default;
  end if;
  insert into public.addresses (id, customer_id, full_name, phone, line1, line2, city, province, postal_code, country, is_default)
    values (coalesce(v_id, gen_random_uuid()), p_customer_id, p_address ->> 'full_name', p_address ->> 'phone', p_address ->> 'line1',
      p_address ->> 'line2', p_address ->> 'city', p_address ->> 'province', p_address ->> 'postal_code', p_address ->> 'country', v_default)
  on conflict (id) do update set
    full_name = excluded.full_name, phone = excluded.phone, line1 = excluded.line1, line2 = excluded.line2,
    city = excluded.city, province = excluded.province, postal_code = excluded.postal_code, country = excluded.country,
    is_default = excluded.is_default
  returning * into v_saved;
  return v_saved;
end
$$;

create function public.delete_address(p_customer_id uuid, p_address_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_was_default boolean;
begin
  perform 1 from public.customers where id = p_customer_id for update;
  delete from public.addresses where id = p_address_id and customer_id = p_customer_id returning is_default into v_was_default;
  if not found then
    raise exception 'not_found: Address not found.';
  end if;
  if v_was_default then
    update public.addresses set is_default = true
      where id = (select id from public.addresses where customer_id = p_customer_id order by id limit 1);
  end if;
end
$$;

-- Erases a customer's personal data, keeping the row so orders stay consistent.
create function public.scrub_customer(p_customer_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  update public.customers set
    email = 'deleted+' || id::text || '@invalid',
    password_hash = '',
    full_name = 'Deleted customer',
    phone = null,
    marketing_opt_in = false,
    deletion_requested_at = coalesce(deletion_requested_at, now())
  where id = p_customer_id;
  delete from public.addresses where customer_id = p_customer_id;
  delete from public.sessions where customer_id = p_customer_id;
  delete from public.password_resets where customer_id = p_customer_id;
end
$$;

-- ─── Content ────────────────────────────────────────────────────────────────

-- True when the address is newly (re)subscribed; false when it already was.
create function public.subscribe_newsletter(p_store_id text, p_email text, p_source text)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_status text;
begin
  select status into v_status from public.newsletter_subscribers where store_id = p_store_id and email = lower(p_email) for update;
  if v_status = 'subscribed' then
    return false;
  end if;
  insert into public.newsletter_subscribers (store_id, email, source, status, consent_at)
    values (p_store_id, lower(p_email), p_source, 'subscribed', now())
  on conflict (store_id, email) do update set source = excluded.source, status = 'subscribed', consent_at = now();
  return true;
end
$$;

-- ─── Catalogue import ───────────────────────────────────────────────────────

-- Upserts products (domain shape, camelCase) by slug: brand by slug, images and collection links
-- replaced, variants upserted by id, an inventory row ensured per variant. Returns the count.
create function public.import_products(p_store_id text, p_products jsonb)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  p jsonb;
  v_brand uuid;
  v_product uuid;
begin
  for p in select value from jsonb_array_elements(p_products) loop
    insert into public.brands (id, store_id, slug, name, position)
      values ((p -> 'brand' ->> 'id')::uuid, p_store_id, p -> 'brand' ->> 'slug', p -> 'brand' ->> 'name', coalesce((p -> 'brand' ->> 'position')::integer, 0))
    on conflict (store_id, slug) do update set name = excluded.name
    returning id into v_brand;

    insert into public.products (
      id, store_id, slug, title, brand_id, kind, gender, status, description, condition_grade, condition_notes,
      attributes, custom_fields, tags, position, published_at, seo, updated_at
    ) values (
      (p ->> 'id')::uuid, p_store_id, p ->> 'slug', p ->> 'title', v_brand, (p ->> 'kind')::public.product_kind,
      (p ->> 'gender')::public.product_gender, (p ->> 'status')::public.product_status, coalesce(p ->> 'description', ''),
      (p ->> 'condition')::public.condition_grade, p ->> 'conditionNotes', coalesce(p -> 'attributes', '{}'),
      coalesce(p -> 'customFields', '{}'), array(select jsonb_array_elements_text(coalesce(p -> 'tags', '[]'))),
      coalesce((p ->> 'position')::integer, 0), coalesce((p ->> 'publishedAt')::timestamptz, now()), coalesce(p -> 'seo', '{}'), now()
    )
    on conflict (store_id, slug) do update set
      title = excluded.title, brand_id = excluded.brand_id, kind = excluded.kind, gender = excluded.gender,
      status = excluded.status, description = excluded.description, condition_grade = excluded.condition_grade,
      condition_notes = excluded.condition_notes, attributes = excluded.attributes, custom_fields = excluded.custom_fields,
      tags = excluded.tags, position = excluded.position, published_at = excluded.published_at, seo = excluded.seo, updated_at = now()
    returning id into v_product;

    delete from public.product_images where product_id = v_product;
    insert into public.product_images (product_id, url, alt, width, height, role, position)
      select v_product, image ->> 'url', coalesce(image ->> 'alt', ''), (image ->> 'width')::integer, (image ->> 'height')::integer,
        coalesce(image ->> 'role', 'gallery')::public.image_role, (ordinality - 1)::integer
      from jsonb_array_elements(coalesce(p -> 'images', '[]')) with ordinality as images (image, ordinality);

    insert into public.variants (id, product_id, sku, size_eu, size_uk, size_us, size_cm, attributes, weight_grams, position)
      select (v ->> 'id')::uuid, v_product, v ->> 'sku', v -> 'size' ->> 'eu', v -> 'size' ->> 'uk', v -> 'size' ->> 'us', v -> 'size' ->> 'cm',
        coalesce(v -> 'attributes', '{}'), coalesce((v ->> 'weightGrams')::integer, 0), coalesce((v ->> 'position')::integer, 0)
      from jsonb_array_elements(coalesce(p -> 'variants', '[]')) as variants (v)
    on conflict (id) do update set
      product_id = excluded.product_id, sku = excluded.sku, size_eu = excluded.size_eu, size_uk = excluded.size_uk,
      size_us = excluded.size_us, size_cm = excluded.size_cm, attributes = excluded.attributes,
      weight_grams = excluded.weight_grams, position = excluded.position;
    insert into public.inventory_levels (variant_id)
      select (v ->> 'id')::uuid from jsonb_array_elements(coalesce(p -> 'variants', '[]')) as variants (v)
    on conflict (variant_id) do nothing;

    delete from public.collection_products where product_id = v_product;
    insert into public.collection_products (collection_id, product_id)
      select c.id, v_product from public.collections as c
      where c.store_id = p_store_id and c.slug in (select jsonb_array_elements_text(coalesce(p -> 'collections', '[]')));
  end loop;
  return jsonb_array_length(p_products);
end
$$;

-- ─── Platform ───────────────────────────────────────────────────────────────

-- Claims due events for one worker run: each is pushed a minute out so a crashed run retries.
create function public.claim_outbox_events(p_limit integer)
returns setof public.outbox_events
language sql
set search_path = ''
as $$
  update public.outbox_events set attempts = attempts + 1, available_at = now() + interval '1 minute'
  where id in (
    select id from public.outbox_events
    where status = 'pending' and available_at <= now()
    order by available_at
    limit p_limit
    for update skip locked
  )
  returning *
$$;

-- Exponential back-off (30 s × 2^attempts) until max attempts, then failed.
create function public.fail_outbox_event(p_id uuid, p_error text, p_max_attempts integer)
returns void
language sql
set search_path = ''
as $$
  update public.outbox_events set
    last_error = p_error,
    status = case when attempts >= p_max_attempts then 'failed'::public.outbox_status else status end,
    available_at = case when attempts >= p_max_attempts then available_at else now() + make_interval(secs => 30 * power(2, attempts)) end
  where id = p_id
$$;

-- Fixed-window counter; returns the hit count in the current window.
create function public.rate_limit_hit(p_key text, p_window_seconds integer)
returns integer
language sql
set search_path = ''
as $$
  insert into public.rate_limits as limits (key, window_start, count)
    values (p_key, to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds), 1)
  on conflict (key) do update set
    count = case when limits.window_start = excluded.window_start then limits.count + 1 else 1 end,
    window_start = excluded.window_start
  returning count
$$;

-- ─── Privileges: RPCs are for the service role only ─────────────────────────
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as signature
    from pg_proc as p join pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname not in ('staff_role', 'has_staff_role')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.signature);
    execute format('grant execute on function %s to service_role', f.signature);
  end loop;
end
$$;

alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
