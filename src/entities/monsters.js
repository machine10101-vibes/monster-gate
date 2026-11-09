import * as THREE from 'three';
import { buildSlime, buildBoar, buildWraith, buildBudgeDragon, buildDarksycleDragon } from './creatures.js';
import { buildOrcScout } from './orc.js';
import { clamp, lerp, RNG } from '../engine/voxel.js';
import { statusFx } from '../systems/skillfx.js';
import { ZONE, GATE, TOWN, WATER_Y, CENTER, MINE, LAKE } from '../world/terrain.js';

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
function easeOutBack(x) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

const DEATH_DUR = { slime: 0.6, voidslime: 0.65, boar: 1.3, wraith: 0.9, budgedragon: 1.8, darksycledragon: 2.1, orcscout: 1.25 };
const TELE_COL = { boar: 0xff5a3a, budgedragon: 0xff7a2a, darksycledragon: 0xb25cff, wraith: 0xc27bff, orcscout: 0xc45a2a };

const DEFS = {
  slime: { name: 'Gate Slime', hp: 18, radius: 0.5, speed: 2.6, dmg: 2, gold: [2, 5], aggro: 9, build: () => buildSlime('green') },
  voidslime: { name: 'Void Slime', hp: 26, radius: 0.55, speed: 3.0, dmg: 3, gold: [4, 8], aggro: 11, build: () => buildSlime('purple') },
  boar: { name: 'Thorn Boar', hp: 38, radius: 0.7, speed: 2.5, dmg: 3, gold: [5, 10], aggro: 10, build: buildBoar },
  wraith: { name: 'Gate Wraith', hp: 24, radius: 0.5, speed: 2.2, dmg: 2, gold: [6, 12], aggro: 13, build: buildWraith },
  budgedragon: { name: 'Green Budge Dragon', hp: 64, radius: 0.85, speed: 3.1, dmg: 4, gold: [12, 22], aggro: 12, build: buildBudgeDragon },
  darksycledragon: { name: 'Darksycle Dragon', hp: 110, radius: 0.95, speed: 2.7, dmg: 4, gold: [30, 48], aggro: 17, build: buildDarksycleDragon },
  orcscout: { name: 'Orc Scout', hp: 36, radius: 0.55, speed: 2.7, dmg: 4, gold: [2, 8], aggro: 12, build: buildOrcScout },
};

export const MONSTER_BUILDERS = Object.fromEntries(Object.entries(DEFS).map(([k, v]) => [k, v.build]));
export const MONSTER_STATS = Object.fromEntries(Object.entries(DEFS).map(([k, v]) => [k, { hp: v.hp, dmg: v.dmg, speed: v.speed }]));

export class Monster {
  constructor(game, type, x, z) {
    this.game = game;
    this.type = type;
    const d = DEFS[type];
    this.def = d;
    this.name = d.name;
    this.radius = d.radius;
    this.maxHp = d.hp;
    this.hp = d.hp;
    this.x = x;
    this.z = z;
    this.home = { x, z };
    this.y = game.world.heightAt(x, z);
    this.vx = 0;
    this.vz = 0;
    this.vy = 0;
    this.yaw = Math.random() * TAU;
    this.state = 'idle';
    this.t = Math.random() * 3;
    this.cd = 1 + Math.random();
    this.hitCd = 0;
    this.stun = 0;
    this.poisonT = 0;
    this.poisonDps = 0;
    this.burnT = 0;
    this.burnDps = 0;
    this.slowT = 0;
    this.slowMul = 1;
    this.markT = 0;
    this.markAmp = 0;
    this.flash = 0;
    this.dead = false;
    this.deadT = 0;
    this.wanderT = 0;
    this.target = { x, z };
    this.phase = Math.random() * 10;
    this.spawnT = 0.6;
    this.id = 'm' + Math.random().toString(36).slice(2, 8);
    this.hover = type === 'wraith' ? 1.15 : type === 'darksycledragon' ? 1.0 : 0;
    this.realm = 'over';

    const built = d.build();
    this.model = built;
    this.obj = new THREE.Group();
    this.obj.add(built.root);
    game.scene.add(this.obj);
    this.obj.position.set(x, this.y, z);
    this.baseScale = type === 'voidslime' ? 1.15 : 1;
    this.air = false;
    this.attacking = false;
    this.chargeDir = new THREE.Vector3();
    this.hitT = 0;
    this.landT = 0;
    this.pend = null;
    this.pendT = 0;
    this.teleSlot = null;
    this.teleKind = null;
    this.kick = 0;
    this.px = x;
    this.pz = z;
    this.avx = 0;
    this.avz = 0;
    this.yawRate = 0;
    this.prevYaw = this.yaw;
    this.stepIdx = 0;
    this.deadSide = Math.random() < 0.5 ? -1 : 1;
    this.hvy = 0;
    this.deadFlags = {};
    this.flashDir = { x: 0, z: 1 };
  }

  warn(kind, w, l, dur, atCenter = false) {
    const g = this.game;
    this.teleKind = kind;
    this.teleCenter = atCenter;
    this.teleSlot = g.fx.telegraph(this.x, this.y + this.hover * 0.2, this.z, this.yaw, kind, w, l, TELE_COL[this.type] || 0xff4a3a, dur);
    this.teleSlot.owner = this;
    this.teleL = l;
  }

  clearWarn() {
    if (this.teleSlot) {
      if (this.teleSlot.owner === this) this.game.fx.cancelTelegraph(this.teleSlot);
      this.teleSlot = null;
    }
  }

  placeWarn() {
    const sl = this.teleSlot;
    if (!sl || sl.owner !== this || !sl.active) return;
    const m = sl.mesh;
    const gy = this.game.world.heightAt(this.x, this.z);
    if (this.teleKind === 'line') {
      m.position.set(this.x + Math.sin(this.yaw) * this.teleL * 0.5, gy + 0.1, this.z + Math.cos(this.yaw) * this.teleL * 0.5);
      m.rotation.y = this.yaw;
    } else m.position.set(this.x, gy + 0.1, this.z);
  }

  afflict(kind, time, power) {
    if (this.dead) return;
    if (kind === 'poison') {
      this.poisonT = Math.max(this.poisonT || 0, time);
      this.poisonDps = Math.max(this.poisonDps || 0, power);
    } else if (kind === 'burn') {
      this.burnT = Math.max(this.burnT || 0, time);
      this.burnDps = Math.max(this.burnDps || 0, power);
    } else if (kind === 'slow') {
      const longer = time >= (this.slowT || 0);
      this.slowT = Math.max(this.slowT || 0, time);
      this.slowMul = longer ? power : Math.min(this.slowMul || 1, power);
    } else if (kind === 'mark') {
      this.markT = Math.max(this.markT || 0, time);
      this.markAmp = power;
    } else if (kind === 'stun') {
      this.stun = Math.max(this.stun || 0, time);
    }
  }

  tickStatus(dt) {
    if (this.dead) return false;
    const tick = (timeKey, dpsKey, accKey, color) => {
      if (this[timeKey] <= 0) return;
      this[timeKey] = Math.max(0, this[timeKey] - dt);
      this[accKey] = (this[accKey] || 0) + dt;
      if (this[accKey] < 0.5) return;
      this[accKey] -= 0.5;
      this.hp -= (this[dpsKey] || 0) * 0.5;
      this.game.fx.burst(this.x, this.y + 0.8 + (this.hover || 0), this.z, color, 3, 1.4, 0.07, 0.35);
    };
    tick('poisonT', 'poisonDps', '_poisAcc', 0x7dff5a);
    if (this.hp <= 0) {
      this.hp = 0;
      this.die();
      return true;
    }
    tick('burnT', 'burnDps', '_burnAcc', 0xff7a1a);
    if (this.hp <= 0) {
      this.hp = 0;
      this.die();
      return true;
    }
    if (this.slowT > 0) this.slowT = Math.max(0, this.slowT - dt);
    if (this.markT > 0) this.markT = Math.max(0, this.markT - dt);
    return false;
  }

  takeHit(dmg, dx, dz, knock, crit = false) {
    if (this.dead) return;
    if (this.markT > 0) dmg = Math.max(1, Math.round(dmg * (1 + (this.markAmp || 0.4))));
    const g = this.game;
    this.hp -= dmg;
    this.flash = 0.18;
    const drake = this.type === 'budgedragon';
    const dusk = this.type === 'darksycledragon';
    const heavy = drake || dusk;
    this.stun = this.type === 'boar' && this.state === 'charge' ? 0.05 : heavy ? (this.state === 'windup' || this.state === 'bite' ? 0 : 0.12) : 0.28;
    if (this.state === 'windup' && !heavy) {
      this.state = 'chase';
      this.clearWarn();
    }
    this.pend = null;
    this.hitT = 0.34;
    this.flashDir = { x: dx, z: dz };
    if (dusk && this.state === 'windup' && dmg >= 14) {
      this.state = 'recover';
      this.t = 0;
      this.cd = 1.3;
      this.clearWarn();
      g.fx.ring(this.x, this.y + this.hover + 1.2, this.z, 0xffe27a, 12, 3, 0.1, 0.4);
      g.hud.floatText(...g.screenOf(this.x, this.y + this.hover + 2.4, this.z), 'Staggered', 'gold');
    }
    const k = knock / (this.type === 'boar' ? 1.6 : drake ? 2.4 : dusk ? 3 : 1);
    this.vx = dx * k * 1.7;
    this.vz = dz * k * 1.7;
    this.vy = this.type === 'wraith' || dusk ? 0 : drake ? 1.2 : 2.6;
    if (drake && !this.enraged && this.hp > 0 && this.hp < this.maxHp * 0.4) this.enrage();
    if (dusk && !this.enraged && this.hp > 0 && this.hp < this.maxHp * 0.5) this.enrage();
    this.air = this.type === 'slime' || this.type === 'voidslime' ? this.air : false;
    const hx = this.x;
    const hy = this.y + 0.7 + this.hover;
    const hz = this.z;
    const sparkCol = this.type === 'slime' ? [0xa4f58f, 0xffffff] : this.type === 'voidslime' || this.type === 'wraith' ? [0xdcb4ff, 0xffffff] : dusk ? [0xd8b0ff, 0xffffff] : [0xfff2c0, 0xffb347, 0xffffff];
    g.fx.impact(hx - dx * this.radius * 0.6, hy + 0.2, hz - dz * this.radius * 0.6, dx, dz, sparkCol, (crit ? 1.7 : 1) * Math.min(1.8, 0.6 + dmg / 18));
    g.fx.burst(hx, hy, hz, this.type === 'slime' ? [0x57d46c, 0xa4f58f, 0xffffff] : this.type === 'voidslime' || this.type === 'wraith' ? [0xc27bff, 0x8c52da, 0xffffff] : dusk ? [0xb25cff, 0x4b3f8c, 0xffffff] : [0xc9967a, 0xff5a46, 0xffffff], crit ? 12 : 6, 3.8, 0.1, 0.5);
    g.hud.floatText(...g.screenOf(hx, hy + 0.9, hz), String(dmg) + (crit ? '!' : ''), crit ? 'crit' : '');
    if (this.state === 'idle' || this.state === 'wander') this.state = 'chase';
    if (this.hp <= 0) this.die();
  }

