import { buildSandSpineWorm, buildDesertScorpion } from './desertBeasts.js';
import * as sandworm from './sandwormAI.js';
import * as scorpion from './scorpionAI.js';

/** Desert beasts: the Sand Spine Worm and the Desert Scorpion. */
const BY_TYPE = { sandworm, scorpion };

export const TYPES = new Set(['sandworm', 'scorpion']);
export const DEFS = {
  sandworm: { name: 'Sand Spine Worm', hp: 180, radius: 1.15, speed: 3.6, dmg: 8, gold: [40, 70], aggro: 16, build: buildSandSpineWorm },
  scorpion: { name: 'Desert Scorpion', hp: 90, radius: 0.85, speed: 4.2, dmg: 5, gold: [22, 40], aggro: 14, build: buildDesertScorpion },
};
export const FX = { sandworm: sandworm.FX, scorpion: scorpion.FX };

export const busy = (m) => BY_TYPE[m.type].busy(m);
export const holdsWarn = (m) => BY_TYPE[m.type].holdsWarn(m);
export const think = (m, dt, c) => BY_TYPE[m.type].think(m, dt, c);
export const animate = (m, dt, ctx) => BY_TYPE[m.type].animate(m, dt, ctx);
export const dead = (m, dt, ctx) => BY_TYPE[m.type].dead(m, dt, ctx);
