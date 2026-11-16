-- One live browser per email account. A new sign-in overwrites the seat.
-- The hunter and admin functions check this with the service role.

create table public.account_sessions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  session_id uuid not null,
  updated_at timestamptz not null default now()
);

alter table public.account_sessions enable row level security;

revoke all on table public.account_sessions from public, anon, authenticated;
grant select, insert, update, delete on table public.account_sessions to service_role;

comment on table public.account_sessions is
  'The device that last signed in. A mismatched session_id means this account is open on another device.';
