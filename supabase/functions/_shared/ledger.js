/**
 * Guild ledger. Turns hunter_accounts and hunters rows into the numbers
 * the guild master reads. The password is never part of this record.
 * Guest hunts stay on the device and never arrive here.
 */

export const ADMIN_EMAIL = 'monstergateonline@gmail.com';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_LEVEL = 99;
const DAY = 86_400_000;
const CAP = 1_000_000_000;

export const CLASS_DEFS = {
  warrior: { name: 'Warrior', color: '#e23b3b' },
  ranger: { name: 'Ranger', color: '#7dce4a' },
  mage: { name: 'Mage', color: '#4aa0ff' },
};

export const SKILL_DEFS = [
  ['strength', 'Strength'],
  ['agility', 'Agility'],
  ['stamina', 'Stamina'],
  ['mining', 'Mining'],
  ['smithing', 'Smithing'],
  ['fishing', 'Fishing'],
  ['cooking', 'Cooking'],
  ['woodcutting', 'Woodcutting'],
  ['firemaking', 'Firemaking'],
];

export const PATHS = [
  { classId: 'warrior', id: 'tank', name: 'Tank', skills: ['fortify', 'shieldbash', 'bulwark', 'brace', 'ironcitadel'] },
  { classId: 'warrior', id: 'fury', name: 'Fury', skills: ['bloodlust', 'whirlwind', 'execute', 'rampage', 'bloodstorm'] },
  { classId: 'warrior', id: 'barbarian', name: 'Barbarian', skills: ['savage', 'leap', 'warcry', 'thickhide', 'earthquake'] },
  { classId: 'ranger', id: 'companion', name: 'Companion', skills: ['bond', 'callwolf', 'packtactics', 'alpha', 'howl'] },
  { classId: 'ranger', id: 'poison', name: 'Poison', skills: ['venom', 'poisonvolley', 'toxiccloud', 'concentrated', 'plaguearrow'] },
  { classId: 'ranger', id: 'sniper', name: 'Sniper', skills: ['deadeye', 'aimedshot', 'markedprey', 'killshot', 'snipe'] },
  { classId: 'mage', id: 'fire', name: 'Fire', skills: ['kindle', 'fireball', 'flamewave', 'immolate', 'meteor'] },
  { classId: 'mage', id: 'ice', name: 'Ice', skills: ['hoarfrost', 'frostbolt', 'icenova', 'deepfreeze', 'glacier'] },
  { classId: 'mage', id: 'lightning', name: 'Lightning', skills: ['static', 'spark', 'chainlightning', 'overcharge', 'thunderclap'] },
];

export const CREATURES = {
  chicken: 'Chicken',
  slime: 'Gate Slime',
  voidslime: 'Void Slime',
  boar: 'Thorn Boar',
  wraith: 'Gate Wraith',
  budgedragon: 'Green Budge Dragon',
  orcscout: 'Orc Scout',
  darksycledragon: 'Darksycle Dragon',
  snowyeti: 'Ravenous Snow Yeti',
  demonknight: 'Demon Knight',
  holyknight: 'Holy Knight',
  keepwarden: 'Keep Warden',
  tiger: 'Bengal Tiger',
  raptor: 'Battle Raptor',
  pirate: 'Pirate',
  sandworm: 'Sand Spine Worm',
  scorpion: 'Desert Scorpion',
  cursedpirate: 'Cursed Pirate',
};

export const BANDS = [
  { id: '1', label: '1–9' },
  { id: '10', label: '10–19' },
  { id: '20', label: '20–29' },
  { id: '30', label: '30–49' },
  { id: '50', label: '50–98' },
  { id: '99', label: '99' },
];

export const WINDOWS = [
  { id: 'all', label: 'All', ms: 0 },
  { id: '1', label: '24h', ms: DAY },
  { id: '7', label: '7d', ms: 7 * DAY },
  { id: '30', label: '30d', ms: 30 * DAY },
];

