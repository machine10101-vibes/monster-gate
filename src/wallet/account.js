/**
 * Email and password accounts live in Supabase Auth.
 * The password is never stored. The hunt is saved under that account
 * so the same email signs in on any device.
 * A browser-only hash remains only so an account created before the
 * guild record was connected can still be opened on this browser.
 */

import { readStaffRole } from '../admin/gate.js';
import { ACCOUNT_SESSION_TAKEN, othersLogoutRequest } from '../../supabase/functions/_shared/accountSession.js';

const BOOK_KEY = 'monster-gate-accounts-v1';
const SESSION_KEY = 'monster-gate-account-session';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 72;
const HASH_ITERS = 210_000;
const MIN_ITERS = 100_000;
const MAX_ITERS = 600_000;

export const CLOUD_UNAVAILABLE = "Couldn't reach the account service. Check your connection and try again.";
export const CLOUD_UNAVAILABLE_RETRY = 'Retry';
export const SESSION_TAKEN = ACCOUNT_SESSION_TAKEN;
const TAKEN_KEY = 'monster-gate-taken-notice';

function fail(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function accountAddress(userId) {
  return `acct:${userId}`;
}

function checkEmail(email) {
  const normalized = normalizeEmail(email);
  if (!EMAIL_RE.test(normalized) || normalized.length > 254) {
    throw fail('invalid', 'Enter the email address for this account.');
  }
  return normalized;
}

function checkPassword(password) {
  const value = String(password ?? '');
  if (value.length < MIN_PASSWORD || value.length > MAX_PASSWORD) {
    throw fail('invalid', 'Use a password of at least 8 characters.');
  }
  return value;
}

function bytesToHex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

async function hashPassword(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    key,
    256,
  );
  return new Uint8Array(bits);
}

