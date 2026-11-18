import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha2.js';
import { keccak_256 as keccak } from '@noble/hashes/sha3.js';
import { addressForSignature, addressFromWallet, connectMethod, pollProviderAddress, providerAddress, sheetResultAccepted, signatureCandidates, signaturePlan } from '../src/wallet/klever.js';
import { addressFromPublicKey, kleverMessageHash, verifyKleverSignature } from '../src/wallet/verify.js';

ed.hashes.sha512 = sha512;

const FORUM_MESSAGE = 'test';
const FORUM_SIGNATURE = 'a74fe44a023fecc6bfdc39e9161ef2e83102990ade9ee731184fae59aea60487b8d5b65fbf8a4bd26b9b90f42a19973f2a2413642d59e42537e3bdc44ec9b70f';
const FORUM_ADDRESS = 'klv159vrgc50hqnr44zn25cdndmdwgrqvdsajax58asmslmqhcjfunwqktvupu';

const src = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

test('the connect reads selectedAddress, then address, then the first account', () => {
  const other = 'klv1fr724pjdjp3l8unuvgda0k6vt06d875hj7t5ggrxymzcg3jcveysejzljc';
  assert.equal(connectMethod({ requestAccount() {}, enable() {} }), 'requestAccount');
  assert.equal(connectMethod({ enable() {} }), 'enable');
  assert.equal(connectMethod({}), 'sdk');
  const srcText = src('../src/wallet/klever.js');
  assert.equal(srcText.includes('kw.requestAccount()'), true);
  assert.equal(srcText.includes('kw.enable()'), true);
  assert.equal(srcText.includes('web.initialize({ timeout: 20_000, accountChangeCallback: () => undefined })'), true);
  assert.equal(srcText.includes('kw.selectedAddress || kw.address || kw.accounts?.[0]'), true);
  assert.equal(providerAddress({ selectedAddress: FORUM_ADDRESS, address: other }), FORUM_ADDRESS);
  assert.equal(providerAddress({ address: FORUM_ADDRESS }), FORUM_ADDRESS);
  assert.equal(providerAddress({ accounts: [FORUM_ADDRESS] }), FORUM_ADDRESS);
  assert.equal(addressFromWallet({ selectedAddress: FORUM_ADDRESS, getWalletAddress: () => other }), FORUM_ADDRESS);
  assert.equal(addressFromWallet({ address: FORUM_ADDRESS }), FORUM_ADDRESS);
  assert.equal(addressFromWallet({ getWalletAddress: () => 'short' }, FORUM_ADDRESS), FORUM_ADDRESS);
  assert.equal(addressFromWallet({}, [FORUM_ADDRESS]), FORUM_ADDRESS);
  assert.equal(addressFromWallet({ address: 'klv1qpzry9x8gf2tvdw0s3jn' }), '');
  assert.equal(addressFromWallet({}), '');
});

test('the page polls the provider until the klv account is approved', async () => {
  const kw = {};
  const waiting = pollProviderAddress(kw, 10, 20);
  setTimeout(() => { kw.selectedAddress = FORUM_ADDRESS; }, 30);
  assert.equal(await waiting, FORUM_ADDRESS);
});

test('a signature KleverScan accepted verifies for that address', () => {
  assert.equal(verifyKleverSignature(FORUM_MESSAGE, FORUM_SIGNATURE, FORUM_ADDRESS), true);
  assert.equal(
    verifyKleverSignature(
      'test message',
      '458fc2752927ae5ae68e6c0c95a4b408d6329ffc13de19c29bacf3d7efb12500567ca14d67460197ea6097fc93f1fd7c9b41c02a4aedcf1ab15d28b50935bb07',
      'klv1usdnywjhrlv4tcyu6stxpl6yvhplg35nepljlt4y5r7yppe8er4qujlazy',
    ),
    true,
  );
});

test('a signature of the popup-encoded message still proves the login text', () => {
  const secret = new Uint8Array(32).fill(4);
  const address = addressFromPublicKey(ed.getPublicKey(secret));
  const message = [
    'Monster Gate wants you to connect this Klever wallet to your account.',
    'This does not send any coins.',
    `Address: ${address}`,
    'Nonce: abababababababababababababababab',
    'Issued: 2026-11-17T15:24:00.000Z',
  ].join('\n');
  const encoded = encodeURIComponent(message);
  const signature = [...ed.sign(kleverMessageHash(encoded), secret)].map((b) => b.toString(16).padStart(2, '0')).join('');
  assert.equal(verifyKleverSignature(message, signature, address), true);
  assert.equal(verifyKleverSignature(message, signature, FORUM_ADDRESS), false);
  const plain = [...ed.sign(kleverMessageHash(message), secret)].map((b) => b.toString(16).padStart(2, '0')).join('');
  assert.equal(verifyKleverSignature(message, plain, address), true);
});

test('the wallet response uses the signature, not the echoed message', () => {
  const message = 'Monster Gate wants you to connect this Klever wallet to your account.\nThis does not send any coins.';
  const bytes = [];
  for (let i = 0; i < FORUM_SIGNATURE.length; i += 2) bytes.push(Number.parseInt(FORUM_SIGNATURE.slice(i, i + 2), 16));
  const response = { status: 'ACCEPTED', data: { message, signature: FORUM_SIGNATURE } };
  assert.deepEqual(signatureCandidates(response), [FORUM_SIGNATURE]);
  assert.deepEqual(signatureCandidates({ data: { message, signature: bytes } }), [FORUM_SIGNATURE]);
  const b64 = Buffer.from(Uint8Array.from(bytes)).toString('base64');
  assert.deepEqual(signatureCandidates(b64), [FORUM_SIGNATURE]);
  assert.deepEqual(signatureCandidates(FORUM_SIGNATURE), [FORUM_SIGNATURE]);
  assert.deepEqual(signatureCandidates({ Signature: [FORUM_SIGNATURE], message }), [FORUM_SIGNATURE]);
  const url = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  assert.deepEqual(signatureCandidates(url), [FORUM_SIGNATURE]);
  assert.deepEqual(signatureCandidates({ toHex: () => FORUM_SIGNATURE, message }), [FORUM_SIGNATURE]);
  assert.equal(src('../src/wallet/klever.js').includes('data.data?.message ??'), false);
});

