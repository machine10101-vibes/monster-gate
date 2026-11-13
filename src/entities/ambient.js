import * as THREE from 'three';
import { buildHumanoid, S } from './humanoid.js';
import { buildFowl, buildButterfly, buildCow } from './creatures.js';
import { clamp, RNG, shade } from '../engine/voxel.js';
import { ZONE, WATER_Y } from '../world/terrain.js';

/** Talk / F range. Matches Lira's stall so Mira is not tighter than the crate. */
export const NPC_TALK_RANGE = 3.4;

const TAU = Math.PI * 2;
function angDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

const NPC_DEFS = [
  {
    id: 'guild',
    name: 'Mira',
    title: 'Guild Receptionist',
    spot: 'guild',
    yaw: 0.2,
    look: { skin: 0xf0c09a, hair: 0xa8502a, hairStyle: 'short', hairLen: 7, tunic: 0x2f7f5a, sleeve: 0xe9dfc8, pants: 0x4a3a2c, boots: 0x3a2a1f, vest: true, strap: 0x2a5f44, belt: true, seed: 11, eye: 0x2f6f4f },
    lines: [
      'Welcome to the Hunter Guild! The Monster Gate to the north has been restless again.',
      'Slay five creatures and the guild board will pay you in gold. Use Space to roll away from danger.',
      'Hold Shift to raise your shield. Blocking a charging boar is very satisfying.',
      'Monster parts can be forged into gear. Bram the blacksmith keeps the forge by Greyrock Pit, just outside town.',
      'Lira the alchemist sells healing draughts and spirit philters from her stall on the south road.',
      'When the hunt starts to stick, press K. Warrior, Ranger, and Mage each keep three paths, and the same points raise your attributes.',
      'The board in the hall pins three bounties that pay gold and training. They rotate. Do not try to turn the same stack in twice.',
      'Hellspire and Dawnspire are still at war on the Endless Field. If you have the guild mark, ask me about the keeps.',
    ],
  },
  {
    id: 'smith',
    name: 'Bram',
    title: 'Blacksmith',
    spot: 'smith',
    service: 'forge',
    yaw: -0.85,
    look: { skin: 0xc58a5e, hair: 0x1c1410, hairStyle: 'short', beard: true, tunic: 0x6a4a32, sleeve: 0x6a4a32, apron: 0x3e3a38, pants: 0x2a2220, boots: 0x1f1814, bracer: true, seed: 5, metal: 0x777a80 },
    lines: [
      'Steel and leather, friend. That greatsword on your back has seen better days.',
      'Wraiths cannot take a hit from the hammer. Heavy swings, heavy knockback.',
      'Smelt the pit ore in the smithy beside us, then bring me the bars. Copper first, then iron, then steel from iron and coal. Monster parts work too. The forge turns them into weapons and armor.',
    ],
  },
  {
    id: 'alchemist',
    name: 'Lira',
    title: 'Alchemist',
    spot: 'alchemist',
    service: 'alchemy',
    yaw: -1.48,
    look: { skin: 0xe8b892, hair: 0x2a1838, hairStyle: 'short', hairLen: 6, tunic: 0x3a2460, sleeve: 0x4c3278, apron: 0x1d3a32, pants: 0x241c30, boots: 0x1a141c, hat: 'hood', hatColor: 0x3a2460, belt: true, seed: 21, eye: 0x3ecf7a },
    lines: [
      'Bubbles, brews and things that glow. Mind the fumes.',
      'A healing draught mends the cuts. A spirit philter fills the bolt.',
    ],
  },
  {
    id: 'farmer',
    name: 'Old Tobin',
    title: 'Farmer',
    spot: 'farmer',
    yaw: 2.4,
    look: { skin: 0xe0a878, hair: 0xd8d4cc, hairStyle: 'short', beard: true, tunic: 0xb8452f, sleeve: 0xb8452f, pants: 0x3f68a8, boots: 0x3a2a1f, hat: 'straw', seed: 8 },
    lines: [
      'The wheat is ripe, but those slimes keep hopping through my fence.',
      'Fowl wander in from the meadow. Gentle things, but they never listen.',
    ],
  },
  {
    id: 'child',
    name: 'Pip',
    title: 'Apprentice',
    spot: 'child',
    yaw: 3.0,
    scale: 0.7,
    look: { skin: 0xf2c8a0, hair: 0x6a3a1c, hairStyle: 'messy', tunic: 0x3c6fb5, sleeve: 0x3c6fb5, pants: 0x5a4a38, boots: 0x3a2a1f, hat: 'cap', hatColor: 0xc8402f, seed: 14 },
    lines: ['Are you really going into the Gate? Wow! Bring me a shiny gem!', 'I want to be a hunter someday. Teach me the roll!'],
  },
];

