import * as THREE from 'three';
import { buildHumanoid, S } from './humanoid.js';
import { buildFowl, buildButterfly } from './creatures.js';
import { clamp, RNG, shade } from '../engine/voxel.js';
import { ZONE, WATER_Y } from '../world/terrain.js';

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
      'Monster parts can be forged into gear. Bram the blacksmith keeps the forge by the south road.',
      'Lira the alchemist sells healing draughts and spirit philters from her stall on the south road.',
      'When the hunt starts to stick, press K. Warrior, Ranger, and Mage each keep three paths, and the same points raise your attributes.',
    ],
  },
  {
    id: 'smith',
    name: 'Bram',
    title: 'Blacksmith',
    spot: 'smith',
    service: 'forge',
    yaw: -Math.PI / 2,
    look: { skin: 0xc58a5e, hair: 0x1c1410, hairStyle: 'short', beard: true, tunic: 0x6a4a32, sleeve: 0x6a4a32, apron: 0x3e3a38, pants: 0x2a2220, boots: 0x1f1814, bracer: true, seed: 5, metal: 0x777a80 },
    lines: [
      'Steel and leather, friend. That greatsword on your back has seen better days.',
      'Wraiths cannot take a hit from the hammer. Heavy swings, heavy knockback.',
      'Bring me monster parts and the forge will turn them into weapons and armor. Step up and have a look.',
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
    game.world.circle(this.x, this.z, 0.4);
    this.height = 1.9 * (def.scale || 1);
  }

  update(dt, t) {
    const P = this.game.player.pos;
    const dx = P.x - this.x;
    const dz = P.z - this.z;
    const d = Math.hypot(dx, dz);
    const target = d < 6 ? Math.atan2(dx, dz) : this.baseYaw;
    this.yaw += angDiff(this.yaw, target) * Math.min(1, dt * 4);
    this.obj.rotation.y = this.yaw;
    const m = this.model;
    const b = Math.sin(t * 2 + this.phase);
    m.hip.position.y = 24 * S + b * 0.01;
    m.armL.rotation.x = Math.sin(t * 1.5 + this.phase) * 0.04;
    m.armR.rotation.x = -Math.sin(t * 1.5 + this.phase) * 0.04;
    const look = d < 6 ? clamp(angDiff(this.yaw, Math.atan2(dx, dz)), -0.6, 0.6) : 0;
    m.head.rotation.y = look * 0.5;
    if (this.id === 'npc-smith') m.armR.rotation.x = -0.9 + Math.sin(t * 4) * 0.35 * (d > 6 ? 1 : 0.15);
    if (this.id === 'npc-alchemist') {
      m.armR.rotation.x = -1.15 + Math.sin(t * 3.2) * 0.28;
      m.armL.rotation.x = -0.55 + Math.sin(t * 2.1) * 0.08;
    }
    if (this.id === 'npc-guild' && d < 6) m.armR.rotation.z = -0.5 + Math.sin(t * 5) * 0.25;
    else m.armR.rotation.z *= 0.9;
    this.near = d < 2.6;
    const [sx, sy, vis] = this.game.screenOf(this.x, this.y + this.height + 0.4, this.z, true);
    this.game.hud.plate(this.id, `${this.def.name}<small>${this.def.title}</small>`);
    this.game.hud.placePlate(this.id, sx, sy, vis && d < 16);
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
  const spots = [[70, 94], [74, 96], [68, 98], [96, 78], [98, 74], [58, 92], [62, 96], [86, 96], [80, 70], [66, 80], [76, 104], [48, 80]];
  spots.forEach(([x, z]) => {
    if (game.world.heightAt(x, z) > 0.8) fowl.push(new Fowl(game, x + rng.range(-1, 1), z + rng.range(-1, 1)));
  });
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
  return { npcs, fowl, butterflies };
}

export { ZONE, shade };
