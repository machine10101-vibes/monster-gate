import * as THREE from 'three';
import { buildHumanoid, buildHeld, S } from './humanoid.js';
import { clamp, lerp } from '../engine/voxel.js';
import { WATER_Y, ZONE } from '../world/terrain.js';

const R = 0.32;
const TAU = Math.PI * 2;

function angDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}
function ease(t) {
  return t * t * (3 - 2 * t);
}

export class Player {
  constructor(game) {
    this.game = game;
    this.model = buildHumanoid();
    this.obj = new THREE.Group();
    this.pivot = new THREE.Group();
    this.pivot.position.y = 0.55;
    this.model.root.position.y = -0.55;
    this.pivot.add(this.model.root);
    this.obj.add(this.pivot);
    game.scene.add(this.obj);

    this.shadowBlob = null;

    this.pos = new THREE.Vector3(72, 3, 72.5);
    this.vel = new THREE.Vector3();
    this.vy = 0;
    this.yaw = 0;
    this.maxHp = 20;
    this.reduction = 0;
    this.armorKey = '{}';
    this.hp = 20;
    this.maxStamina = 100;
    this.stamina = 100;
    this.maxMana = 50;
    this.mana = 32;
    this.fury = 100;

    this.state = 'idle';
    this.stateT = 0;
    this.stateDur = 0;
    this.combo = 0;
    this.comboT = 0;
    this.attackHit = false;
    this.attackItem = null;
    this.cycle = 0;
    this.moveAmt = 0;
    this.speed = 0;
    this.invuln = 0;
    this.hurtT = 0;
    this.knock = new THREE.Vector3();
    this.stamDelay = 0;
    this.shielding = false;
    this.rollDir = new THREE.Vector3(0, 0, 1);
    this.dead = false;
    this.wading = false;
    this.aimYaw = 0;
    this.heldKind = null;
    this.torchLight = new THREE.PointLight(0xffa850, 0, 10, 1.6);
    this.torchLight.position.set(0, 1.6, 0.4);
    this.obj.add(this.torchLight);
    this.setHeld('blade');
    this.syncObj();
  }

  setArmor(look) {
    const key = JSON.stringify(look || {});
    if (this.armorKey === key) return;
    this.armorKey = key;
    const old = this.model;
    const next = buildHumanoid({ armor: look || {} });
    next.root.position.copy(old.root.position);
    this.pivot.remove(old.root);
    old.root.traverse((o) => {
      if (o.isMesh && o.geometry) o.geometry.dispose();
    });
    this.model = next;
    this.pivot.add(next.root);
    this.heldKind = null;
    const kind = this.wantHeld;
    this.setHeld(kind);
  }

  setHeld(kind) {
    this.wantHeld = kind;
    if (this.heldKind === kind) return;
    this.heldKind = kind;
    const slot = this.model.heldSlot;
    while (slot.children.length) slot.remove(slot.children[0]);
    if (kind) {
      const g = buildHeld(kind);
      g.traverse((o) => (o.castShadow = true));
      slot.add(g);
    }
  }

  get facing() {
    return new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
  }

  syncObj() {
    this.obj.position.copy(this.pos);
    this.obj.rotation.y = this.yaw;
  }

  heal(n) {
    this.hp = Math.min(this.maxHp, this.hp + n);
  }

