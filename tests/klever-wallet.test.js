import assert from 'node:assert/strict';
import { test } from 'node:test';
import { connectWallet } from '../src/wallet/klever.js';

test('Klever connection awaits provider initialization and getWalletAddress', async () => {
  const priorWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const priorNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  let initialized = false;
  let addressCalls = 0;
  const address = 'klv1' + 'a'.repeat(58);
  const provider = {
    async initialize() { initialized = true; },
    async getWalletAddress() {
      assert.equal(initialized, true, 'wallet address must be read after SDK initialization');
      addressCalls++;
      return address;
    },
  };
  Object.defineProperty(globalThis, 'window', { configurable: true, writable: true, value: { kleverWeb: provider } });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { userAgent: 'Desktop Browser', platform: 'Linux x86_64', maxTouchPoints: 0 } });
  try {
    const result = await connectWallet();
    assert.equal(result.kw, provider);
    assert.equal(result.address, address);
    assert.equal(result.mobile, false);
    assert.equal(addressCalls, 1);
  } finally {
    if (priorWindow) Object.defineProperty(globalThis, 'window', priorWindow);
    else delete globalThis.window;
    if (priorNavigator) Object.defineProperty(globalThis, 'navigator', priorNavigator);
    else delete globalThis.navigator;
  }
});
