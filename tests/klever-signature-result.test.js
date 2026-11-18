import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha2.js';
import { addressFromPublicKey, kleverMessageHash, verifyKleverSignature } from '../src/wallet/verify.js';
import { signatureCandidates } from '../src/wallet/klever.js';

ed.hashes.sha512 = sha512;

test('Klever mobile event parser extracts the signature, not the echoed message', () => {
  const secret = new Uint8Array(32).fill(21);
  const address = addressFromPublicKey(ed.getPublicKey(secret));
  const message = [
    'Monster Gate wants you to sign in with your Klever wallet.',
    'This does not send any coins.',
    `Address: ${address}`,
    'Nonce: 00112233445566778899aabbccddeeff',
    `Issued: ${new Date().toISOString()}`,
  ].join('\\n');
  const signatureBytes = ed.sign(kleverMessageHash(message), secret);
  const signature = [...signatureBytes].map((b) => b.toString(16).padStart(2, '0')).join('');

  // Klever mobile can echo the message next to the actual signature.
  const eventResult = {
    data: {
      status: 'ACCEPTED',
      data: { message, signature, address },
    },
  };

  const candidates = signatureCandidates(eventResult);
  assert.ok(candidates.includes(signature), 'the real signature is extracted');
  assert.ok(!candidates.includes(message), 'the echoed message is never treated as a signature');
  assert.ok(candidates.some((candidate) => verifyKleverSignature(message, candidate, address)));
});

test('Klever mobile event parser accepts base64 and byte-array signatures', () => {
  const bytes = new Uint8Array(64).map((_, i) => i);
  const base64 = Buffer.from(bytes).toString('base64');
  assert.ok(signatureCandidates({ signature: base64 }).includes(Buffer.from(bytes).toString('hex')));
  assert.ok(signatureCandidates({ signature: [...bytes] }).includes(Buffer.from(bytes).toString('hex')));
});
