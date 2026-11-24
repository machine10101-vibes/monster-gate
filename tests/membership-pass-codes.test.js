import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const src = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('only the guild master can issue and list one-time 10-day pass codes', () => {
  const admin = src('../supabase/functions/admin/index.ts');
  assert.match(admin, /body\.op === "passcodes_list" \|\| body\.op === "passcode_issue"/);
  assert.match(admin, /user\.role !== "master"/);
  assert.match(admin, /crypto\.getRandomValues/);
  assert.match(admin, /crypto\.subtle\.digest\("SHA-256"/);
  assert.match(admin, /membership_pass_codes/);
  assert.match(admin, /code_hash/);
  assert.doesNotMatch(admin, /select\("\*".*membership_pass_codes/);
});

test('Gate Pass codes are redeemed by the signed-in account and add ten days atomically', () => {
  const membership = src('../supabase/functions/membership/index.ts');
  const migration = src('../supabase/migrations/20261124133000_membership_free_pass_codes.sql');
  assert.match(membership, /async function redeemPassCode/);
  assert.match(membership, /op==="redeem"/);
  assert.match(membership, /redeem_membership_pass_code/);
  assert.match(membership, /daysAdded:10/);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /revoke all on public\.membership_pass_codes from anon, authenticated/i);
  assert.match(migration, /interval '10 days'/i);
  assert.match(migration, /where code_hash = p_code_hash and redeemed_by is null/i);
  assert.match(migration, /greatest\(public\.memberships\.expires_at, now\(\)\) \+ interval '10 days'/i);
  assert.match(migration, /grant execute on function public\.redeem_membership_pass_code\(uuid, text\) to service_role/i);
});

test('the Gate Pass window accepts free codes even without a connected Klever wallet', () => {
  const client = src('../src/wallet/membership.js');
  const admin = src('../src/admin/main.js');
  const api = src('../src/admin/api.js');
  const page = src('../admin.html');
  assert.match(client, /MG-XXXX-XXXX-XXXX-XXXX/);
  assert.match(client, /post\(currentSession, \{ op: 'redeem', code \}\)/);
  assert.match(client, /paymentPanel\.hidden = !status\.walletAddress/);
  assert.match(client, /if \(status\.walletAddress\) loadQuote\(\)/);
  assert.match(admin, /data-issue-passcode/);
  assert.match(admin, /issuePassCode\(session\)/);
  assert.match(api, /export async function loadPassCodes/);
  assert.match(api, /export async function issuePassCode/);
  assert.match(page, /data-tab="passes"/);
});