  /** returns true if damage was applied; dir is from attacker toward player */
  hurt(dmg, fromX, fromZ, knock = 4) {
    if (this.dead || this.invuln > 0 || this.state === 'roll') return false;
    const g = this.game;
    const dx = this.pos.x - fromX;
    const dz = this.pos.z - fromZ;
    const d = Math.hypot(dx, dz) || 1;
    const f = this.facing;
    const blocked = this.shielding && this.state !== 'attack' && (f.x * -dx + f.z * -dz) / d > 0.25 && this.stamina > 0;
    if (blocked) {
      this.stamina = Math.max(0, this.stamina - 14 - dmg * 3);
      this.stamDelay = 0.9;
      this.knock.set((dx / d) * knock * 0.5, 0, (dz / d) * knock * 0.5);
      g.fx.burst(this.pos.x + f.x * 0.6, this.pos.y + 1, this.pos.z + f.z * 0.6, [0xffffff, 0xffe27a, 0x9fd8ff], 9, 3.5, 0.08, 0.35);
      g.audio.block();
      g.hud.floatText(...g.screenOf(this.pos.x, this.pos.y + 1.9, this.pos.z), 'Blocked', 'gold');
      g.shake(0.08);
      this.invuln = 0.15;
      if (this.stamina <= 0) {
        this.stagger(0.6);
        g.hud.toast('Guard broken!', 1200);
      }
      return false;
    }
    dmg = Math.max(1, Math.round(dmg * (1 - this.reduction)));
    this.hp = Math.max(0, this.hp - dmg);
    this.invuln = 0.9;
    this.hurtT = 0.4;
    this.knock.set((dx / d) * knock, 0, (dz / d) * knock);
    g.fx.burst(this.pos.x, this.pos.y + 1.1, this.pos.z, [0xff4d5a, 0xffa0a8, 0xffffff], 12, 3.5, 0.09, 0.5);
    g.audio.hurt();
    g.hud.hurtFlash();
    g.hud.floatText(...g.screenOf(this.pos.x, this.pos.y + 1.9, this.pos.z), '-' + dmg, 'hurt');
    g.shake(0.25);
    g.hitstop(0.07);
    if (this.state === 'attack' || this.state === 'use') this.setState('idle');
    if (this.hp <= 0) this.die();
    return true;
  }

  stagger(t) {
    this.setState('stagger', t);
  }

  die() {
    this.dead = true;
    this.setState('dead', 9);
    this.game.onPlayerDeath();
  }

  respawn(x, z) {
    this.dead = false;
    this.hp = this.maxHp;
    this.stamina = this.maxStamina;
    this.pos.set(x, this.game.world.heightAt(x, z), z);
    this.pivot.rotation.set(0, 0, 0);
    this.setState('idle');
    this.invuln = 2;
    this.syncObj();
  }

  setState(s, dur = 0) {
    this.state = s;
    this.stateT = 0;
    this.stateDur = dur;
  }

  tryAttack(item) {
    if (this.dead || this.state === 'roll' || this.state === 'stagger') return false;
    if (this.state === 'attack' || this.state === 'use') {
      return false;
    }
    if (item.kind === 'use') {
      if (item.count <= 0) {
        this.game.hud.toast('Out of potions', 1200);
        return false;
      }
      if (this.hp >= this.maxHp) {
        this.game.hud.toast('Already at full health', 1200);
        return false;
      }
      item.count--;
      this.setState('use', 0.6);
      this.game.itemsChanged();
      return true;
    }
    if (item.kind === 'light' || item.kind === 'none') return false;
    if (this.stamina < 3) return false;
    this.attackItem = item;
    this.combo = this.comboT > 0 ? (this.combo + 1) % 3 : 0;
    this.attackHit = false;
    this.stamina = Math.max(0, this.stamina - item.stam);
    this.stamDelay = 0.7;
    this.setState('attack', item.dur * (this.combo === 2 && item.kind === 'melee' ? 1.2 : 1));
    this.game.audio.swing();
    return true;
  }

  tryRoll(dir) {
    if (this.dead || this.state === 'roll' || this.state === 'stagger' || this.stamina < 18) return false;
    this.stamina -= 22;
    this.stamDelay = 0.8;
    this.rollDir.copy(dir.lengthSq() > 0.01 ? dir.clone().normalize() : this.facing);
    this.yaw = Math.atan2(this.rollDir.x, this.rollDir.z);
    this.setState('roll', 0.42);
    this.invuln = 0.38;
    this.game.audio.evade();
    this.game.fx.burst(this.pos.x, this.pos.y + 0.1, this.pos.z, [0xd9c9a0, 0xb8a888], 6, 1.6, 0.1, 0.4, 3, 0.4);
    return true;
  }