  enrage() {
    const g = this.game;
    this.enraged = true;
    this.cd = Math.min(this.cd, 0.3);
    const dusk = this.type === 'darksycledragon';
    g.audio.tone(dusk ? 160 : 90, 0.55, 'sawtooth', 0.16, -30);
    g.fx.ring(this.x, this.y + 0.3 + this.hover, this.z, dusk ? 0xb25cff : 0xff6a2a, 10, 2.6, 0.1, 0.5);
    g.hud.floatText(...g.screenOf(this.x, this.y + this.hover + 2.2, this.z), dusk ? 'Dusk Frenzy!' : 'Enraged!', 'crit');
  }

  die() {
    const g = this.game;
    this.dead = true;
    this.deadT = 0;
    g.onMonsterKilled(this);
    g.fx.burst(this.x, this.y + 0.7 + this.hover, this.z, this.type === 'boar' ? [0xc9967a, 0x8a5634, 0xffffff] : this.type === 'budgedragon' ? [0x6fd45a, 0xf1e6c6, 0xffffff] : this.type === 'darksycledragon' ? [0xb25cff, 0xd8d3ee, 0x2b2450] : [0xc27bff, 0x57d46c, 0xffffff], 22, 4.5, 0.14, 0.8);
    g.audio.pop();
    g.hud.removePlate(this.id);
    this.clearWarn();
    this.pend = null;
    this.state = 'dead';
    this.vy = Math.max(this.vy, this.type === 'slime' || this.type === 'voidslime' ? 3.5 : 1.5);
    g.fx.impact(this.x, this.y + 0.9 + this.hover, this.z, this.flashDir.x, this.flashDir.z, [0xffffff, 0xfff2c0], 2.2);
    if (this.type === 'budgedragon' || this.type === 'darksycledragon') {
      g.slowmo(0.55, 0.3);
      g.shake(0.35);
      g.punch(0.5);
    } else if (this.type === 'boar') {
      g.slowmo(0.3, 0.4);
      g.punch(0.25);
    }
  }

  groundOk(x, z) {
    const w = this.game.world;
    if (!w.playable(x, z)) return false;
    const h = w.heightAt(x, z);
    if (h - this.y > 1.01 || h < WATER_Y - 0.1 || h > 9) return false;
    const zn = w.zoneAt(x, z);
    if (zn === ZONE.TOWN || zn === ZONE.MINE || w.onDock(x, z, 0.4)) return false;
    return true;
  }

  moveBy(dx, dz) {
    const nx = this.x + dx;
    const nz = this.z + dz;
    if (this.groundOk(nx, nz)) {
      this.x = nx;
      this.z = nz;
    } else if (this.groundOk(nx, this.z)) this.x = nx;
    else if (this.groundOk(this.x, nz)) this.z = nz;
    const p = { x: this.x, z: this.z };
    this.game.world.resolve(p, this.radius * 0.8);
    this.x = p.x;
    this.z = p.z;
  }

  /** Hosts chase whichever hunter is closest, including friends in the world. */
  hunter() {
    const g = this.game;
    const local = g.player;
    if (g.net?.role !== 'host' || !g.remotes?.size) return local;
    let best = null;
    let bestD = Math.hypot(local.pos.x - this.x, local.pos.z - this.z);
    for (const rp of g.remotes.values()) {
      if (rp.dead || !rp.ready) continue;
      const d = Math.hypot(rp.x - this.x, rp.z - this.z);
      if (d < bestD) {
        bestD = d;
        best = rp;
      }
    }
    if (!best) return local;
    return {
      pos: best,
      dead: false,
      invuln: 0,
      hurt: (dmg, x, z, knock) => {
        g.net.sendHurt(best.id, dmg, x, z, knock || 6);
        return true;
      },
    };
  }

  snap(s) {
    this.x = s.x;
    this.y = s.y;
    this.z = s.z;
    this.yaw = s.yaw;
    if (s.state) this.state = s.state;
    if (s.hp < this.hp) {
      const dealt = this.hp - s.hp;
      this.flash = 0.12;
      const g = this.game;
      g.hud.floatText(...g.screenOf(this.x, this.y + 1.6, this.z), String(dealt));
      g.audio.hit();
    }
    this.hp = s.hp;
    if (this.hp <= 0 && !this.dead) this.die();
  }

