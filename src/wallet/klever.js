import { verifyKleverSignature } from './verify.js';
import { signedMessage } from '../../supabase/functions/_shared/linkAuth.js';

export const SESSION_KEY = 'monster-gate-klever-session';
const PROMPT_LOCK = 'monster-gate-klever-prompt-lock';
const PROMPT_COOL_MS = 90_000;
export const KLEVER_EXTENSION = 'https://chromewebstore.google.com/detail/klever-wallet/ifclboecfhkjbpmhgehodcjpciihhmif';
export const KLEVER_ANDROID = 'https://play.google.com/store/apps/details?id=finance.klever.bitcoin.wallet';
export const KLEVER_IOS = 'https://apps.apple.com/app/klever-wallet-bitcoin-crypto/id1615064243';

const ADDRESS_RE = /^klv1[02-9ac-hj-np-z]{58}$/;

export function isMobile() {
  const ua = navigator.userAgent || '';
  if (/Android|iPhone|iPad|iPod/i.test(ua)) return true;
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

export function shortAddress(address) {
  if (!address || address.length < 16) return address || '';
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}

export function pageUrl() {
  const url = new URL(location.href);
  url.searchParams.set('klever', '1');
  url.hash = '';
  return url.toString();
}

function fail(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

function hexOf(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, '0');
  return out;
}

function pushHex(out, hex) {
  if (hex && hex.length === 128 && !out.includes(hex)) out.push(hex);
}

/** 64-byte slices that could be an Ed25519 signature. The message text is never one of these. */
function signatureSlices(value) {
  let bytes = null;
  if (value instanceof Uint8Array) bytes = value;
  else if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
    bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  } else if (Array.isArray(value) && value.length >= 64 && value.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) {
    bytes = Uint8Array.from(value);
  } else if (typeof value === 'string') {
    const raw = value.trim().replace(/^0x/i, '').replace(/\s+/g, '');
    if (!raw || raw.length > 1200) return [];
    if (/^[0-9a-fA-F]+$/.test(raw) && raw.length % 2 === 0) {
      const out = new Uint8Array(raw.length / 2);
      for (let i = 0; i < out.length; i++) out[i] = Number.parseInt(raw.slice(i * 2, i * 2 + 2), 16);
      bytes = out;
    } else {
      const b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
      const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
      try {
        const bin = atob(padded);
        if (bin.length >= 64 && bin.length <= 160) {
          const out = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
          bytes = out;
        }
      } catch {
        return [];
      }
    }
  }
  if (!bytes || bytes.length < 64 || bytes.length > 512) return [];
  const slices = [bytes.slice(0, 64)];
  if (bytes.length > 64) slices.push(bytes.slice(-64));
  return slices;
}

/**
 * Every 64-byte signature in a wallet response.
 * The Klever app echoes the message next to the signature. The message is not a signature.
 */
export function signatureCandidates(signed, depth = 0, out = []) {
  if (signed == null || depth > 5) return out;
  if (typeof signed === 'string') {
    const trimmed = signed.trim();
    if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && trimmed.length < 8000) {
      try {
        signatureCandidates(JSON.parse(trimmed), depth + 1, out);
        return out;
      } catch {
        /* a signature string, not JSON */
      }
    }
  }
  for (const slice of signatureSlices(signed)) pushHex(out, hexOf(slice));
  if (Array.isArray(signed)) {
    if (!signatureSlices(signed).length) {
      for (const item of signed) signatureCandidates(item, depth + 1, out);
    }
    return out;
  }
  if (typeof signed === 'object' && !ArrayBuffer.isView(signed)) {
    if (typeof signed.toHex === 'function') {
      try { signatureCandidates(signed.toHex(), depth + 1, out); } catch { /* ignore */ }
    }
    if (typeof signed.toBase64 === 'function') {
      try { signatureCandidates(signed.toBase64(), depth + 1, out); } catch { /* ignore */ }
    }
    for (const key of Object.keys(signed)) signatureCandidates(signed[key], depth + 1, out);
  }
  return out;
}

function matchingSignature(candidates, message, address) {
  for (const signature of candidates) {
    if (verifyKleverSignature(message, signature, address)) return signature;
  }
  return '';
}

/** The address whose key produced one of these signatures of `message`. */
export function addressForSignature(candidates, message, addresses) {
  const seen = new Set();
  for (const address of addresses) {
    if (!address || seen.has(address) || !ADDRESS_RE.test(address)) continue;
    seen.add(address);
    if (matchingSignature(candidates, message, address)) return address;
  }
  return '';
}

