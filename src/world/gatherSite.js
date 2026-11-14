import * as THREE from 'three';
import { RNG } from '../engine/voxel.js';
import { DOCK, LAKE, MINE, TOWN, W, WATER_Y, ZONE } from './terrain.js';
import { FISH } from '../data/gathering.js';
import { WOODS, WOOD_BY_ID } from '../data/woods.js';
import { OASIS, SAND_MINE } from './desert.js';
import { originOf, TILES } from './tiles.js';
import { buildDock, buildMineCart, buildMineFrame, buildOrePile, buildOreRock, buildWoodStump, goodsVoxels } from './gatherModels.js';
import { buildOak } from './models.js';
import { buildWoodTree } from './woodTrees.js';
import { EXOTIC_KINDS, landKindOf, sampleWoodLocal, woodSpotOk } from './woodSpawn.js';
import { meshFrom } from '../entities/humanoid.js';
import { toonMaterial } from '../engine/materials.js';

/** Rocks around the pit floor: angle from +x in degrees, ore type. */
export const ROCK_SPOTS = [
  { type: 'copper', a: -62, r: 3.7 },
  { type: 'copper', a: 4, r: 3.9 },
  { type: 'copper', a: 66, r: 3.7 },
  { type: 'copper', a: -124, r: 3.5 },
  { type: 'copper', a: 126, r: 3.5 },
  { type: 'iron', a: 180, r: 2.4 },
];

/** Deepwell pit floor, world offsets from SAND_MINE. */
export const DEEPWELL_SPOTS = [
  { type: 'iron', dx: -7, dz: 5 },
  { type: 'iron', dx: 8, dz: -4 },
  { type: 'coal', dx: -10, dz: -6 },
  { type: 'coal', dx: 6, dz: 9 },
  { type: 'mithril', dx: 1, dz: -9 },
  { type: 'mithril', dx: -5, dz: 11 },
  { type: 'adamite', dx: 11, dz: 2 },
  { type: 'adamite', dx: -12, dz: 8 },
];

/** Higher-tier seams on later tiles, local tile coords. */
export const ZONE_MINES = [
  { kind: 'cinderfall', type: 'titanium', spots: [[108, 96], [118, 72], [92, 110]] },
  { kind: 'glimmerfrost', type: 'platinum', spots: [[112, 36], [46, 104], [120, 92]] },
];

export const FISH_SPOTS = [
  { kind: 'net', site: 'lake', title: 'Net fishing spot', catches: ['shrimp'], x: 56.6, z: 98.6 },
  { kind: 'net', site: 'lake', title: 'Net fishing spot', catches: ['shrimp'], x: 60.4, z: 103.4 },
  { kind: 'rod', site: 'lake', title: 'Pole fishing spot', catches: ['trout'], x: 51.9, z: 101 },
  { kind: 'rod', site: 'lake', title: 'Pole fishing spot', catches: ['trout'], x: 57.6, z: 105.6 },
];

/** Southford (world map tile 65): the Silverrun runs north to south down x 34..43, fished from its east bank. */
const RIVER_BANK_X = 44.9;
export const RIVER_SPOTS = [
  { kind: 'net', z: 190 },
  { kind: 'rod', z: 207 },
  { kind: 'net', z: 224 },
  { kind: 'rod', z: 241 },
  { kind: 'net', z: 258 },
  { kind: 'rod', z: 272 },
].map((r) => ({
  kind: r.kind,
  site: 'river',
  title: r.kind === 'net' ? 'River net spot' : 'River pole spot',
  catches: [r.kind === 'net' ? 'pikeminnow' : 'salmon'],
  x: r.kind === 'net' ? 42.9 : 41.2,
  z: r.z + 0.5,
  standX: RIVER_BANK_X,
  standZ: r.z + 0.5,
  reach: 3,
}));

/** Glimmerfrost (world map tile 38): two holes cut into the frozen lake at the top of the tile. */
export const ICE_HOLES = [
  { lx: 87.5, lz: 55.5 },
  { lx: 97.5, lz: 57.5 },
];
const GLIMMER_TILE = 't7-3';

/** Which way each fish model faces along its local x. The shrimp head is at +x, every fish head at -x. */
const HEAD_DIR = { shrimp: 1 };

