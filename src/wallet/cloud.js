/**
 * The guild record on Supabase. The browser only talks to the hunter function.
 * Without a project URL and publishable key, the hunt stays on this browser.
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

function readToken(address) {
  try {
    const raw = JSON.parse(sessionStorage.getItem(TOKEN_KEY) || 'null');
    if (raw?.address === address && typeof raw.token === 'string' && Date.parse(raw.expiresAt) > Date.now() + 60_000) {
      return raw.token;
    }
  } catch {
    /* a bad cache just means we sign the session in again */
  }
  return '';
}

function storeToken(address, token, expiresAt) {
  try {
    sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ address, token, expiresAt }));
  } catch {
    /* the token still works until this page closes */
  }
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

async function ensureToken(session) {
  const existing = readToken(session.address);
  if (existing) return existing;
  const res = await guildPost({
    op: 'auth',
    address: session.address,
    message: session.message,
    signature: session.signature,
  });
  if (!res || res.status !== 200 || typeof res.json.token !== 'string') {
    throw new Error(res?.json?.error || 'The guild record could not be opened.');
  }
  storeToken(session.address, res.json.token, res.json.expiresAt);
  return res.json.token;
}

async function withToken(session, body, keepalive) {
  const token = await ensureToken(session);
  let res = await guildPost({ ...body, token }, keepalive);
  if (res?.status === 401) {
    clearCloudToken();
    const again = await ensureToken(session);
    res = await guildPost({ ...body, token: again }, keepalive);
  }
  return res;
}

function stamp(data) {
  const progress = { ...data };
  if (!Number.isFinite(Number(progress.savedAt))) progress.savedAt = Date.now();
  return progress;
}

/** Pull the hunt saved to this wallet. Null means this wallet has no row yet. */
export async function pullHunt(session) {
  const res = await withToken(session, { op: 'load' }, false);
  if (!res || res.status !== 200) throw new Error(res?.json?.error || 'The guild record could not be opened.');
  if (!res.json.progress) return null;
  return {
    progress: res.json.progress,
    revision: Number(res.json.revision) || 0,
    savedAt: Number(res.json.savedAt) || 0,
  };
}

/** Push this hunt. A 409 means another device saved a newer one. */
export async function pushHunt(session, data, keepalive = false) {
  if (session?.kind === 'email') {
    const { pushEmailHunt } = await import('./account.js');
    return pushEmailHunt(session, data, keepalive);
  }
  const progress = stamp(data);
  if (progress !== data) data.savedAt = progress.savedAt;
  const res = await withToken(session, { op: 'save', progress }, keepalive);
  if (res?.status === 409) {
    return {
      conflict: true,
      progress: res.json.progress,
      revision: Number(res.json.revision) || 0,
      savedAt: Number(res.json.savedAt) || 0,
    };
  }
  if (!res || res.status !== 200) throw new Error(res?.json?.error || 'The guild record could not be saved.');
  return { revision: Number(res.json.revision) || 0, savedAt: Number(res.json.savedAt) || 0 };
}

/**
 * Open the guild record and keep whichever hunt was saved later.
 * `replaced` means the wallet's remote hunt replaced this browser's copy.
 * `gate.open` lets the title screen abandon a slow record without it landing mid-hunt.
 */
export async function syncHunt(session, progress, gate = { open: true }) {
  if (session?.kind === 'email') {
    const { syncEmailHunt } = await import('./account.js');
    return syncEmailHunt(session, progress, gate);
  }
  const cfg = await loadCloudConfig();
  if (!cfg.url || !cfg.key) return { state: 'off', replaced: false };
  const remote = await pullHunt(session);
  if (!gate.open) return { state: 'error', replaced: false };
  const localAt = Number(progress.data.savedAt) || 0;
  const remoteAt = Number(remote?.savedAt) || 0;
  if (remote && remoteAt > localAt) {
    progress.loadRaw(remote.progress);
    progress.revision = remote.revision || 0;
    progress.save(false);
    return { state: 'on', replaced: true };
  }
  const pushed = await pushHunt(session, progress.data);
  if (!gate.open) return { state: 'error', replaced: false };
  if (pushed.conflict && pushed.progress) {
    progress.loadRaw(pushed.progress);
    progress.revision = pushed.revision || 0;
    progress.save(false);
    return { state: 'on', replaced: true };
  }
  progress.revision = pushed.revision || progress.revision || 0;
  progress.save(false);
  return { state: 'on', replaced: false };
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
