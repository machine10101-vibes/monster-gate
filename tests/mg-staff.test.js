import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  canWorldCreator,
  checkStaffPassword,
  handleStaffOp,
  isAdmin,
  parseAdminEmails,
  resolveRole,
} from '../supabase/functions/_shared/staff.js';

const src = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

const ADMIN = 'admin@example.com';
const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const MOD_EMAIL = 'mod@example.com';
const MOD_ID = '22222222-2222-4222-8222-222222222222';
const PLAYER_EMAIL = 'hunter@example.com';
const PLAYER_ID = '33333333-3333-4333-8333-333333333333';

function memoryDb(seed = {}) {
  const roles = new Map(seed.roles || []);
  const users = new Map(seed.users || []);
  const created = [];
  return {
    roles,
    users,
    created,
    async getRole(userId) {
      return roles.get(userId) || null;
    },
    async upsertRole(row) {
      roles.set(row.userId, row.role);
      users.set(row.email, { id: row.userId, email: row.email });
    },
    async removeRole(userId) {
      roles.delete(userId);
    },
    async listMods() {
      const out = [];
      for (const [email, user] of users) {
        if (roles.get(user.id) === 'moderator') out.push({ userId: user.id, email, role: 'moderator' });
      }
      return out;
    },
    async findUserByEmail(email) {
      return users.get(email) || null;
    },
    async createAuthUser(email, password) {
      if (users.has(email)) return { error: 'That email already has an account. Make it a moderator instead.', status: 409 };
      const id = `new-${email}`;
      created.push({ email, password, id });
      users.set(email, { id, email });
      return { id, email };
    },
  };
}

test('MG-STAFF listed admin emails become the admin role', () => {
  assert.deepEqual(parseAdminEmails(' Admin@Example.com ; other@x.com\nnot-an-email'), ['admin@example.com', 'other@x.com']);
  assert.equal(resolveRole(null, ADMIN, [ADMIN]), 'admin');
  assert.equal(resolveRole('moderator', ADMIN, [ADMIN]), 'admin');
  assert.equal(resolveRole('moderator', MOD_EMAIL, [ADMIN]), 'moderator');
  assert.equal(resolveRole(null, PLAYER_EMAIL, [ADMIN]), null);
  assert.equal(isAdmin('admin'), true);
  assert.equal(canWorldCreator('admin'), true);
  assert.equal(canWorldCreator('moderator'), true);
  assert.equal(canWorldCreator(null), false);
  assert.equal(checkStaffPassword('short').status, 400);
});

test('MG-STAFF admin can create a playable moderator account', async () => {
  const db = memoryDb();
  const created = await handleStaffOp({
    op: 'create',
    actor: { id: ADMIN_ID, email: ADMIN },
    body: { email: MOD_EMAIL, password: 'hunterpass' },
    db,
    adminEmails: [ADMIN],
  });
  assert.equal(created.ok, true);
  assert.equal(created.created, true);
  assert.equal(created.role, 'moderator');
  assert.equal(db.roles.get(created.userId), 'moderator');
  assert.equal(db.created[0].password, 'hunterpass');
});

test('MG-STAFF create of an existing email tells the admin to promote', async () => {
  const db = memoryDb({
    users: [[PLAYER_EMAIL, { id: PLAYER_ID, email: PLAYER_EMAIL }]],
  });
  const result = await handleStaffOp({
    op: 'create',
    actor: { id: ADMIN_ID, email: ADMIN },
    body: { email: PLAYER_EMAIL, password: 'hunterpass' },
    db,
    adminEmails: [ADMIN],
  });
  assert.equal(result.status, 409);
  assert.match(result.error, /already has an account/i);
  assert.match(result.error, /moderator/i);
});

test('MG-STAFF admin can promote an existing account to moderator', async () => {
  const db = memoryDb({
    users: [[PLAYER_EMAIL, { id: PLAYER_ID, email: PLAYER_EMAIL }]],
  });
  const promoted = await handleStaffOp({
    op: 'promote',
    actor: { id: ADMIN_ID, email: ADMIN },
    body: { email: PLAYER_EMAIL },
    db,
    adminEmails: [ADMIN],
  });
  assert.equal(promoted.ok, true);
  assert.equal(promoted.created, false);
  assert.equal(promoted.already, false);
  assert.equal(promoted.role, 'moderator');
  assert.equal(db.roles.get(PLAYER_ID), 'moderator');

  const again = await handleStaffOp({
    op: 'promote',
    actor: { id: ADMIN_ID, email: ADMIN },
    body: { email: PLAYER_EMAIL },
    db,
    adminEmails: [ADMIN],
  });
  assert.equal(again.already, true);

  const missing = await handleStaffOp({
    op: 'promote',
    actor: { id: ADMIN_ID, email: ADMIN },
    body: { email: 'nobody@example.com' },
    db,
    adminEmails: [ADMIN],
  });
  assert.equal(missing.status, 404);
});

