import {
  BLOCK_CAP, ERRORS, FRIENDS_CAP, INVITE_TTL_MS, LOOT_MODE, MAX_PARTY,
  PRESENCE, cleanHunterName, errorMessage,
} from './constants.js';
import { emptySnapshot } from './offline.js';

const SEED = [
  { id: 'u_bram', name: 'Bram', zone: 'Oakhollow', presence: PRESENCE.online, friend: true, aliases: ['bram', 'wv:bram'] },
  { id: 'u_lira', name: 'Lira', zone: 'Southford', presence: PRESENCE.online, friend: true, aliases: ['lira', 'wv:lira'] },
  { id: 'u_dalla', name: 'Dalla', zone: '', presence: PRESENCE.offline, friend: true, aliases: ['dalla', 'wv:dalla'] },
  { id: 'u_rowan', name: 'Rowan', zone: 'Greyrock Pit', presence: PRESENCE.online, incoming: true, aliases: ['rowan', 'wv:rowan'] },
  { id: 'u_mira', name: 'Mira', zone: 'Oakhollow', presence: PRESENCE.online, outgoing: true, aliases: ['mira', 'wv:mira'] },
  { id: 'u_nessa', name: 'Nessa', zone: 'Whispering Wood', presence: PRESENCE.online, aliases: ['nessa', 'wv:nessa'] },
  { id: 'u_pik', name: 'Pik', zone: 'Mirrormere', presence: PRESENCE.online, aliases: ['pik', 'wv:pik'] },
];

let inviteSeq = 1;
let partySeq = 1;

export const MOCK_PLAYERS = SEED.map((p) => ({ ...p }));

/**
 * In-process friends + party. Enabled with ?mmo=1&mocksocial=1.
 * Clock and auto-events are injectable for tests.
 */
export class MockSocial {
  constructor(opts = {}) {
    this.kind = 'mock';
    this.online = true;
    this.caps = { friends: true, party: true, whisper: true, block: true };
    this.now = opts.now || (() => Date.now());
    this.ttl = opts.ttl ?? INVITE_TTL_MS;
    this.autoInvite = opts.autoInvite !== false;
    this.autoPresence = opts.autoPresence !== false;
    this.inviteAt = opts.inviteAt ?? 1600;
    this.presenceAt = opts.presenceAt ?? 8000;
    this.self = {
      id: opts.self?.id || 'u_you',
      name: cleanHunterName(opts.self?.name || 'Hunter') || 'Hunter',
      user_id: opts.self?.user_id || 'user_you',
      hp: 20,
      max_hp: 20,
      zone: opts.self?.zone || 'Oakhollow',
      online: true,
    };
    this.people = new Map();
    for (const row of (opts.players || SEED)) {
      this.people.set(row.id, clonePerson(row));
    }
    this.friends = new Set();
    this.pendingIn = new Set();
    this.pendingOut = new Set();
    this.blocked = new Set();
    this.ignored = new Set();
    this.party = null;
    this.invites = [];
    this.whispers = [];
    this.listeners = new Set();
    this.elapsed = 0;
    this.huntAt = null;
    this.didInvite = false;
    this.didPresence = false;
    this.lootTurn = 0;
    for (const p of this.people.values()) {
      if (p.friend) this.friends.add(p.id);
      if (p.incoming) this.pendingIn.add(p.id);
      if (p.outgoing) this.pendingOut.add(p.id);
    }
  }

