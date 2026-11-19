import { randomInt, randomUUID } from 'node:crypto';

const MAX_DAMAGE = 250;
const ATTACK_RANGE = 6;
const ATTACK_COOLDOWN_MS = 450;
const ROLL_TTL_MS = 20_000;
const LOOT_MODES = new Set(['round_robin', 'need_greed']);

function distance(a, b) { return Math.hypot((a.x || 0) - (b.x || 0), (a.z || 0) - (b.z || 0)); }
function orderedMembers(party, players, zone) {
  return (party?.members || [])
    .slice().sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id))
    .map((m) => players.get(m.id)).filter((p) => p && p.zone === zone);
}

/**
 * Server-owned combat and loot resolver.
 *
 * Persistence contract:
 *   grantOnce({ rewardId, userId, kind, id, amount }) must atomically insert a
 *   unique rewardId and apply the inventory delta in one database transaction.
 *   It must return { granted: boolean }. Never substitute a non-atomic save
 *   queue in production. Tests may use the included in-memory grantOnce.
 */
export function createCombatLoot({
  monsters, players, parties, persist, now = () => Date.now(),
  random = () => randomInt(1, 101), damageFor = (player) => player.serverDamage ?? 8,
  dropsFor = (monster) => monster.drops || [],
  xpFor = (monster) => Math.max(1, Math.round((monster.level || 1) * 12)),
  goldFor = (monster) => Math.max(1, Math.round((monster.level || 1) * 3)),
  broadcast = () => {},
}) {
  const cooldowns = new Map();
  const rolls = new Map();
  const claimed = new Set();
  const cursors = new Map();
  async function grant(reward, userId) {
    if (typeof persist?.grantOnce !== 'function') {
      throw new Error('Transactional grantOnce persistence is required.');
    }
    return persist.grantOnce({ ...reward, userId });
  }

  function partyFor(player) { return parties?.partyOf?.(player.id) || null; }
  function recipients(player) {
    const party = partyFor(player);
    const all = orderedMembers(party, players, player.zone)
      .filter((member) => distance(member, player) <= 40);
    return all.length ? all : [player];
  }

  async function deliver(item, winner, rewardId) {
    if (claimed.has(rewardId)) return false;
    const result = await grant({ rewardId, kind: item.kind, id: item.id, amount: item.amount }, winner.userId);
    if (!result?.granted) { claimed.add(rewardId); return false; }
    claimed.add(rewardId);
    const frame = { type: 'loot_awarded', reward_id: rewardId, kind: item.kind, id: item.id, amount: item.amount, winner: winner.id };
    broadcast(frame, [winner]);
    return true;
  }

  async function roundRobin(item, members, partyId, rewardId) {
    const key = partyId || members[0].id;
    const cursor = partyId ? (parties?.get?.(partyId)?.loot_turn || 0) : (cursors.get(key) || 0);
    const index = cursor % members.length;
    if (partyId && parties?.get?.(partyId)) parties.get(partyId).loot_turn = cursor + 1;
    else cursors.set(key, cursor + 1);
    await deliver(item, members[index], rewardId);
    return members[index];
  }

  async function resolveRoll(roll) {
    if (roll.resolving) return;
    roll.resolving = true;
    const entries = [...roll.choices.entries()];
    const need = entries.filter(([, c]) => c.choice === 'need').sort((a,b) => b[1].value-a[1].value || a[1].order-b[1].order);
    const greed = entries.filter(([, c]) => c.choice === 'greed').sort((a,b) => b[1].value-a[1].value || a[1].order-b[1].order);
    const winnerId = (need[0] || greed[0])?.[0];
    let winner = players.get(winnerId);
    if (winner) await deliver(roll.item, winner, roll.rewardId);
    else winner = await roundRobin(roll.item, roll.members, roll.partyId, roll.rewardId);
    rolls.delete(roll.id);
    broadcast({ type: 'loot_roll_result', roll_id: roll.id, reward_id: roll.rewardId, winner: winner?.id || null, item: roll.item }, roll.members);
  }

  async function kill(monster, killer) {
    monster.hp = 0;
    monster.dead = true;
    monster.respawnAt = monster.rift ? 0 : now() + Math.max(5, monster.respawn || 30) * 1000;
    monster.deathId = randomUUID();
    const members = recipients(killer);
    for (const member of members) {
      if (!member.userId) continue;
      const rewardId = `kill:${monster.id}:${monster.deathId}:xp:${member.userId}`;
      const xpAmount = xpFor(monster);
      const xpResult = await grant({ rewardId, kind: 'xp', id: 'strength', amount: xpAmount }, member.userId);
      if (xpResult?.granted) broadcast({ type: 'reward_update', kind: 'xp', id: 'strength', amount: xpAmount }, [member]);
      const goldId = `kill:${monster.id}:${monster.deathId}:gold:${member.userId}`;
      const goldAmount = goldFor(monster);
      const goldResult = await grant({ rewardId: goldId, kind: 'gold', id: 'gold', amount: goldAmount }, member.userId);
      if (goldResult?.granted) broadcast({ type: 'reward_update', kind: 'gold', id: 'gold', amount: goldAmount }, [member]);
    }
    const party = partyFor(killer);
    const mode = LOOT_MODES.has(party?.loot) ? party.loot : 'round_robin';
    for (const [i, raw] of dropsFor(monster).entries()) {
      const item = { kind: raw.kind, id: raw.id, amount: Math.max(1, Math.min(99, Math.floor(raw.amount || 1))) };
      const rewardId = `kill:${monster.id}:${monster.deathId}:drop:${i}`;
      if (mode === 'need_greed' && party && members.length > 1) {
        const roll = { id: randomUUID(), rewardId, item, partyId: party.id, members, choices: new Map(), expiresAt: now() + ROLL_TTL_MS };
        rolls.set(roll.id, roll);
        broadcast({ type: 'loot_roll', roll_id: roll.id, reward_id: rewardId, item, expires_at: roll.expiresAt, members: members.map((m) => m.id) }, members);
      } else await roundRobin(item, members, party?.id, rewardId);
    }
    broadcast({ type: 'monster_state', id: monster.id, hp: 0, alive: false, respawn_at: monster.respawnAt });
  }

  return {
    async attack(player, monsterId) {
      const livePlayer = player?.id ? players.get(player.id) : null;
      if (!livePlayer?.userId || livePlayer !== player) throw new Error('Authenticated hunter required.');
      player = livePlayer;
      const monster = monsters.find((m) => m.id === String(monsterId));
      if (!monster || monster.dead || monster.hp <= 0) throw new Error('Monster is not alive.');
      if (monster.zone !== player.zone || distance(player, monster) > ATTACK_RANGE) throw new Error('Monster is out of range.');
      const last = cooldowns.get(player.id) || 0;
      if (now() - last < ATTACK_COOLDOWN_MS) throw new Error('Attack is not ready.');
      cooldowns.set(player.id, now());
      const damage = Math.max(1, Math.min(MAX_DAMAGE, Math.floor(Number(damageFor(player)) || 1)));
      monster.hp = Math.max(0, monster.hp - damage);
      monster.lastAttacker = player.id;
      broadcast({ type: 'monster_state', id: monster.id, hp: monster.hp, alive: monster.hp > 0 });
      if (monster.hp === 0) await kill(monster, player);
      return { monster_id: monster.id, damage, hp: monster.hp, killed: monster.hp === 0 };
    },

    async choose(player, rollId, choice) {
      const livePlayer = player?.id ? players.get(player.id) : null;
      if (!livePlayer?.userId || livePlayer !== player) throw new Error('Authenticated hunter required.');
      player = livePlayer;
      const roll = rolls.get(String(rollId));
      if (!roll || now() >= roll.expiresAt) throw new Error('Loot roll expired.');
      if (!['need', 'greed', 'pass'].includes(choice)) throw new Error('Invalid loot choice.');
      if (!roll.members.some((m) => m.id === player.id)) throw new Error('Not eligible for this roll.');
      if (roll.choices.has(player.id)) throw new Error('Choice already submitted.');
      roll.choices.set(player.id, { choice, value: choice === 'pass' ? 0 : random(), order: roll.members.findIndex((m) => m.id === player.id) });
      broadcast({ type: 'loot_roll_progress', roll_id: roll.id, submitted: roll.choices.size, total: roll.members.length }, roll.members);
      if (roll.choices.size === roll.members.length) await resolveRoll(roll);
      return { ok: true };
    },

    async tick() {
      for (const roll of [...rolls.values()]) {
        if (now() >= roll.expiresAt) {
          for (const member of roll.members) if (!roll.choices.has(member.id)) roll.choices.set(member.id, { choice: 'pass', value: 0, order: roll.members.indexOf(member) });
          await resolveRoll(roll);
        }
      }
      for (const monster of monsters) {
        if (monster.dead && monster.respawnAt && now() >= monster.respawnAt) {
          monster.hp = monster.maxHp;
          monster.dead = false;
          monster.respawnAt = 0;
          broadcast({ type: 'monster_state', id: monster.id, hp: monster.hp, alive: true });
        }
      }
    },
    async distribute(items, members, partyId, rewardPrefix) {
      const eligible = (members || []).filter((member) => member?.userId && players.get(member.id) === member);
      if (!eligible.length) throw new Error('No eligible hunters for this reward.');
      const party = partyId ? parties?.get?.(partyId) : null;
      const mode = LOOT_MODES.has(party?.loot) ? party.loot : 'round_robin';
      for (const [index, raw] of (items || []).entries()) {
        const item = {
          kind: raw.kind,
          id: String(raw.id || ''),
          amount: Math.max(1, Math.min(99, Math.floor(raw.amount || 1))),
        };
        if (item.kind === 'gold') {
          for (const member of eligible) {
            const rewardId = `${rewardPrefix}:gold:${member.userId}`;
            const result = await grant({ rewardId, kind: 'gold', id: 'gold', amount: item.amount }, member.userId);
            if (result?.granted) broadcast({ type: 'reward_update', kind: 'gold', id: 'gold', amount: item.amount }, [member]);
          }
          continue;
        }
        const rewardId = `${rewardPrefix}:item:${index}`;
        if (mode === 'need_greed' && party && eligible.length > 1) {
          const roll = {
            id: randomUUID(), rewardId, item, partyId, members: eligible,
            choices: new Map(), expiresAt: now() + ROLL_TTL_MS,
          };
          rolls.set(roll.id, roll);
          broadcast({
            type: 'loot_roll', roll_id: roll.id, reward_id: rewardId, item,
            expires_at: roll.expiresAt, members: eligible.map((member) => member.id),
          }, eligible);
        } else {
          await roundRobin(item, eligible, party?.id, rewardId);
        }
      }
      return { ok: true, items: (items || []).length };
    },
    pendingRolls: () => rolls.size,
  };
}
