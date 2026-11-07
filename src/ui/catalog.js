import * as THREE from 'three';
import { ARMOR_SLOTS, DROPS, GEAR, MATERIALS, MATERIAL_ORDER, MONSTERS, SETS, SLOT_LABEL, armorPieces, gearById, monsterById, setById, weapons } from '../data/catalog.js';
import { MONSTER_BUILDERS, MONSTER_STATS } from '../entities/monsters.js';
import { buildHeld, buildHumanoid } from '../entities/humanoid.js';
import { buildMaterialModel } from '../entities/gearModels.js';

/* ------------------------------------------------------------------ */
/* Offscreen 3D stage: renders the same in-game models to 2D canvases   */
/* ------------------------------------------------------------------ */

const silhouetteMat = () => new THREE.MeshBasicMaterial({ color: 0x0d0f14 });

function removePart(node) {
  node?.parent?.remove(node);
}

function buildSubject(spec, silhouette) {
  const tilt = new THREE.Group();
  let yaw = 0.6;
  let pitch = 0.26;

  if (spec.kind === 'monster') {
    const built = MONSTER_BUILDERS[spec.id]();
    tilt.add(built.root);
    yaw = spec.id === 'wraith' ? 0.35 : 0.65;
  } else if (spec.kind === 'material') {
    const m = buildMaterialModel(spec.id);
    tilt.add(m);
    tilt.rotation.z = spec.id === 'budgefang' ? -0.35 : spec.id === 'duskclaw' ? -0.2 : 0;
    yaw = 0.55;
    pitch = 0.18;
  } else if (spec.kind === 'weapon') {
    const g = gearById(spec.id);
    const held = buildHeld(g.held);
    if (g.held === 'budgebow' || g.held === 'darkbow') {
      yaw = -0.85;
    } else {
      held.rotation.x = -Math.PI / 2;
      tilt.rotation.z = -0.55;
      yaw = 0.4;
      pitch = 0.12;
    }
    tilt.add(held);
  } else if (spec.kind === 'armor') {
    const g = gearById(spec.id);
    const keep = {
      helm: ['head'],
      chest: ['torso'],
      arms: ['armL', 'armR'],
      legs: ['legL', 'legR'],
      boots: ['legL', 'legR'],
    }[g.slot];
    const h = buildHumanoid({ armor: { [g.slot]: g.set }, parts: keep, ...(g.slot === 'helm' ? {} : { hero: false }) });
    for (const part of ['head', 'torso', 'armL', 'armR', 'legL', 'legR']) if (!keep.includes(part)) removePart(h[part]);
    h.shieldG?.parent?.remove(h.shieldG);
    tilt.add(h.root);
    yaw = g.slot === 'arms' ? 0.5 : 0.55;
    pitch = g.slot === 'legs' || g.slot === 'boots' ? 0.12 : 0.2;
  } else if (spec.kind === 'set') {
    const h = buildHumanoid({ armor: Object.fromEntries(ARMOR_SLOTS.map((s) => [s, spec.id])) });
    h.armR.rotation.x = -0.9;
    h.shieldG?.parent?.remove(h.shieldG);
    h.heldSlot.add(buildHeld(spec.id === 'darksyceset' ? 'darkscythe' : 'budgeblade'));
    tilt.add(h.root);
    yaw = 0.5;
    pitch = 0.14;
  }

  const spin = new THREE.Group();
  spin.add(tilt);
  spin.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(spin);
  const c = box.getCenter(new THREE.Vector3());
  tilt.position.sub(c);
  spin.updateMatrixWorld(true);
  const sphere = new THREE.Box3().setFromObject(spin).getBoundingSphere(new THREE.Sphere());

  if (silhouette) {
    const mat = silhouetteMat();
    spin.traverse((o) => {
      if (o.isMesh) {
        o.material = mat;
        o.castShadow = false;
      }
    });
  }
  const fit = spec.kind === 'monster' ? (spec.id === 'darksycledragon' ? 0.78 : 0.82) : spec.kind === 'set' ? 0.92 : 1;
  return { spin, radius: Math.max(0.1, sphere.radius * fit), yaw, pitch };
}

