/**
 * Optional Supabase JWT. When URL + anon key (or JWKS) are set, a valid
 * access token becomes that user. Anything else is a guest name.
 */

import { createPublicKey, verify } from 'node:crypto';
import { cleanName } from './protocol.js';

const jwksCache = new Map();

function envOf(env, key) {
  const v = env?.[key];
  return typeof v === 'string' ? v.trim() : '';
}

export function authConfig(env = process.env) {
  const url = envOf(env, 'SUPABASE_URL').replace(/\/$/, '');
  const anon = envOf(env, 'SUPABASE_ANON_KEY') || envOf(env, 'SUPABASE_PUBLISHABLE_KEY');
  return { url, anon };
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

async function verifyViaUser(url, anon, token) {
  const res = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: anon,
      authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) return null;
  const json = await res.json();
  const id = json?.id;
  if (typeof id !== 'string' || !id) return null;
  const meta = json.user_metadata && typeof json.user_metadata === 'object' ? json.user_metadata : {};
  return {
    userId: id,
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
  const sig = Buffer.from(parts[2].replace(/-/g, '+').replace(/_/g, '/'), 'base64');
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
  const sub = peeked.payload.sub;
  if (typeof sub !== 'string' || !sub) return null;
  if (peeked.payload.exp && peeked.payload.exp * 1000 < Date.now()) return null;
  return {
    userId: sub,
    name: cleanName(peeked.payload.user_metadata?.name || peeked.payload.email?.split('@')[0] || 'Hunter'),
    guest: false,
  };
}

export function guestIdentity(name, id) {
  return {
    userId: id || `g_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`,
    name: cleanName(name),
    guest: true,
  };
}

/**
 * @returns {Promise<{ userId: string, name: string, guest: boolean }>}
 */
export async function identify(hello, env = process.env) {
  const name = hello?.name || 'Hunter';
  const token = hello?.token || '';
  if (!token) return guestIdentity(name);

  const cfg = authConfig(env);
  try {
    if (cfg.url && cfg.anon) {
      const user = await verifyViaUser(cfg.url, cfg.anon, token);
      if (user) return { ...user, name: cleanName(hello.name || user.name) };
    } else if (cfg.url) {
      const user = await verifyViaJwks(cfg.url, token);
      if (user) return { ...user, name: cleanName(hello.name || user.name) };
    }
  } catch {
    /* network / JWKS failure → guest */
  }
  return guestIdentity(name);
}
