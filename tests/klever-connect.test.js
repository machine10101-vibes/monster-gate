import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { addressFromWallet, connectMethod } from '../src/wallet/klever.js';

const src = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

test('the extension Confirm popup is connect, and older wallets use initialize', () => {
  assert.equal(connectMethod({ connect() {}, initialize() {} }), 'connect');
  assert.equal(connectMethod({ initialize() {} }, { initialize() {} }), 'hub');
  assert.equal(connectMethod({ initialize() {} }), 'initialize');
  assert.equal(connectMethod({}), '');
  assert.equal(addressFromWallet({ address: 'klv1qpzry9x8gf2tvdw0s3jn' }), 'klv1qpzry9x8gf2tvdw0s3jn');
  assert.equal(addressFromWallet({ getWalletAddress: () => 'short' }, 'klv1qpzry9x8gf2tvdw0s3jn'), 'klv1qpzry9x8gf2tvdw0s3jn');
  assert.equal(addressFromWallet({}), '');
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
