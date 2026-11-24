-- Track paid and 10-day pass entitlements independently while preserving the combined Gate Pass expiry.
alter table public.memberships
  add column if not exists paid_expires_at timestamptz,
  add column if not exists trial_pass_expires_at timestamptz;

-- Backfill legacy memberships using their verified wallet/payment and redeemed-code history.
update public.memberships m
set paid_expires_at = m.expires_at
where m.paid_expires_at is null
  and (
    m.klever_address is not null
    or exists (select 1 from public.membership_payments p where p.user_id = m.user_id)
  );

update public.memberships m
set trial_pass_expires_at = m.expires_at
where m.trial_pass_expires_at is null
  and exists (select 1 from public.membership_pass_codes c where c.redeemed_by = m.user_id)
  and m.paid_expires_at is null;

create or replace function public.activate_membership_service(
 p_user_id uuid,p_klever_address text,p_tx_hash text,p_receiver_address text,
 p_amount_atomic bigint,p_usd_price numeric,p_quote_id uuid
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_expires timestamptz;
begin
 if p_user_id is null or p_klever_address !~ '^klv1[02-9ac-hj-np-z]{58}$'
 or p_receiver_address !~ '^klv1[02-9ac-hj-np-z]{58}$'
 or p_tx_hash !~ '^[0-9a-f]{64}$' or p_amount_atomic<=0 or p_usd_price<=0 then
  raise exception 'invalid membership payment';
 end if;
 insert into public.membership_payments(tx_hash,user_id,klever_address,receiver_address,amount_atomic,usd_price,quote_id)
 values(p_tx_hash,p_user_id,p_klever_address,p_receiver_address,p_amount_atomic,p_usd_price,p_quote_id);
 insert into public.memberships(user_id,klever_address,expires_at,paid_expires_at,updated_at)
 values(p_user_id,p_klever_address,now()+interval '30 days',now()+interval '30 days',now())
 on conflict(user_id) do update set klever_address=excluded.klever_address,
 expires_at=greatest(public.memberships.expires_at,now())+interval '30 days',
 paid_expires_at=greatest(coalesce(public.memberships.paid_expires_at,now()),now())+interval '30 days',
 updated_at=now()
 returning expires_at into v_expires;
 update public.membership_quotes set used_at=now() where id=p_quote_id and user_id=p_user_id and used_at is null;
 return jsonb_build_object('ok',true,'expires_at',v_expires);
end; $$;

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

  insert into public.memberships(user_id, klever_address, expires_at, trial_pass_expires_at, updated_at)
  values (p_user_id, null, now() + interval '10 days', now() + interval '10 days', now())
  on conflict (user_id) do update
    set expires_at = greatest(public.memberships.expires_at, now()) + interval '10 days',
        trial_pass_expires_at = greatest(coalesce(public.memberships.trial_pass_expires_at, now()), now()) + interval '10 days',
        updated_at = now()
  returning expires_at into v_expires;

  return jsonb_build_object('ok', true, 'expires_at', v_expires);
end;
$$;

drop function if exists public.admin_account_facts();
create function public.admin_account_facts()
returns table (
  user_id uuid,
  email text,
  revision bigint,
  updated_at timestamptz,
  created_at timestamptz,
  facts jsonb,
  klever_address text,
  membership_expires_at timestamptz,
  paid_expires_at timestamptz,
  trial_pass_expires_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.user_id,
    a.email,
    a.revision,
    a.updated_at,
    a.created_at,
    public.admin_hunt_facts(a.progress),
    a.klever_address,
    m.expires_at,
    m.paid_expires_at,
    m.trial_pass_expires_at
  from public.hunter_accounts a
  left join public.memberships m on m.user_id = a.user_id;
$$;

revoke all on function public.admin_account_facts() from public, anon, authenticated;
grant execute on function public.admin_account_facts() to service_role;