function addressesIn(value, depth = 0, out = []) {
  if (value == null || depth > 4 || out.length > 8) return out;
  if (typeof value === 'string') {
    const found = value.match(/klv1[02-9ac-hj-np-z]{58}/g);
    if (found) {
      for (const address of found) {
        if (!out.includes(address)) out.push(address);
      }
    }
    return out;
  }
  if (typeof value !== 'object') return out;
  const items = Array.isArray(value) ? value : Object.keys(value).map((key) => value[key]);
  for (const item of items) addressesIn(item, depth + 1, out);
  return out;
}

/** The popup signs whichever account is on the provider. Name that account before the prompt opens. */
function pinAccount(kw, address) {
  if (!kw || !ADDRESS_RE.test(address || '')) return;
  try {
    kw.address = address;
  } catch {
    /* a read-only provider still signs the account it already has */
  }
}

/** True when this page already asked the wallet a moment ago. Stops a reload from asking again. */
export function promptIsCooling() {
  try {
    const at = Number(localStorage.getItem(PROMPT_LOCK) || 0);
    return Number.isFinite(at) && Date.now() - at < PROMPT_COOL_MS;
  } catch {
    return false;
  }
}

export function markPrompt() {
  try {
    localStorage.setItem(PROMPT_LOCK, String(Date.now()));
  } catch {
    /* the request still proceeds */
  }
}

/**
 * Klever closes a confirm sheet when the page under it changes size. Pin the
 * layout to the height it had before the sheet opened, and release it after.
 */
function holdPageStill() {
  const h = `${Math.round(window.innerHeight)}px`;
  document.documentElement.style.setProperty('--sign-lock-h', h);
  document.documentElement.classList.add('wallet-signing');
}

function releasePageHold() {
  document.documentElement.classList.remove('wallet-signing');
  document.documentElement.style.removeProperty('--sign-lock-h');
}

/**
 * Older Klever builds have no signMessage. Their sheet takes a SIGN_MESSAGE
 * request through handleTransaction. The bridge PIN is the last resort: the
 * app dismisses it as soon as fingerprint starts.
 */
function legacySignMessage(message, address) {
  const wallet = window.kleverWallet;
  const events = window.kleverWalletEvents;
  if (typeof wallet?.handleTransaction !== 'function') return null;
  if (typeof events?.createEvent !== 'function' || typeof events.addEventListener !== 'function') return null;
  return new Promise((resolve, reject) => {
    const event = events.createEvent({
      chain: 'KLEVER',
      type: 'SIGN_MESSAGE',
      address,
      transactionInfo: {
        siteUrl: location.href,
        hostname: location.hostname,
      },
      preTransaction: message,
    });
    events.addEventListener(event.id, (result) => {
      const data = result?.data;
      if (data?.status === 'ACCEPTED') resolve(data);
      else reject(fail('rejected', 'The Klever app closed the sign-in request.'));
    });
    wallet.handleTransaction(JSON.stringify(event));
  });
}

function pageWallet() {
  if (typeof window === 'undefined') return {};
  return {
    wallet: window.kleverWallet,
    events: window.kleverWalletEvents,
    bridge: window.__kleverBrowser__?.bridge,
  };
}

/**
 * One signer, and only one. signMessage returns a signature of the login text.
 * The in-app sheet goes through handleTransaction, and Klever shows that as a
 * transaction whose signature does not prove this message. The sheet is only
 * used when the page has no signMessage. The page is not resized under the
 * extension window, and a second prompt is never opened while the first is up.
 */
export function signaturePlan(kw, page = pageWallet()) {
  if (typeof kw?.signMessage === 'function') return 'extension';
  const events = page.events;
  if (
    typeof page.wallet?.handleTransaction === 'function'
    && typeof events?.createEvent === 'function'
    && typeof events?.addEventListener === 'function'
  ) return 'sheet';
  if (typeof page.bridge === 'function') return 'bridge';
  return '';
}

async function requestSignature(kw, message, address) {
  const plan = signaturePlan(kw);
  if (plan === 'sheet') return legacySignMessage(message, address);
  if (plan === 'extension') return kw.signMessage(message, address);
  if (plan === 'bridge') {
    return window.__kleverBrowser__.bridge({
      type: 'SIGN_IN_MESSAGE',
      network: 'KLV',
      chainId: '38',
      data: message,
      url: location.href,
    });
  }
  return null;
}

function paintSettled() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

export function waitForProvider(ms = 2000) {
  const start = performance.now();
  return new Promise((resolve) => {
    const tick = () => {
      if (window.kleverWeb) {
        resolve(window.kleverWeb);
        return;
      }
      if (performance.now() - start >= ms) {
        resolve(null);
        return;
      }
      setTimeout(tick, 80);
    };
    tick();
  });
}

