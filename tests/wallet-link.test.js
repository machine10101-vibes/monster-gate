import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha2.js';
import {
  ADDRESS_RE,
  REPLAY_MESSAGE,
  TAKEN_MESSAGE,
  UNLINKED_CODE,
  UNLINKED_MESSAGE,
  createMemoryAuth,
  mockSignatureFor,
  signedMessage,
} from '../supabase/functions/_shared/linkAuth.js';
import { addressFromPublicKey, kleverMessageHash, signatureBytes, verifyKleverSignature } from '../src/wallet/verify.js';
import { signatureText } from '../src/wallet/klever.js';
import { parseMockWallet } from '../src/wallet/mock.js';

ed.hashes.sha512 = sha512;

const src = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

function keypair(fill) {
  const secret = new Uint8Array(32).fill(fill);
  const pub = ed.getPublicKey(secret);
  const address = addressFromPublicKey(pub);
  return { secret, pub, address };
}

function sign(secret, message) {
  const signature = ed.sign(kleverMessageHash(message), secret);
  return [...signature].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function proof(auth, { purpose, address, secret, userId, now = Date.now() }) {
  const issued = new Date(now).toISOString();
  const nonce = auth.issueNonce({ purpose, address, userId, now });
  assert.equal(nonce.ok, true);
  assert.equal(nonce.created, false);
  const message = signedMessage({ purpose, address, nonce: nonce.nonce, issued });
  return { message, signature: sign(secret, message), nonce: nonce.nonce };
}

test('mobile signing prefers the SDK method and prevents overlapping prompts', () => {
  const klever = src('../src/wallet/klever.js');
  assert.match(klever, /if \(typeof kw\?\.signMessage === 'function'\) return kw\.signMessage\(message\)/);
  assert.match(klever, /if \(signingInFlight\)[\s\S]*A Klever signature request is already in progress/);
  const request = klever.slice(klever.indexOf('async function requestSignature'), klever.indexOf('export function waitForProvider'));
  assert.ok(request.indexOf("kw.signMessage(message)") < request.indexOf("legacySignMessage(message)"));
});

test('Klever Connect Signature objects expose bytes and hex fields', () => {
  const bytes = new Uint8Array(64).fill(0xab);
  const expected = 'ab'.repeat(64);
  assert.equal(signatureText({ bytes }), expected);
  assert.equal(signatureText({ hex: expected }), expected);
});

test('wallet endpoint reports which proof validation stage rejected a request', () => {
  const walletFn = src('../supabase/functions/wallet/index.ts');
  assert.match(walletFn, /code: "proof-address"/);
  assert.match(walletFn, /code: "proof-message"/);
  assert.match(walletFn, /code: "proof-signature"/);
  assert.match(walletFn, /stage: "address"/);
  assert.match(walletFn, /stage: "message"/);
  assert.match(walletFn, /stage: "signature"/);
  assert.match(walletFn, /take_klever_nonce/);
  assert.doesNotMatch(walletFn, /console\.(?:log|warn)\([^)]*(?:signature|nonce|address)\s*[,}]/i);
});

test('Klever client forwards non-empty proof for authoritative server verification', () => {
  const klever = src('../src/wallet/klever.js');
  const start = klever.indexOf('export async function signProof');
  const end = klever.indexOf('\n}\n', start);
  const signProof = klever.slice(start, end);
  assert.match(signProof, /if \(!signature\)/);
  assert.doesNotMatch(signProof, /verifyKleverSignature\(message, signature, address\)/);
  assert.match(signProof, /return \{ address, message, signature, nonce \}/);
  const walletFn = src('../supabase/functions/wallet/index.ts');
  assert.match(walletFn, /!verifyKleverSignature\(message, signature, address\)/);
  assert.match(walletFn, /take_klever_nonce/);
});

test('Klever approval event extracts the signature, not the echoed message', () => {
  const signature = 'ab'.repeat(64);
  const event = {
    data: {
      status: 'ACCEPTED',
      data: {
        message: 'Monster Gate wants you to sign in.',
        signature,
      },
    },
  };
  assert.equal(signatureText(event), signature);
  assert.equal(signatureText({ data: { status: 'ACCEPTED', data: { message: 'echoed message only' } } }), '');
  assert.equal(signatureText(signature), signature);
});

test('a wallet login never creates an account', () => {
  const a = keypair(3);
  const auth = createMemoryAuth();
  const p = proof(auth, { purpose: 'login', address: a.address, secret: a.secret });
  const out = auth.login({
    address: a.address,
    message: p.message,
    signature: p.signature,
    verify: verifyKleverSignature,
  });
  assert.equal(out.ok, false);
  assert.equal(out.created, false);
  assert.equal(out.code, UNLINKED_CODE);
  assert.equal(out.error, UNLINKED_MESSAGE);
  assert.equal(auth.accounts.size, 0);
  assert.equal(auth.created.length, 0);
  assert.equal(auth.byAddress.size, 0);
});

