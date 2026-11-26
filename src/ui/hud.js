import { iconCanvas, iconURL, uiIconURL, heartCanvas } from './icons.js';
import { gearById } from '../data/catalog.js';
import { GOODS } from '../data/gathering.js';
import { isUnsellableGood } from '../debug/transient.js';
import { mountStats } from './stats.js';
import { mountWorldMap } from './worldmap.js';
import { clamp } from '../engine/voxel.js';
import { FARM, GATE, GUILD, LAKE, MINE, TOWN } from '../world/terrain.js';
import { CAVE_MOUTH } from '../world/southford.js';
import { TILE_SIZE, TILES, originOf } from '../world/tiles.js';
import { chartedAnchor, chartedWeight } from '../world/playmap.js';
import { SKILLS } from '../data/skills.js';
import { mountSkillTree, paintSkillIcon } from './skilltree.js';
import { HOTBAR_HOLD_MS, availableHotbarSkills, readHotbarLocked, writeHotbarLocked } from './skillHotbar.js';
import { mountGear } from './gear.js';
import { mountBag } from './bag.js';
import { mountStorage } from './storage.js';
import { flushThumbs, renderThumb } from './catalog.js';
import { mountSpellbook } from './spellbook.js';
import { mountTeleport } from './teleport.js';
import { mountCarve, mountSmithy } from './smithy.js';
import { mountJournal } from './journal.js';
import { shortAddress } from '../wallet/klever.js';
import { mountWalletSettings } from '../wallet/settings.js';
import { writeStrafeSetting } from '../engine/input.js';
import { decorateAllFrames, decorateFrame } from './theme.js';
import { applyWeaponCursor, setWeaponCursorEnabled, weaponCursorEnabled } from './weaponCursor.js';
import { mountFriends } from '../social/ui.js';
import { BUILD_ID } from './buildId.js';
import { applyHudLayout, layoutPlaymapLabels, measureHudSafeRects, measurePlateSize, nameplateHitsHud, nameplateOutsideViewport, nudgeAnchorOffRects, readQuestOpen, stackNameplates, writeQuestOpen } from './hudLayout.js';
import { isWorldOnline, leaveOnlineWorld, onWorldPlayClick, paintWorldModePill, paintWorldPlayButton } from '../net/worldPlay.js';
import { QUALITIES } from '../engine/quality.js';
import { canCreateWorld } from '../admin/gate.js';
import { paintMonsterGateMarker, visibleMonsterGates } from './gateMarkers.js';

export const ITEMS = [
  { id: 'blade', icon: 'blade', name: 'Hunter Blade', kind: 'melee', style: 'swordshield', dmg: 9, reach: 2.4, arc: 2.0, dur: 0.4, hit: 0.17, stam: 9, knock: 4.5, held: 'blade', desc: 'Sword and shield. Hold Shift to block.' },
  { id: 'pick', icon: 'pick', name: 'Iron Pickaxe', kind: 'melee', dmg: 6, reach: 2.2, arc: 1.6, dur: 0.34, hit: 0.14, stam: 6, knock: 3, held: 'pick', desc: 'Quick swings, light damage.' },
  { id: 'axe', icon: 'axe', name: 'Woodcutter Axe', kind: 'melee', style: 'twohand', dmg: 8, reach: 2.3, arc: 1.8, dur: 0.44, hit: 0.2, stam: 9, knock: 4, held: 'axe', desc: 'Two-handed chops.' },
  { id: 'hammer', icon: 'hammer', name: 'Stone Hammer', kind: 'melee', style: 'twohand', dmg: 10, reach: 2.4, arc: 2.3, dur: 0.7, hit: 0.34, stam: 16, knock: 8, held: 'hammer', desc: 'A two-handed hammer. Slow, bone-shaking blows.' },
  { id: 'bow', icon: 'bow', name: 'Short Bow', kind: 'ranged', style: 'shortbow', dmg: 7, dur: 0.5, stam: 7, held: 'bow', desc: 'A short bow. Loose arrows at range.' },
  { id: 'stone', icon: 'stone', name: 'Throwing Stone', kind: 'throw', dmg: 4, dur: 0.38, stam: 4, count: 12, held: 'stone', desc: 'Pocket-sized pain.' },
  { id: 'potion', icon: 'potion', name: 'Healing Potion', kind: 'use', count: 10, held: 'potion', heal: 8, desc: 'Restores 8 health.' },
  { id: 'empty', icon: 'empty', name: 'Empty', kind: 'none' },
  { id: 'torch', icon: 'torch', name: 'Torch', kind: 'light', count: 18, held: 'torch', desc: 'Lights the way at night.' },
  { id: 'manapotion', icon: 'manapotion', name: 'Spirit Philter', kind: 'use', count: 2, held: 'manapotion', mana: 20, desc: 'Restores 20 spirit.' },
  { id: 'dual', icon: 'dual', name: 'Twin Blades', kind: 'melee', style: 'dual', dmg: 8, reach: 2.2, arc: 2.3, dur: 0.32, hit: 0.13, stam: 8, knock: 3.2, held: 'dual', desc: 'A blade in each hand.' },
  { id: 'crossbow', icon: 'crossbow', name: 'Hunter Crossbow', kind: 'ranged', style: 'crossbow', dmg: 11, dur: 0.64, stam: 9, held: 'crossbow', desc: 'A heavy bolt. Mastery lets it punch through.' },
  { id: 'wand', icon: 'wand', name: 'Ash Wand', kind: 'ranged', style: 'wand', spell: true, proj: 'bolt', dmg: 8, dur: 0.34, stam: 4, held: 'wand', desc: 'A quick focus for spells.' },
  { id: 'tome', icon: 'tome', name: 'Field Tome', kind: 'ranged', style: 'tome', spell: true, proj: 'bolt', dmg: 10, dur: 0.56, stam: 5, held: 'tome', desc: 'A traveling spell book.' },
];

export const POTION_SHOP = {
  potion: { price: 6, max: 20 },
  manapotion: { price: 8, max: 20 },
};

const CITY_NAMES = new Set(['Oakhollow', 'Southford', 'Dawnspire', 'Hellspire', 'Gilantre']);
const ITEM_HOTBAR_LOCK_KEY = 'mg-hotbar-items-locked';
const PLAYMAP_MAX_ZOOM = 10;
function readItemHotbarLocked() {
  try { return globalThis.localStorage?.getItem(ITEM_HOTBAR_LOCK_KEY) === '1'; }
  catch { return false; }
}
function writeItemHotbarLocked(locked) {
  try {
    if (locked) globalThis.localStorage?.setItem(ITEM_HOTBAR_LOCK_KEY, '1');
    else globalThis.localStorage?.removeItem(ITEM_HOTBAR_LOCK_KEY);
    return true;
  } catch { return false; }
}

function isPartyRemote(r, partyOf) {
  if (!r || !partyOf) return false;
  if (typeof partyOf.isPartyMember === 'function') return !!partyOf.isPartyMember(r.id, r.name);
  if (typeof partyOf === 'function') return !!partyOf(r);
  if (partyOf.has) return partyOf.has(r.id) || partyOf.has(r.name);
  return false;
}

/** Area and city names for the map the player opens. */
function landMapLabels(world) {
  const labels = [];
  let gilantre = null;
  for (const land of world.lands || []) {
    if (land.role === 'oak') continue;
    const tile = TILES.find((t) => t.id === land.tileId || t.kind === land.kind);
    const name = tile?.kind === 'pirateshore' || land.kind === 'pirateshore'
      ? 'Pirate Shore'
      : (land.banner?.[1] || tile?.name);
    if (!name) continue;
    if (name === 'Gilantre') {
      gilantre = gilantre || { name, x: 0, z: 0, n: 0, city: true };
      gilantre.x += land.x0 + TILE_SIZE / 2;
      gilantre.z += land.z0 + TILE_SIZE / 2;
      gilantre.n += 1;
      continue;
    }
    let cx = land.x0 + TILE_SIZE / 2;
    let cz = land.z0 + TILE_SIZE / 2;
    if (name === 'Dawnspire' && world.holyKeep) {
      cx = world.holyKeep.x;
      cz = world.holyKeep.z;
    } else if (name === 'Hellspire' && world.demonKeep) {
      cx = world.demonKeep.x;
      cz = world.demonKeep.z;
    }
    const pin = chartedAnchor(cx, cz);
    if (!pin) continue;
    labels.push({
      name,
      x: pin.x,
      z: pin.z,
      city: CITY_NAMES.has(name),
      charted: true,
    });
  }
  if (gilantre) {
    const pin = chartedAnchor(gilantre.x / gilantre.n, gilantre.z / gilantre.n);
    if (pin) labels.push({ name: 'Gilantre', x: pin.x, z: pin.z, city: true, charted: true });
  }
  const marks = [
    { name: 'Monster Gate', x: GATE.x, z: GATE.z - 14, landmark: true },
    { name: 'Greyrock Pit', x: MINE.x + 4, z: MINE.z - 14, landmark: true },
    { name: 'Oakhollow', x: TOWN.x - 10, z: TOWN.z + 18, city: true },
    { name: "Tobin's Farm", x: FARM.x1 + 22, z: FARM.z1 + 16, landmark: true },
    { name: 'Mirrormere', x: LAKE.x - 32, z: LAKE.z + 34, landmark: true },
    { name: 'Darksycle Cave', x: CAVE_MOUTH.x + 2, z: CAVE_MOUTH.z - 24, landmark: true },
  ];
  for (const mark of marks) {
    const pin = chartedAnchor(mark.x, mark.z) || { x: mark.x, z: mark.z };
    labels.push({ ...mark, x: pin.x, z: pin.z, charted: chartedWeight(pin.x, pin.z) > 0.45 });
  }
  for (const mark of world.farmMarks || []) labels.push(mark);
  const named = new Set(labels.map((l) => l.name));
  for (const tile of TILES) {
    if (tile.built || tile.biome === 'sea') continue;
    if (named.has(tile.name)) continue;
    if ((tile.tx + tile.tz * 2) % 4 !== 1) continue;
    const o = originOf(tile);
    labels.push({ name: tile.name, x: o.x + TILE_SIZE / 2, z: o.z + TILE_SIZE / 2, uncharted: true });
  }
  return labels;
}