  update(dt) {
    const g = this.game;
    const inp = g.input;
    const world = g.world;
    this.stateT += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.comboT = Math.max(0, this.comboT - dt);
    this.stamDelay = Math.max(0, this.stamDelay - dt);

    if (!this.dead) {
      if (this.stamDelay <= 0 && !(this.shielding && this.state === 'idle')) this.stamina = Math.min(this.maxStamina, this.stamina + 34 * dt);
      this.mana = Math.min(this.maxMana, this.mana + 1.6 * dt);
      this.fury = Math.min(100, this.fury + 1.2 * dt);
    }

    const cy = g.cam.yaw;
    const right = new THREE.Vector3(Math.cos(cy), 0, -Math.sin(cy));
    const fwd = new THREE.Vector3(-Math.sin(cy), 0, -Math.cos(cy));
    const want = new THREE.Vector3();
    if (!this.dead && !g.uiBlocking) want.addScaledVector(right, inp.moveX).addScaledVector(fwd, -inp.moveY);
    const inputMag = Math.min(1, want.length());

    const wantShield = inp.shieldHeld && !this.dead && (this.state === 'idle' || this.state === 'shield') && this.stamina > 4 && !g.uiBlocking;
    this.shielding = wantShield;
    if (wantShield && this.state === 'idle') this.state = 'idle';
    if (this.model.shieldG) this.model.shieldG.visible = this.shielding;

    let speed = 0;
    const moveDir = new THREE.Vector3();
    switch (this.state) {
      case 'roll': {
        const t = this.stateT / this.stateDur;
        speed = 9.5 * (1 - t * 0.55);
        moveDir.copy(this.rollDir);
        if (this.stateT >= this.stateDur) this.setState('idle');
        break;
      }
      case 'attack': {
        const it = this.attackItem;
        const t = this.stateT / this.stateDur;
        const hitT = it.hit / it.dur;
        if (!this.attackHit && t >= hitT) {
          this.attackHit = true;
          this.doAttackHit(it);
        }
        const lunge = it.kind === 'melee' && t > hitT - 0.15 && t < hitT + 0.1 ? 3.2 : 0;
        speed = lunge + inputMag * 1.3;
        moveDir.copy(this.facing);
        if (lunge === 0 && inputMag > 0.1) moveDir.copy(want).normalize();
        if (lunge === 0 && inputMag > 0.1) speed = inputMag * 1.3;
        if (this.stateT >= this.stateDur) {
          this.comboT = 0.45;
          this.setState('idle');
        }
        break;
      }
      case 'use': {
        speed = inputMag * 1.4;
        moveDir.copy(want);
        if (!this.potionDone && this.stateT > 0.3) {
          this.potionDone = true;
          this.heal(8);
          g.audio.potion();
          g.fx.burst(this.pos.x, this.pos.y + 1.3, this.pos.z, [0xff6a8a, 0xffc0cc, 0xffffff], 14, 1.8, 0.08, 0.9, -1.5, 0.6);
          g.hud.floatText(...g.screenOf(this.pos.x, this.pos.y + 2, this.pos.z), '+8', 'heal');
        }
        if (this.stateT >= this.stateDur) {
          this.potionDone = false;
          this.setState('idle');
        }
        break;
      }
      case 'stagger':
        if (this.stateT >= this.stateDur) this.setState('idle');
        break;
      case 'dead':
        break;
      default: {
        if (inputMag > 0.05) {
          moveDir.copy(want).normalize();
          speed = 4.7 * inputMag * (this.shielding ? 0.5 : 1);
        }
      }
    }

    if (this.wading && this.state !== 'roll') speed *= 0.65;

    this.vel.copy(moveDir).multiplyScalar(speed).add(this.knock);
    this.knock.multiplyScalar(Math.max(0, 1 - dt * 9));
    this.moveBy(this.vel.x * dt, this.vel.z * dt);
    this.speed = Math.hypot(this.vel.x, this.vel.z);

    if (!this.dead && this.state !== 'roll' && this.state !== 'attack') {
      let target = this.yaw;
      if (this.shielding || (inp.attackHeld && !this.game.input.touch)) {
        if (this.aimDir) target = Math.atan2(this.aimDir.x, this.aimDir.z);
      } else if (inputMag > 0.1) target = Math.atan2(moveDir.x, moveDir.z);
      this.yaw += angDiff(this.yaw, target) * Math.min(1, dt * 16);
    }

    this.updateGround(dt);

    const moving = this.speed > 0.4 && this.state !== 'dead';
    this.moveAmt = lerp(this.moveAmt, moving ? clamp(this.speed / 4.7, 0.3, 1.4) : 0, Math.min(1, dt * 12));
    this.cycle += dt * (this.speed * 1.85 + 0.01);
    if (moving && this.state === 'idle' && Math.sin(this.cycle * 1.0) < -0.96) g.audio.step();

    this.pose(dt);
    this.syncObj();

    this.model.mat.emissive.setRGB(this.hurtT > 0.2 ? 0.6 : 0, 0, 0);
    if (this.invuln > 0 && this.hurtT <= 0 && this.state !== 'roll') {
      this.obj.visible = Math.floor(this.invuln * 18) % 2 === 0 || this.invuln > 1.4;
    } else this.obj.visible = true;

    const torchOn = g.items[g.sel].id === 'torch';
    this.torchLight.intensity = torchOn ? 2.4 + Math.sin(g.time * 14) * 0.25 : 0;
  }