export class NPC {
  constructor(game, def) {
    this.game = game;
    this.def = def;
    this.name = def.name;
    this.id = 'npc-' + def.id;
    const spot = game.world.npcSpots[def.spot];
    this.x = spot.x;
    this.z = spot.z;
    this.y = game.world.heightAt(this.x, this.z);
    this.model = buildHumanoid({ ...def.look, hero: false });
    this.obj = new THREE.Group();
    this.obj.add(this.model.root);
    if (def.scale) this.obj.scale.setScalar(def.scale);
    this.obj.position.set(this.x, this.y, this.z);
    this.yaw = def.yaw;
    this.baseYaw = def.yaw;
    this.obj.rotation.y = this.yaw;
    this.phase = Math.random() * 10;
    this.line = 0;
    game.scene.add(this.obj);
    if (!def.roam) game.world.circle(this.x, this.z, 0.4);
    this.height = 1.9 * (def.scale || 1);
    this.speed = 0;
  }

  update(dt, t) {
    const P = this.game.player.pos;
    const dx = P.x - this.x;
    const dz = P.z - this.z;
    const d = Math.hypot(dx, dz);
    if (this.def.roam && d >= 5) this.stepRoam(dt);
    else this.speed = 0;
    const target = d < 6 ? Math.atan2(dx, dz) : this.baseYaw;
    this.yaw += angDiff(this.yaw, target) * Math.min(1, dt * 4);
    this.obj.rotation.y = this.yaw;
    const m = this.model;
    const b = Math.sin(t * 2 + this.phase);
    m.hip.position.y = 24 * S + b * 0.01;
    const swing = this.speed > 0.2 ? Math.sin(t * 8 + this.phase) * 0.55 : 0;
    if (this.def.roam && this.speed > 0.2) {
      m.legL.rotation.x = swing;
      m.legR.rotation.x = -swing;
      m.armL.rotation.x = -swing * 0.55;
      m.armR.rotation.x = swing * 0.55;
    } else {
      m.legL.rotation.x *= 0.8;
      m.legR.rotation.x *= 0.8;
      m.armL.rotation.x = Math.sin(t * 1.5 + this.phase) * 0.04;
      m.armR.rotation.x = -Math.sin(t * 1.5 + this.phase) * 0.04;
    }
    const look = d < 6 ? clamp(angDiff(this.yaw, Math.atan2(dx, dz)), -0.6, 0.6) : 0;
    m.head.rotation.y = look * 0.5;
    if (this.id === 'npc-smith') m.armR.rotation.x = -0.9 + Math.sin(t * 4) * 0.35 * (d > 6 ? 1 : 0.15);
    if (this.id === 'npc-alchemist') {
      m.armR.rotation.x = -1.15 + Math.sin(t * 3.2) * 0.28;
      m.armL.rotation.x = -0.55 + Math.sin(t * 2.1) * 0.08;
    }
    if (this.id === 'npc-guild' && d < 6) m.armR.rotation.z = -0.5 + Math.sin(t * 5) * 0.25;
    else m.armR.rotation.z *= 0.9;
    this.near = d < NPC_TALK_RANGE;
    const [sx, sy, vis] = this.game.screenOf(this.x, this.y + this.height + 0.4, this.z, true);
    this.game.hud.plate(this.id, `${this.def.name}<small>${this.def.title}</small>`);
    this.game.hud.placePlate(this.id, sx, sy, vis && d < 16, { dist: d });
  }

