/**
 * Brandon's rule: a Klever wallet never creates an account.
 * Email signup is the only create path. A wallet may log in only after
 * it has been linked to that email account. Shared by the wallet edge
 * function, the memory mock, and node tests.
 */

export const ADDRESS_RE = /^klv1[02-9ac-hj-np-z]{58}$/;
export const NONCE_RE = /^[0-9a-f]{32}$/;
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const LOGIN_LEAD = 'Monster Gate wants you to sign in with your Klever wallet.';
export const LINK_LEAD = 'Monster Gate wants you to connect this Klever wallet to your account.';
export const SAFE_LINE = 'This does not send any coins.';

export const UNLINKED_CODE = 'unlinked';
export const UNLINKED_MESSAGE =
  'No account is linked to this wallet. Sign in with email, then connect your wallet in Account settings.';
export const TAKEN_MESSAGE = 'That Klever wallet is already linked to another account.';
export const LINKED_ALREADY_MESSAGE = 'This account already has a Klever wallet. Unlink it first.';
export const REPLAY_MESSAGE = 'That signature was already used. Confirm a new one.';
export const BAD_PROOF_MESSAGE = 'The Klever signature was not accepted.';
export const EXPIRED_MESSAGE = 'Sign again. That request expired.';

export const NONCE_MS = 5 * 60 * 1000;
export const SKEW_MS = 10 * 60 * 1000;
export const MOCK_SIG_PREFIX = 'mock:';

