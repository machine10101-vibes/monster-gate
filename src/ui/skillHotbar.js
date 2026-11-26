import { SKILLS } from '../data/skills.js';

export const HOTBAR_HOLD_MS = 3000;

/** Only skills the character has learned and can actively equip. */
export function availableHotbarSkills(progress) {
  const learned = progress?.data?.skills?.learned || {};
  return Object.values(SKILLS).filter((skill) =>
    learned[skill.id] && skill.kind !== 'passive'
  );
}

export function readHotbarLocked(storage = globalThis.localStorage) {
  try { return storage?.getItem('mg-hotbar-skills-locked') === '1'; }
  catch { return false; }
}

export function writeHotbarLocked(locked, storage = globalThis.localStorage) {
  try {
    if (locked) storage?.setItem('mg-hotbar-skills-locked', '1');
    else storage?.removeItem('mg-hotbar-skills-locked');
    return true;
  } catch { return false; }
}