  stepRoam(dt) {
    const rects = this.def.roam;
    if (!this.goal) {
      this.wait = (this.wait || 0) - dt;
      if (this.wait > 0) {
        this.speed = 0;
        return;
      }
      const rect = rects[Math.floor(Math.random() * rects.length)];
      this.goal = {
        x: rect.x0 + Math.random() * (rect.x1 - rect.x0),
        z: rect.z0 + Math.random() * (rect.z1 - rect.z0),
      };
    }
    const dx = this.goal.x - this.x;
    const dz = this.goal.z - this.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.45) {
      this.goal = null;
      this.wait = 0.8 + Math.random() * 2.4;
      this.speed = 0;
      return;
    }
    const sp = 1.15;
    const pos = { x: this.x + (dx / dist) * sp * dt, z: this.z + (dz / dist) * sp * dt };
    this.game.world.resolve(pos, 0.34);
    const moved = Math.hypot(pos.x - this.x, pos.z - this.z);
    if (!this.game.world.canStep(pos.x, pos.z, this.y) || moved < sp * dt * 0.2) {
      this.stuck = (this.stuck || 0) + 1;
      if (this.stuck > 10) {
        this.goal = null;
        this.stuck = 0;
        this.wait = 0.4;
      }
      this.speed = 0;
      return;
    }
    this.stuck = 0;
    this.x = pos.x;
    this.z = pos.z;
    this.y = this.game.world.heightAt(this.x, this.z);
    this.obj.position.set(this.x, this.y, this.z);
    this.baseYaw = Math.atan2(dx, dz);
    this.speed = sp;
  }

  nextLine() {
    const l = this.def.lines[this.line % this.def.lines.length];
    this.line++;
    return l;
  }
}

export class Fowl {
  constructor(game, x, z) {
    this.game = game;
    const built = buildFowl();
    this.model = built;
    this.obj = built.root;
    this.x = x;
    this.z = z;
    this.y = game.world.heightAt(x, z);
    this.yaw = Math.random() * TAU;
    this.t = Math.random() * 5;
    this.state = 'idle';
    this.target = { x, z };
    this.home = { x, z };
    this.peck = 0;
    this.phase = Math.random() * 10;
    game.scene.add(this.obj);
    this.hop = 0;
  }

  ok(x, z) {
    const w = this.game.world;
    const h = w.heightAt(x, z);
    return w.playable(x, z) && h > WATER_Y + 0.1 && Math.abs(h - this.y) < 1.01 && h < 6;
  }

  update(dt, t) {
    const P = this.game.player.pos;
    const dx = this.x - P.x;
    const dz = this.z - P.z;
    const d = Math.hypot(dx, dz);
    let sp = 0;
    if (d < 3.2) {
      this.state = 'flee';
      this.target = { x: this.x + (dx / d) * 5, z: this.z + (dz / d) * 5 };
      this.fleeT = 1.2;
    }
    if (this.state === 'flee') {
      this.fleeT -= dt;
      if (this.fleeT <= 0) this.state = 'idle';
    }
    this.t -= dt;
    if (this.state === 'idle' && this.t <= 0) {
      this.t = 1.5 + Math.random() * 3;
      if (Math.random() < 0.55) {
        const a = Math.random() * TAU;
        this.target = { x: this.home.x + Math.cos(a) * 3.5, z: this.home.z + Math.sin(a) * 3.5 };
        this.state = 'walk';
      } else this.peck = 0.7;
    }
    if (this.state === 'walk' || this.state === 'flee') {
      const tx = this.target.x - this.x;
      const tz = this.target.z - this.z;
      const td = Math.hypot(tx, tz);
      if (td < 0.3) {
        if (this.state === 'walk') this.state = 'idle';
      } else {
        sp = this.state === 'flee' ? 3.4 : 0.9;
        const nx = this.x + (tx / td) * sp * dt;
        const nz = this.z + (tz / td) * sp * dt;
        if (this.ok(nx, nz)) {
          this.x = nx;
          this.z = nz;
        } else this.state = 'idle';
        this.yaw += angDiff(this.yaw, Math.atan2(tx, tz)) * Math.min(1, dt * 8);
      }
    }
    this.peck = Math.max(0, this.peck - dt);
    const gh = this.game.world.heightAt(this.x, this.z);
    this.y += (gh - this.y) * Math.min(1, dt * 14);
    const bob = sp > 0.1 ? Math.abs(Math.sin(t * (sp > 2 ? 18 : 9) + this.phase)) * 0.06 : 0;
    this.obj.position.set(this.x, this.y + bob, this.z);
    this.obj.rotation.y = this.yaw;
    this.model.body.rotation.x = this.peck > 0 ? Math.sin(this.peck * 22) * 0.35 + 0.15 : 0;
    this.model.body.rotation.z = sp > 2 ? Math.sin(t * 18) * 0.1 : 0;
  }
}

export class Cow {
  constructor(game, x, z, bounds) {
    this.game = game;
    this.bounds = bounds;
    const built = buildCow();
    this.model = built;
    this.obj = built.root;
    this.x = x;
    this.z = z;
    this.y = game.world.heightAt(x, z);
    this.yaw = Math.random() * TAU;
    this.t = Math.random() * 4;
    this.goal = null;
    this.phase = Math.random() * 10;
    game.scene.add(this.obj);
    this.obj.position.set(this.x, this.y, this.z);
  }

