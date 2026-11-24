create table if not exists public.memberships (
 user_id uuid primary key references auth.users(id) on delete cascade,
 klever_address text not null check (klever_address ~ '^klv1[02-9ac-hj-np-z]{58}$'),
 expires_at timestamptz not null, updated_at timestamptz not null default now()
);
create table if not exists public.membership_quotes (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 klever_address text not null check (klever_address ~ '^klv1[02-9ac-hj-np-z]{58}$'),
 usd_price numeric(20,10) not null check (usd_price > 0),
 klv_amount_atomic bigint not null check (klv_amount_atomic > 0),
 source_time timestamptz, expires_at timestamptz not null, used_at timestamptz,
 created_at timestamptz not null default now()
);
create table if not exists public.membership_payments (
 tx_hash text primary key check (tx_hash ~ '^[0-9a-f]{64}$'),
 user_id uuid not null references auth.users(id) on delete cascade,
 klever_address text not null check (klever_address ~ '^klv1[02-9ac-hj-np-z]{58}$'),
 receiver_address text not null check (receiver_address ~ '^klv1[02-9ac-hj-np-z]{58}$'),
 amount_atomic bigint not null check (amount_atomic > 0),
 usd_price numeric(20,10) not null check (usd_price > 0),
 quote_id uuid not null references public.membership_quotes(id),
 created_at timestamptz not null default now()
);
create index if not exists membership_quotes_user_created_idx on public.membership_quotes(user_id,created_at desc);
alter table public.memberships enable row level security;
alter table public.membership_quotes enable row level security;
alter table public.membership_payments enable row level security;
revoke all on public.memberships,public.membership_quotes,public.membership_payments from anon,authenticated;
grant all on public.memberships,public.membership_quotes,public.membership_payments to service_role;
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
 insert into public.memberships(user_id,klever_address,expires_at,updated_at)
 values(p_user_id,p_klever_address,now()+interval '30 days',now())
 on conflict(user_id) do update set klever_address=excluded.klever_address,
 expires_at=greatest(public.memberships.expires_at,now())+interval '30 days',updated_at=now()
 returning expires_at into v_expires;
 update public.membership_quotes set used_at=now() where id=p_quote_id and user_id=p_user_id and used_at is null;
 return jsonb_build_object('ok',true,'expires_at',v_expires);
end; $$;
revoke all on function public.activate_membership_service(uuid,text,text,text,bigint,numeric,uuid) from public,anon,authenticated;
grant execute on function public.activate_membership_service(uuid,text,text,text,bigint,numeric,uuid) to service_role;
