-- The Gilantre Exchange: a World 1 player market with server-held escrow.
--
-- Every write goes through a security-definer function that locks the rows it
-- touches, so a listing sells at most once, a buyer can never spend gold they do
-- not hold on the server, items leave the seller when listed, and proceeds and
-- returns are collected exactly once. Only the World 1 server (service_role)
-- may call these functions or read the table.

create table if not exists public.market_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users(id) on delete cascade,
  seller_name text not null check (length(seller_name) between 1 and 24),
  kind text not null check (kind in ('good','material','gear')),
  item_id text not null check (item_id ~ '^[a-z0-9_]{1,48}$'),
  qty integer not null check (qty between 1 and 9999),
  price integer not null check (price between 1 and 1000000),
  fee integer not null check (fee >= 0),
  status text not null default 'active' check (status in ('active','sold','cancelled','expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  buyer_id uuid references auth.users(id) on delete set null,
  buyer_name text,
  sold_at timestamptz,
  settled boolean not null default false
);
create index if not exists market_listings_browse_idx on public.market_listings(status, item_id, price);
create index if not exists market_listings_recent_idx on public.market_listings(status, created_at desc);
create index if not exists market_listings_seller_idx on public.market_listings(seller_id, status);
alter table public.market_listings enable row level security;
revoke all on public.market_listings from anon, authenticated;
grant select on public.market_listings to service_role;

/** List: take the items out of the seller's World 1 inventory and open the listing. */
create or replace function public.market_list(
  p_seller uuid, p_seller_name text, p_kind text, p_item_id text, p_qty integer,
  p_price integer, p_hours integer, p_max_active integer, p_fee_bp integer
) returns table(listing_id uuid, version bigint)
language plpgsql security definer set search_path = public
as $$
declare
  state_doc jsonb;
  current_version bigint;
  have bigint;
  active_count integer;
  new_id uuid;
begin
  if p_kind not in ('good','material','gear') or p_item_id !~ '^[a-z0-9_]{1,48}$'
     or p_qty is null or p_qty < 1 or p_qty > 9999 or (p_kind = 'gear' and p_qty <> 1)
     or p_price is null or p_price < 1 or p_price > 1000000
     or p_hours is null or p_hours < 1 or p_hours > 168
     or p_fee_bp is null or p_fee_bp < 0 or p_fee_bp > 2000
     or p_max_active is null or p_max_active < 1 or p_max_active > 100 then
    raise exception 'market_invalid';
  end if;

  select c.state, c.version into state_doc, current_version
  from public.characters c where c.user_id = p_seller for update;
  if state_doc is null then raise exception 'character_not_found'; end if;

  select count(*) into active_count from public.market_listings
  where seller_id = p_seller and status = 'active' and expires_at > now();
  if active_count >= p_max_active then raise exception 'market_limit'; end if;

  if p_kind = 'gear' then
    if coalesce((state_doc->'crafted'->>p_item_id)::boolean, false) is not true then
      raise exception 'market_not_owned';
    end if;
    state_doc := state_doc #- array['crafted', p_item_id];
  else
    have := coalesce((state_doc->(case when p_kind = 'good' then 'goods' else 'materials' end)->>p_item_id)::bigint, 0);
    if have < p_qty then raise exception 'market_not_owned'; end if;
    state_doc := jsonb_set(state_doc, array[case when p_kind = 'good' then 'goods' else 'materials' end, p_item_id], to_jsonb(have - p_qty), true);
  end if;

  update public.characters as c set state = state_doc, version = c.version + 1, updated_at = now()
  where c.user_id = p_seller returning c.version into current_version;

  insert into public.market_listings(seller_id, seller_name, kind, item_id, qty, price, fee, expires_at)
  values (p_seller, p_seller_name, p_kind, p_item_id, p_qty, p_price, (p_price::bigint * p_fee_bp / 10000)::integer, now() + make_interval(hours => p_hours))
  returning id into new_id;
  return query select new_id, current_version;
end;
$$;

/** Buy: the listing must still be open; gold leaves the buyer and the items arrive. */
create or replace function public.market_buy(p_listing uuid, p_buyer uuid, p_buyer_name text)
returns table(kind text, item_id text, qty integer, price integer, version bigint)
language plpgsql security definer set search_path = public
as $$
declare
  l public.market_listings%rowtype;
  state_doc jsonb;
  current_version bigint;
  gold_now bigint;
  have bigint;
  bag text;
begin
  select * into l from public.market_listings m where m.id = p_listing for update;
  if not found or l.status <> 'active' or l.expires_at <= now() then raise exception 'market_gone'; end if;
  if l.seller_id = p_buyer then raise exception 'market_own'; end if;

  select c.state, c.version into state_doc, current_version
  from public.characters c where c.user_id = p_buyer for update;
  if state_doc is null then raise exception 'character_not_found'; end if;

  gold_now := coalesce((state_doc->>'gold')::bigint, 0);
  if gold_now < l.price then raise exception 'market_gold'; end if;
  state_doc := jsonb_set(state_doc, '{gold}', to_jsonb(gold_now - l.price), true);

  if l.kind = 'gear' then
    if coalesce((state_doc->'crafted'->>l.item_id)::boolean, false) then raise exception 'market_have_gear'; end if;
    state_doc := jsonb_set(state_doc, '{crafted}', coalesce(state_doc->'crafted', '{}'::jsonb), true);
    state_doc := jsonb_set(state_doc, array['crafted', l.item_id], 'true'::jsonb, true);
  else
    bag := case when l.kind = 'good' then 'goods' else 'materials' end;
    have := coalesce((state_doc->bag->>l.item_id)::bigint, 0);
    if have + l.qty > 99999 then raise exception 'market_full'; end if;
    state_doc := jsonb_set(state_doc, array[bag], coalesce(state_doc->bag, '{}'::jsonb), true);
    state_doc := jsonb_set(state_doc, array[bag, l.item_id], to_jsonb(have + l.qty), true);
  end if;

  update public.characters as c set state = state_doc, gold = (state_doc->>'gold')::integer,
    version = c.version + 1, updated_at = now()
  where c.user_id = p_buyer returning c.version into current_version;

  update public.market_listings set status = 'sold', buyer_id = p_buyer, buyer_name = p_buyer_name, sold_at = now()
  where id = p_listing;
  return query select l.kind, l.item_id, l.qty, l.price, current_version;
end;
$$;

/** Cancel: the seller takes an open (or lapsed) listing down and gets the items straight back. */
create or replace function public.market_cancel(p_listing uuid, p_seller uuid)
returns table(kind text, item_id text, qty integer, version bigint)
language plpgsql security definer set search_path = public
as $$
declare
  l public.market_listings%rowtype;
  state_doc jsonb;
  current_version bigint;
  have bigint;
  bag text;
begin
  select * into l from public.market_listings m where m.id = p_listing for update;
  if not found or l.seller_id <> p_seller or l.status <> 'active' then raise exception 'market_gone'; end if;

  select c.state, c.version into state_doc, current_version
  from public.characters c where c.user_id = p_seller for update;
  if state_doc is null then raise exception 'character_not_found'; end if;

  if l.kind = 'gear' then
    state_doc := jsonb_set(state_doc, '{crafted}', coalesce(state_doc->'crafted', '{}'::jsonb), true);
    state_doc := jsonb_set(state_doc, array['crafted', l.item_id], 'true'::jsonb, true);
  else
    bag := case when l.kind = 'good' then 'goods' else 'materials' end;
    have := coalesce((state_doc->bag->>l.item_id)::bigint, 0);
    state_doc := jsonb_set(state_doc, array[bag], coalesce(state_doc->bag, '{}'::jsonb), true);
    state_doc := jsonb_set(state_doc, array[bag, l.item_id], to_jsonb(least(99999, have + l.qty)), true);
  end if;

  update public.characters as c set state = state_doc, version = c.version + 1, updated_at = now()
  where c.user_id = p_seller returning c.version into current_version;
  update public.market_listings set status = 'cancelled', settled = true where id = p_listing;
  return query select l.kind, l.item_id, l.qty, current_version;
end;
$$;

/**
 * Collect: pay the seller for every sale not yet collected (price less the fee), and hand back the
 * items of listings that ran out of time. Returns what moved so the server can tell the client.
 */
create or replace function public.market_collect(p_seller uuid)
returns table(gold integer, items jsonb, version bigint)
language plpgsql security definer set search_path = public
as $$
declare
  l record;
  state_doc jsonb;
  current_version bigint;
  earned bigint := 0;
  returned jsonb := '[]'::jsonb;
  have bigint;
  bag text;
begin
  select c.state, c.version into state_doc, current_version
  from public.characters c where c.user_id = p_seller for update;
  if state_doc is null then raise exception 'character_not_found'; end if;

  for l in select * from public.market_listings m
    where m.seller_id = p_seller and ((m.status = 'sold' and not m.settled) or (m.status = 'active' and m.expires_at <= now()))
    for update
  loop
    if l.status = 'sold' then
      earned := earned + (l.price - l.fee);
      update public.market_listings set settled = true where id = l.id;
    else
      if l.kind = 'gear' then
        state_doc := jsonb_set(state_doc, '{crafted}', coalesce(state_doc->'crafted', '{}'::jsonb), true);
        state_doc := jsonb_set(state_doc, array['crafted', l.item_id], 'true'::jsonb, true);
      else
        bag := case when l.kind = 'good' then 'goods' else 'materials' end;
        have := coalesce((state_doc->bag->>l.item_id)::bigint, 0);
        state_doc := jsonb_set(state_doc, array[bag], coalesce(state_doc->bag, '{}'::jsonb), true);
        state_doc := jsonb_set(state_doc, array[bag, l.item_id], to_jsonb(least(99999, have + l.qty)), true);
      end if;
      returned := returned || jsonb_build_object('kind', l.kind, 'id', l.item_id, 'qty', l.qty);
      update public.market_listings set status = 'expired', settled = true where id = l.id;
    end if;
  end loop;

  if earned > 0 then
    state_doc := jsonb_set(state_doc, '{gold}', to_jsonb(least(1000000, coalesce((state_doc->>'gold')::bigint, 0) + earned)), true);
  end if;
  if earned > 0 or jsonb_array_length(returned) > 0 then
    update public.characters as c set state = state_doc, gold = (state_doc->>'gold')::integer,
      version = c.version + 1, updated_at = now()
    where c.user_id = p_seller returning c.version into current_version;
  end if;
  return query select earned::integer, returned, current_version;
end;
$$;

/**
 * Mirror what a hunter used or sold in their own game onto their World 1 inventory. Only ever lowers
 * counts (never below zero), so a client can report spending but can never add anything this way.
 */
create or replace function public.inventory_spend(p_user uuid, p_gold integer, p_goods jsonb, p_materials jsonb, p_gear jsonb)
returns table(version bigint)
language plpgsql security definer set search_path = public
as $$
declare
  state_doc jsonb;
  current_version bigint;
  k text;
  v text;
  have bigint;
  g text;
begin
  if p_gold is null or p_gold < 0 or p_gold > 1000000 then raise exception 'spend_invalid'; end if;
  select c.state, c.version into state_doc, current_version
  from public.characters c where c.user_id = p_user for update;
  if state_doc is null then raise exception 'character_not_found'; end if;

  if p_gold > 0 then
    state_doc := jsonb_set(state_doc, '{gold}', to_jsonb(greatest(0, coalesce((state_doc->>'gold')::bigint, 0) - p_gold)), true);
  end if;
  for k, v in select * from jsonb_each_text(coalesce(p_goods, '{}'::jsonb)) loop
    if k !~ '^[a-z0-9_]{1,48}$' or v::bigint < 0 then raise exception 'spend_invalid'; end if;
    have := coalesce((state_doc->'goods'->>k)::bigint, 0);
    if have > 0 then state_doc := jsonb_set(state_doc, array['goods', k], to_jsonb(greatest(0, have - v::bigint)), true); end if;
  end loop;
  for k, v in select * from jsonb_each_text(coalesce(p_materials, '{}'::jsonb)) loop
    if k !~ '^[a-z0-9_]{1,48}$' or v::bigint < 0 then raise exception 'spend_invalid'; end if;
    have := coalesce((state_doc->'materials'->>k)::bigint, 0);
    if have > 0 then state_doc := jsonb_set(state_doc, array['materials', k], to_jsonb(greatest(0, have - v::bigint)), true); end if;
  end loop;
  for g in select * from jsonb_array_elements_text(coalesce(p_gear, '[]'::jsonb)) loop
    if g !~ '^[a-z0-9_]{1,48}$' then raise exception 'spend_invalid'; end if;
    state_doc := state_doc #- array['crafted', g];
  end loop;

  update public.characters as c set state = state_doc, gold = coalesce((state_doc->>'gold')::integer, c.gold),
    version = c.version + 1, updated_at = now()
  where c.user_id = p_user returning c.version into current_version;
  return query select current_version;
end;
$$;

revoke all on function public.market_list(uuid,text,text,text,integer,integer,integer,integer,integer) from public, anon, authenticated;
revoke all on function public.market_buy(uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.market_cancel(uuid,uuid) from public, anon, authenticated;
revoke all on function public.market_collect(uuid) from public, anon, authenticated;
revoke all on function public.inventory_spend(uuid,integer,jsonb,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.market_list(uuid,text,text,text,integer,integer,integer,integer,integer) to service_role;
grant execute on function public.market_buy(uuid,uuid,text) to service_role;
grant execute on function public.market_cancel(uuid,uuid) to service_role;
grant execute on function public.market_collect(uuid) to service_role;
grant execute on function public.inventory_spend(uuid,integer,jsonb,jsonb,jsonb) to service_role;
