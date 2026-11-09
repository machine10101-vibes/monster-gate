/**
 * Fold two account records together. A character keeps the hunt that was
 * saved later. A character that exists on only one side is kept, unless the
 * other side deleted it after that hunt was saved.
 * The same rules run in the hunter function so one device cannot wipe the other.
 */

const MAX_CHARACTERS = 8;
const KEEP_DELETED = 4;

function stamp(value) {
  const n = Number(value?.savedAt);
  return Number.isFinite(n) ? n : 0;
}

function cleanName(raw) {
  return String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, 14);
}

function plainChar(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const name = cleanName(raw.name);
  const id = raw.id;
  if (!name || typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,32}$/.test(id)) return null;
  return {
    id,
    name,
    look: raw.look && typeof raw.look === 'object' ? raw.look : {},
    createdAt: Number(raw.createdAt) || 0,
    playedAt: Number(raw.playedAt) || 0,
    fav: !!raw.fav,
  };
}

function huntOf(entry) {
  return entry?.hunt && typeof entry.hunt === 'object' && !Array.isArray(entry.hunt) ? entry.hunt : null;
}

function takeDeleted(map, list) {
  for (const entry of Array.isArray(list) ? list : []) {
    const c = plainChar(entry);
    if (!c) continue;
    const deletedAt = Number(entry.deletedAt) || 0;
    const prev = map.get(c.id);
    if (!prev || deletedAt >= prev.deletedAt) {
      map.set(c.id, { ...c, deletedAt, hunt: huntOf(entry) });
    }
  }
}

function mergeRosters(current, incoming) {
  const deleted = new Map();
  takeDeleted(deleted, current.roster.deleted);
  takeDeleted(deleted, incoming.roster.deleted);

  const chars = new Map();
  const consider = (entry) => {
    const c = plainChar(entry);
    if (!c) return;
    const hunt = huntOf(entry);
    const at = stamp(hunt);
    const gone = deleted.get(c.id);
    if (gone && gone.deletedAt > 0 && gone.deletedAt >= at) return;
    const prev = chars.get(c.id);
    if (!prev || at >= prev.at) chars.set(c.id, { char: c, hunt, at });
    if (gone && at > gone.deletedAt) deleted.delete(c.id);
  };
  for (const entry of current.roster.chars) consider(entry);
  for (const entry of incoming.roster.chars) consider(entry);

  const list = [...chars.values()].sort((a, b) => b.at - a.at).slice(0, MAX_CHARACTERS);
  const active = new Set(list.map((x) => x.char.id));
  const deletedList = [...deleted.values()]
    .filter((d) => !active.has(d.id))
    .sort((a, b) => b.deletedAt - a.deletedAt)
    .slice(0, KEEP_DELETED);

  const last = [incoming.roster.last, current.roster.last, list[0]?.char.id].find((id) => list.some((x) => x.char.id === id)) || null;
  let savedAt = Math.max(stamp(current), stamp(incoming));
  for (const x of list) savedAt = Math.max(savedAt, x.at);

  return {
    savedAt,
    roster: {
      v: 1,
      last,
      chars: list.map((x) => ({ ...x.char, hunt: x.hunt })),
      deleted: deletedList,
    },
  };
}

/** The record to store. `current` is the database row, `incoming` is this device. */
export function mergeAccountProgress(current, incoming) {
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) return current || null;
  if (!current || typeof current !== 'object' || Array.isArray(current)) return incoming;
  const currentRoster = Array.isArray(current.roster?.chars);
  const incomingRoster = Array.isArray(incoming.roster?.chars);
  if (!currentRoster && !incomingRoster) return stamp(incoming) >= stamp(current) ? incoming : current;
  if (!incomingRoster) return current;
  if (!currentRoster) return incoming;
  return mergeRosters(current, incoming);
}