/** The extension Confirm popup is `connect`. Older builds use `initialize` for the same step. */
export function connectMethod(kw, hub = typeof window !== 'undefined' ? window.kleverHub : null) {
  if (kw && typeof kw.connect === 'function') return 'connect';
  if (hub && typeof hub.initialize === 'function') return 'hub';
  if (kw && typeof kw.initialize === 'function') return 'initialize';
  return '';
}

function addressText(value) {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) {
    for (const item of value) {
      const text = addressText(item);
      if (ADDRESS_RE.test(text)) return text;
    }
    return '';
  }
  if (value && typeof value === 'object' && typeof value.address === 'string') return value.address.trim();
  return '';
}

export function addressFromWallet(kw, returned) {
  let fromGetter = '';
  try {
    if (typeof kw?.getWalletAddress === 'function') fromGetter = kw.getWalletAddress();
  } catch {
    fromGetter = '';
  }
  for (const value of [returned, fromGetter, kw?.address]) {
    const text = addressText(value);
    if (ADDRESS_RE.test(text)) return text;
  }
  return '';
}

function connectionClosed(err) {
  if (err?.code === 'rejected') return true;
  const text = `${err?.message || ''} ${err?.code || ''}`.toLowerCase();
  return /reject|declin|cancel|denied|closed/.test(text);
}

async function connectProvider(kw, mobile) {
  let address = addressFromWallet(kw);
  if (!address) {
    const method = connectMethod(kw);
    let returned;
    try {
      if (method === 'connect') returned = await kw.connect();
      else if (method === 'hub') returned = await window.kleverHub.initialize();
      else if (method === 'initialize') returned = await kw.initialize();
    } catch (err) {
      if (connectionClosed(err)) {
        throw fail(
          'rejected',
          mobile ? 'The Klever app closed the connection.' : 'The Klever extension closed the connection.',
        );
      }
      /* A wallet that is already connected rejects a second initialize. */
    }
    address = addressFromWallet(kw, returned);
  }
  if (!address) {
    throw fail(
      'no-account',
      mobile
        ? 'Choose a Klever account in the app, then sign in again.'
        : 'Open the Klever extension, choose an account, then sign in again.',
    );
  }
  return address;
}

export async function connectWallet() {
  const mobile = isMobile();
  const kw = await waitForProvider(mobile ? (inKleverHandoff() ? 4000 : 900) : 2500);
  if (!kw) {
    throw fail(
      mobile ? 'mobile-app' : 'extension',
      mobile
        ? 'Open this page in the Klever Wallet app. The app will ask you to sign.'
        : 'Install the Klever Wallet extension, then sign in from this page.',
    );
  }
  const address = await connectProvider(kw, mobile);
  return { kw, address, mobile };
}

/**
 * Asks the Klever extension or app to sign a server nonce. The signature is
 * checked against the address before it is sent. This never creates an account.
 */
export async function signProof(purpose, nonce, address, kw, mobile = isMobile()) {
  const plan = signaturePlan(kw);
  // The in-app sheet closes if the page changes size. Lock the size and let that
  // paint before the sheet opens. The extension's window is separate: locking the
  // page under it closes that window, so the page stays as it is.
  const lockPage = plan === 'sheet';
  if (lockPage) {
    holdPageStill();
    await paintSettled();
  }
  pinAccount(kw, address);
  const message = signedMessage({
    purpose,
    address,
    nonce,
    issued: new Date().toISOString(),
  });
  let signed;
  try {
    signed = await requestSignature(kw, message, address);
  } catch (err) {
    if (err?.code === 'rejected' || connectionClosed(err)) {
      throw fail('rejected', 'The Klever window closed before it was signed. Press Connect Klever wallet and confirm in the window that stays open.');
    }
    throw fail('rejected', mobile ? 'The Klever app closed the sign-in request.' : 'The Klever extension closed the sign-in request.');
  } finally {
    if (lockPage) releasePageHold();
  }
  const candidates = signatureCandidates(signed);
  const matched = addressForSignature(candidates, message, [
    address,
    addressFromWallet(kw),
    ...addressesIn(signed),
  ]);
  if (matched === address) {
    return { address, message, signature: matchingSignature(candidates, message, address), nonce };
  }
  if (matched) {
    const err = fail('wrong-account', 'Confirm the Klever account one more time.');
    err.address = matched;
    throw err;
  }
  if (!candidates.length) {
    throw fail('rejected', 'The Klever window closed before it returned a signature. Press Connect Klever wallet and confirm in the window that stays open.');
  }
  throw fail('bad-signature', 'The signature does not match this Klever address. In Klever, select the account that starts with klv1, then press Connect Klever wallet again.');
}

