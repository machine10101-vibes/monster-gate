import { buildSandSpineWorm, buildDesertScorpion } from './desertBeasts.js';
import * as sandworm from './sandwormAI.js';
import * as scorpion from './scorpionAI.js';
import * as oasiscroc from './oasiscrocAI.js';
import { buildOasisCrocodile } from './oasiscrocModel.js';

/** Desert beasts: the Sand Spine Worm, the Desert Scorpion and the Oasis Crocodile. */
const BY_TYPE = { sandworm, scorpion, oasiscroc };

export const TYPES = new Set(['sandworm', 'scorpion', 'oasiscroc']);
export const DEFS = {
  sandworm: { name: 'Sand Spine Worm', hp: 1500, radius: 2.3, speed: 4.6, dmg: 9, gold: [360, 560], aggro: 24, build: buildSandSpineWorm },
  // Level 80: between the scorpion (6) and the worm (125). Tough, hard-biting, quick in a lunge.
  oasiscroc: { name: 'Oasis Crocodile', hp: 900, radius: 1.5, speed: 4.6, dmg: 8, gold: [160, 260], aggro: 13, build: buildOasisCrocodile },
  scorpion: { name: 'Desert Scorpion', hp: 90, radius: 0.85, speed: 4.2, dmg: 5, gold: [22, 40], aggro: 14, build: buildDesertScorpion },
};
export const FX = { sandworm: sandworm.FX, scorpion: scorpion.FX, oasiscroc: oasiscroc.FX };

export const busy = (m) => BY_TYPE[m.type].busy(m);
export const holdsWarn = (m) => BY_TYPE[m.type].holdsWarn(m);
export const think = (m, dt, c) => BY_TYPE[m.type].think(m, dt, c);
export const animate = (m, dt, ctx) => BY_TYPE[m.type].animate(m, dt, ctx);
export const dead = (m, dt, ctx) => BY_TYPE[m.type].dead(m, dt, ctx);