  snapshot() {
    const friends = [...this.friends].map((id) => publicPerson(this.people.get(id))).filter(Boolean);
    friends.sort(onlineFirst);
    return {
      mode: 'mock',
      online: true,
      caps: { ...this.caps },
      self: { ...this.self },
      friends,
      pendingIn: [...this.pendingIn].map((id) => publicPerson(this.people.get(id))).filter(Boolean),
      pendingOut: [...this.pendingOut].map((id) => publicPerson(this.people.get(id))).filter(Boolean),
      blocked: [...this.blocked].map((id) => publicPerson(this.people.get(id))).filter(Boolean),
      ignored: [...this.ignored].map((id) => publicPerson(this.people.get(id))).filter(Boolean),
      party: this.party ? cloneParty(this.party) : null,
      invites: this.invites.map((inv) => ({ ...inv, from: { ...inv.from } })),
    };
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(type, extra = {}) {
    const snap = this.snapshot();
    for (const fn of [...this.listeners]) {
      try { fn(snap, { type, ...extra }); } catch { /* listener */ }
    }
    return snap;
  }

  fail(code, message) {
    return { ok: false, code, message: message || errorMessage(code) };
  }

  resolve(ref) {
    const raw = String(ref || '').trim();
    if (!raw) return null;
    const lower = raw.toLowerCase();
    if (this.self.id === raw || this.self.user_id === raw || String(this.self.name).toLowerCase() === lower) {
      return { ...this.self, presence: PRESENCE.online };
    }
    for (const p of this.people.values()) {
      if (p.id === raw || p.user_id === raw) return p;
      if (String(p.name).toLowerCase() === lower) return p;
      if ((p.aliases || []).some((a) => String(a).toLowerCase() === lower)) return p;
    }
    return null;
  }

  memberCount() {
    return this.party?.members?.length || 0;
  }

  isLeader() {
    return !!this.party && this.party.leader === this.self.id;
  }

  inParty(id) {
    return !!this.party?.members?.some((m) => m.id === id);
  }

  async act(name, a, b) {
    switch (name) {
      case 'friend_request': return this.friendRequest(a);
      case 'friend_accept': return this.friendAccept(a);
      case 'friend_decline': return this.friendDecline(a);
      case 'friend_remove': return this.friendRemove(a);
      case 'block': return this.block(a);
      case 'unblock': return this.unblock(a);
      case 'ignore': return this.ignore(a);
      case 'party_invite': return this.partyInvite(a);
      case 'party_accept': return this.partyAccept(a);
      case 'party_decline': return this.partyDecline(a);
      case 'party_leave': return this.partyLeave();
      case 'party_kick': return this.partyKick(a);
      case 'party_promote': return this.partyPromote(a);
      case 'whisper': return this.whisper(a, b);
      case 'friend_list':
        this.emit('friend_list');
        return { ok: true };
      default:
        return this.fail(ERRORS.protocol);
    }
  }

  friendRequest(raw) {
    const name = cleanHunterName(raw);
    if (!name) return this.fail(ERRORS.name);
    const p = this.resolve(name);
    if (!p) return this.fail(ERRORS.not_found);
    if (p.id === this.self.id) return this.fail(ERRORS.self);
    if (this.blocked.has(p.id)) return this.fail(ERRORS.blocked);
    if (this.friends.has(p.id)) return this.fail(ERRORS.already);
    if (this.pendingOut.has(p.id) || this.pendingIn.has(p.id)) return this.fail(ERRORS.pending);
    if (this.friends.size >= FRIENDS_CAP) return this.fail(ERRORS.full, 'Friends list is full (100).');
    this.pendingOut.add(p.id);
    this.emit('friend_request', { to: p.id });
    return { ok: true };
  }

  friendAccept(ref) {
    const p = this.resolve(ref);
    if (!p || !this.pendingIn.has(p.id)) return this.fail(ERRORS.not_found);
    if (this.friends.size >= FRIENDS_CAP) return this.fail(ERRORS.full, 'Friends list is full (100).');
    this.pendingIn.delete(p.id);
    this.pendingOut.delete(p.id);
    this.friends.add(p.id);
    this.emit('friend_accept', { user_id: p.id });
    return { ok: true };
  }

  friendDecline(ref) {
    const p = this.resolve(ref);
    if (!p || !this.pendingIn.has(p.id)) return this.fail(ERRORS.not_found);
    this.pendingIn.delete(p.id);
    this.emit('friend_decline', { user_id: p.id });
    return { ok: true };
  }

  friendRemove(ref) {
    const p = this.resolve(ref);
    if (!p || !this.friends.has(p.id)) return this.fail(ERRORS.not_found);
    this.friends.delete(p.id);
    this.emit('friend_remove', { user_id: p.id });
    return { ok: true };
  }

  block(ref) {
    const p = this.resolve(ref);
    if (!p) return this.fail(ERRORS.not_found);
    if (p.id === this.self.id) return this.fail(ERRORS.self);
    if (this.blocked.size >= BLOCK_CAP && !this.blocked.has(p.id)) return this.fail(ERRORS.full);
    this.friends.delete(p.id);
    this.pendingIn.delete(p.id);
    this.pendingOut.delete(p.id);
    this.blocked.add(p.id);
    this.ignored.delete(p.id);
    this.emit('block', { user_id: p.id });
    return { ok: true };
  }

  unblock(ref) {
    const p = this.resolve(ref);
    if (!p || !this.blocked.has(p.id)) return this.fail(ERRORS.not_found);
    this.blocked.delete(p.id);
    this.emit('unblock', { user_id: p.id });
    return { ok: true };
  }

  ignore(ref) {
    const p = this.resolve(ref);
    if (!p) return this.fail(ERRORS.not_found);
    if (p.id === this.self.id) return this.fail(ERRORS.self);
    this.ignored.add(p.id);
    this.emit('ignore', { user_id: p.id });
    return { ok: true };
  }

  partyInvite(ref) {
    const p = this.resolve(ref);
    if (!p) return this.fail(ERRORS.not_found);
    if (p.id === this.self.id) return this.fail(ERRORS.self);
    if (this.blocked.has(p.id) || this.ignored.has(p.id)) return this.fail(ERRORS.blocked);
    if (p.presence !== PRESENCE.online) return this.fail(ERRORS.offline);
    if (this.party && !this.isLeader()) return this.fail(ERRORS.not_leader);
    const size = this.memberCount() || 1;
    if (size >= MAX_PARTY) return this.fail(ERRORS.full, 'Party is full (4).');
    if (this.inParty(p.id)) return this.fail(ERRORS.already);
    if (!this.party) this.ensureParty();
    if (this.party.members.length >= MAX_PARTY) return this.fail(ERRORS.full, 'Party is full (4).');
    this.addMember(p);
    this.emit('party_state');
    return { ok: true, party: cloneParty(this.party) };
  }

  /** Incoming invite from another hunter (UI + tests). */
  receiveInvite(fromRef, opts = {}) {
    const p = this.resolve(fromRef) || fromRef;
    const from = p?.id
      ? { id: p.id, name: p.name }
      : { id: fromRef?.id || 'u_guest', name: cleanHunterName(fromRef?.name || fromRef) || 'Hunter' };
    const invite = {
      invite_id: opts.invite_id || `pinv_${inviteSeq++}`,
      from,
      expires_at: opts.expires_at ?? (this.now() + this.ttl),
      kind: opts.kind || 'party',
    };
    this.invites = this.invites.filter((i) => i.from.id !== from.id || i.kind !== invite.kind);
    this.invites.push(invite);
    this.emit(invite.kind === 'friend' ? 'friend_request' : 'party_invite', { invite });
    return invite;
  }

  partyAccept(inviteId) {
    this.expireInvites();
    const inv = this.invites.find((i) => i.invite_id === inviteId);
    if (!inv) return this.fail(ERRORS.expired);
    if (this.now() > inv.expires_at) {
      this.invites = this.invites.filter((i) => i !== inv);
      return this.fail(ERRORS.expired);
    }
    if (this.party) return this.fail(ERRORS.in_party);
    const leader = this.resolve(inv.from.id) || { ...inv.from, presence: PRESENCE.online, zone: 'Oakhollow', hp: 18, max_hp: 20 };
    this.party = {
      id: `pty_${partySeq++}`,
      leader: leader.id,
      loot: LOOT_MODE.roundRobin,
      loot_turn: 0,
      members: [
        asMember(leader),
        asMember(this.self),
      ],
    };
    this.invites = this.invites.filter((i) => i.invite_id !== inviteId);
    this.emit('party_state');
    return { ok: true, party: cloneParty(this.party) };
  }

  partyDecline(inviteId) {
    const before = this.invites.length;
    this.invites = this.invites.filter((i) => i.invite_id !== inviteId);
    if (this.invites.length === before) return this.fail(ERRORS.not_found);
    this.emit('party_decline');
    return { ok: true };
  }

  partyLeave() {
    if (!this.party) return this.fail(ERRORS.not_in_party);
    this.party.members = this.party.members.filter((m) => m.id !== this.self.id);
    if (this.party.members.length < 2) this.party = null;
    else if (this.party.leader === this.self.id) this.party.leader = this.party.members[0].id;
    this.emit('party_state');
    return { ok: true };
  }

  partyKick(ref) {
    if (!this.party) return this.fail(ERRORS.not_in_party);
    if (!this.isLeader()) return this.fail(ERRORS.not_leader);
    const p = this.resolve(ref);
    if (!p || !this.inParty(p.id)) return this.fail(ERRORS.not_found);
    if (p.id === this.self.id) return this.fail(ERRORS.self);
    this.party.members = this.party.members.filter((m) => m.id !== p.id);
    if (this.party.members.length < 2) this.party = null;
    this.emit('party_state');
    return { ok: true };
  }

  partyPromote(ref) {
    if (!this.party) return this.fail(ERRORS.not_in_party);
    if (!this.isLeader()) return this.fail(ERRORS.not_leader);
    const p = this.resolve(ref);
    if (!p || !this.inParty(p.id)) return this.fail(ERRORS.not_found);
    this.party.leader = p.id;
    this.emit('party_state');
    return { ok: true };
  }

  whisper(ref, text) {
    const p = this.resolve(ref);
    if (!p) return this.fail(ERRORS.not_found);
    if (p.presence !== PRESENCE.online) return this.fail(ERRORS.offline);
    if (this.blocked.has(p.id)) return this.fail(ERRORS.blocked);
    const msg = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 120);
    if (!msg) return this.fail(ERRORS.name, 'Say something.');
    const row = { to: p.id, name: p.name, text: msg, at: this.now() };
    this.whispers.push(row);
    this.emit('whisper', row);
    return { ok: true };
  }

