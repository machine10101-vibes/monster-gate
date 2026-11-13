import { loadCloudConfig } from './cloud.js';
import { saveAccount } from './account.js';
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

async function walletPost(body) {
  const cfg = await loadCloudConfig();
  if (!cfg.url || !cfg.key) return { status: 0, json: { error: 'The account service could not be reached.' } };
  let res;
  try {
    res = await fetch(`${cfg.url}/functions/v1/wallet`, {
      method: 'POST',
      headers: authHeaders(cfg, body.accessToken),
      body: JSON.stringify(body),
    });
  } catch {
    return { status: 0, json: { error: 'The account service could not be reached.' } };
  }
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
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

async function remoteNonce(purpose, address, accessToken) {
  const res = await walletPost({ op: 'nonce', purpose, address, accessToken });
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
  return remoteNonce(purpose, address, session?.accessToken);
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
  return saveAccount(session);
}

export async function linkKleverWallet(session) {
  if (!session?.userId) throw fail('rejected', 'Sign in with email first.');
  const proof = await signFor('link', session);
  if (isMockWallet()) {
    const auth = mockAuth();
    const out = auth.link({
      userId: session.userId,
      email: session.email,
      address: proof.address,
      message: proof.message,
      signature: proof.signature,
      session: snapshotOf(session),
    });
    if (!out.ok) throw fail(out.code, out.error);
    session.kleverAddress = proof.address;
    return saveAccount(session);
  }
  const res = await walletPost({
    op: 'link',
    accessToken: session.accessToken,
    address: proof.address,
    message: proof.message,
    signature: proof.signature,
  });
  if (res.status !== 200) {
    throw fail(res.json?.code || 'rejected', res.json?.error || 'The wallet could not be linked.');
  }
  session.kleverAddress = proof.address;
  return saveAccount(session);
}

export async function unlinkKleverWallet(session) {
  if (!session?.userId) throw fail('rejected', 'Sign in with email first.');
  if (isMockWallet()) {
    const auth = mockAuth();
    const out = auth.unlink({ userId: session.userId });
    if (!out.ok) throw fail(out.code, out.error);
    session.kleverAddress = '';
    return saveAccount(session);
  }
  const res = await walletPost({ op: 'unlink', accessToken: session.accessToken });
  if (res.status !== 200) {
    throw fail(res.json?.code || 'rejected', res.json?.error || 'The wallet could not be unlinked.');
  }
  session.kleverAddress = '';
  return saveAccount(session);
}

export async function linkedWalletStatus(session) {
  if (!session?.userId) return { address: '' };
  if (isMockWallet()) {
    const auth = mockAuth();
    const out = auth.status({ userId: session.userId });
    return { address: out.address || (mockAddress() && out.address), email: session.email };
  }
  const res = await walletPost({ op: 'status', accessToken: session.accessToken });
  if (res.status !== 200) return { address: session.kleverAddress || '' };
  return { address: res.json.address || '', email: res.json.email || session.email };
}
