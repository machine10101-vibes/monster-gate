import * as budgeMetal from './armor.js';
import * as darkMetal from './armorDark.js';
import { makeSoftArmor } from './armorSoft.js';

const CACHE = {};
const BUILD = {
  budgeset: () => budgeMetal,
  darksyceset: () => darkMetal,
  budgeleather: () => makeSoftArmor('budgeleather'),
  budgecloth: () => makeSoftArmor('budgecloth'),
  darkleather: () => makeSoftArmor('darkleather'),
  darkcloth: () => makeSoftArmor('darkcloth'),
};

/** Painter module {paintHelm, paintChest, paintArm, paintLeg} for a set id. */
export function painterFor(setId) {
  if (!BUILD[setId]) return null;
  return (CACHE[setId] ||= BUILD[setId]());
}

export const PAINTER_SETS = Object.keys(BUILD);