function caveMapLabels(cave) {
  return [
    { name: "Dragon's Nest", x: cave.nest.x, z: cave.nest.z - 3 },
    { name: 'Darksycle Den', x: cave.origin.x + cave.w / 2, z: cave.origin.z + cave.d * 0.62, city: true },
  ];
}

/**
 * Canvas rotate for a north-up minimap.
 * World +Z is down on the map, -Z is up (Oakhollow's gate sits at lower Z).
 * Character yaw 0 faces +Z. The arrow sprite's tip is local -Y (canvas up at 0).
 * A rotating minimap would subtract camera yaw; this game is north-up only.
 */
export function minimapArrowAngle(yaw, opts = {}) {
  let a = -Number(yaw || 0) + Math.PI;
  if (opts.rotateMap) a -= Number(opts.cameraYaw || 0);
  return a;
}

function paintMinimapArrow(ctx, x, y, yaw, { fill = '#e9fff1', stroke = '#000', scale = 1 } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(minimapArrowAngle(yaw));
  ctx.scale(scale, scale);
  ctx.fillStyle = stroke;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(6, 6);
  ctx.lineTo(0, 3);
  ctx.lineTo(-6, 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.lineTo(4, 4);
  ctx.lineTo(0, 2);
  ctx.lineTo(-4, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export class HUD {
  constructor() {
    const $ = (id) => document.getElementById(id);
    this.el = {
      hud: $('hud'), hearts: $('hearts'), stamina: $('stamina-fill'), hotbar: $('hotbar'),
      orbL: $('orb-left'), orbR: $('orb-right'), clock: $('clock-text'), toast: $('toast'),
      banner: $('banner'), bannerMain: $('banner-main'), bannerSub: $('banner-sub'),
      minimap: $('minimap'), nameplates: $('nameplates'), damage: $('damage-layer'),
      qText: $('q-text'), qCount: $('q-count'), qFill: $('q-fill'), gold: $('gold'), rank: $('rank'),
      dialog: $('dialog'), dlgName: $('dlg-name'), dlgText: $('dlg-text'), dlgChoices: $('dlg-choices'),
      panel: $('panel'), panelTitle: $('panel-title'), panelBody: $('panel-body'),
      hurt: $('hurt-flash'), faint: $('faint'), area: $('area-label'), talk: $('tb-talk'),
      sun: document.querySelector('#clock .sun'),
    };
    this.mctx = this.el.minimap.getContext('2d');
    this.mctx.imageSmoothingEnabled = false;
    this.heartKinds = { full: heartCanvas('full'), half: heartCanvas('half'), empty: heartCanvas('empty') };
    this.hearts = [];
    this.hp = -1;
    this.slots = [];
    this.toastT = 0;
    this.plates = new Map();
    this.sunKind = '';
    this.mapLabels = true;
    this.hotbarLocked = readHotbarLocked();
    this.itemHotbarLocked = readItemHotbarLocked();

    document.querySelectorAll('.mbtn .ico').forEach((n) => {
      const cls = [...n.classList].find((c) => c !== 'ico');
      if (cls) n.style.backgroundImage = `url(${uiIconURL(cls)})`;
    });
    document.querySelectorAll('.tbtn .ico').forEach((n) => {
      const cls = [...n.classList].find((c) => c !== 'ico');
      if (cls) n.style.backgroundImage = `url(${iconURL(cls)})`;
    });
    $('btn-fs').style.backgroundImage = `url(${uiIconURL('fs')})`;
    $('btn-snd').style.backgroundImage = `url(${uiIconURL('snd')})`;
    decorateAllFrames();
    this.bindQuestToggle();
    this.bindPanelClose();
    this.syncWindows();
    this.layoutHud();
    paintWorldModePill(document.getElementById('world-mode-pill'));
  }

  bindPanelClose() {
    bindPanelClose(this.el.panel?.querySelector('#panel-close') || document.getElementById('panel-close'), () => this.closePanel());
  }

  layoutHud() {
    const touch = document.body.classList.contains('touch');
    applyHudLayout(document.documentElement, {
      w: window.innerWidth || 1280,
      h: window.innerHeight || 800,
      touch,
    });
  }

  bindQuestToggle() {
    const box = document.getElementById('quest');
    const btn = document.getElementById('quest-toggle');
    if (!box || !btn) return;
    const apply = (open) => {
      box.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    apply(readQuestOpen());
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const open = !box.classList.contains('open');
      apply(open);
      writeQuestOpen(open);
    });
  }

  syncWindows() {
    const panel = this.panelOpen;
    const dialog = this.dialogOpen;
    const picker = !!this.skillPicker;
    const open = panel || dialog || picker;
    document.documentElement.classList.toggle('skill-picker-open', picker);
    document.documentElement.classList.toggle('windows-open', !!open);
    document.documentElement.classList.toggle('panel-open', !!panel);
    document.documentElement.classList.toggle('dialog-open', !!dialog);
  }

  buildHotbar(items, onSelect, onHold) {
    this.el.hotbar.innerHTML = '';
    this.slots = [];
    items.forEach((it, i) => {
      const b = document.createElement('button');
      b.className = 'slot';
      b.setAttribute('aria-label', it.name);
      const cv = document.createElement('canvas');
      cv.width = 16;
      cv.height = 16;
      const gear = gearById(it.id);
      if (gear) b.appendChild(renderThumb({ kind: gear.type === 'weapon' ? 'weapon' : 'armor', id: gear.id }, 64));
      else {
        cv.getContext('2d').drawImage(iconCanvas(it.icon), 0, 0);
        b.appendChild(cv);
      }
      const key = document.createElement('span');
      key.className = 'key';
      key.textContent = i > 9 ? '' : i === 9 ? '0' : String(i + 1);
      b.appendChild(key);
      const cnt = document.createElement('span');
      cnt.className = 'cnt';
      b.appendChild(cnt);
      let holdTimer = 0;
      let held = false;
      let suppressClick = false;
      b.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.stopPropagation();
        held = false;
        if (this.itemHotbarLocked || !onHold) return;
        b.classList.add('hold-arming');
        holdTimer = setTimeout(() => {
          holdTimer = 0;
          held = true;
          suppressClick = true;
          b.classList.remove('hold-arming');
          onHold(i);
        }, HOTBAR_HOLD_MS);
      });
      const cancelHold = () => {
        if (holdTimer) clearTimeout(holdTimer);
        holdTimer = 0;
        b.classList.remove('hold-arming');
      };
      b.addEventListener('pointerup', cancelHold);
      b.addEventListener('pointercancel', cancelHold);
      b.addEventListener('pointerleave', cancelHold);
      b.addEventListener('contextmenu', (e) => {
        if (held || holdTimer) e.preventDefault();
      });
      b.addEventListener('click', (e) => {
        if (suppressClick) {
          suppressClick = false;
          e.preventDefault();
          e.stopImmediatePropagation();
          return;
        }
        onSelect(i);
      });
      this.el.hotbar.appendChild(b);
      b.classList.toggle('hotbar-locked', this.itemHotbarLocked);
      this.slots.push({ b, cnt });
    });
  }

  updateSlots(items, sel) {
    items.forEach((it, i) => {
      const s = this.slots[i];
      s.b.classList.toggle('sel', i === sel);
      s.cnt.textContent = it.count !== undefined ? it.count : '';
    });
  }

  setHP(hp, max) {
    if (this.hearts.length !== max / 2) {
      this.el.hearts.innerHTML = '';
      this.hearts = [];
      for (let i = 0; i < max / 2; i++) {
        const c = document.createElement('canvas');
        c.width = 13;
        c.height = 10;
        this.el.hearts.appendChild(c);
        this.hearts.push({ c, state: '' });
      }
    }
    if (hp === this.hp) return;
    this.hp = hp;
    this.hearts.forEach((h, i) => {
      const v = hp - i * 2;
      const state = v >= 2 ? 'full' : v === 1 ? 'half' : 'empty';
      if (h.state !== state) {
        h.state = state;
        const ctx = h.c.getContext('2d');
        ctx.clearRect(0, 0, 13, 10);
        ctx.drawImage(this.heartKinds[state], 0, 0);
      }
    });
  }

  setStamina(v, max) {
    this.el.stamina.style.width = (clamp(v / max, 0, 1) * 100).toFixed(1) + '%';
  }

  setOrb(which, v, max) {
    const o = which === 'mana' ? this.el.orbL : this.el.orbR;
    const pct = clamp(v / max, 0, 1) * 100;
    o.style.setProperty('--fill', pct.toFixed(1) + '%');
    o.querySelector('.num').textContent = Math.round(v);
  }

  setClock(hour) {
    const h = Math.floor(hour);
    const m = Math.floor((hour - h) * 60);
    this.el.clock.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    const kind = hour >= 6 && hour < 19 ? 'sun' : 'moon';
    if (kind !== this.sunKind) {
      this.sunKind = kind;
      this.el.sun.style.backgroundImage = `url(${iconURL(kind)})`;
    }
  }

  setQuest(text, n, total) {
    this.el.qText.textContent = text;
    this.el.qCount.textContent = `${n}/${total}`;
    this.el.qFill.style.width = clamp(n / total, 0, 1) * 100 + '%';
  }
  setGold(g) {
    this.el.gold.textContent = g;
  }
  setRank(r) {
    this.el.rank.textContent = r;
  }

  toast(msg, ms = 1500) {
    this.el.toast.textContent = msg;
    this.el.toast.classList.add('show');
    clearTimeout(this.toastT);
    const duration = Math.min(1500, Math.max(0, Number(ms) || 1500));
    this.toastT = setTimeout(() => this.el.toast.classList.remove('show'), Math.max(0, duration - 150));
  }

  banner(sub, main, ms = 3200) {
    this.el.bannerSub.textContent = sub;
    this.el.bannerMain.textContent = main;
    this.el.banner.classList.add('show');
    clearTimeout(this.bannerT);
    this.bannerT = setTimeout(() => this.el.banner.classList.remove('show'), ms);
  }

  hurtFlash() {
    const h = this.el.hurt;
    h.classList.add('show');
    requestAnimationFrame(() => requestAnimationFrame(() => h.classList.remove('show')));
  }

  floatText(x, y, text, cls = '') {
    const d = document.createElement('div');
    d.className = 'dmg ' + cls;
    d.textContent = text;
    d.style.left = x + 'px';
    d.style.top = y + 'px';
    d.style.transform = 'translate(-50%,-50%)';
    this.el.damage.appendChild(d);
    setTimeout(() => d.remove(), 950);
  }

  showDialog(name, text) {
    this.el.dlgName.textContent = name;
    this.el.dlgText.textContent = text;
    this.clearChoices();
    this.el.dialog.classList.remove('hidden');
    this.syncWindows();
  }
  hideDialog() {
    this.clearChoices();
    this.el.dialog.classList.add('hidden');
    this.syncWindows();
  }
  showChoices(choices, onPick) {
    const box = this.el.dlgChoices;
    if (!box) return;
    box.innerHTML = '';
    box.classList.remove('hidden');
    const hint = this.el.dialog.querySelector('small');
    if (hint) hint.textContent = 'Choose a reply';
    for (const c of choices) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'dlg-choice';
      b.textContent = c.label;
      b.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        onPick(c.id);
      });
      box.appendChild(b);
    }
  }
  clearChoices() {
    const box = this.el.dlgChoices;
    if (box) {
      box.innerHTML = '';
      box.classList.add('hidden');
    }
    const hint = this.el.dialog?.querySelector('small');
    if (hint) hint.textContent = 'Tap or press F to continue';
  }
  get dialogOpen() {
    return !this.el.dialog.classList.contains('hidden');
  }

  setTalkVisible(v) {
    this.el.talk.classList.toggle('hidden', !v);
  }

  plate(id, html, cls = '') {
    let p = this.plates.get(id);
    if (!p) {
      p = document.createElement('div');
      this.el.nameplates.appendChild(p);
      p.dataset.h = '';
      this.plates.set(id, p);
    }
    const nextCls = ('nameplate ' + cls).trim();
    if (p.className !== nextCls) p.className = nextCls;
    p.dataset.pid = String(id);
    if (p.dataset.h !== html) {
      p.innerHTML = html;
      p.dataset.h = html;
      const name = p.childNodes[0]?.textContent || '';
      if (name) p.dataset.pname = name.trim();
    }
    return p;
  }
  removePlate(id) {
    const p = this.plates.get(id);
    if (p) {
      p.remove();
      this.plates.delete(id);
    }
  }
  clearPlates() {
    for (const id of [...this.plates.keys()]) this.removePlate(id);
  }
  placePlate(id, x, y, visible, opts = {}) {
    const p = this.plates.get(id);
    if (!p) return;
    if (!visible) {
      if (p.style.display !== 'none') p.style.display = 'none';
      return;
    }
    p.style.display = '';
    p.style.left = x.toFixed(0) + 'px';
    p.style.top = y.toFixed(0) + 'px';
    p.dataset.sx = String(x);
    p.dataset.sy = String(y);
    if (opts.dist != null) p.dataset.dist = String(opts.dist);
    if (opts.opacity != null) p.style.opacity = String(opts.opacity);
    else p.style.opacity = '';
    if (opts.zIndex != null) p.style.zIndex = String(opts.zIndex);
    else p.style.zIndex = '';
  }

  layoutInteractPlates() {
    const rows = [];
    for (const [id, el] of this.plates) {
      if (el.style.display === 'none') continue;
      if (el.classList.contains('mon')) continue;
      const size = measurePlateSize(el);
      rows.push({
        id,
        el,
        x: parseFloat(el.dataset.sx) || parseFloat(el.style.left) || 0,
        y: parseFloat(el.dataset.sy) || parseFloat(el.style.top) || 0,
        w: size.w,
        h: size.h,
        d: Number(el.dataset.dist) || 999,
      });
    }
    for (const t of stackNameplates(rows)) {
      if (!t.visible && !t.el.classList.contains('you')) {
        t.el.style.display = 'none';
        t.el.classList.remove('hud-occluded');
        continue;
      }
      t.el.style.display = '';
      t.el.style.top = t.y.toFixed(0) + 'px';
      t.el.style.zIndex = String(Math.max(1, 90 - Math.floor(t.d)));
    }
    this.cullPlatesOverHud();
  }

  cullPlatesOverHud() {
    const safe = measureHudSafeRects();
    const vp = {
      w: window.innerWidth || document.documentElement?.clientWidth || 0,
      h: window.innerHeight || document.documentElement?.clientHeight || 0,
    };
    for (const el of this.plates.values()) {
      if (el.style.display === 'none') {
        el.classList.remove('hud-occluded');
        continue;
      }
      const box = el.getBoundingClientRect?.();
      const size = measurePlateSize(el, { w: box?.width || 0, h: box?.height || 0 });
      if (!box || size.w < 2 || size.h < 2) {
        el.classList.remove('hud-occluded');
        continue;
      }
      const own = el.classList.contains('you') || el.dataset.pid === 'local-chat';
      if (own) {
        const ax = parseFloat(el.dataset.sx) || parseFloat(el.style.left) || 0;
        const ay = parseFloat(el.dataset.sy) || parseFloat(el.style.top) || 0;
        const nudged = nudgeAnchorOffRects(ax, ay, size.w, size.h, safe, vp);
        el.style.left = nudged.x.toFixed(0) + 'px';
        el.style.top = nudged.y.toFixed(0) + 'px';
        el.classList.remove('hud-occluded');
        continue;
      }
      const plate = { x: box.x, y: box.y, w: size.w, h: size.h };
      const hit = nameplateHitsHud(plate, safe) || nameplateOutsideViewport(plate, vp);
      el.classList.toggle('hud-occluded', hit);
    }
  }

  drawMinimap(world, px, pz, yaw, monsters, npcs, time, remotes = null, partyOf = null) {
    const ctx = this.mctx;
    const cv = this.el.minimap;
    const N = 44;
    const sc = cv.width / N;
    ctx.fillStyle = '#0d1116';
    ctx.fillRect(0, 0, cv.width, cv.height);
    const cave = world.realm === 'cave' ? world.cave : world.realm === 'rift' ? world.rift : null;
    const origin = cave ? cave.origin : (world.minimapOrigin || { x: 0, z: 0 });
    const sx = Math.round(px - origin.x - N / 2);
    const sz = Math.round(pz - origin.z - N / 2);
    const mapScale = cave ? 1 : (world.minimapScale || 1);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(
      cave ? cave.minimap : world.minimapCanvas,
      sx * mapScale,
      sz * mapScale,
      N * mapScale,
      N * mapScale,
      0,
      0,
      cv.width,
      cv.height,
    );
    const toX = (x) => (x - origin.x - sx) * sc;
    const toZ = (z) => (z - origin.z - sz) * sc;
    const inView = (x, z) => {
      const X = toX(x);
      const Z = toZ(z);
      return X > 0 && Z > 0 && X < cv.width && Z < cv.height;
    };
    ctx.fillStyle = '#ffd23f';
    if (inView(GUILD.x, GUILD.z)) {
      ctx.fillRect(toX(GUILD.x) - 3, toZ(GUILD.z) - 3, 6, 6);
      ctx.fillStyle = '#6b3a14';
      ctx.fillRect(toX(GUILD.x) - 1, toZ(GUILD.z) - 1, 2, 2);
    }
    if (inView(GATE.x, GATE.z)) {
      const pulse = 1.5 + Math.sin(time * 4) * 0.3;
      ctx.fillStyle = '#c27bff';
      ctx.fillRect(toX(GATE.x) - pulse, toZ(GATE.z) - pulse, pulse * 2, pulse * 2);
      ctx.fillStyle = '#1b0e3a';
      ctx.fillRect(toX(GATE.x) - 0.5, toZ(GATE.z) - 0.5, 1, 1);
    }
    for (const gate of visibleMonsterGates(world)) {
      if (inView(gate.x, gate.z)) {
        paintMonsterGateMarker(ctx, toX(gate.x), toZ(gate.z), Math.max(0.65, Math.min(1.0, sc * 0.25)), time);
      }
    }
    if (world.waygate && inView(world.waygate.x, world.waygate.z)) {
      const pulse = 1.3 + Math.sin(time * 5) * 0.3;
      ctx.fillStyle = '#7ef6ff';
      ctx.fillRect(toX(world.waygate.x) - pulse, toZ(world.waygate.z) - pulse, pulse * 2, pulse * 2);
      ctx.fillStyle = '#14343a';
      ctx.fillRect(toX(world.waygate.x) - 0.5, toZ(world.waygate.z) - 0.5, 1, 1);
    }
    ctx.fillStyle = '#5aa8d4';
    for (const p of world.teleports || []) {
      if (!inView(p.x, p.z)) continue;
      ctx.fillRect(toX(p.x) - 1, toZ(p.z) - 1, 2, 2);
      ctx.fillStyle = '#1d4a66';
      ctx.fillRect(toX(p.x) - 0.5, toZ(p.z) - 0.5, 1, 1);
      ctx.fillStyle = '#5aa8d4';
    }
    if (world.smithy && inView(world.smithy.x, world.smithy.z)) {
      ctx.fillStyle = '#e07030';
      ctx.fillRect(toX(world.smithy.x) - 3, toZ(world.smithy.z) - 2, 6, 5);
    }
    ctx.fillStyle = '#5ad0ff';
    for (const n of npcs) if (inView(n.x, n.z)) ctx.fillRect(toX(n.x) - 2, toZ(n.z) - 2, 4, 4);
    if (remotes) {
      for (const r of remotes) {
        if (!r.ready || !inView(r.x, r.z)) continue;
        const mate = isPartyRemote(r, partyOf);
        paintMinimapArrow(ctx, toX(r.x), toZ(r.z), r.yaw, {
          fill: mate ? '#ffe27a' : '#9ad7ff',
          stroke: mate ? '#6a4a10' : '#14343a',
          scale: mate ? 0.78 : 0.62,
        });
      }
    }
    ctx.fillStyle = '#ff4d4d';
    for (const m of monsters) {
      if (m.dead || (m.realm || 'over') !== (world.realm || 'over') || !inView(m.x, m.z)) continue;
      ctx.fillRect(toX(m.x) - 2, toZ(m.z) - 2, 4, 4);
      ctx.fillStyle = '#7a0f0f';
      ctx.fillRect(toX(m.x) - 1, toZ(m.z) - 1, 2, 2);
      ctx.fillStyle = '#ff4d4d';
    }
    paintMinimapArrow(ctx, toX(px), toZ(pz), yaw);
    const g = ctx.createRadialGradient(cv.width / 2, cv.height / 2, cv.width * 0.35, cv.width / 2, cv.height / 2, cv.width * 0.72);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cv.width, cv.height);
  }

  setArea(name) {
    if (this.el.area.textContent !== name) this.el.area.textContent = name;
  }

  openPanel(name, game, options = {}) {
    if (name === 'world' && !canCreateWorld(game.staffRole)) {
      this.toast('World Creator is for moderators.', 1800);
      return;
    }
    this.runCleanup();
    this.panelId = name;
    this.el.panel.classList.toggle('map-open', name === 'map');
    this.el.panel.classList.toggle('labels-off', name === 'map' && !this.mapLabels);
    const card = this.el.panel.querySelector('.panel-card');
    const wide = name === 'catalog' || name === 'forge' || name === 'skills' || name === 'gear' || name === 'bag' || name === 'spellbook' || name === 'stats' || name === 'market' || name === 'world' || name === 'map' || name === 'storage' || name === 'smithy' || name === 'carve' || name === 'quest';
    card?.classList.toggle('wide', wide);
    card?.classList.toggle('adventures', name === 'quest');
    card?.querySelectorAll(':scope > .mg-corner').forEach((n) => n.remove());
    if (name !== 'quest') decorateFrame(card);
    const body = this.el.panelBody;
    const title = this.el.panelTitle;
    body.innerHTML = '';
    const add = (html) => {
      const d = document.createElement('div');
      d.innerHTML = html;
      body.appendChild(d);
      return d;
    };
    if (name === 'map') {
      const inCave = game.world.realm === 'cave';
      const inRift = game.world.realm === 'rift';
      const instanced = inCave || inRift;
      title.textContent = inCave ? 'Darksycle Den' : inRift ? 'Waygate Rift' : 'Map';
      const c = document.createElement('canvas');
      c.className = 'bigmap';
      const src = inCave ? game.world.cave.minimap : inRift ? game.world.rift.minimap : game.world.minimapCanvas;
      c.width = instanced ? 240 : src.width;
      c.height = instanced ? 192 : src.height;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(src, 0, 0, c.width, c.height);
      const p = game.player;
      const ox = inCave ? game.world.cave.origin.x : inRift ? game.world.rift.origin.x : (game.world.minimapOrigin?.x || 0);
      const oz = inCave ? game.world.cave.origin.z : inRift ? game.world.rift.origin.z : (game.world.minimapOrigin?.z || 0);
      const mapScale = instanced ? 1 : (game.world.minimapScale || 1);
      const mx = (p.pos.x - ox) * mapScale * (c.width / src.width);
      const mz = (p.pos.z - oz) * mapScale * (c.height / src.height);
      if (!instanced) {
        ctx.fillStyle = '#c27bff';
        ctx.fillRect((GATE.x - ox) * mapScale - 3, (GATE.z - oz) * mapScale - 3, 6, 6);
        ctx.fillStyle = '#ffd23f';
        ctx.fillRect((GUILD.x - ox) * mapScale - 3, (GUILD.z - oz) * mapScale - 3, 6, 6);
      }
      const frame = document.createElement('div');
      frame.className = 'playmap' + (!this.mapLabels ? ' labels-off' : '');
      frame.style.setProperty('--map-w', String(c.width));
      frame.style.setProperty('--map-h', String(c.height));
      const fit = document.createElement('div');
      fit.className = 'playmap-fit';
      fit.appendChild(c);
      const playerPin = document.createElement('i');
      playerPin.className = 'playmap-player-pin';
      playerPin.title = 'Your position';
      playerPin.setAttribute('aria-label', 'Your position');
      playerPin.style.left = (mx / c.width * 100).toFixed(3) + '%';
      playerPin.style.top = (mz / c.height * 100).toFixed(3) + '%';
      fit.appendChild(playerPin);
      const mapPxX = mapScale * (c.width / src.width);
      const mapPxZ = mapScale * (c.height / src.height);
      for (const gate of visibleMonsterGates(game.world)) {
        const x = (gate.x - ox) * mapPxX;
        const z = (gate.z - oz) * mapPxZ;
        if (x < 0 || z < 0 || x > c.width || z > c.height) continue;
        const marker = document.createElement('i');
        marker.className = 'playmap-gate-pin';
        marker.title = gate.name || 'Monster Gate';
        marker.setAttribute('aria-label', gate.name || 'Monster Gate');
        marker.style.left = (x / c.width * 100).toFixed(3) + '%';
        marker.style.top = (z / c.height * 100).toFixed(3) + '%';
        fit.appendChild(marker);
      }
      const raw = inCave ? caveMapLabels(game.world.cave) : inRift ? [{ name: 'Tear', x: game.world.rift.arena.x, z: game.world.rift.arena.z }] : landMapLabels(game.world);
      const pins = raw.map((label) => ({
        ...label,
        nx: ((label.x - ox) * mapScale / src.width) * 100,
        ny: ((label.z - oz) * mapScale / src.height) * 100,
      }));
      const placed = layoutPlaymapLabels(pins);
      const leads = document.createElement('canvas');
      leads.className = 'playmap-leads';
      leads.width = 720;
      leads.height = Math.max(1, Math.round(720 * (src.height / src.width)));
      const lctx = leads.getContext('2d');
      lctx.strokeStyle = 'rgba(255, 248, 232, 0.55)';
      lctx.lineWidth = 1.2;
      for (const label of placed) {
        if (!label.visible || !label.lead) continue;
        lctx.beginPath();
        lctx.moveTo(label.ax / 100 * leads.width, label.ay / 100 * leads.height);
        lctx.lineTo(label.x / 100 * leads.width, label.y / 100 * leads.height);
        lctx.stroke();
      }
      fit.appendChild(leads);
      for (const label of placed) {
        if (!label.visible) continue;
        const b = document.createElement('b');
        b.className = 'playmap-label' + (label.city ? ' city' : label.kind === 'uncharted' ? ' uncharted' : label.kind === 'minor' ? ' minor' : ' landmark') + (label.side ? ' side-' + label.side : '');
        b.textContent = label.name;
        const atPin = !!label.side;
        b.style.left = (atPin ? label.ax : label.x).toFixed(2) + '%';
        b.style.top = (atPin ? label.ay : label.y).toFixed(2) + '%';
        fit.appendChild(b);
      }
      frame.appendChild(fit);
      const zoomControls = document.createElement('div');
      zoomControls.className = 'playmap-zoom-controls';
      zoomControls.setAttribute('aria-label', 'Map zoom controls');
      const zoomOut = document.createElement('button');
      zoomOut.type = 'button';
      zoomOut.textContent = '\u2212';
      zoomOut.setAttribute('aria-label', 'Zoom map out');
      const zoomIn = document.createElement('button');
      zoomIn.type = 'button';
      zoomIn.textContent = '+';
      zoomIn.setAttribute('aria-label', 'Zoom map in');
      zoomControls.append(zoomOut, zoomIn);
      frame.appendChild(zoomControls);

      const view = { scale: 1, x: 0, y: 0 };
      const pointers = new Map();
      let gestureCenter = null;
      let gestureDistance = 0;
      const applyMapView = () => {
        const maxX = Math.max(0, fit.offsetWidth * (view.scale - 1) / 2);
        const maxY = Math.max(0, fit.offsetHeight * (view.scale - 1) / 2);
        view.x = clamp(view.x, -maxX, maxX);
        view.y = clamp(view.y, -maxY, maxY);
        fit.style.transform = `translate3d(${view.x.toFixed(1)}px, ${view.y.toFixed(1)}px, 0) scale(${view.scale.toFixed(3)})`;
        fit.style.setProperty('--map-marker-scale', (1 / view.scale).toFixed(4));
        frame.classList.toggle('is-zoomed', view.scale > 1.001);
        zoomOut.disabled = view.scale <= 1.001;
        zoomIn.disabled = view.scale >= PLAYMAP_MAX_ZOOM - 0.001;
      };
      const zoomMap = (nextScale, clientX = null, clientY = null) => {
        const previous = view.scale;
        const next = clamp(nextScale, 1, PLAYMAP_MAX_ZOOM);
        if (Math.abs(next - previous) < 0.0001) return;
        if (clientX != null && clientY != null) {
          const rect = frame.getBoundingClientRect();
          const px = clientX - (rect.left + rect.width / 2) - view.x;
          const py = clientY - (rect.top + rect.height / 2) - view.y;
          const ratio = next / previous;
          view.x -= px * (ratio - 1);
          view.y -= py * (ratio - 1);
        }
        view.scale = next;
        applyMapView();
      };
      const pointPair = () => {
        const [a, b] = [...pointers.values()];
        if (!a || !b) return null;
        return {
          x: (a.x + b.x) / 2,
          y: (a.y + b.y) / 2,
          distance: Math.hypot(a.x - b.x, a.y - b.y),
        };
      };
      frame.addEventListener('wheel', (event) => {
        event.preventDefault();
        zoomMap(view.scale * Math.exp(-event.deltaY * 0.0018), event.clientX, event.clientY);
      }, { passive: false });
      frame.addEventListener('dblclick', (event) => {
        if (event.target.closest('.playmap-zoom-controls')) return;
        zoomMap(view.scale >= 8 ? 1 : view.scale * 2, event.clientX, event.clientY);
      });
      frame.addEventListener('pointerdown', (event) => {
        if (event.target.closest('.playmap-zoom-controls')) return;
        if (event.pointerType === 'touch') return;
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        try { frame.setPointerCapture(event.pointerId); } catch { /* capture is optional */ }
        const pair = pointPair();
        gestureCenter = pair ? { x: pair.x, y: pair.y } : { x: event.clientX, y: event.clientY };
        gestureDistance = pair?.distance || 0;
        event.preventDefault();
      });
      frame.addEventListener('pointermove', (event) => {
        if (event.pointerType === 'touch') return;
        const previous = pointers.get(event.pointerId);
        if (!previous) return;
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        const pair = pointPair();
        if (pair) {
          if (gestureDistance > 0) {
            zoomMap(
              view.scale * (pair.distance / gestureDistance),
              gestureCenter?.x ?? pair.x,
              gestureCenter?.y ?? pair.y,
            );
          }
          if (gestureCenter) {
            view.x += pair.x - gestureCenter.x;
            view.y += pair.y - gestureCenter.y;
          }
          gestureCenter = { x: pair.x, y: pair.y };
          gestureDistance = pair.distance;
          applyMapView();
        } else if (view.scale > 1.001) {
          view.x += event.clientX - previous.x;
          view.y += event.clientY - previous.y;
          gestureCenter = { x: event.clientX, y: event.clientY };
          applyMapView();
        }
        event.preventDefault();
      });
      const endMapPointer = (event) => {
        pointers.delete(event.pointerId);
        const pair = pointPair();
        if (pair) {
          gestureCenter = { x: pair.x, y: pair.y };
          gestureDistance = pair.distance;
        } else {
          const remaining = [...pointers.values()][0];
          gestureCenter = remaining ? { ...remaining } : null;
          gestureDistance = 0;
        }
      };
      frame.addEventListener('pointerup', endMapPointer);
      frame.addEventListener('pointercancel', endMapPointer);
      frame.addEventListener('lostpointercapture', endMapPointer);
      let touchCenter = null;
      let touchDistance = 0;
      const touchPair = (touches) => {
        if (touches.length < 2) return null;
        const a = touches[0];
        const b = touches[1];
        return {
          x: (a.clientX + b.clientX) / 2,
          y: (a.clientY + b.clientY) / 2,
          distance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
        };
      };
      frame.addEventListener('touchstart', (event) => {
        if (event.target.closest('.playmap-zoom-controls')) return;
        const pair = touchPair(event.touches);
        touchCenter = pair
          ? { x: pair.x, y: pair.y }
          : event.touches[0] ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
        touchDistance = pair?.distance || 0;
        event.preventDefault();
      }, { passive: false });
      frame.addEventListener('touchmove', (event) => {
        const pair = touchPair(event.touches);
        if (pair) {
          if (touchDistance > 0) {
            zoomMap(
              view.scale * (pair.distance / touchDistance),
              touchCenter?.x ?? pair.x,
              touchCenter?.y ?? pair.y,
            );
          }
          if (touchCenter) {
            view.x += pair.x - touchCenter.x;
            view.y += pair.y - touchCenter.y;
          }
          touchCenter = { x: pair.x, y: pair.y };
          touchDistance = pair.distance;
          applyMapView();
        } else if (event.touches.length === 1 && touchCenter && view.scale > 1.001) {
          const next = { x: event.touches[0].clientX, y: event.touches[0].clientY };
          view.x += next.x - touchCenter.x;
          view.y += next.y - touchCenter.y;
          touchCenter = next;
          applyMapView();
        }
        event.preventDefault();
      }, { passive: false });
      const endMapTouch = (event) => {
        const pair = touchPair(event.touches);
        touchCenter = pair
          ? { x: pair.x, y: pair.y }
          : event.touches[0] ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
        touchDistance = pair?.distance || 0;
      };
      frame.addEventListener('touchend', endMapTouch, { passive: false });
      frame.addEventListener('touchcancel', endMapTouch, { passive: false });
      zoomOut.addEventListener('click', () => zoomMap(view.scale / 1.6));
      zoomIn.addEventListener('click', () => zoomMap(view.scale * 1.6));
      applyMapView();
      body.appendChild(frame);
      if (!instanced) {
        if (game.world.waygate) {
          ctx.fillStyle = '#7ef6ff';
          ctx.fillRect(game.world.waygate.x - ox - 2, game.world.waygate.z - oz - 2, 5, 5);
        }
        ctx.fillStyle = '#5aa8d4';
        for (const p of game.world.teleports || []) {
          ctx.fillRect(p.x - ox - 1.5, p.z - oz - 1.5, 3, 3);
          ctx.fillStyle = '#1d4a66';
          ctx.fillRect(p.x - ox - 0.5, p.z - oz - 0.5, 1, 1);
          ctx.fillStyle = '#5aa8d4';
        }
        if (game.world.smithy) {
          ctx.fillStyle = '#e07030';
          ctx.fillRect(game.world.smithy.x - ox - 2, game.world.smithy.z - oz - 2, 5, 4);
        }
        ctx.fillStyle = '#ff9a3c';
        ctx.fillRect(MINE.x - ox - 2, MINE.z - oz - 2, 5, 5);
        ctx.fillStyle = '#4ec8ff';
        ctx.fillRect(LAKE.x - ox - 2, LAKE.z - oz - 2, 5, 5);
      }
      add(inCave
        ? '<p style="margin:10px 0 0;font-size:13px;color:#aab">The Darksycle Den, under the bluff in Southford. Walk back down the tunnel to return to the vale. Green pulse: you.</p>'
        : inRift
          ? '<p style="margin:10px 0 0;font-size:13px;color:#aab">A waygate tear. Clear the waves, open the chest in the middle, then walk south to leave. Green pulse: you.</p>'
          : '<p class="playmap-hint" style="margin:10px 0 0;font-size:13px;color:#aab">Wheel or pinch to zoom; drag to move. Green pulse: you. Gold names are towns and cities. Gold square: Hunter Guild. Red pulse: Monster Gate. Cyan: the Waygate. Blue square: a teleportation portal. Ember: the smithy. L hides names.</p>');
    } else if (name === 'quest') {
      title.textContent = '';
      this.cleanup = mountJournal(body, game);
    } else if (name === 'bag') {
      title.textContent = options.assignSlot == null ? 'Inventory' : `Choose Item · Hotbar ${options.assignSlot + 1}`;
      this.cleanup = mountBag(body, game, {
        assignSlot: options.assignSlot,
        onAssign: (item, sourceSlot) => {
          if (!game.assignHotbarItem(options.assignSlot, item, sourceSlot)) return;
          this.closePanel();
          this.toast(`${item.name} assigned to hotbar slot ${options.assignSlot + 1}.`);
        },
      });
    } else if (name === 'storage') {
      title.textContent = 'Storage Crate';
      this.cleanup = mountStorage(body, game);
    } else if (name === 'gear') {
      title.textContent = 'Character';
      this.cleanup = mountGear(body, game);
    } else if (name === 'tome') {
      title.textContent = 'Teleportation Tome';
      this.cleanup = mountTeleport(body, game);
    } else if (name === 'spellbook') {
      title.textContent = 'Skill & Spell Book';
      this.cleanup = mountSpellbook(body, game);
    } else if (name === 'world') {
      title.textContent = 'World Map';
      this.cleanup = mountWorldMap(body, game);
    } else if (name === 'friends') {
      title.textContent = 'Friends';
      this.cleanup = mountFriends(body, game);
    } else if (name === 'stats') {
      title.textContent = 'Hunter Stats';
      this.cleanup = mountStats(body, game, game.statsFocus);
      game.statsFocus = null;
    } else if (name === 'market') {
      title.textContent = "Dalla's Market";
      this.cleanup = mountMarket(body, game);
    } else if (name === 'catalog') {
      title.textContent = 'Hunter Catalog';
      this.cleanup = game.catalog.mount(body);
    } else if (name === 'forge') {
      title.textContent = 'The Forge';
      this.cleanup = game.catalog.mount(body, { forge: true });
    } else if (name === 'smithy') {
      title.textContent = 'The Smithy';
      this.cleanup = mountSmithy(body, game);
    } else if (name === 'carve') {
      title.textContent = 'Carving Knife';
      this.cleanup = mountCarve(body, game);
    } else if (name === 'skills') {
      title.textContent = 'Skill Tree';
      this.cleanup = mountSkillTree(body, game);
    } else if (name === 'alchemy') {
      title.textContent = "Lira's Alchemy";
      const paint = () => {
        body.innerHTML = '';
        const intro = document.createElement('p');
        intro.className = 'alc-intro';
        intro.innerHTML = '<b>Lira the Alchemist</b>Healing draughts for the cuts, spirit philters for the bolt. Gold on the counter.';
        body.appendChild(intro);
        const gold = document.createElement('p');
        gold.className = 'alc-gold';
        gold.textContent = `Your gold: ${game.gold}`;
        body.appendChild(gold);
        for (const it of game.items) {
          const offer = POTION_SHOP[it.id];
          if (!offer) continue;
          const row = document.createElement('div');
          row.className = 'alc-row';
          const cv = document.createElement('canvas');
          cv.width = 16;
          cv.height = 16;
          cv.getContext('2d').drawImage(iconCanvas(it.icon), 0, 0);
          row.appendChild(cv);
          const info = document.createElement('div');
          info.className = 'alc-info';
          const have = it.count | 0;
          const full = have >= offer.max;
          info.innerHTML = `<b>${it.name}</b><span>${it.desc}</span><small>Carried ${have}/${offer.max}</small>`;
          row.appendChild(info);
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'alc-buy';
          b.textContent = full ? 'Full' : `Buy  ${offer.price}g`;
          b.disabled = full || game.gold < offer.price;
          b.onclick = () => {
            if (game.buyPotion(it.id)) paint();
          };
          row.appendChild(b);
          body.appendChild(row);
        }
      };
      paint();
    } else if (name === 'waygate') {
      title.textContent = 'Waygate';
      const saved = (localStorage.getItem('mg-name') || 'Hunter').replace(/[<>"&]/g, '').slice(0, 16);
      add(`<p id="wg-status" style="color:#cfe"></p>
        <div id="wg-rift">
          <button id="wg-rift-enter" class="wg-btn" type="button">Enter a rift</button>
          <p id="wg-rift-note" style="color:#99a;font-size:13px">A short instanced hunt. Waves scale with the party. Guests can enter solo. Host and join stay account-only.</p>
        </div>
        <div id="wg-lobby">
          <label class="wg-label">Your name</label>
          <input id="wg-name" class="wg-input" maxlength="16" value="${saved.replace(/"/g, '')}" />
          <button id="wg-host" class="wg-btn" type="button">Host a world</button>
          <label class="wg-label">Friend's code</label>
          <div class="wg-row">
            <input id="wg-join-code" class="wg-input" maxlength="4" placeholder="CODE" />
            <button id="wg-join" class="wg-btn" type="button">Join</button>
          </div>
          <p style="color:#99a;font-size:13px">The host's browser runs the world. Up to 6 hunters. Share the code with friends at their own waygate. Sign in with an account to host or join.</p>
        </div>
        <div id="wg-session" class="hidden">
          <div class="wg-label">World code</div>
          <b id="wg-code" class="wg-code"></b>
          <div class="wg-row">
            <button id="wg-copy" class="wg-btn" type="button">Copy code</button>
            <button id="wg-leave" class="wg-btn" type="button">Close waygate</button>
          </div>
          <div class="wg-label" id="wg-count"></div>
          <ul id="wg-players"></ul>
        </div>`);
      const nameInput = document.getElementById('wg-name');
      nameInput?.addEventListener('change', () => localStorage.setItem('mg-name', nameInput.value.slice(0, 16)));
      document.getElementById('wg-rift-enter').onclick = () => game.enterRiftFromGate();
      document.getElementById('wg-host').onclick = () => game.net.host(document.getElementById('wg-name').value);
      document.getElementById('wg-join').onclick = () => game.net.join(document.getElementById('wg-name').value, document.getElementById('wg-join-code').value);
      document.getElementById('wg-copy').onclick = () => {
        const code = game.net.code;
        if (!code) return;
        navigator.clipboard?.writeText(code).then(
          () => game.hud.toast('Code copied', 1200),
          () => game.hud.toast(code, 2000)
        );
      };
      document.getElementById('wg-leave').onclick = () => game.net.leave();
      game.refreshWaygate();
    } else if (name === 'settings') {
      title.textContent = 'Settings';
      const jumps = document.createElement('div');
      jumps.className = 'set-jumps';
      const jumpsList = [
        ['tome', 'Teleportation Tome', 'Travel to a remembered place'],
        ['friends', 'Friends', 'Friends list and party'],
        ['gear', 'Character', 'Equipped and unequipped'],
        ['bag', 'Inventory', 'Bag, tools and goods'],
      ];
      if (canCreateWorld(game.staffRole)) {
        jumpsList.push(['world', 'World Creator', '100-tile map']);
      }
      for (const [id, label, sub] of jumpsList) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'set-jump';
        b.innerHTML = `<b>${label}</b><small>${sub}</small>`;
        b.onclick = () => this.openPanel(id, game);
        jumps.appendChild(b);
      }
      body.appendChild(jumps);
      add(`<section class="set-hotbar-controls" aria-label="Hotbar controls">
        <h3>Hotbar controls</h3>
        <p>Lock a bar to prevent accidental long-press assignment or changes.</p>
        <div class="panel-row"><span>Lock skill hot buttons</span><button id="set-skill-lock" type="button" aria-pressed="${readHotbarLocked() ? 'true' : 'false'}">${readHotbarLocked() ? 'Locked' : 'Unlocked'}</button></div>
        <div class="panel-row"><span>Lock item hotbar</span><button id="set-item-hotbar-lock" type="button" aria-pressed="${readItemHotbarLocked() ? 'true' : 'false'}">${readItemHotbarLocked() ? 'Locked' : 'Unlocked'}</button></div>
      </section>`);
      const q = game.quality;
      const liveSearch = typeof location !== 'undefined' ? location.search : '';
      const rows = [
        ['Switch world', '<span class="world-switch"><button id="set-world1" type="button">World 1</button><button id="set-world-solo" type="button">Solo</button></span>'],
        ['Graphics quality', `<span class="gfx-switch">${QUALITIES.map((item) => `<button type="button" class="gfx-opt${item.id === q.id ? ' on' : ''}" data-q="${item.id}">${item.label}</button>`).join('')}</span>`],
        ['Build', `<b id="set-build">${BUILD_ID}</b>`],
        ...(game.debug && !game.mmo && !game.worldView
          ? [
              ['Debug session', '<b id="set-debug-flag">DEBUG</b>'],
              ['Spawn monster', '<button id="set-spawn">Spawn</button>'],
              ['Spawn tanky monster (debug)', '<button id="set-spawn-tank">Spawn tank</button>'],
              ['Auto-attack (debug)', `<button id="set-autoatk">${game.debug.autoAttack ? 'On' : 'Off'}</button>`],
            ]
          : []),
        ['Sound', `<button id="set-snd">${game.audio.enabled ? 'On' : 'Off'}</button>`],
        ['Time of day', `<button id="set-time">Skip +3h</button>`],
        ['Fullscreen', `<button id="set-fs">Toggle</button>`],
        ['Weapon cursor', `<button id="set-wcur">${weaponCursorEnabled() ? 'On' : 'Off'}</button>`],
        ['Strafing', `<button id="set-strafe" aria-pressed="${game.input.strafe ? 'true' : 'false'}">${game.input.strafe ? 'On' : 'Off'}</button>`],
        ['Account save', `<b id="set-cloud">${game.cloudStatusText?.() || ''}</b>`],
        ['Import old saves', '<button id="set-import-old">Open</button>'],
      ];
      rows.forEach(([a, b]) => add(`<div class="panel-row"><span>${a}</span>${b}</div>`));
      if (game.wallet?.kind === 'email') mountWalletSettings(body, game);
      if (game.wallet?.address) {
        const row = document.createElement('div');
        row.className = 'panel-row account';
        const label = document.createElement('span');
        const who = document.createElement('small');
        who.textContent = game.wallet.email || shortAddress(game.wallet.address);
        label.append('Log out', who);
        const out = document.createElement('button');
        out.id = 'set-out';
        out.type = 'button';
        out.textContent = 'Log out';
        out.onclick = () => game.signOut(false);
        const actions = document.createElement('div');
        actions.className = 'account-actions';
        const select = document.createElement('button');
        select.id = 'set-character-select';
        select.type = 'button';
        select.textContent = 'Return to character selection';
        select.onclick = () => game.returnToCharacterSelect?.();
        actions.append(select, out);
        row.append(label, actions);
        body.appendChild(row);
      }
      add('<p class="panel-help">WASD move · Click attack · Shift shield · Space or right-click evade · Round buttons 1 2 3 (Z X V). An empty 1 is Spirit Bolt and an empty 3 is Fury. Skills you place on 1, 2, or 3 show on those buttons. E character · B inventory · G skill book · K skill tree · H stats · P friends · T settings · 1-9 and 0 items · F talk, mine, fish, or chop · C catalog · [ ] or R rotate · wheel zoom.</p>');
      const statsBtn = document.getElementById('set-stats');
      if (statsBtn) statsBtn.onclick = () => this.openPanel('stats', game);
      const catBtn = document.getElementById('set-cat');
      if (catBtn) catBtn.onclick = () => this.openPanel('catalog', game);
      const skillLock = document.getElementById('set-skill-lock');
      if (skillLock) skillLock.onclick = () => {
        const locked = !this.hotbarLocked;
        this.hotbarLocked = locked;
        writeHotbarLocked(locked);
        skillLock.textContent = locked ? 'Locked' : 'Unlocked';
        skillLock.setAttribute('aria-pressed', locked ? 'true' : 'false');
        this.updateSkillbar(game);
        this.toast(locked ? 'Skill hot buttons locked.' : 'Skill hot buttons unlocked.', 1400);
      };
      const itemHotbarLock = document.getElementById('set-item-hotbar-lock');
      if (itemHotbarLock) itemHotbarLock.onclick = () => {
        this.itemHotbarLocked = !this.itemHotbarLocked;
        writeItemHotbarLocked(this.itemHotbarLocked);
        itemHotbarLock.textContent = this.itemHotbarLocked ? 'Locked' : 'Unlocked';
        itemHotbarLock.setAttribute('aria-pressed', this.itemHotbarLocked ? 'true' : 'false');
        this.slots.forEach(({ b }) => b.classList.toggle('hotbar-locked', this.itemHotbarLocked));
        this.toast(this.itemHotbarLocked ? 'Item hotbar locked.' : 'Item hotbar unlocked.', 1400);
      };
      const skillBtn = document.getElementById('set-skills');
      if (skillBtn) skillBtn.onclick = () => this.openPanel('skills', game);
      const gearBtn = document.getElementById('set-gear');
      if (gearBtn) gearBtn.onclick = () => this.openPanel('gear', game);
      const bagBtn = document.getElementById('set-bag');
      if (bagBtn) bagBtn.onclick = () => this.openPanel('bag', game);
      const bookBtn = document.getElementById('set-book');
      if (bookBtn) bookBtn.onclick = () => this.openPanel('spellbook', game);
      body.querySelectorAll('.gfx-opt').forEach((btn) => {
        btn.onclick = () => {
          game.setQuality(btn.dataset.q);
          body.querySelectorAll('.gfx-opt').forEach((el) => {
            el.classList.toggle('on', el.dataset.q === game.quality.id);
          });
        };
      });
      document.getElementById('set-snd').onclick = () => {
        game.audio.toggle();
        document.getElementById('set-snd').textContent = game.audio.enabled ? 'On' : 'Off';
      };
      document.getElementById('set-time').onclick = () => game.sky.setHour(game.sky.hour + 3);
      document.getElementById('set-fs').onclick = () => game.toggleFullscreen();
      document.getElementById('set-wcur').onclick = () => {
        setWeaponCursorEnabled(!weaponCursorEnabled());
        applyWeaponCursor(game);
        document.getElementById('set-wcur').textContent = weaponCursorEnabled() ? 'On' : 'Off';
      };
      document.getElementById('set-strafe').onclick = () => {
        game.input.strafe = writeStrafeSetting(!game.input.strafe);
        const btn = document.getElementById('set-strafe');
        btn.textContent = game.input.strafe ? 'On' : 'Off';
        btn.setAttribute('aria-pressed', game.input.strafe ? 'true' : 'false');
      };
      document.getElementById('set-import-old').onclick = () => game.importOldSaves();
      const worldBtn = document.getElementById('set-world1');
      paintWorldPlayButton(worldBtn, { search: liveSearch, short: true });
      worldBtn?.addEventListener('click', () => onWorldPlayClick({
        search: liveSearch,
        onNeedSignIn: () => game.openSocialSignIn?.(),
      }));
      document.getElementById('set-world-solo')?.addEventListener('click', () => {
        if (isWorldOnline(liveSearch)) leaveOnlineWorld({ search: liveSearch });
      });
      paintWorldModePill(document.getElementById('world-mode-pill'), { search: liveSearch });
      document.getElementById('set-spawn')?.addEventListener('click', () => game.debugSpawn?.());
      document.getElementById('set-spawn-tank')?.addEventListener('click', () => game.debugSpawnTank?.());
      document.getElementById('set-autoatk')?.addEventListener('click', () => {
        const on = !game.debug?.autoAttack;
        game.setDebugAutoAttack?.(on);
        const btn = document.getElementById('set-autoatk');
        if (btn) btn.textContent = game.debug?.autoAttack ? 'On' : 'Off';
      });
    }
    this.el.panel.classList.remove('hidden');
    this.syncWindows();
  }
  runCleanup() {
    const fn = this.cleanup;
    this.cleanup = null;
    if (fn) fn();
  }
  closePanel() {
    this.runCleanup();
    this.panelId = null;
    this.journalRefresh = null;
    this.el.panel.querySelector('.panel-card')?.classList.remove('adventures', 'wide');
    this.el.panel.classList.remove('map-open', 'labels-off');
    this.el.panel.classList.add('hidden');
    this.syncWindows();
  }
  get panelOpen() {
    return !this.el.panel.classList.contains('hidden');
  }

  setMapLabels(on) {
    this.mapLabels = !!on;
    this.el.panel?.classList.toggle('labels-off', this.panelId === 'map' && !this.mapLabels);
    this.el.panel?.querySelector('.playmap')?.classList.toggle('labels-off', !this.mapLabels);
    document.body.classList.toggle('map-labels-off', !this.mapLabels);
  }

  openSkillPicker(game, slot) {
    if (this.hotbarLocked || !game?.progress) return false;
    this.closeSkillPicker();
    const skills = availableHotbarSkills(game.progress);
    const overlay = document.createElement('div');
    overlay.className = 'skill-hotbar-picker';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', `Choose skill for button ${slot + 1}`);
    const card = document.createElement('div');
    card.className = 'skill-hotbar-picker-card';
    const heading = document.createElement('div');
    heading.className = 'skill-hotbar-picker-heading';
    const title = document.createElement('b');
    title.textContent = `Assign skill · Button ${slot + 1}`;
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'skill-hotbar-picker-close';
    close.textContent = '×';
    close.setAttribute('aria-label', 'Close skill picker');
    close.addEventListener('click', () => this.closeSkillPicker());
    heading.append(title, close);
    const hint = document.createElement('p');
    hint.textContent = skills.length ? 'Choose an unlocked active or special skill.' : 'Learn an active or special skill in the Skill Tree first.';
    const list = document.createElement('div');
    list.className = 'skill-hotbar-picker-list';
    const addChoice = (skill) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'skill-hotbar-choice';
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      paintSkillIcon(canvas, skill.shape, skill.color, skill);
      const copy = document.createElement('span');
      const name = document.createElement('b');
      name.textContent = skill.name;
      const detail = document.createElement('small');
      detail.textContent = `${skill.pathName} · ${skill.kind === 'special' ? 'Special' : 'Active'} · ${skill.res}`;
      copy.append(name, detail);
      button.append(canvas, copy);
      button.addEventListener('click', () => {
        if (game.equipSkill(slot, skill.id)) {
          this.closeSkillPicker();
          this.toast(`${skill.name} assigned to button ${slot + 1}.`, 1400);
        }
      });
      list.appendChild(button);
    };
    for (const skill of skills) addChoice(skill);
    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'skill-hotbar-clear';
    clear.textContent = 'Clear this button';
    clear.addEventListener('click', () => {
      game.equipSkill(slot, null);
      this.closeSkillPicker();
    });
    card.append(heading, hint, list, clear);
    overlay.appendChild(card);
    overlay.addEventListener('pointerdown', (event) => {
      if (event.target === overlay) this.closeSkillPicker();
    });
    this.skillPicker = overlay;
    document.body.appendChild(overlay);
    close.focus();
    this.syncWindows();
    return true;
  }

  closeSkillPicker() {
    this.skillPicker?.remove();
    this.skillPicker = null;
    this.syncWindows();
  }

  updateSkillbar(game) {
    if (!game?.progress || !game.player) return;
    const eq = game.progress.equipped();
    const locked = this.hotbarLocked;
    const keys = ['Z', 'X', 'V'];
    const fallback = ['Spirit Bolt', 'Empty', 'Fury'];
    const rightIds = ['tb-bolt', 'tb-skill', 'tb-fury'];
    const casts = [...document.querySelectorAll('#cast-buttons .cast')];
    // Keep handlers bound once, but refresh their references when the game/HUD is recreated.
    casts.forEach((el, i) => { el._skillPickerContext = { hud: this, game }; });
    rightIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el._skillPickerContext = { hud: this, game };
    });
    if (!document.body.dataset.skillsWired) {
      document.body.dataset.skillsWired = '1';
      const armLongPress = (el, i) => {
        let holdTimer = 0;
        let held = false;
        let pointerId = null;
        let startX = 0;
        let startY = 0;
        const cancel = (event) => {
          if (pointerId != null && event?.pointerId != null && event.pointerId !== pointerId) return;
          if (holdTimer) clearTimeout(holdTimer);
          holdTimer = 0;
          el.classList.remove('hold-arming');
          if (pointerId != null && el.hasPointerCapture?.(pointerId)) {
            try { el.releasePointerCapture(pointerId); } catch { /* pointer already ended */ }
          }
          pointerId = null;
        };
        el.addEventListener('pointerdown', (event) => {
          if (event.button !== undefined && event.button !== 0) return;
          const context = el._skillPickerContext;
          if (!context || context.hud.hotbarLocked) return;
          held = false;
          pointerId = event.pointerId;
          startX = event.clientX;
          startY = event.clientY;
          try { el.setPointerCapture(pointerId); } catch { /* capture is optional */ }
          el.classList.add('hold-arming');
          el.style.setProperty('--hold-ms', `${HOTBAR_HOLD_MS}ms`);
          holdTimer = setTimeout(() => {
            holdTimer = 0;
            held = true;
            el.classList.remove('hold-arming');
            el.dataset.skillPickerConsumed = '1';
            const current = el._skillPickerContext;
            if (current && !current.hud.hotbarLocked) current.hud.openSkillPicker(current.game, i);
          }, HOTBAR_HOLD_MS);
        });
        el.addEventListener('pointermove', (event) => {
          if (holdTimer && pointerId === event.pointerId
            && Math.hypot(event.clientX - startX, event.clientY - startY) > 18) cancel(event);
        });
        el.addEventListener('pointerup', cancel);
        el.addEventListener('pointercancel', cancel);
        el.addEventListener('lostpointercapture', cancel);
        el.addEventListener('contextmenu', (event) => {
          if (held || holdTimer) event.preventDefault();
        });
        el.addEventListener('click', (event) => {
          if (el.dataset.skillPickerConsumed === '1') {
            delete el.dataset.skillPickerConsumed;
            event.preventDefault();
            event.stopImmediatePropagation();
          }
        }, true);
      };
      const accept = (el, i) => {
        el.addEventListener('dragover', (e) => e.preventDefault());
        el.addEventListener('drop', (e) => {
          e.preventDefault();
          const context = el._skillPickerContext;
          if (!context) return;
          const { game: currentGame } = context;
          const id = (e.dataTransfer.getData('text/plain') || '').replace(/^skill:/, '');
          if (SKILLS[id]) currentGame.equipSkill(i, id);
          if (currentGame.hud.panelId === 'spellbook' || currentGame.hud.panelId === 'skills') currentGame.hud.openPanel(currentGame.hud.panelId, currentGame);
        });
      };
      casts.forEach((b, i) => {
        b.addEventListener('click', () => b._skillPickerContext?.game?.castSlot(i));
        armLongPress(b, i);
        accept(b, i);
      });
      rightIds.forEach((id, i) => {
        const el = document.getElementById(id);
        if (el) { armLongPress(el, i); accept(el, i); }
      });
    }
    const paintCanvas = (canvas, skill, i) => {
      if (!canvas) return;
      const id = eq[i] || '';
      if (canvas.dataset.sid === id) return;
      canvas.dataset.sid = id;
      if (skill) paintSkillIcon(canvas, skill.shape, skill.color, skill);
      else {
        canvas.width = 16;
        canvas.height = 16;
        canvas.style.imageRendering = '';
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, 16, 16);
        const fb = i === 0 ? 'bolt' : i === 2 ? 'fury' : '';
        if (fb) ctx.drawImage(iconCanvas(fb), 0, 0);
      }
    };
    for (let i = 0; i < 3; i++) {
      const skill = eq[i] && SKILLS[eq[i]];
      const cd = skill ? game.player.cds[skill.id] || 0 : 0;
      const max = skill?.cd || 1;
      const frac = cd > 0 ? Math.min(1, cd / max) : 0;
      const title = skill ? `${skill.name} (${keys[i]})` : `${fallback[i]} (${keys[i]})`;
      const cast = casts[i];
      if (cast) {
        cast.classList.toggle('skill-locked', locked);
        paintCanvas(cast.querySelector('canvas'), skill, i);
        cast.classList.toggle('on', !!skill);
        cast.classList.toggle('cd', frac > 0);
        cast.style.setProperty('--cd', String(frac));
        cast.style.borderColor = skill ? skill.color : '';
        cast.title = title;
        const small = cast.querySelector('small');
        if (small) small.textContent = keys[i];
      }
      const touch = document.getElementById(rightIds[i]);
      if (touch) {
        touch.classList.toggle('skill-locked', locked);
        let cv = touch.querySelector('canvas');
        if (!cv) {
          cv = document.createElement('canvas');
          cv.className = 'skico';
          touch.appendChild(cv);
        }
        paintCanvas(cv, skill, i);
        touch.classList.toggle('has-skill', !!skill);
        touch.classList.toggle('cd', frac > 0);
        touch.style.setProperty('--cd', String(frac));
        touch.style.borderColor = skill ? skill.color : '';
        touch.title = title;
      }
    }
  }
}