test('an unlinked wallet is rejected', () => {
  const a = keypair(5);
  const auth = createMemoryAuth();
  auth.createEmailAccount({ userId: '11111111-1111-4111-8111-111111111111', email: 'a@hunt.test' });
  const p = proof(auth, { purpose: 'login', address: a.address, secret: a.secret });
  const out = auth.login({
    address: a.address,
    message: p.message,
    signature: p.signature,
    verify: verifyKleverSignature,
  });
  assert.equal(out.ok, false);
  assert.equal(out.code, UNLINKED_CODE);
  assert.equal(out.error, UNLINKED_MESSAGE);
  assert.equal(out.created, false);
  assert.equal(auth.created.length, 1);
  assert.equal(auth.created[0].how, 'email');
});

test('a linked wallet logs in as that email account', () => {
  const a = keypair(7);
  const auth = createMemoryAuth();
  const userId = '22222222-2222-4222-8222-222222222222';
  auth.createEmailAccount({ userId, email: 'linked@hunt.test' });
  const linkProof = proof(auth, { purpose: 'link', address: a.address, secret: a.secret, userId });
  const linked = auth.link({
    userId,
    email: 'linked@hunt.test',
    address: a.address,
    message: linkProof.message,
    signature: linkProof.signature,
    verify: verifyKleverSignature,
    session: { kind: 'email', email: 'linked@hunt.test', userId },
  });
  assert.equal(linked.ok, true);
  assert.equal(linked.created, false);
  const loginProof = proof(auth, { purpose: 'login', address: a.address, secret: a.secret });
  const out = auth.login({
    address: a.address,
    message: loginProof.message,
    signature: loginProof.signature,
    verify: verifyKleverSignature,
  });
  assert.equal(out.ok, true);
  assert.equal(out.created, false);
  assert.equal(out.user.userId, userId);
  assert.equal(out.user.email, 'linked@hunt.test');
  assert.equal(out.session.email, 'linked@hunt.test');
  assert.equal(auth.created.length, 1);
});

test('a nonce cannot be replayed', () => {
  const a = keypair(9);
  const auth = createMemoryAuth();
  const userId = '33333333-3333-4333-8333-333333333333';
  auth.createEmailAccount({ userId, email: 'replay@hunt.test' });
  const linkProof = proof(auth, { purpose: 'link', address: a.address, secret: a.secret, userId });
  assert.equal(auth.link({
    userId,
    email: 'replay@hunt.test',
    address: a.address,
    message: linkProof.message,
    signature: linkProof.signature,
    verify: verifyKleverSignature,
  }).ok, true);
  const loginProof = proof(auth, { purpose: 'login', address: a.address, secret: a.secret });
  const first = auth.login({
    address: a.address,
    message: loginProof.message,
    signature: loginProof.signature,
    verify: verifyKleverSignature,
  });
  assert.equal(first.ok, true);
  const replay = auth.login({
    address: a.address,
    message: loginProof.message,
    signature: loginProof.signature,
    verify: verifyKleverSignature,
  });
  assert.equal(replay.ok, false);
  assert.equal(replay.code, 'replay');
  assert.equal(replay.error, REPLAY_MESSAGE);
  assert.equal(replay.created, false);
});

test('an address cannot link to two accounts', () => {
  const a = keypair(11);
  const auth = createMemoryAuth();
  const one = '44444444-4444-4444-8444-444444444444';
  const two = '55555555-5555-4555-8555-555555555555';
  auth.createEmailAccount({ userId: one, email: 'one@hunt.test' });
  auth.createEmailAccount({ userId: two, email: 'two@hunt.test' });
  const first = proof(auth, { purpose: 'link', address: a.address, secret: a.secret, userId: one });
  assert.equal(auth.link({
    userId: one,
    email: 'one@hunt.test',
    address: a.address,
    message: first.message,
    signature: first.signature,
    verify: verifyKleverSignature,
  }).ok, true);
  const second = proof(auth, { purpose: 'link', address: a.address, secret: a.secret, userId: two });
  const out = auth.link({
    userId: two,
    email: 'two@hunt.test',
    address: a.address,
    message: second.message,
    signature: second.signature,
    verify: verifyKleverSignature,
  });
  assert.equal(out.ok, false);
  assert.equal(out.code, 'taken');
  assert.equal(out.error, TAKEN_MESSAGE);
  assert.equal(auth.byAddress.get(a.address).userId, one);
});