const spotFrag = `
uniform float uTime; uniform vec3 uColA; uniform vec3 uColB; varying vec2 vUv;
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main(){
  vec2 p = (vUv - 0.5) * 2.0;
  p = floor(p * 14.0) / 14.0;
  float r = length(p);
  float a = 0.0;
  for (int i = 0; i < 3; i++) {
    float t = fract(uTime * 0.45 + float(i) / 3.0);
    float band = abs(r - mix(0.1, 0.95, t));
    a += smoothstep(0.13, 0.0, band) * (1.0 - t);
  }
  float bub = step(0.94, h21(floor(p * 7.0) + floor(uTime * 3.0))) * smoothstep(0.9, 0.4, r) * step(0.3, r);
  float edge = smoothstep(1.0, 0.7, r);
  vec3 col = mix(uColA, uColB, clamp(a, 0.0, 1.0));
  gl_FragColor = vec4(col * (0.7 + a) + vec3(bub), (a * 0.85 + bub * 0.9 + 0.1 * edge) * edge);
}`;

function partsToGroup(world, parts, castShadow = true) {
  const g = new THREE.Group();
  for (const p of parts) {
    const mesh = new THREE.Mesh(p.geo, p.kind === 'solid' ? world.mats.solid : p.kind === 'glow' ? world.mats.glow : world.mats.window);
    mesh.castShadow = castShadow && p.kind === 'solid';
    mesh.receiveShadow = p.kind === 'solid';
    g.add(mesh);
  }
  return g;
}

function ground(world, x, z) {
  return world.heightAt(x, z);
}

function addRock(world, type, x, z, i, cx, cz) {
  const gy = ground(world, x, z);
  const full = partsToGroup(world, buildOreRock(type, 3 + i * 2, false));
  const dead = partsToGroup(world, buildOreRock(type, 3 + i * 2, true));
  const root = new THREE.Group();
  root.position.set(x, gy, z);
  root.rotation.y = hashAngle(i);
  dead.visible = false;
  root.add(full, dead);
  world.group.add(root);
  const inward = Math.atan2(cz - z, cx - x);
  const node = {
    id: `${type}${i}`,
    type,
    x,
    z,
    y: gy,
    standX: x + Math.cos(inward) * 1.45,
    standZ: z + Math.sin(inward) * 1.45,
    root,
    full,
    dead,
    ready: true,
    respawnT: 0,
    pop: 0,
  };
  world.circle(x, z, 0.78);
  world.occupy(x, z, 1.6);
  return node;
}

function buildMine(world) {
  const m = world.models;
  const y = MINE.floorH;
  const nodes = [];
  ROCK_SPOTS.forEach((spot, i) => {
    const ang = (spot.a * Math.PI) / 180;
    const x = MINE.x + Math.cos(ang) * spot.r;
    const z = MINE.z + Math.sin(ang) * spot.r;
    nodes.push(addRock(world, spot.type, x, z, i, MINE.x, MINE.z));
  });
  world.rockNodes = nodes;

  const frameY = 3;
  world.place(buildMineFrame(), 87.4, frameY, MINE.z, 0, 1.45);
  world.circle(87.4, MINE.z - 2.05, 0.4);
  world.circle(87.4, MINE.z + 2.05, 0.4);
  world.lightSpots.push({ x: 87.5, y: frameY + 2.55, z: MINE.z, color: 0xffb347 });

  const cartX = MINE.x + 0.8;
  const cartZ = MINE.z - 4.1;
  world.place(buildMineCart(), cartX, ground(world, cartX, cartZ), cartZ, 0.12, 1.1);
  world.box(cartX, cartZ, 1.2, 0.8);
  world.place(buildOrePile(), MINE.x - 3.4, ground(world, MINE.x - 3.4, MINE.z + 3.8), MINE.z + 3.8, 0.5, 1.2);

  const rim = [
    [90.4, 61.6, 'barrel', 0], [91.4, 61.3, 'crate', 0], [96.4, 72.6, 'crate', 1], [97.2, 74.2, 'barrel', 1],
    [106.6, 61.2, 'crate', 0], [107.3, 70.4, 'barrel', 0],
  ];
  for (const [x, z, kind, k] of rim) {
    world.putAt(m[kind][k], x, z, hashAngle(x + z), kind === 'barrel' ? 1.15 : 1.25);
    world.circle(x, z, 0.42);
  }
  for (const [x, z] of [[86.6, MINE.z - 3.1], [86.6, MINE.z + 3.1], [MINE.x, MINE.z - 8], [MINE.x + 8, MINE.z], [MINE.x, MINE.z + 8], [MINE.x - 5.8, MINE.z - 6.2], [MINE.x + 5.6, MINE.z + 5.9]]) {
    world.torch(x, z, 0xffa040);
  }
  const rng = world.rng;
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2 + 0.3;
    if (Math.cos(a) < -0.86) continue;
    const r = MINE.rimR - 0.7 + rng.range(-0.4, 0.4);
    const x = MINE.x + Math.cos(a) * r;
    const z = MINE.z + Math.sin(a) * r;
    world.rock(x, z, rng, true);
  }
  world.occupy(MINE.x, MINE.z, 13);
  world.occupy(MINE.x - 7, MINE.z, 6);
  world.mine = { x: MINE.x, z: MINE.z, y, rampX: MINE.rampX0, nodes };
}

