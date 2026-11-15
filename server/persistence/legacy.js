/**
 * One-time fold of public.hunter_accounts.progress into public.characters.
 * Used only when loadCharacter finds no characters row. Never overwrites.
 */

import { PersistenceError } from './errors.js';
import { requireUserId } from './ids.js';
import { stateFromLegacyProgress } from './schema.js';

export function warnLegacyImport(log, userId, reason, err) {
  const sink = log && typeof log.warn === 'function' ? log : console;
  const detail = err?.message || err?.code || '';
  sink.warn(
    `[persistence] hunter_accounts import skipped for ${userId}: ${reason}${detail ? ` (${detail})` : ''}`,
  );
}

/**
 * Load the characters row, or import a clamped hunter_accounts hunt once.
 * Returns null (fresh-character path) when there is nothing to import or
 * the blob cannot be parsed. Concurrent callers serialize on the adapter:
 * one insert, the rest reload the existing row.
 */
export async function loadWithLegacyImport(adapter, userId, { log } = {}) {
  const id = requireUserId(userId);
  const existing = await adapter.load(id);
  if (existing) return existing;
  if (typeof adapter.loadLegacyHunt !== 'function') return null;

  let progress;
  try {
    progress = await adapter.loadLegacyHunt(id);
  } catch (err) {
    warnLegacyImport(log, id, 'legacy read failed', err);
    return null;
  }
  if (progress == null) return null;

  let state;
  try {
    state = stateFromLegacyProgress(progress);
  } catch (err) {
    warnLegacyImport(log, id, 'unparseable hunter_accounts.progress', err);
    return null;
  }

  try {
    if (typeof adapter.insertImported === 'function') {
      return await adapter.insertImported(id, state);
    }
    return await adapter.create(id, state.name, { look: state.look, state });
  } catch (err) {
    let raced = null;
    try {
      raced = await adapter.load(id);
    } catch {
      raced = null;
    }
    if (raced) return raced;
    const code = err instanceof PersistenceError ? err.code : err?.code;
    warnLegacyImport(log, id, `legacy import failed${code ? ` (${code})` : ''}`, err);
    return null;
  }
}
