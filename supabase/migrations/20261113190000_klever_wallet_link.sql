-- Klever wallets link to email accounts. A wallet never creates an account.
-- Apply with: supabase db push
-- or: psql "$DATABASE_URL" -f supabase/migrations/20261113190000_klever_wallet_link.sql

alter table public.hunter_accounts
  add column if not exists klever_address text;

alter table public.hunter_accounts
  drop constraint if exists hunter_accounts_klever_chk;

alter table public.hunter_accounts
  add constraint hunter_accounts_klever_chk
  check (klever_address is null or klever_address ~ '^klv1[02-9ac-hj-np-z]{58}$');

drop index if exists hunter_accounts_klever_address_uidx;
create unique index hunter_accounts_klever_address_uidx
  on public.hunter_accounts (klever_address)
  where klever_address is not null;

comment on column public.hunter_accounts.klever_address is
  'Verified Klever address linked in Account settings. Unique. Null until the player connects a wallet.';

create table if not exists public.klever_nonces (
  nonce text primary key,
  purpose text not null,
  address text not null,
  user_id uuid,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint klever_nonces_nonce_chk check (nonce ~ '^[0-9a-f]{32}$'),
  constraint klever_nonces_purpose_chk check (purpose in ('login', 'link')),
  constraint klever_nonces_address_chk check (address ~ '^klv1[02-9ac-hj-np-z]{58}$')
);

create index if not exists klever_nonces_expires_idx on public.klever_nonces (expires_at);

alter table public.klever_nonces enable row level security;

revoke all on table public.klever_nonces from anon, authenticated;
grant select, insert, update, delete on table public.klever_nonces to service_role;

-- One-shot consume. A second call with the same nonce returns no row.
create or replace function public.take_klever_nonce(
  p_nonce text,
  p_purpose text,
  p_address text,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.klever_nonces%rowtype;
begin
  if p_nonce is null or p_nonce !~ '^[0-9a-f]{32}$' then
    return jsonb_build_object('ok', false, 'code', 'nonce');
  end if;

  delete from public.klever_nonces where expires_at < now() and used_at is null;

  select * into row from public.klever_nonces where nonce = p_nonce for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'nonce');
  end if;
  if row.used_at is not null then
    return jsonb_build_object('ok', false, 'code', 'replay');
  end if;
  if row.expires_at <= now() then
    return jsonb_build_object('ok', false, 'code', 'nonce');
  end if;
  if row.purpose is distinct from p_purpose or row.address is distinct from p_address then
    return jsonb_build_object('ok', false, 'code', 'nonce');
  end if;
  if p_purpose = 'link' and (p_user_id is null or row.user_id is distinct from p_user_id) then
    return jsonb_build_object('ok', false, 'code', 'nonce');
  end if;

  update public.klever_nonces
    set used_at = now()
    where nonce = p_nonce
    returning * into row;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.take_klever_nonce(text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.take_klever_nonce(text, text, text, uuid) to service_role;