export const GOLD_BUCKETS = [
  { id: '0', label: '0' },
  { id: '1', label: '1–99' },
  { id: '100', label: '100–999' },
  { id: '1k', label: '1k–9k' },
  { id: '10k', label: '10k+' },
];

const RANK = ['F', 'E', 'D', 'C', 'B', 'A', 'S'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const XP_AT = [0];
{
  let points = 0;
  for (let level = 1; level < MAX_LEVEL; level++) {
    points += Math.floor(level + 300 * Math.pow(2, level / 7));
    XP_AT[level] = Math.floor(points / 4);
  }
}

export function isAdminEmail(email) {
  return String(email || '').trim().toLowerCase() === ADMIN_EMAIL;
}

export function creatureName(id) {
  const key = String(id || '').toLowerCase();
  if (CREATURES[key]) return CREATURES[key];
  const spaced = key.replace(/[_-]+/g, ' ');
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : 'Unknown';
}

export function formatCount(value) {
  const n = countOf(value);
  return n.toLocaleString('en-US');
}

export function ago(ms, now) {
  if (!ms) return '—';
  const minutes = Math.floor(Math.max(0, now - ms) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 36) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d ago`;
  return new Date(ms).toISOString().slice(0, 10);
}

function countOf(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(CAP, Math.floor(n));
}

function levelForXp(xp) {
  const n = Number(xp);
  if (!Number.isFinite(n) || n <= 0) return 1;
  let level = 1;
  while (level < MAX_LEVEL && n >= XP_AT[level]) level++;
  return level;
}

function hunterLevel(xp) {
  let total = 0;
  for (const [id] of SKILL_DEFS) total += levelForXp(xp?.[id]);
  return Math.max(1, total - SKILL_DEFS.length + 1);
}

function levelBand(level) {
  if (level >= 99) return '99';
  if (level >= 50) return '50';
  if (level >= 30) return '30';
  if (level >= 20) return '20';
  if (level >= 10) return '10';
  return '1';
}

function goldBucket(gold) {
  if (gold <= 0) return '0';
  if (gold < 100) return '1';
  if (gold < 1000) return '100';
  if (gold < 10000) return '1k';
  return '10k';
}

function classOf(id) {
  if (CLASS_DEFS[id]) return { id, name: CLASS_DEFS[id].name, color: CLASS_DEFS[id].color };
  return { id: '', name: 'Unsworn', color: '#8ea0b5' };
}

function cleanName(value, fallback) {
  const name = String(value || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 14);
  return name || fallback;
}

function learnedOf(raw) {
  const learned = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return learned;
  for (const path of PATHS) {
    for (const id of path.skills) if (raw[id]) learned[id] = true;
  }
  return learned;
}

function pathOf(classId, learned) {
  let best = null;
  let depth = 0;
  for (const path of PATHS) {
    if (path.classId !== classId) continue;
    let n = 0;
    for (const id of path.skills) if (learned[id]) n++;
    if (n > depth) {
      best = path;
      depth = n;
    }
  }
  return best
    ? { pathId: best.id, pathName: best.name, pathDepth: depth }
    : { pathId: '', pathName: '', pathDepth: 0 };
}

function slainOf(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
  const out = [];
  for (const [id, value] of Object.entries(raw)) {
    if (!/^[a-z0-9_-]{1,40}$/i.test(id)) continue;
    const n = countOf(value);
    if (n > 0) out.push({ id: id.toLowerCase(), name: creatureName(id), n });
  }
  out.sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
  return out.slice(0, 24);
}

function skillsOf(xp) {
  return SKILL_DEFS.map(([id, name]) => ({ id, name, level: levelForXp(xp?.[id]) }));
}

function stamp(value) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  const parsed = Date.parse(value || '');
  return Number.isFinite(parsed) ? parsed : 0;
}

function realmOf(value) {
  return value === 'cave' ? 'cave' : 'over';
}

function characterFrom(entry, hunt) {
  const source = hunt && typeof hunt === 'object' ? hunt : {};
  const name = cleanName(entry?.name, '');
  if (!name) return null;
  const id = typeof entry?.id === 'string' && /^[A-Za-z0-9_-]{1,32}$/.test(entry.id) ? entry.id : 'hunt';
  const cls = classOf(typeof source.skills?.classId === 'string' ? source.skills.classId : '');
  const learned = learnedOf(source.skills?.learned);
  const slain = slainOf(source.kills);
  const skills = skillsOf(source.xp);
  const level = hunterLevel(source.xp);
  const rank = Math.max(0, Math.min(6, source.hunter?.rank | 0));
  const quest = String(source.hunter?.quest?.text || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 80);
  return {
    id,
    name,
    classId: cls.id,
    className: cls.name,
    color: cls.color,
    ...pathOf(cls.id, learned),
    level,
    band: levelBand(level),
    gold: countOf(source.gold),
    kills: slain.reduce((sum, row) => sum + row.n, 0),
    realm: realmOf(source.hunter?.realm),
    rank,
    rankLetter: RANK[rank],
    playedAt: stamp(entry?.playedAt),
    createdAt: stamp(entry?.createdAt),
    quest,
    skills,
    slain,
  };
}

function rosterFrom(progress) {
  const characters = [];
  const retired = [];
  if (!progress || typeof progress !== 'object' || Array.isArray(progress)) {
    return { characters, retired };
  }
  const roster = progress.roster;
  if (roster && Array.isArray(roster.chars)) {
    for (const entry of roster.chars.slice(0, 8)) {
      const character = characterFrom(entry, entry?.hunt);
      if (character && !characters.some((row) => row.id === character.id)) characters.push(character);
    }
    if (Array.isArray(roster.deleted)) {
      for (const entry of roster.deleted) {
        const name = cleanName(entry?.name, '');
        if (!name) continue;
        retired.push({ name, deletedAt: stamp(entry?.deletedAt) });
        if (retired.length >= 20) break;
      }
    }
    return { characters, retired };
  }
  const legacy = characterFrom({ id: 'hunt', name: 'Hunter', playedAt: progress.savedAt }, progress);
  if (legacy && (legacy.gold || legacy.kills || legacy.classId || legacy.level > 1)) characters.push(legacy);
  return { characters, retired };
}

function pickLead(characters) {
  let lead = null;
  for (const character of characters) {
    if (!lead || character.level > lead.level || (character.level === lead.level && character.kills > lead.kills)) {
      lead = character;
    }
  }
  return lead;
}

function playerFrom(row, kind) {
  const progress = row?.facts && typeof row.facts === 'object' ? row.facts : row?.progress;
  const { characters, retired } = rosterFrom(progress);
  const lead = pickLead(characters);
  const creatureIds = [];
  for (const character of characters) {
    for (const slain of character.slain) {
      if (!creatureIds.includes(slain.id)) creatureIds.push(slain.id);
    }
  }
  const email = kind === 'account' ? String(row.email || '').trim().toLowerCase() : '';
  const address = kind === 'wallet' ? String(row.address || '') : '';
  const id = kind === 'account' ? `acct:${row.user_id}` : `wallet:${address}`;
  const updatedAt = stamp(row.updated_at || row.updatedAt) || Math.max(0, ...characters.map((c) => c.playedAt), stamp(progress?.savedAt));
  const createdAt = stamp(row.created_at || row.createdAt);
  return {
    id,
    kind,
    name: lead?.name || (email || shortAddress(address) || 'Hunter'),
    email,
    address,
    sub: kind === 'account' ? email : 'Wallet',
    updatedAt,
    createdAt,
    revision: countOf(row.revision) || 0,
    characters: characters.length,
    classId: lead?.classId || '',
    className: lead?.className || 'Unsworn',
    color: lead?.color || '#8ea0b5',
    pathId: lead?.pathId || '',
    pathName: lead?.pathName || '',
    level: lead?.level || 0,
    gold: characters.reduce((sum, character) => sum + character.gold, 0),
    kills: characters.reduce((sum, character) => sum + character.kills, 0),
    realm: lead?.realm || '',
    rankLetter: lead?.rankLetter || '',
    creatureIds,
    roster: characters,
    retired,
  };
}

function shortAddress(address) {
  if (!address) return '';
  if (address.length < 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function buildLedger({ accounts = [], wallets = [] } = {}, now = Date.now()) {
  const players = [];
  for (const row of accounts) {
    if (!row || !UUID_RE.test(String(row.user_id || ''))) continue;
    if (isAdminEmail(row.email)) continue;
    players.push(playerFrom(row, 'account'));
  }
  for (const row of wallets) {
    const address = String(row?.address || '');
    if (!address || address.length > 120) continue;
    players.push(playerFrom(row, 'wallet'));
  }
  players.sort((a, b) => b.updatedAt - a.updatedAt || a.name.localeCompare(b.name));
  return {
    at: now,
    scanned: {
      accounts: accounts.length,
      wallets: wallets.length,
      players: players.length,
    },
    players,
  };
}

function dayKey(ms) {
  const date = new Date(ms);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function derive(players, now = Date.now()) {
  const list = Array.isArray(players) ? players : [];
  const characters = [];
  for (const player of list) for (const character of player.roster) characters.push(character);
  const classRows = [
    { id: 'warrior', name: 'Warrior', color: CLASS_DEFS.warrior.color },
    { id: 'ranger', name: 'Ranger', color: CLASS_DEFS.ranger.color },
    { id: 'mage', name: 'Mage', color: CLASS_DEFS.mage.color },
    { id: 'unsworn', name: 'Unsworn', color: '#8ea0b5' },
  ].map((row) => ({
    ...row,
    n: characters.filter((character) => (character.classId || 'unsworn') === row.id).length,
  }));
  const levels = BANDS.map((band) => ({
    ...band,
    n: characters.filter((character) => character.band === band.id).length,
  }));
  const creatureMap = new Map();
  for (const character of characters) {
    for (const slain of character.slain) {
      const row = creatureMap.get(slain.id) || { id: slain.id, name: slain.name, kills: 0, hunters: 0, seen: new Set() };
      row.kills += slain.n;
      row.seen.add(character);
      creatureMap.set(slain.id, row);
    }
  }
  const creatures = [...creatureMap.values()]
    .map((row) => ({ id: row.id, name: row.name, kills: row.kills, hunters: row.seen.size }))
    .sort((a, b) => b.kills - a.kills || a.name.localeCompare(b.name));
  const realms = [
    { id: 'over', name: 'Overworld', n: characters.filter((character) => character.realm !== 'cave').length },
    { id: 'cave', name: 'Darksycle Den', n: characters.filter((character) => character.realm === 'cave').length },
  ];
  const golds = list.map((player) => player.gold);
  const buckets = GOLD_BUCKETS.map((bucket) => ({
    ...bucket,
    n: list.filter((player) => goldBucket(player.gold) === bucket.id).length,
  }));
  const skills = SKILL_DEFS.map(([id, name]) => {
    let gained = 0;
    let trained = 0;
    for (const character of characters) {
      const level = character.skills.find((skill) => skill.id === id)?.level || 1;
      gained += level - 1;
      if (level > 1) trained++;
    }
    return { id, name, gained, trained };
  });
  const paths = PATHS.map((path) => {
    const members = characters.filter((character) => character.pathId === path.id);
    const depth = members.reduce((sum, character) => sum + character.pathDepth, 0);
    return {
      id: path.id,
      classId: path.classId,
      name: path.name,
      className: CLASS_DEFS[path.classId].name,
      color: CLASS_DEFS[path.classId].color,
      n: members.length,
      depth: members.length ? Math.round((depth / members.length) * 10) / 10 : 0,
    };
  });
  const today = dayKey(now);
  const activity = [];
  for (let i = 13; i >= 0; i--) {
    const day = today - i * DAY;
    const date = new Date(day);
    activity.push({
      day,
      label: String(date.getUTCDate()),
      month: MONTHS[date.getUTCMonth()],
      active: list.filter((player) => player.updatedAt && dayKey(player.updatedAt) === day).length,
      joined: list.filter((player) => player.createdAt && dayKey(player.createdAt) === day).length,
    });
  }
  const gold = golds.reduce((sum, n) => sum + n, 0);
  const kills = list.reduce((sum, player) => sum + player.kills, 0);
  return {
    accounts: list.filter((player) => player.kind === 'account').length,
    wallets: list.filter((player) => player.kind === 'wallet').length,
    hunters: characters.length,
    retired: list.reduce((sum, player) => sum + player.retired.length, 0),
    gold,
    kills,
    mean: list.length ? Math.round(gold / list.length) : 0,
    median: median(golds),
    active: {
      h24: list.filter((player) => player.updatedAt >= now - DAY).length,
      d7: list.filter((player) => player.updatedAt >= now - 7 * DAY).length,
      d30: list.filter((player) => player.updatedAt >= now - 30 * DAY).length,
    },
    classes: classRows,
    levels,
    creatures,
    realms,
    buckets,
    skills,
    paths,
    activity,
  };
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[mid];
  return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export function filterPlayers(players, query = {}) {
  const q = String(query.query || '').trim().toLowerCase();
  const windowMs = WINDOWS.find((item) => item.id === query.window)?.ms || 0;
  const now = query.now || Date.now();
  const classId = query.classId || '';
  const creature = query.creature || '';
  const band = query.band || '';
  const pathId = query.pathId || '';
  const realm = query.realm || '';
  const bucket = query.bucket || '';
  return (players || []).filter((player) => {
    if (windowMs && player.updatedAt < now - windowMs) return false;
    if (classId === 'unsworn') {
      if (player.roster.length && player.roster.every((character) => character.classId)) return false;
    } else if (classId && !player.roster.some((character) => character.classId === classId)) return false;
    if (creature && !player.creatureIds.includes(creature)) return false;
    if (band && !player.roster.some((character) => character.band === band)) return false;
    if (pathId && !player.roster.some((character) => character.pathId === pathId)) return false;
    if (realm && !player.roster.some((character) => character.realm === realm)) return false;
    if (bucket && goldBucket(player.gold) !== bucket) return false;
    if (!q) return true;
    const hay = [player.name, player.email, player.address, player.sub, ...player.roster.map((character) => character.name)]
      .join('\n')
      .toLowerCase();
    return hay.includes(q);
  });
}

const SORTERS = {
  name: (player) => player.name.toLowerCase(),
  email: (player) => (player.email || player.address || '').toLowerCase(),
  characters: (player) => player.characters,
  class: (player) => player.className.toLowerCase(),
  level: (player) => player.level,
  gold: (player) => player.gold,
  kills: (player) => player.kills,
  updated: (player) => player.updatedAt,
  created: (player) => player.createdAt,
};

export function sortPlayers(players, key, dir) {
  const read = SORTERS[key] || SORTERS.updated;
  const sign = dir === 'asc' ? 1 : -1;
  return [...(players || [])].sort((a, b) => {
    const left = read(a);
    const right = read(b);
    if (left < right) return -1 * sign;
    if (left > right) return 1 * sign;
    return a.name.localeCompare(b.name);
  });
}

export function present(ledger, ui = {}) {
  const players = Array.isArray(ledger?.players) ? ledger.players : [];
  const now = ui.now || ledger?.at || Date.now();
  const filtered = sortPlayers(
    filterPlayers(players, { ...ui, now }),
    ui.sort || 'updated',
    ui.dir || 'desc',
  );
  return {
    now,
    at: ledger?.at || now,
    scanned: ledger?.scanned || { accounts: 0, wallets: 0, players: players.length },
    pulse: derive(players, now),
    view: derive(filtered, now),
    players: filtered,
    total: players.length,
    selected: players.find((player) => player.id === ui.selected) || null,
  };
}