export function fail(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

export function resultError(code, message, extra = {}) {
  return { ok: false, created: false, code, error: message, ...extra };
}

export function hexNonce(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function signedMessage({ purpose, address, nonce, issued }) {
  const lead = purpose === 'link' ? LINK_LEAD : LOGIN_LEAD;
  return [lead, SAFE_LINE, `Address: ${address}`, `Nonce: ${nonce}`, `Issued: ${issued}`].join('\n');
}

export function parseProofMessage(message) {
  if (typeof message !== 'string' || message.length === 0 || message.length > 2000) return null;
  const lines = message.split('\n');
  if (lines.length !== 5) return null;
  const purpose = lines[0] === LOGIN_LEAD ? 'login' : lines[0] === LINK_LEAD ? 'link' : '';
  if (!purpose || lines[1] !== SAFE_LINE) return null;
  const address = /^Address: (klv1[02-9ac-hj-np-z]{58})$/.exec(lines[2]);
  const nonce = /^Nonce: ([0-9a-f]{32})$/.exec(lines[3]);
  const issued = /^Issued: (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)$/.exec(lines[4]);
  if (!address || !nonce || !issued) return null;
  const at = Date.parse(issued[1]);
  if (!Number.isFinite(at)) return null;
  return { purpose, address: address[1], nonce: nonce[1], issued: issued[1], at };
}

export function proofMessageOk(message, { purpose, address, nonce, now = Date.now() } = {}) {
  const parsed = parseProofMessage(message);
  if (!parsed) return false;
  if (purpose && parsed.purpose !== purpose) return false;
  if (address && parsed.address !== address) return false;
  if (nonce && parsed.nonce !== nonce) return false;
  if (parsed.at > now + SKEW_MS) return false;
  if (now - parsed.at > NONCE_MS + SKEW_MS) return false;
  return true;
}

export function mockSignatureFor(nonce) {
  return `${MOCK_SIG_PREFIX}${nonce}`;
}

export function isMockSignature(signature, nonce) {
  return typeof signature === 'string' && signature === mockSignatureFor(nonce);
}

function randomNonce(randomBytes) {
  const bytes = randomBytes ? randomBytes(16) : crypto.getRandomValues(new Uint8Array(16));
  return hexNonce(bytes);
}

/**
 * In-memory accounts, links, and one-time nonces.
 * `login` never inserts an account. `allowMock` accepts mock: signatures
 * for the tester flag; the hosted edge function never sets that flag.
 */
export function createMemoryAuth(opts = {}) {
  const accounts = new Map();
  const byAddress = new Map();
  const nonces = new Map();
  const created = [];
  const allowMock = !!opts.allowMock;
  const snapshots = new Map();

  function accountOf(userId) {
    return accounts.get(userId) || null;
  }

  function linkOf(address) {
    return byAddress.get(address) || null;
  }

  function putAccount(row) {
    accounts.set(row.userId, row);
    if (row.kleverAddress) byAddress.set(row.kleverAddress, row);
    return row;
  }

  function issueNonce({ purpose, address, userId, now = Date.now(), randomBytes } = {}) {
    if (purpose !== 'login' && purpose !== 'link') {
      return resultError('invalid', 'The request was not understood.');
    }
    if (!ADDRESS_RE.test(address || '')) {
      return resultError('invalid', 'Choose a Klever account, then try again.');
    }
    if (purpose === 'link' && !UUID_RE.test(userId || '')) {
      return resultError('rejected', 'Sign in with email first.');
    }
    const nonce = randomNonce(randomBytes);
    nonces.set(nonce, {
      nonce,
      purpose,
      address,
      userId: purpose === 'link' ? userId : '',
      expiresAt: now + NONCE_MS,
      usedAt: 0,
    });
    return { ok: true, nonce, expiresAt: now + NONCE_MS, created: false };
  }

  function consumeNonce(nonce, { purpose, address, userId, now = Date.now() }) {
    if (!NONCE_RE.test(nonce || '')) return resultError('nonce', EXPIRED_MESSAGE);
    const row = nonces.get(nonce);
    if (!row) return resultError('nonce', EXPIRED_MESSAGE);
    if (row.usedAt) return resultError('replay', REPLAY_MESSAGE);
    if (row.expiresAt <= now) return resultError('nonce', EXPIRED_MESSAGE);
    if (row.purpose !== purpose) return resultError('nonce', EXPIRED_MESSAGE);
    if (row.address !== address) return resultError('nonce', EXPIRED_MESSAGE);
    if (purpose === 'link' && row.userId !== userId) return resultError('nonce', EXPIRED_MESSAGE);
    row.usedAt = now;
    return { ok: true, created: false };
  }

  function checkProof({ purpose, address, message, signature, userId, now, verify }) {
    const parsed = parseProofMessage(message);
    if (!parsed || parsed.purpose !== purpose || parsed.address !== address) {
      return resultError('bad-signature', BAD_PROOF_MESSAGE);
    }
    if (!proofMessageOk(message, { purpose, address, nonce: parsed.nonce, now })) {
      return resultError('bad-signature', BAD_PROOF_MESSAGE);
    }
    const consumed = consumeNonce(parsed.nonce, { purpose, address, userId, now });
    if (!consumed.ok) return consumed;
    const mockOk = allowMock && isMockSignature(signature, parsed.nonce);
    const realOk = typeof verify === 'function' ? !!verify(message, signature, address) : false;
    if (!mockOk && !realOk) return resultError('bad-signature', BAD_PROOF_MESSAGE);
    return { ok: true, created: false, nonce: parsed.nonce };
  }

  /** Email-only. Wallet login must never call this. */
  function createEmailAccount({ userId, email, now = Date.now() }) {
    if (accounts.has(userId)) return resultError('exists', 'That email already has an account. Sign in instead.');
    const row = putAccount({ userId, email, kleverAddress: '', createdAt: now });
    created.push({ userId, email, how: 'email' });
    return { ok: true, created: true, user: row };
  }

  function rememberSession(address, session) {
    if (session) snapshots.set(address, session);
  }

  function link({ userId, email, address, message, signature, now = Date.now(), verify, session } = {}) {
    if (!UUID_RE.test(userId || '')) return resultError('rejected', 'Sign in with email first.');
    if (!ADDRESS_RE.test(address || '')) return resultError('invalid', 'Choose a Klever account, then try again.');
    const proof = checkProof({ purpose: 'link', address, message, signature, userId, now, verify });
    if (!proof.ok) return proof;
    const owner = linkOf(address);
    if (owner && owner.userId !== userId) return resultError('taken', TAKEN_MESSAGE);
    let row = accountOf(userId);
    if (!row) {
      row = putAccount({ userId, email: email || '', kleverAddress: '', createdAt: now });
    }
    if (row.kleverAddress && row.kleverAddress !== address) {
      return resultError('linked', LINKED_ALREADY_MESSAGE);
    }
    if (row.kleverAddress === address) {
      rememberSession(address, session);
      return { ok: true, created: false, user: row, address };
    }
    row.kleverAddress = address;
    if (email) row.email = email;
    byAddress.set(address, row);
    rememberSession(address, session);
    return { ok: true, created: false, user: row, address };
  }

  function unlink({ userId } = {}) {
    if (!UUID_RE.test(userId || '')) return resultError('rejected', 'Sign in with email first.');
    const row = accountOf(userId);
    if (!row?.kleverAddress) return { ok: true, created: false, address: '' };
    byAddress.delete(row.kleverAddress);
    snapshots.delete(row.kleverAddress);
    row.kleverAddress = '';
    return { ok: true, created: false, address: '' };
  }

  function login({ address, message, signature, now = Date.now(), verify } = {}) {
    if (!ADDRESS_RE.test(address || '')) return resultError('invalid', 'Choose a Klever account, then try again.');
    const before = accounts.size;
    const proof = checkProof({ purpose: 'login', address, message, signature, now, verify });
    if (!proof.ok) return proof;
    const row = linkOf(address);
    if (!row) {
      if (accounts.size !== before) {
        throw new Error('wallet login created an account');
      }
      return resultError(UNLINKED_CODE, UNLINKED_MESSAGE);
    }
    return {
      ok: true,
      created: false,
      user: row,
      address,
      session: snapshots.get(address) || null,
    };
  }

  function status({ userId } = {}) {
    const row = accountOf(userId);
    return { ok: true, created: false, address: row?.kleverAddress || '', email: row?.email || '' };
  }

  function serialize() {
    return {
      accounts: [...accounts.values()],
      nonces: [...nonces.values()],
      snapshots: [...snapshots.entries()],
    };
  }

  function restore(raw) {
    accounts.clear();
    byAddress.clear();
    nonces.clear();
    snapshots.clear();
    for (const row of raw?.accounts || []) putAccount(row);
    for (const row of raw?.nonces || []) nonces.set(row.nonce, row);
    for (const [address, session] of raw?.snapshots || []) snapshots.set(address, session);
  }

  return {
    accounts,
    byAddress,
    nonces,
    created,
    snapshots,
    issueNonce,
    consumeNonce,
    createEmailAccount,
    link,
    unlink,
    login,
    status,
    serialize,
    restore,
    rememberSession,
  };
}
