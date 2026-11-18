import { loadCloudConfig } from './cloud.js';
import { refreshAccountSession, saveAccount } from './account.js';
import {
  connectWallet,
  isMobile,
  launchKleverApp,
  markPrompt,
  signProof,
} from './klever.js';
import { isMockWallet, mockAddress, mockAuth } from './mock.js';
import {
  UNLINKED_CODE,
  UNLINKED_MESSAGE,
  fail,
  mockSignatureFor,
  signedMessage,
} from '../../supabase/functions/_shared/linkAuth.js';

function authHeaders(cfg, accessToken) {
  const headers = {
    'content-type': 'application/json',
    apikey: cfg.key,
    authorization: `Bearer ${accessToken || cfg.key}`,
  };
  return headers;
}

async function walletPost(body, accountSession = null) {
  const cfg = await loadCloudConfig();
  if (!cfg.url || !cfg.key) return { status: 0, json: { error: 'The account service could not be reached.' } };
  const send = async (payload) => {
    let res;
    try {
      res = await fetch(`${cfg.url}/functions/v1/wallet`, {
        method: 'POST',
        headers: authHeaders(cfg, payload.accessToken),
        body: JSON.stringify(payload),
      });
    } catch {
      return { status: 0, json: { error: 'The account service could not be reached.' } };
    }
    const json = await res.json().catch(() => ({}));
    return { status: res.status, json };
  };

  let current = accountSession;
  let payload = body;
  if (current) {
    current = await refreshAccountSession(current);
    if (!current?.accessToken) {
      return {
        status: 401,
        json: { code: 'email-session', error: 'This email account has no cloud sign-in session. Create or sign in to a cloud email account before connecting Klever.' },
      };
    }
    payload = { ...body, accessToken: current.accessToken };
  }

  let result = await send(payload);
  // A token can be revoked before its recorded expiry. Refresh once on auth failure.
  if (result.status === 401 && current?.refreshToken) {
    try {
      current = await refreshAccountSession(current, { force: true });
      result = await send({ ...body, accessToken: current.accessToken });
    } catch {
      /* Keep the original server response if the refresh token is no longer valid. */
    }
  }
  return result;
}

function snapshotOf(session) {
  if (!session) return null;
  return {
    kind: 'email',
    email: session.email,
    userId: session.userId,
    accessToken: session.accessToken || '',
    refreshToken: session.refreshToken || '',
    expiresAt: session.expiresAt || '',
    at: session.at || Date.now(),
  };
}

function sessionFromWallet(json, fallbackEmail) {
  const raw = json.session && typeof json.session === 'object' ? json.session : json;
  const accessToken = raw.access_token || raw.accessToken;
  const user = raw.user && typeof raw.user === 'object' ? raw.user : {};
  const userId = json.userId || user.id || raw.user?.id;
  if (typeof accessToken !== 'string' || !accessToken || !userId) return null;
  const expiresAt = raw.expires_at
    ? new Date(Number(raw.expires_at) * 1000).toISOString()
    : raw.expiresAt || new Date(Date.now() + (Number(raw.expires_in) || 3600) * 1000).toISOString();
  return saveAccount({
    kind: 'email',
    email: (json.email || user.email || fallbackEmail || '').toLowerCase(),
    userId,
    accessToken,
    refreshToken: raw.refresh_token || raw.refreshToken || '',
    expiresAt,
    kleverAddress: json.address || '',
    at: Date.now(),
  });
}

async function remoteNonce(purpose, address, session) {
  const res = await walletPost({ op: 'nonce', purpose, address }, session);
  if (!res.json?.nonce) {
    const err = fail(res.json?.code || 'unavailable', res.json?.error || 'The account service could not be reached.');
    throw err;
  }
  return res.json;
}

async function mockNonce(purpose, address, accessToken, session) {
  const auth = mockAuth();
  if (!auth) throw fail('unavailable', 'Mock wallet is not active.');
  const userId = session?.userId || '';
  const out = auth.issueNonce({ purpose, address, userId });
  if (!out.ok) throw fail(out.code, out.error);
  return out;
}

