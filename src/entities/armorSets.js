import * as budgeMetal from './armor.js';
import * as ironMetal from './armorIron.js';
import * as darkMetal from './armorDark.js';
import * as frostMetal from './armorFrost.js';
import { makeSoftArmor } from './armorSoft.js';
import { withDetail } from './armorDetail.js';
import { demonPlate, holyPlate } from './armorKnights.js';
import { JUNGLE_SETS, makeJungleArmor } from './armorJungle.js';

const CACHE = {};
const BUILD = {
  iron: () => ironMetal,
  budgeset: () => budgeMetal,
  darksyceset: () => darkMetal,
  yetiset: () => frostMetal,
  demonset: () => demonPlate,
  holyset: () => holyPlate,
  budgeleather: () => makeSoftArmor('budgeleather'),
  budgecloth: () => makeSoftArmor('budgecloth'),
  darkleather: () => makeSoftArmor('darkleather'),
  darkcloth: () => makeSoftArmor('darkcloth'),
  yetileather: () => makeSoftArmor('yetileather'),
  yeticloth: () => makeSoftArmor('yeticloth'),
  ...Object.fromEntries(JUNGLE_SETS.map((id) => [id, () => makeJungleArmor(id)])),
};

/** Painter module {paintHelm, paintChest, paintArm, paintLeg} for a set id. */
export function painterFor(setId) {
  if (!BUILD[setId]) return null;
  return (CACHE[setId] ||= withDetail(setId, BUILD[setId]()));
}

export const PAINTER_SETS = Object.keys(BUILD);
