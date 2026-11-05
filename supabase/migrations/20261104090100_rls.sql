-- Row level security: on for every table, deny by default.
-- The storefront server uses the service role (BYPASSRLS) and never ships its key to the browser.
-- anon/authenticated get only what a policy below grants: shoppers read the published catalogue
-- and content; staff (Supabase Auth users listed in staff_members, phase 2 admin) act by role.

-- ─── Role lookup ────────────────────────────────────────────────────────────
-- SECURITY DEFINER so policies can read staff_members without granting it; empty search_path so
-- nothing in the caller's path can shadow the tables it reads.
create function public.staff_role(p_store_id text)
returns public.staff_role
language sql
stable
security definer
set search_path = ''
as $$
  select member.role
  from public.staff_members as member
  where member.user_id = (select auth.uid()) and member.store_id = p_store_id
$$;

create function public.has_staff_role(p_store_id text, p_roles public.staff_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.staff_role(p_store_id) = any (p_roles), false)
$$;

revoke all on function public.staff_role(text) from public;
revoke all on function public.has_staff_role(text, public.staff_role[]) from public;
grant execute on function public.staff_role(text) to authenticated, service_role;
grant execute on function public.has_staff_role(text, public.staff_role[]) to authenticated, service_role;

-- ─── Enable RLS everywhere; start from no privileges ────────────────────────
do $$
declare
  t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
    execute format('revoke all on table public.%I from anon, authenticated', t.tablename);
    execute format('grant all on table public.%I to service_role', t.tablename);
  end loop;
end
$$;

-- ─── Storefront reads (anon + authenticated) ────────────────────────────────
grant select on public.stores, public.brands, public.attribute_definitions, public.custom_field_definitions,
  public.collections, public.products, public.product_images, public.variants, public.collection_products,
  public.price_lists, public.prices, public.exchange_rates, public.shipping_zones, public.shipping_rates,
  public.tax_rates, public.pages, public.faqs
  to anon, authenticated;

create policy storefront_read on public.stores for select to anon, authenticated using (true);
create policy storefront_read on public.brands for select to anon, authenticated using (true);
create policy storefront_read on public.attribute_definitions for select to anon, authenticated using (true);
create policy storefront_read on public.custom_field_definitions for select to anon, authenticated using (visible_on_storefront);
create policy storefront_read on public.collections for select to anon, authenticated using (true);
create policy storefront_read on public.products for select to anon, authenticated using (status = 'active');
create policy storefront_read on public.product_images for select to anon, authenticated
  using (exists (select 1 from public.products as p where p.id = product_id and p.status = 'active'));
create policy storefront_read on public.variants for select to anon, authenticated
  using (exists (select 1 from public.products as p where p.id = product_id and p.status = 'active'));
create policy storefront_read on public.collection_products for select to anon, authenticated
  using (exists (select 1 from public.products as p where p.id = product_id and p.status = 'active'));
create policy storefront_read on public.price_lists for select to anon, authenticated
  using ((starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()));
create policy storefront_read on public.prices for select to anon, authenticated
  using (exists (select 1 from public.variants as v join public.products as p on p.id = v.product_id where v.id = variant_id and p.status = 'active'));
create policy storefront_read on public.exchange_rates for select to anon, authenticated using (true);
create policy storefront_read on public.shipping_zones for select to anon, authenticated using (true);
create policy storefront_read on public.shipping_rates for select to anon, authenticated using (true);
create policy storefront_read on public.tax_rates for select to anon, authenticated using (true);
create policy storefront_read on public.pages for select to anon, authenticated using (published);
create policy storefront_read on public.faqs for select to anon, authenticated using (true);

-- ─── Staff (authenticated + staff_members) ──────────────────────────────────
-- Owners and managers run the shop: catalogue, pricing, shipping, tax, promotions, content, flags.
do $$
declare
  t text;
