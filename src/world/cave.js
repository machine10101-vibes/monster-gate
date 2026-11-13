import * as THREE from 'three';
import { TILE } from '../engine/materials.js';
import { buildTerrainMeshes } from './terrain.js';
import { CAVE_MOUTH, CAVE_OUTSIDE } from './southford.js';

const CW = 40;
const CD = 32;
const OX = 800;
const OZ = 800;
const FLOOR = 2;
/** Just over the hunter's head. The play camera sits above this, so the walls read as walls without covering the character. */
const WALL = 4.5;

/**
 * The Darksycle den. A small map of its own, placed far from Oakhollow so it
 * never shows through the town. Entering the Southford mouth swaps to it.
 */
export function buildCave(world) {
  const H = new Float32Array(CW * CD);
  const zone = new Uint8Array(CW * CD);
  const top = new Uint8Array(CW * CD);
  const tint = new Float32Array(CW * CD * 3);
  const pathMask = new Float32Array(CW * CD);
  const slope = new Float32Array(CW * CD);
  const forest = new Float32Array(CW * CD);
  for (let z = 0; z < CD; z++) {
    for (let x = 0; x < CW; x++) {
      const i = z * CW + x;
      const edge = x < 3 || z < 3 || x >= CW - 3 || z >= CD - 3;
      const hall = x >= 14 && x <= 26 && z >= 20 && z <= CD - 1;
      const nest = Math.hypot(x - 20, z - 10) < 4.2;
      const bump = ((x * 17 + z * 31) % 5) * 0.12;
      let h = FLOOR;
      if (edge && !hall) h = WALL + bump;
      else if (nest) h = 3;
      H[i] = h;
      const wall = h > FLOOR + 1.2;
      top[i] = wall ? TILE.STONE : TILE.DARK_STONE;
      tint[i * 3] = wall ? 0.62 : 0.78;
      tint[i * 3 + 1] = wall ? 0.58 : 0.68;
      tint[i * 3 + 2] = wall ? 0.7 : 0.95;
      zone[i] = 0;
      slope[i] = 0;
    }
  }
  const data = { H, zone, top, tint, pathMask, slope, forest };
  const land = buildTerrainMeshes(data, world.mats.terrain, { width: CW, depth: CD, ox: OX, oz: OZ });
  const group = new THREE.Group();
  group.name = 'darksycle-cave';
  group.add(land);
  group.visible = false;

  const add = (parts, x, y, z, rot = 0, scale = 1) => {
    const g = new THREE.Group();
    for (const p of parts) {
      const mat = p.kind === 'glow' ? world.mats.glow : p.kind === 'window' ? world.mats.window : world.mats.solid;
      if (!p.geo) continue;
      g.add(new THREE.Mesh(p.geo, mat));
    }
    g.position.set(x, y, z);
    g.rotation.y = rot;
    g.scale.setScalar(scale);
    group.add(g);
  };

  const lights = [];
  const torchAt = (lx, lz) => {
    const x = OX + lx;
    const z = OZ + lz;
    const y = sample(x, z);
    add(world.models.torchPurple, x, y, z, 0, 1);
    lights.push({ x, y: y + 1.55, z, color: 0xb25cff });
    world.circle(x, z, 0.15);
  };
  torchAt(6, 8);
  torchAt(6, 18);
  torchAt(34, 8);
  torchAt(34, 18);
  torchAt(16, 22);
  torchAt(24, 22);

  const crystalAt = (lx, lz, s, k) => {
    const x = OX + lx;
    const z = OZ + lz;
    add(world.models.crystals[k % 3], x, sample(x, z), z, k, s);
    world.circle(x, z, 0.4);
  };
  crystalAt(12, 8, 1.3, 0);
  crystalAt(28, 9, 1.1, 1);
  crystalAt(15, 14, 0.9, 2);
  crystalAt(26, 13, 1.2, 0);
  crystalAt(20, 6, 1.4, 1);

  for (let a = 0; a < 8; a++) {
    const ang = (a / 8) * Math.PI * 2;
    const x = OX + 20 + Math.cos(ang) * 5.2;
    const z = OZ + 10 + Math.sin(ang) * 4.2;
    add(world.models.rocks[a % 4], x, sample(x, z), z, ang, 0.7);
    world.circle(x, z, 0.5);
  }

  const minimap = paintCaveMap(H);

  function sample(x, z) {
    const lx = Math.floor(x - OX);
    const lz = Math.floor(z - OZ);
    if (lx < 0 || lz < 0 || lx >= CW || lz >= CD) return 30;
    return H[lz * CW + lx];
  }

  return {
    group,
    origin: { x: OX, z: OZ },
    w: CW,
    d: CD,
    minimap,
    lights,
    nest: { x: OX + 20, z: OZ + 10 },
    spawn: { x: OX + 20, z: OZ + 24 },
    exitZ: OZ + 28.4,
    mouth: CAVE_MOUTH,
    outside: { x: CAVE_OUTSIDE.x, y: 3, z: CAVE_OUTSIDE.z },
    cool: 0,
    respawn: 0,
    hinted: false,
    heightAt: sample,
    contains(x, z) {
      return x >= OX && z >= OZ && x < OX + CW && z < OZ + CD;
    },
    walkable(x, z) {
      const lx = Math.floor(x - OX);
      const lz = Math.floor(z - OZ);
      if (lx < 0 || lz < 0 || lx >= CW || lz >= CD) return false;
      const hall = lx >= 14 && lx <= 26 && lz >= 20;
      const edge = lx < 3 || lz < 3 || lx >= CW - 3 || lz >= CD - 3;
      if (edge && !hall) return false;
      const h = H[lz * CW + lx];
      return h < 8 && h > 0.5;
    },
  };
}

