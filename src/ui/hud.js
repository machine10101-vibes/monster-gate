import { iconCanvas, iconURL, heartCanvas } from './icons.js';
import { clamp } from '../engine/voxel.js';
import { GATE, GUILD, TOWN } from '../world/terrain.js';

export const ITEMS = [
  { id: 'blade', icon: 'blade', name: 'Hunter Blade', kind: 'melee', dmg: 9, reach: 2.4, arc: 2.0, dur: 0.4, hit: 0.17, stam: 9, knock: 4.5, held: 'blade', desc: 'Balanced steel. Three-hit rhythm.' },
  { id: 'pick', icon: 'pick', name: 'Iron Pickaxe', kind: 'melee', dmg: 6, reach: 2.2, arc: 1.6, dur: 0.34, hit: 0.14, stam: 6, knock: 3, held: 'pick', desc: 'Quick swings, light damage.' },
  { id: 'axe', icon: 'axe', name: 'Woodcutter Axe', kind: 'melee', dmg: 8, reach: 2.3, arc: 1.8, dur: 0.44, hit: 0.2, stam: 9, knock: 4, held: 'axe', desc: 'Heavy chops.' },
  { id: 'hammer', icon: 'hammer', name: 'Stone Hammer', kind: 'melee', dmg: 15, reach: 2.4, arc: 2.3, dur: 0.7, hit: 0.34, stam: 16, knock: 8, held: 'hammer', desc: 'Slow, bone-shaking blows.' },
  { id: 'bow', icon: 'bow', name: 'Hunter Bow', kind: 'ranged', dmg: 7, dur: 0.5, stam: 7, held: 'bow', desc: 'Loose arrows at range.' },
  { id: 'stone', icon: 'stone', name: 'Throwing Stone', kind: 'throw', dmg: 4, dur: 0.38, stam: 4, count: 12, held: 'stone', desc: 'Pocket-sized pain.' },
  { id: 'potion', icon: 'potion', name: 'Healing Potion', kind: 'use', count: 10, held: 'potion', desc: 'Restores 8 health.' },
  { id: 'empty', icon: 'empty', name: 'Empty', kind: 'none' },
  { id: 'torch', icon: 'torch', name: 'Torch', kind: 'light', count: 18, held: 'torch', desc: 'Lights the way at night.' },
];

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
      key.textContent = i + 1;
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

  drawMinimap(world, px, pz, yaw, monsters, npcs, time) {
    const ctx = this.mctx;
    const cv = this.el.minimap;
    const N = 44;
    const sc = cv.width / N;
    ctx.fillStyle = '#0d1116';
    ctx.fillRect(0, 0, cv.width, cv.height);
    const sx = Math.round(px - N / 2);
    const sz = Math.round(pz - N / 2);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(world.minimapCanvas, sx, sz, N, N, 0, 0, cv.width, cv.height);
    const toX = (x) => (x - sx) * sc;
    const toZ = (z) => (z - sz) * sc;
    const inView = (x, z) => x > sx && z > sz && x < sx + N && z < sz + N;
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
    ctx.fillStyle = '#5ad0ff';
    for (const n of npcs) if (inView(n.x, n.z)) ctx.fillRect(toX(n.x) - 2, toZ(n.z) - 2, 4, 4);
    ctx.fillStyle = '#ff4d4d';
    for (const m of monsters) {
      if (m.dead || !inView(m.x, m.z)) continue;
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
      title.textContent = 'Map of Oakhollow';
      const c = document.createElement('canvas');
      c.className = 'bigmap';
      c.width = 144;
      c.height = 144;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(game.world.minimapCanvas, 0, 0);
      const p = game.player;
      ctx.fillStyle = '#c27bff';
      ctx.fillRect(GATE.x - 3, GATE.z - 3, 6, 6);
      ctx.fillStyle = '#ffd23f';
      ctx.fillRect(GUILD.x - 3, GUILD.z - 3, 6, 6);
      ctx.fillStyle = '#fff';
      ctx.fillRect(p.pos.x - 2, p.pos.z - 2, 4, 4);
      ctx.fillStyle = '#000';
      ctx.fillRect(p.pos.x - 1, p.pos.z - 1, 2, 2);
      body.appendChild(c);
      add('<p style="margin:10px 0 0;font-size:13px;color:#aab">Gold square: Hunter Guild. Purple: the Monster Gate. White: you.</p>');
    } else if (name === 'quest') {
      title.textContent = 'Hunt Log';
      const q = game.quest;
      add(`<p><b>${q.text}</b><br/>Progress: ${q.n} / ${q.total}</p><p>Total monsters defeated: <b>${game.kills}</b></p><p style="color:#aab;font-size:13px">The Monster Gate in the northern forest keeps spitting out creatures. Slay them to earn guild gold.</p>`);
    } else if (name === 'bag') {
      title.textContent = 'Satchel';
      game.items
        .filter((i) => i.id !== 'empty')
        .forEach((it) => {
          const r = document.createElement('div');
          r.className = 'panel-row';
          r.innerHTML = `<span>${it.name}${it.count !== undefined ? ' x' + it.count : ''}<br/><small style="color:#99a">${it.desc || ''}</small></span>`;
          body.appendChild(r);
        });
      add(`<p style="margin-top:10px">Gold: <b style="color:#ffe27a">${game.gold}</b></p>`);
    } else if (name === 'gear') {
      title.textContent = 'Hunter';
      const p = game.player;
      add(`<div class="panel-row"><span>Rank</span><b>${game.rank}</b></div>
           <div class="panel-row"><span>Health</span><b>${p.hp} / ${p.maxHp}</b></div>
           <div class="panel-row"><span>Stamina</span><b>${Math.round(p.stamina)} / ${p.maxStamina}</b></div>
           <div class="panel-row"><span>Spirit</span><b>${Math.round(p.mana)} / ${p.maxMana}</b></div>
           <div class="panel-row"><span>Fury</span><b>${Math.round(p.fury)} / 100</b></div>
           <div class="panel-row"><span>Weapon</span><b>${game.items[game.sel].name}</b></div>
           <p style="color:#aab;font-size:13px">Dark leather hunter's garb, steel bracers and a greatsword on your back.</p>`);
    } else if (name === 'settings' || name === 'menu') {
      title.textContent = name === 'menu' ? 'Menu' : 'Settings';
      const q = game.quality;
      const rows = [
        ['Graphics quality', `<button id="set-q">${q.label}</button>`],
        ['Sound', `<button id="set-snd">${game.audio.enabled ? 'On' : 'Off'}</button>`],
        ['Time of day', `<button id="set-time">Skip +3h</button>`],
        ['Fullscreen', `<button id="set-fs">Toggle</button>`],
      ];
      rows.forEach(([a, b]) => add(`<div class="panel-row"><span>${a}</span>${b}</div>`));
      add('<p style="color:#99a;font-size:13px;margin-top:10px">WASD move - Click attack - Shift shield - Space/Right-click evade - Z Spirit Bolt - V Fury - 1-9 items - F talk - [ ] or R rotate camera - Wheel zoom.</p>');
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
  closePanel() {
    this.el.panel.classList.add('hidden');
  }
  get panelOpen() {
    return !this.el.panel.classList.contains('hidden');
  }
}

export { TOWN };