function disposeSubject(s) {
  s.spin.traverse((o) => {
    if (o.isMesh && o.geometry) o.geometry.dispose();
  });
}

class Stage {
  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.setClearColor(0x000000, 0);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(28, 1, 0.05, 200);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8a96ad, 1.25));
    const key = new THREE.DirectionalLight(0xfff2dc, 2.6);
    key.position.set(3, 5, 4);
    const fill = new THREE.DirectionalLight(0xb8d0ff, 0.9);
    fill.position.set(-4, 2, -3);
    this.scene.add(key, fill);
    this.cache = new Map();
    this.queue = [];
    this.pumping = false;
  }

  draw(subject, yaw, ctx, w, h) {
    const r = this.renderer;
    if (r.domElement.width !== w || r.domElement.height !== h) r.setSize(w, h, false);
    const cam = this.camera;
    cam.aspect = w / h;
    const vf = (cam.fov * Math.PI) / 180;
    const hf = 2 * Math.atan(Math.tan(vf / 2) * cam.aspect);
    const dist = (subject.radius / Math.sin(Math.min(vf, hf) / 2)) * 1.04;
    const cp = Math.cos(subject.pitch);
    cam.position.set(0, Math.sin(subject.pitch) * dist, cp * dist);
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
    subject.spin.rotation.y = yaw;
    this.scene.add(subject.spin);
    r.render(this.scene, cam);
    this.scene.remove(subject.spin);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.drawImage(r.domElement, 0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  thumb(spec, silhouette, px = 192) {
    const key = `${spec.kind}:${spec.id || ''}:${silhouette ? 1 : 0}`;
    const cv = document.createElement('canvas');
    cv.width = px;
    cv.height = px;
    const ctx = cv.getContext('2d');
    const done = this.cache.get(key);
    if (done) ctx.drawImage(done, 0, 0, px, px);
    else this.queue.push({ key, spec, silhouette, ctx, px });
    return cv;
  }

  /** Drop thumbs for a catalog view that has been replaced. */
  cancel() {
    this.queue.length = 0;
  }

  pending() {
    return this.queue.length > 0;
  }

  run(job) {
    try {
      let src = this.cache.get(job.key);
      if (!src) {
        const subject = buildSubject(job.spec, job.silhouette);
        const tmp = document.createElement('canvas');
        tmp.width = 192;
        tmp.height = 192;
        this.draw(subject, subject.yaw, tmp.getContext('2d'), 192, 192);
        disposeSubject(subject);
        this.cache.set(job.key, tmp);
        src = tmp;
      }
      if (job.ctx) {
        job.ctx.clearRect(0, 0, job.px, job.px);
        job.ctx.drawImage(src, 0, 0, job.px, job.px);
      }
    } catch (err) {
      console.warn('catalog thumb failed', job.key, err);
    }
  }

  /**
   * Paint queued thumbnails. The open tab is flushed immediately so its
   * pictures are on screen before the browser paints the empty cards.
   */
  flush(budget = 14) {
    const t0 = performance.now();
    let n = 0;
    while (this.queue.length && (n < 1 || performance.now() - t0 < budget)) {
      this.run(this.queue.shift());
      n++;
    }
    if (this.queue.length && !this.pumping) {
      this.pumping = true;
      requestAnimationFrame(() => {
        this.pumping = false;
        this.flush();
      });
    }
  }
}

let stage = null;
const getStage = () => stage || (stage = new Stage());

/** Renders a gear or monster to a small canvas (used for the hotbar). */
export function renderThumb(spec, px = 64) {
  return getStage().thumb(spec, false, px);
}

/* ------------------------------------------------------------------ */
/* Catalog UI                                                           */
/* ------------------------------------------------------------------ */

const RATE_CLASS = { Common: 'common', Uncommon: 'uncommon', Rare: 'rare' };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html !== undefined) n.innerHTML = html;
  return n;
}

const SET_BLURB = {
  budgeset: 'Five pieces of dragon-scale plate: a horned helm, gilded cuirass, clawed gauntlets, banded greaves and talon boots.',
  darksyceset: 'Five pieces of indigo scale lit from within by gloom: a sickle-horned helm, a core-burning cuirass, scythe-pauldron gauntlets, rune greaves and silent talon boots.',
};

