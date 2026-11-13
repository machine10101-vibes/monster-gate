import { createClient } from '@supabase/supabase-js';
import {
  alreadyFriends,
  alreadyImported,
  conflict,
  friendCap,
  hunterNotFound,
  invalid,
  nameTaken,
  notFound,
  selfFriend,
  unavailable,
} from '../errors.js';
import {
  FRIEND_CAP,
  FRIEND_STATUS,
  assertNotSelf,
  decideRequest,
  emptyFriendsList,
  friendPeer,
  friendRequestResult,
  listFromRows,
  parseTarget,
} from '../friends.js';
import { requireUserId } from '../ids.js';
import { requireName } from '../names.js';
import { blankState, characterView, columnsFromState, sanitizeState } from '../schema.js';

const ACCEPT_URL = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i;
const LOCAL_URL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

export function createSupabaseAdapter({ url, serviceRoleKey, client } = {}) {
  const db = client || createRemoteClient(url, serviceRoleKey);

  return {
    kind: 'supabase',

    async load(userId) {
      const id = requireUserId(userId);
      const { data, error } = await db.from('characters').select('*').eq('user_id', id).maybeSingle();
      if (error) throw wrap(error);
      return data ? characterView(data) : null;
    },

    async create(userId, name, extra = {}) {
      const id = requireUserId(userId);
      const clean = requireName(name);
      const state = sanitizeState({ ...blankState(clean, extra.look), ...extra.state, name: clean });
      const cols = columnsFromState(state);
      const { data, error } = await db
        .from('characters')
        .insert({
          user_id: id,
          name: cols.name,
          zone: cols.zone,
          x: cols.x,
          y: cols.y,
          z: cols.z,
          gold: cols.gold,
          last_seen: cols.last_seen,
          imported_at: cols.imported_at,
          version: 1,
          state,
        })
        .select('*')
        .single();
      if (error) throw wrap(error, { name: clean, userId: id });
      return characterView(data);
    },

    async save(userId, state, { expectedVersion, importedAt } = {}) {
      const id = requireUserId(userId);
      const current = await this.load(id);
      if (!current) throw notFound(id);
      if (expectedVersion != null && current.version !== expectedVersion) throw conflict(current);

      const nextState = sanitizeState({ ...current.state, ...state, name: state.name || current.name });
      if (importedAt) nextState.importedAt = Date.parse(importedAt) || Date.now();
      const cols = columnsFromState(nextState);
      const patch = {
        name: cols.name,
        zone: cols.zone,
        x: cols.x,
        y: cols.y,
        z: cols.z,
        gold: cols.gold,
        last_seen: cols.last_seen || new Date().toISOString(),
        imported_at: cols.imported_at || (current.importedAt ? new Date(current.importedAt).toISOString() : null),
        version: current.version + 1,
        state: nextState,
        updated_at: new Date().toISOString(),
      };
      if (importedAt) patch.imported_at = importedAt;

      let query = db.from('characters').update(patch).eq('user_id', id);
      if (expectedVersion != null) query = query.eq('version', expectedVersion);
      const { data, error } = await query.select('*').maybeSingle();
      if (error) throw wrap(error, { name: cols.name, userId: id });
      if (!data) {
        const latest = await this.load(id);
        if (!latest) throw notFound(id);
        throw conflict(latest);
      }
      return characterView(data);
    },

    async markImported(userId, at = new Date().toISOString()) {
      const id = requireUserId(userId);
      const current = await this.load(id);
      if (!current) throw notFound(id);
      if (current.importedAt) throw alreadyImported(current);
      const state = { ...current.state, importedAt: Date.parse(at) || Date.now() };
      const { data, error } = await db
        .from('characters')
        .update({ imported_at: at, state, updated_at: new Date().toISOString() })
        .eq('user_id', id)
        .is('imported_at', null)
        .select('*')
        .maybeSingle();
      if (error) throw wrap(error);
      if (!data) throw alreadyImported(await this.load(id));
      return characterView(data);
    },

    async listFriends(userId) {
      const id = requireUserId(userId);
      const rows = await loadPairRows(db, id);
      if (!rows.length) return emptyFriendsList();
      const names = await loadNames(db, otherIds(id, rows));
      return listFromRows(id, rows, (uid) => names.get(uid) ?? null);
    },

    async requestFriend(fromUserId, toUserIdOrName) {
      const from = requireUserId(fromUserId);
      const to = await resolveHunter(db, toUserIdOrName);
      assertNotSelf(from, to.userId);
      const fromPeer = await loadPeer(db, from);
      if (!fromPeer.name) throw hunterNotFound(from);
      const existing = await findPairRow(db, from, to.userId);
      const decision = decideRequest(from, to.userId, existing);
      if (decision.action === 'idempotent') {
        return friendRequestResult(FRIEND_STATUS.pending, fromPeer, to);
      }
      if (decision.action === 'auto_accept') {
        await assertAcceptCaps(db, from, to.userId);
        await setStatus(db, decision.row, FRIEND_STATUS.accepted);
        return friendRequestResult(FRIEND_STATUS.accepted, to, fromPeer);
      }
      await assertRequestCaps(db, from, to.userId);
      const inserted = await insertPending(db, from, to.userId);
      if (inserted.status === FRIEND_STATUS.accepted) {
        return friendRequestResult(FRIEND_STATUS.accepted, friendPeer(inserted.requesterId, to.name), fromPeer);
      }
      return friendRequestResult(FRIEND_STATUS.pending, fromPeer, to);
    },

    async acceptFriend(userId, otherUserId) {
      const id = requireUserId(userId);
      const other = requireUserId(otherUserId);
      assertNotSelf(id, other);
      const existing = await findPairRow(db, id, other);
      if (!existing || existing.status !== FRIEND_STATUS.pending || existing.targetId !== id) {
        throw hunterNotFound(other);
      }
      await assertAcceptCaps(db, id, other);
      await setStatus(db, existing, FRIEND_STATUS.accepted);
      const names = await loadNames(db, [existing.requesterId, existing.targetId]);
      return friendRequestResult(
        FRIEND_STATUS.accepted,
        friendPeer(existing.requesterId, names.get(existing.requesterId)),
        friendPeer(existing.targetId, names.get(existing.targetId)),
      );
    },

    async declineFriend(userId, otherUserId) {
      const id = requireUserId(userId);
      const other = requireUserId(otherUserId);
      assertNotSelf(id, other);
      const existing = await findPairRow(db, id, other);
      if (!existing || existing.status !== FRIEND_STATUS.pending || existing.targetId !== id) {
        throw hunterNotFound(other);
      }
      await deletePair(db, existing);
      return { ok: true, userId: id, otherUserId: other };
    },

    async removeFriend(userId, otherUserId) {
      const id = requireUserId(userId);
      const other = requireUserId(otherUserId);
      assertNotSelf(id, other);
      const existing = await findPairRow(db, id, other);
      if (!existing || existing.status !== FRIEND_STATUS.accepted) throw hunterNotFound(other);
      await deletePair(db, existing);
      return { ok: true, userId: id, otherUserId: other };
    },
  };
}

