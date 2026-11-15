import { canWorldCreator, isAdmin } from '../../supabase/functions/_shared/staff.js';
import { bearerSession } from './account.js';
import { loadCloudConfig } from './cloud.js';

export { canWorldCreator, isAdmin, isModerator, STAFF_ROLES } from '../../supabase/functions/_shared/staff.js';

export function emptyStaff() {
  return { role: null, admin: false, moderator: false, worldCreator: false };
}

async function staffPost(session, body) {
  const cfg = await loadCloudConfig();
  if (!cfg.url || !cfg.key) return { status: 0, json: { error: 'The account service could not be reached.' } };
  const current = await bearerSession(session);
  if (!current?.accessToken) return { status: 401, json: { error: 'Sign in again.' } };
  let res;
  try {
    res = await fetch(`${cfg.url}/functions/v1/staff`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        apikey: cfg.key,
        authorization: `Bearer ${cfg.key}`,
      },
      body: JSON.stringify({ ...body, accessToken: current.accessToken }),
    });
  } catch {
    return { status: 0, json: { error: 'The account service could not be reached.' } };
  }
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

export async function loadStaffRole(session) {
  if (session?.kind !== 'email') return emptyStaff();
  const res = await staffPost(session, { op: 'me' });
  if (res.status !== 200 || !res.json?.ok) return emptyStaff();
  const role = res.json.role === 'admin' || res.json.role === 'moderator' ? res.json.role : null;
  return {
    role,
    admin: !!res.json.admin || isAdmin(role),
    moderator: !!res.json.moderator,
    worldCreator: !!res.json.worldCreator || canWorldCreator(role),
  };
}

export async function listModerators(session) {
  const res = await staffPost(session, { op: 'list' });
  if (res.status !== 200) throw new Error(res.json?.error || 'The staff list could not be opened.');
  return Array.isArray(res.json.moderators) ? res.json.moderators : [];
}

export async function createModeratorAccount(session, email, password) {
  const res = await staffPost(session, { op: 'create', email, password });
  if (res.status !== 200) throw new Error(res.json?.error || 'The moderator account could not be created.');
  return res.json;
}

export async function promoteModerator(session, email) {
  const res = await staffPost(session, { op: 'promote', email });
  if (res.status !== 200) throw new Error(res.json?.error || 'That account could not be made a moderator.');
  return res.json;
}

export async function demoteModerator(session, email) {
  const res = await staffPost(session, { op: 'demote', email });
  if (res.status !== 200) throw new Error(res.json?.error || 'That moderator could not be removed.');
  return res.json;
}
