/**
 * Persistence entry for the world server.
 *
 * Prefers PR #60's `server/persistence/index.js` (`openPersistence()`).
 * When that module is missing, or Supabase env is unset, the #60 helper
 * already falls back to an in-memory adapter so tests run without secrets.
 * This file does not modify `server/persistence/`.
 */

export async function openPersistence(options = {}) {
  try {
    const mod = await import('./persistence/index.js');
    if (typeof mod.openPersistence === 'function') {
      return await mod.openPersistence(options);
    }
  } catch (err) {
    if (err?.code !== 'ERR_MODULE_NOT_FOUND') throw err;
  }
  const { createMemoryAdapter, createPersistence } = await fallback();
  return createPersistence({
    ...options,
    adapter: options.adapter || createMemoryAdapter(),
  });
}

async function fallback() {
  throw new Error('server/persistence/index.js is required (merge PR #60).');
}
