import { iconCanvas, iconURL, heartCanvas } from './icons.js';
import { GOODS } from '../data/gathering.js';
import { mountStats } from './stats.js';
import { mountWorldMap } from './worldmap.js';
import { clamp } from '../engine/voxel.js';
import { GATE, GUILD, LAKE, MINE, TOWN } from '../world/terrain.js';
import { CAVE_MOUTH } from '../world/southford.js';
import { SKILLS } from '../data/skills.js';
import { mountSkillTree, paintSkillIcon } from './skilltree.js';
import { mountGear } from './gear.js';
import { mountBag } from './bag.js';
import { mountStorage } from './storage.js';
import { flushThumbs, renderThumb } from './catalog.js';
import { mountSpellbook } from './spellbook.js';
import { mountTeleport } from './teleport.js';
import { shortAddress } from '../wallet/klever.js';

export const ITEMS = [
  { id: 'blade', icon: 'blade', name: 'Hunter Blade', kind: 'melee', style: 'swordshield', dmg: 9, reach: 2.4, arc: 2.0, dur: 0.4, hit: 0.17, stam: 9, knock: 4.5, held: 'blade', desc: 'Sword and shield. Hold Shift to block.' },
  { id: 'pick', icon: 'pick', name: 'Iron Pickaxe', kind: 'melee', dmg: 6, reach: 2.2, arc: 1.6, dur: 0.34, hit: 0.14, stam: 6, knock: 3, held: 'pick', desc: 'Quick swings, light damage.' },
  { id: 'axe', icon: 'axe', name: 'Woodcutter Axe', kind: 'melee', style: 'twohand', dmg: 8, reach: 2.3, arc: 1.8, dur: 0.44, hit: 0.2, stam: 9, knock: 4, held: 'axe', desc: 'Two-handed chops.' },
  { id: 'hammer', icon: 'hammer', name: 'Stone Hammer', kind: 'melee', style: 'twohand', dmg: 15, reach: 2.4, arc: 2.3, dur: 0.7, hit: 0.34, stam: 16, knock: 8, held: 'hammer', desc: 'A two-handed hammer. Slow, bone-shaking blows.' },
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

export class HUD {
  constructor() {
    const $ = (id) => document.getElementById(id);
    this.el = {
      hud: $('hud'), hearts: $('hearts'), stamina: $('stamina-fill'), hotbar: $('hotbar'),
      orbL: $('orb-left'), orbR: $('orb-right'), clock: $('clock-text'), toast: $('toast'),
      banner: $('banner'), bannerMain: $('banner-main'), bannerSub: $('banner-sub'),
      minimap: $('minimap'), nameplates: $('nameplates'), damage: $('damage-layer'),
      qText: $('q-text'), qCount: $('q-count'), qFill: $('q-fill'), gold: $('gold'), rank: $('rank'),
      dialog: $('dialog'), dlgName: $('dlg-name'), dlgText: $('dlg-text'),
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

    document.querySelectorAll('.mbtn .ico').forEach((n) => {
      const cls = [...n.classList].find((c) => c !== 'ico');
      if (cls) n.style.backgroundImage = `url(${iconURL(cls === 'rot' ? 'rot' : cls)})`;
    });
    document.querySelectorAll('.tbtn .ico').forEach((n) => {
      const cls = [...n.classList].find((c) => c !== 'ico');
      if (cls) n.style.backgroundImage = `url(${iconURL(cls)})`;
    });
    $('btn-fs').style.backgroundImage = `url(${iconURL('fs')})`;
    $('btn-snd').style.backgroundImage = `url(${iconURL('snd')})`;
  }

  buildHotbar(items, onSelect) {
    this.el.hotbar.innerHTML = '';
    this.slots = [];
    items.forEach((it, i) => {
      const b = document.createElement('button');
      b.className = 'slot';
      b.setAttribute('aria-label', it.name);
      const cv = document.createElement('canvas');
      cv.width = 16;
      cv.height = 16;
      cv.getContext('2d').drawImage(iconCanvas(it.icon), 0, 0);
      b.appendChild(cv);
      const key = document.createElement('span');
      key.className = 'key';
      key.textContent = i > 9 ? '' : i === 9 ? '0' : String(i + 1);
      b.appendChild(key);
      const cnt = document.createElement('span');
      cnt.className = 'cnt';
      b.appendChild(cnt);
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect(i);
      });
      this.el.hotbar.appendChild(b);
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

  toast(msg, ms = 2200) {
    this.el.toast.textContent = msg;
    this.el.toast.classList.add('show');
    clearTimeout(this.toastT);
    this.toastT = setTimeout(() => this.el.toast.classList.remove('show'), ms);
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
    this.el.dialog.classList.remove('hidden');
  }
  hideDialog() {
    this.el.dialog.classList.add('hidden');
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
      p.className = 'nameplate ' + cls;
      this.el.nameplates.appendChild(p);
      p.dataset.h = '';
      this.plates.set(id, p);
    }
    if (p.dataset.h !== html) {
      p.innerHTML = html;
      p.dataset.h = html;
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
  placePlate(id, x, y, visible) {
    const p = this.plates.get(id);
    if (!p) return;
    if (!visible) {
      if (p.style.display !== 'none') p.style.display = 'none';
      return;
    }
    p.style.display = '';
    p.style.left = x.toFixed(0) + 'px';
    p.style.top = y.toFixed(0) + 'px';
  }

  drawMinimap(world, px, pz, yaw, monsters, npcs, time, remotes = null) {
    const ctx = this.mctx;
    const cv = this.el.minimap;
    const N = 44;
    const sc = cv.width / N;
    ctx.fillStyle = '#0d1116';
    ctx.fillRect(0, 0, cv.width, cv.height);
    const cave = world.realm === 'cave' ? world.cave : null;
    const origin = cave ? cave.origin : (world.minimapOrigin || { x: 0, z: 0 });
    const sx = Math.round(px - origin.x - N / 2);
    const sz = Math.round(pz - origin.z - N / 2);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(cave ? cave.minimap : world.minimapCanvas, sx, sz, N, N, 0, 0, cv.width, cv.height);
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
      const pulse = 4 + Math.sin(time * 4) * 1.2;
      ctx.fillStyle = '#c27bff';
      ctx.fillRect(toX(GATE.x) - pulse, toZ(GATE.z) - pulse, pulse * 2, pulse * 2);
      ctx.fillStyle = '#1b0e3a';
      ctx.fillRect(toX(GATE.x) - 2, toZ(GATE.z) - 2, 4, 4);
    }
    if (world.waygate && inView(world.waygate.x, world.waygate.z)) {
      const pulse = 3 + Math.sin(time * 5) * 1;
      ctx.fillStyle = '#7ef6ff';
      ctx.fillRect(toX(world.waygate.x) - pulse, toZ(world.waygate.z) - pulse, pulse * 2, pulse * 2);
      ctx.fillStyle = '#14343a';
      ctx.fillRect(toX(world.waygate.x) - 1, toZ(world.waygate.z) - 1, 3, 3);
    }
    ctx.fillStyle = '#f4fbff';
    for (const p of world.teleports || []) {
      if (!inView(p.x, p.z)) continue;
      ctx.fillRect(toX(p.x) - 2, toZ(p.z) - 2, 5, 5);
      ctx.fillStyle = '#2f6f99';
      ctx.fillRect(toX(p.x) - 1, toZ(p.z) - 1, 3, 3);
      ctx.fillStyle = '#f4fbff';
    }
    ctx.fillStyle = '#5ad0ff';
    for (const n of npcs) if (inView(n.x, n.z)) ctx.fillRect(toX(n.x) - 2, toZ(n.z) - 2, 4, 4);
    if (remotes) {
      ctx.fillStyle = '#9ad7ff';
      for (const r of remotes) {
        if (!r.ready || !inView(r.x, r.z)) continue;
        ctx.fillRect(toX(r.x) - 2, toZ(r.z) - 2, 4, 4);
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
    ctx.save();
    ctx.translate(toX(px), toZ(pz));
    ctx.rotate(-yaw + Math.PI);
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(6, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-6, 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e9fff1';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 4);
    ctx.lineTo(0, 2);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    const g = ctx.createRadialGradient(cv.width / 2, cv.height / 2, cv.width * 0.35, cv.width / 2, cv.height / 2, cv.width * 0.72);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cv.width, cv.height);
  }

  setArea(name) {
    if (this.el.area.textContent !== name) this.el.area.textContent = name;
  }

  openPanel(name, game) {
    this.runCleanup();
    this.panelId = name;
    this.el.panel.querySelector('.panel-card')?.classList.toggle('wide', name === 'catalog' || name === 'forge' || name === 'skills' || name === 'gear' || name === 'bag' || name === 'spellbook' || name === 'stats' || name === 'market' || name === 'world' || name === 'storage');
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
      title.textContent = inCave ? 'Darksycle Den' : 'Oakhollow and the nearby tiles';
      const c = document.createElement('canvas');
      c.className = 'bigmap';
      const src = inCave ? game.world.cave.minimap : game.world.minimapCanvas;
      c.width = inCave ? 240 : src.width;
      c.height = inCave ? 192 : src.height;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(src, 0, 0, c.width, c.height);
      const p = game.player;
      const ox = inCave ? game.world.cave.origin.x : (game.world.minimapOrigin?.x || 0);
      const oz = inCave ? game.world.cave.origin.z : (game.world.minimapOrigin?.z || 0);
      const mx = (p.pos.x - ox) * (c.width / src.width);
      const mz = (p.pos.z - oz) * (c.height / src.height);
      if (!inCave) {
        ctx.fillStyle = '#c27bff';
        ctx.fillRect(GATE.x - ox - 3, GATE.z - oz - 3, 6, 6);
        ctx.fillStyle = '#ffd23f';
        ctx.fillRect(GUILD.x - ox - 3, GUILD.z - oz - 3, 6, 6);
        ctx.fillStyle = '#b25cff';
        ctx.fillRect(CAVE_MOUTH.x - ox - 3, CAVE_MOUTH.z - oz - 3, 6, 6);
      }
      ctx.fillStyle = '#fff';
      ctx.fillRect(mx - 2, mz - 2, 4, 4);
      ctx.fillStyle = '#000';
      ctx.fillRect(mx - 1, mz - 1, 2, 2);
      body.appendChild(c);
      if (!inCave) {
        if (game.world.waygate) {
          ctx.fillStyle = '#7ef6ff';
          ctx.fillRect(game.world.waygate.x - ox - 2, game.world.waygate.z - oz - 2, 5, 5);
        }
        ctx.fillStyle = '#f4fbff';
        for (const p of game.world.teleports || []) ctx.fillRect(p.x - ox - 2, p.z - oz - 2, 5, 5);
        ctx.fillStyle = '#ff9a3c';
        ctx.fillRect(MINE.x - ox - 2, MINE.z - oz - 2, 5, 5);
        ctx.fillStyle = '#4ec8ff';
        ctx.fillRect(LAKE.x - ox - 2, LAKE.z - oz - 2, 5, 5);
      }
      add(inCave
        ? '<p style="margin:10px 0 0;font-size:13px;color:#aab">The Darksycle Den, under the bluff in Southford. Violet marks the dragon\'s nest. Walk back down the tunnel to return to the vale. White: you.</p>'
        : '<p style="margin:10px 0 0;font-size:13px;color:#aab">Gold square: Hunter Guild. Purple: the Monster Gate. Cyan: the Waygate. White: a teleportation portal. Orange: the Greyrock Pit. Light blue: Mirrormere. The map shows Oakhollow and the eight tiles around it. Violet in Southford is the Darksycle Cave. White dot: you.</p>');
    } else if (name === 'quest') {
      title.textContent = 'Hunt Log';
      const q = game.quest;
      const pct = Math.round((q.n / Math.max(1, q.total)) * 100);
      add(`<div class="quest-card"><b>${q.text}</b><span>${q.n} / ${q.total}</span><i style="width:${pct}%"></i></div><p class="panel-help">Monsters defeated: <b>${game.kills}</b>. The Monster Gate in the northern forest keeps sending creatures. Slay them for guild gold.</p>`);
    } else if (name === 'bag') {
      title.textContent = 'Inventory';
      this.cleanup = mountBag(body, game);
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
        <div id="wg-lobby">
          <label class="wg-label">Your name</label>
          <input id="wg-name" class="wg-input" maxlength="16" value="${saved.replace(/"/g, '')}" />
          <button id="wg-host" class="wg-btn" type="button">Host a world</button>
          <label class="wg-label">Friend's code</label>
          <div class="wg-row">
            <input id="wg-join-code" class="wg-input" maxlength="4" placeholder="CODE" />
            <button id="wg-join" class="wg-btn" type="button">Join</button>
          </div>
          <p style="color:#99a;font-size:13px">The host's browser runs the world. Up to 6 hunters. Share the code with friends at their own waygate.</p>
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
    } else if (name === 'settings' || name === 'menu') {
      title.textContent = name === 'menu' ? 'Menu' : 'Settings';
      const jumps = document.createElement('div');
      jumps.className = 'set-jumps';
      for (const [id, label, sub] of [
        ['tome', 'Teleportation Tome', 'Travel to a remembered place'],
        ['gear', 'Character', 'Equipped and unequipped'],
        ['bag', 'Inventory', 'Bag, tools and goods'],
        ['world', 'World Creator', '100-tile map'],
      ]) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'set-jump';
        b.innerHTML = `<b>${label}</b><small>${sub}</small>`;
        b.onclick = () => this.openPanel(id, game);
        jumps.appendChild(b);
      }
      body.appendChild(jumps);
      const q = game.quality;
      const rows = [
        ...(name === 'menu'
          ? [
              ['Skill & Spell Book', '<button id="set-book">Open</button>'],
              ['Hunter Catalog', '<button id="set-cat">Open</button>'],
              ['Skill Tree', '<button id="set-skills">Open</button>'],
              ['Hunter Stats', '<button id="set-stats">Open</button>'],
            ]
          : []),
        ['Graphics quality', `<button id="set-q">${q.label}</button>`],
        ['Sound', `<button id="set-snd">${game.audio.enabled ? 'On' : 'Off'}</button>`],
        ['Time of day', `<button id="set-time">Skip +3h</button>`],
        ['Fullscreen', `<button id="set-fs">Toggle</button>`],
        ['Account save', `<b id="set-cloud">${game.cloudStatusText?.() || ''}</b>`],
      ];
      rows.forEach(([a, b]) => add(`<div class="panel-row"><span>${a}</span>${b}</div>`));
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
        row.append(label, out);
        body.appendChild(row);
      }
      add('<p class="panel-help">WASD move · Click attack · Shift shield · Space or right-click evade · Round buttons 1 2 3 (Z X V). An empty 1 is Spirit Bolt and an empty 3 is Fury. Skills you place on 1, 2, or 3 show on those buttons. E character · B inventory · G skill book · K skill tree · H stats · T settings · 1-9 and 0 items · F talk, mine, fish, or chop · C catalog · [ ] or R rotate · wheel zoom.</p>');
      const statsBtn = document.getElementById('set-stats');
      if (statsBtn) statsBtn.onclick = () => this.openPanel('stats', game);
      const catBtn = document.getElementById('set-cat');
      if (catBtn) catBtn.onclick = () => this.openPanel('catalog', game);
      const skillBtn = document.getElementById('set-skills');
      if (skillBtn) skillBtn.onclick = () => this.openPanel('skills', game);
      const gearBtn = document.getElementById('set-gear');
      if (gearBtn) gearBtn.onclick = () => this.openPanel('gear', game);
      const bagBtn = document.getElementById('set-bag');
      if (bagBtn) bagBtn.onclick = () => this.openPanel('bag', game);
      const bookBtn = document.getElementById('set-book');
      if (bookBtn) bookBtn.onclick = () => this.openPanel('spellbook', game);
      document.getElementById('set-q').onclick = () => {
        game.cycleQuality();
        document.getElementById('set-q').textContent = game.quality.label;
      };
      document.getElementById('set-snd').onclick = () => {
        game.audio.toggle();
        document.getElementById('set-snd').textContent = game.audio.enabled ? 'On' : 'Off';
      };
      document.getElementById('set-time').onclick = () => game.sky.setHour(game.sky.hour + 3);
      document.getElementById('set-fs').onclick = () => game.toggleFullscreen();
    }
    this.el.panel.classList.remove('hidden');
  }
  runCleanup() {
    const fn = this.cleanup;
    this.cleanup = null;
    if (fn) fn();
  }
  closePanel() {
    this.runCleanup();
    this.panelId = null;
    this.el.panel.classList.add('hidden');
  }
  get panelOpen() {
    return !this.el.panel.classList.contains('hidden');
  }

  updateSkillbar(game) {
    if (!game?.progress || !game.player) return;
    const eq = game.progress.equipped();
    const keys = ['Z', 'X', 'V'];
    const fallback = ['Spirit Bolt', 'Empty', 'Fury'];
    const rightIds = ['tb-bolt', 'tb-skill', 'tb-fury'];
    const casts = [...document.querySelectorAll('#cast-buttons .cast')];
    if (!document.body.dataset.skillsWired) {
      document.body.dataset.skillsWired = '1';
      const accept = (el, i) => {
        el.addEventListener('dragover', (e) => e.preventDefault());
        el.addEventListener('drop', (e) => {
          e.preventDefault();
          const id = (e.dataTransfer.getData('text/plain') || '').replace(/^skill:/, '');
          if (SKILLS[id]) game.equipSkill(i, id);
          if (game.hud.panelId === 'spellbook' || game.hud.panelId === 'skills') game.hud.openPanel(game.hud.panelId, game);
        });
      };
      casts.forEach((b, i) => {
        b.addEventListener('click', () => game.castSlot(i));
        accept(b, i);
      });
      rightIds.forEach((id, i) => {
        const el = document.getElementById(id);
        if (el) accept(el, i);
      });
    }
    const paintCanvas = (canvas, skill, i) => {
      if (!canvas) return;
      const id = eq[i] || '';
      if (canvas.dataset.sid === id) return;
      canvas.dataset.sid = id;
      if (skill) paintSkillIcon(canvas, skill.shape, skill.color);
      else {
        canvas.width = 16;
        canvas.height = 16;
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

export { TOWN };


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
