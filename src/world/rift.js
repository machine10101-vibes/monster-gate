import * as THREE from 'three';
import { TILE } from '../engine/materials.js';
import { buildTerrainMeshes } from './terrain.js';
import { WAYGATE } from './waygate.js';
import { partySize, riftChestGold, riftChestGoods, riftScale, riftWaveSpawns, RIFT_COOLDOWN_MS, RIFT_WAVES } from '../data/rift.js';

const RW = 36;
const RD = 36;
const OX = 1600;
const OZ = 800;
const FLOOR = 2;
const WALL = 6.2;

function sampleH(H, x, z) {
  const lx = Math.floor(x - OX);
  const lz = Math.floor(z - OZ);
  if (lx < 0 || lz < 0 || lx >= RW || lz >= RD) return 30;
  return H[lz * RW + lx];
}

export function buildRift(world) {
  const H = new Float32Array(RW * RD);
  const zone = new Uint8Array(RW * RD);
  const top = new Uint8Array(RW * RD);
  const tint = new Float32Array(RW * RD * 3);
  const pathMask = new Float32Array(RW * RD);
  const slope = new Float32Array(RW * RD);
  const forest = new Float32Array(RW * RD);
  const cx = (RW - 1) / 2;
  const cz = (RD - 1) / 2;
  for (let z = 0; z < RD; z++) {
    for (let x = 0; x < RW; x++) {
      const i = z * RW + x;
      const d = Math.hypot(x - cx, z - cz);
      const rim = d > 14.6 || x < 2 || z < 2 || x >= RW - 2 || z >= RD - 2;
      const gate = z > 28 && Math.abs(x - cx) < 4;
      H[i] = rim && !gate ? WALL : FLOOR + ((x * 13 + z * 19) % 4) * 0.04;
      const wall = H[i] > FLOOR + 1.4;
      top[i] = wall ? TILE.DARK_STONE : TILE.STONE;
      tint[i * 3] = wall ? 0.45 : 0.62;
      tint[i * 3 + 1] = wall ? 0.38 : 0.48;
      tint[i * 3 + 2] = wall ? 0.72 : 0.92;
      zone[i] = 0;
    }
  }
  const data = { H, zone, top, tint, pathMask, slope, forest };
  const land = buildTerrainMeshes(data, world.mats.terrain, { width: RW, depth: RD, ox: OX, oz: OZ });
  const group = new THREE.Group();
  group.name = 'waygate-rift';
  group.add(land);
  group.visible = false;

  const lights = [
    { x: OX + 8, y: FLOOR + 3.2, z: OZ + 8, color: 0x6af4ff },
    { x: OX + 28, y: FLOOR + 3.2, z: OZ + 8, color: 0xc27bff },
    { x: OX + 8, y: FLOOR + 3.2, z: OZ + 26, color: 0xc27bff },
    { x: OX + 28, y: FLOOR + 3.2, z: OZ + 26, color: 0x6af4ff },
  ];

  const minimap = paintRiftMap(H);
  const heightAt = (x, z) => sampleH(H, x, z);

  return {
    group,
    origin: { x: OX, z: OZ },
    w: RW,
    d: RD,
    lights,
    minimap,
    spawn: { x: OX + cx, z: OZ + 30 },
    arena: { x: OX + cx, z: OZ + cz },
    outside: { x: WAYGATE.x, z: WAYGATE.z + 3.2 },
    cool: 0,
    chest: null,
    heightAt,
    contains(x, z) {
      return x >= OX && z >= OZ && x < OX + RW && z < OZ + RD;
    },
    walkable(x, z) {
      const h = heightAt(x, z);
      return h < FLOOR + 1.4 && h > 0.5;
    },
  };
}

