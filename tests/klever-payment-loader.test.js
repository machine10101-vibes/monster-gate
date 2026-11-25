import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('../src/wallet/membership.js', import.meta.url), 'utf8');

test('Klever payment SDK has a fallback ESM host and retries after failed loads', () => {
  assert.match(source, /https:\/\/esm\.sh\/@klever\/connect@0\.1\.9\?bundle&target=es2022/);
  assert.match(source, /https:\/\/cdn\.jsdelivr\.net\/npm\/@klever\/connect@0\.1\.9\/\+esm/);
  assert.match(source, /kleverPaymentModules = null/);
  assert.match(source, /@vite-ignore/);
});

test('Klever payment still checks the linked wallet before signing', () => {
  assert.match(source, /wallet\.address !== expectedAddress/);
  assert.match(source, /wallet\.transfer\(/);
  assert.match(source, /The wallet approved for payment does not match/);
  assert.match(source, /0-9a-f\]\{64\}/);
});
