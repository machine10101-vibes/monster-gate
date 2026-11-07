import * as THREE from 'three';
import { buildHumanoid, buildHeld, S } from './humanoid.js';

const LOOKS = [
  { tunic: 0x2c3d4a, hair: 0x1c140e, hairStyle: 'messy' },
  { tunic: 0x4a2c2c, hair: 0xc8a15a, hairStyle: 'messy' },
  { tunic: 0x2c4a38, hair: 0x3a281c, hairStyle: 'messy' },
  { tunic: 0x3a3058, hair: 0x6a3a1c, hairStyle: 'messy' },
  { tunic: 0x4a3d2c, hair: 0x222228, hairStyle: 'messy' },
];

function angDiff(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export class RemoteHunter {
  constructor(game, id, name) {
    this.game = game;
    this.id = id;
    this.name = name;
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.tx = 0;
    this.ty = 0;
    this.tz = 0;
    this.yaw = 0;
    this.tyaw = 0;
    this.move = 0;
    this.state = 0;
    this.hp = 20;
    this.dead = false;
    this.ready = false;
    this.cycle = Math.random() * 6;
    let n = 0;
    for (let i = 0; i < id.length; i++) n = (n + id.charCodeAt(i) * (i + 3)) % LOOKS.length;
    const look = LOOKS[n];
    this.model = buildHumanoid({ ...look, hero: true, seed: n + 4 });
    const held = buildHeld('blade');
    this.model.heldSlot.add(held);
    this.obj = new THREE.Group();
    this.pivot = new THREE.Group();
    this.pivot.position.y = 0.55;
    this.model.root.position.y = -0.55;
    this.pivot.add(this.model.root);
    this.obj.add(this.pivot);
    this.obj.visible = false;
    game.scene.add(this.obj);
  }

  pushPose(data) {
    const [x, y, z, yaw, move, state, hp] = data;
    this.tx = x;
    this.ty = y;
    this.tz = z;
    this.tyaw = yaw;
    this.move = move || 0;
    this.state = state || 0;
    this.hp = hp ?? this.hp;
    this.dead = this.hp <= 0 || this.state === 3;
    if (!this.ready) {
      this.x = x;
      this.y = y;
      this.z = z;
      this.yaw = yaw;
      this.ready = true;
      this.obj.visible = true;
    }
  }

  update(dt) {
    if (!this.ready) return;
    const k = Math.min(1, dt * 12);
    this.x += (this.tx - this.x) * k;
    this.y += (this.ty - this.y) * k;
    this.z += (this.tz - this.z) * k;
    this.yaw += angDiff(this.yaw, this.tyaw) * Math.min(1, dt * 14);
    this.obj.position.set(this.x, this.y, this.z);
    this.obj.rotation.y = this.yaw;
    this.cycle += dt * (2 + this.move * 6);
    const m = this.model;
    const walk = Math.sin(this.cycle);
    const mv = this.state === 2 || this.state === 3 ? 0 : this.move;
    let armR = -0.85 - walk * 0.25 * mv;
    let armL = walk * 0.7 * mv;
    const leg = walk * 0.8 * mv;
    if (this.state === 1) armR = -2.4;
    if (this.state === 2) this.pivot.rotation.x += (Math.PI - this.pivot.rotation.x) * Math.min(1, dt * 8);
    else this.pivot.rotation.x += (0 - this.pivot.rotation.x) * Math.min(1, dt * 8);
    if (this.state === 3) this.pivot.rotation.x = -1.2;
    const s = Math.min(1, dt * 14);
    m.armR.rotation.x += (armR - m.armR.rotation.x) * s;
    m.armL.rotation.x += (armL - m.armL.rotation.x) * s;
    m.legL.rotation.x += (leg - m.legL.rotation.x) * s;
    m.legR.rotation.x += (-leg - m.legR.rotation.x) * s;
    m.hip.position.y = 24 * S + Math.abs(Math.sin(this.cycle)) * 0.03 * mv;
    const [sx, sy, vis] = this.game.screenOf(this.x, this.y + 2.15, this.z, true);
    const d = Math.hypot(this.x - this.game.player.pos.x, this.z - this.game.player.pos.z);
    this.game.hud.plate(this.id, `${this.name}<small>hunter</small>`);
    this.game.hud.placePlate(this.id, sx, sy, vis && d < 24);
  }

  dispose() {
    this.game.scene.remove(this.obj);
    this.game.hud.removePlate(this.id);
  }
}
