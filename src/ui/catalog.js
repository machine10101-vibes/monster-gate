import * as THREE from 'three';
import { GEAR_DROPS, CORE_SLOTS, DROPS, GEAR, MATERIALS, MATERIAL_ORDER, MONSTERS, SETS, SLOT_LABEL, TIER_LABEL, WEAPON_LABEL, armorPieces, gearById, monsterById, setById, weapons } from '../data/catalog.js';
import { MONSTER_BUILDERS, MONSTER_STATS } from '../entities/monsters.js';
import { buildHeld, buildHumanoid, meshFrom } from '../entities/humanoid.js';
import { TALL_KINDS, buildBookModel, buildShieldModel, gripRoll } from '../entities/weaponModels.js';
import { toonMaterial } from '../engine/materials.js';
import { buildMaterialModel } from '../entities/gearModels.js';
import { goodsVoxels } from '../world/gatherModels.js';
import { GOODS, HEADS_PER_BAR } from '../data/gathering.js';

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
  } else if (spec.kind === 'good') {
    const [gm, size, ox, oy, oz] = goodsVoxels(spec.id);
    tilt.add(meshFrom(gm, ox, oy, oz, toonMaterial({ vertexColors: true }), size));
    const fishy = spec.id === 'burnt_fish' || spec.id.startsWith('cooked_') || spec.id === 'shrimp' || spec.id === 'trout' || spec.id === 'pikeminnow' || spec.id === 'salmon' || spec.id === 'pike' || spec.id === 'sturgeon' || spec.id === 'tuna' || spec.id === 'stingray' || spec.id === 'tigershark';
    yaw = fishy ? 0.75 : 0.6;
    pitch = fishy ? 0.3 : 0.24;
  } else if (spec.kind === 'weapon') {
    const g = gearById(spec.id);
    const held = buildHeld(g.held);
    if (TALL_KINDS.has(g.held)) {
      yaw = 0.85;
      tilt.rotation.z = -0.32;
    } else if (g.wtype === 'crossbow') {
      held.rotation.z = Math.PI;
      const lay = new THREE.Group();
      lay.rotation.x = -Math.PI / 2;
      lay.add(held);
      tilt.rotation.z = -0.4;
      tilt.add(lay);
      yaw = 0.25;
      pitch = 0.1;
    } else {
      held.rotation.x = -Math.PI / 2;
      tilt.rotation.z = -0.55;
      yaw = 0.4;
      pitch = 0.12;
    }
    if (g.wtype !== 'crossbow') tilt.add(held);
  } else if (spec.kind === 'armor' && gearById(spec.id)?.slot === 'quiver') {
    const [gm, size, ox, oy, oz] = goodsVoxels('quiver');
    tilt.add(meshFrom(gm, ox, oy, oz, toonMaterial({ vertexColors: true }), size));
    yaw = 0.5;
    pitch = 0.2;
  } else if (spec.kind === 'armor' && (gearById(spec.id).slot === 'shield' || gearById(spec.id).slot === 'book')) {
    const g = gearById(spec.id);
    const mat = toonMaterial({ vertexColors: true });
    if (g.slot === 'shield') {
      const sm = buildShieldModel(g.set);
      const mesh = meshFrom(sm.M, sm.ox, sm.oy, sm.oz, mat, sm.size);
      mesh.rotation.x = Math.PI / 2;
      tilt.add(mesh);
      yaw = 0.5;
      pitch = 0.12;
    } else {
      const bm = buildBookModel(g.set);
      const mesh = meshFrom(bm.M, bm.ox, bm.oy, bm.oz, mat, bm.size);
      mesh.rotation.x = Math.PI / 2;
      mesh.rotation.z = -0.3;
      tilt.add(mesh);
      yaw = 0.45;
      pitch = 0.1;
    }
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
  } else if (spec.kind === 'held') {
    const id = spec.id;
    const held = buildHeld(id);
    if (TALL_KINDS.has(id)) {
      yaw = 0.85;
      tilt.rotation.z = -0.32;
      tilt.add(held);
    } else if (String(id).includes('crossbow')) {
      held.rotation.z = Math.PI;
      const lay = new THREE.Group();
      lay.rotation.x = -Math.PI / 2;
      lay.add(held);
      tilt.rotation.z = -0.4;
      tilt.add(lay);
      yaw = 0.25;
      pitch = 0.1;
    } else {
      held.rotation.x = -Math.PI / 2;
      tilt.rotation.z = -0.55;
      yaw = 0.4;
      pitch = 0.12;
      tilt.add(held);
    }
  } else if (spec.kind === 'hunter') {
    const h = buildHumanoid({ armor: spec.armor || {} });
    if (spec.armor?.shield) {
      h.shieldG.visible = true;
      h.armL.rotation.set(-0.75, 0, 0.35);
    } else if (spec.armor?.book) {
      h.armL.rotation.set(-0.55, 0.15, 0.2);
    }
    if (spec.held) {
      h.armR.rotation.x = -0.85;
      h.heldSlot.rotation.z = gripRoll(spec.held);
      h.heldSlot.add(buildHeld(spec.held));
    }
    tilt.add(h.root);
    yaw = 0.55;
    pitch = 0.16;
  } else if (spec.kind === 'set') {
    const extra = setById(spec.id).tier === 'metal' ? 'shield' : setById(spec.id).tier === 'cloth' ? 'book' : null;
    const h = buildHumanoid({ armor: Object.fromEntries([...CORE_SLOTS, ...(extra ? [extra] : [])].map((s) => [s, spec.id])) });
    h.armR.rotation.x = -0.9;
    h.heldSlot.rotation.z = gripRoll(SET_HELD[spec.id]);
    if (extra === 'shield') {
      h.shieldG.visible = true;
      h.armL.rotation.set(-0.75, 0, 0.35);
    } else h.shieldG?.parent?.remove(h.shieldG);
    h.heldSlot.add(buildHeld(SET_HELD[spec.id]));
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
  const fit = spec.kind === 'monster' ? (spec.id === 'darksycledragon' ? 0.78 : spec.id === 'snowyeti' ? 0.74 : spec.id === 'tiger' || spec.id === 'raptor' ? 0.78 : spec.id === 'demonknight' || spec.id === 'holyknight' ? 0.7 : 0.82) : spec.kind === 'set' || spec.kind === 'hunter' ? 0.9 : 1;
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

/** Paint any thumbnails queued by renderThumb. */
export function flushThumbs(budget = 80) {
  getStage().flush(budget);
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

const SET_HELD = {
  budgeset: 'budgeblade', darksyceset: 'darkscythe', budgeleather: 'budgecrossbow', darkleather: 'darkcrossbow', budgecloth: 'budgestaff', darkcloth: 'darkstaff',
  yetiset: 'yetigreatsword', yetileather: 'yeticrossbow', yeticloth: 'yetistaff',
  tigerleather: 'tigerspear', tigercloth: 'tigerclaws', raptorleather: 'raptorcrossbow', raptorcloth: 'raptorsaber',
  pirateset: 'piratecutlass', piratecloth: 'bonestaff',
  demonset: 'demonsword', holyset: 'holyhammer',
  iron: 'ironsword',
};

const SET_BLURB = {
  demonset: 'Jagged black plate lit by cracks of red: a spike-crowned helm with burning eyes, a shard-layered cuirass with a row of spikes across the back, spiked gauntlets under huge pauldrons, spiked greaves and sabatons, with a demon-faced bulwark. Dropped whole, and rarely, by the Demon Knight. The warrior set.',
  holyset: 'White plate trimmed in gold and marked with glowing blue crosses: a horned, gold-crested helm, a cross-bearing cuirass, gold-rimmed gauntlets, diamond-framed greaves and large sabatons. Dropped whole, and rarely, by the Holy Knight. The warrior set.',
  iron: 'Plain steel plate smelted from copper and tin: a nasal helm, hammered cuirass, gauntlets, platelegs and brass-capped boots, with a square shield. The first warrior set.',
  budgeset: 'Dragon-scale plate: a horned helm, gilded cuirass, clawed gauntlets, banded greaves and talon boots, with a horn-bossed shield. The warrior set.',
  darksyceset: 'Five pieces of indigo scale lit from within by gloom: a sickle-horned helm, a core-burning cuirass, scythe-pauldron gauntlets, rune greaves and silent talon boots, with a gloom-gem shield. The warrior set.',
  budgeleather: 'Laced hide in budge green with bone-stud trim: a horn-stud cap, jerkin, bracer gloves, strapped leggings and claw-toed boots. Light and quiet. The ranger set.',
  budgecloth: 'Wing-silk robes in budge green and gold: a pointed hood, sashed robe, flared cuffs, tied trousers and curled slippers, plus a fang-clasped grimoire. The mage set.',
  darkleather: 'Indigo hide stitched with violet thread: a finned cowl, jerkin, talon bracers, strapped leggings and talon-capped boots. Built for shadows. The ranger set.',
  darkcloth: 'Dusk-silk robes with glowing hems: a gem-browed hood, core-clasped robe, flared cuffs, sashed trousers and silent slippers, plus a humming grimoire. The mage set.',
  yetiset: 'Frost-shard plate under rime fur and brown leather straps: a crystal-crested yeti helm with glowing eyes, a frostheart cuirass, claw-knuckled gauntlets, heavy greaves and ice-clawed boots, with a glacier shield. The warrior set.',
  yetileather: 'Frost-stiff yeti hide with shaggy collars and crossed straps: a fur hood, jerkin, claw-bracer gloves, banded leggings and deep-furred boots. Built for the long cold. The ranger set.',
  tigerleather: 'Orange hide banded in black: a tiger-eared cowl, a striped jerkin with a white fur ruff, claw-bracer gloves, banded leggings and white paw-toed boots. Quiet, quick and unmistakable. The ranger set.',
  tigercloth: 'Orange robes striped in black with a white collar: an eared hood, claw-clasped robe, pale-edged cuffs, striped trousers and white-toed slippers, plus a grimoire with a watchful yellow eye. The mage set.',
  raptorleather: 'Olive and tan mosaic hide with grey spike ridges: a crested cowl, a laced jerkin with spiked shoulders, sickle-claw gloves, scaled leggings and three-toed boots. Built for the pack hunt. The ranger set.',
  raptorcloth: 'Robes woven in an olive and tan scale mosaic with grey spiked collars: a small-crested hood, flared cuffs, mosaic trousers and scaled slippers, plus a claw-clasped grimoire with an orange eye. The mage set.',
  pirateset: 'Navy plate cut like a captain\'s coat: a gold-trimmed tricorn over a red bandana, a gold-buttoned coat with a buckled belt, gold-cuffed gauntlets, strapped greaves and gold-buckled boots, with a round skull-boss buckler. The warrior set.',
  piratecloth: 'A black and red coat robe with bone buttons and bone-and-gold trim: a knotted bandana hood, flared red cuffs, bone-toggled trousers and black slippers, plus a logbook with a glowing green skull clasp. The mage set.',
  yeticloth: 'Layered rime-fur robes with frost-silk sashes and a hem of icicles: a shard-browed hood, frostheart-clasped robe, flared cuffs, sashed trousers and silent slippers, plus a frost-rimed grimoire. The mage set.',
};

function bonusText(b) {
  const out = [];
  if (b.mana) out.push(`+${b.mana} spirit`);
  if (b.spell) out.push(`+${Math.round(b.spell * 100)}% spell`);
  return out.join(', ');
}

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
    if (this.forge) {
      root.appendChild(el('div', 'cat-forge', `<b>Bram the Blacksmith</b> Iron bars from the smithy outside town become armor, weapons, a carving knife and arrowheads. Head the shafts here, then wear a quiver.`));
      root.appendChild(this.forgeBench());
    }

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
      const smithW = weapons('smith');
      if (smithW.length) {
        grid.appendChild(this.heading('Ironwork'));
        for (const g of smithW) grid.appendChild(this.gearCard(g));
      }
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
        const smith = set.monster === 'smith';
        const known = smith || pr.seen(set.monster);
        const complete = pr.setComplete(set.id);
        const who = smith ? 'Ironwork' : monsterById(set.monster).name;
        grid.appendChild(this.heading(known ? `${who} - ${TIER_LABEL[set.tier]} (${set.role})` : '???'));
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
    const sub = !known ? 'Undiscovered' : g.type === 'weapon' ? `${WEAPON_LABEL[g.wtype]}  -  Dmg ${g.item.dmg}` : `${SLOT_LABEL[g.slot]}  -  Def ${g.def}`;
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
      known = set.monster === 'smith' || pr.seen(set.monster);
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
    if (m.lore) info.appendChild(el('p', 'cat-muted', esc(m.lore)));
    const gearDrops = GEAR_DROPS[m.id];
    if (gearDrops) {
      info.appendChild(el('h4', null, 'Drops (whole pieces only, no parts)'));
      const mk = el('div', 'cat-made');
      for (const d of gearDrops) {
        const g = gearById(d.id);
        const c = el('button', 'cat-mini' + (pr.crafted(g.id) ? ' done' : ''));
        c.type = 'button';
        c.appendChild(getStage().thumb({ kind: g.type === 'weapon' ? 'weapon' : 'armor', id: g.id }, false, 96));
        c.appendChild(el('span', null, `${esc(g.name)} <small>${Math.round(d.chance * 1000) / 10}%</small>`));
        c.onclick = () => this.goto({ type: 'gear', id: g.id }, g.type === 'weapon' ? 'weapons' : 'armor');
        mk.appendChild(c);
      }
      info.appendChild(mk);
    }
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
    const ids = [...MATERIAL_ORDER.filter((id) => g.recipe[id]), ...Object.keys(g.recipe).filter((id) => !MATERIALS[id])];
    for (const id of ids) {
      const need = g.recipe[id];
      const have = pr.stockOf(id);
      const chip = MATERIALS[id] ? this.partChip(id, `Need ${need}`, '', false) : this.goodChip(id, `Need ${need}`);
      chip.appendChild(el('em', have >= need ? 'ok' : 'short', `${have}/${need}`));
      row.appendChild(chip);
    }
    return row;
  }

  goodChip(id, label) {
    const chip = el('div', 'cat-part');
    chip.title = GOODS[id]?.desc || id;
    chip.appendChild(getStage().thumb({ kind: 'good', id }, false, 96));
    const t = el('div');
    t.innerHTML = `<b>${esc(GOODS[id]?.name || id)}</b><small>${esc(label)}</small>`;
    chip.appendChild(t);
    return chip;
  }

  forgeBench() {
    const pr = this.progress;
    const box = el('div', 'smith-bench');
    const row = (title, sub, buttons) => {
      const r = el('div', 'smith-row');
      const info = el('div');
      info.innerHTML = `<b>${esc(title)}</b><small>${esc(sub)}</small>`;
      r.appendChild(info);
      const acts = el('div', 'smith-acts');
      for (const b of buttons) {
        const btn = el('button', 'cat-btn' + (b.on ? ' go' : ''), esc(b.label));
        btn.type = 'button';
        btn.disabled = !b.on;
        btn.onclick = b.run;
        acts.appendChild(btn);
      }
      r.appendChild(acts);
      return r;
    };
    const bars = pr.good('iron_bar');
    const heads = pr.good('arrowhead');
    const shafts = pr.good('arrow_shaft');
    box.appendChild(row(
      'Arrowheads',
      `1 iron bar makes ${HEADS_PER_BAR}. You have ${bars} ${bars === 1 ? 'bar' : 'bars'} and ${heads} heads.`,
      [
        { label: `Forge ${HEADS_PER_BAR}`, on: bars >= 1, run: () => this.madeHeads(false) },
        { label: 'Forge all', on: bars >= 1, run: () => this.madeHeads(true) },
      ],
    ));
    const pair = Math.min(heads, shafts);
    box.appendChild(row(
      'Head the shafts',
      `1 arrowhead and 1 shaft make an iron arrow. ${heads} heads, ${shafts} shafts.`,
      [
        { label: 'Make 1', on: pair >= 1, run: () => this.madeArrows(false) },
        { label: 'Make all', on: pair >= 1, run: () => this.madeArrows(true) },
      ],
    ));
    const hasKnife = pr.crafted('knife');
    box.appendChild(row(
      'Carving knife',
      hasKnife ? 'In your tools. Use it on logs anywhere to shave arrow shafts.' : 'One iron bar. Carve shafts from logs wherever you stand.',
      [{ label: hasKnife ? 'Forged' : 'Forge knife', on: !hasKnife && bars >= 1, run: () => this.madeKnife() }],
    ));
    return box;
  }

  madeHeads(all) {
    const n = this.progress.forgeHeads(all);
    if (!n) return;
    this.game.audio.quest();
    this.game.hud.toast(`Forged ${n} arrowheads`, 1600);
    this.sparkForge();
    this.render();
  }

  madeArrows(all) {
    const n = this.progress.fletchArrows(all);
    if (!n) return;
    this.game.audio.quest();
    const load = this.progress.data.quiverLoad;
    const pocket = load?.id === 'iron_arrow' ? load.n : 0;
    this.game.hud.toast(pocket ? `Made ${n} iron arrows · ${pocket} in the quiver` : `Made ${n} iron arrows`, 1800);
    this.sparkForge();
    this.render();
  }

  madeKnife() {
    if (!this.progress.craftKnife()) return;
    this.game.audio.quest();
    this.game.hud.toast('Forged a carving knife', 1600);
    this.sparkForge();
    this.render();
  }

  sparkForge() {
    const f = this.game.world.forge;
    if (!f) return;
    this.game.fx.burst(f.x + 0.4, f.y + 1.1, f.z, [0xff8a1e, 0xffd27a, 0xffffff], 16, 3.5, 0.09, 0.8, 6, 2);
  }

  fillGear(info, g, known) {
    const pr = this.progress;
    if (!known) {
      const m = monsterById(g.monster);
      info.innerHTML = `<h3>???</h3><p class="cat-muted">A weapon or armor piece forged from the parts of a monster you have not discovered yet.</p>`;
      void m;
      return;
    }
    const smith = g.monster === 'smith';
    const m = smith ? { name: 'iron bars' } : monsterById(g.monster);
    const set = g.set ? setById(g.set) : null;
    const stats =
      g.type === 'weapon'
        ? g.stats.map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join('')
        : `<div><small>Slot</small><b>${SLOT_LABEL[g.slot]}</b></div><div><small>Defense</small><b>+${g.def}</b></div>${g.bonus ? `<div><small>Bonus</small><b>${bonusText(g.bonus)}</b></div>` : ''}`;
    const kindTag = g.type === 'weapon' ? WEAPON_LABEL[g.wtype] : `${set ? TIER_LABEL[set.tier] + ' ' : ''}${SLOT_LABEL[g.slot]}`;
    info.innerHTML = `<h3>${esc(g.name)}</h3>
      <div class="cat-tags"><span>${kindTag}</span><span>From ${esc(m.name)}</span></div>
      <p>${esc(g.desc)}</p>
      <div class="cat-stats">${stats}</div>`;
    if (g.found) info.appendChild(el('p', 'cat-muted', g.monster === 'orcscout' ? 'Orc Scouts drop this. It is not forged at the smithy.' : `${m.name}s drop this whole, and only rarely (1 to 2%). It cannot be forged.`));
    else {
      info.appendChild(el('h4', null, 'Parts needed'));
      info.appendChild(this.recipeChips(g));
    }
    const actions = el('div', 'cat-actions');
    if (!pr.crafted(g.id)) {
      if (g.found) {
        info.appendChild(actions);
        return;
      }
      const can = this.forge && pr.canCraft(g);
      const b = el('button', 'cat-btn' + (can ? ' go' : ''), !this.forge ? 'Forge at the smithy' : pr.canCraft(g) ? 'Forge it' : 'Missing parts');
      b.type = 'button';
      b.disabled = !can;
      b.onclick = () => {
        if (!this.forge || !pr.craft(g.id)) return;
        this.game.applyGear();
        if (g.type === 'weapon') this.game.selectSlot(0, true);
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
      const b = el('button', 'cat-btn go', worn ? 'Unequip' : g.type === 'weapon' ? 'Equip' : 'Wear');
      b.type = 'button';
      b.onclick = () => {
        this.game.wearPiece(g.id);
        this.render();
      };
      actions.appendChild(b);
    }
    info.appendChild(actions);
    if (g.type === 'armor' && set) {
      info.appendChild(el('p', 'cat-muted', CORE_SLOTS.includes(g.slot) ? `${esc(set.name)}. ${esc(set.bonus)}` : `${esc(set.name)} extra. Worn alongside any set${g.slot === 'book' ? '; it also lets Spell Book mastery apply to staffs and wands' : g.slot === 'quiver' ? '. It fills from the arrows in your bag, 99 at a time' : ''}.`));
    }
  }

  fillSet(info, set, known) {
    const pr = this.progress;
    const m = set.monster === 'smith' ? { name: 'the smithy' } : monsterById(set.monster);
    if (!known) {
      info.innerHTML = `<h3>???</h3><p class="cat-muted">Discover the ${esc(m.name)} to reveal this armor set.</p>`;
      return;
    }
    const complete = pr.setComplete(set.id);
    info.innerHTML = `<h3>${esc(set.name)}</h3>
      <div class="cat-tags"><span>${TIER_LABEL[set.tier]} set</span><span>${set.role}</span><span>From ${esc(m.name)}</span><span>${pr.defense} defense worn</span></div>
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
