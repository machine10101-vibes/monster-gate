import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeKleverAddress, providerAddress } from '../src/wallet/klever.js';

const ADDRESS = 'klv159vrgc50hqnr44zn25cdndmdwgrqvdsajax58asmslmqhcjfunwqktvupu';

test('normalizes Klever account text before creating a signed proof', () => {
  assert.equal(normalizeKleverAddress(ADDRESS), ADDRESS);
  assert.equal(normalizeKleverAddress(`  ${ADDRESS.toUpperCase()}  `), ADDRESS);
  assert.equal(normalizeKleverAddress(`Address: ${ADDRESS}\n`), ADDRESS);
  assert.equal(normalizeKleverAddress(`${ADDRESS.slice(0, 18)} ${ADDRESS.slice(18)}`), ADDRESS);
});

test('extracts the canonical account from provider response wrappers', () => {
  assert.equal(normalizeKleverAddress({ address: ` ${ADDRESS.toUpperCase()} ` }), ADDRESS);
  assert.equal(normalizeKleverAddress({ data: { account: ADDRESS } }), ADDRESS);
  assert.equal(normalizeKleverAddress([null, { walletAddress: ADDRESS }]), ADDRESS);
});

test('rejects malformed or non-Klever account values', () => {
  assert.equal(normalizeKleverAddress(''), '');
  assert.equal(normalizeKleverAddress('not-a-wallet'), '');
  assert.equal(normalizeKleverAddress('klv1short'), '');
  assert.equal(normalizeKleverAddress({ address: '0x1234' }), '');
});

test('uses the selected Klever account before a stale provider getter', () => {
  const stale = 'klv1fr724pjdjp3l8unuvgda0k6vt06d875hj7t5ggrxymzcg3jcveysejzljc';
  assert.equal(providerAddress({
    selectedAddress: ` ${ADDRESS.toUpperCase()} `,
    address: stale,
    getWalletAddress: () => stale,
  }), ADDRESS);
  assert.equal(providerAddress({ accounts: [ADDRESS] }), ADDRESS);
});
