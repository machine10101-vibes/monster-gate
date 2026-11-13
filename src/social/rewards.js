import { MAX_PARTY, XP_BONUS_PER_MEMBER } from './constants.js';

export function clampPartySize(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 1;
  return Math.max(1, Math.min(MAX_PARTY, v | 0));
}

/**
 * Split combat XP across a party with an 8% bonus per extra member.
 * Remainder goes to `killerIndex` (join-order index of the killer).
 */
export function splitXp(soloXp, partySize, opts = {}) {
  const n = clampPartySize(partySize);
  const baseXp = Math.max(0, Math.floor(Number(soloXp) || 0));
  const bonus = XP_BONUS_PER_MEMBER * (n - 1);
  const total = Math.floor(baseXp * (1 + bonus) + 1e-9);
  const share = n ? Math.floor(total / n) : 0;
  const rem = total - share * n;
  const killer = ((opts.killerIndex | 0) % n + n) % n;
  const shares = Array.from({ length: n }, () => share);
  if (shares.length) shares[killer] += rem;
  return { n, bonus, total, share, remainder: rem, killerIndex: killer, shares };
}

/** Integer gold split with no minting. Remainder to the killer. */
export function splitGold(amount, partySize, opts = {}) {
  const n = clampPartySize(partySize);
  const total = Math.max(0, Math.floor(Number(amount) || 0));
  const share = n ? Math.floor(total / n) : 0;
  const rem = total - share * n;
  const killer = ((opts.killerIndex | 0) % n + n) % n;
  const shares = Array.from({ length: n }, () => share);
  if (shares.length) shares[killer] += rem;
  return { n, bonus: 0, total, share, remainder: rem, killerIndex: killer, shares };
}

export function lootWinner(memberIds, turn = 0) {
  const ids = Array.isArray(memberIds) ? memberIds.filter(Boolean) : [];
  if (!ids.length) return null;
  const i = ((turn | 0) % ids.length + ids.length) % ids.length;
  return ids[i];
}

export function nextLootTurn(turn, n) {
  const size = Math.max(1, n | 0);
  return ((turn | 0) + 1) % size;
}

/**
 * Need/greed: highest need roll wins, else highest greed, else pass.
 * Tie → lower join index (`order`).
 */
export function needGreedResolve(rolls = []) {
  const list = Array.isArray(rolls) ? rolls : [];
  const ranked = (choice) => list
    .map((r, order) => ({
      id: r.id,
      choice: r.choice,
      roll: Math.max(1, Math.min(100, r.roll | 0)),
      order: r.order != null ? r.order | 0 : order,
    }))
    .filter((r) => r.choice === choice && r.id)
    .sort((a, b) => b.roll - a.roll || a.order - b.order);

  const need = ranked('need');
  if (need[0]) return { winner: need[0].id, pool: 'need', roll: need[0].roll };
  const greed = ranked('greed');
  if (greed[0]) return { winner: greed[0].id, pool: 'greed', roll: greed[0].roll };
  return { winner: null, pool: 'pass', roll: 0 };
}
