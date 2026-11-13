/**
 * Desktop weapon cursors. Touch / coarse pointers are unchanged.
 * Offline: equipped weapon from local gear. mmo=1 with a socket client:
 * worldView.localHeld from snapshot/delta for the local id.
 */
import { GEAR, WEAPON_ORDER, gearById } from '../data/catalog.js';

export const CURSOR_KEY = 'mg-weapon-cursor';
export const CURSOR_KINDS = [
  'sword', 'axe', 'hammer', 'spear', 'bow', 'crossbow', 'staff', 'wand', 'tome',
  'dagger', 'dual', 'scythe', 'pick', 'default',
];

const WTYPE_TO_KIND = {
  onesword: 'sword',
  twosword: 'sword',
  dual: 'dual',
  hammer: 'hammer',
  spear: 'spear',
  staff: 'staff',
  wand: 'wand',
  shortbow: 'bow',
  longbow: 'bow',
  crossbow: 'crossbow',
  scythe: 'scythe',
};

const HELD_TO_KIND = {
  blade: 'sword',
  orcblade: 'sword',
  ironsword: 'sword',
  axe: 'axe',
  hammer: 'hammer',
  bow: 'bow',
  dual: 'dual',
  crossbow: 'crossbow',
  wand: 'wand',
  tome: 'tome',
  pick: 'pick',
  staff: 'staff',
  spear: 'spear',
};

const HOT = { x: 2, y: 2 };

function gearForHeld(held) {
  const id = String(held || '');
  return gearById(id) || GEAR.find((g) => g.type === 'weapon' && (g.held === id || g.item?.held === id)) || null;
}

export function cursorKindForHeld(held) {
  if (!held) return 'default';
  const id = String(held);
  const gear = gearForHeld(id);
  if (gear?.wtype && WTYPE_TO_KIND[gear.wtype]) return WTYPE_TO_KIND[gear.wtype];
  if (HELD_TO_KIND[id]) return HELD_TO_KIND[id];
  if (/scythe/.test(id)) return 'scythe';
  if (/crossbow/.test(id)) return 'crossbow';
  if (/bow/.test(id)) return 'bow';
  if (/staff/.test(id)) return 'staff';
  if (/wand/.test(id)) return 'wand';
  if (/tome|book/.test(id)) return 'tome';
  if (/spear|lance/.test(id)) return 'spear';
  if (/hammer|maul/.test(id)) return 'hammer';
  if (/axe/.test(id)) return 'axe';
  if (/pick/.test(id)) return 'pick';
  if (/dual|twin|dagger|knife/.test(id)) return /dual|twin/.test(id) ? 'dual' : 'dagger';
  if (/sword|blade|saber|brand/.test(id)) return 'sword';
  if (id === 'stone' || id === 'torch' || id === 'potion' || id === 'manapotion' || id === 'fishrod' || id === 'fishnet' || id === 'tinder') {
    return 'default';
  }
  return 'default';
}

export function cursorTierForHeld(held) {
  const gear = gearForHeld(held);
  const id = String(held || '');
  if (gear?.monster === 'darksycledragon' || id.startsWith('dark') || id === 'darkhammer') return 'dusk';
  return 'base';
}

export function cursorUrl(kind, tier, dpr = 1) {
  const k = CURSOR_KINDS.includes(kind) ? kind : 'default';
  const t = tier === 'dusk' ? 'dusk' : 'base';
  const size = dpr >= 1.5 ? 64 : 32;
  return new URL(`../../public/cursors/${k}-${t}-${size}.svg`, import.meta.url).href;
}

/** Public-path URL that Vite copies from public/. */
export function cursorPublicUrl(kind, tier, dpr = 1) {
  const k = CURSOR_KINDS.includes(kind) ? kind : 'default';
  const t = tier === 'dusk' ? 'dusk' : 'base';
  const size = dpr >= 1.5 ? 64 : 32;
  const base = typeof document !== 'undefined' ? document.baseURI : '/';
  return new URL(`cursors/${k}-${t}-${size}.svg`, base).href;
}

export function cursorCss(kind, tier, dpr = 1) {
  const size = dpr >= 1.5 ? 64 : 32;
  const hx = dpr >= 1.5 ? HOT.x * 2 : HOT.x;
  const hy = dpr >= 1.5 ? HOT.y * 2 : HOT.y;
  return `url("${cursorPublicUrl(kind, tier, dpr)}") ${hx} ${hy}, auto`;
}

export function weaponCursorEnabled() {
  try {
    const raw = localStorage.getItem(CURSOR_KEY);
    if (raw == null || raw === '') return true;
    return raw !== '0' && raw !== 'false';
  } catch {
    return true;
  }
}

export function setWeaponCursorEnabled(on) {
  try {
    localStorage.setItem(CURSOR_KEY, on ? '1' : '0');
  } catch {
    /* private mode */
  }
}

export function finePointer() {
  try {
    return typeof matchMedia === 'function' && matchMedia('(pointer: fine)').matches;
  } catch {
    return false;
  }
}

/** Equipped held id. Server snapshot wins while an MMO client is attached. */
export function equippedHeldKind(game) {
  if (game?.mmo) {
    const held = game.worldView?.localHeld;
    if (held != null && held !== '') return held;
    return game?.player?.heldKind || game?.player?.sheathKind || null;
  }
  return game?.progress?.weaponItem?.held || game?.player?.sheathKind || null;
}

export function applyWeaponCursor(game) {
  const canvas = game?.canvas || game?.renderer?.domElement || document.getElementById('game');
  if (!canvas || typeof document === 'undefined') return;
  const on = weaponCursorEnabled() && finePointer();
  document.body.classList.toggle('weapon-cursor-on', on);
  if (!on) {
    canvas.style.cursor = '';
    return;
  }
  const held = equippedHeldKind(game);
  const kind = cursorKindForHeld(held);
  const tier = cursorTierForHeld(held);
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  canvas.style.cursor = cursorCss(kind, tier, dpr);
}

export function everyWeaponCursorKind() {
  const out = new Map();
  out.set(null, 'default');
  for (const [held, kind] of Object.entries(HELD_TO_KIND)) out.set(held, kind);
  for (const g of GEAR.filter((x) => x.type === 'weapon')) {
    out.set(g.held || g.id, cursorKindForHeld(g.held || g.id));
  }
  return out;
}

export { WEAPON_ORDER, WTYPE_TO_KIND };