function sameBytes(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** The browser-only user id for this email, if an account was created here before the database. */
export function legacyUserId(email) {
  const row = readBook()[normalizeEmail(email)];
  if (!row || !UUID_RE.test(row.userId || '')) return '';
  return row.userId;
}

function readBook() {
  try {
    const raw = JSON.parse(localStorage.getItem(BOOK_KEY) || 'null');
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw;
  } catch {
    /* a damaged book is treated as empty */
  }
  return {};
}

function writeBook(book) {
  localStorage.setItem(BOOK_KEY, JSON.stringify(book));
}

function storedSession() {
  for (const store of [sessionStorage, localStorage]) {
    try {
      const raw = JSON.parse(store.getItem(SESSION_KEY) || 'null');
      if (raw) return raw;
    } catch {
      /* try the other store */
    }
  }
  return null;
}

export function saveAccount(session) {
  const clean = {
    kind: 'email',
    email: session.email,
    userId: session.userId,
    address: accountAddress(session.userId),
    at: session.at || Date.now(),
  };
  if (typeof session.kleverAddress === 'string' && session.kleverAddress) {
    clean.kleverAddress = session.kleverAddress;
  }
  if (typeof session.accessToken === 'string' && session.accessToken) {
    clean.accessToken = session.accessToken;
    clean.refreshToken = typeof session.refreshToken === 'string' ? session.refreshToken : '';
    clean.expiresAt = session.expiresAt || '';
  }
  if (UUID_RE.test(session.sessionId || '')) clean.sessionId = session.sessionId;
  const text = JSON.stringify(clean);
  for (const store of [sessionStorage, localStorage]) {
    try {
      store.setItem(SESSION_KEY, text);
    } catch {
      /* private mode can refuse one of the stores */
    }
  }
  return clean;
}

export function clearAccount() {
  for (const store of [sessionStorage, localStorage]) {
    try {
      store.removeItem(SESSION_KEY);
    } catch {
      /* already gone */
    }
  }
}

/** The signed-in email account, or null. The password is not in this record. */
export function readAccount() {
  const raw = storedSession();
  if (!raw || raw.kind !== 'email') return null;
  const email = normalizeEmail(raw.email);
  if (!EMAIL_RE.test(email) || !UUID_RE.test(raw.userId || '')) {
    clearAccount();
    return null;
  }
  if (raw.accessToken) {
    return saveAccount({ ...raw, email, kleverAddress: raw.kleverAddress || '' });
  }
  const row = readBook()[email];
  if (!row || row.userId !== raw.userId) {
    clearAccount();
    return null;
  }
  return saveAccount({ ...raw, email });
}

async function dummyVerify() {
  const salt = new Uint8Array(16);
  await hashPassword('monster-gate-account', salt, HASH_ITERS);
}

async function verifyLocal(email, password) {
  const row = readBook()[email];
  if (!row || !UUID_RE.test(row.userId || '') || typeof row.salt !== 'string' || typeof row.hash !== 'string') {
    await dummyVerify();
    return null;
  }
  const iterations = Number(row.iter) || HASH_ITERS;
  if (iterations < MIN_ITERS || iterations > MAX_ITERS) {
    await dummyVerify();
    return null;
  }
  const actual = await hashPassword(password, hexToBytes(row.salt), iterations);
  if (!sameBytes(actual, hexToBytes(row.hash))) return null;
  return row.userId;
}

async function createLocal(email, password) {
  const book = readBook();
  if (book[email]) throw fail('exists', 'That email already has an account. Sign in instead.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await hashPassword(password, salt, HASH_ITERS);
  const userId = crypto.randomUUID();
  book[email] = { userId, salt: bytesToHex(salt), hash: bytesToHex(hash), iter: HASH_ITERS };
  writeBook(book);
  return saveAccount({ kind: 'email', email, userId, at: Date.now() });
}

function authHeaders(cfg) {
  return {
    'content-type': 'application/json',
    apikey: cfg.key,
    authorization: `Bearer ${cfg.key}`,
  };
}

function sessionFromAuth(json, email, keep) {
  const session = json.session && typeof json.session === 'object' ? json.session : json;
  const accessToken = session.access_token;
  const user = json.user && typeof json.user === 'object' ? json.user : json;
  const userId = user.id || session.user?.id;
  if (typeof accessToken !== 'string' || !accessToken || !UUID_RE.test(userId || '')) return null;
  const expiresAt = session.expires_at
    ? new Date(Number(session.expires_at) * 1000).toISOString()
    : new Date(Date.now() + (Number(session.expires_in) || 3600) * 1000).toISOString();
  return saveAccount({
    kind: 'email',
    email: normalizeEmail(user.email || email),
    userId,
    accessToken,
    refreshToken: session.refresh_token || '',
    expiresAt,
    kleverAddress: keep?.kleverAddress || '',
    sessionId: keep?.sessionId || '',
    at: Date.now(),
  });
}

async function authError(res) {
  const json = await res.json().catch(() => ({}));
  const msg = `${json.error_description || ''} ${json.msg || ''} ${json.error || ''} ${json.message || ''}`.toLowerCase();
  return { status: res.status, json, msg };
}

function mapAuthFailure(parsed) {
  if (parsed.msg.includes('email') && (parsed.msg.includes('invalid') || parsed.msg.includes('unable') || parsed.msg.includes('valid'))) {
    return fail('invalid', 'Enter the email address for this account.');
  }
  if (parsed.status === 429 || parsed.msg.includes('rate limit')) {
    return fail('invalid', 'Wait a moment, then try the account again.');
  }
  if (parsed.msg.includes('already') || parsed.msg.includes('user_already_exists')) {
    return fail('exists', 'That email already has an account. Sign in instead.');
  }
  if (parsed.msg.includes('password') && parsed.msg.includes('weak')) {
    return fail('invalid', 'Use a password of at least 8 characters.');
  }
  if (parsed.msg.includes('invalid') || parsed.status === 400 || parsed.status === 401) {
    return fail('rejected', 'That email or password was not accepted.');
  }
  return fail('unavailable', 'The account service could not be reached.');
}

async function createRemote(cfg, email, password) {
  let res;
  try {
    res = await fetch(`${cfg.url}/functions/v1/signup`, {
      method: 'POST',
      headers: authHeaders(cfg),
      body: JSON.stringify({ email, password }),
    });
  } catch {
    return null;
  }
  const parsed = await authError(res);
  if (!res.ok) {
    if (res.status === 409 || parsed.msg.includes('already')) {
      throw fail('exists', 'That email already has an account. Sign in instead.');
    }
    throw fail('unavailable', parsed.json?.error || 'The account could not be created.');
  }
  const session = await signInRemote(cfg, email, password);
  if (session === false) throw fail('rejected', 'That email or password was not accepted.');
  return session;
}

async function signInRemote(cfg, email, password) {
  let res;
  try {
    res = await fetch(`${cfg.url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: authHeaders(cfg),
      body: JSON.stringify({ email, password }),
    });
  } catch {
    return null;
  }
  const parsed = await authError(res);
  if (!res.ok) {
    if (parsed.status === 400 || parsed.status === 401) return false;
    throw mapAuthFailure(parsed);
  }
  const session = sessionFromAuth(parsed.json, email);
  if (!session) throw fail('rejected', 'That email or password was not accepted.');
  try {
    return await claimDevice(session);
  } catch (err) {
    clearAccount();
    throw err;
  }
}

async function cloudConfig() {
  const { loadCloudConfig } = await import('./cloud.js');
  return loadCloudConfig();
}

/**
 * Creates the account and signs in. Throws a coded error the title screen can show.
 * A returned session is ready for the hunt. The password is not part of it.
 */
export async function createAccount(email, password, confirm) {
  const normalized = checkEmail(email);
  const secret = checkPassword(password);
  if (secret !== String(confirm ?? '')) throw fail('mismatch', 'Those passwords do not match.');
  const cfg = await cloudConfig();
  if (!cfg.url || !cfg.key) {
    throw fail('unavailable', CLOUD_UNAVAILABLE);
  }
  const remote = await createRemote(cfg, normalized, secret);
  if (!remote) throw fail('unavailable', 'The account service could not be reached.');
  return remote;
}

/** Signs in to the Supabase account. An older browser-only account still opens here. */
export async function signInAccount(email, password) {
  const normalized = checkEmail(email);
  const secret = checkPassword(password);
  const cfg = await cloudConfig();
  if (cfg.url && cfg.key) {
    const remote = await signInRemote(cfg, normalized, secret);
    if (remote) return remote;
    if (remote === null) throw fail('unavailable', 'The account service could not be reached.');
    const userId = await verifyLocal(normalized, secret);
    if (userId) return saveAccount({ kind: 'email', email: normalized, userId, at: Date.now() });
    throw fail('rejected', 'That email or password was not accepted.');
  }
  const userId = await verifyLocal(normalized, secret);
  if (!userId) {
    throw fail('unavailable', CLOUD_UNAVAILABLE);
  }
  return saveAccount({ kind: 'email', email: normalized, userId, at: Date.now() });
}

async function refreshSession(session, cfg) {
  if (!session.refreshToken) throw fail('rejected', 'Sign in again.');
  const res = await fetch(`${cfg.url}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: authHeaders(cfg),
    body: JSON.stringify({ refresh_token: session.refreshToken }),
  });
  const parsed = await authError(res);
  if (res.status === 400 || res.status === 401 || res.status === 403) throw fail('rejected', 'Sign in again.');
  if (!res.ok) throw fail('unavailable', 'The account service could not be reached.');
  const next = sessionFromAuth(parsed.json, session.email, session);
  if (!next) throw fail('rejected', 'Sign in again.');
  return next;
}

/** Copy a refreshed Supabase session onto the object the game is holding. */
function adoptSession(session, next) {
  if (!next) return session;
  if (next !== session) {
    session.accessToken = next.accessToken;
    if (next.refreshToken) session.refreshToken = next.refreshToken;
    if (next.expiresAt) session.expiresAt = next.expiresAt;
    if (next.userId) session.userId = next.userId;
    if (next.email) session.email = next.email;
  }
  saveAccount(session);
  return session;
}

const refreshJobs = new Map();

function refreshOnce(session, cfg) {
  const key = session.userId || session.refreshToken;
  let job = refreshJobs.get(key);
  if (!job) {
    job = refreshSession(session, cfg).finally(() => refreshJobs.delete(key));
    refreshJobs.set(key, job);
  }
  return job;
}

async function freshSession(session) {
  const cfg = await cloudConfig();
  if (!cfg.url || !cfg.key) return null;
  if (session.accessToken && Date.parse(session.expiresAt) > Date.now() + 60_000) return session;
  if (!session.refreshToken) return session.accessToken ? session : null;
  return adoptSession(session, await refreshOnce(session, cfg));
}

function rememberSessionId(session, json) {
  const id = typeof json?.sessionId === 'string' ? json.sessionId.trim() : '';
  if (!UUID_RE.test(id) || !session) return session;
  if (session.sessionId === id) return session;
  session.sessionId = id;
  saveAccount(session);
  return session;
}

function throwIfTaken(res) {
  if (res?.status === 409 && res.json?.taken) throw fail('taken', res.json.error || SESSION_TAKEN);
}

async function revokeOtherSessions(session, cfg) {
  const req = othersLogoutRequest(cfg?.url, session?.accessToken, cfg?.key);
  if (!req) return;
  try {
    await fetch(req.url, req.init);
  } catch {
    /* the seat on account_sessions is what drops the other browser */
  }
}

async function accountOp(session, body, keepalive = false) {
  const { guildPost } = await import('./cloud.js');
  const current = await freshSession(session);
  if (!current?.accessToken) return { state: 'off' };
  const payload = { ...body, accessToken: current.accessToken };
  if (current.sessionId) payload.sessionId = current.sessionId;
  let res = await guildPost(payload, keepalive);
  if (res?.status === 401 && session.refreshToken) {
    const again = adoptSession(session, await refreshSession(session, await cloudConfig()));
    const retry = { ...body, accessToken: again.accessToken };
    if (again.sessionId) retry.sessionId = again.sessionId;
    res = await guildPost(retry, keepalive);
  }
  rememberSessionId(session, res?.json);
  throwIfTaken(res);
  return res;
}

/** A new sign-in takes the seat and the other device is dropped. */
export async function claimDevice(session) {
  if (!session?.accessToken) return session;
  const res = await accountOp(session, { op: 'account-claim' });
  if (res?.state === 'off') return session;
  if (!res || res.status !== 200 || !res.json?.sessionId) {
    throw fail('unavailable', 'The account could not be opened.');
  }
  rememberSessionId(session, res.json);
  await revokeOtherSessions(session, await cloudConfig());
  return session;
}

/** True when this browser still holds the seat. Throws `taken` if another device signed in. */
export async function checkDevice(session) {
  if (!session?.accessToken) return session;
  const res = await accountOp(session, { op: 'account-check' });
  if (res?.state === 'off') return session;
  if (!res || res.status !== 200) throw fail('unavailable', res?.json?.error || 'The account could not be opened.');
  return session;
}

export function markTakenNotice(message) {
  try {
    sessionStorage.setItem(TAKEN_KEY, String(message || SESSION_TAKEN));
  } catch {
    /* private mode */
  }
}

export function consumeTakenNotice() {
  try {
    const msg = sessionStorage.getItem(TAKEN_KEY) || '';
    sessionStorage.removeItem(TAKEN_KEY);
    return msg;
  } catch {
    return '';
  }
}

/** Pull the hunt saved to this email account and fold it into the local roster. */
export async function syncEmailHunt(session, progress, gate = { open: true }) {
  const cfg = await cloudConfig();
  if (!cfg.url || !cfg.key || (!session.accessToken && !session.refreshToken)) return { state: 'error', replaced: false };
  const res = await accountOp(session, { op: 'account-load' });
  if (res?.state === 'off') return { state: 'off', replaced: false };
  if (!res || res.status !== 200) throw fail(res?.json?.taken ? 'taken' : 'unavailable', res?.json?.error || 'The guild record could not be opened.');
  const remote = res.json.progress
    ? {
      progress: res.json.progress,
      revision: Number(res.json.revision) || 0,
      savedAt: Number(res.json.savedAt) || 0,
    }
    : null;
  const { reconcileHunt } = await import('./cloud.js');
  const staff = readStaffRole(res.json?.staff);
  const result = await reconcileHunt(progress, remote, () => {
    if (!gate.open) return Promise.resolve({ abandoned: true });
    return pushEmailHunt(session, progress.data);
  });
  return { ...result, staff };
}

export async function pushEmailHunt(session, data, keepalive = false) {
  const progress = { ...data };
  if (!Number.isFinite(Number(progress.savedAt))) progress.savedAt = Date.now();
  const res = await accountOp(session, { op: 'account-save', progress }, keepalive);
  if (res?.state === 'off') return { error: true };
  if (res?.status === 409) {
    return {
      conflict: true,
      progress: res.json.progress,
      revision: Number(res.json.revision) || 0,
      savedAt: Number(res.json.savedAt) || 0,
    };
  }
  if (!res || res.status !== 200) throw new Error(res?.json?.error || 'The guild record could not be saved.');
  return {
    revision: Number(res.json.revision) || 0,
    savedAt: Number(res.json.savedAt) || 0,
    progress: res.json.progress && typeof res.json.progress === 'object' ? res.json.progress : null,
  };
}
