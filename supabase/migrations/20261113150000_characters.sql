-- MMO character rows for the world server.
-- The browser never writes this table. Authenticated players may read their
-- own row. Inserts, updates and deletes go through the service role only
-- (the world server using SUPABASE_SERVICE_ROLE_KEY).

create table public.characters (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  zone text not null default 'over',
  x double precision not null default 72,
  y double precision not null default 3,
  z double precision not null default 72.5,
  gold integer not null default 0,
  last_seen timestamptz,
  imported_at timestamptz,
  version bigint not null default 1,
  state jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint characters_name_len check (char_length(name) between 2 and 14),
  constraint characters_name_chr check (name ~ '^[A-Za-z][A-Za-z'' -]*$'),
  constraint characters_zone_chk check (zone in ('over', 'cave')),
  constraint characters_gold_chk check (gold >= 0 and gold <= 1000000),
  constraint characters_version_chk check (version > 0),
  constraint characters_state_chk check (jsonb_typeof(state) = 'object'),
  constraint characters_state_size_chk check (octet_length(state::text) <= 262144)
);

comment on table public.characters is
  'One MMO hunter per auth user. Service role writes; the owner may read.';

comment on column public.characters.state is
  'Full hunt blob matching the local Progress JSON (xp, goods, armor, journal, hunter, …).';

comment on column public.characters.version is
  'Optimistic lock. The world server increments on every save and rejects stale writes.';

create unique index characters_name_lower_idx on public.characters (lower(name));
create index characters_user_id_idx on public.characters (user_id);
create index characters_name_idx on public.characters (name);

alter table public.characters enable row level security;

revoke all on table public.characters from public, anon, authenticated;
grant select on table public.characters to authenticated;
grant select, insert, update, delete on table public.characters to service_role;

create policy characters_select_own
  on public.characters
  for select
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.touch_characters_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger characters_touch_updated_at
  before update on public.characters
  for each row
  execute procedure public.touch_characters_updated_at();
