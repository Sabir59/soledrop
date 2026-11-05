-- Search: merchant synonym groups, the search/click log behind "trending" and zero-result
-- reports, and trigram support. Matching itself runs in server/search/match.ts for both data
-- drivers (identical ranking); Postgres supplies storage, trending aggregation and trigram indexes
-- for the merchant-facing reports (design-decisions D-041).
-- Supabase installs extensions in the `extensions` schema; created here when missing (local, tests).

create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;

-- ─── Synonyms ───────────────────────────────────────────────────────────────
create table public.search_synonyms (
  id uuid primary key default gen_random_uuid(),
  store_id text not null references public.stores (id) on delete cascade,
  term text not null check (length(trim(term)) > 0),
  synonyms text[] not null check (cardinality(synonyms) > 0),
  unique (store_id, term)
);

-- ─── Search and click log ───────────────────────────────────────────────────
-- One row per completed search (result_count set) or per result click (clicked_slug set).
create table public.search_queries (
  id uuid primary key default gen_random_uuid(),
  store_id text not null references public.stores (id) on delete cascade,
  query text not null check (length(query) between 1 and 100),
  normalized text not null check (length(normalized) between 1 and 100),
  result_count integer check (result_count >= 0),
  clicked_slug text,
  source text not null check (source in ('overlay', 'page')),
  created_at timestamptz not null default now(),
  check ((result_count is null) <> (clicked_slug is null))
);

create index search_queries_trending_idx on public.search_queries (store_id, created_at desc) where clicked_slug is null;
create index search_queries_normalized_trgm_idx on public.search_queries using gin (normalized extensions.gin_trgm_ops);
create index products_title_trgm_idx on public.products using gin (lower(title) extensions.gin_trgm_ops);

-- ─── Trending ───────────────────────────────────────────────────────────────
-- Most frequent searches that found something in the last p_days. Service role only.
create function public.search_trending(p_store_id text, p_days integer, p_limit integer)
returns table (query text, count bigint)
language sql
stable
set search_path = ''
as $$
  select q.normalized as query, count(*) as count
  from public.search_queries as q
  where q.store_id = p_store_id
    and q.clicked_slug is null
    and q.result_count > 0
    and q.created_at >= now() - make_interval(days => greatest(p_days, 1))
  group by q.normalized
  order by count(*) desc, q.normalized
  limit least(greatest(p_limit, 1), 50)
$$;

revoke all on function public.search_trending(text, integer, integer) from public;
grant execute on function public.search_trending(text, integer, integer) to service_role;

-- ─── Row level security ─────────────────────────────────────────────────────
alter table public.search_synonyms enable row level security;
alter table public.search_queries enable row level security;
revoke all on table public.search_synonyms, public.search_queries from anon, authenticated;
grant all on table public.search_synonyms, public.search_queries to service_role;

-- Synonyms are storefront configuration: readable like the catalogue, managed by owners/managers.
grant select on public.search_synonyms to anon, authenticated;
create policy storefront_read on public.search_synonyms for select to anon, authenticated using (true);
grant insert, update, delete on public.search_synonyms to authenticated;
create policy staff_write on public.search_synonyms for all to authenticated
  using (public.has_staff_role(store_id, '{owner,manager}'))
  with check (public.has_staff_role(store_id, '{owner,manager}'));

-- The log may hold what shoppers typed: staff (owner/manager) read it, nobody else; the server writes it.
grant select on public.search_queries to authenticated;
create policy staff_read on public.search_queries for select to authenticated
  using (public.has_staff_role(store_id, '{owner,manager}'));
