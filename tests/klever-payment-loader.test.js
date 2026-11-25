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


test('monthly membership payment remains visible when no wallet is linked', () => {
  assert.match(source, /paymentPanel\.hidden = false/);
  assert.match(source, /Pay \$5\/month with Klever Wallet/);
  assert.match(source, /Link a Klever wallet to this game account/);
});

test('Gate Pass can link a wallet from the subscription panel before loading a quote', () => {
  assert.match(source, /import \{ linkKleverWallet \} from '\.\/link\.js'/);
  assert.match(source, /currentSession = await linkKleverWallet\(currentSession\)/);
  assert.match(source, /status\.walletAddress = refreshed\.data\.walletAddress/);
  assert.match(source, /walletLinkNotice\.hidden = true/);
  assert.match(source, /loadQuote\(\)/);
});