function paintRiftMap(H) {
  const c = document.createElement('canvas');
  c.width = RW;
  c.height = RD;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(RW, RD);
  for (let i = 0; i < RW * RD; i++) {
    const wall = H[i] > FLOOR + 1.4;
    img.data[i * 4] = wall ? 36 : 78;
    img.data[i * 4 + 1] = wall ? 28 : 52;
    img.data[i * 4 + 2] = wall ? 72 : 128;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function scaleSpawn(m, scale) {
  m.def = { ...m.def, hp: Math.max(1, Math.round(m.def.hp * scale.hpMul)), dmg: Math.max(1, Math.round(m.def.dmg * scale.dmgMul)) };
  m.maxHp = m.def.hp;
  m.hp = m.def.hp;
  m.realm = 'rift';
}

function clearRiftMobs(game) {
  for (const m of game.monsters) if (m.realm === 'rift') m.dispose?.();
  game.monsters = game.monsters.filter((m) => m.realm !== 'rift');
}

function dropChest(game) {
  const r = game.world.rift;
  dropChestMesh(game, r.arena.x, r.heightAt(r.arena.x, r.arena.z), r.arena.z);
}

function dropChestMesh(game, x, y, z) {
  const r = game.world.rift;
  if (r.chest) {
    game.scene.remove(r.chest.obj);
    r.chest = null;
  }
  const obj = new THREE.Group();
  const wood = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.7, 0.8), new THREE.MeshBasicMaterial({ color: 0x6a3a14 }));
  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.16, 0.84), new THREE.MeshBasicMaterial({ color: 0x8a5a22 }));
  const band = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.12, 0.18), new THREE.MeshBasicMaterial({ color: 0xffd23f }));
  wood.position.y = 0.38;
  lid.position.y = 0.8;
  band.position.y = 0.55;
  obj.add(wood, lid, band);
  obj.position.set(x, y, z);
  game.scene.add(obj);
  r.chest = { obj, x, y, z, ready: true, looted: false };
  game.fx?.ring(x, y + 0.2, z, 0xffd23f, 18, 4, 0.12, 0.6);
}

export function hideRift(game) {
  const r = game.world?.rift;
  if (!r) return;
  r.group.visible = false;
  if (r.chest) {
    game.scene.remove(r.chest.obj);
    r.chest = null;
  }
}

export function restoreOverworldRealms(game) {
  const w = game.world;
  w.realm = 'over';
  w.group.visible = true;
  if (w.cave) {
    w.cave.group.visible = false;
    w.cave.cool = 1.6;
  }
  hideRift(game);
  if (game.sky) game.sky.indoors = false;
}

export function enterRift(game, opts = {}) {
  const w = game.world;
  const r = w.rift;
  if (!r || !game.player) return false;
  const follow = !!opts.follow;
  const party = Math.max(1, Math.min(4, opts.party || 1));
  const scale = riftScale(party);
  if (w.realm === 'cave') {
    w.cave.group.visible = false;
    w.cave.cool = 1.6;
  }
  w.returnPos = { x: game.player.pos.x, y: game.player.pos.y, z: game.player.pos.z };
  w.realm = 'rift';
  w.group.visible = false;
  r.group.visible = true;
  r.cool = 1.2;
  game.riftRun = { party, scale, wave: 0, follow, looted: false };
  const y = r.heightAt(r.spawn.x, r.spawn.z);
  game.player.pos.set(r.spawn.x, y, r.spawn.z);
  game.player.yaw = Math.PI;
  game.cam.targetYaw = Math.PI;
  game.zone = 'rift';
  game.sky.indoors = true;
  game.snapCamera();
  game.hud.setArea('Waygate Rift');
  game.hud.banner('Rift', 'A tear in the gate', 2600);
  if (!follow) {
    clearRiftMobs(game);
    startWave(game, 1);
  } else {
    game.hud.toast('The host opened a rift. Waves scale with the party.', 3200);
  }
  return true;
}

export function startWave(game, wave) {
  const r = game.world.rift;
  const run = game.riftRun;
  if (!r || !run) return;
  run.wave = wave;
  const spec = RIFT_WAVES[wave - 1];
  const types = riftWaveSpawns(wave, run.party);
  const cx = r.arena.x;
  const cz = r.arena.z;
  types.forEach((type, i) => {
    const a = (i / Math.max(1, types.length)) * Math.PI * 2;
    const rad = 3.2 + (i % 3) * 1.1;
    const m = game.spawner.spawn(type, cx + Math.cos(a) * rad, cz + Math.sin(a) * rad, true);
    scaleSpawn(m, run.scale);
  });
  game.hud.banner(spec?.title || `Wave ${wave}`, `${types.length} in the tear`, 2400);
  game.hud.toast(`Wave ${wave} of ${RIFT_WAVES.length}. Party ${run.party}.`, 2800);
}