export class Catalog {
  constructor(game) {
    this.game = game;
    this.tab = 'monsters';
    this.view = null;
    this.body = null;
    this.viewer = null;
  }

  get progress() {
    return this.game.progress;
  }

  snapshot(spec, px = 768, yaw = null, pitch = null) {
    const subject = buildSubject(spec, false);
    if (pitch !== null) subject.pitch = pitch;
    const cv = document.createElement('canvas');
    cv.width = px;
    cv.height = px;
    getStage().draw(subject, yaw ?? subject.yaw, cv.getContext('2d'), px, px);
    disposeSubject(subject);
    return cv.toDataURL('image/png');
  }

  mount(body, opts = {}) {
    this.body = body;
    this.forge = !!opts.forge;
    if (this.forge && this.tab === 'monsters') this.tab = 'weapons';
    this.view = null;
    this.render();
    return () => this.unmount();
  }

  unmount() {
    this.stopViewer();
    this.body = null;
  }

  stopViewer() {
    if (this.viewer) {
      cancelAnimationFrame(this.viewer.raf);
      disposeSubject(this.viewer.subject);
      this.viewer = null;
    }
  }

  goto(view, tab) {
    if (tab) this.tab = tab;
    this.view = view;
    this.render();
    this.body?.parentElement?.scrollTo?.(0, 0);
  }

  render() {
    if (!this.body) return;
    this.stopViewer();
    getStage().cancel();
    this.body.innerHTML = '';
    this.game.hud.el.panelTitle.textContent = this.forge ? 'The Forge' : 'Hunter Catalog';
    if (this.view) this.renderDetail(this.view);
    else this.renderGrid();
    getStage().flush(120);
  }

  /* ----------------------------- grid ------------------------------ */

  renderGrid() {
    const pr = this.progress;
    const root = el('div', 'cat');
    const seen = MONSTERS.filter((m) => pr.seen(m.id)).length;
    const tabs = el('div', 'cat-tabs');
    const defs = [
      ['monsters', 'Monsters', `${seen}/${MONSTERS.length}`],
      ['weapons', 'Weapons', `${weapons().filter((g) => pr.crafted(g.id)).length}/${weapons().length}`],
      ['armor', 'Armor', `${armorPieces().filter((g) => pr.crafted(g.id)).length}/${armorPieces().length}`],
    ];
    for (const [id, label, count] of defs) {
      const b = el('button', 'cat-tab' + (this.tab === id ? ' on' : ''), `${label}<small>${count}</small>`);
      b.type = 'button';
      b.onclick = () => {
        this.tab = id;
        this.render();
      };
      tabs.appendChild(b);
    }
    root.appendChild(tabs);
    if (this.forge) root.appendChild(el('div', 'cat-forge', `<b>Bram the Blacksmith</b> Pick a weapon or armor piece, then forge it from monster parts. Pieces you have forged can be worn right here.`));

    const grid = el('div', 'cat-grid');
    const s = getStage();
    if (this.tab === 'monsters') {
      for (const m of MONSTERS) {
        const known = pr.seen(m.id);
        const card = this.card(s.thumb({ kind: 'monster', id: m.id }, !known), known ? m.name : '???', known ? `Lv ${m.level}  -  ${pr.kills(m.id)} slain` : 'Undiscovered', known ? '' : 'locked');
        card.onclick = () => this.goto({ type: 'monster', id: m.id });
        grid.appendChild(card);
      }
    } else if (this.tab === 'weapons') {
      for (const m of MONSTERS) {
        const list = weapons(m.id);
        if (!list.length) continue;
        grid.appendChild(this.heading(pr.seen(m.id) ? m.name : '???'));
        for (const g of list) grid.appendChild(this.gearCard(g));
      }
    } else {
      for (const set of SETS) {
        const pieces = armorPieces(set.id);
        const done = pieces.filter((g) => pr.crafted(g.id)).length;
        const known = pr.seen(set.monster);
        const complete = pr.setComplete(set.id);
        grid.appendChild(this.heading(known ? monsterById(set.monster).name : '???'));
        const card = this.card(s.thumb({ kind: 'set', id: set.id }, !known), known ? set.name : '???', known ? `${done}/${pieces.length} pieces${complete ? '  -  Complete' : ''}` : 'Undiscovered', (known ? 'set' : 'locked') + (complete ? ' worn' : ''));
        card.onclick = () => this.goto({ type: 'set', id: set.id });
        grid.appendChild(card);
        for (const g of pieces) grid.appendChild(this.gearCard(g));
      }
    }
    root.appendChild(grid);
    root.appendChild(el('p', 'cat-foot', 'Defeat monsters to discover them and collect parts. Bring parts to the Forge in Oakhollow to craft weapons and armor you can wear into the field.'));
    this.body.appendChild(root);
  }

