/**
 * The guild master signs into the ledger. That account does not enter the hunt.
 * Moderators hunt like everyone else. Their extra tool is World Creator.
 * The admins table is the lock. This email only chooses the hunt redirect.
 */

export const ADMIN_EMAIL = 'monstergateonline@gmail.com';

export function isAdminEmail(email) {
  return String(email || '').trim().toLowerCase() === ADMIN_EMAIL;
}

export function isAdminAccount(session) {
  return !!session && session.kind === 'email' && isAdminEmail(session.email);
}

export function readStaffRole(value) {
  return String(value || '').trim().toLowerCase() === 'moderator' ? 'moderator' : '';
}

export function canCreateWorld(staffRole) {
  return readStaffRole(staffRole) === 'moderator';
}

function basePath() {
  const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || '/';
  return base.endsWith('/') ? base : `${base}/`;
}

export function adminHref() {
  return `${basePath()}admin.html`;
}

export function gameHref() {
  return basePath();
}