begin
  foreach t in array array['brands', 'attribute_definitions', 'custom_field_definitions', 'collections', 'products',
    'price_lists', 'exchange_rates', 'shipping_zones', 'tax_rates', 'promotions', 'pages', 'faqs', 'feature_flags'] loop
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
    execute format(
      'create policy staff_manage on public.%I for all to authenticated
         using (public.has_staff_role(store_id, ''{owner,manager}''))
         with check (public.has_staff_role(store_id, ''{owner,manager}''))', t);
  end loop;
end
$$;

-- Child rows follow their parent's store.
grant select, insert, update, delete on public.product_images, public.variants, public.collection_products, public.prices, public.shipping_rates to authenticated;
create policy staff_manage on public.product_images for all to authenticated
  using (exists (select 1 from public.products as p where p.id = product_id and public.has_staff_role(p.store_id, '{owner,manager}')))
  with check (exists (select 1 from public.products as p where p.id = product_id and public.has_staff_role(p.store_id, '{owner,manager}')));
create policy staff_manage on public.variants for all to authenticated
  using (exists (select 1 from public.products as p where p.id = product_id and public.has_staff_role(p.store_id, '{owner,manager}')))
  with check (exists (select 1 from public.products as p where p.id = product_id and public.has_staff_role(p.store_id, '{owner,manager}')));
create policy staff_manage on public.collection_products for all to authenticated
  using (exists (select 1 from public.products as p where p.id = product_id and public.has_staff_role(p.store_id, '{owner,manager}')))
  with check (exists (select 1 from public.products as p where p.id = product_id and public.has_staff_role(p.store_id, '{owner,manager}')));
create policy staff_manage on public.prices for all to authenticated
  using (exists (select 1 from public.price_lists as l where l.id = price_list_id and public.has_staff_role(l.store_id, '{owner,manager}')))
  with check (exists (select 1 from public.price_lists as l where l.id = price_list_id and public.has_staff_role(l.store_id, '{owner,manager}')));
create policy staff_manage on public.shipping_rates for all to authenticated
  using (exists (select 1 from public.shipping_zones as z where z.id = zone_id and public.has_staff_role(z.store_id, '{owner,manager}')))
  with check (exists (select 1 from public.shipping_zones as z where z.id = zone_id and public.has_staff_role(z.store_id, '{owner,manager}')));

-- Orders and stock are read by every staff role; they change only through the RPCs
-- (transition_order, record_payment, create_refund, restock_return, adjust_stock), which the
-- server calls after checking the staff role, so the state machine cannot be bypassed.
grant select on public.orders, public.order_lines, public.payments, public.refunds, public.returns,
  public.inventory_levels, public.inventory_movements, public.promotion_redemptions to authenticated;
create policy staff_read on public.orders for select to authenticated
  using (public.has_staff_role(store_id, '{owner,manager,fulfilment,support}'));
create policy staff_read on public.order_lines for select to authenticated
  using (exists (select 1 from public.orders as o where o.id = order_id and public.has_staff_role(o.store_id, '{owner,manager,fulfilment,support}')));
create policy staff_read on public.payments for select to authenticated
  using (exists (select 1 from public.orders as o where o.id = order_id and public.has_staff_role(o.store_id, '{owner,manager,support}')));
create policy staff_read on public.refunds for select to authenticated
  using (exists (select 1 from public.orders as o where o.id = order_id and public.has_staff_role(o.store_id, '{owner,manager,support}')));
create policy staff_read on public.returns for select to authenticated
  using (exists (select 1 from public.orders as o where o.id = order_id and public.has_staff_role(o.store_id, '{owner,manager,fulfilment,support}')));
create policy staff_read on public.inventory_levels for select to authenticated
  using (exists (select 1 from public.variants as v join public.products as p on p.id = v.product_id where v.id = variant_id and public.has_staff_role(p.store_id, '{owner,manager,fulfilment}')));
create policy staff_read on public.inventory_movements for select to authenticated
  using (exists (select 1 from public.variants as v join public.products as p on p.id = v.product_id where v.id = variant_id and public.has_staff_role(p.store_id, '{owner,manager,fulfilment}')));
create policy staff_read on public.promotion_redemptions for select to authenticated
  using (exists (select 1 from public.promotions as p where p.id = promotion_id and public.has_staff_role(p.store_id, '{owner,manager}')));

-- Customer data: support and above can read; nobody but the service role can write.
grant select on public.customers, public.addresses, public.contact_messages, public.newsletter_subscribers to authenticated;
create policy staff_read on public.customers for select to authenticated
  using (public.has_staff_role(store_id, '{owner,manager,support}'));
create policy staff_read on public.addresses for select to authenticated
  using (exists (select 1 from public.customers as c where c.id = customer_id and public.has_staff_role(c.store_id, '{owner,manager,support}')));
create policy staff_read on public.contact_messages for select to authenticated
  using (public.has_staff_role(store_id, '{owner,manager,support}'));
create policy staff_read on public.newsletter_subscribers for select to authenticated
  using (public.has_staff_role(store_id, '{owner,manager}'));

-- Staff membership: everyone sees their own row; owners manage the team.
grant select, insert, update, delete on public.staff_members to authenticated;
create policy own_membership on public.staff_members for select to authenticated using (user_id = (select auth.uid()));
create policy owner_manage on public.staff_members for all to authenticated
  using (public.has_staff_role(store_id, '{owner}'))
  with check (public.has_staff_role(store_id, '{owner}'));

-- Audit log: owners and managers read; it is append-only for everyone.
grant select on public.audit_log to authenticated;
create policy staff_read on public.audit_log for select to authenticated
  using (exists (select 1 from public.staff_members as m where m.user_id = (select auth.uid()) and m.role in ('owner', 'manager')));

create function public.reject_audit_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit_log is append-only';
end
$$;

create trigger audit_log_append_only
  before update or delete on public.audit_log
  for each row execute function public.reject_audit_change();

-- No policies (service role only): carts, cart_lines, inventory_reservations, sessions,
-- password_resets, outbox_events, webhook_deliveries, rate_limits, idempotency_keys.
