/** Protocol v1 helpers. See PROTOCOL.md. */

export const PROTOCOL = 1;
export const TICK_HZ = 10;
export const CHAT_MAX = 120;
export const NAME_MAX = 16;
export const MAX_PAYLOAD = 8192;
export const HELLO_MS = 5000;
export const IDLE_MS = 30_000;
export const PING_MS = 15_000;

export const SPEED_MAX = 16;
export const TELEPORT_MAX = 40;
export const WORLD_MIN = -50;
export const WORLD_MAX = 1490;

export const MOVE_PER_SEC = 12;
export const CHAT_PER_SEC = 2;
export const CHAT_PER_10S = 6;

export const ANIM = { idle: 0, attack: 1, roll: 2, dead: 3, stagger: 4, use: 5 };

export const TYPES = {
  hello: 'hello',
  welcome: 'welcome',
  snapshot: 'snapshot',
  delta: 'delta',
  move: 'move',
  chat: 'chat',
  leave: 'leave',
  ping: 'ping',
  pong: 'pong',
  error: 'error',
};

export class ProtocolError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = 'ProtocolError';
  }
}

function clampNum(n, lo, hi, fallback = 0) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(hi, Math.max(lo, v));
}

export function cleanName(raw) {
  return String(raw || 'Hunter').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX) || 'Hunter';
}

export function cleanText(raw) {
  return String(raw || '').replace(/\s+/g, ' ').trim().slice(0, CHAT_MAX);
}

export function animOf(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const n = Math.round(value);
    return n >= 0 && n <= 5 ? n : 0;
  }
  const key = String(value || 'idle').toLowerCase();
  return ANIM[key] ?? 0;
}

export function cleanLook(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.skin == null && raw.hair == null && raw.tunic == null && raw.style == null) return null;
  if (typeof raw.skin === 'number' && raw.skin > 16) {
    return {
      skin: raw.skin,
      hair: raw.hair,
      hairStyle: raw.hairStyle || 'messy',
      tunic: raw.tunic,
      tunicLight: raw.tunicLight,
      beard: !!raw.beard,
      seed: raw.seed,
      resolved: true,
    };
  }
  return {
    skin: clampNum(raw.skin, 0, 8, 1),
    hair: clampNum(raw.hair, 0, 8, 1),
    style: clampNum(raw.style, 0, 8, 0),
    tunic: clampNum(raw.tunic, 0, 8, 0),
    beard: !!raw.beard,
  };
}

export function cleanArmor(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const out = {};
  for (const slot of ['helm', 'chest', 'arms', 'legs', 'boots', 'shield', 'book']) {
    if (typeof raw[slot] === 'string' && raw[slot]) out[slot] = String(raw[slot]).slice(0, 24);
  }
  return out;
}

export function cleanZone(raw) {
  const z = String(raw || 'Oakhollow').replace(/\s+/g, ' ').trim().slice(0, 32);
  return z || 'Oakhollow';
}

export function encode(type, extra = {}) {
  return JSON.stringify({ v: PROTOCOL, type, ...extra });
}

export function parseMessage(raw) {
  if (raw == null) throw new ProtocolError('protocol', 'Empty frame.');
  const text = typeof raw === 'string' ? raw : Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw);
  if (text.length > MAX_PAYLOAD) throw new ProtocolError('protocol', 'Frame too large.');
  let msg;
  try {
    msg = JSON.parse(text);
  } catch {
    throw new ProtocolError('protocol', 'Not JSON.');
  }
  if (!msg || typeof msg !== 'object' || Array.isArray(msg)) throw new ProtocolError('protocol', 'Not an object.');
  if (msg.v !== PROTOCOL) throw new ProtocolError('protocol', `Need protocol ${PROTOCOL}.`);
  if (typeof msg.type !== 'string' || !msg.type) throw new ProtocolError('protocol', 'Missing type.');
  return msg;
}

export function readHello(msg) {
  if (msg.type !== TYPES.hello) throw new ProtocolError('protocol', 'Expected hello.');
  const token = typeof msg.token === 'string' ? msg.token.trim() : '';
  return {
    token: token.slice(0, 4096),
    name: cleanName(msg.name),
    look: cleanLook(msg.look),
    armor: cleanArmor(msg.armor),
  };
}

export function readMove(msg) {
  if (msg.type !== TYPES.move) throw new ProtocolError('protocol', 'Expected move.');
  return {
    x: clampNum(msg.x, WORLD_MIN, WORLD_MAX, 72),
    y: clampNum(msg.y, -20, 80, 3.2),
    z: clampNum(msg.z, WORLD_MIN, WORLD_MAX, 72.5),
    yaw: clampNum(msg.yaw, -Math.PI * 8, Math.PI * 8, 0),
    move: clampNum(msg.move, 0, 1, 0),
    anim: animOf(msg.anim ?? msg.state),
    held: typeof msg.held === 'string' && msg.held ? String(msg.held).slice(0, 24) : 'blade',
    sheath: typeof msg.sheath === 'string' ? String(msg.sheath).slice(0, 24) : null,
    look: cleanLook(msg.look),
    armor: cleanArmor(msg.armor),
    zone: cleanZone(msg.zone),
  };
}

export function readChat(msg) {
  if (msg.type !== TYPES.chat) throw new ProtocolError('protocol', 'Expected chat.');
  const channel = msg.channel === 'zone' ? 'zone' : msg.channel === 'world' ? 'world' : '';
  if (!channel) throw new ProtocolError('chat', 'Channel must be world or zone.');
  const text = cleanText(msg.text);
  if (!text) throw new ProtocolError('chat', 'Empty chat.');
  return { channel, text };
}

export function playerView(p, extra = {}) {
  return {
    id: p.id,
    name: p.name,
    x: p.x,
    y: p.y,
    z: p.z,
    yaw: p.yaw,
    move: p.move,
    anim: p.anim,
    held: p.held,
    sheath: p.sheath,
    look: p.look,
    armor: p.armor,
    zone: p.zone,
    hp: p.hp,
    ...extra,
  };
}

export function errorFrame(code, message) {
  return encode(TYPES.error, { code, message: String(message || code) });
}