function hashAngle(n) {
  const s = Math.sin(n * 12.9898 + 4.1) * 43758.5453;
  return (s - Math.floor(s)) * Math.PI * 2;
}

function buildLake(world) {
  const y = -1.5;
  const cx = (DOCK.x0 + DOCK.x1) / 2;
  const parts = buildDock({ length: DOCK.x1 - DOCK.x0, width: DOCK.hw * 2, baseY: y, deckY: DOCK.y });
  world.place(parts, cx, y, DOCK.z, 0, 1);
  world.dock = { ...DOCK };

  for (const k of [0, 1, 2, 3]) {
    const px = DOCK.x0 + 0.35 + k * 3.35;
    if (px > DOCK.x1 - 1) continue;
    world.circle(px, DOCK.z - DOCK.hw - 0.05, 0.22);
    world.circle(px, DOCK.z + DOCK.hw + 0.05, 0.22);
  }
  world.lightSpots.push({ x: DOCK.x0 + 0.5, y: DOCK.y + 1.55, z: DOCK.z - DOCK.hw, color: 0xffc766 });
  world.lightSpots.push({ x: DOCK.x0 + 0.5, y: DOCK.y + 1.55, z: DOCK.z + DOCK.hw, color: 0xffc766 });
  world.torch(DOCK.x1 + 0.9, DOCK.z - 2.1, 0xffa040);
  world.torch(DOCK.x1 + 0.9, DOCK.z + 2.1, 0xffa040);
  const m = world.models;
  world.putAt(m.barrel[1], DOCK.x1 + 0.8, DOCK.z - 3.3, 0.7, 1.15);
  world.circle(DOCK.x1 + 0.8, DOCK.z - 3.3, 0.42);
  world.putAt(m.crate[0], DOCK.x1 + 1.2, DOCK.z + 3.4, 0.2, 1.25);
  world.circle(DOCK.x1 + 1.2, DOCK.z + 3.4, 0.55);
  world.occupy(LAKE.x, LAKE.z, 11);
  world.occupy(DOCK.x1 - 3, DOCK.z, 7);

  const mkMat = (a, b) =>
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: { uTime: { value: 0 }, uColA: { value: new THREE.Color(a) }, uColB: { value: new THREE.Color(b) } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: spotFrag,
    });
  const mats = { net: mkMat(0xff8a5a, 0xffe2c8), rod: mkMat(0x3fb8ff, 0xd8f4ff), ice: mkMat(0x1a5a86, 0x9fe2ff) };
  const geo = new THREE.PlaneGeometry(2.3, 2.3);
  geo.rotateX(-Math.PI / 2);
  world.fishGeo = geo;
  const spots = FISH_SPOTS.map((s, i) => {
    const mesh = new THREE.Mesh(geo, mats[s.kind]);
    mesh.position.set(s.x, WATER_Y + 0.05, s.z);
    mesh.renderOrder = 3;
    world.group.add(mesh);
    const sx = Math.min(DOCK.x1 - 0.6, Math.max(DOCK.x0 + 0.55, s.x));
    const sz = Math.min(DOCK.z + DOCK.hw - 0.45, Math.max(DOCK.z - DOCK.hw + 0.45, s.z));
    return { ...s, id: `${s.kind}${i}`, y: WATER_Y, standX: sx, standZ: sz, standY: DOCK.y, mesh, jump: null, nextJump: 2 + i * 1.7, run: 0.9, from: 0 };
  });
  world.fishSpots = spots;
  world.fishMats = mats;

  const fishMats = {};
  const tm = toonMaterial({ vertexColors: true });
  for (const id of Object.keys(FISH)) {
    const [fm, size, ox, oy, oz] = goodsVoxels(id);
    const g = meshFrom(fm, ox, oy, oz, tm, size);
    g.visible = false;
    world.group.add(g);
    fishMats[id] = g;
  }
  world.jumpers = fishMats;
  world.addSeaFishSpot = (s) =>
    addFishSpot(world, { kind: 'rod', site: 'sea', title: 'Deep-sea pole spot', catches: ['tuna', 'stingray', 'tigershark'], reach: 3, run: 1.2, from: 0.8, ...s }, WATER_Y);
}

