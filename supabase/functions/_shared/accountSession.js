/** One live browser at a time. A new sign-in takes the seat; the other device is dropped. */

export const ACCOUNT_SESSION_TAKEN = 'This account is signed in on another device.';
export const ACCOUNT_SESSION_TAKEN_STATUS = 409;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function readSessionId(value) {
  const id = String(value || '').trim();
  return UUID_RE.test(id) ? id : '';
}

/**
 * storedId from account_sessions, offeredId from the browser.
 * No row yet: adopt the offered id, or mint later.
 * A different (or missing) offered id means another device holds the seat.
 */
export function decideSession(storedId, offeredId) {
  const stored = readSessionId(storedId);
  const offered = readSessionId(offeredId);
  if (!stored) return { adopt: true, sessionId: offered };
  if (offered && offered === stored) return { ok: true, sessionId: stored };
  return { taken: true };
}

export function takenBody() {
  return { taken: true, error: ACCOUNT_SESSION_TAKEN };
}

/** Revoke every other Supabase Auth session for this sign-in. The current token stays. */
export function othersLogoutRequest(url, accessToken, apiKey) {
  const base = String(url || '').replace(/\/$/, '');
  const token = typeof accessToken === 'string' ? accessToken : '';
  const key = typeof apiKey === 'string' ? apiKey : '';
  if (!base || token.length < 20 || !key) return null;
  return {
    url: `${base}/auth/v1/logout?scope=others`,
    init: {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        apikey: key,
        authorization: `Bearer ${token}`,
      },
    },
  };
}

export async function readAccountSession(admin, userId) {
  const { data, error } = await admin
    .from('account_sessions')
    .select('session_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return { error };
  return { sessionId: readSessionId(data?.session_id) };
}

export async function writeAccountSession(admin, userId, sessionId) {
  const { error } = await admin.from('account_sessions').upsert(
    {
      user_id: userId,
      session_id: sessionId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  return error || null;
}