test('mock signatures work only when mock mode is on', () => {
  const a = keypair(13);
  const real = createMemoryAuth({ allowMock: false });
  const mock = createMemoryAuth({ allowMock: true });
  const userId = '66666666-6666-4666-8666-666666666666';
  mock.createEmailAccount({ userId, email: 'mock@hunt.test' });
  const nonce = mock.issueNonce({ purpose: 'link', address: a.address, userId });
  const message = signedMessage({
    purpose: 'link',
    address: a.address,
    nonce: nonce.nonce,
    issued: new Date().toISOString(),
  });
  const fake = mockSignatureFor(nonce.nonce);
  assert.equal(mock.link({
    userId,
    email: 'mock@hunt.test',
    address: a.address,
    message,
    signature: fake,
  }).ok, true);
  const loginNonce = mock.issueNonce({ purpose: 'login', address: a.address });
  const loginMessage = signedMessage({
    purpose: 'login',
    address: a.address,
    nonce: loginNonce.nonce,
    issued: new Date().toISOString(),
  });
  assert.equal(mock.login({
    address: a.address,
    message: loginMessage,
    signature: mockSignatureFor(loginNonce.nonce),
  }).ok, true);

  const other = real.issueNonce({ purpose: 'login', address: a.address });
  const otherMessage = signedMessage({
    purpose: 'login',
    address: a.address,
    nonce: other.nonce,
    issued: new Date().toISOString(),
  });
  const rejected = real.login({
    address: a.address,
    message: otherMessage,
    signature: mockSignatureFor(other.nonce),
    verify: verifyKleverSignature,
  });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.code, 'bad-signature');
});

test('?mockwallet is session-only and never a signup path', () => {
  const parsed = parseMockWallet('?mockwallet=1');
  assert.equal(parsed.enabled, true);
  assert.match(parsed.address, ADDRESS_RE);
  const named = parseMockWallet('?mockwallet=klv1fpwjz234gy8aaae3gx0e8q9f52vymzzn3z5q0s5h60pvktzx0n0qwvtux5');
  assert.equal(named.address, 'klv1fpwjz234gy8aaae3gx0e8q9f52vymzzn3z5q0s5h60pvktzx0n0qwvtux5');
  assert.equal(parseMockWallet(''), null);
  const html = src('../index.html');
  const main = src('../src/main.js');
  const hunter = src('../supabase/functions/hunter/index.ts');
  const walletFn = src('../supabase/functions/wallet/index.ts');
  assert.match(html, /Log in with Klever/);
  assert.match(html, /id="wallet-unlinked"/);
  assert.match(html, /This Klever wallet isn't linked yet\. Your email account and progress are safe/);
  assert.match(main, /UNLINKED_HINT/);
  assert.match(main, /wallet-unlinked-email[\s\S]*focus/);
  assert.match(main, /loginWithKlever/);
  assert.match(main, /kind === 'email'/);
  assert.doesNotMatch(main, /account \|\| klever/);
  assert.doesNotMatch(hunter, /hunter_sessions/);
  assert.doesNotMatch(hunter, /from\("hunters"\)/);
  assert.match(hunter, /account-load/);
  assert.match(hunter, /account-save/);
  assert.match(walletFn, /op === "login"/);
  assert.match(walletFn, /handoffStart/);
  assert.match(walletFn, /handoffNonce/);
  assert.match(walletFn, /handoffComplete/);
  assert.match(walletFn, /handoffPoll/);
  assert.match(src('../src/wallet/link.js'), /startKleverHandoff/);
  assert.match(src('../src/wallet/link.js'), /completeKleverHandoff/);
  assert.match(src('../src/wallet/link.js'), /pollKleverHandoff/);
  assert.match(main, /Sign-in complete — return to your original browser/);
  assert.match(src('../src/wallet/klever.js'), /pageUrl\(handoffId = ''\)/);
  assert.match(src('../supabase/migrations/20261118000000_klever_cross_browser_handoffs.sql'), /klever_handoffs/);

  assert.match(walletFn, /UNLINKED_MESSAGE/);
  assert.doesNotMatch(src('../src/wallet/link.js'), /createAccount/);
  assert.match(src('../src/ui/hud.js'), /mountWalletSettings/);
  assert.match(src('../src/wallet/settings.js'), /Connect Klever wallet/);
  assert.match(src('../src/wallet/mock.js'), /MOCK WALLET/);
  assert.match(src('../src/wallet/mock.js'), /sessionStorage/);
  const account = src('../src/wallet/account.js');
  const link = src('../src/wallet/link.js');
  assert.match(account, /export async function refreshAccountSession/);
  assert.match(link, /refreshAccountSession\(current, \{ force: true \}\)/);
  assert.match(link, /no cloud sign-in session/);
});


test('Klever Base64-encoded hex signatures verify identically to server-decoded signatures', () => {
  const a = keypair(17);
  const message = 'Monster Gate signature format compatibility test';
  const hex = sign(a.secret, message);
  const base64Hex = Buffer.from(hex, 'utf8').toString('base64');
  assert.equal(signatureBytes(base64Hex).length, 64);
  assert.equal(verifyKleverSignature(message, base64Hex, a.address), true);
});


test('Klever Base64-encoded hex signatures verify identically to server-decoded signatures', () => {
  const a = keypair(17);
  const message = 'Monster Gate signature format compatibility test';
  const hex = sign(a.secret, message);
  const base64Hex = Buffer.from(hex, 'utf8').toString('base64');
  assert.equal(signatureBytes(base64Hex).length, 64);
  assert.equal(verifyKleverSignature(message, base64Hex, a.address), true);
});