function addFishSpot(world, def, y) {
  const mesh = new THREE.Mesh(world.fishGeo, world.fishMats[def.look || def.kind]);
  mesh.position.set(def.x, y + 0.05, def.z);
  if (def.site === 'ice') mesh.scale.setScalar(0.78);
  mesh.renderOrder = 3;
  world.group.add(mesh);
  const n = world.fishSpots.length;
  const spot = { ...def, id: `${def.site}${n}`, y, standY: world.heightAt(def.standX, def.standZ), mesh, jump: null, nextJump: 2 + (n % 5) * 1.3 };
  world.fishSpots.push(spot);
  return spot;
}

function buildRiver(world) {
  for (const def of RIVER_SPOTS) {
    const spot = addFishSpot(world, { ...def, run: 0.9, from: 0 }, WATER_Y);
    world.occupy(def.standX, def.standZ, 1.4);
    world.occupy(spot.x, spot.z, 0.8);
  }
}

function buildIceHoles(world) {
  const land = (world.lands || []).find((l) => l.tileId === GLIMMER_TILE);
  if (!land) return;
  const parts = world.models.arctic.iceHoles;
  ICE_HOLES.forEach((h, i) => {
    const x = land.x0 + h.lx + 0.5;
    const z = land.z0 + h.lz + 0.5;
    const top = world.heightAt(x, z);
    world.putAt(parts[i % parts.length], x, z, i * 1.9, 1, { y: top });
    world.circle(x, z, 0.9);
    world.occupy(x, z, 2.4);
    const standZ = z + 1.75;
    world.occupy(x, standZ, 1.2);
    addFishSpot(
      world,
      {
        kind: 'rod',
        site: 'ice',
        look: 'ice',
        title: 'Ice fishing hole',
        catches: ['pike', 'sturgeon'],
        x,
        z,
        standX: x,
        standZ,
        reach: 2.6,
        run: 0.45,
        from: -0.22,
      },
      top + 0.12
    );
  });
}

/** Groves west of Oakhollow. Decorative trees stay out of these circles. */
export const WOOD_GROVES = [
  { type: 'birch', x: 50, z: 74, r: 9, count: 5 },
  { type: 'oak', x: 48, z: 63, r: 9, count: 4 },
  { type: 'maple', x: 43, z: 54, r: 9, count: 4 },
];

function nearPath(world, x, z, r) {
  return world.nearPath(x, z, r);
}

