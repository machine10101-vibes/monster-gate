import * as THREE from 'three';
import { DOCK, LAKE, MINE, TOWN, WATER_Y, ZONE } from './terrain.js';
import { buildDock, buildMineCart, buildMineFrame, buildOrePile, buildOreRock, buildWoodStump } from './gatherModels.js';
import { buildOak } from './models.js';
import { goodsVoxels } from './gatherModels.js';
import { meshFrom } from '../entities/humanoid.js';
import { toonMaterial } from '../engine/materials.js';

/** Rocks around the pit floor: angle from +x in degrees, ore type. */
const ROCK_SPOTS = [
  { type: 'copper', a: -62, r: 3.7 },
  { type: 'copper', a: 4, r: 3.9 },
  { type: 'copper', a: 66, r: 3.7 },
  { type: 'tin', a: -124, r: 3.5 },
  { type: 'tin', a: 126, r: 3.5 },
];

export const FISH_SPOTS = [
  { kind: 'net', x: 56.6, z: 98.6 },
  { kind: 'net', x: 60.4, z: 103.4 },
  { kind: 'rod', x: 51.9, z: 101 },
  { kind: 'rod', x: 57.6, z: 105.6 },
];

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

function buildMine(world) {
  const m = world.models;
  const y = MINE.floorH;
  const nodes = [];
  ROCK_SPOTS.forEach((spot, i) => {
    const ang = (spot.a * Math.PI) / 180;
    const x = MINE.x + Math.cos(ang) * spot.r;
    const z = MINE.z + Math.sin(ang) * spot.r;
    const gy = ground(world, x, z);
    const full = partsToGroup(world, buildOreRock(spot.type, 3 + i * 2, false));
    const dead = partsToGroup(world, buildOreRock(spot.type, 3 + i * 2, true));
    const root = new THREE.Group();
    root.position.set(x, gy, z);
    root.rotation.y = hashAngle(i);
    dead.visible = false;
    root.add(full, dead);
    world.group.add(root);
    const inward = Math.atan2(MINE.z - z, MINE.x - x);
    nodes.push({
      id: `${spot.type}${i}`,
      type: spot.type,
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
    });
    world.circle(x, z, 0.78);
    world.occupy(x, z, 1.6);
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
    [90.4, 61.6, 'barrel', 0], [91.4, 61.3, 'crate', 0], [90.2, 70.6, 'crate', 1], [91.2, 71.2, 'barrel', 1],
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
  const mats = { net: mkMat(0xff8a5a, 0xffe2c8), rod: mkMat(0x3fb8ff, 0xd8f4ff) };
  const geo = new THREE.PlaneGeometry(2.3, 2.3);
  geo.rotateX(-Math.PI / 2);
  const spots = FISH_SPOTS.map((s, i) => {
    const mesh = new THREE.Mesh(geo, mats[s.kind]);
    mesh.position.set(s.x, WATER_Y + 0.05, s.z);
    mesh.renderOrder = 3;
    world.group.add(mesh);
    const sx = Math.min(DOCK.x1 - 0.6, Math.max(DOCK.x0 + 0.55, s.x));
    const sz = Math.min(DOCK.z + DOCK.hw - 0.45, Math.max(DOCK.z - DOCK.hw + 0.45, s.z));
    return { ...s, id: `${s.kind}${i}`, y: WATER_Y, standX: sx, standZ: sz, mesh, jump: null, nextJump: 2 + i * 1.7 };
  });
  world.fishSpots = spots;
  world.fishMats = mats;

  const fishMats = { trout: null, shrimp: null };
  const tm = toonMaterial({ vertexColors: true });
  for (const id of Object.keys(fishMats)) {
    const [fm, size, ox, oy, oz] = goodsVoxels(id);
    const g = meshFrom(fm, ox, oy, oz, tm, size);
    g.visible = false;
    world.group.add(g);
    fishMats[id] = g;
  }
  world.jumpers = fishMats;
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
      const kind = type === 'oak' ? 'green' : type;
      variants[key] = {
        full: partsToGroup(world, buildOak(seed + 3, kind)),
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

export function buildGatherSites(world) {
  buildMine(world);
  buildLake(world);
  buildWoods(world);
}

/** Per-frame life for the sites: fish spot shaders, leaping fish, rock pop-in. */
export function updateGatherSites(world, dt, t, game) {
  if (world.fishMats) {
    world.fishMats.net.uniforms.uTime.value = t;
    world.fishMats.rod.uniforms.uTime.value = t;
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
        const model = s.kind === 'rod' ? world.jumpers.trout : world.jumpers.shrimp;
        const ang = Math.random() * Math.PI * 2;
        s.jump = { t: 0, dur: 0.85, dx: Math.cos(ang), dz: Math.sin(ang), model, spin: s.kind === 'rod' ? 0 : 6 };
        model.visible = true;
        game.fx.burst(s.x, WATER_Y + 0.1, s.z, [0xbfeaff, 0xffffff], 5, 1.6, 0.06, 0.4, -4, 0.5);
      }
      const j = s.jump;
      if (j) {
        j.t += dt;
        const u = j.t / j.dur;
        if (u >= 1) {
          j.model.visible = false;
          game.fx.ring(s.x + j.dx * 0.9, WATER_Y + 0.06, s.z + j.dz * 0.9, 0xbfeaff, 8, 1.6, 0.07, 0.5);
          game.fx.burst(s.x + j.dx * 0.9, WATER_Y + 0.1, s.z + j.dz * 0.9, [0xbfeaff, 0xffffff], 5, 1.4, 0.06, 0.4, -4, 0.5);
          s.jump = null;
        } else {
          const h = Math.sin(u * Math.PI) * 0.95;
          j.model.position.set(s.x + j.dx * 0.9 * u, WATER_Y + h, s.z + j.dz * 0.9 * u);
          j.model.rotation.set(0, Math.atan2(j.dx, j.dz) - Math.PI / 2, Math.cos(u * Math.PI) * 0.9 + j.spin * u);
          j.model.scale.setScalar(0.85);
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
