/**
 * Local mock world feed for the presentation layer.
 * Enabled only through attachWorldView() when ?mmo=1&mock=1.
 * Does not open sockets. Nearby hunters walk, chat, and wear distinct gear.
 */

import { STATUS } from './worldView.js';

const HUNTERS = [
  {
    id: 'bram', name: 'Bram', held: 'hammer', sheath: 'hammer',
    look: { skin: 2, hair: 0, style: 1, tunic: 0, beard: true },
    armor: { helm: 'iron', chest: 'iron', arms: 'iron', legs: 'iron', boots: 'iron', shield: 'iron' },
    lines: { world: 'Forge is hot. Bring scales.', zone: 'Oakhollow well, five minutes.' },
  },
  {
    id: 'lira', name: 'Lira', held: 'wand', sheath: 'wand',
    look: { skin: 0, hair: 5, style: 2, tunic: 4, beard: false },
    armor: { helm: 'darkcloth', chest: 'darkcloth', arms: 'darkcloth', legs: 'darkcloth', boots: 'darkcloth', book: 'darkcloth' },
    lines: { world: 'Spirit philters, two gold off.', zone: 'Do not drink the river.' },
  },
  {
    id: 'dalla', name: 'Dalla', held: 'bow', sheath: 'bow',
    look: { skin: 1, hair: 3, style: 0, tunic: 5, beard: false },
    armor: { helm: 'budgeleather', chest: 'budgeleather', arms: 'budgeleather', legs: 'budgeleather', boots: 'budgeleather' },
    lines: { world: 'Anyone selling Budge hide?', zone: 'Pumpkin stall is open.' },
  },
  {
    id: 'rowan', name: 'Rowan', held: 'budgeblade', sheath: 'budgeblade',
    look: { skin: 3, hair: 1, style: 0, tunic: 2, beard: false },
    armor: { helm: 'budgeset', chest: 'budgeset', arms: 'budgeset', legs: 'budgeset', boots: 'budgeset', shield: 'budgeset' },
    lines: { world: 'Gate spawn is light tonight.', zone: 'North road is clear.' },
  },
  {
    id: 'nessa', name: 'Nessa', held: 'darksword', sheath: 'darksword',
    look: { skin: 4, hair: 6, style: 1, tunic: 4, beard: false },
    armor: { helm: 'darksyceset', chest: 'darksyceset', arms: 'darksyceset', legs: 'darksyceset', boots: 'darksyceset' },
    lines: { world: 'Darksycle went back to the den.', zone: 'Watch the east fence.' },
  },
  {
    id: 'pik', name: 'Pik', held: 'axe', sheath: 'axe',
    look: { skin: 2, hair: 4, style: 3, tunic: 3, beard: true },
    armor: { chest: 'yetileather', arms: 'yetileather', legs: 'yetileather', boots: 'yetileather' },
    lines: { world: 'Maple logs at the wood.', zone: 'I am by the birch grove.' },
  },
  {
    id: 'mira', name: 'Mira', held: 'tome', sheath: 'tome',
    look: { skin: 0, hair: 2, style: 2, tunic: 6, beard: false },
    armor: { helm: 'yeticloth', chest: 'yeticloth', arms: 'yeticloth', legs: 'yeticloth', boots: 'yeticloth', book: 'yeticloth' },
    lines: { world: 'Who has a gloom core?', zone: 'Guild steps. Do not be late.' },
  },
];

const WORLD_EXTRA = [
  'Hunters west of town, stay in voice.',
  'A yeti was seen on the north ridge.',
  'Southford cave is open. Bring philters.',
];

function ringPose(i, n, origin, time) {
  const base = (i / n) * Math.PI * 2;
  const walk = time * 0.35 + base;
  const radius = 4.2 + (i % 3) * 0.55;
  const x = origin.x + Math.cos(walk) * radius;
  const z = origin.z + 3.4 + Math.sin(walk) * radius * 0.72;
  const yaw = walk + Math.PI / 2;
  return { x, z, yaw, move: 0.55 + (i % 2) * 0.2 };
}

/**
 * In-memory crowd + chat. Implements the WorldView transport adapter.
 */
