/** View-layer bag stacks. Saves and the server still store one total per item. */

import { gearById } from '../data/catalog.js';

export const MAX_STACK = 20;
export const STORAGE_MAX_STACK = 99;
export const BAG_SLOTS = 40;
export const INVENTORY_FULL = 'Inventory full';

/** How many inventory slots a total occupies. Gear is always one. */
export function stackSlots(n) {
  n = n | 0;
  if (n < 1) return 0;
  return Math.ceil(n / MAX_STACK);
}

/** Packed view of a total: 45 → [20, 20, 5]. There is no other split. */
export function splitStacks(n) {
  n = n | 0;
  if (n < 1) return [];
  const out = [];
  while (n > 0) {
    const take = n > MAX_STACK ? MAX_STACK : n;
    out.push(take);
    n -= take;
  }
  return out;
}

/** How many more of an item fit given its current total and free bag slots. */
export function roomForCount(current, freeSlots) {
  current = Math.max(0, current | 0);
  const partial = current % MAX_STACK === 0 ? 0 : MAX_STACK - (current % MAX_STACK);
  const extra = Math.max(0, freeSlots | 0);
  return partial + extra * MAX_STACK;
}

export function bagSlotsFrom({ goods = {}, materials = {}, crafted = {}, storedGear = [] } = {}) {
  const stored = new Set(storedGear);
  let n = 0;
  for (const id of Object.keys(goods)) n += stackSlots(goods[id]);
  for (const id of Object.keys(materials)) n += stackSlots(materials[id]);
  for (const id of Object.keys(crafted)) {
    if (!crafted[id] || stored.has(id) || !gearById(id)) continue;
    n += 1;
  }
  return n;
}

/** Gathered goods and parts use 99 per crate slot; carried supplies retain 20. */
export function storageStackMax(kind) {
  return kind === 'good' || kind === 'part' ? STORAGE_MAX_STACK : MAX_STACK;
}

export function splitStorageStacks(n, max = STORAGE_MAX_STACK) {
  n = n | 0;
  if (n < 1) return [];
  const out = [];
  while (n > 0) {
    const take = Math.min(n, max);
    out.push(take);
    n -= take;
  }
  return out;
}

/** Visual crate cells from saved {k,id,n} entries. */
export function storageVisual(slots, cap) {
  const cells = [];
  (slots || []).forEach((s, src) => {
    if (!s) return;
    if (s.k === 'gear') {
      cells.push({ k: s.k, id: s.id, n: 1, src });
      return;
    }
    for (const part of splitStorageStacks(s.n, storageStackMax(s.k))) cells.push({ k: s.k, id: s.id, n: part, src });
  });
  const size = Math.max(cap | 0, cells.length);
  while (cells.length < size) cells.push(null);
  return cells;
}

export function storageStackSlots(s) {
  if (!s) return 0;
  return s.k === 'gear' ? 1 : Math.ceil(Math.max(0, s.n | 0) / storageStackMax(s.k));
}
