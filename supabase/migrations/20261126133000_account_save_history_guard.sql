-- Keep recoverable account checkpoints and refuse silent progression rollback.
-- The browser remains free to spend currency, consume inventory, unequip gear,
-- or drop one item at a time. Monotonic progression (XP, kills, rank, learned
-- skills and portals) may never move backwards, and bulk ownership loss is
-- treated as a stale/reset-device save.

create table if not exists public.hunter_account_save_history (
  user_id uuid not null references auth.users(id) on delete cascade,
  revision bigint not null,
  saved_at bigint not null default 0,
  progress jsonb not null check (jsonb_typeof(progress) = 'object'),
  snapshot_kind text not null check (snapshot_kind in ('recent', 'checkpoint', 'rejected')),
  created_at timestamptz not null default now(),
  primary key (user_id, revision)
);

create index if not exists hunter_account_save_history_user_created_idx
  on public.hunter_account_save_history (user_id, created_at desc);

alter table public.hunter_account_save_history enable row level security;
revoke all on table public.hunter_account_save_history from public, anon, authenticated;
grant select, insert, update, delete on table public.hunter_account_save_history to service_role;

create or replace function public.account_progress_regressed(
  p_current jsonb,
  p_incoming jsonb
) returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  old_char jsonb;
  new_char jsonb;
  old_hunt jsonb;
  new_hunt jsonb;
  old_id text;
  old_num numeric;
  new_num numeric;
  removed_owned integer;
  pair record;
