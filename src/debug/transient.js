/**
 * Debug-granted gear is session-only. Strip it before the client hands a
 * hunt to localStorage or the cloud. Do not touch the PR #60 save layer.
 */

export const DEBUG_STARTER_ID = '__debug_blade';
export const DEBUG_GRANTED_KEY = 'debugGranted';

export function markDebugGranted(data, { weapon } = {}) {
  if (!data || typeof data !== 'object') return data;
  const g = { ...(data[DEBUG_GRANTED_KEY] || {}) };
  const items = Array.isArray(g.items) ? [...g.items] : [];
  if (weapon) {
    g.weapon = weapon;
    if (!items.includes(weapon)) items.push(weapon);
  }
  g.items = items;
  data[DEBUG_GRANTED_KEY] = g;
  return data;
}

function dropGranted(crafted, ids) {
  if (!crafted || typeof crafted !== 'object' || !ids?.length) return crafted;
  let hit = false;
  const next = { ...crafted };
  for (const id of ids) {
    if (id && Object.prototype.hasOwnProperty.call(next, id)) {
      delete next[id];
      hit = true;
    }
  }
  return hit ? next : crafted;
}

/** Payload the client may write. Never includes debug-granted items. */
export function huntSavePayload(data) {
  if (!data || typeof data !== 'object') return data;
  const granted = data[DEBUG_GRANTED_KEY];
  const next = { ...data };
  delete next[DEBUG_GRANTED_KEY];
  const drop = [];
  if (granted?.weapon) drop.push(granted.weapon);
  if (Array.isArray(granted?.items)) drop.push(...granted.items);
  drop.push(DEBUG_STARTER_ID);
  if (drop.includes(next.weapon) || next.weapon === DEBUG_STARTER_ID) next.weapon = null;
  next.crafted = dropGranted(next.crafted, drop);
  return next;
}

/** Remove leftover debug grants from a loaded hunt (debug mode off). */
export function stripDebugGrantedInPlace(data) {
  if (!data || typeof data !== 'object') return data;
  const clean = huntSavePayload(data);
  delete data[DEBUG_GRANTED_KEY];
  data.weapon = clean.weapon;
  if (clean.crafted) data.crafted = clean.crafted;
  return data;
}