function buildWoods(world) {
  const nodes = [];
  const variants = {};
  const treeGroup = (type, seed) => {
    const key = type + (seed % 2);
    if (!variants[key]) {
      const spec = WOOD_BY_ID[type];
      const parts = spec ? buildWoodTree(seed + 3, spec) : buildOak(seed + 3, type === 'oak' ? 'green' : type);
      variants[key] = {
        full: partsToGroup(world, parts),
        stump: partsToGroup(world, buildWoodStump(type, seed + 3)),
      };
    }
    const full = variants[key].full.clone(true);
    const stump = variants[key].stump.clone(true);
    stump.visible = false;
    return { full, stump };
  };
  const taken = [];
  for (const grove of WOOD_GROVES) {
    let placed = 0;
    for (let rad = 0; rad <= grove.r && placed < grove.count; rad += 1.25) {
      const steps = rad < 0.2 ? 1 : Math.max(6, Math.round(rad * 2.6));
      for (let k = 0; k < steps && placed < grove.count; k++) {
        const a = (k / steps) * Math.PI * 2 + 0.4;
        const x = grove.x + Math.cos(a) * rad;
        const z = grove.z + Math.sin(a) * rad;
        if (x < 6 || z < 6 || x > 138 || z > 138) continue;
        const h = ground(world, x, z);
        if (h < 1 || h > 7.5) continue;
        if (world.data.slope[world.idx(x, z)] > 1.2) continue;
        if (nearPath(world, x, z, 1.8)) continue;
        const zn = world.zoneAt(x, z);
        if (zn === ZONE.TOWN || zn === ZONE.WATER || zn === ZONE.LAKE || zn === ZONE.FARM || zn === ZONE.GATE || zn === ZONE.MINE) continue;
        if (!world.free(x, z, 1.7)) continue;
        if (taken.some((s) => Math.hypot(s.x - x, s.z - z) < 3.2)) continue;
        let stand = null;
        for (let t = 0; t < 8; t++) {
          const ang = Math.atan2(TOWN.z - z, TOWN.x - x) + t * 0.75;
          const sx = x + Math.cos(ang) * 1.6;
          const sz = z + Math.sin(ang) * 1.6;
          const sh = ground(world, sx, sz);
          if (sh < 0.9 || sh > 8 || Math.abs(sh - h) > 1.05) continue;
          if (!world.playable(sx, sz)) continue;
          stand = { x: sx, z: sz };
          if (t === 0) break;
        }
        if (!stand) continue;
        const { full, stump } = treeGroup(grove.type, placed + grove.x);
        const root = new THREE.Group();
        root.position.set(x, h, z);
        root.rotation.y = hashAngle(placed * 3 + grove.x);
        root.scale.setScalar(0.68);
        root.add(full, stump);
        world.group.add(root);
        world.circle(x, z, 0.48);
        world.occupy(x, z, 1.55);
        const node = {
          id: `${grove.type}${placed}`,
          type: grove.type,
          x,
          z,
          y: h,
          standX: stand.x,
          standZ: stand.z,
          root,
          full,
          dead: stump,
          ready: true,
          respawnT: 0,
          pop: 0,
        };
        nodes.push(node);
        taken.push(node);
        placed++;
      }
    }
  }
  world.treeNodes = nodes;
  world.woodGroves = WOOD_GROVES;
}

function cellPath(data, lx, lz, r) {
  for (let z = Math.max(0, lz - r); z <= Math.min(W - 1, lz + r); z++)
    for (let x = Math.max(0, lx - r); x <= Math.min(W - 1, lx + r); x++)
      if (data.pathMask[z * W + x]) return true;
  return false;
}

/**
 * Scatter the newer woods across every built land.
 * Tier 4 is limited to high-level monster ground. Called after the lands are dressed
 * so keeps, nests and yards already occupy their footprints.
 */
