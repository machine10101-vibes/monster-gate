import { errorMessage, ERRORS } from './constants.js';
import { emptySnapshot } from './offline.js';

/**
 * UI-facing social store. The HUD never talks to mmo.js or the mock directly.
 */
export class SocialSession {
  constructor(game, backend, flags = {}) {
    this.game = game;
    this.backend = backend;
    this.flags = flags;
    this.mode = backend?.kind || (flags.offline ? 'offline' : flags.mock ? 'mock' : flags.live ? 'mmo' : 'offline');
    this.listeners = new Set();
    this.state = emptySnapshot(this.mode);
    this.unsub = backend?.subscribe?.((snap, evt) => this.apply(snap, evt)) || (() => {});
    this.apply(backend?.snapshot?.() || this.state);
  }

  get online() {
    return this.mode !== 'offline' && !!this.state.online;
  }

  get caps() {
    return this.state.caps || { friends: false, party: false, whisper: false, block: false };
  }

  get party() {
    return this.state.party || null;
  }

  get friends() {
    return this.state.friends || [];
  }

  get invites() {
    return this.state.invites || [];
  }

  isPartyMember(id, name) {
    const party = this.party;
    if (!party?.members?.length) return false;
    const sid = String(id || '');
    const nm = String(name || '').toLowerCase();
    return party.members.some((m) => (
      m.id === sid
      || (m.user_id && m.user_id === sid)
      || (nm && String(m.name || '').toLowerCase() === nm)
      || aliasesOf(m).includes(sid)
    ));
  }

  snapshot() {
    return this.state;
  }

  subscribe(fn) {
    this.listeners.add(fn);
    try { fn(this.state, { type: 'snapshot' }); } catch { /* listener */ }
    return () => this.listeners.delete(fn);
  }

  apply(snap, evt = { type: 'snapshot' }) {
    if (snap && typeof snap === 'object') this.state = snap;
    for (const fn of [...this.listeners]) {
      try { fn(this.state, evt); } catch { /* listener */ }
    }
    return this.state;
  }

  async run(name, ...args) {
    if (this.mode === 'offline' || !this.backend?.act) {
      return fail(ERRORS.offline, 'Friends and parties are Online only.');
    }
    try {
      const res = await this.backend.act(name, ...args);
      const snap = this.backend.snapshot?.();
      if (snap) this.apply(snap, { type: name, result: res });
      return res && typeof res === 'object' ? res : { ok: true };
    } catch (err) {
      const code = err?.code || 'protocol';
      return fail(code, err?.message || errorMessage(code));
    }
  }

  requestFriend(name) { return this.run('friend_request', name); }
  acceptFriend(id) { return this.run('friend_accept', id); }
  declineFriend(id) { return this.run('friend_decline', id); }
  removeFriend(id) { return this.run('friend_remove', id); }
  blockPlayer(id) { return this.run('block', id); }
  unblockPlayer(id) { return this.run('unblock', id); }
  ignorePlayer(id) { return this.run('ignore', id); }
  inviteToParty(id) { return this.run('party_invite', id); }
  acceptParty(inviteId) { return this.run('party_accept', inviteId); }
  declineParty(inviteId) { return this.run('party_decline', inviteId); }
  leaveParty() { return this.run('party_leave'); }
  kick(id) { return this.run('party_kick', id); }
  promote(id) { return this.run('party_promote', id); }
  whisper(id, text) { return this.run('whisper', id, text); }
  refresh() { return this.run('friend_list'); }

  tick(dt, now) {
    this.backend?.tick?.(dt, now);
  }

  dispose() {
    this.unsub?.();
    this.unsub = null;
    this.listeners.clear();
    this.backend?.dispose?.();
  }
}

function aliasesOf(m) {
  return Array.isArray(m.aliases) ? m.aliases.map(String) : [];
}

function fail(code, message) {
  return { ok: false, code, message: message || errorMessage(code) };
}