test('one Klever prompt stays open until it is signed', () => {
  const sheet = {
    wallet: { handleTransaction() {} },
    events: { createEvent() {}, addEventListener() {} },
    bridge() {},
  };
  assert.equal(signaturePlan({ signMessage() {} }, sheet), 'extension');
  assert.equal(signaturePlan({}, sheet), 'sheet');
  assert.equal(signaturePlan({ signMessage() {} }, {}), 'extension');
  assert.equal(signaturePlan({}, { bridge() {} }), 'bridge');
  assert.equal(signaturePlan({}, {}), '');
  const srcText = src('../src/wallet/klever.js');
  assert.equal(srcText.includes('kw.signMessage(message)'), true);
  assert.equal(srcText.includes('kw.signMessage(message, address)'), false);
  assert.equal(srcText.includes('kw.requestAccount()'), true);
  assert.equal(srcText.includes('kw.enable()'), true);
  assert.equal(srcText.includes('setWalletAddress'), false);
  assert.equal(srcText.includes('if (plan === \'extension\' && !mobile) pinAccount(kw, address)'), true);
  assert.equal(srcText.includes('activeElement.blur'), false);
  assert.equal(sheetResultAccepted({ status: 'ACCEPTED', signature: FORUM_SIGNATURE }), true);
  assert.equal(sheetResultAccepted({ data: FORUM_SIGNATURE }), true);
  assert.equal(sheetResultAccepted({ status: 'CANCELLED' }), false);
  assert.equal(src('../src/main.js').includes("note?.(err.message || 'The wallet could not be linked.', true, true)"), true);
  assert.match(src('../src/wallet/link.js'), /wrong-account/);
});

test('a signature from the account Klever selected still proves that account', () => {
  const named = new Uint8Array(32).fill(4);
  const selected = new Uint8Array(32).fill(7);
  const namedAddress = addressFromPublicKey(ed.getPublicKey(named));
  const selectedAddress = addressFromPublicKey(ed.getPublicKey(selected));
  const message = [
    'Monster Gate wants you to connect this Klever wallet to your account.',
    'This does not send any coins.',
    `Address: ${namedAddress}`,
    'Nonce: abababababababababababababababab',
    'Issued: 2026-11-17T23:12:00.000Z',
  ].join('\n');
  const signature = Buffer.from(ed.sign(kleverMessageHash(message), selected)).toString('hex');
  assert.equal(verifyKleverSignature(message, signature, namedAddress), false);
  assert.equal(
    addressForSignature([signature], message, [namedAddress, selectedAddress]),
    selectedAddress,
  );
  const buried = `${'ab'.repeat(40)}${signature}`;
  assert.equal(signatureCandidates(buried).includes(signature), true);
  const middle = `${'ab'.repeat(20)}${signature}${'cd'.repeat(20)}`;
  assert.equal(signatureCandidates(middle).includes(signature), true);
  const secret = new Uint8Array(32).fill(3);
  const address = addressFromPublicKey(ed.getPublicKey(secret));
  const login = `Monster Gate wants you to connect this Klever wallet to your account.\nThis does not send any coins.\nAddress: ${address}\nNonce: abcdabcdabcdabcdabcdabcdabcdabcd\nIssued: 2026-11-18T00:20:00.000Z`;
  const body = new TextEncoder().encode(login);
  const prefix = new TextEncoder().encode('\u0017Klever Signed Message:\n');
  const digits = new TextEncoder().encode(String(body.length));
  const prefixed = new Uint8Array(prefix.length + digits.length + body.length);
  prefixed.set(prefix, 0);
  prefixed.set(digits, prefix.length);
  prefixed.set(body, prefix.length + digits.length);
  const hex = Buffer.from(body).toString('hex');
  assert.equal(verifyKleverSignature(login, Buffer.from(ed.sign(prefixed, secret)).toString('hex'), address), true);
  assert.equal(verifyKleverSignature(login, Buffer.from(ed.sign(keccak(body), secret)).toString('hex'), address), true);
  assert.equal(verifyKleverSignature(login, Buffer.from(ed.sign(kleverMessageHash(hex), secret)).toString('hex'), address), true);
  assert.equal(verifyKleverSignature(login, Buffer.from(ed.sign(new Uint8Array(32).fill(9), secret)).toString('hex'), address), false);
});

test('an email account connects Klever from the character camp', () => {
  const html = src('../index.html');
  const camp = html.slice(html.indexOf('id="charselect"'), html.indexOf('id="cs-confirm"'));
  assert.match(camp, /id="cs-klever"/);
  assert.match(camp, /Connect Klever wallet/);
  const main = src('../src/main.js');
  assert.match(main, /linkCampWallet/);
  assert.match(main, /linkKleverWallet/);
  assert.match(main, /showUnlinkedNotice/);
  const shell = main.slice(main.indexOf('async function shellKlever'), main.indexOf('function armLogin'));
  assert.match(shell, /UNLINKED_CODE[\s\S]*showUnlinkedNotice/);
  assert.match(src('../src/ui/charselect.js'), /paintKlever/);
  assert.match(src('../src/wallet/klever.js'), /kw\.requestAccount\(\)/);
  assert.match(src('../src/wallet/settings.js'), /does not send any coins/);
});