begin
  if jsonb_typeof(p_current->'roster'->'chars') <> 'array'
     or jsonb_typeof(p_incoming->'roster'->'chars') <> 'array' then
    return false;
  end if;

  for old_char in select value from jsonb_array_elements(p_current->'roster'->'chars') loop
    old_id := old_char->>'id';
    old_hunt := old_char->'hunt';
    if old_id is null or jsonb_typeof(old_hunt) <> 'object' then
      continue;
    end if;

    select value into new_char
      from jsonb_array_elements(p_incoming->'roster'->'chars')
      where value->>'id' = old_id
      limit 1;

    if new_char is null then
      if not exists (
        select 1
        from jsonb_array_elements(coalesce(p_incoming->'roster'->'deleted', '[]'::jsonb)) d
        where d->>'id' = old_id
          and coalesce((d->>'deletedAt')::numeric, 0) >= coalesce((old_hunt->>'savedAt')::numeric, 0)
      ) then
        return true;
      end if;
      continue;
    end if;

    new_hunt := new_char->'hunt';
    if jsonb_typeof(new_hunt) <> 'object' then
      return true;
    end if;

    -- XP and kill totals are monotonic.
    for pair in select key, value from jsonb_each(coalesce(old_hunt->'xp', '{}'::jsonb)) loop
      if jsonb_typeof(pair.value) = 'number' then
        old_num := (pair.value #>> '{}')::numeric;
        new_num := case when jsonb_typeof(new_hunt->'xp'->pair.key) = 'number'
          then (new_hunt->'xp'->>pair.key)::numeric else 0 end;
        if new_num < old_num then return true; end if;
      end if;
    end loop;

    for pair in select key, value from jsonb_each(coalesce(old_hunt->'kills', '{}'::jsonb)) loop
      if jsonb_typeof(pair.value) = 'number' then
        old_num := (pair.value #>> '{}')::numeric;
        new_num := case when jsonb_typeof(new_hunt->'kills'->pair.key) = 'number'
          then (new_hunt->'kills'->>pair.key)::numeric else 0 end;
        if new_num < old_num then return true; end if;
      end if;
    end loop;

    old_num := case when jsonb_typeof(old_hunt->'hunter'->'rank') = 'number'
      then (old_hunt->'hunter'->>'rank')::numeric else 0 end;
    new_num := case when jsonb_typeof(new_hunt->'hunter'->'rank') = 'number'
      then (new_hunt->'hunter'->>'rank')::numeric else 0 end;
    if new_num < old_num then return true; end if;

    if coalesce(old_hunt->'skills'->>'classId', '') <> ''
       and coalesce(new_hunt->'skills'->>'classId', '') <> old_hunt->'skills'->>'classId' then
      return true;
    end if;

    if exists (
      select 1 from jsonb_each(coalesce(old_hunt->'skills'->'learned', '{}'::jsonb)) learned
      where learned.value = 'true'::jsonb
        and coalesce(new_hunt->'skills'->'learned'->learned.key, 'false'::jsonb) <> 'true'::jsonb
    ) then return true; end if;

    if exists (
      select 1 from jsonb_array_elements_text(coalesce(old_hunt->'portals', '[]'::jsonb)) portal(id)
      where not exists (
        select 1 from jsonb_array_elements_text(coalesce(new_hunt->'portals', '[]'::jsonb)) fresh(id)
        where fresh.id = portal.id
      )
    ) then return true; end if;

    -- Dropping one item is valid. Losing three or more owned pieces in a
    -- single revision is the reset/corruption signature this guard blocks.
    select count(*) into removed_owned
    from jsonb_each(coalesce(old_hunt->'crafted', '{}'::jsonb)) owned
    where owned.value = 'true'::jsonb
      and coalesce(new_hunt->'crafted'->owned.key, 'false'::jsonb) <> 'true'::jsonb;
    if removed_owned >= 3 then return true; end if;
  end loop;

  return false;
end;
$$;

revoke all on function public.account_progress_regressed(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.account_progress_regressed(jsonb, jsonb) to service_role;

create or replace function public.archive_account_hunt_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  kind text := 'recent';
  bucket_start timestamptz := date_trunc('hour', now())
    + floor(extract(minute from now()) / 15) * interval '15 minutes';
begin
  if not exists (
    select 1 from public.hunter_account_save_history
    where user_id = old.user_id
      and snapshot_kind = 'checkpoint'
      and created_at >= bucket_start
      and created_at < bucket_start + interval '15 minutes'
  ) then
    kind := 'checkpoint';
  end if;

  insert into public.hunter_account_save_history
    (user_id, revision, saved_at, progress, snapshot_kind, created_at)
  values
    (old.user_id, old.revision, coalesce((old.progress->>'savedAt')::bigint, 0), old.progress, kind, now())
  on conflict (user_id, revision) do nothing;

  delete from public.hunter_account_save_history h
  where h.user_id = old.user_id
    and (
      (h.snapshot_kind = 'recent' and h.revision not in (
        select revision from public.hunter_account_save_history
        where user_id = old.user_id and snapshot_kind = 'recent'
        order by revision desc limit 50
      ))
      or (h.snapshot_kind = 'checkpoint' and h.created_at < now() - interval '30 days')
      or (h.snapshot_kind = 'rejected' and h.created_at < now() - interval '30 days')
    );
  return new;
end;
$$;

drop trigger if exists archive_account_hunt_before_update on public.hunter_accounts;
create trigger archive_account_hunt_before_update
before update of progress on public.hunter_accounts
for each row execute function public.archive_account_hunt_before_update();

create or replace function public.save_account_hunt(
  p_user_id uuid,
  p_email text,
  p_progress jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.hunter_accounts%rowtype;
  incoming numeric;
  current_at numeric;
begin
  if auth.role() <> 'service_role' then raise exception 'service role required'; end if;
  if p_email is null or char_length(p_email) < 3 or char_length(p_email) > 254 then raise exception 'bad email'; end if;
  if jsonb_typeof(p_progress) is distinct from 'object' then raise exception 'bad progress'; end if;
  if octet_length(p_progress::text) > 262144 then raise exception 'too large'; end if;

  incoming := coalesce((p_progress->>'savedAt')::numeric, 0);
  select * into row from public.hunter_accounts where user_id = p_user_id for update;
  if not found then
    insert into public.hunter_accounts (user_id, email, progress, revision)
    values (p_user_id, p_email, p_progress, 1)
    returning * into row;
    return jsonb_build_object('ok', true, 'revision', row.revision, 'savedAt', incoming);
  end if;

  current_at := coalesce((row.progress->>'savedAt')::numeric, 0);
  if incoming < current_at then
    return jsonb_build_object('ok', false, 'revision', row.revision, 'savedAt', current_at, 'progress', row.progress);
  end if;

  if public.account_progress_regressed(row.progress, p_progress) then
    insert into public.hunter_account_save_history
      (user_id, revision, saved_at, progress, snapshot_kind, created_at)
    values (row.user_id, -1 * (extract(epoch from clock_timestamp()) * 1000000)::bigint,
      incoming::bigint, p_progress, 'rejected', now())
    on conflict do nothing;
    return jsonb_build_object(
      'ok', false,
      'protected', true,
      'revision', row.revision,
      'savedAt', current_at,
      'progress', row.progress
    );
  end if;

  update public.hunter_accounts
    set email = p_email, progress = p_progress, revision = revision + 1, updated_at = now()
    where user_id = p_user_id
    returning * into row;
  return jsonb_build_object('ok', true, 'revision', row.revision, 'savedAt', incoming);
end;
$$;

revoke all on function public.save_account_hunt(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.save_account_hunt(uuid, text, jsonb) to service_role;

create or replace function public.restore_account_hunt_revision(p_user_id uuid, p_revision bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  snapshot public.hunter_account_save_history%rowtype;
  restored public.hunter_accounts%rowtype;
begin
  if auth.role() <> 'service_role' then raise exception 'service role required'; end if;
  select * into snapshot from public.hunter_account_save_history
    where user_id = p_user_id and revision = p_revision;
  if not found then raise exception 'save revision not found'; end if;

  update public.hunter_accounts
    set progress = snapshot.progress, revision = revision + 1, updated_at = now()
    where user_id = p_user_id
    returning * into restored;
  return jsonb_build_object('ok', true, 'revision', restored.revision,
    'savedAt', coalesce((restored.progress->>'savedAt')::bigint, 0));
end;
$$;

revoke all on function public.restore_account_hunt_revision(uuid, bigint) from public, anon, authenticated;
grant execute on function public.restore_account_hunt_revision(uuid, bigint) to service_role;

comment on table public.hunter_account_save_history is
  'Immutable recovery points for account rosters. Recent saves plus 15-minute checkpoints are retained automatically.';
