/** Caps and codes shared by the adapter, mock, UI, and docs/SOCIAL_SPEC.md. */

export const SOCIAL_PROTOCOL = 1;

export const MAX_PARTY = 4;
export const INVITE_TTL_MS = 60_000;
export const FRIENDS_CAP = 100;
export const BLOCK_CAP = 100;
export const NAME_MAX = 16;
export const XP_BONUS_PER_MEMBER = 0.08;

export const PRESENCE = {
  online: 'online',
  offline: 'offline',
};

export const LOOT_MODE = {
  roundRobin: 'round_robin',
  needGreed: 'need_greed',
};

export const ERRORS = {
  protocol: 'protocol',
  auth: 'auth',
  rate: 'rate',
  not_found: 'not_found',
  self: 'self',
  already: 'already',
  pending: 'pending',
  full: 'full',
  blocked: 'blocked',
  ignored: 'ignored',
  expired: 'expired',
  offline: 'offline',
  not_leader: 'not_leader',
  not_in_party: 'not_in_party',
  in_party: 'in_party',
  name: 'name',
  whisper: 'whisper',
  busy: 'busy',
};

export const ERROR_TEXT = {
  [ERRORS.auth]: 'Sign in with an account to use friends.',
  [ERRORS.rate]: 'Slow down.',
  [ERRORS.not_found]: 'No hunter by that name.',
  [ERRORS.self]: 'That hunter is you.',
  [ERRORS.already]: 'Already done.',
  [ERRORS.pending]: 'Already waiting.',
  [ERRORS.full]: 'That list is full.',
  [ERRORS.blocked]: 'Blocked.',
  [ERRORS.ignored]: 'They are ignoring invites.',
  [ERRORS.expired]: 'That invite expired.',
  [ERRORS.offline]: 'They are not online.',
  [ERRORS.not_leader]: 'Only the leader can do that.',
  [ERRORS.not_in_party]: 'You are not in a party.',
  [ERRORS.in_party]: 'They are already in a party.',
  [ERRORS.name]: 'Need a hunter name.',
  [ERRORS.whisper]: 'Could not whisper.',
  [ERRORS.busy]: 'They already have an invite.',
};

export const SOCIAL_INBOUND = new Set([
  'friend_list',
  'friend_presence',
  'friend_request',
  'party_invite',
  'party_state',
  'loot_result',
  'whisper',
]);

export function errorMessage(code, fallback) {
  const key = String(code || '');
  return ERROR_TEXT[key] || fallback || key || 'Something went wrong.';
}

export function cleanHunterName(raw) {
  return String(raw || '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
}

function paramsOf(search) {
  const raw = String(search ?? '');
  const q = raw.startsWith('?') ? raw.slice(1) : raw;
  return new URLSearchParams(q);
}

/** Parse social flags. Mock needs both mmo=1 and mocksocial=1. */
export function parseSocialFlags(search = '') {
  const q = paramsOf(search);
  const mmo = q.get('mmo') === '1';
  const mocksocial = q.get('mocksocial') === '1';
  return {
    mmo,
    mocksocial,
    mock: mmo && mocksocial,
    live: mmo && !mocksocial,
    offline: !mmo,
  };
}
