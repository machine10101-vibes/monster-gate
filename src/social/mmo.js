import { ERRORS, SOCIAL_INBOUND, SOCIAL_PROTOCOL, cleanHunterName, errorMessage } from './constants.js';
import { emptySnapshot } from './offline.js';

const METHOD = {
  friend_request: 'friendRequest',
  friend_accept: 'friendAccept',
  friend_decline: 'friendDecline',
  friend_remove: 'friendRemove',
  friend_list: 'friendList',
  block: 'blockPlayer',
  unblock: 'unblockPlayer',
  ignore: 'ignorePlayer',
  unignore: 'unignorePlayer',
  party_invite: 'partyInvite',
  party_accept: 'partyAccept',
  party_decline: 'partyDecline',
  party_leave: 'partyLeave',
  party_kick: 'partyKick',
  party_promote: 'partyPromote',
  whisper: 'sendWhisper',
};

/**
 * Live adapter. Wraps game.mmo (src/net/mmo.js) without editing that file.
 * Feature-detects methods, welcome.features, and inbound social frames.
 */
export class MmoSocial {
  constructor(opts = {}) {
    this.kind = 'mmo';
    this.game = opts.game || null;
    this.client = opts.client || opts.game?.mmo || null;
    this.online = false;
    this.caps = { friends: false, party: false, whisper: false, block: false };
    this.state = emptySnapshot('mmo');
    this.state.mode = 'mmo';
    this.listeners = new Set();
    this.unhooks = [];
    this.poll = 0;
    this.hooked = null;
    if (this.client) this.bind(this.client);
    else this.poll = setInterval(() => this.probe(), 250);
  }

  probe() {
    const client = this.game?.mmo;
    if (client && client !== this.hooked) this.bind(client);
  }

  bind(client) {
    if (!client || this.hooked === client) return;
    this.unbind();
    this.client = client;
    this.hooked = client;
    this.detectFromClient(client);

    if (typeof client.onFrame === 'function') {
      const orig = client.onFrame.bind(client);
      client.onFrame = (raw) => {
        orig(raw);
        this.onFrame(raw);
      };
      this.unhooks.push(() => { if (this.hooked === client) client.onFrame = orig; });
    }

    const onMsg = (ev) => this.onFrame(ev?.data);
    const hookWs = (ws) => {
      if (!ws || ws.__mgSocial) return;
      ws.__mgSocial = true;
      ws.addEventListener?.('message', onMsg);
      this.unhooks.push(() => {
        try { ws.removeEventListener?.('message', onMsg); } catch { /* closed */ }
      });
    };
    if (client.ws) hookWs(client.ws);
    if (typeof client.connect === 'function') {
      const origConnect = client.connect.bind(client);
      client.connect = (...args) => {
        origConnect(...args);
        if (client.ws) hookWs(client.ws);
      };
      this.unhooks.push(() => { if (this.hooked === client) client.connect = origConnect; });
    }

    if (client.you) this.applyYou(client.you);
    this.emit('bind');
  }

  unbind() {
    for (const off of this.unhooks) {
      try { off(); } catch { /* already gone */ }
    }
    this.unhooks = [];
    this.hooked = null;
  }

  detectFromClient(client) {
    const caps = { ...this.caps };
    if (typeof client.friendRequest === 'function' || typeof client.friendList === 'function') caps.friends = true;
    if (typeof client.partyInvite === 'function' || typeof client.partyLeave === 'function') caps.party = true;
    if (typeof client.sendWhisper === 'function') caps.whisper = true;
    if (typeof client.blockPlayer === 'function') caps.block = true;
    const feats = client.features || client.you?.features;
    applyFeatures(caps, feats);
    this.caps = caps;
    this.state.caps = { ...caps };
  }

  applyYou(you) {
    if (!you || typeof you !== 'object') return;
    this.state.self = {
      id: String(you.id || this.state.self.id || ''),
      name: cleanHunterName(you.name) || this.state.self.name || 'Hunter',
      user_id: String(you.user_id || you.userId || ''),
    };
    this.online = !you.guest || this.caps.party;
    this.state.online = true;
  }

  onFrame(raw) {
    let msg = raw;
    if (typeof raw === 'string') {
      try { msg = JSON.parse(raw); } catch { return; }
    }
    if (!msg || typeof msg !== 'object') return;
    if (msg.v != null && msg.v !== SOCIAL_PROTOCOL) return;
    const type = String(msg.type || '');
    if (type === 'welcome') {
      applyFeatures(this.caps, msg.features || msg.you?.features);
      this.state.caps = { ...this.caps };
      this.applyYou(msg.you);
      this.state.online = true;
      this.online = true;
      this.emit('welcome');
      return;
    }
    if (type === 'error' && msg.code) {
      this.emit('error', { code: msg.code, message: msg.message });
      return;
    }
    if (!SOCIAL_INBOUND.has(type) && type !== 'chat') return;
    if (SOCIAL_INBOUND.has(type)) this.enableFromType(type);
    if (type === 'friend_list') this.applyFriendList(msg);
    else if (type === 'friend_presence') this.applyPresence(msg);
    else if (type === 'friend_request') this.applyIncomingFriend(msg);
    else if (type === 'party_invite') this.applyIncomingParty(msg);
    else if (type === 'party_state') this.applyParty(msg.party);
    else if (type === 'chat' && msg.channel === 'whisper') this.emit('whisper', msg);
    else if (type === 'whisper') this.emit('whisper', msg);
    else this.emit(type, msg);
  }

  enableFromType(type) {
    if (type.startsWith('friend')) this.caps.friends = true;
    if (type.startsWith('party')) this.caps.party = true;
    if (type === 'whisper') this.caps.whisper = true;
    this.state.caps = { ...this.caps };
  }

