import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { gatePassStatusText } from '../src/wallet/settings.js';

const now = Date.parse('2026-11-27T00:00:00Z');

test('settings renders active account membership and days remaining', () => {
  const expiry = new Date(now + 10 * 86_400_000).toISOString();
  const message = gatePassStatusText({ active: true, expiresAt: expiry }, now);
  assert.match(message, /Active Gate Pass · 10 days remaining/);
  assert.match(message, /expires/);
  assert.match(gatePassStatusText({ active: true, expiresAt: new Date(now + 1).toISOString() }, now), /1 day remaining/);
  assert.equal(gatePassStatusText({ active: false, expiresAt: expiry }, now), 'No active Gate Pass.');
  assert.equal(gatePassStatusText({ active: true, expiresAt: new Date(now - 1).toISOString() }, now), 'No active Gate Pass.');
});

test('settings paints membership responses and does not require a linked wallet for access', () => {
  const source = readFileSync(new URL('../src/wallet/settings.js', import.meta.url), 'utf8');
  assert.match(source, /passStatus\.textContent = membershipError \|\| gatePassStatusText\(membership\)/);
  assert.match(source, /membership = status;[\s\S]*?paint\(\)/);
  assert.doesNotMatch(source, /if \(busy \|\| !address\) return/);
});
