-- Guild master list. Passwords stay in Supabase Auth.
-- The browser cannot read this table. The admin function checks it, then reads hunts with the service role.

create table public.admins (
  email text primary key,
  created_at timestamptz not null default now(),
  constraint admins_email_chk check (email = lower(email) and char_length(email) between 3 and 254)
);

comment on table public.admins is
  'Guild-master emails. They sign in to the ledger at /admin.html and do not enter the hunt.';

alter table public.admins enable row level security;

revoke all on table public.admins from anon, authenticated;
grant select on table public.admins to service_role;

insert into public.admins (email)
values ('monstergateonline@gmail.com')
on conflict (email) do nothing;

-- Compact hunt facts for the ledger. Full bags, gear, and positions stay in the row.
create or replace function public.admin_hunt_facts(progress jsonb)
returns jsonb
language sql
stable
as $$
  select case
    when jsonb_typeof(progress->'roster'->'chars') = 'array' then
      jsonb_build_object(
        'savedAt', progress->'savedAt',
        'roster', jsonb_build_object(
          'chars', coalesce((
            select jsonb_agg(jsonb_build_object(
              'id', c->>'id',
              'name', c->>'name',
              'playedAt', c->'playedAt',
              'createdAt', c->'createdAt',
              'hunt', jsonb_build_object(
                'gold', c#>'{hunt,gold}',
                'kills', case when jsonb_typeof(c#>'{hunt,kills}') = 'object' then c#>'{hunt,kills}' else '{}'::jsonb end,
                'skills', jsonb_build_object(
                  'classId', c#>'{hunt,skills,classId}',
                  'learned', case when jsonb_typeof(c#>'{hunt,skills,learned}') = 'object' then c#>'{hunt,skills,learned}' else '{}'::jsonb end
                ),
                'xp', case when jsonb_typeof(c#>'{hunt,xp}') = 'object' then c#>'{hunt,xp}' else '{}'::jsonb end,
                'hunter', jsonb_build_object(
                  'realm', c#>'{hunt,hunter,realm}',
                  'rank', c#>'{hunt,hunter,rank}',
                  'quest', case
                    when jsonb_typeof(c#>'{hunt,hunter,quest}') = 'object'
                    then jsonb_build_object('text', c#>'{hunt,hunter,quest,text}')
                    else null
                  end
                )
              )
            ))
            from jsonb_array_elements(progress->'roster'->'chars') c
          ), '[]'::jsonb),
          'deleted', coalesce((
            select jsonb_agg(jsonb_build_object(
              'name', d->>'name',
              'deletedAt', d->'deletedAt'
            ))
            from jsonb_array_elements(coalesce(progress->'roster'->'deleted', '[]'::jsonb)) d
          ), '[]'::jsonb)
        )
      )
    else
      jsonb_build_object(
        'savedAt', progress->'savedAt',
        'gold', progress->'gold',
        'kills', case when jsonb_typeof(progress->'kills') = 'object' then progress->'kills' else '{}'::jsonb end,
        'skills', jsonb_build_object(
          'classId', progress#>'{skills,classId}',
          'learned', case when jsonb_typeof(progress#>'{skills,learned}') = 'object' then progress#>'{skills,learned}' else '{}'::jsonb end
        ),
        'xp', case when jsonb_typeof(progress->'xp') = 'object' then progress->'xp' else '{}'::jsonb end,
        'hunter', jsonb_build_object(
          'realm', progress#>'{hunter,realm}',
          'rank', progress#>'{hunter,rank}',
          'quest', case
            when jsonb_typeof(progress#>'{hunter,quest}') = 'object'
            then jsonb_build_object('text', progress#>'{hunter,quest,text}')
            else null
          end
        )
      )
  end;
$$;

create or replace function public.admin_account_facts()
returns table (
  user_id uuid,
  email text,
  revision bigint,
  updated_at timestamptz,
  created_at timestamptz,
  facts jsonb
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
    public.admin_hunt_facts(a.progress)
  from public.hunter_accounts a;
$$;

create or replace function public.admin_wallet_facts()
returns table (
  address text,
  revision bigint,
  updated_at timestamptz,
  created_at timestamptz,
  facts jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    h.address,
    h.revision,
    h.updated_at,
    h.created_at,
    public.admin_hunt_facts(h.progress)
  from public.hunters h;
$$;

revoke all on function public.admin_hunt_facts(jsonb) from public, anon, authenticated;
revoke all on function public.admin_account_facts() from public, anon, authenticated;
revoke all on function public.admin_wallet_facts() from public, anon, authenticated;
grant execute on function public.admin_hunt_facts(jsonb) to service_role;
grant execute on function public.admin_account_facts() to service_role;
grant execute on function public.admin_wallet_facts() to service_role;
