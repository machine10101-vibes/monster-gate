-- Account-keyed social graph for World 1. Apply once in Supabase SQL editor.
create table if not exists public.friendships (
  requester_id uuid not null references auth.users(id) on delete cascade,
  target_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('pending','accepted','blocked','ignored')),
  requester_name text not null default 'Hunter',
  target_name text not null default 'Hunter',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (requester_id, target_id),
  check (requester_id <> target_id)
);
alter table public.friendships add column if not exists requester_name text not null default 'Hunter';
alter table public.friendships add column if not exists target_name text not null default 'Hunter';
create index if not exists friendships_target_status_idx on public.friendships(target_id,status);
create index if not exists friendships_requester_status_idx on public.friendships(requester_id,status);
alter table public.friendships enable row level security;
comment on column public.friendships.status is 'pending | accepted | blocked | ignored. Used by the live World 1 social protocol.';
drop policy if exists friendships_select_own on public.friendships;
create policy friendships_select_own on public.friendships for select to authenticated
using (requester_id = auth.uid() or target_id = auth.uid());

grant select, insert, update, delete on public.friendships to service_role;
grant select on public.friendships to authenticated;
grant select on public.characters to service_role;
