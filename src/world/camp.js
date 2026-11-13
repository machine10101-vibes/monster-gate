import * as THREE from 'three';
import { buildHumanoid, buildHeld, S } from '../entities/humanoid.js';
import { DUAL_KINDS, gripRoll, placeSheath } from '../entities/weaponModels.js';
import { buildTent } from './models.js';
import { buildCampfire } from './gatherModels.js';
import { toonMaterial } from '../engine/materials.js';
import { lookOptions } from '../systems/roster.js';

const SPACING = 2.1;
const FIRE_COLORS = [0xfff2a0, 0xff8a22, 0xfff6e0];

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function ease(k, dt) {
  return 1 - Math.exp(-k * dt);
}

function turn(from, to) {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** One hunter standing in the camp. Holds the model, the weapon on the back or in hand, and an idle pose. */
class CampFigure {
  constructor(id, look, armor, held) {
    this.id = id;
    this.obj = new THREE.Group();
    this.pivot = new THREE.Group();
    this.pivot.position.y = 0.55;
    this.obj.add(this.pivot);
    this.model = null;
    this.drawn = false;
    this.phase = Math.random() * 6;
    this.spin = 0;
    this.spinV = 0;
    this.yaw = 0;
    this.x = 0;
    this.z = 0;
    this.tx = 0;
    this.tz = 0;
    this.tyaw = 0;
    this.scale = 1;
    this.tscale = 1;
    this.held = held;
    this.rebuild(look, armor, held);
  }

  rebuild(look, armor, held) {
    if (this.model) {
      this.pivot.remove(this.model.root);
      this.model.root.traverse((o) => {
        if (o.isMesh && o.geometry) o.geometry.dispose();
      });
    }
    this.held = held || 'blade';
    this.model = buildHumanoid({ ...lookOptions(look), armor: armor || {} });
    this.model.root.position.y = -0.55;
    this.model.root.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    this.pivot.add(this.model.root);
    this.setDrawn(this.drawn, true);
  }

  setDrawn(on, force = false) {
    if (!force && on === this.drawn) return;
    this.drawn = on;
    const m = this.model;
    for (const slot of [m.heldSlot, m.backSlot, m.offhand]) {
      if (!slot) continue;
      while (slot.children.length) slot.remove(slot.children[0]);
    }
    const g = buildHeld(this.held);
    g.traverse((o) => (o.castShadow = true));
    if (on) {
      m.heldSlot.rotation.z = gripRoll(this.held);
      m.heldSlot.add(g);
      if (m.offhand && DUAL_KINDS.has(this.held)) {
        const twin = buildHeld(this.held === 'dual' ? 'blade' : this.held);
        twin.scale.setScalar(this.held === 'dual' ? 0.82 : 0.95);
        twin.rotation.y = Math.PI;
        m.offhand.add(twin);
      }
    } else if (m.backSlot) {
      placeSheath(g, this.held);
      m.backSlot.add(g);
    }
  }

  update(dt, t, selected) {
    this.x += (this.tx - this.x) * ease(7, dt);
    this.z += (this.tz - this.z) * ease(7, dt);
    this.scale += (this.tscale - this.scale) * ease(8, dt);
    this.spin += this.spinV * dt;
    if (!selected) this.spin += (0 - this.spin) * ease(4, dt);
    this.yaw += turn(this.yaw, this.tyaw) * ease(8, dt);
    this.obj.position.set(this.x, 0, this.z);
    this.obj.rotation.y = this.yaw + this.spin;
    this.obj.scale.setScalar(this.scale);
    const m = this.model;
    const s = Math.sin(t * 1.7 + this.phase);
    m.hip.position.y = 24 * S + s * 0.012;
    const armR = this.drawn ? -0.85 + s * 0.04 : s * 0.05;
    const armL = this.drawn ? 0.18 + s * 0.04 : -s * 0.05;
    m.armR.rotation.x += (armR - m.armR.rotation.x) * ease(10, dt);
    m.armL.rotation.x += (armL - m.armL.rotation.x) * ease(10, dt);
    m.legL.rotation.x += (0 - m.legL.rotation.x) * ease(10, dt);
    m.legR.rotation.x += (0 - m.legR.rotation.x) * ease(10, dt);
  }

  dispose() {
    this.model.root.traverse((o) => {
      if (o.isMesh && o.geometry) o.geometry.dispose();
    });
    this.obj.removeFromParent();
  }
}

/**
 * The camp behind the character screen: a clearing in the woods with a fire,
 * a tent, and the account's hunters standing in an arc facing the camera.
 * It sits well outside the village so the lineup never overlaps a villager.
 */
export class CampStage {
  constructor(game) {
    this.game = game;
    this.group = new THREE.Group();
    this.group.visible = false;
    this.origin = new THREE.Vector3(72, 0, -190);
    this.group.position.copy(this.origin);
    this.figures = new Map();
    this.order = [];
    this.selectedId = null;
    this.mode = 'lineup';
    this.preview = null;
    this.lightSpots = [];
    this.built = false;
    this.cam = { x: 0, y: 2, z: 10, lx: 0, ly: 1.4, lz: -6 };
    this.sway = 0;
    this.fireT = 0;
    this.spark = 0;
    this.focusShift = 0;
    game.scene.add(this.group);
  }

  mesh(parts, x, z, rot = 0, scale = 1, y = 0) {
    const mats = this.game.world.mats;
    const g = new THREE.Group();
    for (const p of parts) {
      const mesh = new THREE.Mesh(p.geo, p.kind === 'solid' ? mats.solid : p.kind === 'glow' ? mats.glow : mats.window);
      if (p.kind === 'solid' && this.shadows) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
      g.add(mesh);
    }
    g.position.set(x, y, z);
    g.rotation.y = rot;
    g.scale.setScalar(scale);
    this.group.add(g);
    return g;
  }

  build() {
    if (this.built) return;
    this.built = true;
    const M = this.game.world.models;
    const rand = rng(7041);
    const phone = !!(this.game.input?.touch || this.game.quality?.id === 'low');
    this.shadows = !phone;
    const grassCount = phone ? 120 : 520;
    const treeCount = phone ? 16 : 46;
    const plantCount = phone ? 20 : 70;

    const grass = toonMaterial({ color: 0x4f8f3a });
    const ground = new THREE.Mesh(new THREE.CylinderGeometry(30, 31.5, 2, phone ? 32 : 56), grass);
    ground.position.y = -1;
    ground.receiveShadow = this.shadows;
    this.group.add(ground);

    const dirt = new THREE.Mesh(new THREE.CylinderGeometry(7.6, 8, 0.08, 40), toonMaterial({ color: 0x8a6a46 }));
    dirt.position.y = 0.02;
    dirt.receiveShadow = this.shadows;
    this.group.add(dirt);
    const path = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.4, 0.1, 32), toonMaterial({ color: 0x735740 }));
    path.position.y = 0.04;
    path.receiveShadow = this.shadows;
    this.group.add(path);

    const patch = new THREE.BoxGeometry(1, 0.12, 1);
    const tones = [0x5aa043, 0x468733, 0x6cb04c, 0x3f7a30, 0x78b858];
    const patches = new THREE.InstancedMesh(patch, toonMaterial({}), grassCount);
    const mtx = new THREE.Matrix4();
    const col = new THREE.Color();
    for (let i = 0; i < grassCount; i++) {
      const a = rand() * Math.PI * 2;
      const r = 8 + Math.sqrt(rand()) * 21;
      const s = 0.8 + rand() * 1.8;
      mtx.compose(new THREE.Vector3(Math.cos(a) * r, 0.03, Math.sin(a) * r), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * 3), new THREE.Vector3(s, 1, s * (0.7 + rand() * 0.6)));
      patches.setMatrixAt(i, mtx);
      patches.setColorAt(i, col.setHex(tones[Math.floor(rand() * tones.length)]));
    }
    patches.receiveShadow = this.shadows;
    this.group.add(patches);

    const stones = new THREE.InstancedMesh(new THREE.BoxGeometry(0.62, 0.42, 0.55), toonMaterial({}), 12);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      mtx.compose(new THREE.Vector3(Math.cos(a) * 1.55, 0.2, Math.sin(a) * 1.55), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), a + rand() * 0.5), new THREE.Vector3(1, 0.8 + rand() * 0.5, 1));
      stones.setMatrixAt(i, mtx);
      stones.setColorAt(i, col.setHex(i % 3 === 0 ? 0x9a9da4 : 0x7c7f86));
    }
    stones.castShadow = this.shadows;
    this.group.add(stones);

    const fire = buildCampfire('oak');
    this.logs = this.mesh(fire.logs, 0, 0, 0.5, 1.25);
    this.flame = this.mesh(fire.flame, 0, 0, 0.5, 1.25);
    this.fireLight = new THREE.PointLight(0xff8a30, 5.5, 20, 1.5);
    this.fireLight.position.set(0, 1.3, 0);
    this.group.add(this.fireLight);

    this.mesh(buildTent(3, 0x2f9a8e), -13.5, -8.5, 0.5, 1.2);
    this.mesh(buildTent(4, 0x3c6fb5), 14.5, -10, -0.55, 1.2);

    const torches = [[-6.8, 4.2], [6.8, 4.2]];
    for (const [x, z] of torches) {
      this.mesh(M.torch, x, z, 0, 1.2);
      this.lightSpots.push({ x: this.origin.x + x, y: 1.9, z: this.origin.z + z, color: 0xffa040 });
    }
    this.lightSpots.push({ x: this.origin.x, y: 1.2, z: this.origin.z, color: 0xff8a30 });

    for (const [x, z, r] of [[-3.8, 2.6, 0.7], [3.9, 2.4, -0.6], [-2.2, 4.4, 1.9]]) this.mesh(M.logs[Math.floor(rand() * 2)], x, z, r, 1.1);
    for (const [x, z] of [[-9, 3.4], [9.4, 2.2], [-11, -2], [11.5, -1.5]]) this.mesh(M.crate[Math.floor(rand() * 2)], x, z, rand() * 3, 1.2);
    this.mesh(M.barrel[0], 10.4, 3.6, 0.4, 1.2);

    for (let i = 0; i < treeCount; i++) {
      const a = Math.PI * (0.02 + rand() * 1.96) + Math.PI * 0;
      const r = 13 + rand() * 15;
      const x = Math.cos(a) * r;
      const z = -Math.abs(Math.sin(a)) * r - 2 + (rand() - 0.5) * 3;
      if (Math.hypot(x + 13.5, z + 8.5) < 6 || Math.hypot(x - 14.5, z + 10) < 6) continue;
      const kind = rand();
      const pool = kind < 0.6 ? M.pines : kind < 0.85 ? M.oaks : M.teal;
      this.mesh(pool[Math.floor(rand() * pool.length)], x, z, rand() * 6.28, 1.15 + rand() * 0.7);
    }
    for (let i = 0; i < plantCount; i++) {
      const a = rand() * Math.PI * 2;
      const r = 5.5 + rand() * 20;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (z > 6.5) continue;
      const k = rand();
      const pool = k < 0.45 ? M.tufts : k < 0.62 ? M.ferns : k < 0.8 ? M.flowers : k < 0.9 ? M.bushes : M.rocks;
      this.mesh(pool[Math.floor(rand() * pool.length)], x, z, rand() * 6.28, 1 + rand() * 0.5);
    }

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.78, 1.05, 40),
      new THREE.MeshBasicMaterial({ color: 0xffd45a, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.09;
    this.ring = ring;
    ring.visible = false;
    this.group.add(ring);
  }

  show() {
    this.build();
    this.group.visible = true;
  }

  hide() {
    this.group.visible = false;
    this.clear();
    this.ring && (this.ring.visible = false);
  }

  get active() {
    return this.group.visible;
  }

  clear() {
    for (const f of this.figures.values()) f.dispose();
    this.figures.clear();
    this.order = [];
    this.preview?.dispose();
    this.preview = null;
  }

  /** Fill the camp with one figure per character, in list order. */
  setLineup(entries, selectedId) {
    const keep = new Set(entries.map((e) => e.char.id));
    for (const [id, f] of this.figures) {
      if (!keep.has(id)) {
        f.dispose();
        this.figures.delete(id);
      }
    }
    this.preview?.dispose();
    this.preview = null;
    this.mode = 'lineup';
    this.order = entries.map((e) => e.char.id);
    const fresh = [];
    for (const e of entries) {
      let f = this.figures.get(e.char.id);
      if (!f) {
        f = new CampFigure(e.char.id, e.char.look, e.info.armor, e.info.held);
        this.group.add(f.obj);
        this.figures.set(e.char.id, f);
        fresh.push(f);
      } else {
        f.rebuild(e.char.look, e.info.armor, e.info.held);
      }
      f.obj.visible = true;
    }
    this.layout();
    for (const f of fresh) {
      f.x = f.tx;
      f.z = f.tz;
      f.yaw = f.tyaw;
    }
    this.select(selectedId && this.figures.has(selectedId) ? selectedId : this.order[0] || null);
  }

  layout() {
    const n = this.order.length;
    const r = 6.4 + Math.max(0, n - 4) * 0.55;
    const step = SPACING / r;
    this.order.forEach((id, i) => {
      const f = this.figures.get(id);
      if (!f) return;
      const a = (i - (n - 1) / 2) * step;
      f.tx = Math.sin(a) * r;
      f.tz = -Math.cos(a) * r + 0.6;
      f.tyaw = Math.atan2(this.cam.x - f.tx, this.cam.z - f.tz);
    });
  }

  select(id) {
    this.selectedId = id;
    for (const [fid, f] of this.figures) {
      const on = fid === id;
      f.setDrawn(on);
      f.tscale = on ? 1.1 : 1;
      if (!on) f.spinV = 0;
    }
    this.layout();
    const sel = this.figures.get(id);
    if (sel) {
      sel.tz += 1.0;
      sel.spin = 0;
    }
  }

  spinSelected(dir) {
    const f = this.figures.get(this.selectedId);
    if (f) f.spinV = dir * 2.4;
  }

  nudgeSelected(rad) {
    const f = this.figures.get(this.selectedId);
    if (f) f.spin += rad;
  }

  /** Show one hunter large, for the creation screen. */
  setPreview(look, armor, held) {
    for (const f of this.figures.values()) f.obj.visible = false;
    this.mode = 'create';
    if (!this.preview) {
      this.preview = new CampFigure('preview', look, armor, held);
      this.group.add(this.preview.obj);
      this.preview.x = this.preview.tx = 0;
      this.preview.z = this.preview.tz = -1.4;
      this.preview.tyaw = this.preview.yaw = 0;
      this.preview.tscale = 1.28;
      this.preview.scale = 1.28;
      this.preview.setDrawn(true);
    } else {
      this.preview.rebuild(look, armor, held);
    }
  }

  endPreview() {
    this.preview?.dispose();
    this.preview = null;
    this.mode = 'lineup';
    for (const f of this.figures.values()) f.obj.visible = true;
  }

  aspect() {
    return window.innerWidth / Math.max(1, window.innerHeight);
  }

  /** Screen position above or below a figure, or null when it is off screen. */
  screenAt(id, dy) {
    const f = id === 'preview' ? this.preview : this.figures.get(id);
    if (!f) return null;
    const p = this.origin;
    return this.game.screenOf(p.x + f.x, p.y + dy * f.scale, p.z + f.z, true);
  }

  pick(clientX, clientY) {
    const g = this.game;
    const rect = g.renderer.domElement.getBoundingClientRect();
    const v = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -(((clientY - rect.top) / rect.height) * 2 - 1));
    g.ray.setFromCamera(v, g.camera);
    let best = null;
    let bestD = Infinity;
    for (const [id, f] of this.figures) {
      const hit = g.ray.intersectObject(f.obj, true)[0];
      if (hit && hit.distance < bestD) {
        bestD = hit.distance;
        best = id;
      }
    }
    return best;
  }

  /** Frame the lineup: every hunter on a wide screen, the chosen one and its neighbours on a narrow one. */
  placeCamera(dt) {
    const g = this.game;
    const c = this.cam;
    const asp = this.aspect();
    const tanV = Math.tan((g.camera.fov * Math.PI) / 360);
    const tanH = tanV * asp;
    let tx;
    let ty;
    let tz;
    let lx;
    let ly;
    let lz;
    if (this.mode === 'create') {
      const wide = asp > 1.05;
      const dist = wide ? 7.6 : 12.6;
      lx = wide ? 0.14 * 2 * tanH * dist : 0;
      ly = wide ? 1.15 : -0.85;
      lz = -1.4;
      tx = lx;
      ty = wide ? 1.7 : 1.5;
      tz = lz + dist;
    } else {
      const n = Math.max(1, this.order.length);
      const span = (n - 1) * SPACING * 0.92 + 3.6;
      const narrow = asp < 0.8;
      const usable = asp > 1.15 ? 0.74 : 1;
      const want = narrow ? Math.min(span, 5.8) : span;
      const dist = Math.max(7.4, Math.min(want / (2 * tanH * usable), 30));
      const sel = this.figures.get(this.selectedId);
      const visible = 2 * tanH * dist;
      const free = Math.max(0, span - visible * usable) / 2;
      const focus = sel ? Math.max(-free, Math.min(free, sel.tx)) : 0;
      const drop = (narrow ? 0.24 : window.innerHeight < 470 ? 0.14 : 0.06) * 2 * tanV * dist;
      lx = focus + (asp > 1.15 ? 0.14 * visible : 0);
      ly = 1.45 - drop;
      lz = -5.2;
      tx = lx;
      ty = 2.3 + (narrow ? 1.2 : 0);
      tz = lz + dist;
    }
    this.sway += dt;
    tx += Math.sin(this.sway * 0.25) * 0.35;
    const k = ease(4, dt || 1);
    c.x += (tx - c.x) * k;
    c.y += (ty - c.y) * k;
    c.z += (tz - c.z) * k;
    c.lx += (lx - c.lx) * k;
    c.ly += (ly - c.ly) * k;
    c.lz += (lz - c.lz) * k;
    const o = this.origin;
    g.camera.position.set(o.x + c.x, o.y + c.y, o.z + c.z);
    g.camera.lookAt(o.x + c.lx, o.y + c.ly, o.z + c.lz);
    g.camera.updateMatrixWorld();
    g.cam.look.set(o.x + c.lx, o.y + c.ly, o.z + c.lz);
  }

  update(dt, t) {
    if (!this.active) return;
    this.fireT += dt;
    const flick = 0.88 + Math.sin(this.fireT * 17) * 0.08 + Math.sin(this.fireT * 9.3) * 0.06;
    this.flame?.scale.set(1.25, 1.25 * flick, 1.25);
    if (this.fireLight) this.fireLight.intensity = 4.6 + Math.sin(this.fireT * 13) * 0.9 + Math.sin(this.fireT * 23) * 0.4;
    this.spark -= dt;
    if (this.spark <= 0) {
      this.spark = 0.07 + Math.random() * 0.08;
      const o = this.origin;
      this.game.fx.burst(o.x + (Math.random() - 0.5) * 0.5, 1.1, o.z + (Math.random() - 0.5) * 0.5, FIRE_COLORS, 1, 0.8, 0.05, 1.1, -1.4, 1.4);
    }
    for (const [id, f] of this.figures) f.update(dt, t, id === this.selectedId);
    this.preview?.update(dt, t, true);
    const sel = this.mode === 'lineup' ? this.figures.get(this.selectedId) : null;
    this.ring.visible = !!sel;
    if (sel) {
      this.ring.position.x = sel.x;
      this.ring.position.z = sel.z;
      const pulse = 1 + Math.sin(t * 3) * 0.05;
      this.ring.scale.setScalar(sel.scale * pulse);
    }
  }
}
