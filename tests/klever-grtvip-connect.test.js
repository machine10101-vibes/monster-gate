import assert from 'node:assert/strict';
import { test } from 'node:test';
import { web } from '@klever/sdk-web';
import { connectProvider, getKleverWebInstance } from '../src/wallet/klever.js';

const ADDRESS = 'klv159vrgc50hqnr44zn25cdndmdwgrqvdsajax58asmslmqhcjfunwqktvupu';

test('GRT-VIP sequence initializes the SDK wrapper once and awaits its wallet address', async () => {
  const originalWindow = globalThis.window;
  const originalInitialize = web.initialize;
  const originalGetWalletAddress = web.getWalletAddress;
  let initializeCalls = 0;
  let addressCalls = 0;
  let forbiddenPromptCalls = 0;
  const provider = {
    requestAccount() { forbiddenPromptCalls += 1; throw new Error('unexpected account prompt'); },
    enable() { forbiddenPromptCalls += 1; throw new Error('unexpected enable prompt'); },
  };

  web.initialize = async () => { initializeCalls += 1; };
  web.getWalletAddress = async () => {
    addressCalls += 1;
    await Promise.resolve();
    return ADDRESS;
  };
  globalThis.window = { kleverWeb: provider };

  try {
    const [first, second] = await Promise.all([
      getKleverWebInstance(),
      getKleverWebInstance(),
    ]);
    assert.equal(first, provider);
    assert.equal(second, provider);
    assert.equal(initializeCalls, 1);
    assert.equal(await connectProvider(provider), ADDRESS);
    assert.equal(addressCalls, 1);
    assert.equal(forbiddenPromptCalls, 0);
  } finally {
    web.initialize = originalInitialize;
    web.getWalletAddress = originalGetWalletAddress;
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});