  moveBy(dx, dz) {
    const w = this.game.world;
    const tryAxis = (nx, nz) => {
      const pts = [
        [nx, nz],
        [nx + R, nz],
        [nx - R, nz],
        [nx, nz + R],
        [nx, nz - R],
      ];
      for (const [x, z] of pts) if (!w.canStep(x, z, this.pos.y)) return false;
      return true;
    };
    const nx = this.pos.x + dx;
    const nz = this.pos.z + dz;
    if (tryAxis(nx, nz)) {
      this.pos.x = nx;
      this.pos.z = nz;
    } else if (tryAxis(nx, this.pos.z)) this.pos.x = nx;
    else if (tryAxis(this.pos.x, nz)) this.pos.z = nz;
    w.resolve(this.pos, R);
  }

  updateGround(dt) {
    const w = this.game.world;
    const h = w.heightAt(this.pos.x, this.pos.z);
    this.wading = h < WATER_Y;
    let target = h;
    if (this.wading) target = Math.max(h, WATER_Y - 0.35);
    if (target > this.pos.y) {
      this.pos.y += (target - this.pos.y) * Math.min(1, dt * 20);
      if (target - this.pos.y < 0.01) this.pos.y = target;
      this.vy = 0;
    } else {
      this.vy -= 26 * dt;
      this.pos.y += this.vy * dt;
      if (this.pos.y <= target) {
        if (this.vy < -7) {
          this.game.fx.burst(this.pos.x, target + 0.1, this.pos.z, [0xd9c9a0, 0x9bd06a], 8, 2, 0.1, 0.4);
        }
        this.pos.y = target;
        this.vy = 0;
      }
    }
    if (this.wading && this.speed > 1 && Math.random() < dt * 14) {
      this.game.fx.ring(this.pos.x, WATER_Y + 0.05, this.pos.z, 0xbfeaff, 6, 1.3, 0.07, 0.45);
    }
  }

  doAttackHit(it) {
    const g = this.game;
    const f = this.facing;
    if (it.kind === 'melee') {
      const mult = this.combo === 2 ? 1.5 : 1;
      const reach = it.reach * (this.combo === 2 ? 1.2 : 1);
      g.fx.doSlash(this.pos.x, this.pos.y + 0.55, this.pos.z, Math.atan2(-f.z, f.x), reach / 2.5, this.combo === 2 ? 0xffd27a : 0xfff2c0, this.combo === 1 ? -1 : 1);
      let hits = 0;
      for (const m of g.monsters) {
        if (m.dead) continue;
        const dx = m.x - this.pos.x;
        const dz = m.z - this.pos.z;
        const d = Math.hypot(dx, dz);
        if (d > reach + m.radius) continue;
        const dot = (dx * f.x + dz * f.z) / (d || 1);
        if (dot < Math.cos(it.arc / 2) && d > m.radius + 0.4) continue;
        const crit = Math.random() < 0.12;
        g.strikeMonster(m, Math.round(it.dmg * mult * (crit ? 1.8 : 1) * (0.9 + Math.random() * 0.25)), dx / (d || 1), dz / (d || 1), it.knock * (this.combo === 2 ? 1.5 : 1), crit);
        hits++;
      }
      if (hits) {
        g.hitstop(0.05 + Math.min(0.06, hits * 0.02));
        g.shake(0.18);
        this.fury = Math.min(100, this.fury + 7 * hits);
        g.audio.hit();
      }
    } else if (it.kind === 'ranged') {
      g.spawnProjectile({ owner: 'player', kind: 'arrow', x: this.pos.x + f.x * 0.5, y: this.pos.y + 1.15, z: this.pos.z + f.z * 0.5, vx: f.x * 20, vz: f.z * 20, dmg: it.dmg, life: 1.3, r: 0.35 });
      g.audio.tone(900, 0.08, 'triangle', 0.1, -500);
    } else if (it.kind === 'throw') {
      if (it.count <= 0) return;
      it.count--;
      g.itemsChanged();
      g.spawnProjectile({ owner: 'player', kind: 'stone', x: this.pos.x + f.x * 0.5, y: this.pos.y + 1.3, z: this.pos.z + f.z * 0.5, vx: f.x * 12, vz: f.z * 12, vy: 3.5, dmg: it.dmg, life: 1.4, r: 0.4, gravity: 12 });
    }
  }

