import * as THREE from 'three';
import { VoxelModel } from '../engine/voxel.js';
import { toonMaterial } from '../engine/materials.js';
import { meshFrom } from './humanoid.js';

/** Placeholder until the Pirate and the Cursed Pirate land. */
const S = 0.05;
function blockBuilder(color) {
  return () => {
    const mat = toonMaterial({ vertexColors: true, emissive: new THREE.Color(0x000000) });
    const root = new THREE.Group();
    const M = new VoxelModel(12, 36, 8);
    M.box(0, 0, 0, 12, 36, 8, color);
    root.add(meshFrom(M, 6, 0, 4, mat, S));
    return { root, mat, parts: {} };
  };
}

export const TYPES = new Set(['pirate', 'cursedpirate']);
export const DEFS = {
  pirate: { name: 'Pirate', hp: 70, radius: 0.6, speed: 3.0, dmg: 4, gold: [20, 40], aggro: 14, build: blockBuilder(0x2a3f78) },
  cursedpirate: { name: 'Cursed Pirate', hp: 110, radius: 0.6, speed: 3.1, dmg: 6, gold: [45, 70], aggro: 15, build: blockBuilder(0xd8cdb0) },
};
export const FX = {
  pirate: { spark: [0xfff2c0, 0xffb347, 0xffffff], burst: [0xc9967a, 0xff5a46, 0xffffff], death: [0x2a3f78, 0xc9967a, 0xffffff], tele: 0xffd23f, accel: 10, knock: 2, plateY: 2.4, deathDur: 1.2 },
  cursedpirate: { spark: [0xe6f9d0, 0x6aff9a, 0xffffff], burst: [0xd8cdb0, 0x3aff7a, 0xffffff], death: [0xd8cdb0, 0x3aff7a, 0xffffff], tele: 0x3aff7a, accel: 10, knock: 2.5, plateY: 2.4, deathDur: 1.3 },
};
export const busy = () => false;
export const holdsWarn = () => false;

export function think(m, dt, c) {
  const { dist, dx, dz, sees, toP } = c;
  let mvx = 0;
  let mvz = 0;
  if (sees) {
    m.state = 'chase';
    m.yaw += Math.atan2(Math.sin(toP - m.yaw), Math.cos(toP - m.yaw)) * Math.min(1, dt * 6);
    if (dist > 1.6) {
      mvx = (dx / dist) * m.def.speed;
      mvz = (dz / dist) * m.def.speed;
    } else if (m.cd <= 0) {
      m.cd = 1;
      c.P.hurt(m.def.dmg, m.x, m.z, 5);
    }
  } else m.state = 'idle';
  return [mvx, mvz];
}
export const animate = () => ({ rootY: 0, rootX: 0 });
export function dead(m, dt, c) {
  const o = m.obj;
  o.position.set(m.x, m.y, m.z);
  o.rotation.set(0, m.yaw, c.side * Math.min(1, c.u * 3) * 1.4);
  const k2 = c.dissolve(0.8, 0.5, FX[m.type].death);
  o.scale.setScalar(c.bs * (1 - k2 * k2));
}