  update(dt) {
    const g = this.game;
    const home = this.realm || 'over';
    const here = g.world?.realm || 'over';
    if (home !== here) {
      this.obj.visible = false;
      if (this.dead) this.deadAnim(dt);
      return;
    }
    this.obj.visible = true;
    if (this.dead) {
      this.deadAnim(dt);
      return;
    }
    if (this.puppet) {
      this.t += dt;
      this.flash = Math.max(0, this.flash - dt);
      this.hitT = Math.max(0, this.hitT - dt);
      this.kick = Math.max(0, this.kick - dt * 4.5);
      this.animate(dt, 99);
      return;
    }
    const P = this.hunter();
    this.t += dt;
    this.cd -= dt;
    this.stun = Math.max(0, this.stun - dt);
    this.flash = Math.max(0, this.flash - dt);
    this.spawnT = Math.max(0, this.spawnT - dt);
    this.hitT = Math.max(0, this.hitT - dt);
    this.landT = Math.max(0, this.landT - dt);
    this.kick = Math.max(0, this.kick - dt * 4.5);
    if (this.tickStatus(dt)) return;
    statusFx(g, this, dt);
    if (this.pend && this.stun <= 0) {
      this.pendT -= dt;
      if (this.pendT <= 0) this.launchHop();
    }

    const dx = P.pos.x - this.x;
    const dz = P.pos.z - this.z;
    const dist = Math.hypot(dx, dz);
    const sees = dist < this.def.aggro && !P.dead;
    const toP = Math.atan2(dx, dz);

    let mvx = 0;
    let mvz = 0;

    if (this.stun <= 0) {
      switch (this.type) {
        case 'slime':
        case 'voidslime': {
          if (this.state === 'idle' || this.state === 'wander') {
            if (sees) this.state = 'chase';
            else if (!this.air && this.cd <= 0) {
              this.cd = 1.3 + Math.random() * 1.6;
              const a = Math.random() * TAU;
              const px = this.home.x + Math.cos(a) * 3;
              const pz = this.home.z + Math.sin(a) * 3;
              this.hopTo(px - this.x, pz - this.z, 1.4);
            }
          } else if (this.state === 'chase') {
            if (!sees && dist > this.def.aggro * 1.6) this.state = 'idle';
            if (!this.air && this.cd <= 0) {
              this.cd = 0.85;
              this.hopTo(dx, dz, this.def.speed * 0.8);
              this.yaw = toP;
            }
          }
          if (this.air && dist < this.radius + 0.55 && P.invuln <= 0 && this.hitCd <= 0) {
            this.contact(P);
          }
          break;
        }
        case 'boar': {
          if (this.state === 'idle' || this.state === 'wander') {
            if (sees) this.state = 'chase';
            else {
              this.wanderT -= dt;
              if (this.wanderT <= 0) {
                this.wanderT = 2 + Math.random() * 3;
                const a = Math.random() * TAU;
                this.target = { x: this.home.x + Math.cos(a) * 4, z: this.home.z + Math.sin(a) * 4 };
              }
              const tx = this.target.x - this.x;
              const tz = this.target.z - this.z;
              const td = Math.hypot(tx, tz);
              if (td > 0.6) {
                mvx = (tx / td) * 1.0;
                mvz = (tz / td) * 1.0;
                this.yaw += angDiff(this.yaw, Math.atan2(tx, tz)) * Math.min(1, dt * 5);
              }
            }
          } else if (this.state === 'chase') {
            if (!sees && dist > this.def.aggro * 1.5) this.state = 'idle';
            this.yaw += angDiff(this.yaw, toP) * Math.min(1, dt * 6);
            if (dist > 1.8) {
              mvx = (dx / dist) * this.def.speed;
              mvz = (dz / dist) * this.def.speed;
            }
            if ((dist < 6.5 && dist > 2.6 && this.cd <= 0) || (dist < 1.7 && this.cd <= 0)) {
              this.state = 'windup';
              this.t = 0;
              this.chargeDir.set(dx / dist, 0, dz / dist);
              this.warn('line', 1.5, 6.8, 0.65);
              g.audio.tone(110, 0.3, 'sawtooth', 0.07, -20);
            }
          } else if (this.state === 'windup') {
            this.yaw += angDiff(this.yaw, toP) * Math.min(1, dt * 8);
            this.chargeDir.set(dx / (dist || 1), 0, dz / (dist || 1));
            if (this.t > 0.65) {
              this.state = 'charge';
              this.t = 0;
              this.hitDone = false;
              this.clearWarn();
              this.kick = 1;
              g.fx.dust(this.x, this.y, this.z, 8, 2);
              g.audio.tone(140, 0.25, 'sawtooth', 0.12, 60);
            }
          } else if (this.state === 'charge') {
            mvx = this.chargeDir.x * 9.5;
            mvz = this.chargeDir.z * 9.5;
            this.yaw = Math.atan2(this.chargeDir.x, this.chargeDir.z);
            if (Math.random() < dt * 45) g.fx.dust(this.x - this.chargeDir.x * 0.6, this.y, this.z - this.chargeDir.z * 0.6, 1, 1.4);
            if (!this.hitDone && dist < this.radius + 0.5) {
              this.hitDone = true;
              if (P.hurt(this.def.dmg, this.x, this.z, 8)) {
                this.state = 'recover';
                this.t = 0;
                g.fx.shockwave(this.x, this.y, this.z, 0xd9c9a0, 1.2);
              }
            }
            if (this.t > 0.7) {
              this.state = 'recover';
              this.t = 0;
              g.fx.dust(this.x, this.y, this.z, 8, 2.2);
            }
          } else if (this.state === 'recover') {
            if (this.t > 1.0) {
              this.state = 'chase';
              this.cd = 1.8;
            }
          }
          break;
        }
        case 'wraith': {
          const preferred = 5.2;
          if (this.state === 'idle' || this.state === 'wander') {
            if (sees) this.state = 'chase';
            else {
              this.wanderT -= dt;
              if (this.wanderT <= 0) {
                this.wanderT = 2 + Math.random() * 2;
                const a = Math.random() * TAU;
                this.target = { x: this.home.x + Math.cos(a) * 3, z: this.home.z + Math.sin(a) * 3 };
              }
              const tx = this.target.x - this.x;
              const tz = this.target.z - this.z;
              const td = Math.hypot(tx, tz);
              if (td > 0.5) {
                mvx = (tx / td) * 0.8;
                mvz = (tz / td) * 0.8;
              }
            }
          } else if (this.state === 'chase') {
            this.yaw += angDiff(this.yaw, toP) * Math.min(1, dt * 6);
            const away = dist < preferred - 1 ? -1 : dist > preferred + 1.5 ? 1 : 0;
            const sx = Math.cos(this.t * 0.8 + this.phase) * 0.5;
            mvx = (dx / dist) * this.def.speed * away + (dz / dist) * sx * 2;
            mvz = (dz / dist) * this.def.speed * away - (dx / dist) * sx * 2;
            if (!sees && dist > this.def.aggro * 1.5) this.state = 'idle';
            if (this.cd <= 0 && dist < 11) {
              this.state = 'windup';
              this.t = 0;
              this.warn('line', 1.1, 9, 0.7);
            }
          } else if (this.state === 'windup') {
            this.yaw += angDiff(this.yaw, toP) * Math.min(1, dt * 10);
            if (this.t > 0.7) {
              this.clearWarn();
              this.kick = 1;
              const a = Math.atan2(dx, dz);
              g.spawnProjectile({ owner: 'enemy', kind: 'orb', x: this.x + Math.sin(a) * 0.6, y: this.y + 1.5, z: this.z + Math.cos(a) * 0.6, vx: Math.sin(a) * 6.5, vz: Math.cos(a) * 6.5, dmg: this.def.dmg, life: 3.2, r: 0.4 });
              g.audio.tone(300, 0.2, 'sawtooth', 0.08, -150);
              this.state = 'chase';
              this.cd = 2.2 + Math.random();
            }
          }
          break;
        }
        case 'budgedragon': {
          const rage = this.enraged ? 1.3 : 1;
          if (this.state === 'idle' || this.state === 'wander') {
            if (sees) {
              this.state = 'chase';
              this.cd = 0.5;
              g.audio.tone(130, 0.4, 'sawtooth', 0.1, -50);
            } else {
              this.wanderT -= dt;
              if (this.wanderT <= 0) {
                this.wanderT = 2.5 + Math.random() * 3;
                const a = Math.random() * TAU;
                this.target = { x: this.home.x + Math.cos(a) * 4, z: this.home.z + Math.sin(a) * 4 };
              }
              const tx = this.target.x - this.x;
              const tz = this.target.z - this.z;
              const td = Math.hypot(tx, tz);
              if (td > 0.7) {
                mvx = (tx / td) * 0.9;
                mvz = (tz / td) * 0.9;
                this.yaw += angDiff(this.yaw, Math.atan2(tx, tz)) * Math.min(1, dt * 4);
              }
            }
          } else if (this.state === 'chase') {
            if (!sees && dist > this.def.aggro * 1.6) this.state = 'idle';
            this.yaw += angDiff(this.yaw, toP) * Math.min(1, dt * 7);
            const spit = dist > 4.5 && dist < 10 && Math.random() < dt * 0.55;
            if (dist > 1.9) {
              mvx = (dx / dist) * this.def.speed * rage;
              mvz = (dz / dist) * this.def.speed * rage;
            }
            if (this.cd <= 0 && dist < 2.4) {
              this.state = 'windup';
              this.atk = 'bite';
              this.t = 0;
              this.warn('line', 1.7, 2.9, 0.34 / rage);
            } else if (this.cd <= 0 && spit) {
              this.state = 'windup';
              this.atk = 'spit';
              this.t = 0;
              this.warn('line', 2.4, 9, 0.75 / rage);
            }
          } else if (this.state === 'windup') {
            this.yaw += angDiff(this.yaw, toP) * Math.min(1, dt * 9);
            const wind = this.atk === 'spit' ? 0.75 : 0.34;
            if (this.t > wind / rage) {
              this.clearWarn();
              this.kick = 1;
              if (this.atk === 'spit') {
                const a = Math.atan2(dx, dz);
                for (const spread of [-0.16, 0, 0.16]) {
                  g.spawnProjectile({ owner: 'enemy', kind: 'ember', x: this.x + Math.sin(a) * 1.4, y: this.y + 1.05, z: this.z + Math.cos(a) * 1.4, vx: Math.sin(a + spread) * 8, vz: Math.cos(a + spread) * 8, dmg: this.def.dmg - 1, life: 1.5, r: 0.38 });
                }
                g.fx.burst(this.x + Math.sin(a) * 1.4, this.y + 1.05, this.z + Math.cos(a) * 1.4, [0xff9a2a, 0xffe27a, 0xffffff], 10, 3, 0.1, 0.4);
                g.audio.tone(220, 0.25, 'sawtooth', 0.09, -120);
                this.state = 'recover';
                this.t = 0;
                this.cd = 1.6 / rage;
              } else {
                this.state = 'bite';
                this.t = 0;
                g.vfx.slashArc(this.x, this.y + 0.95, this.z, Math.atan2(dx, dz), { radius: 1.9, thick: 1.0, sweep: 1.9, color: 0xfff0d0, hot: 0xffffff, tilt: 0.5, life: 0.22, sweepT: 0.1, forward: 0 });
                g.vfx.glow(this.x + Math.sin(this.yaw) * 1.5, this.y + 1, this.z + Math.cos(this.yaw) * 1.5, 0xff6a5a, 2.2, 0.2, { grow: 0.5 });
                this.hitDone = false;
                this.chargeDir.set(dx / (dist || 1), 0, dz / (dist || 1));
                this.vx = this.chargeDir.x * 7.5;
                this.vz = this.chargeDir.z * 7.5;
                g.audio.tone(180, 0.15, 'square', 0.1, -90);
              }
            }
          } else if (this.state === 'bite') {
            if (!this.hitDone && dist < this.radius + 1.0) {
              this.hitDone = true;
              if (P.hurt(this.def.dmg, this.x, this.z, 7)) g.fx.burst(this.x, this.y + 0.9, this.z, [0xfff8e2, 0xff4d5a], 6, 2.5, 0.08, 0.3);
            }
            if (this.t > 0.3) {
              this.state = 'recover';
              this.t = 0;
              this.cd = (this.hitDone ? 0.7 : 0.45) / rage;
            }
          } else if (this.state === 'recover') {
            if (this.t > 0.45 / rage) this.state = 'chase';
          }
          if (this.enraged && Math.random() < dt * 6) g.fx.burst(this.x + Math.sin(this.yaw) * 1.5, this.y + 1.0, this.z + Math.cos(this.yaw) * 1.5, [0x9a9a9a, 0x6a6a6a], 1, 0.8, 0.12, 0.6, -0.6, 0.5);
          break;
        }
        case 'darksycledragon': {
          const frenzy = !!this.enraged;
          const preferred = 8.5;
          if (this.state === 'idle' || this.state === 'wander') {
            if (sees) {
              this.state = 'chase';
              this.cd = 0.7;
              g.audio.tone(170, 0.45, 'sawtooth', 0.1, -60);
            } else {
              this.wanderT -= dt;
              if (this.wanderT <= 0) {
                this.wanderT = 2.5 + Math.random() * 3;
                const a = Math.random() * TAU;
                this.target = { x: this.home.x + Math.cos(a) * 5, z: this.home.z + Math.sin(a) * 5 };
              }
              const tx = this.target.x - this.x;
              const tz = this.target.z - this.z;
              const td = Math.hypot(tx, tz);
              if (td > 0.7) {
                mvx = (tx / td) * 0.9;
                mvz = (tz / td) * 0.9;
                this.yaw += angDiff(this.yaw, Math.atan2(tx, tz)) * Math.min(1, dt * 3);
              }
            }
          } else if (this.state === 'chase') {
            if (!sees && dist > this.def.aggro * 1.6) this.state = 'idle';
            this.yaw += angDiff(this.yaw, toP) * Math.min(1, dt * 6);
            const away = dist < preferred - 2.5 ? -1 : dist > preferred + 2.5 ? 1 : 0;
            const orbit = Math.sin(this.t * 0.7 + this.phase);
            const sp = this.def.speed * (frenzy ? 1.25 : 1);
            mvx = (dx / dist) * sp * away * (away < 0 ? 1.25 : 1) + (dz / dist) * orbit * sp * 0.75;
            mvz = (dz / dist) * sp * away * (away < 0 ? 1.25 : 1) - (dx / dist) * orbit * sp * 0.75;
            if (this.cd <= 0 && sees) {
              if (dist < 3.6) this.atk = 'slash';
              else if (dist < 16) this.atk = Math.random() < (frenzy ? 0.45 : 0.3) ? 'gloom' : 'sickle';
              else this.atk = null;
              if (this.atk) {
                this.state = 'windup';
                this.t = 0;
                const wt = { slash: 0.38, sickle: 0.65, gloom: 0.95 }[this.atk] / (frenzy ? 1.25 : 1);
                if (this.atk === 'slash') this.warn('circle', 4.8, 0, wt, true);
                else if (this.atk === 'sickle') this.warn('line', frenzy ? 4.2 : 2.6, 13, wt);
                else this.warn('line', 1.3, 10, wt);
              }
            }
          } else if (this.state === 'windup') {
            this.yaw += angDiff(this.yaw, toP) * Math.min(1, dt * 9);
            mvx = -(dx / dist) * 0.6;
            mvz = -(dz / dist) * 0.6;
            const wind = { slash: 0.38, sickle: 0.65, gloom: 0.95 }[this.atk] / (frenzy ? 1.25 : 1);
            if (this.t > wind) {
              this.clearWarn();
              this.kick = 1;
              const a = Math.atan2(dx, dz);
              const mx = this.x + Math.sin(a) * 1.7;
              const mz = this.z + Math.cos(a) * 1.7;
              const my = this.y + this.hover + 1.25;
              const aim = (speed) => clamp(((P.pos.y + 1.0 - my) / Math.max(0.5, dist / speed)), -5, 5);
              if (this.atk === 'sickle') {
                const fan = frenzy ? [-0.4, -0.2, 0, 0.2, 0.4] : [-0.24, 0, 0.24];
                for (const spread of fan) g.spawnProjectile({ owner: 'enemy', kind: 'crescent', x: mx, y: my, z: mz, vx: Math.sin(a + spread) * 9.5, vz: Math.cos(a + spread) * 9.5, vy: aim(9.5), dmg: this.def.dmg, life: 2.2, r: 0.5 });
                g.fx.burst(mx, my, mz, [0xb25cff, 0xd8d3ee, 0xffffff], 10, 3.2, 0.1, 0.4);
                g.audio.tone(520, 0.16, 'sawtooth', 0.09, -300);
                this.cd = (1.7 + Math.random() * 0.5) * (frenzy ? 0.7 : 1);
              } else if (this.atk === 'gloom') {
                g.spawnProjectile({ owner: 'enemy', kind: 'gloom', x: mx, y: my, z: mz, vx: Math.sin(a) * 5.4, vz: Math.cos(a) * 5.4, vy: aim(5.4), dmg: this.def.dmg + 1, life: 4.2, r: 0.55, homing: 2.4 });
                g.fx.ring(mx, my, mz, 0xb25cff, 6, 1.6, 0.08, 0.4);
                g.audio.tone(210, 0.3, 'sine', 0.12, 120);
                this.cd = (2.4 + Math.random() * 0.7) * (frenzy ? 0.7 : 1);
              } else {
                if (dist < 4.8 && P.hurt(this.def.dmg + 1, this.x, this.z, 8)) g.fx.burst(P.pos.x, P.pos.y + 1, P.pos.z, [0xd8d3ee, 0xb25cff], 8, 3, 0.09, 0.35);
                g.fx.ring(this.x, this.y + this.hover - 0.2, this.z, 0xb25cff, 14, 4.2, 0.1, 0.4);
                g.vfx.slashArc(this.x, this.y + this.hover + 0.9, this.z, a, { radius: 3.4, thick: 1.5, sweep: 5.8, color: 0xb25cff, hot: 0xf0e0ff, life: 0.4, sweepT: 0.22, tail: 0.95, follow: () => ({ x: this.x, y: this.y + this.hover, z: this.z }) });
                g.vfx.glow(this.x, this.y + this.hover + 0.9, this.z, 0xb25cff, 4, 0.3, { grow: 0.6, gain: 0.7 });
                g.fx.dust(this.x, this.y, this.z, 6, 2.4, 0xb9a6e0);
                this.vx = -(dx / dist) * 9;
                this.vz = -(dz / dist) * 9;
                g.audio.tone(300, 0.14, 'square', 0.09, -160);
                this.cd = 0.9;
              }
              this.state = 'recover';
              this.t = 0;
            }
          } else if (this.state === 'recover') {
            mvx = -(dx / dist) * 0.8;
            mvz = -(dz / dist) * 0.8;
            if (this.t > 0.5) this.state = 'chase';
          }
          if (frenzy && Math.random() < dt * 5) g.fx.burst(this.x, this.y + this.hover + 0.9, this.z, [0xb25cff, 0x2b2450], 1, 0.8, 0.12, 0.7, -0.5, 0.5);
          break;
        }
        case 'orcscout': {
          const campD = Math.hypot(this.x - this.home.x, this.z - this.home.z);
          const leashed = campD > 18;
          if (this.state === 'idle' || this.state === 'wander') {
            if (sees && !leashed) this.state = 'chase';
            else {
              this.wanderT -= dt;
              if (this.wanderT <= 0) {
                this.wanderT = 2 + Math.random() * 2.4;
                const a = Math.random() * TAU;
                const rr = 2 + Math.random() * 7;
                this.target = { x: this.home.x + Math.cos(a) * rr, z: this.home.z + Math.sin(a) * rr };
              }
              const tx = this.target.x - this.x;
              const tz = this.target.z - this.z;
              const td = Math.hypot(tx, tz);
              if (td > 0.6) {
                mvx = (tx / td) * 1.05;
                mvz = (tz / td) * 1.05;
                this.yaw += angDiff(this.yaw, Math.atan2(tx, tz)) * Math.min(1, dt * 5);
              }
            }
          } else if (this.state === 'chase') {
            if ((!sees && dist > this.def.aggro * 1.4) || leashed) this.state = 'idle';
            this.yaw += angDiff(this.yaw, toP) * Math.min(1, dt * 7);
            if (dist > 1.65) {
              mvx = (dx / dist) * this.def.speed;
              mvz = (dz / dist) * this.def.speed;
            }
            if (dist < 2.35 && this.cd <= 0) {
              this.state = 'windup';
              this.t = 0;
              this.warn('line', 1.2, 2.6, 0.42);
              g.audio.tone(90, 0.18, 'sawtooth', 0.08, -40);
            }
          } else if (this.state === 'windup') {
            this.yaw += angDiff(this.yaw, toP) * Math.min(1, dt * 8);
            if (this.t > 0.42) {
              this.clearWarn();
              this.state = 'bite';
              this.t = 0;
              this.hitDone = false;
              this.kick = 1;
              g.audio.tone(70, 0.16, 'square', 0.1, -20);
            }
          } else if (this.state === 'bite') {
            if (!this.hitDone && this.t > 0.1 && this.t < 0.22 && dist < this.radius + 1.15) {
              this.hitDone = true;
              P.hurt(this.def.dmg, this.x, this.z, 5);
              g.fx.burst(this.x + Math.sin(this.yaw) * 0.8, this.y + 1.1, this.z + Math.cos(this.yaw) * 0.8, [0xd5d8de, 0x6a9a48, 0xffffff], 8, 2.4, 0.08, 0.35);
            }
            if (this.t > 0.48) {
              this.state = 'recover';
              this.t = 0;
            }
          } else if (this.state === 'recover') {
            if (this.t > 0.42) {
              this.state = 'chase';
              this.cd = 0.85 + Math.random() * 0.4;
            }
          }
          break;
        }
        default:
      }
    }

    this.hitCd = Math.max(0, (this.hitCd || 0) - dt);
    this.vx *= Math.max(0, 1 - dt * (this.air ? 0.4 : 7));
    this.vz *= Math.max(0, 1 - dt * (this.air ? 0.4 : 7));
    if (this.slowT > 0) {
      const slow = this.slowMul == null ? 0.6 : this.slowMul;
      mvx *= slow;
      mvz *= slow;
    }
    const accel = this.type === 'boar' ? (this.state === 'charge' ? 24 : 9) : this.type === 'budgedragon' ? 8 : this.type === 'darksycledragon' ? 5 : this.type === 'wraith' ? 4 : this.type === 'orcscout' ? 11 : 30;
    const ak = 1 - Math.exp(-accel * dt);
    this.smx = (this.smx || 0) + (mvx - (this.smx || 0)) * ak;
    this.smz = (this.smz || 0) + (mvz - (this.smz || 0)) * ak;
    const sx = this.smx + this.vx;
    const sz = this.smz + this.vz;
    this.moveSpd = Math.hypot(sx, sz);
    this.moveBy(sx * dt, sz * dt);

    const gh = this.game.world.heightAt(this.x, this.z);
    const floor = Math.max(gh, WATER_Y - 0.25);
    if (this.hover > 0) {
      this.y += (floor - this.y) * Math.min(1, dt * 8);
    } else {
      this.vy -= 22 * dt;
      this.y += this.vy * dt;
      if (this.y <= floor) {
        if (this.air && this.vy < -1) {
          this.air = false;
          g.fx.ring(this.x, this.y + 0.1, this.z, this.type === 'slime' ? 0xa4f58f : 0xc99aff, 7, 1.6, 0.08, 0.4);
          g.fx.dust(this.x, this.y, this.z, 3, 1.1, this.type === 'slime' ? 0xa4f58f : 0xc99aff);
          this.landT = 0.26;
          this.cd = Math.max(this.cd, 0.3);
        }
        this.y = floor;
        this.vy = 0;
      } else if (this.y > floor + 0.05) this.air = this.air || this.type === 'slime' || this.type === 'voidslime';
    }

    this.animate(dt, dist);
  }