export { TOWN, stackNameplates };

/** Close inventory, bank, shop, and every other #panel overlay. */
export function bindPanelClose(btn, onClose) {
  if (!btn || btn.dataset.closeBound === '1' || typeof onClose !== 'function') return btn;
  btn.dataset.closeBound = '1';
  const go = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    onClose(e);
  };
  btn.addEventListener('pointerup', go);
  btn.addEventListener('click', go);
  btn.addEventListener('touchend', go, { passive: false });
  return btn;
}


function mountMarket(body, game) {
  const pr = game.progress;
  const paint = () => {
    body.innerHTML = '';
    const intro = document.createElement('p');
    intro.className = 'alc-intro mk-intro';
    intro.innerHTML = "<b>Dalla's Market</b>Fresh ore, fish and timber are always welcome. I will buy what the pit, the lake and the woods give you.";
    body.appendChild(intro);
    const gold = document.createElement('p');
    gold.className = 'alc-gold';
    gold.textContent = `Your gold: ${game.gold}`;
    body.appendChild(gold);
    let total = 0;
    let any = false;
    for (const g of Object.values(GOODS)) {
      if (isUnsellableGood(g)) continue;
      const n = pr.good(g.id);
      total += n * g.price;
      if (!n) continue;
      any = true;
      const row = document.createElement('div');
      row.className = 'alc-row';
      const holder = document.createElement('div');
      holder.className = 'mk-thumb';
      const cv = renderThumb({ kind: 'good', id: g.id }, 96);
      holder.appendChild(cv);
      row.appendChild(holder);
      const info = document.createElement('div');
      info.className = 'alc-info';
      info.innerHTML = `<b>${g.name}</b><span>${g.desc}</span><small>Carried ${n} · ${g.price}g each</small>`;
      row.appendChild(info);
      const col = document.createElement('div');
      col.className = 'mk-btns';
      const one = document.createElement('button');
      one.type = 'button';
      one.className = 'alc-buy';
      one.textContent = `Sell 1  ${g.price}g`;
      one.onclick = () => {
        if (game.sellGood(g.id, 1)) paint();
      };
      col.appendChild(one);
      if (n > 1) {
        const all = document.createElement('button');
        all.type = 'button';
        all.className = 'alc-buy';
        all.textContent = `Sell ${n}  ${n * g.price}g`;
        all.onclick = () => {
          if (game.sellGood(g.id, n)) paint();
        };
        col.appendChild(all);
      }
      row.appendChild(col);
      body.appendChild(row);
    }
    if (!any) {
      const p = document.createElement('p');
      p.className = 'bag-empty';
      p.textContent = 'You have nothing to sell. Mine the Greyrock Pit, fish Mirrormere, or chop birch, oak and maple west of town.';
      body.appendChild(p);
    } else {
      const all = document.createElement('button');
      all.type = 'button';
      all.className = 'alc-buy mk-all';
      all.textContent = `Sell everything  ${total}g`;
      all.onclick = () => {
        if (game.sellAllGoods()) paint();
      };
      body.appendChild(all);
    }
    flushThumbs(240);
  };
  paint();
  return () => {};
}