export async function requestNonce(purpose, address, session) {
  if (isMockWallet()) return mockNonce(purpose, address, session?.accessToken, session);
  return remoteNonce(purpose, address, session);
}

async function signFor(purpose, session) {
  if (isMobile() && !window.kleverWeb) {
    markPrompt();
    launchKleverApp();
    throw fail('mobile-app', 'Open this page in the Klever Wallet app. The app will ask you to sign.');
  }
  const { kw, address, mobile } = await connectWallet();
  const nonce = await requestNonce(purpose, address, session);
  if (isMockWallet()) {
    const issued = new Date().toISOString();
    const message = signedMessage({ purpose, address, nonce: nonce.nonce, issued });
    return { address, message, signature: mockSignatureFor(nonce.nonce), nonce: nonce.nonce };
  }
  return signProof(purpose, nonce.nonce, address, kw, mobile);
}

export async function loginWithKlever() {
  const proof = await signFor('login', null);
  if (isMockWallet()) {
    const auth = mockAuth();
    const out = auth.login({
      address: proof.address,
      message: proof.message,
      signature: proof.signature,
    });
    if (!out.ok) throw fail(out.code, out.error);
    if (!out.session) throw fail(UNLINKED_CODE, UNLINKED_MESSAGE);
    return saveAccount({ ...out.session, kleverAddress: proof.address, at: Date.now() });
  }
  const res = await walletPost({
    op: 'login',
    address: proof.address,
    message: proof.message,
    signature: proof.signature,
  });
  if (res.json?.code === UNLINKED_CODE || res.status === 401 && res.json?.error === UNLINKED_MESSAGE) {
    throw fail(UNLINKED_CODE, UNLINKED_MESSAGE);
  }
  if (res.status !== 200) {
    throw fail(res.json?.code || 'rejected', res.json?.error || 'Klever sign-in failed.');
  }
  if (res.json?.created) throw fail('rejected', UNLINKED_MESSAGE);
  const session = sessionFromWallet(res.json, res.json.email);
  if (!session) throw fail('rejected', 'Klever sign-in failed.');
  session.kleverAddress = proof.address;
  const seated = saveAccount(session);
  const { claimDevice } = await import('./account.js');
  return claimDevice(seated);
}


const KLEVER_HANDOFF_KEY = 'monster-gate-klever-handoff';

