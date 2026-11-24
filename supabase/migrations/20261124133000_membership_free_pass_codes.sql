-- Single-use, guild-master-issued 10-day Gate Pass codes.
alter table public.memberships alter column klever_address drop not null;

create table if not exists public.membership_pass_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique check (code_hash ~ '^[0-9a-f]{64}$'),
  code_hint text not null check (length(code_hint) = 4),
  issued_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  redeemed_by uuid references auth.users(id),
  redeemed_at timestamptz
);

create index if not exists membership_pass_codes_created_idx
  on public.membership_pass_codes(created_at desc);

alter table public.membership_pass_codes enable row level security;
revoke all on public.membership_pass_codes from anon, authenticated;
grant all on public.membership_pass_codes to service_role;

create or replace function public.redeem_membership_pass_code(
  p_user_id uuid,
  p_code_hash text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code_id uuid;
  v_expires timestamptz;
begin
  if p_user_id is null or p_code_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid pass code';
  end if;

  update public.membership_pass_codes
     set redeemed_by = p_user_id, redeemed_at = now()
   where code_hash = p_code_hash and redeemed_by is null
   returning id into v_code_id;

  if v_code_id is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_or_used');
  end if;

  insert into public.memberships(user_id, klever_address, expires_at, updated_at)
  values (p_user_id, null, now() + interval '10 days', now())
  on conflict (user_id) do update
    set expires_at = greatest(public.memberships.expires_at, now()) + interval '10 days',
        updated_at = now()
  returning expires_at into v_expires;

  return jsonb_build_object('ok', true, 'expires_at', v_expires);
end;
$$;

revoke all on function public.redeem_membership_pass_code(uuid, text) from public, anon, authenticated;
grant execute on function public.redeem_membership_pass_code(uuid, text) to service_role;
