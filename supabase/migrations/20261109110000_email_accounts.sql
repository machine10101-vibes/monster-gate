-- Email accounts. Passwords stay in Supabase Auth. This table only keeps the hunt.
-- The browser cannot read or write it. The hunter function checks the auth user, then uses the service role.

create table public.hunter_accounts (
  user_id uuid primary key,
  email text not null,
  progress jsonb not null,
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint hunter_accounts_email_chk check (char_length(email) between 3 and 254),
  constraint hunter_accounts_revision_chk check (revision > 0),
  constraint hunter_accounts_progress_chk check (jsonb_typeof(progress) = 'object')
);

alter table public.hunter_accounts enable row level security;

revoke all on table public.hunter_accounts from anon, authenticated;
grant select, insert, update, delete on table public.hunter_accounts to service_role;

-- Last write with the newer savedAt wins. An older device gets the current row back.
create or replace function public.save_account_hunt(p_user_id uuid, p_email text, p_progress jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.hunter_accounts%rowtype;
  incoming numeric;
  current_at numeric;
begin
  if p_user_id is null then
    raise exception 'bad account';
  end if;
  if p_email is null or char_length(p_email) < 3 or char_length(p_email) > 254 then
    raise exception 'bad email';
  end if;
  if jsonb_typeof(p_progress) is distinct from 'object' then
    raise exception 'bad progress';
  end if;
  if octet_length(p_progress::text) > 262144 then
    raise exception 'too large';
  end if;

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
    return jsonb_build_object(
      'ok', false,
      'revision', row.revision,
      'savedAt', current_at,
      'progress', row.progress
    );
  end if;

  update public.hunter_accounts
    set email = p_email,
        progress = p_progress,
        revision = revision + 1,
        updated_at = now()
    where user_id = p_user_id
    returning * into row;

  return jsonb_build_object('ok', true, 'revision', row.revision, 'savedAt', incoming);
end;
$$;

revoke all on function public.save_account_hunt(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.save_account_hunt(uuid, text, jsonb) to service_role;