export function scatterWorldWoods(world) {
  const rng = new RNG(20261114);
  const nodes = world.treeNodes || [];
  const taken = nodes.map((n) => ({ x: n.x, z: n.z }));
  const variants = {};
  const treeGroup = (type, seed) => {
    const key = type + (seed % 2);
    if (!variants[key]) {
      variants[key] = {
        full: partsToGroup(world, buildWoodTree(seed + 3, WOOD_BY_ID[type])),
        stump: partsToGroup(world, buildWoodStump(type, seed + 3)),
      };
    }
    const full = variants[key].full.clone(true);
    const stump = variants[key].stump.clone(true);
    stump.visible = false;
    return { full, stump };
  };
  const lands = (world.lands || []).map((land) => ({ land, kind: landKindOf(land) })).filter((row) => row.kind);
  for (const wood of WOODS) {
    const pool = lands.filter((row) => wood.tier < 4 || EXOTIC_KINDS.has(row.kind));
    if (!pool.length) continue;
    let placed = 0;
    let guard = 0;
    const gap = wood.tier >= 4 ? 6.2 : 4.2;
    while (placed < wood.scatter && guard < wood.scatter * 90) {
      const { land, kind } = pool[(placed * 5 + guard) % pool.length];
      guard++;
      const local = sampleWoodLocal(kind, rng, wood.tier);
      const { lx, lz } = local;
      const data = land.data;
      const i = lz * W + lx;
      if (!data?.H || i < 0 || i >= data.H.length) continue;
      const x = land.x0 + lx + 0.5;
      const z = land.z0 + lz + 0.5;
      if (!woodSpotOk(wood, {
        kind,
        lx,
        lz,
        h: data.H[i],
        slope: data.slope ? data.slope[i] : 0,
        zone: data.zone[i],
        path: cellPath(data, lx, lz, wood.tier >= 4 ? 3 : 2),
        top: data.top[i],
        blocked: false,
      })) continue;
      if (!world.playable(x, z) || world.onDock(x, z, 2.2)) continue;
      if (WOOD_GROVES.some((g) => Math.hypot(x - g.x, z - g.z) < g.r + 2)) continue;
      if (Math.hypot(x - OASIS.x, z - OASIS.z) < OASIS.r + 8) continue;
      if (Math.hypot(x - SAND_MINE.x, z - SAND_MINE.z) < SAND_MINE.rimR + 3) continue;
      if (world.waygate && Math.hypot(x - world.waygate.x, z - world.waygate.z) < 7) continue;
      if ((world.teleports || []).some((p) => Math.hypot(x - p.x, z - p.z) < 6)) continue;
      if ((world.jungle?.yards || []).some((a) => Math.hypot(x - a.x, z - a.z) < (a.r || 8) + 3)) continue;
      if (taken.some((s) => Math.hypot(s.x - x, s.z - z) < gap)) continue;
      if (!world.free(x, z, 1.8)) continue;
      const h = data.H[i];
      let stand = null;
      for (let t = 0; t < 8; t++) {
        const ang = t * 0.8 + 0.4;
        const sx = x + Math.cos(ang) * 1.65;
        const sz = z + Math.sin(ang) * 1.65;
        const sh = world.heightAt(sx, sz);
        if (sh < 0.9 || sh > 8.7 || Math.abs(sh - h) > 1.2) continue;
        if (!world.playable(sx, sz)) continue;
        stand = { x: sx, z: sz };
        break;
      }
      if (!stand) continue;
      const { full, stump } = treeGroup(wood.id, placed + wood.level);
      const root = new THREE.Group();
      root.position.set(x, h, z);
      root.rotation.y = hashAngle(placed * 5 + wood.level);
      root.scale.setScalar(wood.form === 'conifer' ? 0.72 : 0.68);
      root.add(full, stump);
      world.group.add(root);
      world.circle(x, z, 0.48);
      world.occupy(x, z, 1.55);
      const node = {
        id: `${wood.id}${placed}`,
        type: wood.id,
        x,
        z,
        y: h,
        standX: stand.x,
        standZ: stand.z,
        root,
        full,
        dead: stump,
        ready: true,
        respawnT: 0,
        pop: 0,
      };
      nodes.push(node);
      taken.push(node);
      placed++;
    }
  }
  world.treeNodes = nodes;
}

function buildDeepwellMine(world) {
  const nodes = world.rockNodes || [];
  const { x: cx, z: cz } = SAND_MINE;
  DEEPWELL_SPOTS.forEach((spot, i) => {
    nodes.push(addRock(world, spot.type, cx + spot.dx, cz + spot.dz, 40 + i, cx, cz));
  });
  world.rockNodes = nodes;
}

function buildZoneMines(world) {
  const nodes = world.rockNodes || [];
  let i = 80;
  for (const site of ZONE_MINES) {
    const tile = TILES.find((t) => t.kind === site.kind);
    if (!tile) continue;
    const o = originOf(tile);
    const cx = o.x + 72;
    const cz = o.z + 72;
    for (const [lx, lz] of site.spots) {
      nodes.push(addRock(world, site.type, o.x + lx, o.z + lz, i, cx, cz));
      i += 1;
    }
  }
  world.rockNodes = nodes;
}