  heading(text) {
    return el('h4', 'cat-sub', esc(text));
  }

  card(canvas, name, sub, cls = '', badge = '') {
    const b = el('button', 'cat-card ' + cls);
    b.type = 'button';
    const holder = el('div', 'cat-thumb');
    holder.appendChild(canvas);
    b.appendChild(holder);
    b.appendChild(el('b', null, esc(name)));
    b.appendChild(el('small', null, esc(sub)));
    if (badge) b.appendChild(el('span', 'cat-badge', badge));
    return b;
  }

  gearCard(g) {
    const pr = this.progress;
    const known = pr.gearSeen(g);
    const crafted = pr.crafted(g.id);
    let badge = '';
    let cls = known ? '' : 'locked';
    if (pr.worn(g.id)) {
      badge = 'Equipped';
      cls += ' worn';
    } else if (crafted) badge = 'Crafted';
    else if (known && pr.canCraft(g)) {
      badge = 'Craftable';
      cls += ' ready';
    }
    const sub = !known ? 'Undiscovered' : g.type === 'weapon' ? `Dmg ${g.item.dmg}` : `${SLOT_LABEL[g.slot]}  -  Def ${g.def}`;
    const spec = { kind: g.type === 'weapon' ? 'weapon' : 'armor', id: g.id };
    const card = this.card(getStage().thumb(spec, !known), known ? g.name : '???', sub, cls, badge);
    card.onclick = () => this.goto({ type: 'gear', id: g.id });
    return card;
  }

  /* ---------------------------- details ---------------------------- */

  renderDetail(view) {
    const pr = this.progress;
    const root = el('div', 'cat');
    const back = el('button', 'cat-back', '&lt; Back to catalog');
    back.type = 'button';
    back.onclick = () => this.goto(null);
    root.appendChild(back);

    const wrap = el('div', 'cat-detail');
    const vwrap = el('div', 'cat-viewer');
    const cv = document.createElement('canvas');
    vwrap.appendChild(cv);
    vwrap.appendChild(el('span', 'cat-hint', 'Drag to rotate'));
    const info = el('div', 'cat-info');
    wrap.append(vwrap, info);
    root.appendChild(wrap);
    this.body.appendChild(root);

    let spec;
    let known;
    if (view.type === 'monster') {
      const m = monsterById(view.id);
      known = pr.seen(m.id);
      spec = { kind: 'monster', id: m.id };
      this.fillMonster(info, m, known);
    } else if (view.type === 'set') {
      const set = setById(view.id);
      known = pr.seen(set.monster);
      spec = { kind: 'set', id: set.id };
      this.fillSet(info, set, known);
    } else {
      const g = gearById(view.id);
      known = pr.gearSeen(g);
      spec = { kind: g.type === 'weapon' ? 'weapon' : 'armor', id: g.id };
      this.fillGear(info, g, known);
    }
    this.startViewer(cv, spec, !known);
  }