test('MG-STAFF cannot promote or demote the admin, and players cannot staff', async () => {
  const db = memoryDb({
    roles: [[MOD_ID, 'moderator'], [ADMIN_ID, 'admin']],
    users: [
      [MOD_EMAIL, { id: MOD_ID, email: MOD_EMAIL }],
      [ADMIN, { id: ADMIN_ID, email: ADMIN }],
    ],
  });
  const asMod = await handleStaffOp({
    op: 'promote',
    actor: { id: MOD_ID, email: MOD_EMAIL, rowRole: 'moderator' },
    body: { email: PLAYER_EMAIL },
    db,
    adminEmails: [ADMIN],
  });
  assert.equal(asMod.status, 403);

  const promoteAdmin = await handleStaffOp({
    op: 'promote',
    actor: { id: ADMIN_ID, email: ADMIN },
    body: { email: ADMIN },
    db,
    adminEmails: [ADMIN],
  });
  assert.equal(promoteAdmin.status, 409);

  const demoteAdmin = await handleStaffOp({
    op: 'demote',
    actor: { id: ADMIN_ID, email: ADMIN },
    body: { email: ADMIN },
    db,
    adminEmails: [ADMIN],
  });
  assert.equal(demoteAdmin.status, 409);

  const demoted = await handleStaffOp({
    op: 'demote',
    actor: { id: ADMIN_ID, email: ADMIN },
    body: { email: MOD_EMAIL },
    db,
    adminEmails: [ADMIN],
  });
  assert.equal(demoted.ok, true);
  assert.equal(db.roles.get(MOD_ID), undefined);

  const meMod = await handleStaffOp({
    op: 'me',
    actor: { id: MOD_ID, email: MOD_EMAIL, rowRole: 'moderator' },
    db,
    adminEmails: [ADMIN],
  });
  assert.equal(meMod.worldCreator, true);
  assert.equal(meMod.admin, false);

  const mePlayer = await handleStaffOp({
    op: 'me',
    actor: { id: PLAYER_ID, email: PLAYER_EMAIL },
    db,
    adminEmails: [ADMIN],
  });
  assert.equal(mePlayer.worldCreator, false);
  assert.equal(mePlayer.role, null);
});

test('MG-STAFF World Creator is gated and admin settings can promote existing accounts', () => {
  const hud = src('../src/ui/hud.js');
  const ui = src('../src/wallet/staffUi.js');
  const dash = src('../src/wallet/adminDash.js');
  const html = src('../index.html');
  const main = src('../src/main.js');
  const client = src('../src/wallet/staff.js');
  const fn = src('../supabase/functions/staff/index.ts');
  const toml = src('../supabase/config.toml');
  const readme = src('../README.md');
  const shared = src('../supabase/functions/_shared/staff.js');
  assert.match(hud, /mountStaffSettings/);
  assert.match(hud, /canWorldCreator/);
  assert.match(hud, /World Creator is only available on moderator accounts/);
  assert.match(hud, /jumpRows\.push\(\['world', 'World Creator'/);
  assert.match(ui, /Create a moderator account/);
  assert.match(ui, /Make an existing account a moderator/);
  assert.match(ui, /promoteModerator/);
  assert.match(ui, /createModeratorAccount/);
  assert.match(dash, /mountStaffSettings/);
  assert.match(html, /id="admin-dash"/);
  assert.match(html, /This account manages staff/);
  assert.match(main, /loadStaffRole/);
  assert.match(main, /openAdminConsole/);
  assert.match(main, /staff\.admin/);
  assert.match(main, /canWorldCreator\(\)/);
  assert.match(main, /isAdmin\(\)/);
  assert.match(client, /functions\/v1\/staff/);
  assert.match(client, /op: 'promote'/);
  assert.match(fn, /MG_ADMIN_EMAILS/);
  assert.match(fn, /auth_user_by_email/);
  assert.match(fn, /op: String\(body.op/);
  assert.match(toml, /\[functions\.staff\]/);
  assert.match(readme, /admin account is not a hunter/);
  assert.match(readme, /MG_ADMIN_EMAILS/);
  assert.match(shared, /op === 'promote'/);
  assert.doesNotMatch(fn, /@[a-z0-9.-]+\.[a-z]{2,}/i);
  assert.doesNotMatch(shared, /@[a-z0-9.-]+\.[a-z]{2,}/i);
});
