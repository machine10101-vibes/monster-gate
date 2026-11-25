alter table public.membership_quotes
  add column if not exists usd_amount numeric(10,2) not null default 5.00,
  add column if not exists duration_days integer not null default 30;

alter table public.membership_quotes
  add constraint membership_quotes_term_price_check
  check (
    (duration_days = 30 and usd_amount = 5.00) or
    (duration_days = 180 and usd_amount = 27.00) or
    (duration_days = 365 and usd_amount = 48.00)
  );

create or replace function public.activate_membership_service(
 p_user_id uuid,p_klever_address text,p_tx_hash text,p_receiver_address text,
 p_amount_atomic bigint,p_usd_price numeric,p_quote_id uuid
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare
 v_expires timestamptz;
 v_duration_days integer;
 v_quoted_amount bigint;
 v_quoted_price numeric;
begin
 if p_user_id is null or p_klever_address !~ '^klv1[02-9ac-hj-np-z]{58}$'
 or p_receiver_address !~ '^klv1[02-9ac-hj-np-z]{58}$'
 or p_tx_hash !~ '^[0-9a-f]{64}$' or p_amount_atomic<=0 or p_usd_price<=0 then
  raise exception 'invalid membership payment';
 end if;
 select duration_days,klv_amount_atomic,usd_price
 into v_duration_days,v_quoted_amount,v_quoted_price
 from public.membership_quotes
 where id=p_quote_id and user_id=p_user_id and klever_address=p_klever_address and used_at is null
 for update;
 if not found or v_duration_days not in (30,180,365)
   or v_quoted_amount<>p_amount_atomic or v_quoted_price<>p_usd_price then
  raise exception 'membership quote is invalid or already used';
 end if;
 insert into public.membership_payments(tx_hash,user_id,klever_address,receiver_address,amount_atomic,usd_price,quote_id)
 values(p_tx_hash,p_user_id,p_klever_address,p_receiver_address,p_amount_atomic,p_usd_price,p_quote_id);
 insert into public.memberships(user_id,klever_address,expires_at,updated_at)
 values(p_user_id,p_klever_address,now()+make_interval(days=>v_duration_days),now())
 on conflict(user_id) do update set klever_address=excluded.klever_address,
 expires_at=greatest(public.memberships.expires_at,now())+make_interval(days=>v_duration_days),updated_at=now()
 returning expires_at into v_expires;
 update public.membership_quotes set used_at=now() where id=p_quote_id and user_id=p_user_id and used_at is null;
 return jsonb_build_object('ok',true,'expires_at',v_expires,'duration_days',v_duration_days);
end; $$;
revoke all on function public.activate_membership_service(uuid,text,text,text,bigint,numeric,uuid) from public,anon,authenticated;
grant execute on function public.activate_membership_service(uuid,text,text,text,bigint,numeric,uuid) to service_role;