  hopTo(dx, dz, power) {
    this.pend = { dx, dz, power };
    this.pendT = 0.17;
    this.yaw = Math.atan2(dx, dz);
  }

  launchHop() {
    const { dx, dz, power } = this.pend;
    this.pend = null;
    const d = Math.hypot(dx, dz) || 1;
    this.vx = (dx / d) * power * 1.5;
    this.vz = (dz / d) * power * 1.5;
    this.vy = 5.2;
    this.air = true;
    this.yaw = Math.atan2(dx, dz);
    this.game.fx.dust(this.x, this.y, this.z, 3, 1, this.type === 'slime' ? 0xa4f58f : 0xc99aff);
  }

  contact(P) {
    if (P.hurt(this.def.dmg, this.x, this.z, 6)) {
      this.hitCd = 0.8;
    } else this.hitCd = 0.4;
  }

  animate(dt, dist) {
    const o = this.obj;
    const m = this.model;
    const g = this.game;
    const t = this.t + this.phase;
    if (dt > 1e-4) {
      const kk = Math.min(1, dt * 8);
      this.avx += ((this.x - this.px) / dt - this.avx) * kk;
      this.avz += ((this.z - this.pz) / dt - this.avz) * kk;
      this.yawRate += (clamp(angDiff(this.prevYaw, this.yaw) / dt, -12, 12) - this.yawRate) * kk;
    }
    this.px = this.x;
    this.pz = this.z;
    this.prevYaw = this.yaw;
    const spd = Math.hypot(this.avx, this.avz);
    const lat = this.avx * Math.cos(this.yaw) - this.avz * Math.sin(this.yaw);
    const spawnS = easeOutBack(1 - clamp(this.spawnT / 0.6, 0, 1));
    const hk = this.hitT > 0 ? this.hitT / 0.34 : 0;
    const winding = this.state === 'windup';
    if (!winding && this.teleSlot) this.clearWarn();
    else if (winding) this.placeWarn();

    let hoverY = 0;
    if (this.type === 'wraith') hoverY = Math.sin(t * 2.2) * 0.12 + (winding ? 0.18 * Math.min(1, this.t / 0.6) : 0);
    else if (this.type === 'darksycledragon') hoverY = Math.sin(t * 2.4) * 0.08 + Math.sin(t * (winding ? 4 : 7.5) - 0.5) * 0.05;
    o.position.set(this.x, this.y + this.hover + hoverY, this.z);
    const bankT = this.type === 'darksycledragon' ? -lat * 0.05 - this.yawRate * 0.012 : this.type === 'wraith' ? -lat * 0.07 : -this.yawRate * 0.008;
    this.bank += (clamp(bankT, -0.32, 0.32) - (this.bank || 0)) * Math.min(1, dt * 7);
    if (Number.isNaN(this.bank)) this.bank = 0;
    if (this.vyaw == null) this.vyaw = this.yaw;
    this.vyaw += angDiff(this.vyaw, this.yaw) * (1 - Math.exp(-(this.type === 'boar' ? 13 : this.type === 'wraith' ? 8 : 10) * dt));
    const along = this.avx * Math.sin(this.yaw) + this.avz * Math.cos(this.yaw);
    if (dt > 1e-4) this.accAlong = (this.accAlong || 0) + (((along - (this.prevAlong || 0)) / dt) - (this.accAlong || 0)) * Math.min(1, dt * 6);
    this.prevAlong = along;
    const pl = g.player.pos;
    const lookYaw = this.dead ? 0 : clamp(angDiff(this.yaw, Math.atan2(pl.x - this.x, pl.z - this.z)), -0.75, 0.75) * (dist < 15 && this.state !== 'windup' && this.state !== 'charge' ? 0.7 : 0);
    this.lookSm = (this.lookSm || 0) + (lookYaw - (this.lookSm || 0)) * Math.min(1, dt * 5);
    o.rotation.set(0, this.vyaw, this.type === 'slime' || this.type === 'voidslime' ? 0 : this.bank);

    const heavy = this.type === 'budgedragon' || this.type === 'darksycledragon';
    let rootX = -hk * (heavy ? 0.1 : 0.3) + (this.type === 'slime' || this.type === 'voidslime' ? 0 : clamp(-(this.accAlong || 0) * (heavy ? 0.004 : 0.007), -0.12, 0.12));
    const rootZ = Math.sin(this.t * 70) * 0.05 * hk * (heavy ? 0.5 : 1);
    let rootY = 0;
    let rootSZ = 1;
    let rootSXY = 1;

    if (this.type === 'slime' || this.type === 'voidslime') {
      const idle = Math.sin(t * 3.5) * 0.06;
      let sx;
      let sy;
      if (this.pend) {
        const u = 1 - clamp(this.pendT / 0.17, 0, 1);
        sy = 1 - 0.38 * u;
        sx = 1 + 0.26 * u;
      } else if (this.air) {
        const st = clamp(this.vy / 6, -1, 1);
        sy = 1 + st * 0.3;
        sx = 1 - st * 0.17;
      } else if (this.landT > 0) {
        const u = 1 - this.landT / 0.26;
        const w = Math.exp(-u * 3.2) * Math.cos(u * 11);
        sy = 1 - 0.34 * w;
        sx = 1 + 0.22 * w;
      } else {
        sy = 1 + idle;
        sx = 1 - idle * 0.5;
      }
      if (hk > 0) {
        const w = hk * Math.cos((1 - hk) * 14);
        sy *= 1 - 0.34 * w;
        sx *= 1 + 0.24 * w;
      }
      o.scale.set(sx * this.baseScale * spawnS, sy * this.baseScale * spawnS, sx * this.baseScale * spawnS);
    } else if (this.type === 'boar') {
      const p = m.parts;
      const charging = this.state === 'charge';
      const rec = this.state === 'recover';
      const gait = charging ? 1 : rec ? 0 : Math.min(1, spd / 2.2);
      this.gaitC = (this.gaitC || 0) + dt * (charging ? 17 : 4.5 + spd * 2.4);
      const c = this.gaitC;
      const step = Math.floor(c / Math.PI);
      if (step !== this.stepIdx) {
        this.stepIdx = step;
        if (gait > 0.7) {
          g.fx.dust(this.x, this.y, this.z, charging ? 2 : 1, charging ? 1.3 : 0.7);
          if (charging && dist < 9) g.shake(0.045);
        }
      }
      const lk = Math.min(1, dt * 22);
      p.legs.forEach((l, i) => {
        let ph = i === 0 || i === 3 ? 0 : Math.PI;
        if (charging) ph = i < 2 ? 0 : 0.9;
        let ang = Math.sin(c + ph) * (charging ? 0.95 : 0.65) * gait;
        if (winding) {
          if (i === 0) ang = -0.45 - Math.max(0, Math.sin(this.t * 26)) * 0.95;
          else if (i === 2 || i === 3) ang = 0.12;
          else ang = -0.05;
        } else if (rec) ang = Math.sin(t * 3 + i) * 0.04;
        l.rotation.x += (ang - l.rotation.x) * lk;
      });
      if (winding && Math.sin(this.t * 26) > 0.9 && Math.random() < dt * 40) {
        g.fx.dust(this.x + Math.sin(this.yaw) * 0.8 - Math.cos(this.yaw) * 0.3, this.y, this.z + Math.cos(this.yaw) * 0.8 + Math.sin(this.yaw) * 0.3, 2, 1.4);
      }
      let headX = Math.sin(t * 2) * 0.03 + (this.state === 'wander' || this.state === 'idle' ? Math.max(0, Math.sin(t * 5)) * 0.05 : 0);
      if (winding) headX = 0.5 + Math.min(0.2, this.t * 0.4) + Math.sin(t * 40) * 0.04;
      else if (charging) headX = 0.42;
      else if (rec) headX = 0.32 + Math.sin(t * 7) * 0.04;
      p.head.rotation.x += (headX - p.head.rotation.x) * Math.min(1, dt * 14);
      p.head.rotation.y = this.lookSm * 0.8;
      p.body.rotation.z = winding ? Math.sin(t * 50) * 0.03 : Math.sin(c) * 0.025 * gait;
      p.body.scale.y = 1 + Math.sin(t * (rec ? 10 : 2.4)) * (rec ? 0.035 : 0.01);
      p.tail.rotation.z = Math.sin(t * (charging ? 16 : 8)) * 0.5;
      rootY = Math.abs(Math.sin(c)) * 0.065 * gait * (charging ? 1.4 : 1) - (winding ? 0.04 : 0);
      rootX += (charging ? 0.1 + Math.sin(c) * 0.04 : winding ? 0.09 : rec ? -0.02 : 0) * 1;
      rootSZ = 1 + 0.14 * this.kick;
      rootSXY = 1 - 0.06 * this.kick;
      o.scale.setScalar(spawnS * this.baseScale);
      if (winding) this.model.mat.emissive.setRGB(0.35 + Math.sin(t * 30) * 0.15, 0.03, 0.0);
    } else if (this.type === 'orcscout') {
      const p = m.parts;
      const gait = Math.min(1, spd / 2.3);
      this.gaitC = (this.gaitC || 0) + dt * (3.2 + spd * 2.1);
      const c = this.gaitC;
      const lk = Math.min(1, dt * 14);
      const stepL = Math.sin(c) * 0.72 * gait;
      const stepR = Math.sin(c + Math.PI) * 0.72 * gait;
      p.legL.rotation.x += (stepL - p.legL.rotation.x) * lk;
      p.legR.rotation.x += (stepR - p.legR.rotation.x) * lk;
      p.armL.rotation.x += (0.15 - stepL * 0.55 - p.armL.rotation.x) * lk;
      p.armL.rotation.z += (0.38 - p.armL.rotation.z) * lk;
      let chop = -0.28 + Math.sin(c) * 0.1 * gait;
      if (this.state === 'windup') chop = -0.28 + Math.min(1, this.t / 0.42) * 1.6;
      else if (this.state === 'bite') {
        const u = clamp(this.t / 0.2, 0, 1);
        chop = 1.33 + ( -0.95 - 1.33) * ease(u);
      } else if (this.state === 'recover') chop = -0.95 + Math.min(1, this.t / 0.42) * 0.67;
      p.armR.rotation.x += (chop - p.armR.rotation.x) * Math.min(1, dt * (this.state === 'bite' ? 22 : 10));
      p.armR.rotation.z += (-0.38 - p.armR.rotation.z) * lk;
      const lean = this.state === 'windup' ? -0.12 : this.state === 'bite' ? 0.16 : gait * 0.04;
      p.body.rotation.x += (lean - p.body.rotation.x) * lk;
      p.body.rotation.z = Math.sin(c) * 0.03 * gait;
      p.head.rotation.y += (this.lookSm * 0.7 - p.head.rotation.y) * Math.min(1, dt * 8);
      p.head.rotation.x += ((this.state === 'chase' ? 0.08 : 0) - p.head.rotation.x) * lk;
      p.cloth.rotation.x = Math.sin(c * 2) * 0.06 * gait + Math.sin(t * 2) * 0.03;
      rootY = Math.abs(Math.sin(c)) * 0.05 * gait;
      o.scale.setScalar(spawnS * this.baseScale);
    } else if (this.type === 'budgedragon') {
      const p = m.parts;
      const walk = this.puppet ? 0.6 : Math.min(1, spd / 2.4);
      this.gaitC = (this.gaitC || 0) + dt * (3 + spd * 1.7);
      const c = this.gaitC;
      const step = Math.floor(c / Math.PI);
      if (step !== this.stepIdx) {
        this.stepIdx = step;
        if (walk > 0.6) {
          g.fx.dust(this.x, this.y, this.z, 2, 0.9);
          if (dist < 8) g.shake(0.02);
        }
      }
      const lk = Math.min(1, dt * 20);
      p.legs.forEach((l, i) => {
        const tgt = Math.sin(c + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.7 * walk;
        l.rotation.x += (tgt - l.rotation.x) * lk;
      });
      const wk = winding ? Math.min(1, this.t / (this.atk === 'spit' ? 0.7 : 0.3)) : 0;
      p.bodyG.position.y = 6 * 0.054 + Math.abs(Math.sin(c)) * 0.04 * walk + Math.sin(t * 2.2) * 0.008 - wk * 0.045;
      p.bodyG.rotation.z = Math.sin(c) * 0.045 * walk + clamp(-this.yawRate * 0.012, -0.12, 0.12);
      p.bodyG.scale.y = 1 + Math.sin(t * 2.2) * 0.012 + (winding && this.atk === 'spit' ? wk * 0.05 : 0);
      p.tail.forEach((sg, i) => {
        const swing = this.state === 'chase' ? 5 : 2.4;
        sg.rotation.y = Math.sin(t * swing - i * 0.9) * (0.32 + i * 0.05) + clamp(this.yawRate * -0.04, -0.4, 0.4) * (i + 1) * 0.35;
        sg.rotation.x = i === 0 ? -0.12 : 0.05;
      });
      const flying = this.state === 'chase' || this.state === 'bite';
      p.wings.forEach((w, i) => {
        const sgn = i === 0 ? -1 : 1;
        const tgt = winding ? sgn * (1.05 + Math.sin(t * 14) * 0.1 * wk) : sgn * (flying ? 0.5 + Math.sin(t * 11) * 0.42 : 0.7 + Math.sin(t * 2.5) * 0.06);
        w.rotation.z += (tgt - w.rotation.z) * Math.min(1, dt * 18);
      });
      let headX = Math.sin(t * 1.7) * 0.04;
      let jawX = 0.05 + Math.max(0, Math.sin(t * 0.9 + this.phase)) * 0.06;
      let lean = 0;
      const headY = Math.sin(t * 0.8) * 0.1 * (this.state === 'idle' ? 1 : 0);
      if (winding) {
        headX = -0.42 * wk;
        jawX = 0.2 + 0.75 * wk;
        lean = -0.14 * wk;
        this.model.mat.emissive.setRGB(0.28 + Math.sin(t * 34) * 0.12, 0.07, 0);
        if (this.atk === 'spit') g.vfx.glowNow(this.x + Math.sin(this.yaw) * 1.4, this.y + 1.05, this.z + Math.cos(this.yaw) * 1.4, 0xff8a1e, 0.6 + wk * 1.6, 0.9);
        if (this.atk === 'spit' && Math.random() < dt * 36) {
          g.fx.emit(this.x + Math.sin(this.yaw) * 1.4, this.y + 1.05, this.z + Math.cos(this.yaw) * 1.4, (Math.random() - 0.5) * 0.8, 0.8 + Math.random(), (Math.random() - 0.5) * 0.8, [0xff9a2a, 0xffe27a][Math.random() < 0.5 ? 0 : 1], 0.09, 0.35, -1);
        }
      } else if (this.state === 'bite') {
        const k = Math.min(1, this.t / 0.1);
        headX = 0.3 * k;
        jawX = 0.8 * (1 - Math.min(1, this.t / 0.22)) + 0.04;
        lean = 0.14 * k;
      } else if (this.state === 'chase') {
        headX = 0.1 + Math.sin(c * 0.5) * 0.03 + Math.sin(c) * 0.04 * walk;
        jawX = 0.12 + Math.max(0, Math.sin(t * 3)) * 0.1;
      } else if (this.state === 'recover') {
        headX = 0.12;
        jawX = 0.04;
      }
      headX += this.kick * 0.35;
      lean += this.kick * 0.2;
      p.head.rotation.x += (headX - p.head.rotation.x) * Math.min(1, dt * 16);
      p.head.rotation.y += (headY + this.lookSm - p.head.rotation.y) * Math.min(1, dt * 6);
      p.jaw.rotation.x += (jawX - p.jaw.rotation.x) * Math.min(1, dt * 22);
      p.bodyG.rotation.x += (lean - p.bodyG.rotation.x) * Math.min(1, dt * 12);
      o.scale.setScalar(spawnS * this.baseScale);
    } else if (this.type === 'darksycledragon') {
      const p = m.parts;
      const moving = this.puppet ? 1 : Math.min(1, spd / 2);
      const flapRate = winding ? 4 : 7.5 + moving * 2.5;
      p.legs.forEach((l, i) => (l.rotation.x = (i < 2 ? -0.55 : 0.6) + Math.sin(t * 2 + i * 1.3) * 0.1 + (i < 2 ? -1 : 1) * moving * 0.15));
      p.tail.forEach((sg, i) => {
        const sway = Math.sin(t * (winding ? 6 : 2.6) - i * 0.8) * (0.2 + i * 0.07);
        let slash = 0;
        if (winding && this.atk === 'slash') slash = (this.t / 0.38) * 2.2 - 1.1;
        const follow = this.state === 'recover' && this.atk === 'slash' ? Math.max(0, 1 - this.t * 3) * 1.1 : 0;
        sg.rotation.y = sway + (i === 0 ? (slash + follow) * 0.7 : (slash + follow) * 0.45) + clamp(-lat * 0.06, -0.5, 0.5) * (i + 1) * 0.3;
        sg.rotation.x = i === 0 ? -0.1 : i === 3 ? -0.05 : 0.04;
      });
      const flap = winding ? 0.2 : 0.55 + moving * 0.12;
      p.wings.forEach((w, i) => {
        const sgn = i === 0 ? -1 : 1;
        w.rotation.z = sgn * ((winding ? 0.8 : 0.3) + Math.sin(t * flapRate) * flap);
        w.rotation.y = sgn * ((winding ? 0.25 : 0.05) - Math.cos(t * flapRate) * 0.12 * (winding ? 0 : 1));
      });
      let headX = 0.08 + Math.sin(t * 1.6) * 0.04;
      let jawX = 0.05;
      let lean = 0.06 * moving + Math.sin(t * flapRate) * 0.025 + clamp(spd * 0.01, 0, 0.06);
      if (winding) {
        const wind = { slash: 0.38, sickle: 0.65, gloom: 0.95 }[this.atk] || 0.6;
        const k = Math.min(1, this.t / wind);
        headX = this.atk === 'slash' ? 0.1 : -0.4 * k;
        jawX = 0.1 + 0.55 * k;
        lean = -0.24 * k;
        const pulse = 0.18 + k * 0.25 + Math.sin(t * 30) * 0.06;
        this.model.mat.emissive.setRGB(pulse * 0.8, 0.02, pulse);
        if (this.atk !== 'slash') g.vfx.glowNow(this.x + Math.sin(this.yaw) * 1.7, this.y + this.hover + 1.25, this.z + Math.cos(this.yaw) * 1.7, 0xb25cff, 0.6 + k * 2.2, 0.9);
        if (this.atk !== 'slash' && Math.random() < dt * 40 * k) {
          const a = Math.random() * TAU;
          const mx = this.x + Math.sin(this.yaw) * 1.7;
          const mz = this.z + Math.cos(this.yaw) * 1.7;
          const my = this.y + this.hover + 1.25;
          g.fx.emit(mx + Math.cos(a) * 0.7, my + Math.sin(a) * 0.7, mz, -Math.cos(a) * 1.8, -Math.sin(a) * 1.8, 0, [0xb25cff, 0xd8d3ee][Math.random() < 0.5 ? 0 : 1], 0.08, 0.38, 0);
        }
      } else if (this.state === 'recover') {
        headX = 0.2;
        jawX = 0.3 * Math.max(0, 1 - this.t * 3);
      }
      headX += this.kick * 0.3;
      lean += this.kick * 0.28;
      p.head.rotation.x += (headX - p.head.rotation.x) * Math.min(1, dt * 14);
      p.head.rotation.y += (this.lookSm * 0.9 - p.head.rotation.y) * Math.min(1, dt * 6);
      p.jaw.rotation.x += (jawX - p.jaw.rotation.x) * Math.min(1, dt * 18);
      p.bodyG.rotation.x += (lean - p.bodyG.rotation.x) * Math.min(1, dt * 8);
      p.bodyG.rotation.z = Math.sin(t * 1.3) * 0.04;
      o.scale.setScalar(spawnS * this.baseScale);
    } else if (this.type === 'wraith') {
      const b = m.body;
      const speedLean = clamp(spd * 0.07, 0, 0.22);
      const wk = winding ? Math.min(1, this.t / 0.7) : 0;
      b.rotation.z = Math.sin(t * 1.7) * 0.06 + this.bank * 0.5;
      b.rotation.x += ((winding ? -0.3 * wk : speedLean + 0.05 * Math.sin(t * 2)) - b.rotation.x) * Math.min(1, dt * 9) + this.kick * 0.02;
      b.scale.set(1 - wk * 0.08 + this.kick * 0.12, 1 + wk * 0.12 - this.kick * 0.1, 1 - wk * 0.08 + this.kick * 0.12);
      o.scale.setScalar(spawnS * this.baseScale);
      if (winding) {
        this.model.mat.emissive.setRGB(0.25 + Math.sin(t * 36) * 0.15, 0.0, 0.35);
        g.vfx.glowNow(this.x + Math.sin(this.yaw) * 0.6, this.y + this.hover + 1.5, this.z + Math.cos(this.yaw) * 0.6, 0xc27bff, 0.5 + wk * 1.5, 0.9);
        if (Math.random() < dt * 30 * wk) {
          const a = Math.random() * TAU;
          g.fx.emit(this.x + Math.sin(this.yaw) * 0.6 + Math.cos(a) * 0.6, this.y + this.hover + 1.5 + Math.sin(a) * 0.6, this.z + Math.cos(this.yaw) * 0.6, -Math.cos(a) * 1.6, -Math.sin(a) * 1.6, 0, 0xc27bff, 0.08, 0.35, 0);
        }
      }
    }
    m.root.rotation.x = rootX;
    m.root.rotation.z = rootZ;
    m.root.position.y = rootY;
    m.root.scale.set(rootSXY, rootSXY, rootSZ);
    if (this.flash > 0) this.model.mat.emissive.setRGB(0.8, 0.8, 0.8);
    else if (!(this.type !== 'slime' && this.type !== 'voidslime' && this.state === 'windup')) this.model.mat.emissive.setRGB(0, 0, 0);

    if (dist < 14 && this.hp < this.maxHp) {
      const [sx2, sy2, vis] = g.screenOf(this.x, this.y + this.hover + (this.type === 'boar' ? 1.5 : this.type === 'wraith' ? 2.5 : this.type === 'budgedragon' ? 2.1 : this.type === 'darksycledragon' ? 2.3 : this.type === 'orcscout' ? 2.2 : 1.25), this.z, true);
      g.hud.plate(this.id, `${this.name}<span class="hpbar"><i style="width:${(this.hp / this.maxHp) * 100}%"></i></span>`, 'mon');
      g.hud.placePlate(this.id, sx2, sy2, vis);
    } else g.hud.removePlate(this.id);
  }


  deadAnim(dt) {
    const g = this.game;
    const o = this.obj;
    const m = this.model;
    const fx = g.fx;
    this.deadT += dt;
    const u = this.deadT;
    const dur = DEATH_DUR[this.type] || 0.6;
    const bs = this.baseScale;
    const w = g.world;
    const floor = Math.max(w.heightAt(this.x, this.z), WATER_Y - 0.25);
    const fl = this.deadFlags;
    const side = this.deadSide;
    const f = clamp(u / 0.1, 0, 1);
    this.vx *= Math.max(0, 1 - dt * 5);
    this.vz *= Math.max(0, 1 - dt * 5);
    this.moveBy(this.vx * dt, this.vz * dt);
    this.vy -= 22 * dt;
    this.y += this.vy * dt;
    if (this.y < floor) {
      this.y = floor;
      this.vy = 0;
    }
    const white = u < 0.1 ? 0.8 * (1 - f) + 0.2 : 0;
    m.mat.emissive.setRGB(white, white, white);
    const dissolve = (start, len, cols, n = 2) => {
      const k = clamp((u - start) / len, 0, 1);
      if (k > 0 && k < 1 && Math.random() < dt * 70) {
        for (let i = 0; i < n; i++) {
          const a = Math.random() * TAU;
          const r = Math.random() * 0.9 * bs;
          fx.emit(this.x + Math.cos(a) * r, this.y + this.hover + 0.2 + Math.random() * 1.0, this.z + Math.sin(a) * r, (Math.random() - 0.5) * 0.6, 1.2 + Math.random() * 1.6, (Math.random() - 0.5) * 0.6, cols[Math.floor(Math.random() * cols.length)], 0.1 + Math.random() * 0.08, 0.7, -0.4);
        }
      }
      return k;
    };

    if (this.type === 'slime' || this.type === 'voidslime') {
      let sx;
      let sy;
      if (u < 0.12) {
        const k = u / 0.12;
        sy = 1 + 0.4 * k;
        sx = 1 - 0.2 * k;
      } else {
        const k = clamp((u - 0.12) / 0.3, 0, 1);
        sy = 1.4 * (1 - k) + 0.1 * k;
        sx = 0.8 + 0.9 * k;
        const fade = clamp((u - 0.38) / 0.22, 0, 1);
        sy *= 1 - fade;
        sx *= 1 - fade * 0.7;
      }
      if (!fl.pop && u > 0.36) {
        fl.pop = true;
        const col = this.type === 'slime' ? [0x57d46c, 0xa4f58f, 0xffffff] : [0xc27bff, 0x8c52da, 0xffffff];
        fx.ring(this.x, this.y + 0.15, this.z, col[1], 14, 3.2, 0.1, 0.45);
        fx.burst(this.x, this.y + 0.3, this.z, col, 16, 4.2, 0.12, 0.7, 10, 2);
      }
      o.scale.set(sx * bs, Math.max(0.001, sy) * bs, sx * bs);
      o.position.set(this.x, this.y, this.z);
      o.rotation.set(0, this.yaw, 0);
    } else if (this.type === 'boar') {
      const p = m.parts;
      const k = ease(clamp(u / 0.3, 0, 1));
      const bn = u > 0.3 ? Math.exp(-(u - 0.3) * 8) * Math.sin((u - 0.3) * 28) * 0.08 : 0;
      o.position.set(this.x, this.y, this.z);
      o.rotation.set(0, this.yaw, side * (k * 1.5 + bn));
      m.root.position.y = 0.34 * k;
      m.root.rotation.x = 0;
      p.legs.forEach((l, i) => (l.rotation.x = Math.sin(u * 30 + i * 1.7) * 0.8 * Math.max(0, 1 - u / 0.75)));
      p.head.rotation.x = 0.3 * k;
      if (!fl.land && u > 0.28) {
        fl.land = true;
        fx.shockwave(this.x, this.y, this.z, 0xd9c9a0, 1.2);
        g.shake(0.14);
      }
      const k2 = dissolve(0.85, 0.45, [0xc9967a, 0xffffff, 0x9bd06a]);
      o.scale.setScalar(bs * (1 - k2 * k2));
    } else if (this.type === 'orcscout') {
      const p = m.parts;
      const k = ease(clamp(u / 0.28, 0, 1));
      o.position.set(this.x, this.y, this.z);
      o.rotation.set(0, this.yaw, side * (k * 1.45));
      m.root.position.y = 0.15 * k;
      p.legL.rotation.x = 0.4 * k;
      p.legR.rotation.x = -0.2 * k;
      p.armR.rotation.x = -0.4 + k * 0.6;
      p.armL.rotation.z = 0.9 * k;
      p.head.rotation.x = 0.4 * k;
      const k2 = dissolve(0.7, 0.5, [0x6a9a48, 0x5a4030, 0xe6dcc4]);
      o.scale.setScalar(bs * (1 - k2 * k2));
    } else if (this.type === 'budgedragon') {
      const p = m.parts;
      const kr = ease(clamp(u / 0.3, 0, 1));
      const kt = ease(clamp((u - 0.3) / 0.45, 0, 1));
      const bn = u > 0.75 ? Math.exp(-(u - 0.75) * 6) * Math.sin((u - 0.75) * 22) * 0.07 : 0;
      o.position.set(this.x, this.y, this.z);
      o.rotation.set(0, this.yaw, side * (kt * 1.52 + bn));
      m.root.rotation.x = -0.4 * kr * (1 - kt);
      m.root.position.y = 0.62 * kt;
      p.head.rotation.x = -0.65 * kr * (1 - kt) + 0.25 * kt;
      p.jaw.rotation.x = 0.9 * (1 - kt) + 0.25 * kt;
      p.wings.forEach((wg, i) => (wg.rotation.z = (i === 0 ? -1 : 1) * (1.15 * (1 - kt) + 1.5 * kt + Math.sin(u * 14) * 0.08 * (1 - kt))));
      p.legs.forEach((l, i) => (l.rotation.x = Math.sin(u * 22 + i) * 0.6 * Math.max(0, 1 - u / 0.9)));
      p.tail.forEach((sg, i) => (sg.rotation.y = Math.sin(u * 5 - i * 0.9) * 0.4 * Math.max(0.15, 1 - u / 1.3)));
      if (!fl.land && u > 0.74) {
        fl.land = true;
        fx.shockwave(this.x, this.y, this.z, 0xc8d8a0, 2);
        g.shake(0.4);
        g.punch(0.3);
      }
      const k2 = dissolve(1.15, 0.6, [0x6fd45a, 0xf1e6c6, 0xffffff], 3);
      o.scale.setScalar(bs * (1 - k2 * k2));
    } else if (this.type === 'darksycledragon') {
      const p = m.parts;
      if (this.hover > 0) {
        this.hvy -= 24 * dt;
        this.hover = Math.max(0, this.hover + this.hvy * dt);
      }
      const air = this.hover > 0;
      if (!air && !fl.land) {
        fl.land = true;
        fl.landT = u;
        fx.shockwave(this.x, this.y, this.z, 0xb9a6e0, 2.4);
        fx.ring(this.x, this.y + 0.3, this.z, 0xb25cff, 16, 5, 0.12, 0.5);
        g.shake(0.5);
        g.punch(0.4);
      }
      const kt = fl.land ? ease(clamp((u - fl.landT) / 0.5, 0, 1)) : 0;
      const dive = air ? Math.min(0.6, u * 1.6) : 0.6 * (1 - kt);
      o.position.set(this.x, this.y + this.hover, this.z);
      o.rotation.set(0, this.yaw, side * kt * 1.5);
      m.root.rotation.x = dive;
      m.root.position.y = 0.6 * kt;
      p.head.rotation.x = -0.4 * (1 - kt) + 0.2 * kt;
      p.jaw.rotation.x = 0.7 * (1 - kt) + 0.2 * kt;
      p.wings.forEach((wg, i) => {
        const sg = i === 0 ? -1 : 1;
        wg.rotation.z = sg * (0.9 + Math.sin(u * 22) * 0.6 * (air ? 1 : 0) + kt * 0.7);
      });
      p.tail.forEach((sg, i) => (sg.rotation.y = Math.sin(u * 9 - i) * 0.5 * Math.max(0.1, 1 - u / 1.4)));
      const flick = Math.max(0, 1 - u / 1.2) * (0.5 + 0.5 * Math.sin(u * 40));
      if (u > 0.1) m.mat.emissive.setRGB(flick * 0.5, 0.02, flick * 0.8);
      const k2 = dissolve(1.3, 0.75, [0xb25cff, 0xd8d3ee, 0x2b2450], 3);
      o.scale.setScalar(bs * (1 - k2 * k2));
    } else {
      const k = clamp(u / dur, 0, 1);
      this.yaw += dt * (10 + 22 * k);
      this.hover += dt * (1.2 + 2 * k);
      const sq = 1 - k * k * 0.95;
      o.position.set(this.x, this.y + this.hover, this.z);
      o.rotation.set(0, this.yaw, 0);
      o.scale.set(bs * sq, bs * (1 + 0.8 * k) * (1 - k * k * 0.9), bs * sq);
      const fl2 = 0.4 + 0.4 * Math.sin(u * 50);
      m.mat.emissive.setRGB(fl2 * 0.5, 0, fl2);
      if (Math.random() < dt * 80) {
        const a = u * 18 + Math.random();
        fx.emit(this.x + Math.cos(a) * 0.5 * (1 - k), this.y + this.hover + 0.2 + k * 1.5, this.z + Math.sin(a) * 0.5 * (1 - k), Math.cos(a) * 0.8, 1.4, Math.sin(a) * 0.8, [0xc27bff, 0xffffff, 0x8c52da][Math.floor(Math.random() * 3)], 0.1, 0.5, -0.5);
      }
    }
    if (u >= dur) this.remove = true;
  }

  dispose() {
    this.game.scene.remove(this.obj);
    this.game.hud.removePlate(this.id);
    this.obj.traverse((o) => {
      if (o.isMesh && o.geometry) o.geometry.dispose();
    });
  }
}

export class Spawner {
  constructor(game) {
    this.game = game;
    this.timer = 1;
    this.rng = new RNG(4242);
    this.max = 9;
  }