export function updateRift(game, dt) {
  const w = game.world;
  const r = w.rift;
  if (!r || !game.started) return;
  r.cool = Math.max(0, r.cool - dt);
  if (w.realm !== 'rift' || !game.riftRun) return;
  const P = game.player.pos;
  if (r.cool <= 0 && !game.riftRun.follow && P.z > r.spawn.z + 0.4 && Math.abs(P.x - r.spawn.x) < 4.5) {
    leaveRift(game);
    return;
  }
  const run = game.riftRun;
  if (run.follow) return;
  if (r.chest?.ready && !r.chest.looted) return;
  const live = game.monsters.some((m) => m.realm === 'rift' && !m.dead && !m.remove);
  if (live) return;
  if (run.wave < RIFT_WAVES.length) {
    if (run.pending) {
      run.pending -= dt;
      if (run.pending <= 0) {
        run.pending = 0;
        startWave(game, run.wave + 1);
      }
    } else {
      run.pending = 1.4;
    }
    return;
  }
  if (!r.chest) {
    dropChest(game);
    game.hud.banner('Rift stills', 'The chest is yours', 2800);
    game.hud.toast('Open the chest in the middle, then walk south to leave.', 3400);
  }
}

export function lootRiftChest(game) {
  const r = game.world?.rift;
  const run = game.riftRun;
  if (!r?.chest?.ready || r.chest.looted || !run || run.looted) return { ok: false };
  r.chest.looted = true;
  run.looted = true;
  game.progress.data.riftClearAt = Date.now();
  const gold = riftChestGold(run.party);
  const goods = riftChestGoods(run.party);
  game.addGold(gold);
  for (const g of goods) game.progress.addGood(g.id, g.n);
  game.progress.save();
  game.hud.toast(`Rift chest: +${gold} gold.`, 2800);
  game.audio.quest();
  game.fx.burst(r.chest.x, r.chest.y + 0.6, r.chest.z, [0xffd23f, 0xffffff, 0xc27bff], 22, 4.5, 0.12, 0.8);
  return { ok: true, gold, goods };
}

export function leaveRift(game) {
  const w = game.world;
  const r = w.rift;
  if (!r) return;
  const P = game.player.pos;
  clearRiftMobs(game);
  restoreOverworldRealms(game);
  game.riftRun = null;
  const o = r.outside;
  P.set(o.x, w.heightAt(o.x, o.z), o.z);
  game.player.yaw = 0;
  game.cam.targetYaw = 0;
  r.cool = 1.4;
  game.zone = w.zoneAt(o.x, o.z);
  game.snapCamera();
  game.hud.setArea('Oakhollow');
  game.hud.banner('Waygate', 'The tear closes', 2200);
}

export function riftReady(game, now = Date.now()) {
  const at = Number(game.progress?.data?.riftClearAt) || 0;
  if (!at) return { ok: true, wait: 0 };
  const wait = RIFT_COOLDOWN_MS - (now - at);
  if (wait <= 0) return { ok: true, wait: 0 };
  return { ok: false, wait };
}

export function tryEnterRift(game) {
  if (game.world?.realm === 'rift') return { ok: false, reason: 'inside' };
  if (game.net?.role === 'guest') return { ok: false, reason: 'guest-session' };
  const cool = riftReady(game);
  if (!cool.ok) return { ok: false, reason: 'cool', wait: cool.wait };
  const party = partySize(game);
  enterRift(game, { party, follow: false });
  return { ok: true, party };
}

export function syncRiftFollow(game, rift) {
  if (!game?.world?.rift) return;
  if (!rift?.on) {
    if (game.world.realm === 'rift' && game.riftRun?.follow) leaveRift(game);
    return;
  }
  if (game.world.realm !== 'rift') enterRift(game, { follow: true, party: rift.party || 1 });
  if (rift.chest && !game.world.rift.chest) {
    dropChestMesh(game, rift.chest.x, rift.chest.y, rift.chest.z);
  }
}