export class MockWorld {
  constructor(view, opts = {}) {
    this.view = view;
    this.game = opts.game || view?.game;
    this.handlers = { snapshot: [], delta: [], chat: [], status: [], online: [] };
    this.time = 0;
    this.snapT = 0;
    this.chatT = 1.6;
    this.chatI = 0;
    this.running = false;
    this.status = STATUS.offline;
    this.origin = { x: 72, z: 72.5 };
    this.seq = 1;
    this.online = 24;
  }

  on(event, handler, off = false) {
    const list = this.handlers[event];
    if (!list || typeof handler !== 'function') return;
    if (off) {
      const i = list.indexOf(handler);
      if (i >= 0) list.splice(i, 1);
      return;
    }
    list.push(handler);
  }

  fire(event, ...args) {
    for (const fn of this.handlers[event] || []) fn(...args);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.pinned = false;
    this.setStatus(STATUS.connecting, 'Mock world');
    this._boot = setTimeout(() => {
      if (!this.running) return;
      this.setStatus(STATUS.online, 'Mock world');
      this.fire('online', this.online);
      this.pushSnapshot();
      this.say('world', { id: 'herald', name: 'Herald' }, 'Seven hunters are already in Oakhollow.');
    }, 280);
  }

  stop() {
    this.running = false;
    clearTimeout(this._boot);
    this.setStatus(STATUS.offline, 'Mock world closed');
  }

  reconnect() {
    if (!this.running) this.start();
    this.setStatus(STATUS.reconnecting, 'Mock world');
    clearTimeout(this._retry);
    this._retry = setTimeout(() => {
      if (!this.running) return;
      this.setStatus(STATUS.online, 'Mock world');
      this.pushSnapshot();
    }, 420);
  }

  setStatus(status, detail) {
    this.status = status;
    this.fire('status', { status, detail });
  }

  send(intent) {
    if (!intent || !this.running) return;
    if (intent.type === 'chat') {
      const name = this.game?.character?.name || this.game?.net?.name || 'You';
      this.say(intent.channel === 'zone' ? 'zone' : 'world', { id: 'you', name }, intent.text);
    }
    if (intent.type === 'reconnect') this.reconnect();
  }

  update(dt) {
    if (!this.running || this.status === STATUS.offline) return;
    this.time += dt;
    this.snapT -= dt;
    if (this.snapT <= 0) {
      this.snapT = 0.1;
      this.pushSnapshot();
    }
    this.chatT -= dt;
    if (this.chatT <= 0) {
      this.chatT = 3.8 + (this.chatI % 3) * 0.7;
      this.tickChat();
    }
  }

  originFromGame() {
    const p = this.game?.player?.pos;
    if (p && !this.pinned) {
      this.origin.x = p.x;
      this.origin.z = p.z;
      this.pinned = true;
    }
    return this.origin;
  }

  players() {
    const origin = this.originFromGame();
    const y = this.game?.world?.heightAt?.(origin.x, origin.z) ?? 3;
    const zone = this.game?.world?.realm === 'cave' ? 'cave' : String(this.game?.zone || 'Oakhollow');
    return HUNTERS.map((h, i) => {
      const pose = ringPose(i, HUNTERS.length, origin, this.time);
      const hy = this.game?.world?.heightAt?.(pose.x, pose.z) ?? y;
      return {
        id: h.id,
        name: h.name,
        x: pose.x,
        y: hy,
        z: pose.z,
        yaw: pose.yaw,
        move: pose.move,
        anim: 0,
        held: h.held,
        sheath: h.sheath,
        look: h.look,
        armor: h.armor,
        zone,
        hp: 20,
      };
    });
  }

  pushSnapshot() {
    const players = this.players();
    const meta = { online: this.online, zone: players[0]?.zone || 'Oakhollow' };
    this.fire('snapshot', players, meta);
  }

  tickChat() {
    const i = this.chatI++;
    if (i % 3 === 2) {
      this.say('world', { id: 'herald', name: 'Herald' }, WORLD_EXTRA[i % WORLD_EXTRA.length]);
      return;
    }
    const h = HUNTERS[i % HUNTERS.length];
    const channel = i % 3 === 0 ? 'world' : 'zone';
    this.say(channel, { id: h.id, name: h.name }, h.lines[channel]);
  }

  say(channel, from, text) {
    const zone = String(this.game?.zone || 'Oakhollow');
    const event = {
      id: 'c' + (this.seq++),
      channel,
      from,
      text,
      at: Date.now(),
      zone: channel === 'zone' ? zone : '',
    };
    this.fire('chat', event);
  }
}

export { HUNTERS };