  populate() {
    const w = this.game.world;
    const spots = [
      ['slime', 60, 40], ['slime', 84, 44], ['voidslime', 68, 28], ['wraith', 78, 29],
      ['boar', 52, 44], ['boar', 94, 48], ['slime', 118, 60], ['slime', 44, 70], ['slime', 76, 102],
      ['budgedragon', 120, 74],
    ];
    for (const [t, x, z] of spots) this.spawn(t, x, z, false);
    const camp = w.orcCamp;
    if (camp) {
      const pack = [[-2.2, 0.6], [1.8, -1.1], [0.3, 2.5], [8.2, 4.8], [-6.4, 6.6], [2.4, -9.2]];
      for (const [ox, oz] of pack) this.spawn('orcscout', camp.x + ox, camp.z + oz, false);
    }
    if (w.cave) {
      const den = this.spawn('darksycledragon', w.cave.nest.x, w.cave.nest.z, false);
      den.realm = 'cave';
    }
  }

  spawn(type, x, z, fx = true) {
    const g = this.game;
    const m = new Monster(g, type, x, z);
    g.monsters.push(m);
    if (fx) {
      g.fx.burst(x, m.y + 0.5, z, [0xc27bff, 0x6af4ff, 0xffffff], 14, 3, 0.1, 0.6);
      g.fx.ring(x, m.y + 0.1, z, 0xc27bff, 16, 4, 0.1, 0.5);
    }
    return m;
  }

