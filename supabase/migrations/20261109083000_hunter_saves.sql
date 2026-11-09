-- Klever wallet hunts. The browser cannot read or write these tables.
-- The hunter edge function checks the wallet signature, then uses the service role.

create table if not exists public.hunters (
  address text primary key,
  progress jsonb not null,
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint hunters_address_chk check (address ~ '^klv1[02-9ac-hj-np-z]{58}$'),
  constraint hunters_revision_chk check (revision > 0),
  constraint hunters_progress_chk check (jsonb_typeof(progress) = 'object')
);

create table if not exists public.hunter_sessions (
  token_hash text primary key,
  address text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint hunter_sessions_address_chk check (address ~ '^klv1[02-9ac-hj-np-z]{58}$'),
  constraint hunter_sessions_hash_chk check (token_hash ~ '^[0-9a-f]{64}$')
);

create index if not exists hunter_sessions_expires_idx on public.hunter_sessions (expires_at);

alter table public.hunters enable row level security;
alter table public.hunter_sessions enable row level security;

revoke all on table public.hunters from anon, authenticated;
revoke all on table public.hunter_sessions from anon, authenticated;
grant select, insert, update, delete on table public.hunters to service_role;
grant select, insert, update, delete on table public.hunter_sessions to service_role;

-- Last write with the newer savedAt wins. An older device gets the current row back.
create or replace function public.save_hunt(p_address text, p_progress jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.hunters%rowtype;
  incoming numeric;
  current_at numeric;
begin
  if p_address !~ '^klv1[02-9ac-hj-np-z]{58}$' then
    raise exception 'bad address';
  end if;
  if jsonb_typeof(p_progress) is distinct from 'object' then
    raise exception 'bad progress';
  end if;
  if octet_length(p_progress::text) > 262144 then
    raise exception 'too large';
  end if;

  incoming := coalesce((p_progress->>'savedAt')::numeric, 0);

  select * into row from public.hunters where address = p_address for update;
  if not found then
    insert into public.hunters (address, progress, revision)
    values (p_address, p_progress, 1)
    returning * into row;
    return jsonb_build_object('ok', true, 'revision', row.revision, 'savedAt', incoming);
  end if;

  current_at := coalesce((row.progress->>'savedAt')::numeric, 0);
  if incoming < current_at then
    return jsonb_build_object(
      'ok', false,
      'revision', row.revision,
      'savedAt', current_at,
      'progress', row.progress
    );
  end if;

  update public.hunters
    set progress = p_progress,
        revision = revision + 1,
        updated_at = now()
    where address = p_address
    returning * into row;

  return jsonb_build_object('ok', true, 'revision', row.revision, 'savedAt', incoming);
end;
$$;

revoke all on function public.save_hunt(text, jsonb) from public, anon, authenticated;
grant execute on function public.save_hunt(text, jsonb) to service_role;