/**
 * Connects and signs a locally made nonce. Prefer loginWithKlever, which
 * uses a server nonce and refuses to create an account from the wallet.
 */
function localNonce() {
  const nonceBytes = crypto.getRandomValues(new Uint8Array(16));
  return [...nonceBytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function signIn() {
  const { kw, address, mobile } = await connectWallet();
  try {
    return await signProof('login', localNonce(), address, kw, mobile);
  } catch (err) {
    if (err?.code !== 'wrong-account' || !ADDRESS_RE.test(err.address || '')) throw err;
    return signProof('login', localNonce(), err.address, kw, mobile);
  }
}

function saveSession(session) {
  const text = JSON.stringify(session);
  for (const store of [sessionStorage, localStorage]) {
    try {
      store.setItem(SESSION_KEY, text);
    } catch {
      /* private mode can refuse one of the stores */
    }
  }
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

/** A reload keeps the signature, including when the wallet restarts its browser. */
export function readSession() {
  try {
    const raw = storedSession();
    if (!raw) return null;
    const ok = ADDRESS_RE.test(raw.address)
      && typeof raw.message === 'string'
      && typeof raw.signature === 'string'
      && raw.message.includes(`Address: ${raw.address}`)
      && verifyKleverSignature(raw.message, raw.signature, raw.address);
    if (!ok) {
      for (const store of [sessionStorage, localStorage]) {
        try { store.removeItem(SESSION_KEY); } catch { /* already gone */ }
      }
      return null;
    }
    saveSession(raw);
    return raw;
  } catch {
    return null;
  }
}

export function clearSession() {
  for (const store of [sessionStorage, localStorage]) {
    try {
      store.removeItem(SESSION_KEY);
      store.removeItem(PROMPT_LOCK);
    } catch {
      /* already gone */
    }
  }
}

const KLEVER_PACKAGE = 'finance.klever.bitcoin.wallet';

/**
 * Link the installed Klever Wallet opens in its own browser.
 * Wallet 5.x registers scheme `klever-wallet` with host `dp`, and its browser
 * handler reads the `link` query. A scheme the app does not register makes
 * Chrome on Android open the Play Store listing even when the app is installed.
 */
export function kleverLaunchUrl(page, android) {
  const link = encodeURIComponent(page);
  if (!android) return `klever-wallet://dp/browser?link=${link}`;
  return `intent://dp/browser?link=${link}#Intent;scheme=klever-wallet;package=${KLEVER_PACKAGE};end`;
}

/** Hands this page to the Klever Wallet app so it can ask for the signature. */
export function launchKleverApp() {
  const android = /Android/i.test(navigator.userAgent);
  const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!android && !ios) return false;
  location.href = kleverLaunchUrl(pageUrl(), android);
  return true;
}

/** True once this visit was opened from the wallet handoff, or is already inside it. */
export function inKleverHandoff() {
  if (window.kleverWeb) return true;
  if (/Klever/i.test(navigator.userAgent || '')) return true;
  try {
    return new URLSearchParams(location.search).get('klever') === '1';
  } catch {
    return false;
  }
}

export async function copyPageUrl() {
  const url = pageUrl();
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    const input = document.createElement('input');
    input.value = url;
    document.body.appendChild(input);
    input.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    input.remove();
    return ok;
  }
}

function actionButton(text, onClick) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'wallet-mini';
  btn.textContent = text;
  btn.addEventListener('click', onClick);
  return btn;
}

function storeLink(href, text) {
  const a = document.createElement('a');
  a.className = 'wallet-mini';
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.textContent = text;
  return a;
}

/** Fills the title-screen help shown when the extension or the mobile app is not connected yet. */
export function showWalletHelp(el, kind) {
  el.replaceChildren();
  el.classList.remove('hidden');
  const p = document.createElement('p');
  const actions = document.createElement('div');
  actions.className = 'wallet-actions';
  if (kind === 'mobile-app') {
    p.textContent = 'Sign in opens the Klever Wallet installed on this phone and asks you to approve the signature there. Install the app below only if it is not on this phone.';
    if (isMobile()) actions.append(actionButton('Open Klever Wallet', () => launchKleverApp()));
    actions.append(
      actionButton('Copy page link', async (ev) => {
        const ok = await copyPageUrl();
        ev.currentTarget.textContent = ok ? 'Link copied' : 'Copy failed';
      }),
      storeLink(KLEVER_ANDROID, 'Google Play'),
      storeLink(KLEVER_IOS, 'App Store'),
    );
  } else {
    p.textContent = 'On a computer, the Klever Wallet extension asks you to sign. Install it, refresh this page, and press sign in again.';
    actions.append(storeLink(KLEVER_EXTENSION, 'Install the Klever extension'));
  }
  el.append(p, actions);
}
