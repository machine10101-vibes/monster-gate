/**
 * Opens the guild ledger. The publishable key only names the project.
 * The signed-in access token rides in the body, and the function checks the admins table.
 */

import { buildLedger } from '../../supabase/functions/_shared/ledger.js';
import { saveAccount, SESSION_TAKEN } from '../wallet/account.js';
import { loadCloudConfig } from '../wallet/cloud.js';

async function freshToken(session, cfg) {
  const expires = Date.parse(session.expiresAt || '');
  if (session.accessToken && expires > Date.now() + 60_000) return session.accessToken;
  if (!session.refreshToken) return session.accessToken || '';
  const res = await fetch(`${cfg.url}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: cfg.key,
      authorization: `Bearer ${cfg.key}`,
    },
    body: JSON.stringify({ refresh_token: session.refreshToken }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.access_token) return session.accessToken || '';
  session.accessToken = json.access_token;
  if (json.refresh_token) session.refreshToken = json.refresh_token;
  session.expiresAt = json.expires_at
    ? new Date(Number(json.expires_at) * 1000).toISOString()
    : new Date(Date.now() + (Number(json.expires_in) || 3600) * 1000).toISOString();
  saveAccount(session);
  return session.accessToken;
}

function fail(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

function packLedger(json) {
  if (!Array.isArray(json.accounts) || !Array.isArray(json.wallets)) return null;
  const ledger = buildLedger({
    accounts: json.accounts,
    wallets: json.wallets,
    staff: json.staff,
  });
  ledger.role = json.role === 'moderator' ? 'moderator' : 'master';
  return ledger;
}

async function postAdmin(session, body) {
  const cfg = await loadCloudConfig();
  if (!cfg.url || !cfg.key) throw fail('unavailable', 'Supabase is not connected to this site yet.');
  if (!session?.accessToken && !session?.refreshToken) {
    throw fail('denied', 'Sign in again to open the ledger.');
  }
  const accessToken = await freshToken(session, cfg);
  if (!accessToken) throw fail('denied', 'Sign in again to open the ledger.');
  let res;
  try {
    res = await fetch(`${cfg.url}/functions/v1/admin`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        apikey: cfg.key,
        authorization: `Bearer ${cfg.key}`,
      },
      body: JSON.stringify({ ...body, accessToken, sessionId: session.sessionId || '' }),
    });
  } catch {
    throw fail('unavailable', 'The ledger could not be reached.');
  }
  const json = await res.json().catch(() => ({}));
  if (typeof json.sessionId === 'string' && json.sessionId) {
    session.sessionId = json.sessionId;
    saveAccount(session);
  }
  if (res.status === 401) throw fail('denied', json.error || 'Sign in again.');
  if (res.status === 409 && json.taken) throw fail('taken', json.error || SESSION_TAKEN);
  if (res.status === 403) throw fail('denied', json.error || 'This gate is for the guild master.');
  if (!res.ok) throw fail('fail', json.error || 'The ledger could not be opened.');
  const ledger = packLedger(json);
  if (!ledger) throw fail('fail', json.error || 'The ledger could not be opened.');
  return ledger;
}

export async function loadLedger(session) {
  return postAdmin(session, { op: 'overview' });
}

export async function changeStaff(session, op, userId) {
  return postAdmin(session, { op, userId });
}


async function postAdminData(session, body) {
  const cfg = await loadCloudConfig();
  if (!cfg.url || !cfg.key) throw fail('unavailable', 'Supabase is not connected to this site yet.');
  if (!session?.accessToken && !session?.refreshToken) throw fail('denied', 'Sign in again to open the ledger.');
  const accessToken = await freshToken(session, cfg);
  if (!accessToken) throw fail('denied', 'Sign in again to open the ledger.');
  let res;
  try {
    res = await fetch(`${cfg.url}/functions/v1/admin`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        apikey: cfg.key,
        authorization: `Bearer ${cfg.key}`,
      },
      body: JSON.stringify({ ...body, accessToken, sessionId: session.sessionId || '' }),
    });
  } catch {
    throw fail('unavailable', 'The guild ledger could not be reached.');
  }
  const json = await res.json().catch(() => ({}));
  if (typeof json.sessionId === 'string' && json.sessionId) {
    session.sessionId = json.sessionId;
    saveAccount(session);
  }
  if (res.status === 401) throw fail('denied', json.error || 'Sign in again.');
  if (res.status === 409 && json.taken) throw fail('taken', json.error || SESSION_TAKEN);
  if (res.status === 403) throw fail('denied', json.error || 'Only the guild master can issue free passes.');
  if (!res.ok) throw fail('fail', json.error || 'The request could not be completed.');
  return json;
}

export async function loadPassCodes(session) {
  const result = await postAdminData(session, { op: 'passcodes_list' });
  return Array.isArray(result.codes) ? result.codes : [];
}

export async function issuePassCode(session) {
  return postAdminData(session, { op: 'passcode_issue' });
}
