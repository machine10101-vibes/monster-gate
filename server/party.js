/**
 * In-memory parties for World 1. Not persisted (see docs/SOCIAL_SPEC.md).
 *
 * Rules: max 4 including the leader, invites expire after 60 seconds,
 * only the leader kicks or promotes, the oldest remaining member is
 * promoted when the leader leaves or disconnects, and a party is
 * cleaned up when fewer than two members remain.
 */

import { ProtocolError, cleanName } from './protocol.js';
import { SocialError } from './friends.js';

export const MAX_PARTY = 4;
export const INVITE_TTL_MS = 60_000;

function newId(prefix, seq) {
  return `${prefix}${seq.toString(36)}`;
}

export function createPartyStore({ now = () => Date.now(), max = MAX_PARTY, ttl = INVITE_TTL_MS } = {}) {
  /** @type {Map<string, { id: string, leader: string, loot: string, loot_turn: number, members: Array<{ id: string, joinedAt: number }> }>} */
  const parties = new Map();
  const byMember = new Map();
  /** @type {Map<string, { invite_id: string, from: string, to: string, partyId: string | null, expires_at: number }>} */
  const invites = new Map();
  const incoming = new Map();
  let seq = 0;

  function expire() {
    const t = now();
    for (const [id, inv] of [...invites.entries()]) {
      if (t >= inv.expires_at) {
        invites.delete(id);
        if (incoming.get(inv.to) === id) incoming.delete(inv.to);
      }
    }
  }

  function partyOf(sessionId) {
    const pid = byMember.get(sessionId);
    return pid ? parties.get(pid) || null : null;
  }

  function takeInvite(inviteId) {
    expire();
    const inv = invites.get(inviteId);
    if (!inv) return { error: 'expired' };
    if (now() >= inv.expires_at) {
      invites.delete(inviteId);
      if (incoming.get(inv.to) === inviteId) incoming.delete(inv.to);
      return { error: 'expired' };
    }
    return { inv };
  }

  function dropInvite(inv) {
    invites.delete(inv.invite_id);
    if (incoming.get(inv.to) === inv.invite_id) incoming.delete(inv.to);
  }

  function disband(party) {
    for (const m of party.members) byMember.delete(m.id);
    parties.delete(party.id);
    for (const [id, inv] of [...invites.entries()]) {
      if (inv.partyId === party.id) dropInvite(inv);
    }
  }

  function removeMember(party, sessionId) {
    const leftover = party.members.map((m) => m.id);
    party.members = party.members.filter((m) => m.id !== sessionId);
    byMember.delete(sessionId);
    if (party.members.length < 2) {
      disband(party);
      return { disbanded: true, party: null, leftover };
    }
    if (party.leader === sessionId) {
      const oldest = [...party.members].sort((a, b) => a.joinedAt - b.joinedAt)[0];
      party.leader = oldest.id;
    }
    return { disbanded: false, party, leftover };
  }

  return {
    max,
    ttl,
    parties,
    invites,

    expire,

    partyOf,

    invite(from, to) {
      expire();
      if (!from?.id || !to?.id) throw new SocialError('not_found', 'No hunter by that name.');
      if (from.id === to.id) throw new SocialError('self', 'That hunter is you.');
      const existing = partyOf(from.id);
      if (existing && existing.leader !== from.id) {
        throw new SocialError('not_leader', 'Only the leader can do that.');
      }
      if (existing && existing.members.length >= max) {
        throw new SocialError('full', `Party is full (${max}).`);
      }
      const theirs = partyOf(to.id);
      if (theirs && theirs.id === existing?.id) throw new SocialError('already', 'Already done.');
      if (theirs) throw new SocialError('in_party', 'They are already in a party.');

      const prevId = incoming.get(to.id);
      if (prevId) {
        const prev = invites.get(prevId);
        if (prev && prev.from === from.id) {
          dropInvite(prev);
        } else if (prev) {
          throw new SocialError('busy', 'They already have an invite.');
        }
      }

      const invite_id = newId('pinv_', ++seq);
      const rec = {
        invite_id,
        from: from.id,
        to: to.id,
        partyId: existing?.id || null,
        expires_at: now() + ttl,
      };
      invites.set(invite_id, rec);
      incoming.set(to.id, invite_id);
      return rec;
    },

    accept(session, inviteId) {
      const { inv, error } = takeInvite(String(inviteId || ''));
      if (error) throw new SocialError('expired', 'That invite expired.');
      if (inv.to !== session.id) throw new SocialError('not_found', 'No hunter by that name.');
      if (partyOf(session.id)) throw new SocialError('in_party', 'They are already in a party.');

      let party = inv.partyId ? parties.get(inv.partyId) : null;
      if (party && party.members.length >= max) {
        dropInvite(inv);
        throw new SocialError('full', `Party is full (${max}).`);
      }
      if (!party) {
        const leaderId = inv.from;
        if (partyOf(leaderId)) throw new SocialError('in_party', 'They are already in a party.');
        party = {
          id: newId('pty_', ++seq),
          leader: leaderId,
          loot: 'round_robin',
          loot_turn: 0,
          members: [{ id: leaderId, joinedAt: now() }],
        };
        parties.set(party.id, party);
        byMember.set(leaderId, party.id);
      }
      party.members.push({ id: session.id, joinedAt: now() });
      byMember.set(session.id, party.id);
      dropInvite(inv);
      return party;
    },

    decline(session, inviteId) {
      const { inv, error } = takeInvite(String(inviteId || ''));
      if (error) throw new SocialError('expired', 'That invite expired.');
      if (inv.to !== session.id) throw new SocialError('not_found', 'No hunter by that name.');
      dropInvite(inv);
      return inv;
    },

    leave(session) {
      const party = partyOf(session.id);
      if (!party) throw new SocialError('not_in_party', 'You are not in a party.');
      return removeMember(party, session.id);
    },

    /** Leave without error when the hunter is not in a party (disconnect). */
    leaveIfAny(session) {
      const party = partyOf(session.id);
      if (!party) return null;
      return removeMember(party, session.id);
    },

    kick(leader, targetId) {
      const party = partyOf(leader.id);
      if (!party) throw new SocialError('not_in_party', 'You are not in a party.');
      if (party.leader !== leader.id) throw new SocialError('not_leader', 'Only the leader can do that.');
      if (targetId === leader.id) throw new SocialError('self', 'That hunter is you.');
      if (!party.members.some((m) => m.id === targetId)) throw new SocialError('not_found', 'No hunter by that name.');
      return removeMember(party, targetId);
    },

    promote(leader, targetId) {
      const party = partyOf(leader.id);
      if (!party) throw new SocialError('not_in_party', 'You are not in a party.');
      if (party.leader !== leader.id) throw new SocialError('not_leader', 'Only the leader can do that.');
      if (targetId === leader.id) throw new SocialError('already', 'Already done.');
      if (!party.members.some((m) => m.id === targetId)) throw new SocialError('not_found', 'No hunter by that name.');
      party.leader = targetId;
      return party;
    },

    view(party, resolveMember) {
      if (!party) return null;
      return {
        id: party.id,
        leader: party.leader,
        loot: party.loot || 'round_robin',
        loot_turn: party.loot_turn || 0,
        members: party.members.map((m) => {
          const live = resolveMember(m.id);
          return {
            id: m.id,
            user_id: live?.userId || live?.user_id || '',
            name: cleanName(live?.name || 'Hunter'),
            hp: live?.hp ?? 20,
            max_hp: live?.maxHp ?? live?.max_hp ?? 20,
            zone: live?.zone || '',
            online: !!live,
          };
        }),
      };
    },
  };
}
