/**
 * The guild record on Supabase. The browser only talks to the hunter function.
 * Email accounts are Supabase Auth users. The publishable key only identifies the project.
 * Wallet-keyed hunter_sessions tokens cannot load or save a hunt.
 */

const TOKEN_KEY = 'monster-gate-cloud-token';

let configPromise = null;
let timer = 0;
let pending = null;

function envValue(name) {
  const env = import.meta.env;
  return env && typeof env[name] === 'string' ? env[name].trim() : '';
}

function acceptUrl(url) {
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(url);
}

async function readConfig() {
  const url = envValue('VITE_SUPABASE_URL').replace(/\/$/, '');
  const key = envValue('VITE_SUPABASE_ANON_KEY');
  if (url && key && acceptUrl(url)) return { url, key };
  try {
    const res = await fetch(new URL('supabase.json', document.baseURI), { cache: 'no-store' });
    if (!res.ok) return { url: '', key: '' };
    const json = await res.json();
    const fileUrl = String(json.url || '').trim().replace(/\/$/, '');
    const fileKey = String(json.key || json.anonKey || '').trim();
    if (!fileUrl || !fileKey || !acceptUrl(fileUrl)) return { url: '', key: '' };
    return { url: fileUrl, key: fileKey };
  } catch {
    return { url: '', key: '' };
  }
}

export function loadCloudConfig() {
  if (!configPromise) configPromise = readConfig();
  return configPromise;
}

export async function cloudEnabled() {
  const cfg = await loadCloudConfig();
  return !!(cfg.url && cfg.key);
}

/** Hunts sync only for email (including Klever-linked email) sessions. */
export function cloudHuntAllowed(session) {
  return session?.kind === 'email';
}

export function clearCloudToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* already gone */
  }
}

export async function guildPost(body, keepalive = false) {
  const cfg = await loadCloudConfig();
  if (!cfg.url || !cfg.key) return null;
  const res = await fetch(`${cfg.url}/functions/v1/hunter`, {
    method: 'POST',
    keepalive,
    headers: {
      'content-type': 'application/json',
      apikey: cfg.key,
      authorization: `Bearer ${cfg.key}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

/** Push this hunt. Email sessions only. A 409 means another device saved a newer one. */
export async function pushHunt(session, data, keepalive = false) {
  if (!cloudHuntAllowed(session)) return { error: true };
  const { pushEmailHunt } = await import('./account.js');
  return pushEmailHunt(session, data, keepalive);
}

/**
 * Keep every character. A hunt stays with whichever copy was saved later.
 * `push` reads `progress.data` when it runs.
 * `abandoned` means the player signed out before the write, so the local copy stands.
 */
export async function reconcileHunt(progress, remote, push) {
  if (typeof progress.mergeFrom === 'function') {
    const outcome = remote?.progress
      ? progress.mergeFrom(remote.progress)
      : {
        replaced: false,
        push: typeof progress.hasLocalProgress === 'function' ? progress.hasLocalProgress() : false,
        replacedIds: [],
      };
    if (remote?.revision) progress.revision = remote.revision || 0;
    if (!outcome.push) return { state: 'on', replaced: !!outcome.replaced };
    let pushed = await push();
    if (pushed?.abandoned) return { state: 'on', replaced: !!outcome.replaced, abandoned: true };
    if (pushed?.error) throw new Error('The guild record could not be saved.');
    if (pushed?.progress && typeof progress.mergeFrom === 'function') {
      const again = progress.mergeFrom(pushed.progress);
      progress.revision = pushed.revision || progress.revision || 0;
      if (again.push && !pushed.conflict) {
        pushed = await push();
        if (pushed?.abandoned) return { state: 'on', replaced: !!(outcome.replaced || again.replaced), abandoned: true };
        if (pushed?.error) throw new Error('The guild record could not be saved.');
        if (pushed?.progress) progress.mergeFrom(pushed.progress);
      }
      progress.revision = pushed?.revision || progress.revision || 0;
      return { state: 'on', replaced: !!(outcome.replaced || again.replaced) };
    }
    if (pushed?.conflict && pushed.progress) {
      const again = progress.mergeFrom(pushed.progress);
      progress.revision = pushed.revision || progress.revision || 0;
      return { state: 'on', replaced: !!(outcome.replaced || again.replaced) };
    }
    progress.revision = pushed?.revision || progress.revision || 0;
    return { state: 'on', replaced: !!outcome.replaced };
  }

  const localAt = Number(progress.data.savedAt) || 0;
  const remoteAt = Number(remote?.savedAt) || 0;
  if (remote?.progress && remoteAt > localAt) {
    progress.loadRaw(remote.progress);
    progress.revision = remote.revision || 0;
    progress.save(false);
    return { state: 'on', replaced: true };
  }
  const pushed = await push();
  if (pushed?.abandoned) return { state: 'on', replaced: false, abandoned: true };
  if (pushed?.error) throw new Error('The guild record could not be saved.');
  if (pushed?.conflict && pushed.progress) {
    progress.loadRaw(pushed.progress);
    progress.revision = pushed.revision || 0;
    progress.save(false);
    return { state: 'on', replaced: true };
  }
  progress.revision = pushed?.revision || progress.revision || 0;
  progress.save(false);
  return { state: 'on', replaced: false };
}

/**
 * Open the guild record and fold it into the roster on this device.
 * `gate.open` stops a write after the player has signed out.
 * A download that finishes is still applied.
 */
export async function syncHunt(session, progress, gate = { open: true }) {
  if (!cloudHuntAllowed(session)) {
    clearCloudToken();
    return { state: 'off', replaced: false };
  }
  const { syncEmailHunt } = await import('./account.js');
  return syncEmailHunt(session, progress, gate);
}

/** Debounce gameplay saves so a fight does not write the guild record on every hit. */
export function schedulePush(session, data, onDone) {
  pending = {
    session,
    data: JSON.parse(JSON.stringify(data)),
    onDone,
  };
  clearTimeout(timer);
  timer = setTimeout(() => {
    flushCloud();
  }, 1500);
}

export function flushCloud() {
  const job = pending;
  pending = null;
  clearTimeout(timer);
  timer = 0;
  if (!job) return Promise.resolve();
  return pushHunt(job.session, job.data, true)
    .then((result) => {
      job.onDone?.(result);
    })
    .catch(() => {
      job.onDone?.({ error: true });
    });
}
