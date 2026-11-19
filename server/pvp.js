import { randomBytes } from 'node:crypto';
import { ProtocolError } from './protocol.js';

const MODES = new Set(['1v1', '2v2', '3v3']);
const ARENA = { x: 1719.5, y: 2.2, z: 819.5 };

function live(world, id) {
  const player = world.players.get(id);
  return player && !player.gone && player.authed ? player : null;
}

export function createPvpRuntime(world, opts = {}) {
  const queues = new Map([['1v1', []], ['2v2', []], ['3v3', []]]);
  const matches = new Map();
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
      p.move = 0;
      world.dirty.add(p.id);
      world.sendSnapshot(p);
      world.social.onZone(p, previousZone);
      world.persistPose(p, true);
      send(p, 'pvp_match_end', { match_id: match.id, winner, won: winner === team, reason: 'complete', return_pose: pose });
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
        p.pvpTeam = team;
        p.pvpDead = false;
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
        world.social.onZone(p, match.teams[team][index] === p.id ? p.pvpReturnPose.zone : p.zone);
        send(p, 'pvp_match_start', { match_id: id, mode, team, arena: 'Gilantre Colosseum', pose: { x: p.x, y: p.y, z: p.z, yaw: p.yaw }, hp: p.hp, max_hp: p.maxHp || 20 });
      }
    }
    return match;
  };
  const matchQueues = () => {
    for (const [mode, queue] of queues) {
      while (queue.length >= 2) {
        const a = queue.shift(), b = queue.shift();
        if (a.some(id => !live(world, id)) || b.some(id => !live(world, id))) continue;
        begin(mode, a.map(id => live(world, id)), b.map(id => live(world, id)));
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
      send(p, 'pvp_queue', { mode, status: 'queued', party_size: group.length });
    }
    matchQueues();
    return true;
  }
  function cancel(session) {
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
    if (!match || match.finished || !target || target.pvpMatchId !== match.id || target.pvpTeam === session.pvpTeam) {
      throw new ProtocolError('pvp_target', 'That opponent is not in your match.');
    }
    if (session.pvpDead || target.pvpDead) throw new ProtocolError('pvp_dead', 'You cannot attack while defeated.');
    if (session.zone !== target.zone || Math.hypot(session.x - target.x, session.z - target.z) > 4.5 || Math.abs(session.y - target.y) > 3) {
      throw new ProtocolError('pvp_range', 'Move closer to your opponent.');
    }
    const t = now(), last = match.lastHit.get(session.id) || 0;
    if (t - last < 650) throw new ProtocolError('pvp_cooldown', 'Your weapon is not ready yet.');
    match.lastHit.set(session.id, t);
    const damage = Math.max(3, Math.min(12, 5 + (session.weapon ? 2 : 0) + Math.floor((session.level || 1) / 10)));
    target.hp = Math.max(0, target.hp - damage);
    target.anim = target.hp ? 4 : 3;
    if (!target.hp) target.pvpDead = true;
    world.dirty.add(target.id);
    const frame = { match_id: match.id, attacker: session.id, target: target.id, damage, hp: target.hp, max_hp: target.maxHp || 20, defeated: target.pvpDead };
    for (const id of match.players) { const p = live(world, id); if (p) send(p, 'pvp_hit', frame); }
    const remaining = match.teams.map(team => team.some(id => { const p = live(world, id); return p && !p.pvpDead; }));
    if (!remaining[0] || !remaining[1]) {
      const winner = remaining[0] ? 0 : 1;
      for (const id of match.players) { const p = live(world, id); if (p) send(p, 'pvp_result', { match_id: match.id, winner, winning_team: match.teams[winner] }); }
      setTimeout(() => restore(match, winner), 2500).unref?.();
    }
    return frame;
  }
  function leave(session) {
    const match = matches.get(session.pvpMatchId);
    if (!match) return cancel(session);
    const winner = match.teams[0].includes(session.id) ? 1 : 0;
    for (const id of match.players) { const p = live(world, id); if (p) send(p, 'pvp_result', { match_id: match.id, winner, reason: 'forfeit' }); }
    restore(match, winner);
    return true;
  }
  function disconnect(session) {
    cancel(session);
    const match = matches.get(session.pvpMatchId);
    if (match) {
      const winner = match.teams[0].includes(session.id) ? 1 : 0;
      restore(match, winner);
    }
  }
  return { enqueue, cancel, attack, leave, disconnect, tick: matchQueues, queues, matches };
}
