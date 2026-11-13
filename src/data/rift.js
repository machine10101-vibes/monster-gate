/** Party-scaled waygate rift. Solo through 4 hunters. */

export const RIFT_MAX_PARTY = 4;
export const RIFT_COOLDOWN_MS = 6 * 60 * 1000;

export const RIFT_WAVES = [
  { id: 1, title: 'The first tear', spawn: [['slime', 3], ['boar', 1]] },
  { id: 2, title: 'The second tear', spawn: [['wraith', 2], ['boar', 1], ['voidslime', 1]] },
  { id: 3, title: 'The rift champion', spawn: [['budgedragon', 1]] },
];

export function clampParty(n) {
  return Math.max(1, Math.min(RIFT_MAX_PARTY, n | 0));
}

export function partySize(game) {
  if (game?.wallet?.kind === 'guest') return 1;
  return clampParty(1 + (game?.net?.peers?.size || 0));
}

/** HP grows faster than damage so a four-hunter clear is busy, not a wipe. */
export function riftScale(party) {
  const p = clampParty(party);
  return {
    party: p,
    hpMul: 1 + (p - 1) * 0.55,
    dmgMul: 1 + (p - 1) * 0.22,
    extra: p - 1,
  };
}

export function riftWaveSpawns(wave, party) {
  const spec = RIFT_WAVES[(wave | 0) - 1];
  const extra = riftScale(party).extra;
  if (!spec) return [];
  const out = [];
  for (const [type, n] of spec.spawn) {
    const add = type === 'budgedragon' ? 0 : extra;
    for (let i = 0; i < n + add; i++) out.push(type);
  }
  return out;
}

export function riftChestGold(party) {
  return 24 + clampParty(party) * 14;
}

export function riftChestGoods(party) {
  const p = clampParty(party);
  return [
    { id: 'copper_ore', n: p },
    { id: 'birch_logs', n: 1 },
  ];
}
