/**
 * World-server social runtime: persistent friends/block/ignore, presence,
 * in-memory parties, and private whispers.
 */

import { TYPES, cleanTargetName, cleanText, ProtocolError } from './protocol.js';
import {
  FRIENDS_CAP, WELCOME_FEATURES, callFriends, isUserId, requireUserId, SocialError,
} from './friends.js';
import { createPartyStore, INVITE_TTL_MS, MAX_PARTY } from './party.js';

export { FRIENDS_CAP, WELCOME_FEATURES, isUserId, SocialError } from './friends.js';
export { INVITE_TTL_MS, MAX_PARTY } from './party.js';

export const SOCIAL_TYPES = new Set([
  'friend_request', 'friend_accept', 'friend_decline', 'friend_cancel', 'friend_remove', 'friend_list',
  'block', 'unblock', 'ignore', 'unignore',
  'party_invite', 'party_accept', 'party_decline', 'party_leave', 'party_kick', 'party_promote', 'party_loot', 'whisper',
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
  /** Account-keyed relations loaded from persistence. */
  const blocked = new Map();
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
    const name = cleanTargetName(raw);
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
    const name = cleanTargetName(msg.name);
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
    const name = cleanTargetName(msg.name);
    if (!name) throw new SocialError('name', 'Need a hunter name.');
    const hit = findByName(name);
    const live = hit?.userId ? sessionByUser(hit.userId) : (hit?.id ? sessionById(hit.id) : null);
    if (!live) {
      if (hit) throw new SocialError('offline', 'They are not online.');
      throw new SocialError('not_found', 'No hunter by that name.');
    }
    return live;
  }

  function setOf(map, userId) { return map.get(userId) || new Set(); }
  function isBlocked(a, b) { return !!a && !!b && (setOf(blocked,a).has(b) || setOf(blocked,b).has(a)); }
  function isIgnoredBy(target, actor) { return !!target && !!actor && setOf(ignored,target).has(actor); }
  async function loadRelations(userId) {
    if (!persist.listRelations) return;
    const rows = await persist.listRelations(userId) || [];
    const nextBlocked=new Set(rows.filter(r=>r.status==='blocked').map(r=>r.user_id));
    const nextIgnored=new Set(rows.filter(r=>r.status==='ignored').map(r=>r.user_id));
    blocked.set(userId,nextBlocked);
    ignored.set(userId,nextIgnored);
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
    await loadRelations(session.userId);
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
        await loadRelations(session.userId);
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

  /** Share where a party is standing, at most a few times a second. */
  function onPose(session) {
    const party = parties.partyOf(session.id);
    if (!party) return;
    const t = world.now();
    if (party.poseAt != null && t - party.poseAt < 800) return;
    party.poseAt = t;
    broadcastParty(party);
  }

  function onLeave(session) {
    broadcastPresence(session, 'offline');
    const result = parties.leaveIfAny(session);
    if (result) applyPartyChange(result, [session]);
  }

  function sendResult(session,msg,ok,extra={}) {
    if(msg.request_id) sender(session,'social_result',{request_id:String(msg.request_id).slice(0,64),ok,...extra});
  }

  async function handle(session, msg) {
    const type=msg.type, requestId=msg.request_id;
    try {
      if (type.startsWith('friend') || ['block','unblock','ignore','unignore'].includes(type)) assertAuthed(session);
      if (type !== 'friend_list' && type !== 'party_leave' && session.limiter && !session.limiter.allowSocial()) {
        throw new ProtocolError('rate','Slow down.');
      }
      switch (type) {
        case 'friend_request': await friendRequest(session,msg); break;
        case 'friend_accept': await friendAccept(session,msg); break;
        case 'friend_decline': await friendDecline(session,msg); break;
        case 'friend_cancel': await friendCancel(session,msg); break;
        case 'friend_remove': await friendRemove(session,msg); break;
        case 'friend_list': await pushFriendList(session); break;
        case 'block': await setRelation(session,msg,'block',true); break;
        case 'unblock': await setRelation(session,msg,'block',false); break;
        case 'ignore': await setRelation(session,msg,'ignore',true); break;
        case 'unignore': await setRelation(session,msg,'ignore',false); break;
        case 'party_invite': partyInvite(session,msg); break;
        case 'party_accept': partyAccept(session,msg); break;
        case 'party_decline': partyDecline(session,msg); break;
        case 'party_leave': partyLeave(session); break;
        case 'party_kick': partyKick(session,msg); break;
        case 'party_promote': partyPromote(session,msg); break;
        case 'party_loot': partyLoot(session,msg); break;
        case 'whisper': whisper(session,msg); break;
        default: return null;
      }
      sendResult(session,msg,true,{pending:type==='friend_request'||type==='party_invite'});
      return true;
    } catch(err) {
      const code=err?.code||'protocol',message=err?.message||'Social action failed.';
      if(!requestId) sender(session,'error',{code,message});
      sendResult(session,msg,false,{code,message});
      if(requestId) return true;
      throw err;
    }
  }

  function friendQuery(msg) {
    if (msg.user_id && isUserId(msg.user_id)) return requireUserId(msg.user_id);
    const name = cleanTargetName(msg.name || msg.user_id || msg.id);
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
    if (preview?.userId && (isBlocked(session.userId, preview.userId) || isIgnoredBy(preview.userId,session.userId))) throw new SocialError('blocked', 'Blocked.');
    await enforceFriendCap(session.userId, 1);
    const result = await callFriends(() => persist.requestFriend(session.userId, query));
    const otherId = result?.to?.userId || result?.from?.userId;
    const toId = result?.to?.userId === session.userId ? result?.from?.userId : result?.to?.userId;
    if (toId && (isBlocked(session.userId, toId) || isIgnoredBy(toId,session.userId))) {
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
    if (isBlocked(session.userId, fromId) || isIgnoredBy(session.userId,fromId)) throw new SocialError('blocked', 'Blocked.');
    await enforceFriendCap(session.userId, 1);
    await callFriends(() => persist.acceptFriend(session.userId, fromId));
    await afterFriendsChanged(session, fromId, { accepted: true });
  }

  async function friendCancel(session,msg) {
    const otherId=requireUserId(msg.user_id||msg.id);
    if (!persist.cancelFriend) throw new SocialError('protocol','Request cancellation is unavailable.');
    await persist.cancelFriend(session.userId,otherId);
    await pushFriendList(session);
    await pushFriendListTo(otherId);
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
    const set = new Set(setOf(map,session.userId));
    const current = set.has(target.userId);
    if (on && current) throw new SocialError('already', 'Already done.');
    if (!on && !current) throw new SocialError('not_found', 'No hunter by that name.');
    if (on) {
      if (set.size >= BLOCK_CAP) throw new SocialError('full', 'That list is full.');
      set.add(target.userId);
      if (!persist.setRelation) throw new SocialError('persist','Block and ignore storage is unavailable.');
      await persist.setRelation(session.userId,target.userId,kind==='block'?'blocked':'ignored');
      map.set(session.userId,set);
      if (kind === 'block') {
        try { await persist.removeFriend(session.userId, target.userId); } catch { /* not friends */ }
        if (session.friendIds) session.friendIds.delete(target.userId);
        const other = sessionByUser(target.userId);
        if (other?.friendIds) other.friendIds.delete(session.userId);
      }
    } else {
      set.delete(target.userId);
      await persist.setRelation(session.userId,target.userId,null);
      map.set(session.userId,set);
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

  function partyDecline(session, msg) { parties.decline(session, msg.invite_id || msg.id); }

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

  function partyLoot(session,msg) {
    const party=parties.partyOf(session.id);
    if(!party)throw new SocialError('not_in_party','You are not in a party.');
    if(party.leader!==session.id)throw new SocialError('not_leader','Only the leader can change loot mode.');
    if(!['round_robin','need_greed'].includes(msg.loot))throw new SocialError('protocol','Unknown loot mode.');
    party.loot=msg.loot;
    broadcastParty(party);
  }

  function resolveWhisperTarget(msg) {
    const toRaw = typeof msg.to === 'string' ? msg.to : '';
    const to = toRaw.trim();
    if (to) {
      const byId = sessionById(to) || (isUserId(to) ? sessionByUser(requireUserId(to)) : null);
      if (byId) return byId;
      const name = cleanTargetName(to);
      if (!name) throw new SocialError('name', 'Need a hunter name.');
      const hit = findByName(name);
      const live = hit?.userId ? sessionByUser(hit.userId) : null;
      if (!live) throw new SocialError('whisper', 'Could not whisper.');
      return live;
    }
    const name = cleanTargetName(msg.name);
    if (!name) throw new SocialError('name', 'Need a hunter name.');
    const hit = findByName(name);
    const live = hit?.userId ? sessionByUser(hit.userId) : null;
    if (!live) throw new SocialError('whisper', 'Could not whisper.');
    return live;
  }

  function whisper(session, msg) {
    const text = cleanText(msg.text);
    if (!text) throw new ProtocolError('chat', 'Empty chat.');
    if (session.limiter && !session.limiter.allowChat()) throw new ProtocolError('rate', 'Slow down.');
    const target = resolveWhisperTarget(msg);
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
    return true;
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
    loadRelations,
    onZone,
    onHp,
    onPose,
    onLeave,
    handle,
    whisper,
    hidesChat,
    isSocialType: (type) => SOCIAL_TYPES.has(type),
    pushFriendList,
    snapshot,
  };
}

