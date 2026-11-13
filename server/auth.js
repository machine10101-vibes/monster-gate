/**
 * Account auth for World 1. Guests are rejected; a verified Supabase
 * access token is required to hunt online.
 *
 * Verification, in order:
 *   1. options.verifyToken (tests)
 *   2. dev tokens when ALLOW_DEV_TOKENS=1 (`dev:<uuid>` or `dev:<uuid>:<name>`)
 *   3. HS256 with SUPABASE_JWT_SECRET
 *   4. JWKS at SUPABASE_URL/auth/v1/.well-known/jwks.json
 *   5. GET SUPABASE_URL/auth/v1/user with the anon key
 */

import { createHmac, createPublicKey, timingSafeEqual, verify } from 'node:crypto';
import { cleanName, ProtocolError } from './protocol.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const jwksCache = new Map();

function envOf(env, key) {
  const v = env?.[key];
  return typeof v === 'string' ? v.trim() : '';
}

export function authConfig(env = process.env) {
  const url = envOf(env, 'SUPABASE_URL').replace(/\/$/, '');
  const anon = envOf(env, 'SUPABASE_ANON_KEY') || envOf(env, 'SUPABASE_PUBLISHABLE_KEY');
  const jwtSecret = envOf(env, 'SUPABASE_JWT_SECRET');
  const allowDev = envOf(env, 'ALLOW_DEV_TOKENS') === '1';
  return { url, anon, jwtSecret, allowDev };
}

export function parseOrigins(env = process.env) {
  return envOf(env, 'ALLOWED_ORIGINS').split(',').map((s) => s.trim()).filter(Boolean);
}

export function originAllowed(origin, allowed) {
  if (!allowed || !allowed.length) return true;
  if (allowed.includes('*')) return true;
  if (!origin) return true;
  return allowed.includes(origin);
}

function decodePart(part) {
  const b64 = String(part || '').replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  return JSON.parse(Buffer.from(b64 + pad, 'base64').toString('utf8'));
}

export function peekJwt(token) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length !== 3) return null;
    return { header: decodePart(parts[0]), payload: decodePart(parts[1]), parts };
  } catch {
    return null;
  }
}

function b64urlToBuf(part) {
  const b64 = String(part || '').replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  return Buffer.from(b64 + pad, 'base64');
}

function identityFromPayload(payload, nameHint) {
  const sub = payload?.sub;
  if (typeof sub !== 'string' || !UUID_RE.test(sub)) return null;
  if (payload.exp && payload.exp * 1000 < Date.now()) return null;
  const meta = payload.user_metadata && typeof payload.user_metadata === 'object' ? payload.user_metadata : {};
  return {
    userId: sub.toLowerCase(),
    name: cleanName(nameHint || meta.name || payload.email?.split('@')[0] || 'Hunter'),
    guest: false,
  };
}

function verifyHs256(token, secret) {
  const peeked = peekJwt(token);
  if (!peeked) return null;
  const alg = peeked.header.alg;
  if (alg && alg !== 'HS256') return null;
  const data = `${peeked.parts[0]}.${peeked.parts[1]}`;
  const expected = createHmac('sha256', secret).update(data).digest();
  const sig = b64urlToBuf(peeked.parts[2]);
  if (expected.length !== sig.length || !timingSafeEqual(expected, sig)) return null;
  return peeked.payload;
}

async function verifyViaUser(url, anon, token) {
  const res = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anon, authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const json = await res.json();
  const id = json?.id;
  if (typeof id !== 'string' || !UUID_RE.test(id)) return null;
  const meta = json.user_metadata && typeof json.user_metadata === 'object' ? json.user_metadata : {};
  return {
    userId: id.toLowerCase(),
    name: cleanName(meta.name || json.email?.split('@')[0] || 'Hunter'),
    guest: false,
  };
}

async function loadJwks(url) {
  const cached = jwksCache.get(url);
  if (cached && Date.now() - cached.at < 10 * 60_000) return cached.keys;
  const res = await fetch(`${url}/auth/v1/.well-known/jwks.json`);
  if (!res.ok) return [];
  const json = await res.json();
  const keys = Array.isArray(json.keys) ? json.keys : [];
  jwksCache.set(url, { keys, at: Date.now() });
  return keys;
}

function verifySig(parts, jwk, alg) {
  const pub = createPublicKey({ key: jwk, format: 'jwk' });
  const data = Buffer.from(`${parts[0]}.${parts[1]}`);
  const sig = b64urlToBuf(parts[2]);
  if (alg === 'ES256') return verify('SHA256', data, { key: pub, dsaEncoding: 'ieee-p1363' }, sig);
  if (alg === 'RS256') return verify('SHA256', data, pub, sig);
  return false;
}

async function verifyViaJwks(url, token) {
  const peeked = peekJwt(token);
  if (!peeked) return null;
  const keys = await loadJwks(url);
  const kid = peeked.header.kid;
  const jwk = keys.find((k) => k.kid === kid) || keys[0];
  if (!jwk) return null;
  if (!verifySig(peeked.parts, jwk, peeked.header.alg)) return null;
  return identityFromPayload(peeked.payload);
}

export function parseDevToken(token) {
  const raw = String(token || '');
  const m = /^dev:([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})(?::(.*))?$/i.exec(raw);
  if (!m) return null;
  return { userId: m[1].toLowerCase(), name: cleanName(m[2] || 'Hunter'), guest: false };
}

export async function verifyAccessToken(token, env = process.env) {
  const cfg = authConfig(env);
  if (cfg.allowDev) {
    const dev = parseDevToken(token);
    if (dev) return dev;
  }
  if (cfg.jwtSecret) {
    try {
      const payload = verifyHs256(token, cfg.jwtSecret);
      const ident = payload && identityFromPayload(payload);
      if (ident) return ident;
    } catch {
      /* try the next verifier */
    }
  }
  if (cfg.url) {
    try {
      if (cfg.anon) {
        const user = await verifyViaUser(cfg.url, cfg.anon, token);
        if (user) return user;
      }
      const user = await verifyViaJwks(cfg.url, token);
      if (user) return user;
    } catch {
      /* network / JWKS failure */
    }
  }
  return null;
}

/**
 * @returns {Promise<{ userId: string, name: string, guest: false }>}
 */
export async function identify(hello, env = process.env, verifyToken) {
  const token = hello?.token || '';
  if (!token) {
    throw new ProtocolError('auth', 'Sign in to hunt online. Guests stay solo.');
  }
  let user = null;
  try {
    if (typeof verifyToken === 'function') user = await verifyToken(token, hello);
    else user = await verifyAccessToken(token, env);
  } catch (err) {
    if (err instanceof ProtocolError) throw err;
    throw new ProtocolError('auth', 'That sign-in is not valid.');
  }
  if (!user?.userId || !UUID_RE.test(user.userId)) {
    throw new ProtocolError('auth', 'That sign-in is not valid.');
  }
  return {
    userId: String(user.userId).toLowerCase(),
    name: cleanName(hello?.name || user.name || 'Hunter'),
    guest: false,
  };
}
