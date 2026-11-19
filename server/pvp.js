import { randomBytes } from 'node:crypto';
import { ProtocolError } from './protocol.js';
import { GEAR } from '../src/data/catalog.js';

const MODES = new Set(['1v1', '2v2', '3v3']);
const GEAR_BY_ID = new Map(GEAR.map((entry) => [entry.id, entry]));
const DEFAULT_RATING = 1000;
const RATING_K = 32;
const PROPOSAL_MS = 20_000;

function isRangedWeapon(id) {
  return GEAR_BY_ID.get(id)?.item?.kind === 'ranged';
}
const ARENA = { x: 1719.5, y: 2.2, z: 819.5 };

function live(world, id) {
  const player = world.players.get(id);
  return player && !player.gone && player.authed ? player : null;
}

export function createPvpRuntime(world, opts = {}) {
  const queues = new Map([['1v1', []], ['2v2', []], ['3v3', []]]);
  const matches = new Map();
  const proposals = new Map();
  const now = opts.now || world.now;
  const send = (player, type, data = {}) => world._send(player.ws, type, data);
  const teamFor = (mode, leader) => {
    if (mode === '1v1') return [leader];
    const party = world.social.parties.partyOf(leader.id);
    if (!party || party.leader !== leader.id || party.members.length !== Number(mode[0])) {
      throw new ProtocolError('pvp_team', `Create a full ${mode} party and have its leader queue.`);
    }
    const members = party.members.map((m) => live(world, m.id));
    if (members.some((p) => !p || p.riftRunId || p.pvpMatchId || p.zone.startsWith('colosseum'))) {
      throw new ProtocolError('pvp_team', 'Every teammate must be online and free to fight.');
    }
    return members;
  };
  const releaseProposal = (proposal, message = 'Match confirmation expired. Queue again when ready.') => {
    if (!proposal || !proposals.has(proposal.id)) return false;
    proposals.delete(proposal.id);
    for (const id of proposal.players) {
      const p = live(world, id);
      if (!p || p.pvpProposalId !== proposal.id) continue;
      p.pvpProposalId = null;
      p.pvpQueued = null;
      send(p, 'pvp_queue', { mode: proposal.mode, status: 'cancelled', message });
    }
    return true;
  };
  const applyRating = (match, winner) => {
    if (match.rated) return;
    match.rated = true;
    const teamRatings = match.teams.map((team) => {
      const players = team.map((id) => live(world, id)).filter(Boolean);
      return players.length ? players.reduce((sum, p) => sum + (Number(p.pvpRating) || DEFAULT_RATING), 0) / players.length : DEFAULT_RATING;
    });
    const expectedA = 1 / (1 + (10 ** ((teamRatings[1] - teamRatings[0]) / 400)));
    const deltaA = Math.round(RATING_K * ((winner === 0 ? 1 : 0) - expectedA));
    for (let team = 0; team < 2; team++) {
      for (const id of match.teams[team]) {
        const p = live(world, id);
        if (!p) continue;
        p.pvpRating = Math.max(100, Math.min(3000, (Number(p.pvpRating) || DEFAULT_RATING) + (team === 0 ? deltaA : -deltaA)));
        p.pvpWins = Math.max(0, Number(p.pvpWins) || 0) + (team === winner ? 1 : 0);
        p.pvpLosses = Math.max(0, Number(p.pvpLosses) || 0) + (team === winner ? 0 : 1);
        world.dirty.add(p.id);
        world.persistPose(p, true);
      }
    }
  };
  const finish = (match, winner, reason = 'complete') => {
    if (match.finished || match.winner !== undefined) return;
    match.winner = winner;
    match.reason = reason;
    applyRating(match, winner);
    for (const id of match.players) {
      const p = live(world, id);
      if (p) send(p, 'pvp_result', { match_id: match.id, winner, winning_team: match.teams[winner], reason });
    }
    setTimeout(() => restore(match, winner), 8000).unref?.();
  };
  const restore = (match, winner) => {
    if (match.finished) return;
    match.finished = true;
    matches.delete(match.id);
    for (const id of match.players) {
      const p = live(world, id);
      if (!p || p.pvpMatchId !== match.id) continue;
      const previousZone = p.zone;
      const pose = p.pvpReturnPose;
      const team = p.pvpTeam;
      if (pose) Object.assign(p, pose);
      p.hp = Math.max(1, Math.min(p.maxHp || 20, p.pvpReturnHp || p.maxHp || 20));
      p.pvpMatchId = null;
      p.pvpTeam = null;
      p.pvpReturnPose = null;
      p.pvpReturnHp = null;
      p.pvpDead = false;
      p.pvpRollAt = 0;
      p.pvpInvulnUntil = 0;
      p.move = 0;
      world.dirty.add(p.id);
      world.sendSnapshot(p);
      world.social.onZone(p, previousZone);
      world.persistPose(p, true);
      send(p, 'pvp_match_end', { match_id: match.id, winner, won: winner === team, reason: match.reason || 'complete', return_pose: pose, hp: p.hp, max_hp: p.maxHp || 20, rating: p.pvpRating || DEFAULT_RATING, wins: p.pvpWins || 0, losses: p.pvpLosses || 0 });
    }
  };
  const begin = (mode, a, b) => {
    const id = randomBytes(12).toString('hex');
    const match = { id, mode, teams: [a.map(p => p.id), b.map(p => p.id)], players: [...a, ...b].map(p => p.id), startedAt: now(), finished: false, lastHit: new Map() };
    matches.set(id, match);
    for (let team = 0; team < 2; team++) {
      for (let index = 0; index < match.teams[team].length; index++) {
        const p = live(world, match.teams[team][index]);
        if (!p) continue;
        p.pvpReturnPose = { x: p.x, y: p.y, z: p.z, yaw: p.yaw, zone: p.zone };
        p.pvpReturnHp = p.hp;
        p.pvpMatchId = id;
        p.pvpQueued = null;
        p.pvpProposalId = null;
        p.pvpTeam = team;
        p.pvpDead = false;
        p.pvpRollAt = 0;
        p.pvpInvulnUntil = 0;
        p.zone = `colosseum:${id}`;
        const angle = (index / Math.max(1, match.teams[team].length)) * Math.PI * 0.55 + (team ? Math.PI : 0);
        p.x = ARENA.x + Math.cos(angle) * 8;
        p.y = ARENA.y;
        p.z = ARENA.z + Math.sin(angle) * 8;
        p.yaw = team ? 0 : Math.PI;
        p.hp = p.maxHp || 20;
        p.move = 0;
        p.anim = 0;
        world.dirty.add(p.id);
        world.sendSnapshot(p);
        send(p, 'pvp_queue', { mode, status: 'matched' });
        world.social.onZone(p, match.teams[team][index] === p.id ? p.pvpReturnPose.zone : p.zone);
        send(p, 'pvp_match_start', { match_id: id, mode, team, arena: 'Gilantre Colosseum', pose: { x: p.x, y: p.y, z: p.z, yaw: p.yaw }, hp: p.hp, max_hp: p.maxHp || 20 });
      }
    }
    return match;
  };
  const propose = (mode, a, b) => {
    const id = randomBytes(12).toString('hex');
    const proposal = { id, mode, teams: [a.slice(), b.slice()], players: [...a, ...b], accepted: new Set(), expiresAt: now() + PROPOSAL_MS };
    proposals.set(id, proposal);
    for (const playerId of proposal.players) {
      const p = live(world, playerId);
      if (!p) { releaseProposal(proposal, 'A fighter disconnected. Queue again.'); return; }
      p.pvpProposalId = id;
      send(p, 'pvp_match_found', { proposal_id: id, mode, team_size: a.length, expires_at: proposal.expiresAt });
    }
  };
  function confirm(session, proposalId, accept) {
    const proposal = proposals.get(String(proposalId || ''));
    if (!proposal || !proposal.players.includes(session.id) || session.pvpProposalId !== proposal.id) {
      throw new ProtocolError('pvp_confirm', 'That match offer is no longer available.');
    }
    if (!accept) {
      releaseProposal(proposal, 'A fighter declined the match. Queue again when ready.');
      return false;
    }
    proposal.accepted.add(session.id);
    const accepted = proposal.accepted.size;
    for (const id of proposal.players) {
      const p = live(world, id);
      if (p) send(p, 'pvp_match_confirmation', { proposal_id: proposal.id, accepted, required: proposal.players.length });
    }
    if (accepted !== proposal.players.length) return true;
    const valid = proposal.teams.every((group) => {
      const members = group.map((id) => live(world, id));
      if (members.some((p) => !p || p.pvpQueued !== proposal.mode || p.pvpProposalId !== proposal.id || p.pvpMatchId || p.riftRunId)) return false;
      try {
        const current = teamFor(proposal.mode, members[0]);
        return current.length === group.length && current.every((p) => group.includes(p.id));
      } catch { return false; }
    });
    if (!valid) {
      releaseProposal(proposal, 'A team changed before confirming. Queue again.');
      return false;
    }
    proposals.delete(proposal.id);
    for (const id of proposal.players) {
      const p = live(world, id);
      if (p) p.pvpProposalId = null;
    }
    begin(proposal.mode, proposal.teams[0].map((id) => live(world, id)), proposal.teams[1].map((id) => live(world, id)));
    return true;
  }

  const matchQueues = () => {
    const release = (mode, group) => {
      for (const id of group) {
        const p = live(world, id);
        if (!p || p.pvpQueued !== mode) continue;
        p.pvpQueued = null;
        send(p, 'pvp_queue', { mode, status: 'cancelled', message: 'Your team or activity changed before a match was found.' });
      }
    };
    const eligible = (mode, group) => {
      const members = group.map(id => live(world, id));
      if (members.some(p => !p || p.pvpQueued !== mode || p.pvpProposalId || p.pvpMatchId || p.riftRunId || p.zone.startsWith('colosseum'))) return false;
      try {
        const current = teamFor(mode, members[0]);
        return current.length === group.length && current.every(p => group.includes(p.id));
      } catch {
        return false;
      }
    };
    for (const [mode, queue] of queues) {
      for (let i = queue.length - 1; i >= 0; i--) {
        if (eligible(mode, queue[i])) continue;
        const [invalid] = queue.splice(i, 1);
        release(mode, invalid);
      }
      while (queue.length >= 2) {
        const a = queue.shift(), b = queue.shift();
        if (!eligible(mode, a) || !eligible(mode, b)) {
          release(mode, a);
          release(mode, b);
          continue;
        }
        propose(mode, a, b);
      }
    }
  };
  function enqueue(session, mode = '1v1') {
    if (!MODES.has(mode)) throw new ProtocolError('pvp_mode', 'Choose 1v1, 2v2, or 3v3.');
    if (!session.userId || session.guest) throw new ProtocolError('auth', 'Sign in to enter the Colosseum.');
    if (session.pvpMatchId || session.riftRunId || session.pvpQueued) throw new ProtocolError('pvp_state', 'You are already queued or in an activity.');
    const members = teamFor(mode, session);
    if (members.some(p => p.pvpQueued || p.pvpMatchId || p.riftRunId)) throw new ProtocolError('pvp_team', 'A teammate is already queued or in an activity.');
    if (members.some(p => p.zone.startsWith('colosseum'))) throw new ProtocolError('pvp_state', 'You are already in the Colosseum.');
    const group = members.map(p => p.id);
    queues.get(mode).push(group);
    for (const p of members) {
      p.pvpQueued = mode;
      p.pvpProposalId = null;
      send(p, 'pvp_queue', { mode, status: 'queued', party_size: group.length });
    }
    matchQueues();
    return true;
  }
  function cancel(session) {
    if (session.pvpProposalId) {
      const proposal = proposals.get(session.pvpProposalId);
      if (proposal) return releaseProposal(proposal, 'A fighter cancelled the match offer. Queue again when ready.');
    }
    let removed = false;
    for (const [mode, queue] of queues) {
      const index = queue.findIndex(group => group.includes(session.id));
      if (index >= 0) {
        const [group] = queue.splice(index, 1);
        for (const id of group) {
          const p = live(world, id);
          if (p) { p.pvpQueued = null; send(p, 'pvp_queue', { mode, status: 'cancelled' }); }
        }
        removed = true;
      }
    }
    return removed;
  }
  function attack(session, targetId) {
    const match = matches.get(session.pvpMatchId);
    const target = live(world, String(targetId || ''));
    if (!match || match.finished || match.winner !== undefined || !target || target.pvpMatchId !== match.id || target.pvpTeam === session.pvpTeam) {
      throw new ProtocolError('pvp_target', 'That opponent is not in your match.');
    }
    if (session.pvpDead || target.pvpDead) throw new ProtocolError('pvp_dead', 'You cannot attack while defeated.');
    const ranged = isRangedWeapon(session.weapon);
    const range = ranged ? 13 : 4.5;
    if (target.pvpInvulnUntil > now()) throw new ProtocolError('pvp_evade', 'Your opponent evaded the strike.');
    if (session.zone !== target.zone || Math.hypot(session.x - target.x, session.z - target.z) > range || Math.abs(session.y - target.y) > 3) {
      throw new ProtocolError('pvp_range', 'Move closer to your opponent.');
    }
    const t = now(), last = match.lastHit.get(session.id) || 0;
    if (t - last < (ranged ? 950 : 650)) throw new ProtocolError('pvp_cooldown', 'Your weapon is not ready yet.');
    match.lastHit.set(session.id, t);
    session.anim = 1;
    session.move = 0;
    world.dirty.add(session.id);
    const base = ranged ? 4 : 5;
    const armor = Object.values(target.armor || {}).filter(Boolean).length;
    const reduction = Math.min(0.3, armor * 0.04);
    const damage = Math.max(2, Math.min(12, Math.round((base + (session.weapon ? 2 : 0) + Math.floor((session.level || 1) / 10)) * (1 - reduction))));
    target.hp = Math.max(0, target.hp - damage);
    target.anim = target.hp ? 4 : 3;
    if (!target.hp) target.pvpDead = true;
    world.dirty.add(target.id);
    const frame = { match_id: match.id, attacker: session.id, target: target.id, damage, hp: target.hp, max_hp: target.maxHp || 20, defeated: target.pvpDead };
    for (const id of match.players) { const p = live(world, id); if (p) send(p, 'pvp_hit', frame); }
    const remaining = match.teams.map(team => team.some(id => { const p = live(world, id); return p && !p.pvpDead; }));
    if (!remaining[0] || !remaining[1]) {
      const winner = remaining[0] ? 0 : 1;
      finish(match, winner, 'complete');
    }
    return frame;
  }
  function roll(session) {
    const match = matches.get(session.pvpMatchId);
    if (!match || match.finished || match.winner !== undefined || session.pvpDead) throw new ProtocolError('pvp_state', 'You are not able to evade right now.');
    const t = now();
    if (t - (session.pvpRollAt || 0) < 1200) throw new ProtocolError('pvp_roll_cooldown', 'Your evade is not ready yet.');
    session.pvpRollAt = t;
    session.pvpInvulnUntil = t + 300;
    send(session, 'pvp_roll', { match_id: match.id, invulnerable_ms: 300 });
    return true;
  }

  function leave(session) {
    const match = matches.get(session.pvpMatchId);
    if (!match) return cancel(session);
    if (match.winner !== undefined) { restore(match, match.winner); return true; }
    const winner = match.teams[0].includes(session.id) ? 1 : 0;
    finish(match, winner, 'forfeit');
    restore(match, winner);
    return true;
  }
  function disconnect(session) {
    cancel(session);
    const match = matches.get(session.pvpMatchId);
    if (match) {
      const winner = match.winner !== undefined ? match.winner : (match.teams[0].includes(session.id) ? 1 : 0);
      if (match.winner === undefined) finish(match, winner, 'disconnect');
      restore(match, winner);
    }
  }
  function tick() {
    for (const proposal of proposals.values()) if (proposal.expiresAt <= now()) releaseProposal(proposal);
    matchQueues();
  }
  return { enqueue, confirm, cancel, attack, roll, leave, disconnect, tick, queues, matches, proposals };
}
