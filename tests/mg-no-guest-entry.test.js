import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

test('login screen offers local guest play', () => {
  assert.match(html, /id="btn-guest"/);
  assert.match(html, /Play as Guest/i);
  assert.match(main, /getElementById\('btn-guest'\)/);
  assert.match(html, /id="btn-account-create"/);
  assert.match(html, /id="btn-account-signin"/);
  assert.match(html, /id="btn-wallet"/);
});

test('offline solo mode remains available', () => {
  assert.match(html, /id="pick-solo"/);
});

test('guest entry stays offline and uses separate local roster', () => {
  assert.match(main, /guest:local/);
  assert.match(main, /if \(this.wallet\?\.kind === 'guest' && isWorldOnline\(location.search\)\) return/);
  assert.match(main, /if \(this.wallet\?\.kind !== 'guest'\) \{/);
  assert.match(main, /ensureMembership\(account, this\)/);
});
