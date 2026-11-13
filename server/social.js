/**
 * World-server social runtime: friends actions, presence, in-memory
 * parties, whispers, and in-memory block/ignore.
 *
 * Friends persist through server/persistence (listFriends, requestFriend,
 * acceptFriend, declineFriend, removeFriend). Parties stay in memory.
 * Block and ignore are process-local until the persistence API adds them.
 */

import { TYPES, cleanName, cleanText, ProtocolError } from './protocol.js';
import {
  FRIENDS_CAP, WELCOME_FEATURES, callFriends, isUserId, requireUserId, SocialError,
} from './friends.js';
import { createPartyStore, INVITE_TTL_MS, MAX_PARTY } from './party.js';

export { FRIENDS_CAP, WELCOME_FEATURES, isUserId, SocialError } from './friends.js';
export { INVITE_TTL_MS, MAX_PARTY } from './party.js';

export const SOCIAL_TYPES = new Set([
  'friend_request', 'friend_accept', 'friend_decline', 'friend_remove', 'friend_list',
  'block', 'unblock', 'ignore', 'unignore',
  'party_invite', 'party_accept', 'party_decline', 'party_leave', 'party_kick', 'party_promote',
  'whisper',
]);

const BLOCK_CAP = 100;

export function createSocialRuntime(world, opts = {}) {
  const now = () => world.now();
  const persist = world.persist;
  if (!persist?.listFriends || !persist?.requestFriend) {
    throw new Error('World persist must expose listFriends / requestFriend / acceptFriend / declineFriend / removeFriend (merge PR #60 friendships).');
  }
  const parties = opts.parties || createPartyStore({ now, max: opts.partyMax ?? MAX_PARTY, ttl: opts.inviteTtl ?? INVITE_TTL_MS });
  /** @type {Map<string, Set<string>>} user_id -> blocked user_ids */
  const blocked = new Map();
  /** @type {Map<string, Set<string>>} user_id -> ignored user_ids */
  const ignored = new Map();
  /** lowercase hunter name -> { userId, name } seen in this process */
  const names = new Map();
  /** user_id -> last known { name, id } */
  const directory = new Map();

  function sender(session, type, extra) {
    if (!session?.ws) return;
    world._send(session.ws, type, extra);
  }

  function remember(session) {
    if (!session?.userId) return;
    directory.set(session.userId, { name: session.name, id: session.id, userId: session.userId });
    if (session.name) names.set(session.name.toLowerCase(), { userId: session.userId, name: session.name, id: session.id });
  }

  function sessionByUser(userId) {
    return world.byUser.get(userId) || null;
  }

  function sessionById(id) {
    return world.players.get(id) || null;
  }

  function findByName(raw) {
    const name = cleanName(raw);
    if (!name) return null;
    const hit = names.get(name.toLowerCase());
    if (hit) {
      const live = sessionByUser(hit.userId);
      return live || hit;
    }
    for (const p of world.players.values()) {
      if (p.name && p.name.toLowerCase() === name.toLowerCase()) return p;
    }
    return null;
  }

  function resolveFriendTarget(msg) {
    if (msg.user_id && isUserId(msg.user_id)) {
      const id = requireUserId(msg.user_id);
      const live = sessionByUser(id);
      if (live) return { userId: id, name: live.name, id: live.id, live };
      const known = directory.get(id);
      if (known) return { userId: id, name: known.name, id: known.id || '', live: null };
      return { userId: id, name: '', id: '', live: null, unknown: true };
    }
    const name = cleanName(msg.name);
    if (!name) throw new SocialError('name', 'Need a hunter name.');
    const hit = findByName(name);
    if (!hit?.userId) throw new SocialError('not_found', 'No hunter by that name.');
    return { userId: hit.userId, name: hit.name || name, id: hit.id || '', live: sessionByUser(hit.userId) };
  }

  async function resolveKnownHunter(target) {
    if (!target?.userId) throw new SocialError('not_found', 'No hunter by that name.');
    if (target.live || target.name) return target;
    if (world.persist?.loadCharacter) {
      try {
        const rec = await world.persist.loadCharacter(target.userId);
        if (rec) {
          const name = rec.name || rec.state?.name || '';
          if (name) directory.set(target.userId, { name, id: target.id || '', userId: target.userId });
          return { ...target, name: name || 'Hunter', unknown: false };
        }
      } catch {
        /* treat as missing */
      }
    }
    if (target.unknown) throw new SocialError('not_found', 'No hunter by that name.');
    return target;
  }

  function resolvePartyTarget(msg) {
    if (typeof msg.id === 'string' && msg.id) {
      const live = sessionById(msg.id);
      if (live) return live;
      throw new SocialError('offline', 'They are not online.');
    }
    const name = cleanName(msg.name);
    if (!name) throw new SocialError('name', 'Need a hunter name.');
    const hit = findByName(name);
    const live = hit?.userId ? sessionByUser(hit.userId) : (hit?.id ? sessionById(hit.id) : null);
    if (!live) {
      if (hit) throw new SocialError('offline', 'They are not online.');
      throw new SocialError('not_found', 'No hunter by that name.');
    }
    return live;
  }

  function setOf(map, userId) {
    let set = map.get(userId);
    if (!set) {
      set = new Set();
      map.set(userId, set);
    }
    return set;
  }

  function isBlocked(a, b) {
    if (!a || !b) return false;
    return setOf(blocked, a).has(b) || setOf(blocked, b).has(a);
  }

  function isIgnoredBy(target, actor) {
    if (!target || !actor) return false;
    return setOf(ignored, target).has(actor);
  }

  function blockedRows(userId) {
    return [...(blocked.get(userId) || [])].map((id) => ({
      user_id: id,
      name: directory.get(id)?.name || sessionByUser(id)?.name || 'Hunter',
    }));
  }

  function ignoredRows(userId) {
    return [...(ignored.get(userId) || [])].map((id) => ({
      user_id: id,
      name: directory.get(id)?.name || sessionByUser(id)?.name || 'Hunter',
    }));
  }

  function enrichRow(row) {
    const userId = row.userId || row.user_id;
    const live = sessionByUser(userId);
    if (live) {
      remember(live);
      return {
        user_id: userId,
        id: live.id,
        name: live.name || row.name || 'Hunter',
        presence: 'online',
        zone: live.zone || '',
      };
    }
    const known = directory.get(userId);
    return {
      user_id: userId,
      id: known?.id || '',
      name: row.name || known?.name || 'Hunter',
      presence: 'offline',
      zone: '',
    };
  }

  async function snapshot(userId) {
    const list = await callFriends(() => persist.listFriends(userId));
    const [friendRows, pendingIn, pendingOut] = await Promise.all([
      Promise.all((list.friends || []).map(async (row) => enrichRow(row))),
      Promise.all((list.pendingIn || list.pending_in || []).map(async (row) => enrichRow(row))),
      Promise.all((list.pendingOut || list.pending_out || []).map(async (row) => enrichRow(row))),
    ]);
    return {
      friends: friendRows,
      pending_in: pendingIn,
      pending_out: pendingOut,
      blocked: blockedRows(userId),
      ignored: ignoredRows(userId),
    };
  }

  async function pushFriendList(session) {
    if (!session?.userId) return;
    const body = await snapshot(session.userId);
    session.friendIds = new Set((body.friends || []).map((f) => f.user_id));
    sender(session, 'friend_list', body);
  }

  async function pushFriendListTo(userId) {
    const live = sessionByUser(userId);
    if (live) await pushFriendList(live);
  }

  function presenceFrame(session, presence) {
    return {
      user_id: session.userId,
      id: presence === 'offline' ? undefined : session.id,
      name: session.name,
      presence,
      zone: presence === 'offline' ? '' : (session.zone || ''),
    };
  }

  function broadcastPresence(session, presence) {
    if (!session?.userId) return;
    const ids = session.friendIds;
    if (!ids || !ids.size) return;
    const frame = presenceFrame(session, presence);
    if (presence === 'offline') delete frame.id;
    for (const otherId of ids) {
      const other = sessionByUser(otherId);
      if (other) sender(other, 'friend_presence', frame);
    }
  }

  function partyPayload(party) {
    return parties.view(party, (id) => sessionById(id));
  }

  function broadcastParty(party, also = []) {
    const seen = new Set();
    const targets = [];
    if (party) {
      for (const m of party.members) {
        const live = sessionById(m.id);
        if (live) targets.push(live);
        seen.add(m.id);
      }
    }
    for (const s of also) {
      if (s && !seen.has(s.id)) targets.push(s);
    }
    const body = party ? partyPayload(party) : null;
    for (const s of targets) sender(s, 'party_state', { party: body });
  }

  /** Push an updated party to members, and `party: null` to anyone who just left. */
  function applyPartyChange(result, also = []) {
    if (!result) return;
    const extra = [];
    for (const id of result.leftover || []) {
      const live = sessionById(id);
      if (live) extra.push(live);
    }
    if (result.disbanded || !result.party) {
      const seen = new Set();
      for (const s of [...extra, ...also]) {
        if (!s?.id || seen.has(s.id)) continue;
        seen.add(s.id);
        sender(s, 'party_state', { party: null });
      }
      return;
    }
    broadcastParty(result.party);
    const remaining = new Set(result.party.members.map((m) => m.id));
    const seen = new Set();
    for (const s of [...extra, ...also]) {
      if (!s?.id || remaining.has(s.id) || seen.has(s.id)) continue;
      seen.add(s.id);
      sender(s, 'party_state', { party: null });
    }
  }

  function assertAuthed(session) {
    // Guests may party in a session, but every friend_* / block / ignore
    // action is refused with the spec code `auth`.
    if (session?.guest || !session?.userId) {
      throw new SocialError('auth', 'Sign in with an account to use friends.');
    }
  }

  async function enforceFriendCap(userId, extra = 1) {
    const list = await callFriends(() => persist.listFriends(userId));
    const used = (list.friends?.length || 0) + (list.pendingOut?.length || list.pending_out?.length || 0);
    if (used + extra > FRIENDS_CAP) throw new SocialError('full', 'That list is full.');
  }

  async function onJoin(session) {
    remember(session);
    session.maxHp = session.maxHp ?? 20;
    if (session.userId) {
      try {
        await pushFriendList(session);
        broadcastPresence(session, 'online');
      } catch (err) {
        console.warn('social onJoin', session.userId, err?.message || err);
      }
    }
    const party = parties.partyOf(session.id);
    sender(session, 'party_state', { party: party ? partyPayload(party) : null });
    if (party) broadcastParty(party);
  }

  function onZone(session, prevZone) {
    if (session.zone !== prevZone) {
      broadcastPresence(session, 'online');
      const party = parties.partyOf(session.id);
      if (party) broadcastParty(party);
    }
  }

  function onHp(session, prevHp) {
    if (session.hp !== prevHp) {
      const party = parties.partyOf(session.id);
      if (party) broadcastParty(party);
    }
  }

  function onLeave(session) {
    broadcastPresence(session, 'offline');
    const result = parties.leaveIfAny(session);
    if (result) applyPartyChange(result, [session]);
  }

  async function handle(session, msg) {
    const type = msg.type;
    if (type.startsWith('friend') || type === 'block' || type === 'unblock' || type === 'ignore' || type === 'unignore') {
      assertAuthed(session);
    }
    if (type !== 'friend_list' && type !== 'party_leave') {
      if (session.limiter && !session.limiter.allowSocial()) {
        throw new ProtocolError('rate', 'Slow down.');
      }
    }

    switch (type) {
      case 'friend_request': return friendRequest(session, msg);
      case 'friend_accept': return friendAccept(session, msg);
      case 'friend_decline': return friendDecline(session, msg);
      case 'friend_remove': return friendRemove(session, msg);
      case 'friend_list': return pushFriendList(session);
      case 'block': return setRelation(session, msg, 'block', true);
      case 'unblock': return setRelation(session, msg, 'block', false);
      case 'ignore': return setRelation(session, msg, 'ignore', true);
      case 'unignore': return setRelation(session, msg, 'ignore', false);
      case 'party_invite': return partyInvite(session, msg);
      case 'party_accept': return partyAccept(session, msg);
      case 'party_decline': return partyDecline(session, msg);
      case 'party_leave': return partyLeave(session);
      case 'party_kick': return partyKick(session, msg);
      case 'party_promote': return partyPromote(session, msg);
      case 'whisper': return whisper(session, msg);
      default: return null;
    }
  }

  function friendQuery(msg) {
    if (msg.user_id && isUserId(msg.user_id)) return requireUserId(msg.user_id);
    const name = cleanName(msg.name || msg.user_id || msg.id);
    if (!name) throw new SocialError('name', 'Need a hunter name.');
    return name;
  }

  async function afterFriendsChanged(session, otherId, { accepted = false } = {}) {
    await pushFriendList(session);
    if (otherId) await pushFriendListTo(otherId);
    if (!accepted) return;
    const other = otherId ? sessionByUser(otherId) : null;
    broadcastPresence(session, 'online');
    if (other) {
      other.friendIds = other.friendIds || new Set();
      other.friendIds.add(session.userId);
      broadcastPresence(other, 'online');
    }
  }

  async function friendRequest(session, msg) {
    const query = friendQuery(msg);
    const preview = isUserId(query)
      ? { userId: requireUserId(query) }
      : (findByName(query) ? { userId: findByName(query).userId } : null);
    if (preview?.userId === session.userId) throw new SocialError('self', 'That hunter is you.');
    if (preview?.userId && isBlocked(session.userId, preview.userId)) throw new SocialError('blocked', 'Blocked.');
    await enforceFriendCap(session.userId, 1);
    const result = await callFriends(() => persist.requestFriend(session.userId, query));
    const otherId = result?.to?.userId || result?.from?.userId;
    const toId = result?.to?.userId === session.userId ? result?.from?.userId : result?.to?.userId;
    if (toId && isBlocked(session.userId, toId)) {
      await callFriends(() => persist.removeFriend(session.userId, toId)).catch(() => {});
      throw new SocialError('blocked', 'Blocked.');
    }
    const accepted = result?.status === 'accepted';
    if (!accepted && toId) {
      const other = sessionByUser(toId);
      if (other) sender(other, 'friend_request', { from: { user_id: session.userId, name: session.name } });
    }
    await afterFriendsChanged(session, toId, { accepted });
  }

  async function friendAccept(session, msg) {
    const fromId = requireUserId(msg.user_id || msg.id);
    if (fromId === session.userId) throw new SocialError('self', 'That hunter is you.');
    if (isBlocked(session.userId, fromId)) throw new SocialError('blocked', 'Blocked.');
    await enforceFriendCap(session.userId, 1);
    await callFriends(() => persist.acceptFriend(session.userId, fromId));
    await afterFriendsChanged(session, fromId, { accepted: true });
  }

  async function friendDecline(session, msg) {
    const fromId = requireUserId(msg.user_id || msg.id);
    await callFriends(() => persist.declineFriend(session.userId, fromId));
    await pushFriendList(session);
    await pushFriendListTo(fromId);
  }

  async function friendRemove(session, msg) {
    const otherId = requireUserId(msg.user_id || msg.id);
    await callFriends(() => persist.removeFriend(session.userId, otherId));
    if (session.friendIds) session.friendIds.delete(otherId);
    await pushFriendList(session);
    await pushFriendListTo(otherId);
  }

  async function setRelation(session, msg, kind, on) {
    const target = await resolveKnownHunter(resolveFriendTarget(msg));
    if (target.userId === session.userId) throw new SocialError('self', 'That hunter is you.');
    const map = kind === 'block' ? blocked : ignored;
    const set = setOf(map, session.userId);
    if (on) {
      if (set.has(target.userId)) throw new SocialError('already', 'Already done.');
      if (set.size >= BLOCK_CAP) throw new SocialError('full', 'That list is full.');
      set.add(target.userId);
      if (kind === 'block') {
        try { await persist.removeFriend(session.userId, target.userId); } catch { /* not friends */ }
        if (session.friendIds) session.friendIds.delete(target.userId);
        const other = sessionByUser(target.userId);
        if (other?.friendIds) other.friendIds.delete(session.userId);
      }
    } else {
      if (!set.has(target.userId)) throw new SocialError('not_found', 'No hunter by that name.');
      set.delete(target.userId);
    }
    await pushFriendList(session);
    if (on && kind === 'block') await pushFriendListTo(target.userId);
  }

  function partyInvite(session, msg) {
    const target = resolvePartyTarget(msg);
    if (isBlocked(session.userId, target.userId)) throw new SocialError('blocked', 'Blocked.');
    if (isIgnoredBy(target.userId, session.userId)) throw new SocialError('ignored', 'They are ignoring invites.');
    const rec = parties.invite(session, target);
    sender(target, 'party_invite', {
      invite_id: rec.invite_id,
      from: { id: session.id, name: session.name },
      expires_at: rec.expires_at,
    });
  }

  function partyAccept(session, msg) {
    const party = parties.accept(session, msg.invite_id || msg.id);
    broadcastParty(party);
  }

  function partyDecline(session, msg) {
    parties.decline(session, msg.invite_id || msg.id);
  }

  function partyLeave(session) {
    const result = parties.leave(session);
    applyPartyChange(result, [session]);
  }

  function partyKick(session, msg) {
    const targetId = typeof msg.id === 'string' && msg.id ? msg.id : resolvePartyTarget(msg).id;
    const live = sessionById(targetId);
    const result = parties.kick(session, targetId);
    applyPartyChange(result, live ? [live] : []);
  }

  function partyPromote(session, msg) {
    const targetId = typeof msg.id === 'string' && msg.id ? msg.id : resolvePartyTarget(msg).id;
    const party = parties.promote(session, targetId);
    broadcastParty(party);
  }

  function whisper(session, msg) {
    const text = cleanText(msg.text);
    if (!text) throw new ProtocolError('chat', 'Empty chat.');
    if (session.limiter && !session.limiter.allowChat()) throw new ProtocolError('rate', 'Slow down.');
    let target = null;
    if (typeof msg.to === 'string' && msg.to) {
      target = sessionById(msg.to) || (isUserId(msg.to) ? sessionByUser(requireUserId(msg.to)) : null);
      if (!target) {
        const hit = findByName(msg.to);
        target = hit?.userId ? sessionByUser(hit.userId) : null;
      }
    }
    if (!target) throw new SocialError('whisper', 'Could not whisper.');
    if (target.id === session.id) throw new SocialError('self', 'That hunter is you.');
    if (isBlocked(session.userId, target.userId)) throw new SocialError('blocked', 'Blocked.');
    if (isIgnoredBy(target.userId, session.userId)) throw new SocialError('ignored', 'They are ignoring invites.');
    const frame = {
      id: `c_${++world.chatSeq}`,
      channel: 'whisper',
      from: { id: session.id, name: session.name },
      to: { id: target.id, name: target.name },
      text,
      at: now(),
    };
    sender(session, TYPES.chat, frame);
    sender(target, TYPES.chat, frame);
  }

  function hidesChat(observer, speaker) {
    if (!observer?.userId || !speaker?.userId) return false;
    return setOf(blocked, observer.userId).has(speaker.userId);
  }

  return {
    persist,
    parties,
    blocked,
    ignored,
    names,
    directory,
    features: WELCOME_FEATURES,
    SOCIAL_TYPES,
    onJoin,
    onZone,
    onHp,
    onLeave,
    handle,
    whisper,
    hidesChat,
    isSocialType: (type) => SOCIAL_TYPES.has(type),
    pushFriendList,
    snapshot,
  };
}

