/** Read and write hunter JSON in localStorage. A damaged record is copied aside, not wiped in silence. */

export const BACKUP_SUFFIX = '.bak';

let frozen = false;

/** Session-only debug: block hunt/roster writes without touching existing keys. */
export function freezeSaves(on) {
  frozen = !!on;
}

export function savesFrozen() {
  return frozen;
}

function store() {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function backupCorrupt(key, text) {
  const ls = store();
  if (!ls) return false;
  try {
    ls.setItem(`${key}${BACKUP_SUFFIX}`, String(text ?? ''));
    return true;
  } catch {
    return false;
  }
}

/** Parse a saved hunt or roster. On bad JSON, keep a `.bak` copy and return null. */
export function readJson(key) {
  const ls = store();
  if (!ls) return { data: null };
  let text;
  try {
    text = ls.getItem(key);
  } catch {
    return { data: null };
  }
  if (!text) return { data: null };
  try {
    const raw = JSON.parse(text);
    if (raw && typeof raw === 'object') return { data: raw };
  } catch {
    /* fall through and back up */
  }
  const backed = backupCorrupt(key, text);
  try {
    ls.removeItem(key);
  } catch {
    /* keep the damaged key if it cannot be cleared */
  }
  return { data: null, corrupt: true, backed, key };
}

export function writeJson(key, value) {
  if (frozen) return;
  const ls = store();
  if (!ls) return;
  try {
    ls.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

export function dropKey(key) {
  if (frozen) return;
  const ls = store();
  if (!ls) return;
  try {
    ls.removeItem(key);
  } catch {
    /* already gone */
  }
}
