import { joinRoom, selfId } from 'trystero';

export const MAX_PLAYERS = 6;
/** Guest join waits this long for the host before restoring the local hunt. */
export const JOIN_MS = 15000;
const APP = { appId: 'monster-gate-waygate' };
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function makeCode() {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  let s = '';
  for (const b of bytes) s += ALPHA[b % ALPHA.length];
  return s;
}

const r2 = (n) => Math.round(n * 100) / 100;

const STATE = { idle: 0, attack: 1, roll: 2, dead: 3, stagger: 4, use: 5 };

export function poseOf(player) {
  const realm = player.game?.world?.realm;
  const parked = realm === 'cave' ? player.game.world.cave?.outside : realm === 'rift' ? player.game.world.rift?.outside : null;
  const x = parked ? parked.x : player.pos.x;
  const y = parked ? parked.y : player.pos.y;
  const z = parked ? parked.z : player.pos.z;
  return [
    r2(x),
    r2(y),
    r2(z),
    r2(player.yaw),
    r2(player.moveAmt),
    STATE[player.state] ?? 0,
    Math.round(player.hp),
    player.heldKind || 'blade',
  ];
}

/**
 * The host's browser is the world. Friends join with a short code.
 * Matchmaking uses a public relay; the hunt itself is peer-to-peer.
 * Shared-world presentation is src/net/worldView.js, mounted from main when ?mmo=1.
 * src/net/mmo.js (not this file) owns the world socket and calls into worldView.
 */
export class Session {
  constructor(game) {
    this.game = game;
    this.role = null;
    this.code = '';
    this.name = localStorage.getItem('mg-name') || 'Hunter';
    this.room = null;
    this.peers = new Map();
    this.selfId = selfId;
    this.status = 'The waygate south of Oakhollow can open a world for your friends.';
    this.onChange = () => {};
    this.poseT = 0;
    this.worldT = 0;
    this.joinTimer = null;
  }

  clearJoinTimer() {
    if (this.joinTimer) {
      clearTimeout(this.joinTimer);
      this.joinTimer = null;
    }
  }

  failJoin() {
    this.joinTimer = null;
    if (this.role !== 'guest' || this.game.guestBound) return;
    this.status = 'The host did not answer. Your hunt is still here.';
    this.game.hud?.toast(this.status, 3200);
    this.leave();
  }

  get count() {
    return (this.role ? 1 : 0) + this.peers.size;
  }

  host(name) {
    if (this.game.wallet?.kind === 'guest') {
      this.status = 'Sign in with an account to hunt with friends.';
      this.game.hud?.toast(this.status, 2800);
      this.onChange();
      return;
    }
    this.connect('host', makeCode(), name);
  }

  join(name, code) {
    if (this.game.wallet?.kind === 'guest') {
      this.status = 'Sign in with an account to hunt with friends.';
      this.game.hud?.toast(this.status, 2800);
      this.onChange();
      return;
    }
    const clean = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    if (clean.length < 4) {
      this.status = 'Enter the 4-character code from the host.';
      this.onChange();
      return;
    }
    this.connect('guest', clean, name);
  }

