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


test('subscription tiers are estimated from Swopus before a wallet is linked', () => {
  assert.ok(source.includes("id: 'monthly', days: 30, total: 5"));
  assert.ok(source.includes("id: 'six-month', days: 180, total: 27"));
  assert.ok(source.includes("id: 'annual', days: 365, total: 48"));
  assert.ok(source.includes("op: 'rate'"));
  assert.ok(source.includes("selectedPlan().total / liveKlvUsdPrice"));
  assert.ok(source.includes("const amountRow = node('div', 'mg-gatepass-amountrow')"));
  assert.ok(!source.includes("mg-gatepass-copy"));
  assert.ok(!source.includes("Link wallet to see KLV amount"));
});

test('Buy Membership links a wallet only when the player chooses to pay, then loads a quote', () => {
  assert.match(source, /import \{ linkKleverWallet \} from '\.\/link\.js'/);
  assert.match(source, /if \(!status\.walletAddress\)[\s\S]*?currentSession = await linkKleverWallet\(currentSession\)/);
  assert.match(source, /status\.walletAddress = refreshed\.data\.walletAddress/);
  assert.match(source, /await loadQuote\(\)/);
  assert.match(source, /sendSignedKlvTransfer\(quote, status\.walletAddress\)/);
});
