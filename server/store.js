import { createPersistence } from './persistence/api.js';
import { createMemoryAdapter } from './persistence/adapters/memory.js';

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

export function createMemoryPersistence(options = {}) {
  return createPersistence({
    ...options,
    adapter: options.adapter || createMemoryAdapter(),
  });
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
