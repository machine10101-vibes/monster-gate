import { alreadyImported, conflict, invalid, nameTaken, notFound } from '../errors.js';
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
      writes = 0;
    },
  };
}
