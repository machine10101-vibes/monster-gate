/**
 * Staff roles for Monster Gate. Admin creates and promotes moderators.
 * Moderators (and admin) are playable accounts that can open World Creator.
 */

export const STAFF_ROLES = {
  ADMIN: 'admin',
  MODERATOR: 'moderator',
};

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeStaffEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function parseAdminEmails(raw) {
  return String(raw || '')
    .split(/[,;\n]+/)
    .map(normalizeStaffEmail)
    .filter((email) => EMAIL_RE.test(email) && email.length <= 254);
}

export function isListedAdmin(email, adminEmails) {
  const want = normalizeStaffEmail(email);
  return !!want && Array.isArray(adminEmails) && adminEmails.includes(want);
}

export function isAdmin(role) {
  return role === STAFF_ROLES.ADMIN;
}

export function isModerator(role) {
  return role === STAFF_ROLES.MODERATOR;
}

/** World Creator is a staff ability: moderator accounts, plus the admin account. */
export function canWorldCreator(role) {
  return isAdmin(role) || isModerator(role);
}

export function resolveRole(rowRole, email, adminEmails) {
  if (isListedAdmin(email, adminEmails)) return STAFF_ROLES.ADMIN;
  if (rowRole === STAFF_ROLES.ADMIN || rowRole === STAFF_ROLES.MODERATOR) return rowRole;
  return null;
}

export function checkStaffEmail(value) {
  const email = normalizeStaffEmail(value);
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return { error: 'Enter the email address for this account.', status: 400 };
  }
  return { email };
}

export function checkStaffPassword(value) {
  const password = String(value ?? '');
  if (password.length < 8 || password.length > 72) {
    return { error: 'Use a password of at least 8 characters.', status: 400 };
  }
  return { password };
}

function mePayload(role) {
  return {
    ok: true,
    role,
    admin: isAdmin(role),
    moderator: isModerator(role),
    worldCreator: canWorldCreator(role),
  };
}

function denyAdmin() {
  return { error: 'Only the admin account can do that.', status: 403 };
}

/**
 * Staff edge-function ops. `db` is injected so Node tests can fake it.
 *
 * db.getRole(userId) → 'admin' | 'moderator' | null
 * db.upsertRole({ userId, email, role, grantedBy })
 * db.listMods() → [{ userId, email, role, createdAt }]
 * db.findUserByEmail(email) → { id, email } | null
 * db.createAuthUser(email, password) → { id, email } | { error, status }
 */
export async function handleStaffOp({ op, actor, body = {}, db, adminEmails = [] }) {
  const emails = Array.isArray(adminEmails) ? adminEmails : parseAdminEmails(adminEmails);
  const rowRole = actor?.rowRole ?? (actor?.id ? await db.getRole(actor.id) : null);
  const role = resolveRole(rowRole, actor?.email, emails);

  if (isListedAdmin(actor?.email, emails) && actor?.id && rowRole !== STAFF_ROLES.ADMIN) {
    await db.upsertRole({
      userId: actor.id,
      email: normalizeStaffEmail(actor.email),
      role: STAFF_ROLES.ADMIN,
      grantedBy: actor.id,
    });
  }

  if (op === 'me') return mePayload(role);

  if (!isAdmin(role)) return denyAdmin();

  if (op === 'list') {
    const mods = await db.listMods();
    return { ok: true, moderators: mods };
  }

  if (op === 'create') {
    const emailCheck = checkStaffEmail(body.email);
    if (emailCheck.error) return emailCheck;
    const passCheck = checkStaffPassword(body.password);
    if (passCheck.error) return passCheck;
    if (emailCheck.email === normalizeStaffEmail(actor.email) || isListedAdmin(emailCheck.email, emails)) {
      return { error: 'That account is the admin.', status: 409 };
    }
    const existing = await db.findUserByEmail(emailCheck.email);
    if (existing) {
      return { error: 'That email already has an account. Make it a moderator instead.', status: 409 };
    }
    const created = await db.createAuthUser(emailCheck.email, passCheck.password);
    if (created?.error) return created;
    await db.upsertRole({
      userId: created.id,
      email: emailCheck.email,
      role: STAFF_ROLES.MODERATOR,
      grantedBy: actor.id,
    });
    return { ok: true, created: true, userId: created.id, email: emailCheck.email, role: STAFF_ROLES.MODERATOR };
  }

  if (op === 'promote') {
    const emailCheck = checkStaffEmail(body.email);
    if (emailCheck.error) return emailCheck;
    if (emailCheck.email === normalizeStaffEmail(actor.email) || isListedAdmin(emailCheck.email, emails)) {
      return { error: 'That account is the admin.', status: 409 };
    }
    const existing = await db.findUserByEmail(emailCheck.email);
    if (!existing) return { error: 'No account uses that email.', status: 404 };
    const current = await db.getRole(existing.id);
    if (current === STAFF_ROLES.ADMIN) return { error: 'That account is the admin.', status: 409 };
    await db.upsertRole({
      userId: existing.id,
      email: emailCheck.email,
      role: STAFF_ROLES.MODERATOR,
      grantedBy: actor.id,
    });
    return {
      ok: true,
      created: false,
      already: current === STAFF_ROLES.MODERATOR,
      userId: existing.id,
      email: emailCheck.email,
      role: STAFF_ROLES.MODERATOR,
    };
  }

  if (op === 'demote') {
    const emailCheck = checkStaffEmail(body.email);
    if (emailCheck.error) return emailCheck;
    if (emailCheck.email === normalizeStaffEmail(actor.email) || isListedAdmin(emailCheck.email, emails)) {
      return { error: 'The admin account cannot be demoted.', status: 409 };
    }
    const existing = await db.findUserByEmail(emailCheck.email);
    if (!existing) return { error: 'No account uses that email.', status: 404 };
    const current = await db.getRole(existing.id);
    if (current === STAFF_ROLES.ADMIN) return { error: 'The admin account cannot be demoted.', status: 409 };
    if (current !== STAFF_ROLES.MODERATOR) return { error: 'That account is not a moderator.', status: 404 };
    await db.removeRole(existing.id);
    return { ok: true, email: emailCheck.email, role: null };
  }

  return { error: 'The request was not understood.', status: 400 };
}
