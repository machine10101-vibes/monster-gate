import * as THREE from 'three';
import { TILE } from '../engine/materials.js';
import { buildTerrainMeshes } from './terrain.js';

const SIZE = 40;
const OX = 1700;
const OZ = 800;
const FLOOR = 2.2;
const WALL = 7.5;

function paintBoard() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1a1422';
  ctx.fillRect(0, 0, 1024, 512);
  ctx.strokeStyle = '#f4d58a';
  ctx.lineWidth = 28;
  ctx.strokeRect(18, 18, 988, 476);
  ctx.fillStyle = '#f4d58a';
  ctx.textAlign = 'center';
  ctx.font = 'bold 92px Georgia';
  ctx.fillText('PVP SIGN UP', 512, 200);
  ctx.font = 'bold 54px Georgia';
  ctx.fillText('GILANTRE COLOSSEUM', 512, 300);
  ctx.font = 'bold 42px Georgia';
  ctx.fillText('1v1   ·   2v2   ·   3v3', 512, 390);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/**
 * Centered on the south approach, between the door and the east-west road.
 * The face stands vertical and points south, toward the hunter and the camera.
 */
export const COLOSSEUM_BOARD = { x: 446, z: 143.35 };
const BOARD_POST = 2.35;

function buildBoard(group, x, z, floor, yaw = 0, tilt = 0) {
  const root = new THREE.Group();
  root.position.set(x, floor, z);
  root.rotation.order = 'YXZ';
  root.rotation.y = yaw;
  root.rotation.x = tilt;
  const wood = new THREE.MeshStandardMaterial({ color: 0x53331d, roughness: 0.85 });
  const gold = new THREE.MeshBasicMaterial({ color: 0xf4d58a });
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.28, 4.6, 0.28), wood);
  const left = post.clone();
  const right = post.clone();
  left.position.set(-BOARD_POST, 2.3, 0);
  right.position.set(BOARD_POST, 2.3, 0);
  const face = new THREE.MeshBasicMaterial({ map: paintBoard(), side: THREE.DoubleSide });
  const board = new THREE.Mesh(new THREE.BoxGeometry(5.0, 3.15, 0.16), face);
  board.position.set(0, 2.85, 0);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.22, 0.46), gold);
  cap.position.set(0, 4.55, 0);
  const sill = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.16, 0.4), gold);
  sill.position.set(0, 1.2, 0);
  const lamp = new THREE.PointLight(0xffc870, 8, 22, 2);
  lamp.position.set(0, 3.4, 1.2);
  root.add(left, right, board, cap, sill, lamp);
  group.add(root);
  return root;
}

export function buildColosseum(world) {
  const H = new Float32Array(SIZE * SIZE);
  const zone = new Uint8Array(SIZE * SIZE);
  const top = new Uint8Array(SIZE * SIZE);
  const tint = new Float32Array(SIZE * SIZE * 3);
  const pathMask = new Float32Array(SIZE * SIZE);
  const slope = new Float32Array(SIZE * SIZE);
  const forest = new Float32Array(SIZE * SIZE);
  const cx = (SIZE - 1) / 2, cz = (SIZE - 1) / 2;
  for (let z = 0; z < SIZE; z++) for (let x = 0; x < SIZE; x++) {
    const i = z * SIZE + x;
    const d = Math.hypot(x - cx, z - cz);
    const wall = d > 16.5 || x < 2 || z < 2 || x >= SIZE - 2 || z >= SIZE - 2;
    H[i] = wall ? WALL : FLOOR + ((x * 7 + z * 11) % 3) * 0.025;
    top[i] = wall ? TILE.DARK_STONE : TILE.STONE;
    tint[i * 3] = wall ? 0.54 : 0.76;
    tint[i * 3 + 1] = wall ? 0.46 : 0.68;
    tint[i * 3 + 2] = wall ? 0.62 : 0.76;
  }
  const data = { H, zone, top, tint, pathMask, slope, forest };
  const floor = buildTerrainMeshes(data, world.mats.terrain, { width: SIZE, depth: SIZE, ox: OX, oz: OZ });
  const group = new THREE.Group();
  group.name = 'gilantre-colosseum';
  group.add(floor);
  group.visible = false;
  const stone = new THREE.MeshStandardMaterial({ color: 0x49414f, roughness: 0.88 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x9d7946, metalness: 0.35, roughness: 0.55 });
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    const x = OX + 19.5 + Math.cos(a) * 18.1;
    const z = OZ + 19.5 + Math.sin(a) * 18.1;
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.82, 6.5, 8), stone);
    pillar.position.set(x, FLOOR + 3.25, z);
    const capital = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.38, 8), trim);
    capital.position.set(x, FLOOR + 6.45, z);
    group.add(pillar, capital);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(10.5, 0.24, 8, 64), trim);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(OX + 19.5, FLOOR + 0.15, OZ + 19.5);
  group.add(ring);
  for (const [x, z, color] of [[OX + 5, OZ + 5, 0xffa34d], [OX + 34, OZ + 5, 0x75cfff], [OX + 5, OZ + 34, 0x75cfff], [OX + 34, OZ + 34, 0xffa34d]]) {
    const brazier = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.5, 1.1, 8), trim);
    brazier.position.set(x, FLOOR + 0.55, z);
    const flame = new THREE.PointLight(color, 1.7, 12, 2);
    flame.position.set(x, FLOOR + 2.3, z);
    group.add(brazier, flame);
  }
  buildBoard(group, OX + 18, OZ + 34, FLOOR, 0);
  const heightAt = (x, z) => {
    const lx = Math.floor(x - OX), lz = Math.floor(z - OZ);
    if (lx < 0 || lz < 0 || lx >= SIZE || lz >= SIZE) return 30;
    return H[lz * SIZE + lx];
  };
  return {
    group, origin: { x: OX, z: OZ }, w: SIZE, d: SIZE,
    spawn: { x: OX + cx, z: OZ + 31 },
    arena: { x: OX + cx, z: OZ + cz },
    heightAt,
    contains(x, z) { return x >= OX && z >= OZ && x < OX + SIZE && z < OZ + SIZE; },
    walkable(x, z) {
      const h = heightAt(x, z);
      return h < FLOOR + 1.4 && h > 0.5 && Math.hypot(x - (OX + cx), z - (OZ + cz)) < 15.8;
    },
  };
}

export function buildColosseumSignUpBoard(world) {
  const group = new THREE.Group();
  group.name = 'gilantre-colosseum-signup-board';
  const { x, z } = COLOSSEUM_BOARD;
  const y = world.heightAt(x, z);
  const mesh = buildBoard(group, x, z, y, 0, 0);
  world.group.add(group);
  world.circle(x - BOARD_POST, z, 0.28);
  world.circle(x + BOARD_POST, z, 0.28);
  return { group, mesh, x, y, z };
}
