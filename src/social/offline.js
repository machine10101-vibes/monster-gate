/** Solo / GitHub Pages default. UI shows "Online only". */

export class OfflineSocial {
  constructor() {
    this.kind = 'offline';
    this.online = false;
    this.caps = { friends: false, party: false, whisper: false, block: false };
  }

  snapshot() {
    return emptySnapshot('offline');
  }

  async act() {
    return { ok: false, code: 'offline' };
  }

  subscribe() {
    return () => {};
  }

  tick() {}

  dispose() {}
}

export function emptySnapshot(mode = 'offline') {
  return {
    mode,
    online: mode !== 'offline',
    caps: { friends: false, party: false, whisper: false, block: false },
    self: { id: '', name: 'Hunter', user_id: '' },
    friends: [],
    pendingIn: [],
    pendingOut: [],
    blocked: [],
    ignored: [],
    party: null,
    invites: [],
  };
}
