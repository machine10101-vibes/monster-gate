-- One-time insert of a clamped hunter_accounts hunt into characters.
-- Never overwrites an existing characters row. Service role only.
-- Apply after 20261113150000_characters.sql. Does not read or write
-- hunter_accounts: the world-server persistence layer clamps progress in JS
-- then calls this RPC so concurrent first joins cannot create two rows.

create or replace function public.character_import_legacy(
  p_user uuid,
  p_name text,
  p_zone text,
  p_x double precision,
  p_y double precision,
  p_z double precision,
  p_gold integer,
  p_state jsonb
)
returns public.characters
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  row public.characters%rowtype;
begin
  if p_user is null then
    raise exception using errcode = 'P0001', message = 'invalid';
  end if;
  if p_name is null or char_length(p_name) < 2 then
    raise exception using errcode = 'P0001', message = 'invalid';
  end if;
  if jsonb_typeof(p_state) is distinct from 'object' then
    raise exception using errcode = 'P0001', message = 'invalid';
  end if;

  perform pg_advisory_xact_lock(hashtext('mg.character:' || p_user::text));

  select * into row from public.characters where user_id = p_user;
  if found then
    return row;
  end if;

  insert into public.characters (
    user_id, name, zone, x, y, z, gold,
    last_seen, imported_at, version, state
  ) values (
    p_user,
    p_name,
    case when p_zone in ('over', 'cave') then p_zone else 'over' end,
    p_x, p_y, p_z,
    coalesce(p_gold, 0),
    now(),
    now(),
    1,
    p_state
  )
  returning * into row;

  return row;
exception
  when unique_violation then
    -- Concurrent first join: the other session won the user_id PK.
    -- A name collision with a *different* account re-raises and maps to
    -- name_taken in the persistence adapter (import then falls back to
    -- a fresh character rather than crashing the join).
    select * into row from public.characters where user_id = p_user;
    if found then
      return row;
    end if;
    raise;
end;
$$;

comment on function public.character_import_legacy(uuid, text, text, double precision, double precision, double precision, integer, jsonb) is
  'Insert a clamped hunter_accounts hunt as characters. No-ops if the user already has a row.';

revoke all on function public.character_import_legacy(uuid, text, text, double precision, double precision, double precision, integer, jsonb)
  from public, anon, authenticated;
grant execute on function public.character_import_legacy(uuid, text, text, double precision, double precision, double precision, integer, jsonb)
  to service_role;