  connect(role, code, name) {
    this.clearJoinTimer();
    this.leave(false);
    this.role = role;
    this.code = code;
    this.name = String(name || 'Hunter').trim().slice(0, 16) || 'Hunter';
    localStorage.setItem('mg-name', this.name);
    let room;
    try {
      room = joinRoom(APP, 'mgw-' + code);
    } catch (err) {
      this.role = null;
      this.status = 'The waygate could not open. ' + (err?.message || '');
      this.onChange();
      return;
    }
    this.room = room;
    this.poseAct = room.makeAction('pose');
    this.worldAct = room.makeAction('world');
    this.hitAct = room.makeAction('hit');
    this.hurtAct = room.makeAction('hurt');
    this.helloAct = room.makeAction('hello');
    this.fullAct = room.makeAction('full');

    room.onPeerJoin = (peerId) => {
      if (this.role === 'host' && this.peers.size >= MAX_PLAYERS - 1) {
        this.fullAct.send({ full: true }, { target: peerId }).catch(() => {});
        return;
      }
      this.peers.set(peerId, { name: 'Hunter', pose: null });
      this.helloAct.send({ role: this.role, name: this.name }, { target: peerId }).catch(() => {});
      if (this.role === 'host') this.broadcastWorld(peerId);
      this.touch();
    };
    room.onPeerLeave = (peerId) => {
      this.peers.delete(peerId);
      this.game.removeRemote(peerId);
      this.touch();
    };
    this.helloAct.onMessage = (data, { peerId }) => {
      if (data?.role === 'host' && this.role === 'host' && peerId < this.selfId) {
        this.status = 'Someone is already hosting ' + this.code + '.';
        this.game.hud.toast(this.status, 2600);
        this.leave();
        return;
      }
      const peer = this.peers.get(peerId) || { pose: null };
      peer.name = String(data?.name || 'Hunter').slice(0, 16);
      this.peers.set(peerId, peer);
      this.game.ensureRemote(peerId, peer.name);
      this.touch();
    };
    this.fullAct.onMessage = () => {
      this.status = 'That world is full (6 hunters).';
      this.game.hud.toast(this.status, 2600);
      this.leave();
    };
    this.poseAct.onMessage = (data, { peerId }) => {
      if (!Array.isArray(data)) return;
      const peer = this.peers.get(peerId);
      if (!peer) return;
      peer.pose = data;
      this.game.ensureRemote(peerId, peer.name).pushPose(data);
    };
    this.worldAct.onMessage = (data) => {
      if (this.role === 'guest') this.game.applyWorld(data);
    };
    this.hitAct.onMessage = (data, { peerId }) => {
      if (this.role !== 'host' || !data) return;
      const pose = this.peers.get(peerId)?.pose;
      if (!pose) return;
      const mon = this.game.monsters.find((m) => m.id === data.id && !m.dead);
      if (!mon) return;
      if (Math.hypot(mon.x - pose[0], mon.z - pose[2]) > 6.5) return;
      const len = Math.hypot(data.dx || 0, data.dz || 0) || 1;
      mon.takeHit(Math.round(data.dmg) || 1, (data.dx || 0) / len, (data.dz || 0) / len, data.knock || 4, !!data.crit);
    };
    this.hurtAct.onMessage = (data) => {
      if (this.role !== 'guest' || !data) return;
      this.game.player.hurt(data.dmg || 1, data.x, data.z, data.knock || 6);
    };

    this.status = role === 'host'
      ? 'You are hosting. Share the code with up to 5 friends.'
      : 'Joining world ' + code + '…';
    if (role === 'guest') {
      this.game.parkLocalHunt();
      this.joinTimer = setTimeout(() => this.failJoin(), JOIN_MS);
    }
    this.onChange();
  }

  touch() {
    if (!this.role) return;
    const others = this.peers.size;
    this.status = this.role === 'host'
      ? `Hosting ${this.code}. ${1 + others} / ${MAX_PLAYERS} hunters.`
      : `In ${this.code}. ${1 + others} / ${MAX_PLAYERS} hunters.`;
    this.onChange();
  }

  sendHurt(peerId, dmg, x, z, knock) {
    this.hurtAct?.send({ dmg, x, z, knock }, { target: peerId }).catch(() => {});
  }

  relayHit(mon, dmg, dx, dz, knock, crit) {
    if (this.role !== 'guest' || !this.hitAct) return;
    this.hitAct.send({ id: mon.id, dmg, dx, dz, knock, crit }).catch(() => {});
  }

  broadcastWorld(target) {
    if (this.role !== 'host' || !this.worldAct) return;
    const m = [];
    for (const mon of this.game.monsters) {
      if (mon.dead) continue;
      m.push([mon.id, mon.type, r2(mon.x), r2(mon.y), r2(mon.z), r2(mon.yaw), Math.round(mon.hp), mon.state]);
    }
    const opts = target ? { target } : undefined;
    const r = this.game.world?.rift;
    const run = this.game.riftRun;
    const rift = this.game.world?.realm === 'rift' && run && !run.follow
      ? { on: true, party: run.party, chest: r?.chest ? { x: r.chest.x, y: r.chest.y, z: r.chest.z } : null }
      : { on: false };
    this.worldAct.send({ m, rift }, opts).catch(() => {});
  }

  update(dt) {
    if (!this.room || !this.role) return;
    this.poseT -= dt;
    if (this.poseT <= 0) {
      this.poseT = 0.1;
      this.poseAct.send(poseOf(this.game.player)).catch(() => {});
    }
    if (this.role === 'host') {
      this.worldT -= dt;
      if (this.worldT <= 0) {
        this.worldT = 0.25;
        this.broadcastWorld();
      }
    }
  }

  leave(notify = true) {
    this.clearJoinTimer();
    const wasGuest = this.role === 'guest';
    const room = this.room;
    this.room = null;
    this.role = null;
    this.code = '';
    this.peers.clear();
    try {
      room?.leave();
    } catch {
      /* already gone */
    }
    this.game.onSessionEnd(wasGuest);
    if (notify) {
      this.status = 'The waygate is quiet.';
      this.onChange();
    }
  }
}
