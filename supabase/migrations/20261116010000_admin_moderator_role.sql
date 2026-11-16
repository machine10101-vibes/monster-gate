-- Moderators can open the ledger and still hunt.
-- The guild master keeps the ledger and does not enter the hunt.

alter table public.admins
  add column if not exists role text not null default 'master';

update public.admins
set role = 'master'
where email = 'monstergateonline@gmail.com';

alter table public.admins
  alter column role set default 'moderator';

alter table public.admins
  drop constraint if exists admins_role_chk;

alter table public.admins
  add constraint admins_role_chk check (role in ('master', 'moderator'));

comment on table public.admins is
  'Guild staff emails. The guild master signs in at /admin.html and does not enter the hunt. Moderators hunt and can open the ledger.';

comment on column public.admins.role is
  'master keeps the ledger and does not hunt. moderator is a hunter who can open the ledger.';

grant select, insert, update, delete on table public.admins to service_role;
