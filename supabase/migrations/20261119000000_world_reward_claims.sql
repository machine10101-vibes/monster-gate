-- Durable, exactly-once World 1 reward grants.
create table if not exists public.world_reward_claims (
  reward_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('good','material','gold','xp','gear','rift_clear')),
  item_id text not null,
  amount integer not null check (amount > 0 and amount <= 100000),
  created_at timestamptz not null default now()
);
create index if not exists world_reward_claims_user_created_idx
  on public.world_reward_claims(user_id, created_at desc);
alter table public.world_reward_claims enable row level security;
revoke all on public.world_reward_claims from anon, authenticated;
grant select, insert on public.world_reward_claims to service_role;

create or replace function public.grant_world_reward(
  p_reward_id text, p_user_id uuid, p_kind text, p_item_id text, p_amount integer
) returns table(granted boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_id text;
  state_doc jsonb;
  current_count integer;
begin
  if p_reward_id is null or length(p_reward_id) < 8 or length(p_reward_id) > 180
     or p_kind not in ('good','material','gold','xp','gear','rift_clear')
     or p_item_id is null or length(p_item_id) > 48
     or p_amount is null or p_amount < 1 or p_amount > 100000 then
    raise exception 'invalid_reward';
  end if;

  insert into public.world_reward_claims(reward_id,user_id,kind,item_id,amount)
  values (p_reward_id,p_user_id,p_kind,p_item_id,p_amount)
  on conflict (reward_id) do nothing
  returning reward_id into inserted_id;
  if inserted_id is null then
    return query select false;
    return;
  end if;

  select state into state_doc from public.characters where user_id=p_user_id for update;
  if state_doc is null then raise exception 'character_not_found'; end if;

  if p_kind='gold' then
    state_doc := jsonb_set(state_doc, '{gold}',
      to_jsonb(least(1000000, coalesce((state_doc->>'gold')::integer,0)+p_amount)), true);
  elsif p_kind='xp' then
    if p_item_id not in ('strength','agility','stamina','mining','smithing','fishing','cooking','woodcutting','firemaking') then
      raise exception 'invalid_xp_skill';
    end if;
    current_count := coalesce((state_doc->'xp'->>p_item_id)::integer,0);
    state_doc := jsonb_set(state_doc, array['xp',p_item_id],
      to_jsonb(least(2000000000,current_count+p_amount)), true);
  elsif p_kind='good' then
    current_count := coalesce((state_doc->'goods'->>p_item_id)::integer,0);
    state_doc := jsonb_set(state_doc, array['goods',p_item_id],
      to_jsonb(least(99999,current_count+p_amount)), true);
  elsif p_kind='material' then
    current_count := coalesce((state_doc->'materials'->>p_item_id)::integer,0);
    state_doc := jsonb_set(state_doc, array['materials',p_item_id],
      to_jsonb(least(99999,current_count+p_amount)), true);
  elsif p_kind='rift_clear' then
    if p_item_id <> 'rift' or p_amount <> 1 then raise exception 'invalid_rift_clear'; end if;
    state_doc := jsonb_set(state_doc, '{riftClearAt}',
      to_jsonb(floor(extract(epoch from now()) * 1000)::bigint), true);
  elsif p_kind='gear' then
    if p_amount <> 1 or p_item_id not in (
      'demonhelm','demonchest','demonarms','demonlegs','demonboots','demonsword','demonshield',
      'holyhelm','holychest','holyarms','holylegs','holyboots','holyhammer','ashenbrand'
    ) then
      raise exception 'invalid_gear';
    end if;
    state_doc := jsonb_set(state_doc, '{crafted}',
      coalesce(state_doc->'crafted', '{}'::jsonb), true);
    state_doc := jsonb_set(state_doc, array['crafted',p_item_id], 'true'::jsonb, true);
  end if;

  update public.characters set state=state_doc,
    gold=coalesce((state_doc->>'gold')::integer,gold),
    version=version+1, updated_at=now()
  where user_id=p_user_id;
  return query select true;
end;
$$;
revoke all on function public.grant_world_reward(text,uuid,text,text,integer) from public, anon, authenticated;
grant execute on function public.grant_world_reward(text,uuid,text,text,integer) to service_role;