  ensureParty() {
    if (this.party) return this.party;
    this.party = {
      id: `pty_${partySeq++}`,
      leader: this.self.id,
      loot: LOOT_MODE.roundRobin,
      loot_turn: this.lootTurn,
      members: [asMember(this.self)],
    };
    return this.party;
  }

  addMember(p) {
    this.ensureParty();
    if (this.inParty(p.id)) return;
    if (this.party.members.length >= MAX_PARTY) return;
    this.party.members.push(asMember(p));
  }

  /** Fill the party to `n` members using seed hunters. Tests use this for the size cap. */
  fillParty(n) {
    this.ensureParty();
    for (const p of this.people.values()) {
      if (this.party.members.length >= Math.min(MAX_PARTY, n)) break;
      if (p.presence !== PRESENCE.online) continue;
      this.addMember(p);
    }
    this.emit('party_state');
    return this.party;
  }

  setPresence(ref, presence, zone = '') {
    const p = this.resolve(ref);
    if (!p) return null;
    p.presence = presence === PRESENCE.offline ? PRESENCE.offline : PRESENCE.online;
    p.zone = p.presence === PRESENCE.online ? (zone || p.zone || 'Oakhollow') : '';
    this.emit('friend_presence', { user_id: p.id });
    return p;
  }

  expireInvites(now = this.now()) {
    const keep = this.invites.filter((i) => now <= i.expires_at);
    if (keep.length !== this.invites.length) {
      this.invites = keep;
      this.emit('invite_expired');
    }
  }