  pickSpot() {
    const g = this.game;
    const w = g.world;
    const P = g.player.pos;
    for (let i = 0; i < 24; i++) {
      const r = this.rng;
      const roll = r.next();
      let x;
      let z;
      if (roll < 0.45) {
        const a = r.range(0, TAU);
        const rr = r.range(2.5, 8);
        x = GATE.x + Math.cos(a) * rr;
        z = GATE.z + Math.sin(a) * rr + 3;
      } else {
        const a = r.range(0, TAU);
        const rr = r.range(15, 38);
        x = CENTER.x + Math.cos(a) * rr;
        z = CENTER.z + Math.sin(a) * rr;
      }
      if (!w.playable(x, z)) continue;
      const zn = w.zoneAt(x, z);
      if (zn === ZONE.TOWN || zn === ZONE.WATER || zn === ZONE.LAKE || zn === ZONE.MINE) continue;
      if (Math.hypot(x - MINE.x, z - MINE.z) < 17 || Math.hypot(x - LAKE.x, z - LAKE.z) < 16) continue;
      if (w.heightAt(x, z) < 0.9 || w.heightAt(x, z) > 7) continue;
      if (Math.hypot(x - P.x, z - P.z) < 14) continue;
      return { x, z, nearGate: roll < 0.45 };
    }
    return null;
  }

