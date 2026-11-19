-- Serialize friend accept / reverse-request so two concurrent accepts
-- cannot push a player past 100 (MG-SOC-1). Service role only.
-- Apply after 20261113200000_friendships.sql.

create or replace function public.friend_lock_pair(a uuid, b uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if a is null or b is null then
    raise exception using errcode = 'P0001', message = 'invalid';
  end if;
  if a = b then
    raise exception using errcode = 'P0001', message = 'self';
  end if;
  -- Lock both accounts in uuid order so concurrent (A,B) and (A,C)
  -- serialize on A without deadlocking.
  if a < b then
    perform pg_advisory_xact_lock(hashtext('mg.friend:' || a::text));
    perform pg_advisory_xact_lock(hashtext('mg.friend:' || b::text));
  else
    perform pg_advisory_xact_lock(hashtext('mg.friend:' || b::text));
    perform pg_advisory_xact_lock(hashtext('mg.friend:' || a::text));
  end if;
end;
$$;

create or replace function public.friend_accepted_count(p_user uuid, p_skip_req uuid default null, p_skip_tgt uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  select count(*)::integer into n
  from public.friendships
  where status = 'accepted'
    and (requester_id = p_user or target_id = p_user)
    and not (
      p_skip_req is not null
      and requester_id = p_skip_req
      and target_id = p_skip_tgt
    );
  return coalesce(n, 0);
end;
$$;

create or replace function public.friend_raise_if_accept_capped(p_a uuid, p_b uuid, p_skip_req uuid default null, p_skip_tgt uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.friend_accepted_count(p_a, p_skip_req, p_skip_tgt) >= 100
     or public.friend_accepted_count(p_b, p_skip_req, p_skip_tgt) >= 100 then
    raise exception using errcode = 'P0001', message = 'friend_cap';
  end if;
end;
$$;

-- p_user is the acceptor (must be target of a pending row from p_other).
create or replace function public.friend_accept(p_user uuid, p_other uuid)
returns public.friendships
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.friendships;
begin
  perform public.friend_lock_pair(p_user, p_other);

  select * into r
  from public.friendships
  where requester_id = p_other
    and target_id = p_user
    and status = 'pending'
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;

  perform public.friend_raise_if_accept_capped(p_user, p_other, r.requester_id, r.target_id);

  update public.friendships
  set status = 'accepted'
  where requester_id = r.requester_id
    and target_id = r.target_id
  returning * into r;

  return r;
end;
$$;

-- Insert pending, idempotent same-direction pending, or auto-accept a
-- reverse pending — always through the same cap check as friend_accept.
create or replace function public.friend_request(p_from uuid, p_to uuid)
returns public.friendships
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.friendships;
  n_from_list integer;
  n_to_accepted integer;
begin
  perform public.friend_lock_pair(p_from, p_to);

  select * into r
  from public.friendships
  where status in ('pending', 'accepted')
    and (
      (requester_id = p_from and target_id = p_to)
      or (requester_id = p_to and target_id = p_from)
    )
  for update;

  if found then
    if r.status = 'accepted' then
      raise exception using errcode = 'P0001', message = 'already_friends';
    end if;
    if r.requester_id = p_from and r.target_id = p_to then
      return r;
    end if;
    -- Reverse pending: auto-accept only if both sides are under the cap.
    -- On friend_cap the pending row is left unchanged.
    perform public.friend_raise_if_accept_capped(p_from, p_to, r.requester_id, r.target_id);
    update public.friendships
    set status = 'accepted'
    where requester_id = r.requester_id
      and target_id = r.target_id
    returning * into r;
    return r;
  end if;

  select count(*)::integer into n_from_list
  from public.friendships
  where (status = 'accepted' and (requester_id = p_from or target_id = p_from))
     or (status = 'pending' and requester_id = p_from);

  select public.friend_accepted_count(p_to) into n_to_accepted;

  if coalesce(n_from_list, 0) >= 100 or coalesce(n_to_accepted, 0) >= 100 then
    raise exception using errcode = 'P0001', message = 'friend_cap';
  end if;

  insert into public.friendships (requester_id, target_id, status)
  values (p_from, p_to, 'pending')
  returning * into r;

  return r;
end;
$$;

-- Belt-and-braces: any path that writes status=accepted is serialized and capped.
create or replace function public.friendships_enforce_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from 'accepted' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'accepted' then
    return new;
  end if;
  perform public.friend_lock_pair(new.requester_id, new.target_id);
  perform public.friend_raise_if_accept_capped(
    new.requester_id,
    new.target_id,
    new.requester_id,
    new.target_id
  );
  return new;
end;
$$;

drop trigger if exists friendships_enforce_cap on public.friendships;
create trigger friendships_enforce_cap
  before insert or update of status on public.friendships
  for each row
  execute procedure public.friendships_enforce_cap();

revoke all on function public.friend_lock_pair(uuid, uuid) from public, anon, authenticated;
revoke all on function public.friend_accepted_count(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.friend_raise_if_accept_capped(uuid, uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.friend_accept(uuid, uuid) from public, anon, authenticated;
revoke all on function public.friend_request(uuid, uuid) from public, anon, authenticated;
revoke all on function public.friendships_enforce_cap() from public, anon, authenticated;

grant execute on function public.friend_accept(uuid, uuid) to service_role;
grant execute on function public.friend_request(uuid, uuid) to service_role;

comment on function public.friend_accept(uuid, uuid) is
  'Accept a pending request under an advisory lock; raises friend_cap/not_found/self.';

comment on function public.friend_request(uuid, uuid) is
  'Create a pending request or auto-accept a reverse pending, with the same 100 cap.';
