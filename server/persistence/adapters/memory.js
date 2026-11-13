import { alreadyImported, conflict, invalid, nameTaken, notFound } from '../errors.js';
import {
  FRIEND_STATUS,
  assertCanAccept,
  assertCanRequest,
  assertNotSelf,
  decideRequest,
  emptyFriendsList,
  findPair,
  friendPeer,
  friendRequestResult,
  hunterNotFound,
  listFromRows,
  pairKey,
  parseTarget,
} from '../friends.js';
import { requireUserId } from '../ids.js';
import { requireName } from '../names.js';
import { blankState, characterView, columnsFromState, sanitizeState } from '../schema.js';

/**
 * In-memory store for local dev and unit tests. Same contract as the
 * Supabase adapter: optimistic version, unique names, no guest rows.
 */
export function createMemoryAdapter() {
  const byUser = new Map();
  const names = new Map();
  const friendships = new Map();
  let writes = 0;

  function rowOf(userId) {
    return byUser.get(userId) || null;
  }

  function put(userId, next) {
    const prev = byUser.get(userId);
    if (prev && prev.name !== next.name) names.delete(prev.name.toLowerCase());
    byUser.set(userId, next);
    names.set(next.name.toLowerCase(), userId);
    writes += 1;
    return characterView(next);
  }

  return {
    kind: 'memory',
    get writes() {
      return writes;
    },

    async load(userId) {
      const id = requireUserId(userId);
      const row = rowOf(id);
      return row ? characterView(row) : null;
    },

    async create(userId, name, extra = {}) {
      const id = requireUserId(userId);
      if (rowOf(id)) throw invalid('This account already has a character.');
      const clean = requireName(name);
      if (names.has(clean.toLowerCase())) throw nameTaken(clean);
      const now = new Date().toISOString();
      const state = sanitizeState({ ...blankState(clean, extra.look), ...extra.state, name: clean });
      const cols = columnsFromState(state);
      return put(id, {
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
        created_at: now,
        updated_at: now,
      });
    },

    async save(userId, state, { expectedVersion, importedAt } = {}) {
      const id = requireUserId(userId);
      const row = rowOf(id);
      if (!row) throw notFound(id);
      if (expectedVersion != null && row.version !== expectedVersion) throw conflict(characterView(row));
      const nextState = sanitizeState({ ...row.state, ...state, name: state.name || row.name });
      if (importedAt) nextState.importedAt = Date.parse(importedAt) || Date.now();
      if (nextState.name.toLowerCase() !== row.name.toLowerCase()) {
        const owner = names.get(nextState.name.toLowerCase());
        if (owner && owner !== id) throw nameTaken(nextState.name);
      }
      const cols = columnsFromState(nextState);
      const now = new Date().toISOString();
      return put(id, {
        ...row,
        name: cols.name,
        zone: cols.zone,
        x: cols.x,
        y: cols.y,
        z: cols.z,
        gold: cols.gold,
        last_seen: cols.last_seen || now,
        imported_at: cols.imported_at || row.imported_at,
        version: row.version + 1,
        state: nextState,
        updated_at: now,
      });
    },

    async markImported(userId, at = new Date().toISOString()) {
      const id = requireUserId(userId);
      const row = rowOf(id);
      if (!row) throw notFound(id);
      if (row.imported_at) throw alreadyImported(characterView(row));
      const now = new Date().toISOString();
      row.imported_at = at;
      row.state = { ...row.state, importedAt: Date.parse(at) || Date.now() };
      row.updated_at = now;
      writes += 1;
      return characterView(row);
    },

    reset() {
      byUser.clear();
      names.clear();
      friendships.clear();
      writes = 0;
    },

    async listFriends(userId) {
      const id = requireUserId(userId);
      const rows = [...friendships.values()];
      if (!rows.length) return emptyFriendsList();
      return listFromRows(id, rows, (uid) => rowOf(uid)?.name || null);
    },

    async requestFriend(fromUserId, toUserIdOrName) {
      const from = requireUserId(fromUserId);
      const to = resolveHunter(toUserIdOrName);
      assertNotSelf(from, to.userId);
      const fromRow = rowOf(from);
      if (!fromRow) throw hunterNotFound(from);
      const rows = [...friendships.values()];
      const existing = findPair(rows, from, to.userId);
      const decision = decideRequest(from, to.userId, existing);
      if (decision.action === 'idempotent') {
        return friendRequestResult(FRIEND_STATUS.pending, peerOf(from), to);
      }
      if (decision.action === 'auto_accept') {
        assertCanAccept(from, to.userId, rows);
        const now = new Date().toISOString();
        const next = { ...decision.row, status: FRIEND_STATUS.accepted, updatedAt: now };
        friendships.set(pairKey(from, to.userId), next);
        writes += 1;
        return friendRequestResult(FRIEND_STATUS.accepted, to, peerOf(from));
      }
      assertCanRequest(from, to.userId, rows);
      const now = new Date().toISOString();
      friendships.set(pairKey(from, to.userId), {
        requesterId: from,
        targetId: to.userId,
        status: FRIEND_STATUS.pending,
        createdAt: now,
        updatedAt: now,
      });
      writes += 1;
      return friendRequestResult(FRIEND_STATUS.pending, peerOf(from), to);
    },

    async acceptFriend(userId, otherUserId) {
      const id = requireUserId(userId);
      const other = requireUserId(otherUserId);
      assertNotSelf(id, other);
      const rows = [...friendships.values()];
      const existing = findPair(rows, id, other);
      if (!existing || existing.status !== FRIEND_STATUS.pending || existing.targetId !== id) {
        throw hunterNotFound(other);
      }
      assertCanAccept(id, other, rows);
      const now = new Date().toISOString();
      const next = { ...existing, status: FRIEND_STATUS.accepted, updatedAt: now };
      friendships.set(pairKey(id, other), next);
      writes += 1;
      return friendRequestResult(FRIEND_STATUS.accepted, peerOf(existing.requesterId), peerOf(existing.targetId));
    },

    async declineFriend(userId, otherUserId) {
      const id = requireUserId(userId);
      const other = requireUserId(otherUserId);
      assertNotSelf(id, other);
      const existing = findPair([...friendships.values()], id, other);
      if (!existing || existing.status !== FRIEND_STATUS.pending || existing.targetId !== id) {
        throw hunterNotFound(other);
      }
      friendships.delete(pairKey(id, other));
      writes += 1;
      return { ok: true, userId: id, otherUserId: other };
    },

    async removeFriend(userId, otherUserId) {
      const id = requireUserId(userId);
      const other = requireUserId(otherUserId);
      assertNotSelf(id, other);
      const existing = findPair([...friendships.values()], id, other);
      if (!existing || existing.status !== FRIEND_STATUS.accepted) throw hunterNotFound(other);
      friendships.delete(pairKey(id, other));
      writes += 1;
      return { ok: true, userId: id, otherUserId: other };
    },
  };

  function resolveHunter(toUserIdOrName) {
    const target = parseTarget(toUserIdOrName);
    if (target.kind === 'id') {
      const row = rowOf(target.value);
      if (!row) throw hunterNotFound(target.value);
      return friendPeer(target.value, row.name);
    }
    const owner = names.get(target.value.toLowerCase());
    if (!owner) throw hunterNotFound(target.value);
    return friendPeer(owner, rowOf(owner)?.name || null);
  }

  function peerOf(userId) {
    return friendPeer(userId, rowOf(userId)?.name || null);
  }
}