export function buildGatherSites(world) {
  buildMine(world);
  buildDeepwellMine(world);
  buildZoneMines(world);
  buildLake(world);
  buildRiver(world);
  buildIceHoles(world);
  buildWoods(world);
}

/** Per-frame life for the sites: fish spot shaders, leaping fish, rock pop-in. */
export function updateGatherSites(world, dt, t, game) {
  if (world.fishMats) {
    for (const mat of Object.values(world.fishMats)) mat.uniforms.uTime.value = t;
  }
  if (world.fishSpots && game?.player) {
    const P = game.player.pos;
    for (const s of world.fishSpots) {
      const near = Math.hypot(P.x - s.x, P.z - s.z) < 26;
      if (!near) {
        if (s.jump) {
          s.jump.model.visible = false;
          s.jump = null;
        }
        continue;
      }
      s.nextJump -= dt;
      if (!s.jump && s.nextJump <= 0) {
        s.nextJump = 4 + Math.random() * 6;
        const id = s.catches[Math.floor(Math.random() * s.catches.length)];
        const model = world.jumpers[id];
        if (model.visible) {
          s.nextJump = 0.6;
          continue;
        }
        const ang = Math.random() * Math.PI * 2;
        const dx = Math.cos(ang);
        const dz = Math.sin(ang);
        s.jump = {
          t: 0,
          dur: 0.85,
          dx,
          dz,
          model,
          head: HEAD_DIR[id] ?? -1,
          spin: id === 'shrimp' ? 6 : 0,
          lift: s.site === 'ice' ? 1.15 : 0.95,
          scale: id === 'sturgeon' || id === 'tigershark' ? 0.7 : 0.85,
        };
        model.visible = true;
        game.fx.burst(s.x + dx * s.from, s.y + 0.1, s.z + dz * s.from, [0xbfeaff, 0xffffff], 5, 1.6, 0.06, 0.4, -4, 0.5);
      }
      const j = s.jump;
      if (j) {
        j.t += dt;
        const u = j.t / j.dur;
        const off = s.run * u + s.from;
        const ox = s.x + j.dx * off;
        const oz = s.z + j.dz * off;
        if (u >= 1) {
          j.model.visible = false;
          game.fx.ring(ox, s.y + 0.06, oz, 0xbfeaff, 8, 1.6, 0.07, 0.5);
          game.fx.burst(ox, s.y + 0.1, oz, [0xbfeaff, 0xffffff], 5, 1.4, 0.06, 0.4, -4, 0.5);
          s.jump = null;
        } else {
          const h = Math.sin(u * Math.PI) * j.lift;
          j.model.position.set(ox, s.y + h, oz);
          // The head leads: yaw it onto the travel direction, then nose up on the way out and down on the way in.
          const yaw = Math.atan2(j.dx, j.dz) - Math.PI / 2 + (j.head < 0 ? Math.PI : 0);
          j.model.rotation.set(0, yaw, j.head * Math.cos(u * Math.PI) * 0.9 + j.spin * u);
          j.model.scale.setScalar(j.scale);
        }
      }
    }
  }
  for (const list of [world.rockNodes, world.treeNodes]) {
    if (!list) continue;
    for (const n of list) {
      if (!n.ready) {
        n.respawnT -= dt;
        if (n.respawnT <= 0) {
          n.ready = true;
          n.dead.visible = false;
          n.full.visible = true;
          n.pop = 0.0001;
          game.fx.burst(n.x, n.y + 0.7, n.z, [0xffe9a0, 0xffffff], 8, 1.4, 0.06, 0.7, -0.5, 0.8);
        }
      }
      if (n.pop > 0) {
        n.pop = Math.min(1, n.pop + dt * 3.2);
        const k = 1 - Math.pow(1 - n.pop, 3);
        const s = 0.55 + 0.45 * k + Math.sin(n.pop * Math.PI) * 0.12;
        n.root.scale.setScalar(s);
        if (n.pop >= 1) {
          n.pop = 0;
          n.root.scale.setScalar(1);
        }
      }
    }
  }
}
