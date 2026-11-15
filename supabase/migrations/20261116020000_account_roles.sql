-- Staff roles for playable moderator accounts. Admin writes; a user may
-- read their own row. World Creator is gated on moderator (and admin) in
-- the client. Service role is the only writer.

create table public.account_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role text not null,
  granted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_roles_role_chk check (role in ('admin', 'moderator')),
  constraint account_roles_email_chk check (char_length(email) between 3 and 254)
);

comment on table public.account_roles is
  'Admin and moderator flags for playable accounts. Service role writes; the owner may read.';

create unique index account_roles_email_lower_idx on public.account_roles (lower(email));
create index account_roles_role_idx on public.account_roles (role);

alter table public.account_roles enable row level security;

revoke all on table public.account_roles from public, anon, authenticated;
grant select on table public.account_roles to authenticated;
grant select, insert, update, delete on table public.account_roles to service_role;

create policy account_roles_select_own
  on public.account_roles
  for select
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.touch_account_roles_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger account_roles_touch_updated_at
  before update on public.account_roles
  for each row
  execute procedure public.touch_account_roles_updated_at();

-- Lookup an Auth user by email. Service role only; used to promote an
-- existing account to moderator without listing every user.
create or replace function public.auth_user_by_email(p_email text)
returns table (id uuid, email text)
language sql
security definer
set search_path = auth, public, pg_temp
as $$
  select u.id, lower(u.email::text)
  from auth.users u
  where lower(u.email::text) = lower(trim(p_email))
  limit 1;
$$;

comment on function public.auth_user_by_email(text) is
  'Resolve auth.users id from email for staff promote. Service role only.';

revoke all on function public.auth_user_by_email(text) from public, anon, authenticated;
grant execute on function public.auth_user_by_email(text) to service_role;