  tick(dt = 0, now) {
    const t = now != null ? now : this.now();
    if (this.huntAt == null) this.huntAt = t;
    this.elapsed = Math.max(this.elapsed, (t - this.huntAt) / 1000);
    this.expireInvites(t);
    if (this.party) {
      for (const m of this.party.members) {
        if (m.id === this.self.id) {
          m.zone = this.self.zone;
          continue;
        }
        const p = this.people.get(m.id);
        if (p) {
          m.zone = p.zone;
          m.online = p.presence === PRESENCE.online;
          m.hp = p.hp ?? m.hp;
        }
      }
    }
    const ms = t - this.huntAt;
    if (this.autoInvite && !this.didInvite && ms >= this.inviteAt) {
      this.didInvite = true;
      if (!this.party) this.receiveInvite('Nessa');
    }
    if (this.autoPresence && !this.didPresence && ms >= this.presenceAt) {
      this.didPresence = true;
      this.setPresence('Bram', PRESENCE.online, 'Greyrock Pit');
    }
  }

  dispose() {
    this.listeners.clear();
  }
}

function clonePerson(row) {
  return {
    id: row.id,
    user_id: row.user_id || row.id,
    name: row.name,
    zone: row.zone || '',
    presence: row.presence || PRESENCE.offline,
    hp: row.hp ?? 16 + ((row.name?.length || 0) % 5),
    max_hp: row.max_hp ?? 20,
    aliases: [...(row.aliases || [])],
    friend: !!row.friend,
    incoming: !!row.incoming,
    outgoing: !!row.outgoing,
  };
}

function publicPerson(p) {
  if (!p) return null;
  return {
    id: p.id,
    user_id: p.user_id || p.id,
    name: p.name,
    presence: p.presence,
    zone: p.presence === PRESENCE.online ? p.zone : '',
    aliases: [...(p.aliases || [])],
  };
}

function asMember(p) {
  return {
    id: p.id,
    user_id: p.user_id || p.id,
    name: p.name,
    hp: p.hp ?? 20,
    max_hp: p.max_hp ?? 20,
    zone: p.zone || '',
    online: p.online !== false && p.presence !== PRESENCE.offline,
    aliases: [...(p.aliases || [])],
  };
}

function cloneParty(party) {
  return {
    id: party.id,
    leader: party.leader,
    loot: party.loot,
    loot_turn: party.loot_turn | 0,
    members: party.members.map((m) => ({ ...m, aliases: [...(m.aliases || [])] })),
  };
}

function onlineFirst(a, b) {
  const ao = a.presence === PRESENCE.online ? 0 : 1;
  const bo = b.presence === PRESENCE.online ? 0 : 1;
  if (ao !== bo) return ao - bo;
  return String(a.name).localeCompare(String(b.name));
}

export function resetMockIds() {
  inviteSeq = 1;
  partySeq = 1;
}
