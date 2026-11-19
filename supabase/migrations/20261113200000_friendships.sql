-- MMO friendships for the world server (docs/SOCIAL_SPEC.md).
-- Keyed only by auth.users id — never by wallet address. Parties stay
-- in-memory on the world server and are not stored here.
--
-- One row per unordered pair for pending/accepted (order-independent
-- unique). Spec suggested two accepted rows (one each direction); this
-- unique constraint is the required World 1 rule instead. blocked/ignored
-- are one-way statuses reserved for a later API.

create table public.friendships (
  requester_id uuid not null references auth.users (id) on delete cascade,
  target_id uuid not null references auth.users (id) on delete cascade,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (requester_id, target_id),
  constraint friendships_no_self check (requester_id <> target_id),
  constraint friendships_status_chk check (status in ('pending', 'accepted', 'blocked', 'ignored'))
);

comment on table public.friendships is
  'Account-keyed friend graph. Service role writes; either party may read.';

comment on column public.friendships.requester_id is
  'auth.users id that sent the request (or the actor for blocked/ignored).';

comment on column public.friendships.target_id is
  'auth.users id that received the request.';

comment on column public.friendships.status is
  'pending | accepted | blocked | ignored. Persistence v1 exposes pending/accepted only.';

create unique index friendships_pair_uniq
  on public.friendships (
    least(requester_id, target_id),
    greatest(requester_id, target_id)
  )
  where status in ('pending', 'accepted');

create index friendships_target_status_idx
  on public.friendships (target_id, status);

create index friendships_requester_status_idx
  on public.friendships (requester_id, status);

alter table public.friendships enable row level security;

revoke all on table public.friendships from public, anon, authenticated;
grant select on table public.friendships to authenticated;
grant select, insert, update, delete on table public.friendships to service_role;

create policy friendships_select_own
  on public.friendships
  for select
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = target_id);

create or replace function public.touch_friendships_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger friendships_touch_updated_at
  before update on public.friendships
  for each row
  execute procedure public.touch_friendships_updated_at();
