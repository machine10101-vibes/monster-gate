import * as THREE from 'three';
import { buildHumanoid, buildHeld, S } from './humanoid.js';
import { DUAL_KINDS, gripRoll, placeSheath } from './weaponModels.js';
import { lookOptions } from '../systems/roster.js';

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

function lookFrom(id, look) {
  if (look?.resolved) {
    return {
      skin: look.skin,
      hair: look.hair,
      hairStyle: look.hairStyle || 'messy',
      tunic: look.tunic,
      tunicLight: look.tunicLight,
      beard: !!look.beard,
      hero: true,
      seed: look.seed ?? 4,
    };
  }
  if (look && look.skin != null) return lookOptions(look);
  let n = 0;
  const key = String(id || '');
  for (let i = 0; i < key.length; i++) n = (n + key.charCodeAt(i) * (i + 3)) % LOOKS.length;
  return { ...LOOKS[n], hero: true, seed: n + 4 };
}

function disposeModel(model) {
  model?.root?.traverse((o) => {
    if (o.isMesh && o.geometry) o.geometry.dispose();
  });
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
    this.driven = false;
    this.cycle = Math.random() * 6;
    this.appearKey = '';
    this.heldKind = null;
    this.sheathKind = null;
    this.look = lookFrom(id, null);
    this.model = buildHumanoid({ ...this.look, hero: true });
    this.obj = new THREE.Group();
    this.pivot = new THREE.Group();
    this.pivot.position.y = 0.55;
    this.model.root.position.y = -0.55;
    this.pivot.add(this.model.root);
    this.obj.add(this.pivot);
    this.obj.visible = false;
    this.setHeld('blade');
    game.scene.add(this.obj);
  }

  setAppearance({ name, look, armor, held, sheath } = {}) {
    if (name) this.name = name;
    const nextLook = lookFrom(this.id, look);
    const armorKey = JSON.stringify(armor || {});
    const lookKey = JSON.stringify({
      skin: nextLook.skin, hair: nextLook.hair, hairStyle: nextLook.hairStyle,
      tunic: nextLook.tunic, beard: !!nextLook.beard, armor: armorKey,
    });
    if (lookKey !== this.appearKey) {
      this.appearKey = lookKey;
      this.look = nextLook;
      const old = this.model;
      const next = buildHumanoid({ ...nextLook, armor: armor || {} });
      next.root.position.copy(old.root.position);
      this.pivot.remove(old.root);
      disposeModel(old);
      this.model = next;
      this.pivot.add(next.root);
      this.heldKind = null;
      this.sheathKind = null;
    }
    this.setHeld(held || this.heldKind || 'blade');
    this.setSheath(sheath || null);
  }

  setHeld(kind) {
    if (this.heldKind === kind) {
      this.syncSheath();
      return;
    }
    this.heldKind = kind;
    const slot = this.model.heldSlot;
    while (slot.children.length) slot.remove(slot.children[0]);
    slot.rotation.z = 0;
    if (kind) {
      const g = buildHeld(kind);
      g.traverse((o) => (o.castShadow = true));
      slot.rotation.z = gripRoll(kind);
      slot.add(g);
    }
    const off = this.model.offhand;
    if (off) {
      while (off.children.length) off.remove(off.children[0]);
      if (DUAL_KINDS.has(kind)) {
        const twin = buildHeld(kind === 'dual' ? 'blade' : kind);
        twin.scale.setScalar(kind === 'dual' ? 0.82 : 0.95);
        twin.rotation.y = Math.PI;
        off.add(twin);
      }
    }
    this.syncSheath();
  }

  setSheath(kind) {
    this.sheathKind = kind || null;
    this.syncSheath();
  }

  syncSheath() {
    const slot = this.model.backSlot;
    if (!slot) return;
    while (slot.children.length) slot.remove(slot.children[0]);
    const kind = this.sheathKind;
    if (!kind || kind === this.heldKind) return;
    const g = buildHeld(kind);
    g.traverse((o) => (o.castShadow = true));
    placeSheath(g, kind);
    slot.add(g);
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

  /** Authoritative interpolated pose from the world-view buffer. Skips local lerp. */
  present(pose) {
    if (!pose) return;
    this.x = pose.x;
    this.y = pose.y;
    this.z = pose.z;
    this.yaw = pose.yaw;
    this.tx = pose.x;
    this.ty = pose.y;
    this.tz = pose.z;
    this.tyaw = pose.yaw;
    this.move = pose.move || 0;
    this.state = pose.anim ?? pose.state ?? 0;
    if (pose.hp != null) this.hp = pose.hp;
    this.dead = this.hp <= 0 || this.state === 3;
    this.ready = true;
    this.obj.visible = true;
    this.obj.position.set(this.x, this.y, this.z);
    this.obj.rotation.y = this.yaw;
  }

  update(dt) {
    if (!this.ready) return;
    if (!this.driven) {
      const k = Math.min(1, dt * 12);
      this.x += (this.tx - this.x) * k;
      this.y += (this.ty - this.y) * k;
      this.z += (this.tz - this.z) * k;
      this.yaw += angDiff(this.yaw, this.tyaw) * Math.min(1, dt * 14);
      this.obj.position.set(this.x, this.y, this.z);
      this.obj.rotation.y = this.yaw;
    }
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
    if (this.driven) return;
    const [sx, sy, vis] = this.game.screenOf(this.x, this.y + 2.15, this.z, true);
    const d = Math.hypot(this.x - this.game.player.pos.x, this.z - this.game.player.pos.z);
    const mate = this.game.social?.isPartyMember?.(this.id, this.name);
    const plate = this.game.hud.plate(this.id, `${this.name}<small>hunter</small>`, mate ? 'hunter party' : 'hunter');
    if (plate) plate.dataset.pname = this.name;
    this.game.hud.placePlate(this.id, sx, sy, vis && d < 24);
  }

  dispose() {
    this.game.scene.remove(this.obj);
    this.game.hud.removePlate(this.id);
    disposeModel(this.model);
  }
}
