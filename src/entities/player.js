import * as THREE from 'three';
import { buildHumanoid, buildHeld, S } from './humanoid.js';
import { clamp, lerp } from '../engine/voxel.js';
import { WATER_Y, ZONE } from '../world/terrain.js';
import { WeaponTrail } from '../engine/trail.js';
import { skillMods } from '../systems/skillcast.js';

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
    this.mv = new THREE.Vector3();
    this.accSm = 0;
    this.yawRate = 0;
    this.footIdx = 0;
    this.rollPuff = 0;
    this.deadFx = false;
    this.bank = 0;
    this.trail = new WeaponTrail(game.scene);
    this.tA = new THREE.Vector3();
    this.tB = new THREE.Vector3();
    this.cds = {};
    this.stillT = 0;
    this.bulwarkT = 0;
    this.warcryT = 0;
    this.packT = 0;
    this.leapT = 0;
    this.leapArm = false;
    this.leapLand = false;
    this.leapPower = 14;
    this.leapRadius = 2.4;
    this.leapDir = new THREE.Vector3(0, 0, 1);
    this.castT = 0;
    this.castAnim = '';
    this.ironHits = 0;
    this.ironT = 0;
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
      g.fx.impact(this.pos.x + f.x * 0.6, this.pos.y + 1, this.pos.z + f.z * 0.6, -dx / d, -dz / d, [0xffffff, 0xffe27a, 0x9fd8ff], 0.9);
      g.punch(0.12);
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
    const mods = skillMods(g);
    if (this.ironHits > 0 && this.ironT > 0) {
      this.ironHits--;
      dmg = 1;
    } else {
      const dr = Math.min(0.65, this.reduction + (mods.dr || 0) + (this.bulwarkT > 0 ? 0.45 : 0));
      dmg = Math.max(1, Math.round(dmg * (1 - dr)));
    }
    this.hp = Math.max(0, this.hp - dmg);
    this.invuln = 0.9;
    this.hurtT = 0.4;
    this.knock.set((dx / d) * knock, 0, (dz / d) * knock);
    g.fx.impact(this.pos.x, this.pos.y + 1.1, this.pos.z, dx / d, dz / d, [0xff4d5a, 0xffa0a8, 0xffffff], 1.1);
    g.fx.burst(this.pos.x, this.pos.y + 1.1, this.pos.z, [0xff4d5a, 0xffa0a8, 0xffffff], 8, 3.5, 0.09, 0.5);
    g.punch(0.28);
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
    this.deadFx = false;
    this.game.slowmo(0.7, 0.35);
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
      const heal = item.heal || 0;
      const mana = item.mana || 0;
      if (item.count <= 0) {
        this.game.hud.toast('Out of potions', 1200);
        return false;
      }
      if (heal && !mana && this.hp >= this.maxHp) {
        this.game.hud.toast('Already at full health', 1200);
        return false;
      }
      if (mana && !heal && this.mana >= this.maxMana) {
        this.game.hud.toast('Spirit already full', 1200);
        return false;
      }
      item.count--;
      this.useFx = { heal, mana };
      this.game.progress.setStock(item.id, item.count);
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
    this.rollPuff = 0;
    this.game.audio.evade();
    this.game.fx.dust(this.pos.x, this.pos.y, this.pos.z, 7, 1.8);
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
    this.castT = Math.max(0, this.castT - dt);
    this.bulwarkT = Math.max(0, this.bulwarkT - dt);
    this.ironT = Math.max(0, this.ironT - dt);
    if (this.ironT <= 0) this.ironHits = 0;
    this.warcryT = Math.max(0, this.warcryT - dt);
    this.packT = Math.max(0, this.packT - dt);
    for (const k of Object.keys(this.cds)) {
      this.cds[k] -= dt;
      if (this.cds[k] <= 0) delete this.cds[k];
    }

    if (!this.dead) {
      if (this.stamDelay <= 0 && !(this.shielding && this.state === 'idle')) this.stamina = Math.min(this.maxStamina, this.stamina + 34 * dt);
      this.mana = Math.min(this.maxMana, this.mana + 1.6 * dt);
      this.fury = Math.min(100, this.fury + (1.2 + (skillMods(g).furyRegen || 0)) * dt);
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
        const lunge = it.kind === 'melee' && t > hitT - 0.15 && t < hitT + 0.1 ? (this.combo === 2 ? 5.2 : 4.4) : 0;
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
          const fx = this.useFx || { heal: 8, mana: 0 };
          g.audio.potion();
          if (fx.heal) {
            this.heal(fx.heal);
            g.fx.burst(this.pos.x, this.pos.y + 1.3, this.pos.z, [0xff6a8a, 0xffc0cc, 0xffffff], 14, 1.8, 0.08, 0.9, -1.5, 0.6);
            g.hud.floatText(...g.screenOf(this.pos.x, this.pos.y + 2, this.pos.z), '+' + fx.heal, 'heal');
          }
          if (fx.mana) {
            const before = this.mana;
            this.mana = Math.min(this.maxMana, this.mana + fx.mana);
            const got = Math.round(this.mana - before);
            g.fx.burst(this.pos.x, this.pos.y + 1.3, this.pos.z, [0x4ec8ff, 0xb8f0ff, 0xffffff], 14, 1.8, 0.08, 0.9, -1.5, 0.6);
            g.hud.floatText(...g.screenOf(this.pos.x, this.pos.y + 2.3, this.pos.z), '+' + got, 'mana');
          }
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
    if (this.leapT > 0) {
      this.leapT -= dt;
      speed = 13;
      moveDir.copy(this.leapDir);
    }

    const prevAlong = this.vel.x * Math.sin(this.yaw) + this.vel.z * Math.cos(this.yaw);
    const rate = this.state === 'roll' ? 45 : this.state === 'attack' ? 26 : speed > 0 ? 15 : 12;
    this.mv.x += (moveDir.x * speed - this.mv.x) * Math.min(1, dt * rate);
    this.mv.z += (moveDir.z * speed - this.mv.z) * Math.min(1, dt * rate);
    this.vel.copy(this.mv).add(this.knock);
    this.knock.multiplyScalar(Math.max(0, 1 - dt * 9));
    this.moveBy(this.vel.x * dt, this.vel.z * dt);
    this.speed = Math.hypot(this.vel.x, this.vel.z);
    if (!this.dead && this.speed < 0.35 && this.state !== 'roll') this.stillT = Math.min(2.5, this.stillT + dt);
    else this.stillT = 0;
    if (dt > 1e-4) {
      const along = this.vel.x * Math.sin(this.yaw) + this.vel.z * Math.cos(this.yaw);
      this.accSm += ((along - prevAlong) / dt - this.accSm) * Math.min(1, dt * 9);
    }
    const yawBefore = this.yaw;

    if (!this.dead && this.state !== 'roll' && this.state !== 'attack') {
      let target = this.yaw;
      if (this.shielding || (inp.attackHeld && !this.game.input.touch)) {
        if (this.aimDir) target = Math.atan2(this.aimDir.x, this.aimDir.z);
      } else if (inputMag > 0.1) target = Math.atan2(moveDir.x, moveDir.z);
      this.yaw += angDiff(this.yaw, target) * Math.min(1, dt * 16);
    }
    if (dt > 1e-4) this.yawRate += (clamp(angDiff(yawBefore, this.yaw) / dt, -14, 14) - this.yawRate) * Math.min(1, dt * 8);

    this.updateGround(dt);

    const moving = this.speed > 0.4 && this.state !== 'dead';
    this.moveAmt = lerp(this.moveAmt, moving ? clamp(this.speed / 4.7, 0.3, 1.4) : 0, Math.min(1, dt * 12));
    this.cycle += dt * (this.speed * 2.2 + 0.01);
    const foot = Math.floor(this.cycle / Math.PI);
    if (foot !== this.footIdx) {
      this.footIdx = foot;
      if (moving && (this.state === 'idle' || this.state === 'use') && this.speed > 1.2 && !this.wading) {
        g.audio.step();
        if (this.speed > 3) g.fx.dust(this.pos.x - Math.sin(this.yaw) * 0.1, this.pos.y, this.pos.z - Math.cos(this.yaw) * 0.1, 2, 0.7);
      }
    }
    if (this.state === 'idle' && this.accSm < -22 && this.speed > 2.4 && !this.wading && Math.random() < dt * 40) {
      g.fx.dust(this.pos.x, this.pos.y, this.pos.z, 2, 1.2);
    }
    if (this.state === 'roll') {
      this.rollPuff -= dt;
      if (this.rollPuff <= 0) {
        this.rollPuff = 0.06;
        g.fx.dust(this.pos.x, this.pos.y, this.pos.z, 2, 0.8);
      }
    }

    this.pose(dt);
    this.syncObj();
    this.updateTrail(dt);

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
        if (this.leapArm && this.vy < 0) {
          this.leapArm = false;
          this.leapT = 0;
          this.leapLand = true;
        }
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
    const mods = skillMods(g);
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
        const crit = Math.random() < 0.12 + (mods.crit || 0);
        g.strikeMonster(m, Math.round(it.dmg * mult * (crit ? 1.8 : 1) * (0.9 + Math.random() * 0.25) * mods.melee), dx / (d || 1), dz / (d || 1), it.knock * (this.combo === 2 ? 1.5 : 1), crit);
        if (mods.poison && !m.dead) m.afflict('poison', 4 + (mods.poisonTime || 0), 4 + (mods.poisonBonus || 0));
        hits++;
      }
      if (this.combo === 2) {
        const sx = this.pos.x + f.x * reach * 0.75;
        const sz = this.pos.z + f.z * reach * 0.75;
        g.fx.shockwave(sx, this.pos.y, sz, 0xd9c9a0, 1.6);
        g.shake(0.2);
        g.punch(0.2);
      }
      if (hits) {
        g.hitstop(0.05 + Math.min(0.06, hits * 0.02) + (this.combo === 2 ? 0.04 : 0));
        g.shake(this.combo === 2 ? 0.3 : 0.18);
        g.punch(this.combo === 2 ? 0.34 : 0.16);
        this.fury = Math.min(100, this.fury + Math.round(7 * mods.furyGain) * hits);
        g.audio.hit();
      }
    } else if (it.kind === 'ranged') {
      let dmg = it.dmg;
      let aimed = false;
      if (mods.deadeye && this.stillT > 0.7) {
        dmg = Math.round(dmg * 1.8);
        aimed = true;
        this.stillT = 0;
        g.hud.floatText(...g.screenOf(this.pos.x, this.pos.y + 2.2, this.pos.z), 'Aimed', 'crit');
      }
      if (it.proj) {
        const sp = it.proj === 'gloom' ? 12 : 18;
        g.spawnProjectile({ owner: 'player', kind: it.proj, x: this.pos.x + f.x * 0.6, y: this.pos.y + 1.2, z: this.pos.z + f.z * 0.6, vx: f.x * sp, vz: f.z * sp, dmg, life: it.proj === 'gloom' ? 2.6 : 1.5, r: 0.5, pierce: it.proj === 'crescent', homing: it.proj === 'gloom' ? 3.2 : 0, crit: aimed });
        g.audio.tone(it.proj === 'gloom' ? 260 : 620, 0.14, 'sawtooth', 0.08, -200);
      } else {
        g.spawnProjectile({ owner: 'player', kind: 'arrow', x: this.pos.x + f.x * 0.5, y: this.pos.y + 1.15, z: this.pos.z + f.z * 0.5, vx: f.x * 20, vz: f.z * 20, dmg, life: 1.3, r: 0.35, crit: aimed });
        g.audio.tone(900, 0.08, 'triangle', 0.1, -500);
      }
    } else if (it.kind === 'throw') {
      if (it.count <= 0) return;
      it.count--;
      g.itemsChanged();
      g.spawnProjectile({ owner: 'player', kind: 'stone', x: this.pos.x + f.x * 0.5, y: this.pos.y + 1.3, z: this.pos.z + f.z * 0.5, vx: f.x * 12, vz: f.z * 12, vy: 3.5, dmg: it.dmg, life: 1.4, r: 0.4, gravity: 12 });
    }
  }

  castBolt() {
    const g = this.game;
    const cost = Math.max(1, Math.round(8 * (skillMods(g).manaCost ?? 1)));
    if (this.dead || this.mana < cost || this.state === 'roll' || this.state === 'stagger') return;
    this.mana -= cost;
    const f = this.facing;
    this.setState('use', 0.32);
    this.potionDone = true;
    g.audio.bolt();
    g.spawnProjectile({ owner: 'player', kind: 'bolt', spell: true, x: this.pos.x + f.x * 0.6, y: this.pos.y + 1.15, z: this.pos.z + f.z * 0.6, vx: f.x * 15, vz: f.z * 15, dmg: 11, life: 1.2, r: 0.5, pierce: true });
  }

  playCast(kind, dur = 0.34) {
    if (this.dead) return;
    this.castAnim = kind || 'cast';
    this.castT = dur;
    if (this.state !== 'roll' && this.state !== 'attack' && this.state !== 'dead' && this.state !== 'stagger') {
      this.setState('use', Math.max(0.24, Math.min(0.4, dur)));
      this.potionDone = true;
    }
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

  updateTrail(dt) {
    const tr = this.trail;
    const it = this.attackItem;
    if (this.state === 'attack' && it && it.kind === 'melee' && !this.dead) {
      const tt = this.stateT / this.stateDur;
      const hitT = it.hit / it.dur;
      if (tt > hitT - 0.12 && tt < hitT + (1 - hitT) * 0.55) {
        const spec = TRAIL_SPEC[this.heldKind] || TRAIL_SPEC.blade;
        tr.setStyle(this.combo === 2 ? spec.hot : spec.col, 0.22);
        this.obj.updateMatrixWorld(true);
        this.tA.set(spec.b[0], spec.b[1], spec.b[2]);
        this.tB.set(spec.t[0], spec.t[1], spec.t[2]);
        this.model.heldSlot.localToWorld(this.tA);
        this.model.heldSlot.localToWorld(this.tB);
        tr.add(this.tA, this.tB);
      }
    }
    tr.update(dt);
  }

  pose(dt) {
    const m = this.model;
    const t = this.game.time;
    const walk = Math.sin(this.cycle);
    const cs = Math.cos(this.cycle);
    const mv = this.moveAmt;
    const run = Math.min(1.1, mv);
    const heldBlade = BLADES.has(this.heldKind);
    let armR = heldBlade ? -0.85 : -0.25;
    let armL = 0;
    let armRz = 0;
    let armLz = 0;
    let torsoYaw = 0;
    let lean = 0;
    let crouch = 0;
    let pivotX = 0;
    let pivotY = 0.55;
    let headPitch = 0;
    let headYaw = 0;
    let tilt = 0;
    let hipX = 0;
    let legExtraL = 0;
    let legExtraR = 0;
    let liftL = 0;
    let liftR = 0;
    let rate = 22;

    const idle = 1 - Math.min(1, mv * 2);
    armR += walk * 0.55 * mv * (heldBlade ? 0.4 : 1);
    armL = -walk * 1.0 * mv;
    armLz = 0.05 + run * 0.1;
    armRz = -0.05 - run * 0.08;
    let legL = walk * 0.8 * mv;
    let legR = -walk * 0.8 * mv;
    liftL = Math.max(0, -cs) * 0.11 * run;
    liftR = Math.max(0, cs) * 0.11 * run;
    legExtraL = -Math.max(0, -cs) * 0.3 * run;
    legExtraR = -Math.max(0, cs) * 0.3 * run;
    torsoYaw = walk * 0.2 * run;
    lean = run * 0.1 + clamp(this.accSm * 0.0055, -0.14, 0.2);
    tilt = clamp(-this.yawRate * 0.012, -0.16, 0.16) * Math.min(1, run + 0.2);
    hipX = -walk * 0.02 * run + Math.sin(t * 0.8) * 0.012 * idle;
    tilt += hipX * -1.5;
    armR += Math.sin(t * 2.2) * 0.03 * idle;
    armL += Math.sin(t * 2.2 + 1) * 0.04 * idle;
    armLz += Math.sin(t * 1.6) * 0.02 * idle;
    headYaw = Math.sin(t * 0.55) * 0.18 * idle + Math.sin(t * 1.3) * 0.05 * idle;
    headPitch = -lean * 0.6;
    let bobExtra = Math.sin(t * 2.2) * 0.012 * idle;

    const flinch = this.hurtT > 0 ? Math.min(1, this.hurtT / 0.4) : 0;
    if (this.shielding && this.state !== 'attack') {
      armL = -1.42;
      armLz = 0.12;
      armR = heldBlade ? -1.05 : armR;
      torsoYaw = -0.2;
      crouch += 0.025;
    }

    switch (this.state) {
      case 'attack': {
        const it = this.attackItem;
        const tt = clamp(this.stateT / this.stateDur, 0, 1);
        const hitT = it.hit / it.dur;
        const dir = this.combo === 1 ? -1 : 1;
        rate = 30;
        if (it.kind === 'melee') {
          const over = this.combo === 2;
          if (tt < hitT) {
            const q = tt / hitT;
            const p = ease(q);
            const hold = Math.pow(q, 2.2);
            armR = lerp(armR, over ? -3.05 : -2.55, p);
            armRz = lerp(armRz, over ? 0.25 : 0.55 * dir, p);
            torsoYaw = lerp(0, over ? 0 : 0.7 * dir, p);
            lean = lerp(lean, over ? -0.3 : -0.16, p);
            crouch = lerp(0, over ? 0.02 : 0.05, hold);
            legL = lerp(legL, 0.5, p);
            legR = lerp(legR, -0.1, p);
            armL = lerp(armL, over ? -2.4 : 0.5, p);
            headPitch = over ? -0.15 * p : 0;
            tilt = lerp(tilt, -0.06 * dir, p);
          } else {
            const q = clamp((tt - hitT) / (1 - hitT), 0, 1);
            const fast = ease(Math.min(1, (tt - hitT) / 0.16));
            const settle = ease(clamp((q - 0.45) / 0.55, 0, 1));
            if (over) {
              armR = lerp(-3.05, 0.35, fast) * (1 - settle) + settle * -0.5;
              armL = lerp(-2.4, -0.2, fast) * (1 - settle);
              torsoYaw = 0;
              lean = lerp(-0.3, 0.55, fast) * (1 - settle * 0.9);
              crouch = lerp(0.02, 0.14, fast) * (1 - settle);
              legL = lerp(0.5, 0.9, fast) * (1 - settle);
              legR = lerp(-0.1, -0.85, fast) * (1 - settle);
              headPitch = 0.2 * fast * (1 - settle);
            } else {
              armR = lerp(-2.55, -0.35, fast) * (1 - settle) + settle * -0.6;
              armRz = lerp(0.55 * dir, -0.3 * dir, fast) * (1 - settle);
              torsoYaw = lerp(0.7 * dir, -0.85 * dir, fast) * (1 - settle * 0.8);
              lean = lerp(-0.16, 0.34, fast) * (1 - settle * 0.9);
              crouch = lerp(0.05, 0.1, fast) * (1 - settle);
              legL = lerp(0.5, 0.75, fast) * (1 - settle);
              legR = lerp(-0.1, -0.75, fast) * (1 - settle);
              armL = lerp(0.5, -0.5, fast) * (1 - settle);
              tilt = lerp(-0.06 * dir, 0.1 * dir, fast) * (1 - settle);
            }
          }
          legExtraL = 0;
          legExtraR = 0;
          liftL = 0;
          liftR = 0;
        } else if (it.kind === 'ranged') {
          const p = tt < 0.6 ? ease(tt / 0.6) : 1 - ease((tt - 0.6) / 0.4);
          const rel = tt > 0.6 ? Math.max(0, 1 - (tt - 0.6) / 0.12) : 0;
          armR = lerp(-0.4, -1.5, p);
          armL = lerp(0, -1.5, p);
          torsoYaw = -0.4 * p;
          lean = lerp(0, -0.06, p) - rel * 0.1;
          crouch = 0.03 * p;
          legL = lerp(legL, 0.35, p);
          legR = lerp(legR, -0.35, p);
          headPitch = -0.05 * p;
        } else {
          const p = tt < hitT / it.dur ? ease(tt / (hitT / it.dur)) : 1;
          armR = tt < 0.5 ? lerp(-0.6, -2.4, p) : lerp(-2.4, -0.4, ease((tt - 0.5) / 0.5));
          torsoYaw = tt < 0.5 ? 0.4 * p : -0.3;
          lean = tt < 0.5 ? -0.1 * p : 0.2 * (1 - ease((tt - 0.5) / 0.5));
        }
        break;
      }
      case 'use': {
        const tt = clamp(this.stateT / this.stateDur, 0, 1);
        const sw = Math.sin(tt * Math.PI);
        armR = this.heldKind === 'potion' || this.heldKind === 'manapotion' ? lerp(-0.3, -2.4, sw) : -1.6 + sw * -0.6;
        if (this.heldKind !== 'potion') armL = -1.2;
        headPitch = -0.14 * sw;
        lean = -0.06 * sw;
        break;
      }
      case 'roll': {
        const tt = clamp(this.stateT / this.stateDur, 0, 1);
        pivotX = ease(tt) * TAU;
        armR = -1.8;
        armL = -1.8;
        armLz = 0.3;
        armRz = -0.3;
        legL = 1.35;
        legR = 1.35;
        legExtraL = 0;
        legExtraR = 0;
        liftL = 0;
        liftR = 0;
        crouch = 0.24 * Math.sin(tt * Math.PI);
        lean = 0;
        tilt = 0;
        torsoYaw = 0;
        pivotY = 0.55 - 0.1 * Math.sin(tt * Math.PI);
        rate = 40;
        break;
      }
      case 'stagger': {
        const wob = Math.sin(this.stateT * 22) * 0.08;
        armR = -0.1 + wob;
        armL = 0.3 - wob;
        armRz = -0.5;
        armLz = 0.5;
        lean = -0.4;
        headPitch = -0.3;
        crouch = 0.06;
        legL = 0.4;
        legR = -0.35;
        torsoYaw = wob;
        break;
      }
      case 'dead': {
        const u = this.stateT;
        const kneel = ease(clamp(u / 0.35, 0, 1));
        const fall = clamp((u - 0.3) / 0.75, 0, 1);
        const bounce = fall > 0 ? 1 - Math.exp(-5.5 * fall) * Math.cos(9 * fall) : 0;
        crouch = 0.16 * kneel;
        legL = 0.9 * kneel;
        legR = -0.5 * kneel;
        legExtraL = 0;
        legExtraR = 0;
        liftL = 0;
        liftR = 0;
        lean = -0.2 * kneel;
        pivotX = -bounce * 1.52;
        pivotY = 0.55 - 0.27 * ease(fall);
        armR = 0.5 - kneel * 0.6;
        armL = 0.4 - kneel * 0.5;
        armRz = -0.9 * ease(fall);
        armLz = 0.9 * ease(fall);
        headPitch = -0.3 * kneel;
        tilt = 0;
        torsoYaw = 0;
        rate = 16;
        if (!this.deadFx && fall > 0.5) {
          this.deadFx = true;
          this.game.fx.shockwave(this.pos.x, this.pos.y, this.pos.z, 0xd9c9a0, 1.2);
          this.game.shake(0.25);
        }
        break;
      }
      default:
    }

    if (this.leapArm || this.leapT > 0) {
      const rising = this.vy > 0;
      armR = rising ? -2.6 : -0.4;
      armL = rising ? -2.6 : -0.2;
      legL = rising ? -0.9 : 0.6;
      legR = rising ? 0.2 : 0.7;
      lean = rising ? 0.45 : 0.15;
      torsoYaw = 0;
    } else if (this.castT > 0) {
      if (this.castAnim === 'spin') {
        armR = -1.6;
        armL = -1.6;
        torsoYaw = Math.sin(this.castT * 32) * 1.15;
        lean = 0.08;
      } else if (this.castAnim === 'bash') {
        armL = -1.9;
        torsoYaw = 0.7;
        lean = 0.12;
      } else if (this.castAnim === 'slam') {
        armR = -2.5;
        armL = -2.5;
        lean = 0.35;
      }
    }

    if (flinch > 0 && this.state !== 'dead' && this.state !== 'roll') {
      const f2 = flinch * flinch;
      lean = lerp(lean, -0.42, f2);
      headPitch = lerp(headPitch, -0.4, f2);
      armRz = lerp(armRz, -0.7, f2);
      armLz = lerp(armLz, 0.7, f2);
      armL = lerp(armL, 0.3, f2);
      torsoYaw += Math.sin(this.hurtT * 50) * 0.08 * flinch;
      crouch += 0.05 * f2;
    }

    const s = Math.min(1, dt * rate);
    const lerpRot = (obj, axis, v, kk = s) => (obj.rotation[axis] += (v - obj.rotation[axis]) * kk);
    lerpRot(m.armR, 'x', armR);
    lerpRot(m.armR, 'z', armRz);
    lerpRot(m.armL, 'x', armL);
    lerpRot(m.armL, 'z', armLz);
    const legSpeed = Math.min(1, dt * (this.state === 'attack' ? 30 : 26));
    lerpRot(m.legL, 'x', legL + legExtraL, legSpeed);
    lerpRot(m.legR, 'x', legR + legExtraR, legSpeed);
    lerpRot(m.upper, 'y', torsoYaw);
    lerpRot(m.upper, 'x', lean);
    lerpRot(m.upper, 'z', tilt * 0.6, Math.min(1, dt * 12));
    lerpRot(m.head, 'x', headPitch);
    m.head.rotation.y = -m.upper.rotation.y * 0.55 + headYaw;
    const cl = Math.cos(m.legL.rotation.x);
    const cr = Math.cos(m.legR.rotation.x);
    const planted = 0.72 - 0.72 * 0.55 * (1 - Math.max(cl, cr));
    m.hip.position.y = this.state === 'roll' || this.state === 'dead' ? 24 * S - crouch + bobExtra : planted - crouch + bobExtra;
    m.hip.position.x += (hipX - m.hip.position.x) * Math.min(1, dt * 14);
    this.pivot.rotation.x = pivotX;
    this.pivot.rotation.z += (tilt * 0.4 - this.pivot.rotation.z) * Math.min(1, dt * 10);
    this.pivot.position.y = pivotY;
    m.legL.rotation.z = 0;
    m.legR.rotation.z = 0;
    m.legL.position.y = liftL;
    m.legR.position.y = liftR;
  }
}

const BLADES = new Set(['blade', 'axe', 'pick', 'hammer', 'budgeblade', 'budgemaul', 'darkscythe']);

const TRAIL_SPEC = {
  blade: { b: [0, 0, 0.35], t: [0, 0, 1.25], col: 0xfff2c0, hot: 0xffd27a },
  axe: { b: [0, 0, 0.5], t: [0, 0, 1.1], col: 0xfff2c0, hot: 0xffd27a },
  pick: { b: [0, 0, 0.5], t: [0, 0, 1.1], col: 0xe6e0d0, hot: 0xffd27a },
  hammer: { b: [0, 0, 0.6], t: [0, 0, 1.2], col: 0xe6e0d0, hot: 0xffd27a },
  budgeblade: { b: [0, 0, 0.35], t: [0, 0, 1.4], col: 0xb8ff8a, hot: 0xfff09a },
  budgemaul: { b: [0, 0, 0.8], t: [0, 0, 1.5], col: 0xb8ff8a, hot: 0xfff09a },
  darkscythe: { b: [-0.05, 0, 0.8], t: [-0.4, 0, 1.4], col: 0xc78bff, hot: 0xe6c8ff },
};
