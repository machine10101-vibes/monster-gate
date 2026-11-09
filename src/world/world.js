import * as THREE from 'three';
import { GeometryBatch, RNG, hash2, fbm, smoothstep, clamp } from '../engine/voxel.js';
import { buildAtlas, toonMaterial, patchHide, TILE } from '../engine/materials.js';
import {
  W, CENTER, TOWN, GUILD, GATE, WATER_Y, PLAY_RADIUS, FARM, ZONE, SMOOTH_PATHS,
  generateTile, buildTerrainMeshes,
} from './terrain.js';
import { STARTER, TILES } from './tiles.js';
import * as M from './models.js';
import { placeWaygate as buildWaygateSite } from './waygate.js';
import { FISH_SPOTS, WOOD_GROVES, buildGatherSites } from './gatherSite.js';

const CH = 16;
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

export class World {
  constructor(quality) {
    this.quality = quality;
    this.group = new THREE.Group();
    this.circles = [];
    this.boxes = [];
    this.buckets = new Map();
    this.lightSpots = [];
    this.treeDots = [];
    this.monsterSpawns = [];
    this.animated = [];
    this.occupied = new Map();
    this.batches = new Map();
    this.rng = new RNG(20260711);
  }

  /* ------------------------------ queries ------------------------------ */
  idx(x, z) {
    return clamp(Math.floor(z), 0, W - 1) * W + clamp(Math.floor(x), 0, W - 1);
  }
  heightAt(x, z) {
    const d = this.dock;
    if (d && x > d.x0 && x < d.x1 && z > d.z - d.hw && z < d.z + d.hw) return d.y;
    return this.data.H[this.idx(x, z)];
  }
  onDock(x, z, pad = 0) {
    const d = this.dock;
    return !!d && x > d.x0 - pad && x < d.x1 + pad && z > d.z - d.hw - pad && z < d.z + d.hw + pad;
  }
  isWater(x, z) {
    return this.heightAt(x, z) < WATER_Y;
  }
  zoneAt(x, z) {
    return this.data.zone[this.idx(x, z)];
  }
  nearPath(x, z, r = 1) {
    for (let dz = -r; dz <= r; dz++)
      for (let dx = -r; dx <= r; dx++) if (this.data.pathMask[this.idx(x + dx, z + dz)]) return true;
    return false;
  }
  playable(x, z) {
    return Math.hypot(x - CENTER.x, z - CENTER.z) < PLAY_RADIUS;
  }

  /** can a body walk from height `fromY` to (x,z)? */
  canStep(x, z, fromY) {
    const h = this.heightAt(x, z);
    return h - fromY <= 1.01 && h < 9 && this.playable(x, z);
  }

  /* ---------------------------- colliders ---------------------------- */
  bucketKey(x, z) {
    return Math.floor(x / 4) + ',' + Math.floor(z / 4);
  }
  addCollider(c) {
    const x0 = c.type === 'c' ? c.x - c.r : c.x - c.hw;
    const x1 = c.type === 'c' ? c.x + c.r : c.x + c.hw;
    const z0 = c.type === 'c' ? c.z - c.r : c.z - c.hd;
    const z1 = c.type === 'c' ? c.z + c.r : c.z + c.hd;
    for (let bz = Math.floor(z0 / 4); bz <= Math.floor(z1 / 4); bz++)
      for (let bx = Math.floor(x0 / 4); bx <= Math.floor(x1 / 4); bx++) {
        const k = bx + ',' + bz;
        if (!this.buckets.has(k)) this.buckets.set(k, []);
        this.buckets.get(k).push(c);
      }
  }
  circle(x, z, r) {
    this.addCollider({ type: 'c', x, z, r });
  }
  box(x, z, hw, hd) {
    this.addCollider({ type: 'b', x, z, hw, hd });
  }

  /** push a circle (pos, r) out of colliders; mutates pos */
  resolve(pos, r) {
    const bx0 = Math.floor((pos.x - r) / 4);
    const bx1 = Math.floor((pos.x + r) / 4);
    const bz0 = Math.floor((pos.z - r) / 4);
    const bz1 = Math.floor((pos.z + r) / 4);
    let hit = false;
    for (let bz = bz0; bz <= bz1; bz++)
      for (let bx = bx0; bx <= bx1; bx++) {
        const list = this.buckets.get(bx + ',' + bz);
        if (!list) continue;
        for (const c of list) {
          if (c.type === 'c') {
            const dx = pos.x - c.x;
            const dz = pos.z - c.z;
            const d = Math.hypot(dx, dz);
            const min = r + c.r;
            if (d < min) {
              const nx = d > 1e-5 ? dx / d : 1;
              const nz = d > 1e-5 ? dz / d : 0;
              pos.x = c.x + nx * min;
              pos.z = c.z + nz * min;
              hit = true;
            }
          } else {
            const cx = clamp(pos.x, c.x - c.hw, c.x + c.hw);
            const cz = clamp(pos.z, c.z - c.hd, c.z + c.hd);
            const dx = pos.x - cx;
            const dz = pos.z - cz;
            const d = Math.hypot(dx, dz);
            if (d < r) {
              if (d > 1e-5) {
                pos.x = cx + (dx / d) * r;
                pos.z = cz + (dz / d) * r;
              } else {
                const px = c.hw - Math.abs(pos.x - c.x);
                const pz = c.hd - Math.abs(pos.z - c.z);
                if (px < pz) pos.x = c.x + Math.sign(pos.x - c.x || 1) * (c.hw + r);
                else pos.z = c.z + Math.sign(pos.z - c.z || 1) * (c.hd + r);
              }
              hit = true;
            }
          }
        }
      }
    return hit;
  }

