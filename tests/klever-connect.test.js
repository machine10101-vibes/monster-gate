import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha2.js';
import { addressFromWallet, connectMethod, signatureCandidates, signaturePlan } from '../src/wallet/klever.js';
import { addressFromPublicKey, kleverMessageHash, verifyKleverSignature } from '../src/wallet/verify.js';

ed.hashes.sha512 = sha512;

const FORUM_MESSAGE = 'test';
const FORUM_SIGNATURE = 'a74fe44a023fecc6bfdc39e9161ef2e83102990ade9ee731184fae59aea60487b8d5b65fbf8a4bd26b9b90f42a19973f2a2413642d59e42537e3bdc44ec9b70f';
const FORUM_ADDRESS = 'klv159vrgc50hqnr44zn25cdndmdwgrqvdsajax58asmslmqhcjfunwqktvupu';

const src = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

test('the extension Confirm popup is connect, and older wallets use initialize', () => {
  assert.equal(connectMethod({ connect() {}, initialize() {} }), 'connect');
  assert.equal(connectMethod({ initialize() {} }, { initialize() {} }), 'hub');
  assert.equal(connectMethod({ initialize() {} }), 'initialize');
  assert.equal(connectMethod({}), '');
  assert.equal(addressFromWallet({ address: FORUM_ADDRESS }), FORUM_ADDRESS);
  assert.equal(addressFromWallet({ getWalletAddress: () => 'short' }, FORUM_ADDRESS), FORUM_ADDRESS);
  assert.equal(addressFromWallet({}, [FORUM_ADDRESS]), FORUM_ADDRESS);
  assert.equal(addressFromWallet({ address: 'klv1qpzry9x8gf2tvdw0s3jn' }), '');
  assert.equal(addressFromWallet({}), '');
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
  assert.equal(signaturePlan({ signMessage() {} }, sheet), 'sheet');
  assert.equal(signaturePlan({ signMessage() {} }, {}), 'extension');
  assert.equal(signaturePlan({}, { bridge() {} }), 'bridge');
  assert.equal(signaturePlan({}, {}), '');
  const srcText = src('../src/wallet/klever.js');
  assert.equal(srcText.includes('kw.address = address'), false);
  assert.equal(srcText.includes('activeElement.blur'), false);
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
  assert.match(src('../src/wallet/klever.js'), /kw\.connect/);
  assert.match(src('../src/wallet/settings.js'), /does not send any coins/);
});