  update(dt, t) {
    if (!this.goal) {
      this.t -= dt;
      if (this.t <= 0) {
        this.t = 1.4 + Math.random() * 2.6;
        const b = this.bounds;
        this.goal = {
          x: b.cx + (Math.random() - 0.5) * b.hx * 1.7,
          z: b.cz + (Math.random() - 0.5) * b.hz * 1.7,
        };
      }
    }
    let sp = 0;
    if (this.goal) {
      const dx = this.goal.x - this.x;
      const dz = this.goal.z - this.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.4) this.goal = null;
      else {
        sp = 0.7;
        const nx = this.x + (dx / d) * sp * dt;
        const nz = this.z + (dz / d) * sp * dt;
        const b = this.bounds;
        if (Math.abs(nx - b.cx) < b.hx && Math.abs(nz - b.cz) < b.hz && this.game.world.canStep(nx, nz, this.y)) {
          this.x = nx;
          this.z = nz;
          this.yaw += angDiff(this.yaw, Math.atan2(dx, dz)) * Math.min(1, dt * 4);
        } else this.goal = null;
      }
    }
    this.y += (this.game.world.heightAt(this.x, this.z) - this.y) * Math.min(1, dt * 10);
    this.obj.position.set(this.x, this.y, this.z);
    this.obj.rotation.y = this.yaw;
    const step = sp > 0.1 ? Math.sin(t * 7 + this.phase) : 0;
    this.model.parts.legs.forEach((leg, i) => {
      leg.rotation.x = step * (i % 2 ? 0.35 : -0.35);
    });
    this.model.parts.head.rotation.y = Math.sin(t * 0.8 + this.phase) * 0.15;
    this.model.parts.tail.rotation.x = 0.4 + Math.sin(t * 2 + this.phase) * 0.2;
  }
}

export class Butterfly {
  constructor(game, x, z, color) {
    this.game = game;
    this.b = buildButterfly(color);
    this.obj = this.b.root;
    this.x = x;
    this.z = z;
    this.home = { x, z };
    this.yaw = Math.random() * TAU;
    this.t = Math.random() * 10;
    this.h = 1 + Math.random();
    game.scene.add(this.obj);
  }
  update(dt) {
    this.t += dt;
    this.yaw += Math.sin(this.t * 0.9 + this.home.x) * dt * 2.2;
    const sp = 0.8;
    this.x += Math.sin(this.yaw) * sp * dt;
    this.z += Math.cos(this.yaw) * sp * dt;
    if (Math.hypot(this.x - this.home.x, this.z - this.home.z) > 6) this.yaw = Math.atan2(this.home.x - this.x, this.home.z - this.z);
    const gh = this.game.world.heightAt(this.x, this.z);
    const y = Math.max(gh, WATER_Y) + this.h + Math.sin(this.t * 1.7) * 0.35;
    this.obj.position.set(this.x, y, this.z);
    this.obj.rotation.y = this.yaw;
    const f = Math.sin(this.t * 22) * 0.95 + 0.25;
    this.b.wingL.rotation.z = f;
    this.b.wingR.rotation.z = -f;
  }
}

export function createAmbient(game) {
  const rng = new RNG(31337);
  const npcs = NPC_DEFS.map((d) => new NPC(game, d));
  const fowl = [];
  const cows = [];
  for (const pen of game.world.cowPens || []) {
    for (const spot of pen.spots) cows.push(new Cow(game, spot.x, spot.z, pen.bounds));
  }
  const farmers = (game.world.farms || []).map((farm) => new NPC(game, {
    id: farm.id,
    name: farm.farmer,
    title: 'Farmer',
    spot: farm.id,
    yaw: farm.yaw || 0,
    roam: farm.roam,
    look: farm.look,
    lines: farm.lines,
  }));
  const butterflies = [];
  const colors = [0xffd23f, 0xff7aa8, 0x7fd0ff, 0xffffff, 0xff9a3a, 0xc27bff];
  for (let i = 0; i < 16; i++) {
    const x = rng.range(40, 110);
    const z = rng.range(78, 110);
    butterflies.push(new Butterfly(game, x, z, colors[i % colors.length]));
  }
  for (let i = 0; i < 6; i++) {
    const x = rng.range(50, 95);
    const z = rng.range(40, 58);
    butterflies.push(new Butterfly(game, x, z, [0x6af4ff, 0x9affef, 0xc27bff][i % 3]));
  }
  return { npcs: npcs.concat(farmers), fowl, butterflies, cows };
}

export { ZONE, shade };
