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
  const adminView = src('../src/admin/view.js');
  const api = src('../src/admin/api.js');
  const page = src('../admin.html');
  assert.match(client, /MG-XXXX-XXXX-XXXX-XXXX/);
  assert.match(client, /post\(currentSession, \{ op: 'redeem', code \}\)/);
  assert.match(client, /paymentPanel\.hidden = false/);
  assert.match(client, /node\('button', 'mg-gatepass-pay', 'Buy Membership'\)/);
  assert.match(client, /estimatedKlvAmount = \(atomic \/ 1_000_000\)\.toFixed\(6\)/);
  assert.match(client, /post\(currentSession, \{ op: 'rate' \}\)/);
  assert.match(client, /if \(!status\.walletAddress\)/);
  assert.match(client, /linkKleverWallet\(currentSession\)/);
  assert.doesNotMatch(client, /Link wallet to see KLV amount/);
  assert.doesNotMatch(client, /mg-gatepass-link-wallet/);
  assert.match(adminView, /data-issue-passcode/);
  assert.match(admin, /issuePassCode\(session\)/);
  assert.match(api, /export async function loadPassCodes/);
  assert.match(api, /export async function issuePassCode/);
  assert.match(page, /data-tab="passes"/);
});

test('admin account records include wallet, paid membership and trial pass facts', () => {
  const ledger = src('../supabase/functions/_shared/ledger.js');
  const adminView = src('../src/admin/view.js');
  const adminPage = src('../admin.html');
  const migration = src('../supabase/migrations/20261124150000_admin_account_access_facts.sql');
  const allAccounts = src('../supabase/migrations/20261124153000_admin_all_auth_accounts.sql');
  assert.match(ledger, /walletAddress: kind === 'account'/);
  assert.match(ledger, /paidExpiresAt: kind === 'account'/);
  assert.match(ledger, /trialPassExpiresAt: kind === 'account'/);
  assert.match(adminView, /function accountsTab/);
  assert.match(adminView, /Paid subscription/);
  assert.match(adminView, /10-day trial pass/);
  assert.match(adminPage, /data-tab="accounts"/);
  assert.match(migration, /trial_pass_expires_at/);
  assert.match(migration, /paid_expires_at/);
  assert.match(migration, /klever_address/);
  assert.match(allAccounts, /from auth\.users u/i);
  assert.match(allAccounts, /left join public\.hunter_accounts h/i);
});


test('the live KLV estimate is displayed before wallet linking and Buy Membership starts checkout', () => {
  const client = src('../src/wallet/membership.js');
  const membership = src('../supabase/functions/membership/index.ts');
  assert.match(client, /op: 'rate'/);
  assert.match(client, /Math\.ceil\(\(5 \/ price\) \* 1_000_000\)/);
  assert.match(client, /amount\.textContent = `\$\{estimatedKlvAmount\} KLV`/);
  assert.match(client, /payNow\.textContent = 'Buy Membership'/);
  assert.match(client, /if \(!status\.walletAddress\)[\s\S]*?linkKleverWallet\(currentSession\)/);
  assert.match(membership, /if\(b\.op==="rate"\)/);
  assert.match(membership, /if\(b\.op==="quote"\)\{const a=await walletFor\(db,id\)/);
});
