import { requireUserId } from '../ids.js';
import { requireName } from '../names.js';
import { blankState, characterView, columnsFromState, sanitizeState } from '../schema.js';

/**
 * Drops every write. Load always returns null. Useful when a world
 * server is running without a database and should not persist guests
 * or accounts.
 */
export function createNoopAdapter() {
  return {
    kind: 'noop',
    async load(userId) {
      requireUserId(userId);
      return null;
    },
    async create(userId, name, extra = {}) {
      const id = requireUserId(userId);
      const clean = requireName(name);
      const state = sanitizeState({ ...blankState(clean, extra.look), ...extra.state, name: clean });
      const cols = columnsFromState(state);
      const now = new Date().toISOString();
      return characterView({
        user_id: id,
        name: cols.name,
        zone: cols.zone,
        x: cols.x,
        y: cols.y,
        z: cols.z,
        gold: cols.gold,
        last_seen: now,
        imported_at: null,
        version: 1,
        state,
        created_at: now,
        updated_at: now,
      });
    },
    async save(userId, state, { expectedVersion } = {}) {
      const id = requireUserId(userId);
      const next = sanitizeState(state);
      const cols = columnsFromState(next);
      const now = new Date().toISOString();
      return characterView({
        user_id: id,
        name: cols.name,
        zone: cols.zone,
        x: cols.x,
        y: cols.y,
        z: cols.z,
        gold: cols.gold,
        last_seen: now,
        imported_at: next.importedAt ? new Date(next.importedAt).toISOString() : null,
        version: (expectedVersion || 0) + 1,
        state: next,
        created_at: now,
        updated_at: now,
      });
    },
    async markImported() {
      return null;
    },
  };
}