  fillMonster(info, m, known) {
    const pr = this.progress;
    if (!known) {
      info.innerHTML = `<h3>???</h3><p class="cat-muted">You have not encountered this creature yet. Keep hunting around Goldenmeadow and the forest edge.</p>`;
      return;
    }
    const st = MONSTER_STATS[m.id];
    info.innerHTML = `<h3>${esc(m.name)}</h3>
      <div class="cat-tags"><span>Lv ${m.level}</span><span>${esc(m.temper)}</span><span>${esc(m.style)}</span><span>${pr.kills(m.id)} slain</span></div>
      <p>${esc(m.desc)}</p>
      <div class="cat-stats"><div><small>Health</small><b>${st.hp}</b></div><div><small>Attack</small><b>${st.dmg}</b></div><div><small>Speed</small><b>${st.speed}</b></div></div>
      <p class="cat-muted">Habitat: ${esc(m.habitat)}</p>`;
    const drops = DROPS[m.id];
    if (drops) {
      info.appendChild(el('h4', null, 'Parts'));
      const row = el('div', 'cat-parts');
      for (const d of drops) row.appendChild(this.partChip(d.id, `${d.rate}`, RATE_CLASS[d.rate], true));
      info.appendChild(row);
      info.appendChild(el('h4', null, 'Can be crafted into'));
      const mk = el('div', 'cat-made');
      for (const g of GEAR.filter((x) => x.monster === m.id)) {
        const c = el('button', 'cat-mini' + (pr.crafted(g.id) ? ' done' : ''));
        c.type = 'button';
        c.appendChild(getStage().thumb({ kind: g.type === 'weapon' ? 'weapon' : 'armor', id: g.id }, false, 96));
        c.appendChild(el('span', null, esc(g.name)));
        c.onclick = () => this.goto({ type: 'gear', id: g.id }, g.type === 'weapon' ? 'weapons' : 'armor');
        mk.appendChild(c);
      }
      info.appendChild(mk);
    }
  }

  partChip(id, label, cls, owned) {
    const pr = this.progress;
    const chip = el('div', 'cat-part');
    chip.title = MATERIALS[id].desc;
    chip.appendChild(getStage().thumb({ kind: 'material', id }, false, 96));
    const t = el('div');
    t.innerHTML = `<b>${esc(MATERIALS[id].name)}</b><small class="${cls || ''}">${esc(label)}</small>`;
    chip.appendChild(t);
    if (owned) chip.appendChild(el('em', null, `x${pr.count(id)}`));
    return chip;
  }

  recipeChips(g) {
    const pr = this.progress;
    const row = el('div', 'cat-parts');
    for (const id of MATERIAL_ORDER) {
      const need = g.recipe[id];
      if (!need) continue;
      const have = pr.count(id);
      const chip = this.partChip(id, `Need ${need}`, '', false);
      chip.appendChild(el('em', have >= need ? 'ok' : 'short', `${have}/${need}`));
      row.appendChild(chip);
    }
    return row;
  }

  fillGear(info, g, known) {
    const pr = this.progress;
    if (!known) {
      const m = monsterById(g.monster);
      info.innerHTML = `<h3>???</h3><p class="cat-muted">A weapon or armor piece forged from the parts of a monster you have not discovered yet.</p>`;
      void m;
      return;
    }
    const m = monsterById(g.monster);
    const stats =
      g.type === 'weapon'
        ? g.stats.map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join('')
        : `<div><small>Slot</small><b>${SLOT_LABEL[g.slot]}</b></div><div><small>Defense</small><b>+${g.def}</b></div>`;
    info.innerHTML = `<h3>${esc(g.name)}</h3>
      <div class="cat-tags"><span>${g.type === 'weapon' ? 'Weapon' : 'Armor'}</span><span>From ${esc(m.name)}</span></div>
      <p>${esc(g.desc)}</p>
      <div class="cat-stats">${stats}</div>
      <h4>Parts needed</h4>`;
    info.appendChild(this.recipeChips(g));
    const actions = el('div', 'cat-actions');
    if (!pr.crafted(g.id)) {
      const can = this.forge && pr.canCraft(g);
      const b = el('button', 'cat-btn' + (can ? ' go' : ''), !this.forge ? 'Forge at the smithy' : pr.canCraft(g) ? 'Forge it' : 'Missing parts');
      b.type = 'button';
      b.disabled = !can;
      b.onclick = () => {
        if (!this.forge || !pr.craft(g.id)) return;
        this.game.applyGear();
        this.game.audio.quest();
        this.game.hud.toast(`Forged ${g.name}`, 1800);
        const f = this.game.world.forge;
        if (f) {
          this.game.fx.burst(f.x + 0.4, f.y + 1.1, f.z, [0xff8a1e, 0xffd27a, 0xffffff], 22, 4.5, 0.09, 0.9, 6, 2);
          this.game.fx.ring(f.x + 0.6, f.y + 0.6, f.z, 0xffb347, 14, 2.5, 0.09, 0.5);
        }
        this.render();
      };
      actions.appendChild(b);
      if (!this.forge) actions.appendChild(el('p', 'cat-muted', 'Weapons and armor are forged at the Forge next to Bram the Blacksmith in Oakhollow.'));
    } else {
      const worn = pr.worn(g.id);
      const b = el('button', 'cat-btn go', worn ? 'Unequip' : g.type === 'weapon' ? 'Equip (hotbar 8)' : 'Wear');
      b.type = 'button';
      b.onclick = () => {
        pr.toggleWear(g.id);
        this.game.applyGear();
        this.game.audio.select();
        this.render();
      };
      actions.appendChild(b);
    }
    info.appendChild(actions);
    if (g.type === 'armor') info.appendChild(el('p', 'cat-muted', `${esc(setById(g.set).name)}. ${esc(setById(g.set).bonus)}`));
  }

