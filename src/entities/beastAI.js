import * as THREE from 'three';
import { VoxelModel } from '../engine/voxel.js';
import { toonMaterial } from '../engine/materials.js';
import { meshFrom } from './humanoid.js';

/** Placeholder until the Bengal Tiger and Battle Raptor land. */
const S = 0.05;
function blockBuilder(color) {
  return () => {
    const mat = toonMaterial({ vertexColors: true, emissive: new THREE.Color(0x000000) });
    const root = new THREE.Group();
    const M = new VoxelModel(16, 16, 24);
    M.box(0, 0, 0, 16, 16, 24, color);
    root.add(meshFrom(M, 8, 0, 12, mat, S));
    return { root, mat, parts: {} };
  };
}

export const TYPES = new Set(['tiger', 'raptor']);
export const DEFS = {
  tiger: { name: 'Bengal Tiger', hp: 120, radius: 0.9, speed: 4.4, dmg: 5, gold: [30, 50], aggro: 16, build: blockBuilder(0xd9822b) },
  raptor: { name: 'Battle Raptor', hp: 90, radius: 0.75, speed: 4.8, dmg: 4, gold: [25, 45], aggro: 16, build: blockBuilder(0x6b7a3a) },
};
export const FX = {
  tiger: { spark: [0xfff2c0, 0xffb347, 0xffffff], burst: [0xd9822b, 0x2a2018, 0xffffff], death: [0xd9822b, 0x2a2018, 0xffffff], tele: 0xffa040, accel: 9, knock: 3, plateY: 2.2, deathDur: 1.4, heavy: true },
  raptor: { spark: [0xfff2c0, 0xffb347, 0xffffff], burst: [0x6b7a3a, 0x8a3a2a, 0xffffff], death: [0x6b7a3a, 0x8a3a2a, 0xffffff], tele: 0x8a3a2a, accel: 10, knock: 3, plateY: 2.2, deathDur: 1.3, heavy: true },
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
