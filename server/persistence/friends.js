import {
  alreadyFriends,
  friendCap,
  hunterNotFound,
  invalid,
  selfFriend,
} from './errors.js';
import { isUserId, requireUserId } from './ids.js';

/** Spec + client cap (`src/social/constants.js` FRIENDS_CAP). */
export const FRIEND_CAP = 100;

export const FRIEND_STATUS = {
  pending: 'pending',
  accepted: 'accepted',
};

export function emptyFriendsList() {
  return { friends: [], pendingIn: [], pendingOut: [] };
}

export function friendPeer(userId, name = null) {
  return { userId, name: name || null };
}

export function pairKey(a, b) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export function involves(row, userId) {
  return row.requesterId === userId || row.targetId === userId;
}

export function otherId(row, userId) {
  return row.requesterId === userId ? row.targetId : row.requesterId;
}

export function friendRequestResult(status, from, to) {
  return { status, from, to };
}

export function listFromRows(userId, rows, nameOf) {
  const friends = [];
  const pendingIn = [];
  const pendingOut = [];
  for (const row of rows) {
    if (row.status === FRIEND_STATUS.accepted && involves(row, userId)) {
      const id = otherId(row, userId);
      friends.push(friendPeer(id, nameOf(id)));
    } else if (row.status === FRIEND_STATUS.pending && row.targetId === userId) {
      pendingIn.push(friendPeer(row.requesterId, nameOf(row.requesterId)));
    } else if (row.status === FRIEND_STATUS.pending && row.requesterId === userId) {
      pendingOut.push(friendPeer(row.targetId, nameOf(row.targetId)));
    }
  }
  return { friends, pendingIn, pendingOut };
}

export function countAccepted(rows, userId) {
  let n = 0;
  for (const row of rows) {
    if (row.status === FRIEND_STATUS.accepted && involves(row, userId)) n += 1;
  }
  return n;
}

export function countOutgoingPending(rows, userId) {
  let n = 0;
  for (const row of rows) {
    if (row.status === FRIEND_STATUS.pending && row.requesterId === userId) n += 1;
  }
  return n;
}

/** Accepted + outgoing pending — the requester's friends-list size. */
export function friendsListSize(rows, userId) {
  return countAccepted(rows, userId) + countOutgoingPending(rows, userId);
}

export function findPair(rows, a, b) {
  for (const row of rows) {
    if (
      (row.requesterId === a && row.targetId === b)
      || (row.requesterId === b && row.targetId === a)
    ) {
      if (row.status === FRIEND_STATUS.pending || row.status === FRIEND_STATUS.accepted) {
        return row;
      }
    }
  }
  return null;
}

export function assertNotSelf(fromUserId, toUserId) {
  if (fromUserId === toUserId) throw selfFriend();
}

export function assertCanRequest(fromUserId, toUserId, rows) {
  if (friendsListSize(rows, fromUserId) >= FRIEND_CAP) throw friendCap(fromUserId);
  if (countAccepted(rows, toUserId) >= FRIEND_CAP) throw friendCap(toUserId);
}

export function assertCanAccept(userId, otherUserId, rows) {
  if (countAccepted(rows, userId) >= FRIEND_CAP) throw friendCap(userId);
  if (countAccepted(rows, otherUserId) >= FRIEND_CAP) throw friendCap(otherUserId);
}

export function parseTarget(toUserIdOrName) {
  const raw = String(toUserIdOrName ?? '').trim();
  if (!raw) throw invalid('Need a hunter name or user id.');
  if (isUserId(raw)) return { kind: 'id', value: requireUserId(raw) };
  return { kind: 'name', value: raw };
}

/**
 * Decide what a new request should do given an existing pair row.
 * Reverse pending auto-accepts (docs/SOCIAL_SPEC.md request + accept).
 */
export function decideRequest(fromUserId, toUserId, existing) {
  if (!existing) return { action: 'insert' };
  if (existing.status === FRIEND_STATUS.accepted) throw alreadyFriends(fromUserId, toUserId);
  if (existing.status !== FRIEND_STATUS.pending) throw alreadyFriends(fromUserId, toUserId);
  if (existing.requesterId === fromUserId && existing.targetId === toUserId) {
    return { action: 'idempotent', row: existing };
  }
  if (existing.requesterId === toUserId && existing.targetId === fromUserId) {
    return { action: 'auto_accept', row: existing };
  }
  throw alreadyFriends(fromUserId, toUserId);
}

export { alreadyFriends, friendCap, hunterNotFound, selfFriend };