  update(dt) {
    if (this.game.net?.role === 'guest') return;
    if (this.game.world?.realm === 'cave') return;
    const g = this.game;
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 3.5;
    this.fillOrcs();
    const alive = g.monsters.filter((m) => !m.dead && m.type !== 'orcscout').length;
    if (alive >= this.max) return;
    const spot = this.pickSpot();
    if (!spot) return;
    const r = this.rng.next();
    let type;
    if (spot.nearGate) type = r < 0.35 ? 'voidslime' : r < 0.7 ? 'wraith' : 'slime';
    else type = r < 0.45 ? 'slime' : r < 0.85 ? 'boar' : 'voidslime';
    if (g.sky.night > 0.6 && r > 0.6) type = 'wraith';
    const drakes = g.monsters.filter((m) => !m.dead && m.type === 'budgedragon').length;
    if (!spot.nearGate && drakes < 2 && this.rng.next() < 0.3) type = 'budgedragon';
    this.spawn(type, spot.x, spot.z);
    if (spot.nearGate) g.audio.portal();
  }

  fillOrcs() {
    const camp = this.game.world.orcCamp;
    if (!camp) return;
    const g = this.game;
    const n = g.monsters.filter((m) => !m.dead && m.type === 'orcscout').length;
    if (n >= 6) return;
    const w = g.world;
    const P = g.player.pos;
    const a = this.rng.range(0, TAU);
    const rr = this.rng.range(2, 12);
    const x = camp.x + Math.cos(a) * rr;
    const z = camp.z + Math.sin(a) * rr;
    if (!w.playable(x, z) || w.heightAt(x, z) > 6) return;
    if (Math.hypot(x - P.x, z - P.z) < 12) return;
    this.spawn('orcscout', x, z);
  }
}

export { lerp, TOWN };
