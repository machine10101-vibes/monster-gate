import * as THREE from 'three';
import { buildSlime, buildBoar, buildWraith, buildBudgeDragon, buildDarksycleDragon } from './creatures.js';
import { clamp, lerp, RNG } from '../engine/voxel.js';
import { ZONE, GATE, TOWN, WATER_Y, CENTER } from '../world/terrain.js';

const TAU = Math.PI * 2;
function angDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

const DEFS = {
  slime: { name: 'Gate Slime', hp: 18, radius: 0.5, speed: 2.6, dmg: 2, gold: [2, 5], aggro: 9, build: () => buildSlime('green') },
  voidslime: { name: 'Void Slime', hp: 26, radius: 0.55, speed: 3.0, dmg: 3, gold: [4, 8], aggro: 11, build: () => buildSlime('purple') },
  boar: { name: 'Thorn Boar', hp: 38, radius: 0.7, speed: 2.5, dmg: 3, gold: [5, 10], aggro: 10, build: buildBoar },
  wraith: { name: 'Gate Wraith', hp: 24, radius: 0.5, speed: 2.2, dmg: 2, gold: [6, 12], aggro: 13, build: buildWraith },
  budgedragon: { name: 'Green Budge Dragon', hp: 64, radius: 0.85, speed: 3.1, dmg: 4, gold: [12, 22], aggro: 12, build: buildBudgeDragon },
  darksycledragon: { name: 'Darksycle Dragon', hp: 110, radius: 0.95, speed: 2.7, dmg: 4, gold: [30, 48], aggro: 17, build: buildDarksycleDragon },
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
    this.flash = 0;
    this.dead = false;
    this.deadT = 0;
    this.wanderT = 0;
    this.target = { x, z };
    this.phase = Math.random() * 10;
    this.spawnT = 0.6;
    this.id = 'm' + Math.random().toString(36).slice(2, 8);
    this.hover = type === 'wraith' ? 1.15 : type === 'darksycledragon' ? 1.0 : 0;

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
  }

  takeHit(dmg, dx, dz, knock, crit = false) {
    if (this.dead) return;
    const g = this.game;
    this.hp -= dmg;
    this.flash = 0.18;
    const drake = this.type === 'budgedragon';
    const dusk = this.type === 'darksycledragon';
    const heavy = drake || dusk;
    this.stun = this.type === 'boar' && this.state === 'charge' ? 0.05 : heavy ? (this.state === 'windup' || this.state === 'bite' ? 0 : 0.12) : 0.28;
    if (this.state === 'windup' && !heavy) this.state = 'chase';
    if (dusk && this.state === 'windup' && dmg >= 14) {
      this.state = 'recover';
      this.t = 0;
      this.cd = 1.3;
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
    g.fx.burst(hx, hy, hz, this.type === 'slime' ? [0x57d46c, 0xa4f58f, 0xffffff] : this.type === 'voidslime' || this.type === 'wraith' ? [0xc27bff, 0x8c52da, 0xffffff] : dusk ? [0xb25cff, 0x4b3f8c, 0xffffff] : [0xc9967a, 0xff5a46, 0xffffff], crit ? 16 : 9, 3.8, 0.1, 0.5);
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
  }

  groundOk(x, z) {
    const w = this.game.world;
    if (!w.playable(x, z)) return false;
    const h = w.heightAt(x, z);
    if (h - this.y > 1.01 || h < WATER_Y - 0.1 || h > 9) return false;
    const zn = w.zoneAt(x, z);
    if (zn === ZONE.TOWN) return false;
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
    if (this.dead) {
      this.deadT += dt;
      const s = Math.max(0, 1 - this.deadT * 3.2) * this.baseScale;
      this.obj.scale.set(s * (1 + this.deadT * 0.6), s * 0.5, s * (1 + this.deadT * 0.6));
      if (this.deadT > 0.4) this.remove = true;
      return;
    }
    if (this.puppet) {
      this.t += dt;
      this.flash = Math.max(0, this.flash - dt);
      this.animate(dt, 99);
      return;
    }
    const P = this.hunter();
    this.t += dt;
    this.cd -= dt;
    this.stun = Math.max(0, this.stun - dt);
    this.flash = Math.max(0, this.flash - dt);
    this.spawnT = Math.max(0, this.spawnT - dt);

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
            if (dist < 6.5 && dist > 2.6 && this.cd <= 0) {
              this.state = 'windup';
              this.t = 0;
              this.chargeDir.set(dx / dist, 0, dz / dist);
            } else if (dist < 1.7 && this.cd <= 0) {
              this.state = 'windup';
              this.t = 0;
              this.chargeDir.set(dx / dist, 0, dz / dist);
            }
          } else if (this.state === 'windup') {
            this.yaw += angDiff(this.yaw, toP) * Math.min(1, dt * 8);
            this.chargeDir.set(dx / (dist || 1), 0, dz / (dist || 1));
            if (this.t > 0.65) {
              this.state = 'charge';
              this.t = 0;
              this.hitDone = false;
              g.audio.tone(140, 0.25, 'sawtooth', 0.12, 60);
            }
          } else if (this.state === 'charge') {
            mvx = this.chargeDir.x * 9.5;
            mvz = this.chargeDir.z * 9.5;
            this.yaw = Math.atan2(this.chargeDir.x, this.chargeDir.z);
            if (Math.random() < dt * 30) g.fx.burst(this.x, this.y + 0.1, this.z, [0xd9c9a0, 0x9bd06a], 1, 1.5, 0.1, 0.4, 3, 0.4);
            if (!this.hitDone && dist < this.radius + 0.5) {
              this.hitDone = true;
              if (P.hurt(this.def.dmg, this.x, this.z, 8)) {
                this.state = 'recover';
                this.t = 0;
              }
            }
            if (this.t > 0.7) {
              this.state = 'recover';
              this.t = 0;
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
            }
          } else if (this.state === 'windup') {
            this.yaw += angDiff(this.yaw, toP) * Math.min(1, dt * 10);
            if (this.t > 0.7) {
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
            } else if (this.cd <= 0 && spit) {
              this.state = 'windup';
              this.atk = 'spit';
              this.t = 0;
            }
          } else if (this.state === 'windup') {
            this.yaw += angDiff(this.yaw, toP) * Math.min(1, dt * 9);
            const wind = this.atk === 'spit' ? 0.75 : 0.34;
            if (this.t > wind / rage) {
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
              }
            }
          } else if (this.state === 'windup') {
            this.yaw += angDiff(this.yaw, toP) * Math.min(1, dt * 9);
            mvx = -(dx / dist) * 0.6;
            mvz = -(dz / dist) * 0.6;
            const wind = { slash: 0.38, sickle: 0.65, gloom: 0.95 }[this.atk] / (frenzy ? 1.25 : 1);
            if (this.t > wind) {
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
                g.fx.ring(this.x, this.y + this.hover - 0.2, this.z, 0xb25cff, 9, 2.4, 0.1, 0.35);
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
        default:
      }
    }

    this.hitCd = Math.max(0, (this.hitCd || 0) - dt);
    this.vx *= Math.max(0, 1 - dt * (this.air ? 0.4 : 7));
    this.vz *= Math.max(0, 1 - dt * (this.air ? 0.4 : 7));
    const sx = mvx + this.vx;
    const sz = mvz + this.vz;
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
          this.cd = Math.max(this.cd, 0.3);
        }
        this.y = floor;
        this.vy = 0;
      } else if (this.y > floor + 0.05) this.air = this.air || this.type === 'slime' || this.type === 'voidslime';
    }

    this.animate(dt, dist);
  }

  hopTo(dx, dz, power) {
    const d = Math.hypot(dx, dz) || 1;
    this.vx = (dx / d) * power * 1.5;
    this.vz = (dz / d) * power * 1.5;
    this.vy = 5.2;
    this.air = true;
    this.yaw = Math.atan2(dx, dz);
  }

  contact(P) {
    if (P.hurt(this.def.dmg, this.x, this.z, 6)) {
      this.hitCd = 0.8;
    } else this.hitCd = 0.4;
  }

  animate(dt, dist) {
    const o = this.obj;
    const m = this.model;
    const t = this.t + this.phase;
    o.position.set(this.x, this.y + this.hover + (this.type === 'wraith' ? Math.sin(t * 2.2) * 0.12 : this.type === 'darksycledragon' ? Math.sin(t * 2.4) * 0.1 : 0), this.z);
    o.rotation.y = this.yaw;
    const spawnS = 1 - Math.pow(this.spawnT / 0.6, 2);
    let sx = 1;
    let sy = 1;
    if (this.type === 'slime' || this.type === 'voidslime') {
      const idle = Math.sin(t * 3.5) * 0.06;
      if (this.air) {
        const st = clamp(this.vy / 6, -1, 1);
        sy = 1 + st * 0.22;
        sx = 1 - st * 0.12;
      } else {
        const prep = this.cd < 0.25 && this.state === 'chase' ? (0.25 - this.cd) * 1.2 : 0;
        sy = 1 + idle - prep;
        sx = 1 - idle * 0.5 + prep * 0.5;
      }
      o.scale.set(sx * this.baseScale * spawnS, sy * this.baseScale * spawnS, sx * this.baseScale * spawnS);
    } else if (this.type === 'boar') {
      const p = m.parts;
      const spd = Math.hypot(this.vx, this.vz) + (this.state === 'chase' ? 2.5 : this.state === 'charge' ? 9 : 0);
      const c = t * (4 + spd * 1.4);
      p.legs.forEach((l, i) => (l.rotation.x = Math.sin(c + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI * 0.5 : 0)) * 0.7 * Math.min(1, spd / 2.5)));
      p.head.rotation.x = this.state === 'windup' ? 0.45 + Math.sin(t * 40) * 0.05 : this.state === 'charge' ? 0.2 : Math.sin(t * 2) * 0.03;
      p.body.rotation.z = this.state === 'windup' ? Math.sin(t * 50) * 0.03 : 0;
      p.tail.rotation.z = Math.sin(t * 8) * 0.5;
      o.scale.setScalar(spawnS * this.baseScale);
      if (this.state === 'windup') this.model.mat.emissive.setRGB(0.35 + Math.sin(t * 30) * 0.15, 0.03, 0.0);
    } else if (this.type === 'budgedragon') {
      const p = m.parts;
      const spd = this.puppet ? 1.5 : this.moveSpd || 0;
      const c = t * (3 + spd * 1.5);
      const walk = Math.min(1, spd / 2.4);
      p.legs.forEach((l, i) => (l.rotation.x = Math.sin(c + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.6 * walk));
      p.bodyG.position.y = 6 * 0.054 + Math.abs(Math.sin(c)) * 0.03 * walk + Math.sin(t * 2.2) * 0.008;
      p.bodyG.rotation.z = Math.sin(c) * 0.035 * walk;
      p.tail.forEach((s, i) => {
        s.rotation.y = Math.sin(t * (this.state === 'chase' ? 5 : 2.4) - i * 0.9) * (0.32 + i * 0.05);
        s.rotation.x = i === 0 ? -0.12 : 0.05;
      });
      const flying = this.state === 'chase' || this.state === 'bite';
      p.wings.forEach((w, i) => {
        const s = i === 0 ? -1 : 1;
        w.rotation.z = s * (flying ? 0.5 + Math.sin(t * 11) * 0.42 : 0.7 + Math.sin(t * 2.5) * 0.06);
      });
      let headX = Math.sin(t * 1.7) * 0.04;
      let jawX = 0.05 + Math.max(0, Math.sin(t * 0.9 + this.phase)) * 0.06;
      let lean = 0;
      let headY = Math.sin(t * 0.8) * 0.1 * (this.state === 'idle' ? 1 : 0);
      if (this.state === 'windup') {
        const k = Math.min(1, this.t / (this.atk === 'spit' ? 0.7 : 0.3));
        headX = -0.42 * k;
        jawX = 0.2 + 0.75 * k;
        lean = -0.12 * k;
        this.model.mat.emissive.setRGB(0.28 + Math.sin(t * 34) * 0.12, 0.07, 0);
      } else if (this.state === 'bite') {
        const k = Math.min(1, this.t / 0.1);
        headX = 0.3 * k;
        jawX = 0.8 * (1 - Math.min(1, this.t / 0.22)) + 0.04;
        lean = 0.1 * k;
      } else if (this.state === 'chase') {
        headX = 0.1 + Math.sin(t * c * 0.5) * 0.03;
        jawX = 0.12 + Math.max(0, Math.sin(t * 3)) * 0.1;
      }
      p.head.rotation.x += (headX - p.head.rotation.x) * Math.min(1, dt * 16);
      p.head.rotation.y += (headY - p.head.rotation.y) * Math.min(1, dt * 6);
      p.jaw.rotation.x += (jawX - p.jaw.rotation.x) * Math.min(1, dt * 22);
      p.bodyG.rotation.x += (lean - p.bodyG.rotation.x) * Math.min(1, dt * 12);
      o.scale.setScalar(spawnS * this.baseScale);
    } else if (this.type === 'darksycledragon') {
      const p = m.parts;
      const moving = this.puppet ? 1 : Math.min(1, (this.moveSpd || 0) / 2);
      const windup = this.state === 'windup';
      p.legs.forEach((l, i) => (l.rotation.x = (i < 2 ? -0.55 : 0.6) + Math.sin(t * 2 + i * 1.3) * 0.1 + (i < 2 ? -1 : 1) * moving * 0.15));
      p.tail.forEach((sg, i) => {
        const sway = Math.sin(t * (windup ? 6 : 2.6) - i * 0.8) * (0.2 + i * 0.07);
        let slash = 0;
        if (windup && this.atk === 'slash') slash = (this.t / 0.38) * 2.2 - 1.1;
        sg.rotation.y = sway + (i === 0 ? slash * 0.7 : slash * 0.45);
        sg.rotation.x = i === 0 ? -0.1 : i === 3 ? -0.05 : 0.04;
      });
      const flap = windup ? 0.2 : 0.55;
      p.wings.forEach((w, i) => {
        const s = i === 0 ? -1 : 1;
        w.rotation.z = s * ((windup ? 0.8 : 0.3) + Math.sin(t * (windup ? 4 : 7.5)) * flap);
        w.rotation.y = s * (windup ? 0.25 : 0.05);
      });
      let headX = 0.08 + Math.sin(t * 1.6) * 0.04;
      let jawX = 0.05;
      let lean = 0.06 * moving;
      if (windup) {
        const wind = { slash: 0.38, sickle: 0.65, gloom: 0.95 }[this.atk] || 0.6;
        const k = Math.min(1, this.t / wind);
        headX = this.atk === 'slash' ? 0.1 : -0.4 * k;
        jawX = 0.1 + 0.55 * k;
        lean = -0.22 * k;
        const pulse = 0.18 + k * 0.25 + Math.sin(t * 30) * 0.06;
        this.model.mat.emissive.setRGB(pulse * 0.8, 0.02, pulse);
      } else if (this.state === 'recover') {
        headX = 0.2;
        jawX = 0.3 * Math.max(0, 1 - this.t * 3);
      }
      p.head.rotation.x += (headX - p.head.rotation.x) * Math.min(1, dt * 14);
      p.jaw.rotation.x += (jawX - p.jaw.rotation.x) * Math.min(1, dt * 18);
      p.bodyG.rotation.x += (lean - p.bodyG.rotation.x) * Math.min(1, dt * 8);
      p.bodyG.rotation.z = Math.sin(t * 1.3) * 0.04;
      o.scale.setScalar(spawnS * this.baseScale);
    } else if (this.type === 'wraith') {
      const b = m.body;
      b.rotation.z = Math.sin(t * 1.7) * 0.06;
      b.rotation.x = this.state === 'windup' ? -0.25 : 0.05 * Math.sin(t * 2);
      o.scale.setScalar(spawnS * this.baseScale);
      if (this.state === 'windup') this.model.mat.emissive.setRGB(0.25 + Math.sin(t * 36) * 0.15, 0.0, 0.35);
    }
    if (this.flash > 0) this.model.mat.emissive.setRGB(0.8, 0.8, 0.8);
    else if (!(this.type !== 'slime' && this.type !== 'voidslime' && this.state === 'windup')) this.model.mat.emissive.setRGB(0, 0, 0);

    const g = this.game;
    if (dist < 14 && this.hp < this.maxHp) {
      const [sx2, sy2, vis] = g.screenOf(this.x, this.y + this.hover + (this.type === 'boar' ? 1.5 : this.type === 'wraith' ? 2.5 : this.type === 'budgedragon' ? 2.1 : this.type === 'darksycledragon' ? 2.3 : 1.25), this.z, true);
      g.hud.plate(this.id, `${this.name}<span class="hpbar"><i style="width:${(this.hp / this.maxHp) * 100}%"></i></span>`, 'mon');
      g.hud.placePlate(this.id, sx2, sy2, vis);
    } else g.hud.removePlate(this.id);
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
      ['boar', 52, 44], ['boar', 94, 48], ['slime', 100, 66], ['slime', 44, 70], ['slime', 76, 102],
      ['budgedragon', 101, 70], ['darksycledragon', 50, 90],
    ];
    for (const [t, x, z] of spots) this.spawn(t, x, z, false);
    void w;
  }

  spawn(type, x, z, fx = true) {
    const g = this.game;
    const m = new Monster(g, type, x, z);
    g.monsters.push(m);
    if (fx) g.fx.burst(x, m.y + 0.5, z, [0xc27bff, 0x6af4ff, 0xffffff], 14, 3, 0.1, 0.6);
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
      if (w.zoneAt(x, z) === ZONE.TOWN || w.zoneAt(x, z) === ZONE.WATER) continue;
      if (w.heightAt(x, z) < 0.9 || w.heightAt(x, z) > 7) continue;
      if (Math.hypot(x - P.x, z - P.z) < 14) continue;
      return { x, z, nearGate: roll < 0.45 };
    }
    return null;
  }

  update(dt) {
    if (this.game.net?.role === 'guest') return;
    const g = this.game;
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 3.5;
    const alive = g.monsters.filter((m) => !m.dead).length;
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
    const dusk = g.monsters.filter((m) => !m.dead && m.type === 'darksycledragon').length;
    if (!spot.nearGate && dusk < 1 && this.rng.next() < 0.16) type = 'darksycledragon';
    this.spawn(type, spot.x, spot.z);
    if (spot.nearGate) g.audio.portal();
  }
}

export { lerp, TOWN };