  fillSet(info, set, known) {
    const pr = this.progress;
    const m = monsterById(set.monster);
    if (!known) {
      info.innerHTML = `<h3>???</h3><p class="cat-muted">Discover the ${esc(m.name)} to reveal this armor set.</p>`;
      return;
    }
    const complete = pr.setComplete(set.id);
    info.innerHTML = `<h3>${esc(set.name)}</h3>
      <div class="cat-tags"><span>Armor set</span><span>From ${esc(m.name)}</span><span>${pr.defense} defense worn</span></div>
      <p>${esc(SET_BLURB[set.id])}</p>
      <p class="${complete ? 'cat-ok' : 'cat-muted'}">${esc(set.bonus)}${complete ? ' (active)' : ''}</p>`;
    const list = el('div', 'cat-made');
    for (const g of armorPieces(set.id)) {
      const c = el('button', 'cat-mini' + (pr.crafted(g.id) ? ' done' : ''));
      c.type = 'button';
      c.appendChild(getStage().thumb({ kind: 'armor', id: g.id }, false, 96));
      c.appendChild(el('span', null, `${esc(SLOT_LABEL[g.slot])}${pr.worn(g.id) ? ' (worn)' : pr.crafted(g.id) ? '' : ' - not crafted'}`));
      c.onclick = () => this.goto({ type: 'gear', id: g.id });
      list.appendChild(c);
    }
    info.appendChild(list);
  }

  /* ----------------------------- viewer ---------------------------- */

  startViewer(cv, spec, silhouette) {
    const stage = getStage();
    const subject = buildSubject(spec, silhouette);
    const state = { subject, yaw: subject.yaw, drag: false, lastX: 0, raf: 0 };
    this.viewer = state;
    const ctx = cv.getContext('2d');
    cv.addEventListener('pointerdown', (e) => {
      state.drag = true;
      state.lastX = e.clientX;
      cv.setPointerCapture(e.pointerId);
    });
    cv.addEventListener('pointermove', (e) => {
      if (!state.drag) return;
      state.yaw += (e.clientX - state.lastX) * 0.012;
      state.lastX = e.clientX;
    });
    const end = () => (state.drag = false);
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);
    let last = performance.now();
    const tick = (now) => {
      if (this.viewer !== state) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(64, Math.round(r.width * dpr));
      const h = Math.max(64, Math.round(r.height * dpr));
      if (cv.width !== w || cv.height !== h) {
        cv.width = w;
        cv.height = h;
      }
      if (!state.drag) state.yaw += dt * 0.7;
      if (stage.pending()) {
        state.raf = requestAnimationFrame(tick);
        return;
      }
      stage.draw(subject, state.yaw, ctx, w, h);
      state.raf = requestAnimationFrame(tick);
    };
    state.raf = requestAnimationFrame(tick);
  }
}