  /* ----------------------------- placement ----------------------------- */
  batchFor(x, z) {
    const k = Math.floor(x / CH) + ',' + Math.floor(z / CH);
    let b = this.batches.get(k);
    if (!b) {
      b = { solid: new GeometryBatch(), cover: new GeometryBatch(), glow: new GeometryBatch(), window: new GeometryBatch() };
      this.batches.set(k, b);
    }
    return b;
  }

  place(parts, x, y, z, rotY = 0, scale = 1, opts = {}) {
    const b = this.batchFor(x, z);
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY),
      new THREE.Vector3(scale, opts.scaleY ?? scale, scale)
    );
    for (const p of parts) {
      const target = p.kind === 'solid' ? (opts.cover ? b.cover : b.solid) : b[p.kind];
      target.add(p.geo, m, opts.tint || null);
    }
  }

  free(x, z, r) {
    const c = 2;
    const reach = Math.ceil((r + 3) / c);
    for (let dz = -reach; dz <= reach; dz++)
      for (let dx = -reach; dx <= reach; dx++) {
        const list = this.occupied.get(Math.floor(x / c) + dx + ',' + (Math.floor(z / c) + dz));
        if (!list) continue;
        for (const o of list) if (Math.hypot(o.x - x, o.z - z) < o.r + r) return false;
      }
    return true;
  }
  occupy(x, z, r) {
    const k = Math.floor(x / 2) + ',' + Math.floor(z / 2);
    if (!this.occupied.has(k)) this.occupied.set(k, []);
    this.occupied.get(k).push({ x, z, r });
  }

  putAt(parts, x, z, rotY = 0, scale = 1, opts = {}) {
    const y = opts.y ?? this.heightAt(x, z);
    this.place(parts, x, y, z, rotY, scale, opts);
  }

  torch(x, z, color = 0xffa040, parts = this.models.torch) {
    const y = this.heightAt(x, z);
    this.place(parts, x, y, z, 0, 1);
    this.lightSpots.push({ x, y: y + 1.55, z, color });
    this.circle(x, z, 0.12);
  }

  lamp(x, z) {
    const y = this.heightAt(x, z);
    this.place(this.models.lamp, x, y, z, 0, 1.15);
    this.lightSpots.push({ x, y: y + 2.5, z, color: 0xffc870 });
    this.circle(x, z, 0.2);
  }

  fenceLine(x0, z0, x1, z1, gaps = []) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.max(1, Math.round(len / 1.125));
    const dx = (x1 - x0) / n;
    const dz = (z1 - z0) / n;
    const ang = Math.atan2(-dz, dx);
    for (let i = 0; i < n; i++) {
      const x = x0 + dx * i;
      const z = z0 + dz * i;
      if (gaps.some((g) => x >= g[0] && x <= g[1] && z >= g[2] && z <= g[3])) continue;
      const piece = this.models.fence[i % this.models.fence.length];
      const sc = len / n / 1.125;
      this.place(piece, x, this.heightAt(x + dx * 0.5, z + dz * 0.5), z, ang, 1, { scaleY: 1 });
      void sc;
      this.circle(x + dx * 0.5, z + dz * 0.5, 0.3);
    }
    const last = this.models.fence[0];
    this.place(last, x1, this.heightAt(x1, z1), z1, ang, 1);
  }

  /* ------------------------------- build ------------------------------- */
  async build(progress = () => {}) {
    const q = this.quality;
    progress(0.02, 'Shaping the land');
    await nextFrame();
    this.tiles = TILES;
    this.activeTile = STARTER;
    this.data = generateTile(STARTER);
    if (!this.data) throw new Error('The Oakhollow tile failed to generate');
    const atlas = buildAtlas();
    this.atlas = atlas;
    this.mats = {
      terrain: patchHide(toonMaterial({ map: atlas.texture, vertexColors: true }), 'terrain'),
      solid: patchHide(toonMaterial({ vertexColors: true }), 'solid'),
      cover: patchHide(toonMaterial({ vertexColors: true }), 'cover'),
      glow: new THREE.MeshBasicMaterial({ vertexColors: true }),
      window: new THREE.MeshBasicMaterial({ vertexColors: true }),
    };
    this.mats.solid.side = THREE.FrontSide;

    progress(0.12, 'Raising the mountains');
    await nextFrame();
    this.terrain = buildTerrainMeshes(this.data, this.mats.terrain);
    this.group.add(this.terrain);
    this.buildWater();

    progress(0.3, 'Growing the fairy forest');
    await nextFrame();
    this.makeModels();

    progress(0.5, 'Building the village');
    await nextFrame();
    this.buildTown();
    this.buildGate();
    this.buildFarm();
    this.buildWindmill();
    buildGatherSites(this);

    progress(0.65, 'Scattering flowers and mushrooms');
    await nextFrame();
    this.scatterTrees();
    await nextFrame();
    this.scatterCover();
    this.placeWaygate();

    progress(0.85, 'Painting the final touches');
    await nextFrame();
    this.finalize();
    this.buildMinimap();
    progress(1, 'Ready');
  }

  makeModels() {
    const q = this.quality;
    const seeds = [1, 2, 3, 4];
    this.models = {
      pines: seeds.map((s) => M.buildPine(s)),
      snowPines: [1, 2].map((s) => M.buildPine(s + 10, true)),
      oaks: [1, 2, 3].map((s) => M.buildOak(s, 'green')),
      blossoms: [4, 5].map((s) => M.buildOak(s, 'blossom')),
      autumn: [6].map((s) => M.buildOak(s, 'autumn')),
      teal: [7, 8].map((s) => M.buildOak(s, 'teal')),
      giants: [1, 2].map((s) => M.buildGiant(s)),
      tufts: [1, 2, 3, 4, 5].map((s) => M.buildGrassTuft(s, 'green')),
      tuftsForest: [1, 2, 3].map((s) => M.buildGrassTuft(s + 20, 'forest')),
      tuftsGold: [1, 2].map((s) => M.buildGrassTuft(s + 40, 'gold')),
      flowers: [
        [0xffffff, 0xffd23f], [0xffd23f, 0xff8c1a], [0xff6f91, 0xffe27a], [0x8cc8ff, 0xffffff],
        [0xb678f0, 0xffe27a], [0xff5252, 0xffe27a],
      ].map((c, i) => M.buildFlower(i + 1, c[0], c[1])),
      ferns: [1, 2, 3].map((s) => M.buildFern(s)),
      bushes: [1, 2, 3].map((s) => M.buildBush(s, s === 2)),
      mushRed: [1, 2].map((s) => M.buildMushroom(s, 'red')),
      mushBrown: [1].map((s) => M.buildMushroom(s + 4, 'brown')),
      mushGlow: [1, 2].map((s) => M.buildMushroom(s + 8, 'glow')),
      mushPurple: [1].map((s) => M.buildMushroom(s + 12, 'purple')),
      bigMush: [M.buildBigMushroom(1, 'red'), M.buildBigMushroom(2, 'pink'), M.buildBigMushroom(3, 'purple'), M.buildBigMushroom(4, 'blue')],
      rocks: [1, 2, 3, 4].map((s) => M.buildRock(s)),
      boulders: [1, 2].map((s) => M.buildRock(s + 10, true)),
      stumps: [1, 2].map((s) => M.buildStump(s)),
      logs: [1, 2].map((s) => M.buildLog(s)),
      reeds: [1, 2, 3].map((s) => M.buildReed(s)),
      lily: [M.buildLilyPad(1), M.buildLilyPad(2), M.buildLilyPad(3, true)],
      torch: M.buildTorch(1),
      torchPurple: M.buildTorch(2, [0xb55cff, 0xe3b8ff]),
      lamp: M.buildStreetLamp(1),
      pots: [0, 1, 2, 3].map((k) => M.buildPot(k + 1, k)),
      crate: [1, 2].map((s) => M.buildCrate(s)),
      barrel: [1, 2].map((s) => M.buildBarrel(s)),
      chest: M.buildChest(1),
      forge: M.buildForge(3),
      anvil: M.buildAnvil(4),
      cauldron: M.buildCauldron(6),
      hay: M.buildHay(1),
      fence: [1, 2, 3].map((s) => M.buildFencePiece(s)),
      sign: M.buildSignpost(1),
      well: M.buildWell(1),
      scarecrow: M.buildScarecrow(1),
      wheat: [1, 2, 3, 4].map((s) => M.buildWheat(s, true)),
      wheatGreen: [1, 2].map((s) => M.buildWheat(s + 8, false)),
      crystals: [1, 2, 3].map((s) => M.buildCrystal(s)),
    };
    void q;
  }

  /* -------------------------------- water -------------------------------- */
  buildWater() {
    const geo = new THREE.PlaneGeometry(W, W, 1, 1);
    geo.rotateX(-Math.PI / 2);
    geo.translate(W / 2, WATER_Y, W / 2);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      fog: true,
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uTime: { value: 0 },
          uLight: { value: 1 },
          uDeep: { value: new THREE.Color(0x1d6f9a) },
          uShallow: { value: new THREE.Color(0x46c0c8) },
          uSky: { value: new THREE.Color(0xcfe9ff) },
        },
      ]),
      vertexShader: `
        #include <fog_pars_vertex>
        varying vec3 vWorld;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorld = wp.xyz;
          vec4 mvPosition = viewMatrix * wp;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `
        #include <fog_pars_fragment>
        uniform float uTime;
        uniform float uLight;
        uniform vec3 uDeep;
        uniform vec3 uShallow;
        uniform vec3 uSky;
        varying vec3 vWorld;
        float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float vn(vec2 p){
          vec2 i = floor(p); vec2 f = fract(p);
          f = f*f*(3.0-2.0*f);
          return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y);
        }
        void main() {
          vec2 q = floor(vWorld.xz * 6.0) / 6.0;
          float n = vn(q * 1.3 + vec2(uTime * 0.35, uTime * 0.2)) * 0.6 + vn(q * 3.1 - vec2(uTime * 0.25, -uTime * 0.3)) * 0.4;
          vec3 col = mix(uDeep, uShallow, smoothstep(0.25, 0.8, n));
          float sparkle = step(0.86, vn(q * 5.0 + uTime * 0.8)) * 0.55;
          float ripple = step(0.74, n) * 0.25;
          col += uSky * (sparkle + ripple);
          col *= uLight;
          gl_FragColor = vec4(col, 0.78);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`,
    });
    this.waterMat = mat;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 2;
    mesh.frustumCulled = false;
    this.group.add(mesh);
  }

  /* -------------------------------- town --------------------------------- */
  buildTown() {
    const m = this.models;
    const roofTeal = [0x3f7d79, 0x4a8c86, 0x356b68, 0x59a19a, 0x8a4b38];
    const roofRust = [0xa8452f, 0xb9553a, 0x93402c, 0xc66443, 0x7d3a2b];
    const roofGold = [0xc9a14a, 0xd9b45a, 0xb88f3c, 0xe6c76a, 0xa8802f];
    const roofMoss = [0x4f7f3a, 0x5d9444, 0x44702f, 0x6aa650, 0x3d5f2b];

    const guildParts = M.buildHouse({ w: 6, d: 6, wh: 28, seed: 1, sign: 'GUILD', bigDoor: true, roof: roofTeal, wall: 0x93603a, pitch: 1.15 });
    this.putAt(guildParts, GUILD.x, GUILD.z, 0, 1);
    this.box(GUILD.x, GUILD.z - 0.1, 3.1, 3.1);
    this.guildDoor = { x: GUILD.x, z: GUILD.z + 3.3 };

    const houses = [
      { x: 62.5, z: 72.5, rot: Math.PI / 2, w: 4, d: 5, roof: roofRust, wall: 0x9a6a3c, seed: 2, shutters: 0x4a8c86 },
      { x: 62.5, z: 81, rot: Math.PI / 2, w: 4, d: 5, roof: roofGold, wall: 0x8a5a34, seed: 3, shutters: 0xa8452f },
      { x: 81.5, z: 73, rot: -Math.PI / 2, w: 4, d: 5, roof: roofTeal, wall: 0x9a6a3c, seed: 4, shutters: 0xc66443 },
      { x: 81.5, z: 81.5, rot: -Math.PI / 2, w: 4, d: 5, roof: roofMoss, wall: 0x8a5a34, seed: 5, shutters: 0x4a8c86 },
    ];
    for (const h of houses) {
      const parts = M.buildHouse({ w: h.w, d: h.d, wh: 22, seed: h.seed, roof: h.roof, wall: h.wall, shutters: h.shutters, pitch: 1.05 });
      this.putAt(parts, h.x, h.z, h.rot, 1);
      const sw = h.rot === 0 ? [h.w * 0.5, h.d * 0.5] : [h.d * 0.5, h.w * 0.5];
      this.box(h.x, h.z, sw[0] + 0.1, sw[1] + 0.1);
    }

    const stallA = M.buildStall(1, [0xc8402f, 0xf2ead3], 'apple');
    const stallB = M.buildStall(2, [0x2f8f86, 0xf2ead3], 'pumpkin');
    this.putAt(stallA, 67, 86, 0, 1);
    this.box(67, 85.5, 2.1, 0.9);
    this.putAt(stallB, 77, 86, 0, 1);
    this.box(77, 85.5, 2.1, 0.9);
    this.market = { x: 77, y: this.heightAt(77, 84.2), z: 84.2 };
    const stallC = M.buildStall(3, [0x5b3d86, 0xe4d4f6], 'potion');
    this.putAt(stallC, 72, 86, 0, 1);
    this.box(72, 85.5, 2.1, 0.9);
    const ax = 71.2;
    const az = 83.8;
    const ay = this.heightAt(ax, az);
    this.putAt(m.cauldron, ax, az, 0.3, 1.15);
    this.circle(ax, az, 0.42);
    this.lightSpots.push({ x: ax, y: ay + 0.7, z: az, color: 0x5dffb0 });
    this.alchemy = { x: ax, y: ay, z: az };

    const tentA = M.buildTent(1, 0x2f9a8e);
    const tentB = M.buildTent(2, 0x3c6fb5);
    this.putAt(tentA, 79, 66, 0.15, 1);
    this.box(79, 66, 1.7, 2.1);
    this.putAt(tentB, 64.5, 66.5, -0.2, 1);
    this.box(64.5, 66.5, 1.7, 2.1);

    this.putAt(m.well, TOWN.x, TOWN.z, 0, 1.15);
    this.circle(TOWN.x, TOWN.z, 1.25);

    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
      const lx = TOWN.x + Math.cos(a) * 6.3;
      const lz = TOWN.z + Math.sin(a) * 5.2;
      const blocked = lz < 71.2 || lz > 82;
      if (!blocked) this.lamp(lx, lz);
    }
    this.torch(68.3, 70.9);
    this.torch(75.7, 70.9);

    const gpath = SMOOTH_PATHS.gate;
    for (let i = 4; i < gpath.length - 3; i += 5) {
      const [px, pz] = gpath[i];
      const side = (i / 5) % 2 === 0 ? 1 : -1;
      this.torch(px + side * 2.1, pz, 0xffa040);
    }
    const spath = SMOOTH_PATHS.south;
    for (let i = 8; i < 30; i += 6) {
      const [px, pz] = spath[i];
      this.torch(px + (i % 12 === 8 ? 2.1 : -2.1), pz, 0xffa040);
    }
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + 0.3;
      this.torch(GATE.x + Math.cos(a) * 5.6, GATE.z + Math.sin(a) * 5.6 + 0.6, 0xc27bff, m.torchPurple);
    }

    this.putAt(m.barrel[0], 76.2, 70.2, 0.3, 1.25);
    this.circle(76.2, 70.2, 0.4);
    this.putAt(m.barrel[1], 76.9, 70.9, 1.1, 1.25);
    this.circle(76.9, 70.9, 0.4);
    this.putAt(m.crate[0], 76.2, 69.4, 0.1, 1.4);
    this.putAt(m.crate[1], 76.3, 69.4, 0.5, 1.2, { y: this.heightAt(76.3, 69.4) + 0.875 });
    this.box(76.3, 69.4, 0.55, 0.55);
    this.putAt(m.chest, 66.2, 70.6, 0.4, 1.3);
    this.circle(66.2, 70.6, 0.5);
    for (const [x, z, k] of [[68.6, 72, 0], [75.5, 72.2, 1], [60.2, 69.5, 2], [60.2, 77.8, 3], [84.2, 70.5, 1], [66.5, 84.3, 0], [79.6, 78.4, 2]]) {
      this.putAt(m.pots[k], x, z, hash2(x, z, 1) * 6, 1.2);
      this.circle(x, z, 0.3);
    }
    this.putAt(m.sign, 71.2, 88.2, 0.2, 1.2);
    this.putAt(m.sign, 83.2, 76.8, Math.PI / 2, 1.1);
    this.putAt(m.crate[0], 70.3, 86.7, 0.3, 1.2);
    this.putAt(m.barrel[0], 64.9, 86.7, 0.3, 1.1);
    this.circle(70.3, 86.7, 0.4);
    this.circle(64.9, 86.7, 0.4);

    this.fenceLine(58.8, 75.5, 58.8, 79);
    this.fenceLine(58.8, 83.5, 58.8, 88);
    this.fenceLine(86.8, 69, 86.8, 72);

    const FX = 61.4;
    const FZ = 86.1;
    const fy = this.heightAt(FX, FZ);
    this.putAt(m.forge, FX, FZ, Math.PI / 2, 1.2);
    this.box(FX, FZ, 0.85, 1.25);
    this.putAt(m.anvil, 63.4, 86.1, Math.PI / 2, 1);
    this.circle(63.4, 86.1, 0.42);
    this.lightSpots.push({ x: FX + 0.7, y: fy + 0.9, z: FZ, color: 0xff7a22 });
    this.forge = { x: FX, y: fy, z: FZ, anvil: { x: 63.4, z: 86.1 } };

    this.npcSpots = {
      guild: { x: GUILD.x - 1.4, z: GUILD.z + 3.5 },
      smith: { x: 64.3, z: 85.2 },
      alchemist: { x: 73.4, z: 83.6 },
      farmer: { x: 90, z: 82 },
      child: { x: 72, z: 80.5 },
    };
  }

  buildGate() {
    const parts = M.buildGate(3);
    const y = this.heightAt(GATE.x, GATE.z);
    this.place(parts, GATE.x, y, GATE.z, 0, 1);
    this.box(GATE.x - 2.4, GATE.z, 0.95, 0.95);
    this.box(GATE.x + 2.4, GATE.z, 0.95, 0.95);
    this.box(GATE.x, GATE.z, 1.5, 0.3);
    this.gateY = y;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.4;
      const cx = GATE.x + Math.cos(a) * 4.2;
      const cz = GATE.z + Math.sin(a) * 3.4;
      this.putAt(this.models.crystals[i % 3], cx, cz, a, 1.5);
      this.circle(cx, cz, 0.35);
    }

    const shape = new THREE.Shape();
    shape.moveTo(-1.5, 0.62);
    shape.lineTo(1.5, 0.62);
    shape.lineTo(1.5, 5.5);
    shape.absarc(0, 5.5, 1.5, 0, Math.PI, false);
    shape.lineTo(-1.5, 0.62);
    const geo = new THREE.ShapeGeometry(shape, 16);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform float uTime; varying vec2 vP;
        float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float vn(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.0-2.0*f);
          return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y); }
        void main(){
          vec2 c = vec2(vP.x, vP.y - 3.1);
          float r = length(c);
          float a = atan(c.y, c.x);
          float sw = a + r * 2.2 - uTime * 0.9;
          vec2 q = floor(vec2(cos(sw), sin(sw)) * r * 7.0) / 7.0;
          float n = vn(q * 2.0 + uTime * 0.4) * 0.6 + vn(q * 5.0 - uTime * 0.7) * 0.4;
          float edge = smoothstep(1.55, 0.7, r);
          vec3 col = mix(vec3(0.25, 0.05, 0.55), vec3(0.85, 0.45, 1.0), n);
          col += vec3(0.5, 0.9, 1.0) * step(0.82, n) * 0.6;
          float core = smoothstep(0.6, 0.0, r) * 0.7;
          gl_FragColor = vec4(col * (0.55 + n * 0.8) + core, 0.4 + edge * 0.5);
        }`,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(GATE.x, y, GATE.z + 0.02);
    mesh.renderOrder = 3;
    this.gatePortal = mesh;
    this.portalMat = mat;
    this.group.add(mesh);
  }

  buildFarm() {
    const m = this.models;
    const rng = new RNG(555);
    for (let z = FARM.z0; z <= FARM.z1; z++) {
      if ((z - FARM.z0) % 2 === 1) continue;
      for (let x = FARM.x0; x <= FARM.x1; x++) {
        const px = x + 0.5 + rng.range(-0.15, 0.15);
        const pz = z + 0.5 + rng.range(-0.1, 0.1);
        const ripe = hash2(x, z, 3) > 0.35;
        const list = ripe ? m.wheat : m.wheatGreen;
        this.putAt(list[Math.floor(rng.next() * list.length)], px, pz, Math.floor(rng.next() * 4) * (Math.PI / 2), 1, { cover: true, y: this.heightAt(px, pz) + 0.02 });
      }
    }
    const cx = (FARM.x0 + FARM.x1 + 1) / 2;
    const cz = (FARM.z0 + FARM.z1 + 1) / 2;
    this.putAt(m.scarecrow, cx, cz + 1.0, 0.3, 1.4);
    this.circle(cx, cz + 1, 0.3);
    const x0 = FARM.x0 - 0.7;
    const x1 = FARM.x1 + 1.7;
    const z0 = FARM.z0 - 0.7;
    const z1 = FARM.z1 + 1.7;
    this.fenceLine(x0, z0, x1, z0);
    this.fenceLine(x1, z0, x1, z1);
    this.fenceLine(x1, z1, x0, z1);
    this.fenceLine(x0, z0, x0, z0 + 4);
    this.fenceLine(x0, z0 + 8, x0, z1);
    for (const [x, z] of [[FARM.x0 - 2, FARM.z1 + 2.5], [FARM.x1 + 3, FARM.z0 + 1.5], [FARM.x1 + 3.7, FARM.z0 + 2.4], [FARM.x0 - 3, FARM.z0 - 2]]) {
      this.putAt(m.hay, x, z, hash2(x, z, 4) * 3, 1.5);
      this.circle(x, z, 0.7);
    }
  }

  buildWindmill() {
    const wm = M.buildWindmill(2);
    const x = 114;
    const z = 71;
    const y = this.heightAt(x, z);
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = -Math.PI / 2 - 0.25;
    const makeMeshes = (parts, parent) => {
      for (const p of parts) {
        const mat = p.kind === 'solid' ? this.mats.solid : p.kind === 'glow' ? this.mats.glow : this.mats.window;
        const mesh = new THREE.Mesh(p.geo, mat);
        mesh.castShadow = p.kind === 'solid';
        mesh.receiveShadow = p.kind === 'solid';
        parent.add(mesh);
      }
    };
    makeMeshes(wm.body, g);
    const hubG = new THREE.Group();
    hubG.position.set(0, 5.8, 1.55);
    g.add(hubG);
    makeMeshes(wm.hub, hubG);
    const sailG = new THREE.Group();
    sailG.position.set(0, 0, 1.0);
    hubG.add(sailG);
    makeMeshes(wm.sails, sailG);
    this.group.add(g);
    this.windmillSails = sailG;
    this.circle(x, z, 1.9);
    this.windmillPos = { x, z };
  }

  /* ------------------------------ scattering ----------------------------- */
  scatterTrees() {
    const m = this.models;
    const rng = this.rng;
    const D = this.data;
    const dens = this.quality.density;
    const step = 2.3;
    let giants = 0;
    const okSpot = (x, z) => {
      if (x < 4 || z < 4 || x > W - 4 || z > W - 4) return false;
      const i = this.idx(x, z);
      const h = D.H[i];
      if (h < 0.9) return false;
      if (this.nearPath(x, z, 2)) return false;
      const zn = D.zone[i];
      if (zn === ZONE.TOWN || zn === ZONE.FARM || zn === ZONE.GATE || zn === ZONE.WATER || zn === ZONE.LAKE || zn === ZONE.MINE) return false;
      if (Math.hypot(x - GATE.x, z - GATE.z) < 9) return false;
      if (Math.hypot(x - TOWN.x, z - TOWN.z) < 15) return false;
      if (WOOD_GROVES.some((g) => Math.hypot(x - g.x, z - g.z) < g.r)) return false;
      return true;
    };
    const addTree = (parts, x, z, scale, r) => {
      const rot = Math.floor(rng.next() * 4) * (Math.PI / 2);
      this.putAt(parts, x, z, rot, scale);
      this.occupy(x, z, r * scale);
      this.circle(x, z, r * scale * 0.7);
      this.treeDots.push({ x, z });
    };
    for (let gz = 8; gz < W - 8; gz += step) {
      for (let gx = 8; gx < W - 8; gx += step) {
        const x = gx + rng.range(-1.1, 1.1);
        const z = gz + rng.range(-1.1, 1.1);
        const d = Math.hypot(x - CENTER.x, z - CENTER.z);
        if (d > 68) continue;
        if (!okSpot(x, z)) continue;
        const i = this.idx(x, z);
        const h = D.H[i];
        const fo = D.forest[i];
        const zn = D.zone[i];
        const roll = rng.next();
        if (zn === ZONE.MOUNTAIN || h > 8) {
          if (h > 15 || roll > 0.55 * dens + 0.1) continue;
          const s = rng.range(1.0, 1.7);
          if (!this.free(x, z, 1.1 * s)) continue;
          const list = h > 10 ? m.snowPines : m.pines;
          addTree(list[Math.floor(rng.next() * list.length)], x, z, s, 0.5);
        } else if (fo > 0.45) {
          if (roll > 0.8 * dens + 0.08) continue;
          const kind = rng.next();
          if (kind < 0.04 && z < 52 && giants < 22) {
            const s = rng.range(0.95, 1.25);
            if (!this.free(x, z, 3 * s)) continue;
            giants++;
            addTree(m.giants[Math.floor(rng.next() * m.giants.length)], x, z, s, 1.6);
          } else if (kind < 0.62) {
            const s = rng.range(0.95, 1.55);
            if (!this.free(x, z, 1.3 * s)) continue;
            addTree(m.pines[Math.floor(rng.next() * m.pines.length)], x, z, s, 0.5);
          } else if (kind < 0.9) {
            const pick = rng.next();
            const list = pick < 0.5 ? m.oaks : pick < 0.75 ? m.teal : pick < 0.92 ? m.blossoms : m.autumn;
            const s = rng.range(0.95, 1.4);
            if (!this.free(x, z, 1.7 * s)) continue;
            addTree(list[Math.floor(rng.next() * list.length)], x, z, s, 0.5);
          }
        } else if (zn === ZONE.FIELD) {
          if (roll > 0.045 * dens) continue;
          const pick = rng.next();
          const list = pick < 0.5 ? m.oaks : pick < 0.8 ? m.blossoms : pick < 0.9 ? m.autumn : m.pines;
          const s = rng.range(1.0, 1.4);
          if (!this.free(x, z, 2 * s)) continue;
          addTree(list[Math.floor(rng.next() * list.length)], x, z, s, 0.5);
        }
      }
    }
  }

  waterClear(x, z) {
    if (this.onDock(x, z, 1.6)) return false;
    return !FISH_SPOTS.some((f) => Math.hypot(f.x - x, f.z - z) < 1.9);
  }

  scatterCover() {
    const m = this.models;
    const rng = new RNG(999);
    const D = this.data;
    const dens = this.quality.density;
    const pickOf = (list) => list[Math.floor(rng.next() * list.length)];
    const cover = { cover: true };
    for (let gz = 6; gz < W - 6; gz += 1.15) {
      for (let gx = 6; gx < W - 6; gx += 1.15) {
        const x = gx + rng.range(-0.55, 0.55);
        const z = gz + rng.range(-0.55, 0.55);
        const d = Math.hypot(x - CENTER.x, z - CENTER.z);
        if (d > 62) continue;
        const i = this.idx(x, z);
        const h = D.H[i];
        const zn = D.zone[i];
        if (D.pathMask[i] || zn === ZONE.FARM || zn === ZONE.MINE) continue;
        const fo = D.forest[i];
        const y = h;
        const rot = rng.next() * Math.PI * 2;
        if (h < WATER_Y) {
          if (h <= 0 && rng.next() < 0.035 && d < 55 && this.waterClear(x, z)) {
            const flower = rng.next() < 0.2;
            this.putAt(flower ? m.lily[2] : pickOf(m.lily.slice(0, 2)), x, z, rot, 1, { y: WATER_Y + 0.02, cover: true });
          }
          continue;
        }
        if (h <= 0.5 + 0.01 && h >= WATER_Y) {
          if (rng.next() < 0.16 * dens && this.waterClear(x, z)) this.putAt(pickOf(m.reeds), x, z, rot, 1, cover);
          continue;
        }
        if (zn === ZONE.TOWN || zn === ZONE.GATE) {
          if (!this.free(x, z, 0.5)) continue;
          if (rng.next() < 0.06 * dens) this.putAt(pickOf(m.tufts), x, z, rot, 1, cover);
          continue;
        }
        if (zn === ZONE.MOUNTAIN || h > 8) {
          if (h < 12 && rng.next() < 0.06 * dens && this.free(x, z, 0.3)) this.putAt(pickOf(m.tuftsForest), x, z, rot, 1, cover);
          if (rng.next() < 0.02) this.rock(x, z, rng, true);
          continue;
        }
        const roll = rng.next();
        if (!this.free(x, z, 0.35)) {
          continue;
        }
        const patch = fbm(x * 0.13 + 5, z * 0.13, 55, 3);
        if (fo > 0.45) {
          if (roll < 0.17 * dens) this.putAt(pickOf(m.tuftsForest), x, z, rot, 1, cover);
          else if (roll < 0.17 * dens + 0.1 * dens) this.putAt(pickOf(m.ferns), x, z, rot, 1.1, cover);
          else if (roll < 0.3 * dens + 0.026) {
            const r2 = rng.next();
            const list = r2 < 0.38 ? m.mushGlow : r2 < 0.65 ? m.mushRed : r2 < 0.82 ? m.mushBrown : m.mushPurple;
            this.putAt(pickOf(list), x, z, rot, 1.25, cover);
          } else if (roll < 0.3 * dens + 0.03 && z < 58) {
            const s = rng.range(0.8, 1.3);
            if (this.free(x, z, 1.2 * s)) {
              this.putAt(pickOf(m.bigMush), x, z, rot, s);
              this.occupy(x, z, 0.8 * s);
              this.circle(x, z, 0.45 * s);
            }
          } else if (roll < 0.3 * dens + 0.035) this.rock(x, z, rng, false);
          else if (roll < 0.3 * dens + 0.045 && this.free(x, z, 0.9)) {
            this.putAt(pickOf(m.bushes), x, z, rot, 1.1);
            this.occupy(x, z, 0.7);
            this.circle(x, z, 0.5);
          }
        } else {
          const flowerPatch = patch > 0.56;
          if (flowerPatch && roll < 0.42 * dens) this.putAt(pickOf(m.flowers), x, z, rot, 1, cover);
          else if (roll < 0.27 * dens) this.putAt(rng.next() < 0.18 ? pickOf(m.tuftsGold) : pickOf(m.tufts), x, z, rot, 1, cover);
          else if (roll < 0.27 * dens + 0.012) this.rock(x, z, rng, false);
          else if (roll < 0.27 * dens + 0.02 && this.free(x, z, 0.9)) {
            this.putAt(pickOf(m.bushes), x, z, rot, 1.05);
            this.occupy(x, z, 0.7);
            this.circle(x, z, 0.5);
          } else if (roll < 0.27 * dens + 0.024) this.putAt(pickOf(m.mushRed), x, z, rot, 1.1, cover);
        }
      }
    }
    for (let i = 0; i < 14; i++) {
      const x = rng.range(20, 124);
      const z = rng.range(14, 56);
      const y = this.heightAt(x, z);
      if (!this.playable(x, z) || y < 1 || this.nearPath(x, z, 2) || !this.free(x, z, 1.2)) continue;
      const stump = rng.next() < 0.5;
      if (stump) this.putAt(this.models.stumps[i % 2], x, z, rng.next() * 6, 1.3);
      else this.putAt(this.models.logs[i % 2], x, z, rng.next() * 6, 1.3);
      this.occupy(x, z, 1.1);
      this.circle(x, z, 0.6);
    }
  }

  rock(x, z, rng, big) {
    const m = this.models;
    const list = big ? m.boulders : m.rocks;
    const s = big ? rng.range(1.4, 2.4) : rng.range(0.8, 1.4);
    if (!this.free(x, z, 0.9 * s)) return;
    this.putAt(list[Math.floor(rng.next() * list.length)], x, z, rng.next() * 6.28, s);
    this.occupy(x, z, 0.8 * s);
    this.circle(x, z, 0.5 * s);
  }

  /* -------------------------------- finalize ------------------------------- */
  finalize() {
    this.chunkMeshes = [];
    for (const [, b] of this.batches) {
      for (const kind of ['solid', 'cover', 'glow', 'window']) {
        if (b[kind].empty) continue;
        const geo = b[kind].toGeometry();
        const mat = kind === 'solid' ? this.mats.solid : kind === 'cover' ? this.mats.cover : this.mats[kind];
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = kind === 'solid';
        mesh.receiveShadow = kind === 'solid' || kind === 'cover';
        mesh.matrixAutoUpdate = false;
        this.group.add(mesh);
        this.chunkMeshes.push(mesh);
      }
    }
    this.batches.clear();

    const spots = this.lightSpots;
    const pos = new Float32Array(spots.length * 3);
    const col = new Float32Array(spots.length * 3);
    const phase = new Float32Array(spots.length);
    spots.forEach((s, i) => {
      pos.set([s.x, s.y, s.z], i * 3);
      const c = new THREE.Color(s.color);
      col.set([c.r, c.g, c.b], i * 3);
      phase[i] = Math.random() * 10;
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('phase', new THREE.BufferAttribute(phase, 1));
    this.haloMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uScale: { value: 600 }, uNight: { value: 0 } },
      vertexShader: `
        attribute vec3 color; attribute float phase; uniform float uTime; uniform float uScale; uniform float uNight;
        varying vec3 vCol; varying float vA;
        void main(){
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          float fl = 0.85 + 0.15 * sin(uTime * 9.0 + phase * 3.0) * sin(uTime * 5.3 + phase);
          gl_PointSize = (2.6 + 1.6 * uNight) * fl * uScale / -mv.z;
          vCol = color; vA = (0.35 + 0.65 * uNight) * fl;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying vec3 vCol; varying float vA;
        void main(){
          vec2 c = gl_PointCoord - 0.5; float d = length(c) * 2.0;
          float a = pow(max(0.0, 1.0 - d), 2.2) * vA;
          gl_FragColor = vec4(vCol * a, a);
        }`,
    });
    const halos = new THREE.Points(g, this.haloMat);
    halos.frustumCulled = false;
    halos.renderOrder = 4;
    this.group.add(halos);
  }

  buildMinimap() {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = W;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(W, W);
    const D = this.data;
    const colorOf = (i) => {
      const t = D.top[i];
      const h = D.H[i];
      let r = 90;
      let g = 150;
      let b = 70;
      if (h < WATER_Y) [r, g, b] = [60, 130, 190];
      else if (t === TILE.SNOW) [r, g, b] = [240, 245, 255];
      else if (t === TILE.STONE || t === TILE.MOSS_STONE) [r, g, b] = [130, 135, 142];
      else if (t === TILE.COBBLE) [r, g, b] = [170, 170, 176];
      else if (t === TILE.PATH) [r, g, b] = [190, 160, 110];
      else if (t === TILE.SAND) [r, g, b] = [225, 205, 150];
      else if (t === TILE.GRAVEL) [r, g, b] = [150, 146, 142];
      else if (t === TILE.DIRT) [r, g, b] = [150, 112, 78];
      else if (t === TILE.FARMLAND) [r, g, b] = [200, 170, 70];
      else {
        const fo = D.forest[i];
        [r, g, b] = [105 - fo * 55, 175 - fo * 60, 75 - fo * 15];
      }
      const sh = 0.78 + clamp(h / 18, 0, 1) * 0.35;
      return [r * sh, g * sh, b * sh];
    };
    for (let i = 0; i < W * W; i++) {
      const [r, g, b] = colorOf(i);
      img.data[i * 4] = r;
      img.data[i * 4 + 1] = g;
      img.data[i * 4 + 2] = b;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    ctx.fillStyle = 'rgba(20,70,30,0.9)';
    for (const t of this.treeDots) ctx.fillRect(Math.floor(t.x), Math.floor(t.z), 1, 1);
    const woodInk = { birch: '#f4efe4', oak: '#3f9f47', maple: '#e24a22' };
    for (const n of this.treeNodes || []) {
      ctx.fillStyle = woodInk[n.type] || '#7dcc4a';
      ctx.fillRect(Math.floor(n.x) - 1, Math.floor(n.z) - 1, 3, 3);
    }
    if (this.waygate) {
      ctx.fillStyle = '#7ef6ff';
      ctx.fillRect(Math.floor(this.waygate.x) - 2, Math.floor(this.waygate.z) - 2, 4, 4);
    }
    ctx.fillStyle = '#6a3d86';
    ctx.fillRect(70, 84, 4, 3);
    if (this.dock) {
      ctx.fillStyle = '#7a5230';
      ctx.fillRect(Math.floor(this.dock.x0), Math.floor(this.dock.z - this.dock.hw), Math.ceil(this.dock.x1 - this.dock.x0), 2);
    }
    ctx.fillStyle = '#6b4a2b';
    for (const b of [[GUILD.x, GUILD.z, 6, 6], [62.5, 72.5, 5, 4], [62.5, 81, 5, 4], [81.5, 73, 5, 4], [81.5, 81.5, 5, 4]]) {
      ctx.fillRect(Math.floor(b[0] - b[2] / 2), Math.floor(b[1] - b[3] / 2), b[2], b[3]);
    }
    this.minimapCanvas = c;
  }

  update(dt, t) {
    if (this.windmillSails) this.windmillSails.rotation.z += dt * 0.5;
    this.waterMat.uniforms.uTime.value = t;
    this.portalMat.uniforms.uTime.value = t;
    this.haloMat.uniforms.uTime.value = t;
    this.waygate?.tick(t);
  }

  placeWaygate() {
    buildWaygateSite(this);
  }
}

export { smoothstep };
