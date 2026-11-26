import * as THREE from 'three';
import { buildHumanoid, buildHeld, S } from '../entities/humanoid.js';
import { DUAL_KINDS, gripRoll, placeSheath } from '../entities/weaponModels.js';
import { buildTent } from './models.js';
import { buildCampfire } from './gatherModels.js';
import { toonMaterial } from '../engine/materials.js';
import { lookOptions } from '../systems/roster.js';
import { placeRuneGate } from './runeGate.js';

const SPACING = 2.1;
/** Where the new hunter stands while being made: in front of the fire, so the flames light them from behind. */
const PREVIEW_Z = 2.9;
const GATE_Z = -26;
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

const fireflyVert = `
attribute float phase;
uniform float uTime;
uniform float uScale;
varying float vA;
void main(){
  vec3 p = position;
  p.x += sin(uTime * 0.55 + phase * 6.0) * 0.9;
  p.y += sin(uTime * 0.8 + phase * 3.0) * 0.45;
  p.z += cos(uTime * 0.45 + phase * 4.0) * 0.9;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float blink = 0.5 + 0.5 * sin(uTime * 2.1 + phase * 12.0);
  vA = smoothstep(0.25, 1.0, blink);
  gl_PointSize = (2.5 + 3.5 * vA) * uScale / -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
const fireflyFrag = `
varying float vA;
void main(){
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = pow(max(0.0, 1.0 - d), 1.8) * vA;
  gl_FragColor = vec4(vec3(0.86, 1.0, 0.48) * a, a);
}`;
const smokeVert = `
attribute float phase;
uniform float uTime;
uniform float uScale;
varying float vA;
void main(){
  float life = fract(uTime * 0.11 + phase);
  vec3 p = position;
  p.x += sin(phase * 20.0 + uTime * 0.6) * 0.35 * life + life * life * 1.6;
  p.y += life * 7.0;
  p.z += cos(phase * 13.0) * 0.35 * life;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vA = (1.0 - life) * smoothstep(0.0, 0.12, life) * 0.2;
  gl_PointSize = (0.35 + 1.5 * life) * uScale / -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
const smokeFrag = `
varying float vA;
void main(){
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = smoothstep(1.0, 0.2, d) * vA;
  gl_FragColor = vec4(0.52, 0.5, 0.56, a);
}`;
const petalVert = `
attribute float phase;
attribute vec3 color;
uniform float uTime;
uniform float uScale;
varying vec3 vCol;
varying float vA;
void main(){
  float fall = fract(uTime * 0.045 + phase);
  vec3 p = position;
  p.y = 9.0 - fall * 9.0;
  p.x += sin(uTime * 0.8 + phase * 7.0) * 0.9 + fall * 2.5;
  p.z += cos(uTime * 0.6 + phase * 5.0) * 0.6;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vCol = color;
  vA = smoothstep(0.0, 0.08, fall) * smoothstep(1.0, 0.9, fall);
  gl_PointSize = 0.11 * uScale / -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
const petalFrag = `
varying vec3 vCol;
varying float vA;
void main(){
  if (vA < 0.05) discard;
  gl_FragColor = vec4(vCol, vA);
}`;

function points(count, fill, vert, frag, opts = {}) {
  const pos = new Float32Array(count * 3);
  const phase = new Float32Array(count);
  const col = opts.colors ? new Float32Array(count * 3) : null;
  for (let i = 0; i < count; i++) fill(i, pos, phase, col);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('phase', new THREE.BufferAttribute(phase, 1));
  if (col) g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: { uTime: { value: 0 }, uScale: { value: 600 } },
    vertexShader: vert,
    fragmentShader: frag,
  });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false;
  return pts;
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
    if (!parts) return null;
    const mats = this.game.world.mats;
    const g = new THREE.Group();
    for (const p of Array.isArray(parts) ? parts : [parts]) {
      if (!p?.geo) continue;
      const mat = p.kind === 'glow' ? mats.glow : p.kind === 'window' ? mats.window : p.kind === 'cover' ? mats.cover : mats.solid;
      if (!mat) continue;
      const mesh = new THREE.Mesh(p.geo, mat);
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

    const grass = toonMaterial({ color: 0x5a9644, vertexColors: true });
    const segs = phone ? 48 : 80;
    const groundGeo = new THREE.CircleGeometry(31, segs);
    groundGeo.rotateX(-Math.PI / 2);
    const gcol = new Float32Array(groundGeo.attributes.position.count * 3);
    for (let i = 0; i < groundGeo.attributes.position.count; i++) {
      const px = groundGeo.attributes.position.getX(i);
      const pz = groundGeo.attributes.position.getZ(i);
      const d = Math.hypot(px, pz) / 31;
      const n = (Math.sin(px * 0.18) + Math.cos(pz * 0.16)) * 0.04;
      const shade = 0.88 + (1 - d) * 0.12 + n;
      gcol[i * 3] = 0.32 * shade;
      gcol[i * 3 + 1] = 0.55 * shade;
      gcol[i * 3 + 2] = 0.24 * shade;
    }
    groundGeo.setAttribute('color', new THREE.BufferAttribute(gcol, 3));
    const ground = new THREE.Mesh(groundGeo, grass);
    ground.position.y = 0;
    ground.receiveShadow = this.shadows;
    this.group.add(ground);
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(31, 31.4, 1.4, segs, 1, true), toonMaterial({ color: 0x4a7a38 }));
    skirt.position.y = -0.7;
    this.group.add(skirt);

    const dirt = new THREE.Mesh(new THREE.CircleGeometry(7.8, 40), toonMaterial({ color: 0x8a6a46 }));
    dirt.rotation.x = -Math.PI / 2;
    dirt.position.y = 0.02;
    dirt.receiveShadow = this.shadows;
    this.group.add(dirt);
    const path = new THREE.Mesh(new THREE.CircleGeometry(4.4, 36), toonMaterial({ color: 0x735740 }));
    path.rotation.x = -Math.PI / 2;
    path.position.y = 0.04;
    path.receiveShadow = this.shadows;
    this.group.add(path);

    const tuftGeo = new THREE.ConeGeometry(0.35, 0.55, 5);
    const tones = [0x5aa043, 0x468733, 0x6cb04c, 0x3f7a30, 0x78b858];
    const patches = new THREE.InstancedMesh(tuftGeo, toonMaterial({}), grassCount);
    const mtx = new THREE.Matrix4();
    const col = new THREE.Color();
    for (let i = 0; i < grassCount; i++) {
      const a = rand() * Math.PI * 2;
      const r = 8 + Math.sqrt(rand()) * 21;
      const s = 0.6 + rand() * 1.1;
      mtx.compose(new THREE.Vector3(Math.cos(a) * r, 0.22, Math.sin(a) * r), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * 3), new THREE.Vector3(s, 1, s * (0.7 + rand() * 0.6)));
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
      stones.setColorAt(i, col.setHex(i % 3 === 0 ? 0x6c6f76 : 0x56595f));
    }
    stones.castShadow = this.shadows;
    this.group.add(stones);

    const fire = buildCampfire('oak');
    this.logs = this.mesh(fire.logs, 0, 0, 0.5, 1.25);
    this.flame = this.mesh(fire.flame, 0, 0, 0.5, 1.25);
    this.keyLight = new THREE.PointLight(0xfff0dc, 2.2, 26, 1.2);
    this.keyLight.position.set(2.5, 4.2, 10.5);
    this.group.add(this.keyLight);
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
      const a = Math.PI * (0.05 + rand() * 0.9) * (rand() < 0.5 ? 1 : -1) + Math.PI;
      const r = 12 + rand() * 16;
      const x = Math.cos(a) * r;
      const z = -Math.abs(Math.sin(a)) * r - 2 + (rand() - 0.5) * 3;
      if (Math.hypot(x + 13.5, z + 8.5) < 6 || Math.hypot(x - 14.5, z + 10) < 6) continue;
      if (Math.abs(x) < 9 && z < -8 && z > GATE_Z - 8) continue;
      const kind = rand();
      const pool = kind < 0.55 ? M.oaks : kind < 0.78 ? M.teal : kind < 0.9 ? M.blossoms : M.pines;
      const scale = (kind < 0.78 ? 1.35 : 1.05) + rand() * 0.55;
      this.mesh(pool[Math.floor(rand() * pool.length)], x, z, rand() * 6.28, scale);
      if (kind < 0.7 && rand() < 0.55) {
        this.mesh(M.oaks[Math.floor(rand() * M.oaks.length)], x + (rand() - 0.5) * 1.4, z + (rand() - 0.5) * 1.4, rand() * 6.28, scale * 0.55);
      }
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

    this.buildBackdrop(rand, phone);
  }

  /** The gate, distant peaks, lanterns, and the drifting life around the fire. */
  buildBackdrop(rand, phone) {
    const world = this.game.world;
    if (world) {
      this.gate = placeRuneGate(world, { name: 'camp-gate', parent: this.group, x: 0, z: GATE_Z, y: 0, yaw: 0, collide: false, glow: 0.6 });
      this.gate.group.scale.setScalar(1.35);
    }

    // A ring of far peaks gives the clearing depth through the gaps in the trees.
    const peakMat = toonMaterial({ color: 0x40586c });
    const snowMat = toonMaterial({ color: 0xe6eef4 });
    for (let i = 0; i < 11; i++) {
      const a = Math.PI * (1.08 + (i / 10) * 0.84);
      const r = 46 + rand() * 10;
      const h = 16 + rand() * 14;
      const w = 9 + rand() * 7;
      const peak = new THREE.Mesh(new THREE.ConeGeometry(w, h, 6), peakMat);
      peak.position.set(Math.cos(a) * r, h / 2 - 1.5, Math.sin(a) * r);
      peak.rotation.y = rand() * 3;
      this.group.add(peak);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(w * 0.34, h * 0.34, 6), snowMat);
      cap.position.set(peak.position.x, h - 1.5 - h * 0.17 + 0.05, peak.position.z);
      cap.rotation.y = peak.rotation.y;
      this.group.add(cap);
    }

    // A string of lanterns between two posts behind the lineup, swaying in the breeze.
    const wood = toonMaterial({ color: 0x4a3322 });
    const capMat = toonMaterial({ color: 0x2a2018 });
    const glow = new THREE.MeshBasicMaterial({ color: 0xff9a2a });
    const ends = [[-10, -12], [10, -12]];
    for (const [x, z] of ends) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.6, 0.3), wood);
      post.position.set(x, 2.3, z);
      post.castShadow = this.shadows;
      this.group.add(post);
    }
    const ropePts = [];
    const sag = (k) => 4.5 - Math.sin(k * Math.PI) * 1.1;
    for (let i = 0; i <= 24; i++) {
      const k = i / 24;
      ropePts.push(new THREE.Vector3(-10 + k * 20, sag(k), -12));
    }
    this.group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ropePts), new THREE.LineBasicMaterial({ color: 0x2a1e14 })));
    this.lanterns = [];
    const lanternBody = new THREE.BoxGeometry(0.22, 0.3, 0.22);
    const lanternCap = new THREE.BoxGeometry(0.3, 0.07, 0.3);
    for (let i = 1; i <= 7; i++) {
      const k = i / 8;
      const pivot = new THREE.Group();
      pivot.position.set(-10 + k * 20, sag(k), -12);
      const body = new THREE.Mesh(lanternBody, glow);
      body.position.y = -0.36;
      const top = new THREE.Mesh(lanternCap, capMat);
      top.position.y = -0.19;
      const base = new THREE.Mesh(lanternCap, capMat);
      base.position.y = -0.53;
      pivot.add(body, top, base);
      this.group.add(pivot);
      this.lanterns.push({ pivot, phase: rand() * 6 });
    }

    // Fireflies over the grass, smoke from the fire, and petals drifting down from the trees.
    const flies = phone ? 50 : 140;
    this.fireflies = points(flies, (i, pos, phase) => {
      const a = rand() * Math.PI * 2;
      const r = 4 + rand() * 18;
      pos.set([Math.cos(a) * r, 0.5 + rand() * 3, Math.sin(a) * r - 2], i * 3);
      phase[i] = rand();
    }, fireflyVert, fireflyFrag, { additive: true });
    this.group.add(this.fireflies);

    this.smoke = points(phone ? 18 : 36, (i, pos, phase) => {
      pos.set([(rand() - 0.5) * 0.5, 1.4, (rand() - 0.5) * 0.5], i * 3);
      phase[i] = i / (phone ? 18 : 36);
    }, smokeVert, smokeFrag);
    this.group.add(this.smoke);

    const petalTones = [[0.94, 0.62, 0.78], [0.98, 0.78, 0.86], [0.55, 0.78, 0.36], [0.92, 0.78, 0.36]];
    this.petals = points(phone ? 40 : 110, (i, pos, phase, col) => {
      const a = rand() * Math.PI * 2;
      const r = 3 + rand() * 20;
      pos.set([Math.cos(a) * r, 0, Math.sin(a) * r - 3], i * 3);
      phase[i] = rand();
      col.set(petalTones[Math.floor(rand() * petalTones.length)], i * 3);
    }, petalVert, petalFrag, { colors: true });
    this.group.add(this.petals);
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
      this.preview.z = this.preview.tz = PREVIEW_Z;
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
      // Stand the hunter in the middle of the screen space the panels leave open.
      const W = window.innerWidth;
      const H = Math.max(1, window.innerHeight);
      const f = this.frame || { l: 0, t: 0, r: W, b: H };
      const fw = Math.max(80, f.r - f.l);
      const fh = Math.max(80, f.b - f.t);
      const s = this.preview?.scale || 1.28;
      const body = 2.15 * s;
      const needH = ((body + 0.7) / 0.82) * (H / fh);
      const needW = ((1.7 * s) / 0.7) * (W / fw);
      const dist = Math.max(4.5, Math.min(18, Math.max(needH / (2 * tanV), needW / (2 * tanH))));
      const visH = 2 * tanV * dist;
      const visW = 2 * tanH * dist;
      const cx = (f.l + f.r) / 2;
      const cy = (f.t + f.b) / 2;
      lz = PREVIEW_Z;
      lx = -((cx - W / 2) / W) * visW;
      ly = body * 0.55 + ((cy - H / 2) / H) * visH;
      tx = lx;
      ty = ly + 0.55;
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
    for (const pts of [this.fireflies, this.smoke, this.petals]) if (pts) pts.material.uniforms.uTime.value = t;
    this.gate?.tick(t);
    if (this.lanterns) {
      for (const l of this.lanterns) {
        l.pivot.rotation.z = Math.sin(t * 1.1 + l.phase) * 0.12;
        l.pivot.rotation.x = Math.sin(t * 0.8 + l.phase * 1.7) * 0.06;
      }
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
