import assert from 'node:assert/strict';
import { test } from 'node:test';
import { identify, verifyActiveMembership } from '../server/auth.js';

const USER_ID = '123e4567-e89b-42d3-a456-426614174000';
const ENV = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-test-key',
};

test('World 1 membership check accepts only a future expiry', async () => {
  const active = await verifyActiveMembership(USER_ID, ENV, async () => ({
    ok: true,
    json: async () => [{ expires_at: new Date(Date.now() + 60_000).toISOString() }],
  }));
  assert.equal(active, true);
  const expired = await verifyActiveMembership(USER_ID, ENV, async () => ({
    ok: true,
    json: async () => [{ expires_at: new Date(Date.now() - 60_000).toISOString() }],
  }));
  assert.equal(expired, false);
  const missing = await verifyActiveMembership(USER_ID, ENV, async () => ({
    ok: true,
    json: async () => [],
  }));
  assert.equal(missing, false);
});

test('World 1 fails closed if the membership database cannot be checked', async () => {
  assert.equal(await verifyActiveMembership(USER_ID, { SUPABASE_URL: ENV.SUPABASE_URL }, async () => { throw new Error('offline'); }), null);
  assert.equal(await verifyActiveMembership(USER_ID, ENV, async () => ({ ok: false })), null);
});

test('World 1 hello rejects expired memberships and accepts active ones', async () => {
  const hello = { token: 'valid-access-token', name: 'Hunter' };
  const verifyToken = async () => ({ userId: USER_ID, name: 'Hunter', guest: false });
  await assert.rejects(
    identify(hello, ENV, verifyToken, async () => false),
    (error) => error.code === 'auth' && /membership is required/i.test(error.message),
  );
  const identity = await identify(hello, ENV, verifyToken, async () => true);
  assert.equal(identity.userId, USER_ID);
  assert.equal(identity.guest, false);
});