  applyFriendList(msg) {
    this.state.friends = asList(msg.friends);
    this.state.pendingIn = asList(msg.pending_in || msg.pendingIn);
    this.state.pendingOut = asList(msg.pending_out || msg.pendingOut);
    this.state.blocked = asList(msg.blocked);
    this.state.ignored = asList(msg.ignored);
    this.emit('friend_list');
  }

  applyPresence(msg) {
    const id = msg.user_id || msg.id;
    const row = this.state.friends.find((f) => f.user_id === id || f.id === msg.id);
    if (row) {
      row.presence = msg.presence === 'offline' ? 'offline' : 'online';
      row.zone = row.presence === 'online' ? String(msg.zone || '') : '';
      if (msg.name) row.name = cleanHunterName(msg.name) || row.name;
      if (msg.id) row.id = String(msg.id);
    }
    this.emit('friend_presence');
  }

  applyIncomingFriend(msg) {
    const from = msg.from || msg;
    const row = {
      id: String(from.id || from.user_id || ''),
      user_id: String(from.user_id || from.id || ''),
      name: cleanHunterName(from.name) || 'Hunter',
      presence: 'offline',
      zone: '',
    };
    if (!this.state.pendingIn.some((p) => p.user_id === row.user_id || p.name === row.name)) {
      this.state.pendingIn = [...this.state.pendingIn, row];
    }
    this.emit('friend_request', { from: row });
  }

  applyIncomingParty(msg) {
    const invite = {
      invite_id: String(msg.invite_id || msg.id || ''),
      from: {
        id: String(msg.from?.id || ''),
        name: cleanHunterName(msg.from?.name) || 'Hunter',
      },
      expires_at: Number(msg.expires_at) || (Date.now() + 60_000),
      kind: 'party',
    };
    this.state.invites = [...this.state.invites.filter((i) => i.from.id !== invite.from.id), invite];
    this.emit('party_invite', { invite });
  }

  applyParty(party) {
    this.state.party = party && typeof party === 'object' ? party : null;
    this.emit('party_state');
  }

  snapshot() {
    return {
      ...this.state,
      mode: 'mmo',
      online: this.online,
      caps: { ...this.caps },
      friends: [...this.state.friends],
      pendingIn: [...this.state.pendingIn],
      pendingOut: [...this.state.pendingOut],
      blocked: [...this.state.blocked],
      ignored: [...this.state.ignored],
      invites: [...this.state.invites],
      party: this.state.party,
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
  }

  canSend(type) {
    if (type.startsWith('friend') || type === 'block' || type === 'unblock' || type === 'ignore') return this.caps.friends || this.caps.block;
    if (type.startsWith('party')) return this.caps.party;
    if (type === 'whisper') return this.caps.whisper;
    return false;
  }

  async act(name, a, b) {
    if (!this.canSend(name)) {
      return { ok: false, code: ERRORS.offline, message: 'The world server does not have this yet.' };
    }
    const client = this.client || this.game?.mmo;
    if (!client) return { ok: false, code: ERRORS.offline, message: 'Not connected.' };
    const method = METHOD[name];
    try {
      if (method && typeof client[method] === 'function') {
        const res = name === 'whisper' ? client[method](a, b) : client[method](a);
        return await Promise.resolve(res ?? { ok: true });
      }
      if (typeof client.send === 'function') {
        const payload = payloadOf(name, a, b);
        client.send(name, payload);
        return { ok: true };
      }
      if (client.ws && client.ws.readyState === 1) {
        const extra = payloadOf(name, a, b);
        client.ws.send(JSON.stringify({ v: SOCIAL_PROTOCOL, type: name, ...extra }));
        return { ok: true };
      }
    } catch (err) {
      return { ok: false, code: err?.code || ERRORS.protocol, message: err?.message || errorMessage(err?.code) };
    }
    return { ok: false, code: ERRORS.offline, message: 'The world server does not have this yet.' };
  }

  tick() {
    this.probe();
    const now = Date.now();
    const keep = this.state.invites.filter((i) => now <= i.expires_at);
    if (keep.length !== this.state.invites.length) {
      this.state.invites = keep;
      this.emit('invite_expired');
    }
  }

  dispose() {
    clearInterval(this.poll);
    this.unbind();
    this.listeners.clear();
  }
}

function applyFeatures(caps, feats) {
  const list = Array.isArray(feats) ? feats : feats && typeof feats === 'object' ? Object.keys(feats).filter((k) => feats[k]) : [];
  for (const f of list) {
    const key = String(f).toLowerCase();
    if (key === 'friends' || key === 'friend') caps.friends = true;
    if (key === 'party') caps.party = true;
    if (key === 'whisper') caps.whisper = true;
    if (key === 'block' || key === 'ignore') caps.block = true;
  }
}

function asList(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => ({
    id: String(r.id || r.user_id || ''),
    user_id: String(r.user_id || r.id || ''),
    name: cleanHunterName(r.name) || 'Hunter',
    presence: r.presence === 'offline' || r.online === false ? 'offline' : 'online',
    zone: r.presence === 'offline' ? '' : String(r.zone || ''),
  }));
}

function payloadOf(type, a, b) {
  if (type === 'friend_request') return { name: cleanHunterName(a) };
  if (type === 'whisper') return { to: a, text: b };
  if (type === 'party_invite') return typeof a === 'string' && a.length <= 16 && !a.includes('_') ? { name: a } : { id: a };
  if (type === 'party_accept' || type === 'party_decline') return { invite_id: a };
  if (type === 'party_leave' || type === 'friend_list') return {};
  return { id: a, user_id: a };
}

export { METHOD as MMO_SOCIAL_METHODS };
