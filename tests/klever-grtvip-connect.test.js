import assert from 'node:assert/strict';
import { test } from 'node:test';
import { connectProvider, getKleverWebInstance } from '../src/wallet/klever.js';

const ADDRESS = 'klv159vrgc50hqnr44zn25cdndmdwgrqvdsajax58asmslmqhcjfunwqktvupu';

test('GRT-VIP provider sequence initializes once and awaits getWalletAddress', async () => {
  const originalWindow = globalThis.window;
  let initializeCalls = 0;
  let addressCalls = 0;
  let forbiddenPromptCalls = 0;
  const provider = {
    async initialize() { initializeCalls += 1; },
    async getWalletAddress() {
      addressCalls += 1;
      await Promise.resolve();
      return ADDRESS;
    },
    requestAccount() { forbiddenPromptCalls += 1; throw new Error('unexpected account prompt'); },
    enable() { forbiddenPromptCalls += 1; throw new Error('unexpected enable prompt'); },
  };
  globalThis.window = { kleverWeb: provider };
  try {
    const [first, second] = await Promise.all([getKleverWebInstance(), getKleverWebInstance()]);
    assert.equal(first, provider);
    assert.equal(second, provider);
    assert.equal(initializeCalls, 1);
    assert.equal(await connectProvider(provider), ADDRESS);
    assert.equal(addressCalls, 1);
    assert.equal(forbiddenPromptCalls, 0);
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});
