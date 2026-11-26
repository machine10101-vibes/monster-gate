import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');

test('account sign-in status and helper copy are forced to white on the dark login screen', () => {
  assert.match(css, /#title #wallet-status,[\s\S]*?#title \.wallet-status,[\s\S]*?#title \.account-panel \.wg-label,[\s\S]*?#title \.account-panel \.account-hint,[\s\S]*?#title \.wallet-help,[\s\S]*?#title \.wallet-help p,[\s\S]*?#title \.wallet-unlinked,[\s\S]*?#title \.wallet-unlinked p\s*\{\s*color: #fff !important;/);
});
