import { addressFromPublicKey } from './verify.js';
import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha2.js';
import { ADDRESS_RE, createMemoryAuth } from '../../supabase/functions/_shared/linkAuth.js';

ed.hashes.sha512 = sha512;

export const MOCK_STORE_KEY = 'monster-gate-mock-wallet';
export const MOCK_BADGE_ID = 'mock-wallet-badge';

let installed = null;

function paramsOf(search) {
  const raw = String(search ?? '');
  const q = raw.startsWith('?') ? raw.slice(1) : raw;
  return new URLSearchParams(q);
}

function bytesFromSeed(seed) {
  const bytes = new Uint8Array(32);
  const text = new TextEncoder().encode(seed);
  for (let i = 0; i < 32; i++) bytes[i] = (text[i % text.length] || 0) ^ (i * 17 + seed.length);
  return bytes;
}

function addressFromSeed(seed) {
  const pub = ed.getPublicKey(bytesFromSeed(seed));
  return addressFromPublicKey(pub);
}

export function parseMockWallet(search = '') {
  const q = paramsOf(search);
  if (!q.has('mockwallet')) return null;
  const raw = String(q.get('mockwallet') || '').trim();
  if (ADDRESS_RE.test(raw)) return { enabled: true, address: raw, raw };
  const seed = raw && raw !== '1' && raw.toLowerCase() !== 'true' ? raw : 'monster-gate-mock';
  return { enabled: true, address: addressFromSeed(`mg-mock:${seed}`), raw: raw || '1' };
}

function sessionStore() {
  try {
    return sessionStorage;
  } catch {
    return null;
  }
}

export function loadMockAuth(address) {
  const auth = createMemoryAuth({ allowMock: true });
  const store = sessionStore();
  if (store) {
    try {
      const raw = JSON.parse(store.getItem(MOCK_STORE_KEY) || 'null');
      if (raw) auth.restore(raw);
    } catch {
      /* a damaged mock book starts empty */
    }
  }
  auth.mockAddress = address;
  const persist = () => {
    try {
      store?.setItem(MOCK_STORE_KEY, JSON.stringify(auth.serialize()));
    } catch {
      /* session-only; private mode may refuse */
    }
  };
  const wrap = (name) => {
    const fn = auth[name].bind(auth);
    auth[name] = (...args) => {
      const out = fn(...args);
      persist();
      return out;
    };
  };
  for (const name of ['issueNonce', 'createEmailAccount', 'link', 'unlink', 'login', 'rememberSession']) wrap(name);
  persist();
  return auth;
}

export function mockProvider(address) {
  return {
    getWalletAddress: () => address,
    address,
    initialize: async () => {},
    signMessage: async (message) => {
      const line = String(message).split('\n').find((l) => l.startsWith('Nonce: '));
      const nonce = line ? line.slice('Nonce: '.length).trim() : '';
      return `mock:${nonce}`;
    },
  };
}

export function showMockBadge(address) {
  if (typeof document === 'undefined') return;
  let el = document.getElementById(MOCK_BADGE_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = MOCK_BADGE_ID;
    document.body.appendChild(el);
  }
  el.textContent = 'MOCK WALLET';
  el.title = address ? `Tester wallet ${address} (session only)` : 'Tester wallet (session only)';
  document.body.classList.add('mock-wallet');
}

export function isMockWallet() {
  return !!installed;
}

export function mockAuth() {
  return installed?.auth || null;
}

export function mockAddress() {
  return installed?.address || '';
}

/** Session-only Klever stand-in. Never writes localStorage. Never creates a real account. */
export function installMockWallet(search, win = typeof window !== 'undefined' ? window : null) {
  const parsed = parseMockWallet(search ?? (typeof location !== 'undefined' ? location.search : ''));
  if (!parsed?.enabled) {
    installed = null;
    return null;
  }
  const auth = loadMockAuth(parsed.address);
  const provider = mockProvider(parsed.address);
  installed = { address: parsed.address, auth, provider };
  if (win) {
    win.kleverWeb = provider;
    win.__mgMockWallet = installed;
  }
  showMockBadge(parsed.address);
  return installed;
}
