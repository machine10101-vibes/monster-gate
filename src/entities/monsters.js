import * as THREE from 'three';
import { buildSlime, buildBoar, buildWraith } from './creatures.js';
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
};

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
    this.hover = type === 'wraith' ? 1.15 : 0;

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
    this.stun = this.type === 'boar' && this.state === 'charge' ? 0.05 : 0.28;
    if (this.state === 'windup') this.state = 'chase';
    const k = knock / (this.type === 'boar' ? 1.6 : 1);
    this.vx = dx * k * 1.7;
    this.vz = dz * k * 1.7;
    this.vy = this.type === 'wraith' ? 0 : 2.6;
    this.air = this.type === 'slime' || this.type === 'voidslime' ? this.air : false;
    const hx = this.x;
    const hy = this.y + 0.7 + this.hover;
    const hz = this.z;
    g.fx.burst(hx, hy, hz, this.type === 'slime' ? [0x57d46c, 0xa4f58f, 0xffffff] : this.type === 'voidslime' || this.type === 'wraith' ? [0xc27bff, 0x8c52da, 0xffffff] : [0xc9967a, 0xff5a46, 0xffffff], crit ? 16 : 9, 3.8, 0.1, 0.5);
    g.hud.floatText(...g.screenOf(hx, hy + 0.9, hz), String(dmg) + (crit ? '!' : ''), crit ? 'crit' : '');
    if (this.state === 'idle' || this.state === 'wander') this.state = 'chase';
    if (this.hp <= 0) this.die();
  }

  die() {
    const g = this.game;
    this.dead = true;
    this.deadT = 0;
    g.onMonsterKilled(this);
    g.fx.burst(this.x, this.y + 0.7 + this.hover, this.z, this.type === 'boar' ? [0xc9967a, 0x8a5634, 0xffffff] : [0xc27bff, 0x57d46c, 0xffffff], 22, 4.5, 0.14, 0.8);
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

  update(dt) {
    const g = this.game;
    const P = g.player;
    if (this.dead) {
      this.deadT += dt;
      const s = Math.max(0, 1 - this.deadT * 3.2) * this.baseScale;
      this.obj.scale.set(s * (1 + this.deadT * 0.6), s * 0.5, s * (1 + this.deadT * 0.6));
      if (this.deadT > 0.4) this.remove = true;
      return;
    }
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
        default:
      }
    }

    this.hitCd = Math.max(0, (this.hitCd || 0) - dt);
    this.vx *= Math.max(0, 1 - dt * (this.air ? 0.4 : 7));
    this.vz *= Math.max(0, 1 - dt * (this.air ? 0.4 : 7));
    const sx = mvx + this.vx;
    const sz = mvz + this.vz;
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
    o.position.set(this.x, this.y + this.hover + (this.type === 'wraith' ? Math.sin(t * 2.2) * 0.12 : 0), this.z);
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
      const [sx2, sy2, vis] = g.screenOf(this.x, this.y + this.hover + (this.type === 'boar' ? 1.5 : this.type === 'wraith' ? 2.5 : 1.25), this.z, true);
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
    this.spawn(type, spot.x, spot.z);
    if (spot.nearGate) g.audio.portal();
  }
}

export { lerp, TOWN };
