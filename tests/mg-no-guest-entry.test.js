import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

test('login screen no longer offers guest play', () => {
  assert.doesNotMatch(html, /id="btn-guest"/);
  assert.doesNotMatch(html, /Play as guest/i);
  assert.doesNotMatch(main, /getElementById\('btn-guest'\)/);
  assert.match(html, /id="btn-account-create"/);
  assert.match(html, /id="btn-account-signin"/);
  assert.match(html, /id="btn-wallet"/);
});

test('offline solo mode remains available after removing guest login', () => {
  assert.match(html, /id="pick-solo"/);
});
