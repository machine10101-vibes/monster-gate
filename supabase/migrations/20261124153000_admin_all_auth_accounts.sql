-- Include every registered email account, even before its first hunter save.
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
    u.id,
    u.email,
    coalesce(h.revision, 0)::bigint,
    coalesce(h.updated_at, u.updated_at),
    u.created_at,
    coalesce(public.admin_hunt_facts(h.progress), '{}'::jsonb),
    h.klever_address,
    m.expires_at,
    m.paid_expires_at,
    m.trial_pass_expires_at
  from auth.users u
  left join public.hunter_accounts h on h.user_id = u.id
  left join public.memberships m on m.user_id = u.id
  where u.email is not null;
$$;

revoke all on function public.admin_account_facts() from public, anon, authenticated;
grant execute on function public.admin_account_facts() to service_role;
