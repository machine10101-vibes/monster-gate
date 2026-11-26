import * as budgeMetal from './armor.js';
import { makeMetalArmor } from './armorIron.js';
import * as darkMetal from './armorDark.js';
import * as volcanumMetal from './armorVolcanum.js';
import * as frostMetal from './armorFrost.js';
import { makeSoftArmor } from './armorSoft.js';
import { withDetail } from './armorDetail.js';
import { demonPlate, holyPlate } from './armorKnights.js';
import { JUNGLE_SETS, makeJungleArmor } from './armorJungle.js';
import { METALS } from '../data/metals.js';

const CACHE = {};
const BUILD = {
  ...Object.fromEntries(METALS.map((m) => [m.setId, () => makeMetalArmor(m.armorPal)])),
  budgeset: () => budgeMetal,
  darksyceset: () => darkMetal,
  volcanumset: () => volcanumMetal,
  yetiset: () => frostMetal,
  // Tyrant Rex plate: olive-green scale, fang-cream trim, red stripe shadow, amber studs.
  rexset: () => makeMetalArmor({ plate: 0x56702e, plateLo: 0x3d5222, plateHi: 0x6f8a3a, trim: 0xe8dcbc, trimDk: 0x8a2a24, accent: 0xffa818 }),
  // Starter plate: polished steel, gold trim, a blue stone.
  noviceplate: () => makeMetalArmor({ plate: 0xb8bec8, plateLo: 0x7c838e, plateHi: 0xe2e6ec, trim: 0xd8b04a, trimDk: 0x8a6a22, accent: 0x4ea8ff }),
  noviceleather: () => makeSoftArmor('noviceleather'),
  novicecloth: () => makeSoftArmor('novicecloth'),
  demonset: () => demonPlate,
  holyset: () => holyPlate,
  budgeleather: () => makeSoftArmor('budgeleather'),
  budgecloth: () => makeSoftArmor('budgecloth'),
  darkleather: () => makeSoftArmor('darkleather'),
  darkcloth: () => makeSoftArmor('darkcloth'),
  volcanumleather: () => makeSoftArmor('volcanumleather'),
  volcanumcloth: () => makeSoftArmor('volcanumcloth'),
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