  castBolt() {
    const g = this.game;
    if (this.dead || this.mana < 8 || this.state === 'roll' || this.state === 'stagger') return;
    this.mana -= 8;
    const f = this.facing;
    this.setState('use', 0.32);
    this.potionDone = true;
    g.audio.bolt();
    g.spawnProjectile({ owner: 'player', kind: 'bolt', x: this.pos.x + f.x * 0.6, y: this.pos.y + 1.15, z: this.pos.z + f.z * 0.6, vx: f.x * 15, vz: f.z * 15, dmg: 11, life: 1.2, r: 0.5, pierce: true });
  }

  castFury() {
    const g = this.game;
    if (this.dead || this.fury < 100 || this.state === 'roll' || this.state === 'stagger') return;
    this.fury = 0;
    this.setState('use', 0.5);
    this.potionDone = true;
    this.invuln = 0.6;
    g.audio.fury();
    g.shake(0.6);
    g.hitstop(0.1);
    g.fx.ring(this.pos.x, this.pos.y + 0.3, this.pos.z, 0xffb347, 28, 8, 0.14, 0.6);
    g.fx.ring(this.pos.x, this.pos.y + 0.6, this.pos.z, 0xfff0b0, 20, 5.5, 0.12, 0.5);
    g.fx.burst(this.pos.x, this.pos.y + 0.5, this.pos.z, [0xff8a1e, 0xffd27a, 0xffffff], 30, 6, 0.14, 0.7);
    g.fx.doSlash(this.pos.x, this.pos.y + 0.6, this.pos.z, 0, 2.2, 0xffb347, 1);
    for (const m of g.monsters) {
      if (m.dead) continue;
      const dx = m.x - this.pos.x;
      const dz = m.z - this.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 5.5) g.strikeMonster(m, 22, dx / (d || 1), dz / (d || 1), 11, true);
    }
  }

  pose(dt) {
    const m = this.model;
    const t = this.game.time;
    const walk = Math.sin(this.cycle);
    const mv = this.moveAmt;
    const heldBlade = this.heldKind === 'blade' || this.heldKind === 'axe' || this.heldKind === 'pick' || this.heldKind === 'hammer' || this.heldKind === 'budgeblade' || this.heldKind === 'budgemaul';
    const k = Math.min(1, dt * 18);
    let armR = heldBlade ? -0.85 : -0.25;
    let armL = 0;
    let armRz = 0;
    let armLz = 0;
    let torsoYaw = 0;
    let lean = 0;
    let crouch = 0;
    let pivotX = 0;
    let headPitch = 0;

    armR += -walk * 0.45 * mv * (heldBlade ? 0.5 : 1);
    armL = walk * 0.7 * mv;
    let legL = walk * 0.8 * mv;
    let legR = -walk * 0.8 * mv;
    const breathe = Math.sin(t * 2.2) * 0.012;
    let bob = Math.abs(Math.sin(this.cycle)) * 0.035 * mv + breathe;
    if (mv < 0.1) armR += Math.sin(t * 2.2) * 0.03;

    if (this.shielding && this.state !== 'attack') {
      armL = -1.42;
      armLz = 0.12;
      armR = heldBlade ? -1.05 : armR;
      torsoYaw = -0.2;
    }

    switch (this.state) {
      case 'attack': {
        const it = this.attackItem;
        const tt = clamp(this.stateT / this.stateDur, 0, 1);
        const hitT = it.hit / it.dur;
        const dir = this.combo === 1 ? -1 : 1;
        if (it.kind === 'melee') {
          if (tt < hitT) {
            const p = ease(tt / hitT);
            armR = lerp(armR, this.combo === 2 ? -3.0 : -2.55, p);
            torsoYaw = lerp(0, 0.6 * dir, p);
            lean = lerp(0, -0.12, p);
            crouch = lerp(0, 0.03, p);
          } else {
            const p = ease(clamp((tt - hitT) / (1 - hitT), 0, 1));
            const fast = Math.min(1, (tt - hitT) / 0.2);
            armR = lerp(-2.55, -0.25, ease(fast)) + (p > 0.5 ? (p - 0.5) * 0.9 : 0);
            torsoYaw = lerp(0.6 * dir, -0.75 * dir, ease(fast)) * (1 - p * 0.7);
            lean = lerp(-0.12, 0.28, ease(fast)) * (1 - p * 0.8);
            crouch = 0.04 * (1 - p);
          }
          if (this.combo === 2 && tt >= hitT) pivotX = 0;
        } else if (it.kind === 'ranged') {
          const p = tt < 0.6 ? ease(tt / 0.6) : 1 - ease((tt - 0.6) / 0.4);
          armR = lerp(-0.4, -1.5, p);
          armL = lerp(0, -1.5, p);
          torsoYaw = -0.4 * p;
        } else {
          const p = tt < hitT / it.dur ? ease(tt / (hitT / it.dur)) : 1;
          armR = tt < 0.5 ? lerp(-0.6, -2.4, p) : lerp(-2.4, -0.4, ease((tt - 0.5) / 0.5));
          torsoYaw = tt < 0.5 ? 0.4 * p : -0.3;
        }
        break;
      }
      case 'use': {
        const tt = clamp(this.stateT / this.stateDur, 0, 1);
        armR = this.heldKind === 'potion' ? lerp(-0.3, -2.4, Math.sin(tt * Math.PI)) : -1.6 + Math.sin(tt * Math.PI) * -0.6;
        if (this.heldKind !== 'potion') armL = -1.2;
        headPitch = -0.12 * Math.sin(tt * Math.PI);
        break;
      }
      case 'roll': {
        const tt = clamp(this.stateT / this.stateDur, 0, 1);
        pivotX = ease(tt) * TAU;
        armR = -1.7;
        armL = -1.7;
        legL = 1.2;
        legR = 1.2;
        crouch = 0.22 * Math.sin(tt * Math.PI);
        break;
      }
      case 'stagger':
        armR = -0.2;
        armL = 0.2;
        lean = -0.3;
        break;
      case 'dead': {
        const tt = clamp(this.stateT / 0.7, 0, 1);
        pivotX = -ease(tt) * 1.5;
        armR = 0.5;
        armL = 0.5;
        break;
      }
      default:
    }

    const s = Math.min(1, dt * 22);
    const lerpRot = (obj, axis, v, kk = s) => (obj.rotation[axis] += (v - obj.rotation[axis]) * kk);
    lerpRot(m.armR, 'x', armR);
    lerpRot(m.armR, 'z', armRz);
    lerpRot(m.armL, 'x', armL);
    lerpRot(m.armL, 'z', armLz);
    lerpRot(m.legL, 'x', legL);
    lerpRot(m.legR, 'x', legR);
    lerpRot(m.upper, 'y', torsoYaw);
    lerpRot(m.upper, 'x', lean);
    lerpRot(m.head, 'x', headPitch);
    m.head.rotation.y = -m.upper.rotation.y * 0.5;
    m.hip.position.y = 24 * S - crouch + bob;
    this.pivot.rotation.x = pivotX;
    if (this.state === 'roll') this.pivot.position.y = 0.55 - crouch * 0.3;
    else this.pivot.position.y = 0.55;
    m.legL.rotation.z = 0;
    m.legR.rotation.z = 0;
    m.legL.position.y = 0;
    m.legR.position.y = 0;
  }
}