function paintCaveMap(H) {
  const c = document.createElement('canvas');
  c.width = CW;
  c.height = CD;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(CW, CD);
  for (let i = 0; i < CW * CD; i++) {
    const wall = H[i] > FLOOR + 1.2;
    img.data[i * 4] = wall ? 42 : 92;
    img.data[i * 4 + 1] = wall ? 36 : 62;
    img.data[i * 4 + 2] = wall ? 58 : 110;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  ctx.fillStyle = '#c45cff';
  ctx.fillRect(18, 8, 4, 4);
  return c;
}

/** Walk into the Southford mouth, or back out of the den. */
export function updateCaveTravel(game, dt) {
  const w = game.world;
  const c = w.cave;
  if (!c || !game.player) return;
  c.cool = Math.max(0, c.cool - dt);
  if (!game.started || c.cool > 0) return;
  const P = game.player.pos;
  if (w.realm !== 'cave') {
    const m = c.mouth;
    const near = Math.hypot(P.x - m.x, P.z - m.z) < 3.1 && P.x > m.x - 5;
    if (near && w.heightAt(P.x, P.z) < 5) enterCave(game);
    else if (!c.hinted && Math.hypot(P.x - m.x, P.z - m.z) < 9 && w.heightAt(P.x, P.z) < 6) {
      c.hinted = true;
      game.hud.toast('Darksycle Cave — walk into the mouth', 2800);
    }
  } else if (P.z > c.exitZ && P.x > c.origin.x + 14 && P.x < c.origin.x + 26) {
    leaveCave(game);
  }
}

export function enterCave(game) {
  const w = game.world;
  const c = w.cave;
  const P = game.player.pos;
  w.returnPos = { x: P.x, y: P.y, z: P.z };
  w.realm = 'cave';
  w.group.visible = false;
  c.group.visible = true;
  if (game.spawner && !game.monsters.some((m) => m.type === 'darksycledragon' && m.realm === 'cave' && !m.remove)) {
    const den = game.spawner.spawn('darksycledragon', c.nest.x, c.nest.z, false);
    den.realm = 'cave';
    c.respawn = 0;
  }
  const y = c.heightAt(c.spawn.x, c.spawn.z);
  P.set(c.spawn.x, y, c.spawn.z);
  game.player.yaw = Math.PI;
  game.cam.targetYaw = Math.PI;
  c.cool = 1.4;
  game.zone = 'cave';
  game.sky.indoors = true;
  game.snapCamera();
  game.hud.setArea('Darksycle Den');
  game.hud.banner('Dragon Cave', 'Darksycle Den', 2600);
  game.hud.toast('The Darksycle Dragon lairs here. Walk back out to leave.', 3200);
}

/** Put the overworld and the daylight sky back. Safe to call when already outside. */
export function restoreOverworld(game) {
  const w = game.world;
  const c = w.cave;
  w.realm = 'over';
  w.group.visible = true;
  if (c) {
    c.group.visible = false;
    c.cool = 1.6;
  }
  if (game.sky) game.sky.indoors = false;
}

export function leaveCave(game) {
  const w = game.world;
  const c = w.cave;
  const P = game.player.pos;
  restoreOverworld(game);
  const o = c.outside;
  P.set(o.x, w.heightAt(o.x, o.z), o.z);
  game.player.yaw = Math.PI / 2;
  game.cam.targetYaw = Math.PI / 2;
  c.cool = 1.6;
  game.zone = 9;
  game.sky.indoors = false;
  game.snapCamera();
  game.hud.setArea('Southford');
  game.hud.banner('River Vale', 'Southford', 2400);
}

/** The den keeps one Darksycle Dragon. A slain one returns after a short wait. */
export function tendCaveDragon(game, dt) {
  const c = game.world?.cave;
  if (!c || !game.spawner) return;
  const home = game.monsters.some((m) => m.type === 'darksycledragon' && m.realm === 'cave' && !m.remove);
  if (home) {
    c.respawn = 0;
    return;
  }
  c.respawn += dt;
  if (c.respawn < 40) return;
  const m = game.spawner.spawn('darksycledragon', c.nest.x, c.nest.z, false);
  m.realm = 'cave';
  c.respawn = 0;
}
