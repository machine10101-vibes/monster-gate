/**
 * The guild master signs into the ledger. That account does not enter the hunt.
 * The email only chooses the route. The admins table is the lock.
 * Keep this address the same as ADMIN_EMAIL in the ledger.
 */

export const ADMIN_EMAIL = 'monstergateonline@gmail.com';

export function isAdminEmail(email) {
  return String(email || '').trim().toLowerCase() === ADMIN_EMAIL;
}

export function isAdminAccount(session) {
  return !!session && session.kind === 'email' && isAdminEmail(session.email);
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