function randomHex(bytes = 32) {
  return [...crypto.getRandomValues(new Uint8Array(bytes))]
    .map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function startKleverHandoff() {
  const id = crypto.randomUUID();
  const pollToken = randomHex(32);
  const res = await walletPost({ op: 'handoff_start', id, pollToken });
  if (res.status !== 200) throw fail(res.json?.code || 'unavailable', res.json?.error || 'Could not start Klever sign-in.');
  const handoff = { id, pollToken, createdAt: Date.now() };
  try { localStorage.setItem(KLEVER_HANDOFF_KEY, JSON.stringify(handoff)); } catch { /* in-memory flow can still continue */ }
  return handoff;
}

export async function readKleverHandoff() {
  try {
    const value = JSON.parse(localStorage.getItem(KLEVER_HANDOFF_KEY) || 'null');
    if (!value || !/^[0-9a-f-]{36}$/i.test(value.id || '') || !/^[0-9a-f]{64}$/.test(value.pollToken || '')) return null;
    if (Date.now() - Number(value.createdAt || 0) > 5 * 60 * 1000) {
      localStorage.removeItem(KLEVER_HANDOFF_KEY);
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

export async function pollKleverHandoff(handoff) {
  if (!handoff?.id || !handoff?.pollToken) throw fail('handoff-expired', 'The Klever sign-in request expired. Please try again.');
  const res = await walletPost({ op: 'handoff_poll', id: handoff.id, pollToken: handoff.pollToken });
  if (res.status === 0 || res.status >= 500) return null;
  if (res.status !== 200) {
    try { localStorage.removeItem(KLEVER_HANDOFF_KEY); } catch { /* ignore */ }
    throw fail(res.json?.code || 'unavailable', res.json?.error || 'Could not check Klever sign-in.');
  }
  if (!res.json?.complete || !res.json?.session) return null;
  try { localStorage.removeItem(KLEVER_HANDOFF_KEY); } catch { /* ignore */ }
  const session = sessionFromWallet(res.json.session, res.json.session.email);
  if (!session) throw fail('rejected', 'Klever sign-in completed, but the account session could not be restored.');
  const seated = saveAccount(session);
  const { claimDevice } = await import('./account.js');
  return claimDevice(seated);
}

export async function completeKleverHandoff(id) {
  const { kw, address, mobile } = await connectWallet();
  const nonceResult = await walletPost({ op: 'handoff_nonce', id, address });
  if (nonceResult.status !== 200 || !nonceResult.json?.nonce) {
    throw fail(nonceResult.json?.code || 'handoff-expired', nonceResult.json?.error || 'This sign-in request expired. Return to your original browser and try again.');
  }
  const proof = await signProof('login', nonceResult.json.nonce, address, kw, mobile);
  const res = await walletPost({
    op: 'handoff_complete',
    id,
    address: proof.address,
    message: proof.message,
    signature: proof.signature,
  });
  if (res.status !== 200) throw fail(res.json?.code || 'rejected', res.json?.error || 'Klever sign-in could not be completed.');
  return true;
}

export async function linkKleverWallet(session) {
  if (!session?.userId) throw fail('rejected', 'Sign in with email first.');
  const current = isMockWallet() ? session : await refreshAccountSession(session);
  if (!isMockWallet() && !current?.accessToken) {
    throw fail('rejected', 'This email account has no cloud sign-in session. Create or sign in to a cloud email account before connecting Klever.');
  }
  const proof = await signFor('link', current);
  if (isMockWallet()) {
    const auth = mockAuth();
    const out = auth.link({
      userId: current.userId,
      email: current.email,
      address: proof.address,
      message: proof.message,
      signature: proof.signature,
      session: snapshotOf(current),
    });
    if (!out.ok) throw fail(out.code, out.error);
    current.kleverAddress = proof.address;
    return saveAccount(current);
  }
  const res = await walletPost({
    op: 'link',
    address: proof.address,
    message: proof.message,
    signature: proof.signature,
  }, current);
  if (res.status !== 200) {
    throw fail(res.json?.code || 'rejected', res.json?.error || 'The wallet could not be linked.');
  }
  current.kleverAddress = proof.address;
  return saveAccount(current);
}

export async function unlinkKleverWallet(session) {
  if (!session?.userId) throw fail('rejected', 'Sign in with email first.');
  const current = isMockWallet() ? session : await refreshAccountSession(session);
  if (!isMockWallet() && !current?.accessToken) {
    throw fail('rejected', 'This email account has no cloud sign-in session. Create or sign in to a cloud email account before connecting Klever.');
  }
  if (isMockWallet()) {
    const auth = mockAuth();
    const out = auth.unlink({ userId: current.userId });
    if (!out.ok) throw fail(out.code, out.error);
    current.kleverAddress = '';
    return saveAccount(current);
  }
  const res = await walletPost({ op: 'unlink' }, current);
  if (res.status !== 200) {
    throw fail(res.json?.code || 'rejected', res.json?.error || 'The wallet could not be unlinked.');
  }
  current.kleverAddress = '';
  return saveAccount(current);
}

export async function linkedWalletStatus(session) {
  if (!session?.userId) return { address: '' };
  if (isMockWallet()) {
    const auth = mockAuth();
    const out = auth.status({ userId: session.userId });
    return { address: out.address || (mockAddress() && out.address), email: session.email };
  }
  if (!session.accessToken) return { address: session.kleverAddress || '' };
  const res = await walletPost({ op: 'status' }, session);
  if (res.status !== 200) return { address: session.kleverAddress || '' };
  return { address: res.json.address || '', email: res.json.email || session.email };
}
