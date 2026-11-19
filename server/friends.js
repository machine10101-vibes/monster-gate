/**
 * World-server friends helpers.
 *
 * Persistence (MG Developer #2, server/persistence) owns storage:
 *   listFriends(userId) -> { friends, pendingIn, pendingOut } as { userId, name }
 *   requestFriend(fromUserId, toUserIdOrName)
 *   acceptFriend(userId, otherUserId)
 *   declineFriend(userId, otherUserId)
 *   removeFriend(userId, otherUserId)
 *
 * This module maps PersistenceError codes onto the social wire codes in
 * docs/SOCIAL_SPEC.md and server/PROTOCOL.md. The world server still
 * enforces the 100 cap before calling persist, and parties stay in memory
 * (server/party.js). Block/ignore are not in the persistence API yet.
 */

import { PersistErrorCodes, PersistenceError } from './persistence/index.js';
import { ProtocolError } from './protocol.js';

export const FRIENDS_CAP = 100;
export const SOCIAL_PER_SEC = 4;
export const SOCIAL_PER_10S = 20;
export const WELCOME_FEATURES = ['friends', 'party', 'whisper', 'block'];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUserId(value) {
  return typeof value === 'string' && UUID_RE.test(value.trim());
}

export function requireUserId(value) {
  const id = String(value || '').trim().toLowerCase();
  if (!UUID_RE.test(id)) throw new ProtocolError('not_found', 'No hunter by that name.');
  return id;
}

export class SocialError extends ProtocolError {
  constructor(code, message) {
    super(code, message || code);
    this.name = 'SocialError';
  }
}

/** Map a persistence friends error to a social/protocol error and throw it. */
export function throwFriendError(err) {
  if (err instanceof SocialError) throw err;
  if (err instanceof ProtocolError && !(err instanceof PersistenceError)) throw err;
  const code = err?.code;
  if (code === PersistErrorCodes.FRIEND_CAP || code === 'friend_cap') {
    throw new SocialError('full', err.message || 'That list is full.');
  }
  if (code === PersistErrorCodes.ALREADY_FRIENDS || code === 'already_friends') {
    throw new SocialError('already', err.message || 'Already done.');
  }
  if (code === PersistErrorCodes.SELF || code === 'self') {
    throw new SocialError('self', err.message || 'That hunter is you.');
  }
  if (code === PersistErrorCodes.NOT_FOUND || code === 'not_found') {
    throw new SocialError('not_found', err.message || 'No hunter by that name.');
  }
  if (code === PersistErrorCodes.INVALID || code === 'invalid') {
    throw new SocialError('name', err.message || 'Need a hunter name.');
  }
  if (code === PersistErrorCodes.UNAVAILABLE || code === 'unavailable') {
    throw new ProtocolError('persist', err.message || 'Could not update friends.');
  }
  if (err instanceof ProtocolError) throw err;
  throw new ProtocolError('persist', err?.message || 'Could not update friends.');
}

export async function callFriends(fn) {
  try {
    return await fn();
  } catch (err) {
    throwFriendError(err);
  }
}