function fromDb(row) {
  return {
    requesterId: row.requester_id,
    targetId: row.target_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function otherIds(userId, rows) {
  const ids = [];
  for (const row of rows) {
    const other = row.requesterId === userId ? row.targetId : row.requesterId;
    if (other) ids.push(other);
  }
  return ids;
}

async function loadPairRows(db, userId) {
  const { data, error } = await db
    .from('friendships')
    .select('requester_id, target_id, status, created_at, updated_at')
    .or(`requester_id.eq.${userId},target_id.eq.${userId}`)
    .in('status', [FRIEND_STATUS.pending, FRIEND_STATUS.accepted]);
  if (error) throw wrap(error, { table: 'friendships' });
  return (data || []).map(fromDb);
}

async function findPairRow(db, a, b) {
  const { data, error } = await db
    .from('friendships')
    .select('requester_id, target_id, status, created_at, updated_at')
    .or(`and(requester_id.eq.${a},target_id.eq.${b}),and(requester_id.eq.${b},target_id.eq.${a})`)
    .in('status', [FRIEND_STATUS.pending, FRIEND_STATUS.accepted])
    .maybeSingle();
  if (error) throw wrap(error, { table: 'friendships' });
  return data ? fromDb(data) : null;
}

async function loadNames(db, ids) {
  const map = new Map();
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return map;
  const { data, error } = await db.from('characters').select('user_id, name').in('user_id', unique);
  if (error) throw wrap(error);
  for (const row of data || []) map.set(row.user_id, row.name);
  return map;
}

async function loadPeer(db, userId) {
  const names = await loadNames(db, [userId]);
  return friendPeer(userId, names.get(userId) ?? null);
}

function escapeIlike(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

async function resolveHunter(db, toUserIdOrName) {
  const target = parseTarget(toUserIdOrName);
  if (target.kind === 'id') {
    const { data, error } = await db
      .from('characters')
      .select('user_id, name')
      .eq('user_id', target.value)
      .maybeSingle();
    if (error) throw wrap(error);
    if (!data) throw hunterNotFound(target.value);
    return friendPeer(data.user_id, data.name);
  }
  const { data, error } = await db
    .from('characters')
    .select('user_id, name')
    .ilike('name', escapeIlike(target.value))
    .maybeSingle();
  if (error) throw wrap(error);
  if (!data) throw hunterNotFound(target.value);
  return friendPeer(data.user_id, data.name);
}

async function countAccepted(db, userId) {
  const { count, error } = await db
    .from('friendships')
    .select('requester_id', { count: 'exact', head: true })
    .eq('status', FRIEND_STATUS.accepted)
    .or(`requester_id.eq.${userId},target_id.eq.${userId}`);
  if (error) throw wrap(error, { table: 'friendships' });
  return count || 0;
}

async function countOutgoingPending(db, userId) {
  const { count, error } = await db
    .from('friendships')
    .select('requester_id', { count: 'exact', head: true })
    .eq('status', FRIEND_STATUS.pending)
    .eq('requester_id', userId);
  if (error) throw wrap(error, { table: 'friendships' });
  return count || 0;
}

async function assertRequestCaps(db, fromUserId, toUserId) {
  const [fromAccepted, fromPending, toAccepted] = await Promise.all([
    countAccepted(db, fromUserId),
    countOutgoingPending(db, fromUserId),
    countAccepted(db, toUserId),
  ]);
  if (fromAccepted + fromPending >= FRIEND_CAP) throw friendCap(fromUserId);
  if (toAccepted >= FRIEND_CAP) throw friendCap(toUserId);
}

async function assertAcceptCaps(db, userId, otherUserId) {
  const [mine, theirs] = await Promise.all([
    countAccepted(db, userId),
    countAccepted(db, otherUserId),
  ]);
  if (mine >= FRIEND_CAP) throw friendCap(userId);
  if (theirs >= FRIEND_CAP) throw friendCap(otherUserId);
}

async function insertPending(db, from, to) {
  const { data, error } = await db
    .from('friendships')
    .insert({ requester_id: from, target_id: to, status: FRIEND_STATUS.pending })
    .select('requester_id, target_id, status, created_at, updated_at')
    .single();
  if (error) {
    if (String(error.code) === '23505') {
      const existing = await findPairRow(db, from, to);
      if (existing?.status === FRIEND_STATUS.accepted) throw alreadyFriends(from, to);
      if (existing?.status === FRIEND_STATUS.pending) {
        if (existing.requesterId === to && existing.targetId === from) {
          return setStatus(db, existing, FRIEND_STATUS.accepted);
        }
        return existing;
      }
      throw alreadyFriends(from, to);
    }
    throw wrap(error, { table: 'friendships', userId: from, otherUserId: to });
  }
  return fromDb(data);
}

async function setStatus(db, row, status) {
  const { data, error } = await db
    .from('friendships')
    .update({ status })
    .eq('requester_id', row.requesterId)
    .eq('target_id', row.targetId)
    .select('requester_id, target_id, status, created_at, updated_at')
    .maybeSingle();
  if (error) throw wrap(error, { table: 'friendships' });
  if (!data) throw hunterNotFound(row.targetId);
  return fromDb(data);
}

async function deletePair(db, row) {
  const { error } = await db
    .from('friendships')
    .delete()
    .eq('requester_id', row.requesterId)
    .eq('target_id', row.targetId);
  if (error) throw wrap(error, { table: 'friendships' });
}

function createRemoteClient(url, serviceRoleKey) {
  const supabaseUrl = String(url || process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = String(serviceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!supabaseUrl || !(ACCEPT_URL.test(supabaseUrl) || LOCAL_URL.test(supabaseUrl))) {
    throw invalid('SUPABASE_URL is missing or not a Supabase project URL.');
  }
  if (!key) throw invalid('SUPABASE_SERVICE_ROLE_KEY is required for character persistence.');
  return createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/**
 * Map a PostgREST / Postgres error onto PersistenceError.
 * Unique name is the non-PK unique index (`characters_name_lower_idx`).
 * A bare 23505 is name_taken, not a generic persist failure.
 */
export function mapSupabaseError(error, extra = {}) {
  const code = String(error?.code || '');
  const message = error?.message || 'Supabase request failed.';
  const blob = [message, error?.details, error?.hint, error?.constraint].filter(Boolean).join(' ');

  if (code === '23514' && /friendships_no_self/i.test(blob)) {
    return selfFriend();
  }
  if (code === '23505') {
    if (extra.table === 'friendships' || /friendships/i.test(blob)) {
      return alreadyFriends(extra.userId, extra.otherUserId);
    }
    const pk = /characters_pkey|\(user_id\)|\buser_id\b/i.test(blob);
    const named = /characters_name|lower\(\s*name\s*\)|\bname\b/i.test(blob);
    if (pk && !named) return invalid('This account already has a character.', extra);
    return nameTaken(extra.name);
  }
  if (code === '23503') {
    if (extra.table === 'friendships' || /friendships/i.test(blob)) {
      return hunterNotFound(extra.query);
    }
    return invalid('userId is not a known auth user.', extra);
  }
  return unavailable(message, { cause: error, ...extra });
}

function wrap(error, extra = {}) {
  return mapSupabaseError(error, extra);
}
