/**
 * Character persistence seam.
 *
 * PR #60 ships `server/persistence/index.js` with:
 *   openPersistence() → { loadCharacter, createCharacter, saveCharacter, flushAll }
 *
 * Until that module is on main, this file provides an in-memory adapter with
 * the same methods. When `./persistence/index.js` exists, it is used instead.
 *
 * SUPABASE_SERVICE_ROLE_KEY is read from the environment only. Never commit it.
 */

export function createMemoryPersistence() {
  const byUser = new Map();

  function rowOf(userId, name, state = {}) {
    return {
      userId,
      name,
      version: 1,
      state: {
        name,
        x: 72,
        y: 3.2,
        z: 72.5,
        zone: 'Oakhollow',
        ...state,
      },
    };
  }

  return {
    kind: 'memory',
    adapterKind: 'memory',

    async loadCharacter(userId) {
      if (!userId) return null;
      return byUser.get(String(userId)) || null;
    },

    async createCharacter(userId, name, extra = {}) {
      const id = String(userId);
      const row = rowOf(id, name || 'Hunter', extra.state);
      byUser.set(id, row);
      return row;
    },

    async saveCharacter(userId, state = {}) {
      const id = String(userId);
      let row = byUser.get(id);
      if (!row) {
        row = rowOf(id, state.name || 'Hunter', state);
        byUser.set(id, row);
        return row;
      }
      row.state = { ...row.state, ...state };
      row.name = state.name || row.name;
      row.version += 1;
      return row;
    },

    async flush() {},
    async flushAll() {},
    installShutdownHandlers() {},
    async close() {
      byUser.clear();
    },
  };
}

export async function openPersistence(options = {}) {
  if (options.memory || options.adapterKind === 'memory') {
    return options.adapter || createMemoryPersistence();
  }
  try {
    const mod = await import('./persistence/index.js');
    if (typeof mod.openPersistence === 'function') {
      return await mod.openPersistence(options);
    }
  } catch (err) {
    if (err?.code !== 'ERR_MODULE_NOT_FOUND') throw err;
  }
  return createMemoryPersistence();
}
