import * as THREE from 'three';
import { SKILLS } from '../data/skills.js';
import { SKILLFX, fireExplosion, lightningArc, summonMeteor } from './skillfx.js';

function world(game) {
  if (!game.skillState) game.skillState = { wolf: null, clouds: [], arcs: [] };
  return game.skillState;
}

export function skillMods(game) {
  const p = game?.player;
  const pr = game?.progress;
  const has = (id) => !!(pr && pr.hasSkill && pr.hasSkill(id));
  const mods = {
    dr: 0,
    hp: 0,
    mana: 0,
    stamina: 0,
    melee: 1,
    ranged: 1,
    spell: 1,
    crit: 0,
    furyGain: 1,
    furyRegen: 0,
    manaCost: 1,
    poison: false,
    poisonBonus: 0,
    poisonTime: 0,
    burn: false,
    burnDps: 3,
    slow: false,
    slowMul: 0.6,
    slowTime: 3,
    chain: 0,
    deadeye: false,
    wolf: 1,
    wolfHeal: 0,
    speed: 1,
    knock: 1,
    blockDr: 0,
    flatRanged: 0,
    pierce: false,
    haste: 0,
  };
  if (!p || !pr) return mods;
  if (has('fortify')) {
    mods.dr += p.shielding ? 0.22 : 0.1;
    mods.hp += 10;
  }
  if (has('bloodlust')) {
    mods.furyGain += 1;
    mods.melee *= 1 + 0.35 * (p.fury / 100);
  }
  if (has('savage')) {
    mods.melee *= 1.2;
    mods.hp += 8;
  }
  if (has('bond')) {
    mods.wolf = 1.4;
    mods.wolfHeal = 1;
  }
  if (has('venom')) mods.poison = true;
  if (has('deadeye')) mods.deadeye = true;
  if (has('kindle')) {
    mods.burn = true;
    mods.mana += 10;
  }
  if (has('hoarfrost')) mods.slow = true;
  if (has('static')) mods.chain = 0.25;
  if (p.warcryT > 0) mods.melee *= 1.3;
  if (p.packT > 0) mods.melee *= 1.4;
  if (has('brace')) mods.hp += 6;
  if (has('thickhide')) mods.hp += 12;
  if (has('rampage')) mods.melee *= 1.1;
  if (has('alpha')) {
    mods.wolf = 1.8;
    mods.wolfHeal = 2;
  }
  if (has('concentrated')) {
    mods.poisonBonus += 3;
    mods.poisonTime += 2;
  }
  if (has('immolate')) mods.burnDps = 5;
  if (has('deepfreeze')) {
    mods.slowMul = 0.4;
    mods.slowTime = 4.5;
  }
  if (has('overcharge')) mods.chain = Math.max(mods.chain, 0.4);
  const rank = (id) => pr.attrRank(id);
  mods.hp += rank('vitality') * 4;
  mods.melee *= 1 + rank('might') * 0.06;
  mods.dr += rank('guard') * 0.03;
  mods.furyGain *= 1 + rank('wrath') * 0.1;
  mods.furyRegen += rank('wrath') * 0.45;
  mods.stamina += rank('endurance') * 8;
  mods.ranged *= 1 + rank('precision') * 0.06;
  mods.crit += rank('agility') * 0.03;
  mods.poisonBonus += rank('toxin');
  mods.mana += rank('spiritwell') * 6;
  mods.spell *= 1 + rank('arcana') * 0.06;
  mods.manaCost = Math.max(0.55, 1 - rank('focus') * 0.06);
  const pot = rank('potency');
  mods.burnDps += pot;
  mods.slowMul = Math.max(0.25, mods.slowMul - pot * 0.03);
  mods.slowTime += pot * 0.4;
  mods.chain += pot * 0.04;
  const gear = pr.gearBonus;
  mods.stamina += gear.stamina;
  mods.spell *= 1 + gear.spell;
  mods.ranged *= 1 + gear.ranged;
  mods.crit += gear.crit;
  const style = heldItem(game)?.style;
  const bookActive = pr.bookWorn && (style === 'staff' || style === 'wand');
  const wr = (id) => (style === id || (id === 'tome' && bookActive) ? pr.weaponRank(id) : 0);
  const sword = wr('swordshield');
  const two = wr('twohand');
  const dual = wr('dual');
  const shortbow = wr('shortbow');
  const longbow = wr('longbow');
  const crossbow = wr('crossbow');
  const staff = wr('staff');
  const wand = wr('wand');
  const tome = wr('tome');
  mods.melee *= (1 + sword * 0.08) * (1 + two * 0.1) * (1 + dual * 0.06);
  mods.ranged *= (1 + shortbow * 0.06) * (1 + longbow * 0.1) * (1 + crossbow * 0.08);
  mods.spell *= (1 + staff * 0.08) * (1 + wand * 0.05) * (1 + tome * 0.07);
  mods.knock = 1 + two * 0.12;
  mods.blockDr = sword * 0.04;
  mods.flatRanged = crossbow * 2;
  mods.pierce = crossbow > 0;
  mods.crit += dual * 0.03 + longbow * 0.04 + tome * 0.03;
  mods.mana += staff * 4 + tome * 6;
  mods.speed *= Math.max(0.7, 1 - dual * 0.07) * Math.max(0.7, 1 - shortbow * 0.07) * Math.max(0.75, 1 - wand * 0.06);
  mods.haste = wand * 0.05;
  if (wand) mods.manaCost *= Math.max(0.75, 1 - wand * 0.05);
  return mods;
}

function heldItem(game) {
  const items = game?.items;
  if (!items || game.sel == null) return null;
  return items[game.sel] || null;
}

export function scaleDmg(game, amount, kind) {
  const mods = skillMods(game);
  const mul = kind === 'spell' ? mods.spell : kind === 'ranged' ? mods.ranged : mods.melee;
  return Math.max(1, Math.round((amount || 0) * (mul || 1)));
}

export function resourceCost(game, skill) {
  const mods = skillMods(game);
  let cost = skill.resource || 0;
  if (skill.res === 'mana') cost = Math.max(1, Math.round(cost * (mods.manaCost ?? 1)));
  if (skill.res === 'fury' && game.progress.hasSkill('brace') && skill.id === 'shieldbash') cost = Math.max(8, cost - 6);
  if (skill.res === 'fury' && game.progress.hasSkill('rampage') && (skill.id === 'whirlwind' || skill.id === 'execute')) cost = Math.max(10, cost - 6);
  return cost;
}

function pay(game, skill) {
  const p = game.player;
  const cost = resourceCost(game, skill);
  if (skill.res === 'fury') p.fury -= cost;
  else if (skill.res === 'mana') p.mana -= cost;
  else if (skill.res === 'stamina') {
    p.stamina -= cost;
    p.stamDelay = 0.6;
  }
}

function canPay(game, skill) {
  const p = game.player;
  const cost = resourceCost(game, skill);
  if (skill.res === 'fury') return p.fury >= cost;
  if (skill.res === 'mana') return p.mana >= cost;
  if (skill.res === 'stamina') return p.stamina >= cost;
  return true;
}

function poorToast(game, skill) {
  if (skill.res === 'fury') game.hud.toast('Not enough fury.');
  else if (skill.res === 'mana') game.hud.toast('Not enough spirit.');
  else game.hud.toast('Out of breath.');
}

export function castSkill(game, id) {
  const skill = SKILLS[id];
  const p = game.player;
  if (!skill || skill.kind === 'passive') return false;
  if (!game.progress.hasSkill(id)) return false;
  if (p.dead || p.state === 'roll' || p.state === 'stagger') return false;
  if ((p.cds[id] || 0) > 0) {
    game.hud.toast('Not ready.');
    return false;
  }
  if (!canPay(game, skill)) {
    poorToast(game, skill);
    return false;
  }
  if (!effect(game, skill)) return false;
  pay(game, skill);
  const haste = skillMods(game).haste || 0;
  p.cds[id] = (skill.cd || 1) * Math.max(0.7, 1 - haste);
  game.hud.floatText(...game.screenOf(p.pos.x, p.pos.y + 2.15, p.pos.z), skill.name, 'gold');
  return true;
}

function effect(game, s) {
  switch (s.id) {
    case 'shieldbash':
      return shieldBash(game, s);
    case 'bulwark':
      return bulwark(game, s);
    case 'whirlwind':
      return whirlwind(game, s);
    case 'execute':
      return execute(game, s);
    case 'leap':
      return leap(game, s);
    case 'warcry':
      return warCry(game, s);
    case 'callwolf':
      return callWolf(game, s);
    case 'packtactics':
      return packTactics(game, s);
    case 'poisonvolley':
      return poisonVolley(game, s);
    case 'toxiccloud':
      return toxicCloud(game, s);
    case 'aimedshot':
      return aimedShot(game, s);
    case 'markedprey':
      return markedPrey(game, s);
    case 'fireball':
      return fireball(game, s);
    case 'flamewave':
      return flameWave(game, s);
    case 'frostbolt':
      return frostBolt(game, s);
    case 'icenova':
      return iceNova(game, s);
    case 'spark':
      return spark(game, s);
    case 'chainlightning':
      return chainLightning(game, s);
    case 'ironcitadel':
      return ironCitadel(game, s);
    case 'bloodstorm':
      return bloodstorm(game, s);
    case 'earthquake':
      return earthquake(game, s);
    case 'howl':
      return howl(game, s);
    case 'plaguearrow':
      return plagueArrow(game, s);
    case 'snipe':
      return snipe(game, s);
    case 'meteor':
      return meteor(game, s);
    case 'glacier':
      return glacier(game, s);
    case 'thunderclap':
      return thunderclap(game, s);
    default:
      return false;
  }
}

function eachMonster(game, fn) {
  let n = 0;
  for (const mon of game.monsters) {
    if (!mon || mon.dead) continue;
    fn(mon);
    n++;
  }
  return n;
}

function coneHit(game, reach, dotMin, dmg, knock, fn, kind = 'melee') {
  const p = game.player;
  const f = p.facing;
  const dealt = scaleDmg(game, dmg, kind);
  let n = 0;
  eachMonster(game, (mon) => {
    const dx = mon.x - p.pos.x;
    const dz = mon.z - p.pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist > reach + (mon.radius || 0.5)) return;
    const dot = (dx * f.x + dz * f.z) / (dist || 1);
    if (dist > 0.45 && dot < dotMin) return;
    game.strikeMonster(mon, dealt, f.x, f.z, knock, false);
    if (fn) fn(mon);
    n++;
  });
  return n;
}

function radiusHit(game, x, z, radius, dmg, knock, fn, kind = 'melee') {
  const dealt = dmg > 0 ? scaleDmg(game, dmg, kind) : 0;
  let n = 0;
  eachMonster(game, (mon) => {
    const dx = mon.x - x;
    const dz = mon.z - z;
    const dist = Math.hypot(dx, dz);
    if (dist > radius + (mon.radius || 0.4) * 0.4) return;
    if (dealt > 0) game.strikeMonster(mon, dealt, dx / (dist || 1), dz / (dist || 1), knock, false);
    if (fn) fn(mon);
    n++;
  });
  return n;
}

function nearest(game, x, z, range, skip) {
  let best = null;
  let bd = range;
  for (const mon of game.monsters) {
    if (!mon || mon.dead || (skip && skip.has(mon))) continue;
    const d = Math.hypot(mon.x - x, mon.z - z);
    if (d <= bd) {
      bd = d;
      best = mon;
    }
  }
  return best;
}

function shieldBash(game, s) {
  const p = game.player;
  const braced = game.progress.hasSkill('brace');
  p.playCast('bash', 0.32);
  const n = coneHit(game, s.reach, s.dot, s.power + (braced ? 4 : 0), s.knock, (mon) => {
    if (!mon.dead) mon.afflict('stun', s.stun + (braced ? 0.4 : 0));
  });
  SKILLFX.shieldbash(game, p, n, s.reach);
  game.audio.tone(n ? 180 : 240, 0.12, 'square', 0.1, n ? -40 : -120);
  if (n) game.shake(0.16);
  return true;
}

function bulwark(game, s) {
  const p = game.player;
  p.bulwarkT = s.dur;
  p.playCast('cast', 0.3);
  SKILLFX.bulwark(game, p, s.dur);
  game.audio.tone(140, 0.2, 'square', 0.1, 30);
  return true;
}

function whirlwind(game, s) {
  const p = game.player;
  p.playCast('spin', 0.4);
  const reach = s.radius + (game.progress.hasSkill('rampage') ? 0.5 : 0);
  const n = radiusHit(game, p.pos.x, p.pos.z, reach, s.power, 5);
  SKILLFX.whirlwind(game, p, reach);
  game.audio.tone(220, 0.16, 'sawtooth', 0.09, -80);
  if (n) game.shake(0.2);
  return true;
}

function execute(game, s) {
  const p = game.player;
  p.playCast('bash', 0.34);
  const f = p.facing;
  let n = 0;
  let anyFinisher = false;
  eachMonster(game, (mon) => {
    const dx = mon.x - p.pos.x;
    const dz = mon.z - p.pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist > s.reach + (mon.radius || 0.5)) return;
    const dot = (dx * f.x + dz * f.z) / (dist || 1);
    if (dist > 0.45 && dot < s.dot) return;
    const finisher = mon.hp < mon.maxHp * (game.progress.hasSkill('rampage') ? 0.5 : 0.4);
    if (finisher) anyFinisher = true;
    const raw = finisher ? Math.round(s.power * 2.4) : s.power;
    game.strikeMonster(mon, scaleDmg(game, raw, 'melee'), f.x, f.z, 6, finisher);
    n++;
  });
  SKILLFX.execute(game, p, anyFinisher, n);
  game.audio.tone(110, 0.16, 'sawtooth', 0.11, -60);
  if (n) game.shake(0.22);
  return true;
}

function leap(game, s) {
  const p = game.player;
  p.playCast('slam', 0.45);
  p.vy = 8.5;
  p.pos.y += 0.3;
  p.leapT = 0.48;
  p.leapArm = true;
  SKILLFX.leapStart(game, p);
  p.leapDir.copy(p.facing);
  const hide = game.progress.hasSkill('thickhide');
  p.leapPower = s.power + (hide ? 6 : 0);
  p.leapRadius = s.radius + (hide ? 0.5 : 0);
  game.audio.tone(300, 0.12, 'triangle', 0.08, 180);
  return true;
}

export function leapImpact(game) {
  const p = game.player;
  const r = p.leapRadius || 2.4;
  const dmg = p.leapPower || 14;
  SKILLFX.leapImpact(game, p.pos.x, p.pos.y, p.pos.z, r);
  game.shake(0.32);
  radiusHit(game, p.pos.x, p.pos.z, r, dmg, 7);
}

function warCry(game, s) {
  const p = game.player;
  p.warcryT = s.dur;
  p.playCast('cast', 0.36);
  radiusHit(game, p.pos.x, p.pos.z, s.radius, 0, 0, (mon) => {
    if (!mon.dead) mon.afflict('stun', s.stun);
  });
  SKILLFX.warcry(game, p, s.radius, s.dur);
  game.audio.tone(90, 0.28, 'sawtooth', 0.14, 40);
  game.shake(0.18);
  return true;
}

function callWolf(game, s) {
  const p = game.player;
  p.playCast('cast', 0.3);
  const had = !!world(game).wolf;
  summonWolf(game, (s.dur || 30) + (game.progress.hasSkill('alpha') ? 12 : 0));
  const w = world(game).wolf;
  if (w && !had) SKILLFX.callwolf(game, w.x, w.y, w.z);
  else if (w) SKILLFX.callwolf(game, w.x, w.y, w.z);
  game.audio.tone(420, 0.16, 'square', 0.08, -60);
  return true;
}

function packTactics(game, s) {
  const p = game.player;
  p.packT = s.dur;
  p.playCast('cast', 0.28);
  const st = world(game);
  if (!st.wolf) game.hud.toast('No companion to rally.');
  else st.wolf.lunge = 0.45;
  SKILLFX.packtactics(game, p, st.wolf, s.dur);
  game.audio.tone(360, 0.12, 'square', 0.08, 40);
  return true;
}

function poisonVolley(game, s) {
  const p = game.player;
  p.playCast('cast', 0.28);
  const f = p.facing;
  const base = Math.atan2(f.x, f.z);
  for (let i = -1; i <= 1; i++) {
    const yaw = base + i * 0.14;
    const dx = Math.sin(yaw);
    const dz = Math.cos(yaw);
    game.spawnProjectile({
      owner: 'player',
      kind: 'arrow',
      skill: 'poisonvolley',
      x: p.pos.x + dx * 0.5,
      y: p.pos.y + 1.15,
      z: p.pos.z + dz * 0.5,
      vx: dx * 18,
      vz: dz * 18,
      dmg: s.power,
      life: 1.2,
      r: 0.35,
    });
  }
  SKILLFX.poisonvolley(game, p);
  game.audio.tone(700, 0.1, 'triangle', 0.08, -300);
  return true;
}

function toxicCloud(game, s) {
  const p = game.player;
  p.playCast('cast', 0.3);
  const f = p.facing;
  const x = p.pos.x + f.x * 3;
  const z = p.pos.z + f.z * 3;
  const y = game.world.heightAt(x, z);
  const mesh = new THREE.Group();
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(s.radius, 18),
    new THREE.MeshBasicMaterial({ color: 0x4aa83a, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.06;
  const rim = new THREE.Mesh(
    new THREE.RingGeometry(s.radius * 0.9, s.radius, 24),
    new THREE.MeshBasicMaterial({ color: 0x9aff6a, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })
  );
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = 0.07;
  mesh.add(disc, rim);
  mesh.position.set(x, y, z);
  game.scene.add(mesh);
  game.vfx.ring(x, y + 0.1, z, { color: 0x8fe35a, r0: 0.3, r1: s.radius * 1.3, life: 0.45, thick: 0.1, fill: 0.2 });
  game.vfx.glow(x, y + 0.7, z, 0x8fe35a, s.radius * 2.4, 0.5, { grow: 0.5, gain: 0.7 });
  game.vfx.sparks(x, y + 0.3, z, [0xd7ffb0, 0x8fe35a, 0x4aa83a], 16, 3, 0.08, 0.8, -0.5, 1, 0.8);
  const st = world(game);
  st.clouds.push({ x, z, y, r: s.radius, t: s.dur, acc: 0, dps: s.dps, slow: s.slow, mesh });
  if (st.clouds.length > 3) {
    const old = st.clouds.shift();
    dropCloud(game, old);
  }
  game.audio.tone(260, 0.16, 'sine', 0.08, -40);
  return true;
}

function aimedShot(game, s) {
  const p = game.player;
  p.playCast('cast', 0.3);
  const shot = consumeAim(game, s.power);
  const f = p.facing;
  game.spawnProjectile({
    owner: 'player',
    kind: 'arrow',
    skill: 'aimedshot',
    x: p.pos.x + f.x * 0.55,
    y: p.pos.y + 1.2,
    z: p.pos.z + f.z * 0.55,
    vx: f.x * 28,
    vz: f.z * 28,
    dmg: shot.dmg,
    crit: shot.crit,
    life: 1.6,
    r: 0.3,
    pierce: true,
  });
  SKILLFX.aimedshot(game, p);
  game.audio.tone(980, 0.09, 'triangle', 0.1, -400);
  return true;
}

function markedPrey(game, s) {
  const p = game.player;
  const mon = nearest(game, p.pos.x, p.pos.z, s.range);
  if (!mon) {
    game.hud.toast('No prey in sight.');
    return false;
  }
  p.playCast('cast', 0.24);
  mon.afflict('mark', s.dur, game.progress.hasSkill('killshot') ? 0.7 : s.amp);
  SKILLFX.markedprey(game, p, mon);
  game.hud.floatText(...game.screenOf(mon.x, mon.y + 2, mon.z), 'Marked', 'crit');
  game.audio.tone(640, 0.1, 'square', 0.07, 80);
  return true;
}

function fireball(game, s) {
  const p = game.player;
  p.playCast('cast', 0.3);
  const f = p.facing;
  game.spawnProjectile({
    owner: 'player',
    kind: 'ember',
    skill: 'fireball',
    spell: true,
    splash: s.splash + (game.progress.hasSkill('immolate') ? 6 : 0),
    radius: s.radius,
    x: p.pos.x + f.x * 0.6,
    y: p.pos.y + 1.2,
    z: p.pos.z + f.z * 0.6,
    vx: f.x * 14,
    vz: f.z * 14,
    dmg: s.power,
    life: 1.4,
    r: 0.45,
  });
  SKILLFX.fireball(game, p);
  game.audio.tone(240, 0.14, 'sawtooth', 0.09, -80);
  return true;
}

function flameWave(game, s) {
  const p = game.player;
  p.playCast('cast', 0.34);
  const n = coneHit(game, s.reach, s.dot, s.power, 4, (mon) => applyBurn(game, mon, 4), 'spell');
  const f = p.facing;
  SKILLFX.flamewave(game, p, s.reach);
  game.audio.tone(180, 0.18, 'sawtooth', 0.1, -40);
  if (n) game.shake(0.16);
  return true;
}

function frostBolt(game, s) {
  const p = game.player;
  p.playCast('cast', 0.26);
  const f = p.facing;
  game.spawnProjectile({
    owner: 'player',
    kind: 'frost',
    skill: 'frostbolt',
    spell: true,
    x: p.pos.x + f.x * 0.6,
    y: p.pos.y + 1.15,
    z: p.pos.z + f.z * 0.6,
    vx: f.x * 16,
    vz: f.z * 16,
    dmg: s.power,
    life: 1.3,
    r: 0.42,
  });
  SKILLFX.frostbolt(game, p);
  game.audio.tone(520, 0.1, 'triangle', 0.08, 120);
  return true;
}

function iceNova(game, s) {
  const p = game.player;
  p.playCast('cast', 0.32);
  radiusHit(game, p.pos.x, p.pos.z, s.radius, s.power, 4, (mon) => {
    if (mon.dead) return;
    if (mon.slowT > 0) mon.afflict('stun', game.progress.hasSkill('deepfreeze') ? 1.4 : 1.1);
    else applySlow(game, mon, 3, 0.55);
  }, 'spell');
  SKILLFX.icenova(game, p, s.radius);
  game.audio.tone(680, 0.16, 'triangle', 0.09, -200);
  return true;
}

function spark(game, s) {
  const p = game.player;
  p.playCast('cast', 0.22);
  const f = p.facing;
  game.spawnProjectile({
    owner: 'player',
    kind: 'bolt',
    skill: 'spark',
    spell: true,
    x: p.pos.x + f.x * 0.55,
    y: p.pos.y + 1.15,
    z: p.pos.z + f.z * 0.55,
    vx: f.x * 26,
    vz: f.z * 26,
    dmg: s.power,
    life: 0.7,
    r: 0.35,
  });
  SKILLFX.spark(game, p);
  game.audio.tone(880, 0.06, 'square', 0.07, -200);
  return true;
}

function chainLightning(game) {
  const p = game.player;
  const powers = [11, 8, 6, 5];
  let cur = nearest(game, p.pos.x, p.pos.z, 12);
  if (!cur) {
    game.hud.toast('No target for the storm.');
    return false;
  }
  p.playCast('cast', 0.3);
  const seen = new Set();
  let x = p.pos.x;
  let y = p.pos.y + 1.2;
  let z = p.pos.z;
  const mods = skillMods(game);
  const bonus = game.progress.hasSkill('overcharge') ? 3 : 0;
  for (const dmg of powers) {
    if (!cur || cur.dead) break;
    seen.add(cur);
    lightningArc(game, { x, y, z }, { x: cur.x, y: cur.y + 0.9 + (cur.hover || 0), z: cur.z });
    game.strikeMonster(cur, scaleDmg(game, dmg + bonus, 'spell'), 0.2, 1, 3, false);
    if (!cur.dead && mods.burn) applyBurn(game, cur, 4);
    x = cur.x;
    y = cur.y + 1;
    z = cur.z;
    cur = nearest(game, cur.x, cur.z, 5.5, seen);
  }
  game.audio.tone(760, 0.14, 'sawtooth', 0.1, 200);
  game.shake(0.12);
  return true;
}

function ironCitadel(game) {
  const p = game.player;
  p.ironHits = 3;
  p.ironT = 6;
  p.playCast('cast', 0.3);
  SKILLFX.ironcitadel(game, p, 6);
  game.audio.tone(120, 0.18, 'square', 0.1, 20);
  return true;
}

function bloodstorm(game) {
  const p = game.player;
  const dmg = 8 + Math.round(p.fury / 8);
  p.playCast('spin', 0.4);
  const n = radiusHit(game, p.pos.x, p.pos.z, 3.4, dmg, 6);
  SKILLFX.bloodstorm(game, p, 3.4);
  game.audio.tone(160, 0.18, 'sawtooth', 0.1, -40);
  if (n) game.shake(0.24);
  return true;
}

function earthquake(game) {
  const p = game.player;
  p.playCast('slam', 0.34);
  const n = radiusHit(game, p.pos.x, p.pos.z, 3.6, 16, 7, (mon) => {
    if (!mon.dead) mon.afflict('stun', 0.6);
  });
  SKILLFX.earthquake(game, p, 3.6);
  game.audio.tone(70, 0.22, 'sawtooth', 0.12, -20);
  if (n) game.shake(0.28);
  return true;
}

function howl(game) {
  const p = game.player;
  p.playCast('cast', 0.28);
  radiusHit(game, p.pos.x, p.pos.z, 4.5, 8, 3);
  p.stamina = Math.min(p.maxStamina, p.stamina + 16);
  const wolf = world(game).wolf;
  if (wolf) wolf.bite = 0;
  SKILLFX.howl(game, p, wolf, 4.5);
  game.audio.tone(280, 0.2, 'sawtooth', 0.1, -30);
  return true;
}

function plagueArrow(game) {
  const p = game.player;
  p.playCast('cast', 0.28);
  const f = p.facing;
  game.spawnProjectile({
    owner: 'player',
    kind: 'arrow',
    skill: 'plaguearrow',
    x: p.pos.x + f.x * 0.55,
    y: p.pos.y + 1.2,
    z: p.pos.z + f.z * 0.55,
    vx: f.x * 22,
    vz: f.z * 22,
    dmg: 12,
    life: 1.4,
    r: 0.32,
    pierce: true,
  });
  SKILLFX.plaguearrow(game, p);
  game.audio.tone(540, 0.1, 'triangle', 0.08, -200);
  return true;
}

function snipe(game) {
  const p = game.player;
  p.playCast('cast', 0.32);
  const shot = consumeAim(game, 18);
  const f = p.facing;
  game.spawnProjectile({
    owner: 'player',
    kind: 'arrow',
    skill: 'snipe',
    x: p.pos.x + f.x * 0.55,
    y: p.pos.y + 1.25,
    z: p.pos.z + f.z * 0.55,
    vx: f.x * 32,
    vz: f.z * 32,
    dmg: shot.dmg,
    crit: shot.crit,
    life: 1.5,
    r: 0.28,
    pierce: true,
  });
  SKILLFX.snipe(game, p);
  game.audio.tone(1100, 0.08, 'triangle', 0.1, -500);
  return true;
}

function meteor(game) {
  const p = game.player;
  p.playCast('cast', 0.34);
  const f = p.facing;
  const extra = game.progress.hasSkill('immolate') ? 6 : 0;
  const prey = nearest(game, p.pos.x + f.x * 4, p.pos.z + f.z * 4, 11);
  const tx = prey ? prey.x : p.pos.x + f.x * 6.5;
  const tz = prey ? prey.z : p.pos.z + f.z * 6.5;
  const h = p.model?.heldSlot ? p.pos : p.pos;
  game.vfx.glow(h.x, h.y + 2.2, h.z, 0xff7a1a, 3, 0.4, { grow: 0.6 });
  game.vfx.ring(h.x, h.y + 0.1, h.z, { color: 0xff7a1a, r0: 0.3, r1: 1.8, life: 0.4, thick: 0.12 });
  summonMeteor(game, tx, tz, () => {
    radiusHit(game, tx, tz, 3.1, 24 + extra, 7, (mon) => applyBurn(game, mon, 4), 'spell');
    game.shake(0.5);
    game.hitstop(0.06);
    game.audio.tone(60, 0.3, 'sawtooth', 0.14, -20);
  });
  game.audio.tone(160, 0.2, 'sawtooth', 0.1, -60);
  return true;
}

function glacier(game) {
  const p = game.player;
  p.playCast('cast', 0.32);
  const n = coneHit(game, 4.2, 0.15, 11, 4, (mon) => applySlow(game, mon, 4, 0.4), 'spell');
  const f = p.facing;
  SKILLFX.glacier(game, p, 4.2);
  game.audio.tone(420, 0.16, 'triangle', 0.09, 80);
  if (n) game.shake(0.14);
  return true;
}

function thunderclap(game) {
  const p = game.player;
  p.playCast('cast', 0.28);
  const n = radiusHit(game, p.pos.x, p.pos.z, 3.4, 13, 5, (mon) => {
    if (!mon.dead) mon.afflict('stun', 0.35);
  }, 'spell');
  SKILLFX.thunderclap(game, p, 3.4);
  game.audio.tone(640, 0.14, 'sawtooth', 0.1, 160);
  if (n) game.shake(0.2);
  return true;
}

function applyPoison(game, mon, time, dps) {
  if (!mon || mon.dead) return;
  const mods = skillMods(game);
  mon.afflict('poison', time + (mods.poisonTime || 0), dps + (mods.poisonBonus || 0));
}

function applyBurn(game, mon, time) {
  if (!mon || mon.dead) return;
  mon.afflict('burn', time, skillMods(game).burnDps || 3);
}

function applySlow(game, mon, time, mul) {
  if (!mon || mon.dead) return;
  const mods = skillMods(game);
  mon.afflict('slow', Math.max(time, mods.slowTime || time), Math.min(mul, mods.slowMul ?? mul));
}

function consumeAim(game, base) {
  const p = game.player;
  if (skillMods(game).deadeye && p.stillT > 0.7) {
    p.stillT = 0;
    game.hud.floatText(...game.screenOf(p.pos.x, p.pos.y + 2.3, p.pos.z), 'Aimed', 'crit');
    return { dmg: Math.round(base * 1.8), crit: true };
  }
  return { dmg: base, crit: false };
}

export function skillOnHit(game, proj, mon) {
  if (!mon || mon.dead) return;
  const id = proj.skill;
  if (id === 'poisonvolley') applyPoison(game, mon, 4, 4);
  if (id === 'plaguearrow') applyPoison(game, mon, 6, 8);
  if (id === 'fireball' || id === 'meteor') applyBurn(game, mon, 4);
  if (id === 'frostbolt') applySlow(game, mon, 3.5, 0.55);
  if (id === 'snipe') mon.afflict('mark', 6, game.progress.hasSkill('killshot') ? 0.7 : 0.4);
  const mods = skillMods(game);
  if (proj.spell && mods.burn) applyBurn(game, mon, 4);
  if (proj.spell && mods.slow) applySlow(game, mon, 3, 0.6);
  if (!proj.spell && mods.poison && (proj.kind === 'arrow' || proj.kind === 'stone' || proj.kind === 'crescent' || proj.kind === 'gloom')) {
    applyPoison(game, mon, 4, 4);
  }
  if (proj.spell && mods.chain && !proj.chained && Math.random() < mods.chain) {
    proj.chained = true;
    const bonus = game.progress.hasSkill('overcharge') ? 3 : 0;
    jumpLightning(game, mon, scaleDmg(game, Math.max(1, Math.round((proj.dmg || 6) * 0.5)) + bonus, 'spell'));
  }
  if (proj.splash && !proj.splashed) {
    proj.splashed = true;
    explode(game, proj);
  }
}

export function noteProjectileEnd(game, proj) {
  if (proj.splash && !proj.splashed) {
    proj.splashed = true;
    explode(game, proj);
  }
}

function explode(game, proj) {
  const m = proj.mesh.position;
  const r = proj.radius || 2.2;
  fireExplosion(game, m.x, m.y, m.z, r);
  game.shake(0.14);
  eachMonster(game, (mon) => {
    if (proj.hit && proj.hit.has(mon)) return;
    const dx = mon.x - m.x;
    const dz = mon.z - m.z;
    const dist = Math.hypot(dx, dz);
    if (dist > r + (mon.radius || 0.4) * 0.3) return;
    game.strikeMonster(mon, scaleDmg(game, proj.splash || 8, 'spell'), dx / (dist || 1), dz / (dist || 1), 5, false);
    if (!mon.dead && (proj.skill === 'fireball' || proj.skill === 'meteor')) applyBurn(game, mon, 4);
  });
}

function jumpLightning(game, from, dmg) {
  const next = nearest(game, from.x, from.z, 5, new Set([from]));
  if (!next) return;
  lightningArc(game, { x: from.x, y: from.y + 1, z: from.z }, { x: next.x, y: next.y + 1, z: next.z });
  game.strikeMonster(next, dmg, 0.2, 1, 2, false);
  const mods = skillMods(game);
  if (!next.dead && mods.burn) applyBurn(game, next, 4);
}

function summonWolf(game, dur) {
  const st = world(game);
  if (st.wolf) {
    st.wolf.life = dur;
    return;
  }
  const mesh = buildWolf();
  game.scene.add(mesh);
  const p = game.player;
  st.wolf = {
    mesh,
    x: p.pos.x + 1.2,
    z: p.pos.z,
    y: p.pos.y,
    yaw: p.yaw,
    bite: 0.35,
    life: dur,
    lunge: 0,
    legs: mesh.userData.legs,
    parts: mesh.userData,
    vx: 0,
    vz: 0,
    gait: 0,
    vyaw: p.yaw,
    pitch: 0,
    ay: 0,
  };
}

function buildWolf() {
  const g = new THREE.Group();
  const fur = new THREE.MeshToonMaterial({ color: 0x8d929c });
  const light = new THREE.MeshToonMaterial({ color: 0xc4c8d0 });
  const dark = new THREE.MeshToonMaterial({ color: 0x2e323a });
  const cloth = new THREE.MeshToonMaterial({ color: 0x2f7f5a });
  const eye = new THREE.MeshBasicMaterial({ color: 0xffd25a });
  const bodyG = new THREE.Group();
  bodyG.position.y = 0.5;
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.84), fur);
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.34), fur);
  chest.position.set(0, 0.02, 0.26);
  const belly = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.6), light);
  belly.position.set(0, -0.15, 0.0);
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.16), cloth);
  band.position.set(0, 0.02, 0.1);
  bodyG.add(body, chest, belly, band);

  const headG = new THREE.Group();
  headG.position.set(0, 0.1, 0.46);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.26, 0.3), fur);
  head.position.set(0, 0.05, 0.1);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.22), light);
  snout.position.set(0, -0.01, 0.34);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.05), dark);
  nose.position.set(0, 0.02, 0.46);
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.06, 0.28);
  const jawM = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.2), dark);
  jawM.position.z = 0.1;
  jaw.add(jawM);
  const earGeo = new THREE.BoxGeometry(0.08, 0.17, 0.07);
  const earL = new THREE.Mesh(earGeo, dark);
  earL.position.set(0.1, 0.22, 0.04);
  const earR = new THREE.Mesh(earGeo, dark);
  earR.position.set(-0.1, 0.22, 0.04);
  const eyeGeo = new THREE.BoxGeometry(0.05, 0.04, 0.03);
  const eyeL = new THREE.Mesh(eyeGeo, eye);
  eyeL.position.set(0.09, 0.1, 0.26);
  const eyeR = new THREE.Mesh(eyeGeo, eye);
  eyeR.position.set(-0.09, 0.1, 0.26);
  headG.add(head, snout, nose, jaw, earL, earR, eyeL, eyeR);
  bodyG.add(headG);

  const tail = new THREE.Group();
  tail.position.set(0, 0.1, -0.42);
  const t1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.22), dark);
  t1.position.z = -0.1;
  const t2G = new THREE.Group();
  t2G.position.z = -0.2;
  const t2 = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.2), light);
  t2.position.z = -0.1;
  t2G.add(t2);
  tail.add(t1, t2G);
  tail.rotation.x = -0.5;
  bodyG.add(tail);
  g.add(bodyG);

  const legGeo = new THREE.BoxGeometry(0.1, 0.17, 0.1);
  const lowGeo = new THREE.BoxGeometry(0.085, 0.17, 0.085);
  const legs = [];
  for (const [x, z] of [
    [0.12, 0.28],
    [-0.12, 0.28],
    [0.12, -0.28],
    [-0.12, -0.28],
  ]) {
    const hipG = new THREE.Group();
    hipG.position.set(x, 0.34, z);
    const up = new THREE.Mesh(legGeo, fur);
    up.position.y = -0.085;
    const kneeG = new THREE.Group();
    kneeG.position.y = -0.17;
    const low = new THREE.Mesh(lowGeo, dark);
    low.position.y = -0.085;
    kneeG.add(low);
    hipG.add(up, kneeG);
    g.add(hipG);
    legs.push({ hip: hipG, knee: kneeG });
  }
  g.userData = { legs, bodyG, headG, jaw, tail, tail2: t2G, earL, earR };
  return g;
}

function dropWolf(game) {
  const st = world(game);
  const w = st.wolf;
  if (!w) return;
  st.wolf = null;
  game.scene.remove(w.mesh);
  const geos = new Set();
  const mats = new Set();
  w.mesh.traverse((o) => {
    if (!o.isMesh) return;
    geos.add(o.geometry);
    mats.add(o.material);
  });
  geos.forEach((geo) => geo.dispose());
  mats.forEach((mat) => mat.dispose());
}

function dropCloud(game, c) {
  if (!c || !c.mesh) return;
  game.scene.remove(c.mesh);
  c.mesh.traverse((o) => {
    if (o.isMesh) {
      o.geometry.dispose();
      o.material.dispose();
    }
  });
  c.mesh = null;
}

export function clearSkillWorld(game) {
  const st = world(game);
  dropWolf(game);
  for (const c of st.clouds) dropCloud(game, c);
  st.clouds.length = 0;
  for (const a of st.arcs) {
    game.scene.remove(a.line);
    a.line.geometry.dispose();
    a.line.material.dispose();
  }
  st.arcs.length = 0;
}

export function updateSkillWorld(game, dt) {
  const p = game.player;
  if (!p) return;
  if (p.leapLand) {
    p.leapLand = false;
    leapImpact(game);
  }
  const st = world(game);
  if (st.wolf) tickWolf(game, st.wolf, dt);
  for (let i = st.clouds.length - 1; i >= 0; i--) {
    const c = st.clouds[i];
    c.t -= dt;
    c.acc += dt;
    if (c.mesh) cloudFx(game, c, dt);
    if (c.acc >= 0.45) {
      c.acc = 0;
      eachMonster(game, (mon) => {
        if (Math.hypot(mon.x - c.x, mon.z - c.z) <= c.r + 0.2) {
          applyPoison(game, mon, 1.3, c.dps);
          mon.afflict('slow', 0.9, c.slow);
        }
      });
    }
    if (c.t <= 0) {
      dropCloud(game, c);
      st.clouds.splice(i, 1);
    }
  }
  for (let i = st.arcs.length - 1; i >= 0; i--) {
    const a = st.arcs[i];
    a.t -= dt;
    a.line.material.opacity = Math.max(0, a.t / 0.18);
    if (a.t <= 0) {
      game.scene.remove(a.line);
      a.line.geometry.dispose();
      a.line.material.dispose();
      st.arcs.splice(i, 1);
    }
  }
}

function tickWolf(game, w, dt) {
  const p = game.player;
  w.life -= dt;
  w.lunge = Math.max(0, w.lunge - dt);
  if (w.life <= 0 || p.dead) {
    dropWolf(game);
    return;
  }
  const prey = nearest(game, w.x, w.z, 7.5);
  const yaw = p.yaw;
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  const rx = fz;
  const rz = -fx;
  let tx = p.pos.x + rx * 1.05 - fx * 0.9;
  let tz = p.pos.z + rz * 1.05 - fz * 0.9;
  let speed = 7.5;
  if (prey) {
    tx = prey.x;
    tz = prey.z;
    speed = w.lunge > 0 || p.packT > 0 ? 12 : 9;
  }
  const dx = tx - w.x;
  const dz = tz - w.z;
  const dist = Math.hypot(dx, dz) || 0;
  const want = dist > 0.35 ? Math.min(speed, dist * 5) : 0;
  const tvx = dist > 0.01 ? (dx / dist) * want : 0;
  const tvz = dist > 0.01 ? (dz / dist) * want : 0;
  const ak = 1 - Math.exp(-(want > Math.hypot(w.vx, w.vz) ? 9 : 6) * dt);
  const ovx = w.vx;
  const ovz = w.vz;
  w.vx += (tvx - w.vx) * ak;
  w.vz += (tvz - w.vz) * ak;
  w.x += w.vx * dt;
  w.z += w.vz * dt;
  const spd = Math.hypot(w.vx, w.vz);
  if (spd > 0.4) {
    const ty = Math.atan2(w.vx, w.vz);
    let dy = ty - w.yaw;
    dy = ((dy + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    w.yaw += dy * (1 - Math.exp(-11 * dt));
  } else if (prey) {
    let dy = Math.atan2(prey.x - w.x, prey.z - w.z) - w.yaw;
    dy = ((dy + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    w.yaw += dy * (1 - Math.exp(-9 * dt));
  }
  const gy = game.world.heightAt(w.x, w.z);
  w.y += (gy - w.y) * Math.min(1, dt * 18);
  const acc = dt > 1e-4 ? (Math.hypot(w.vx, w.vz) - Math.hypot(ovx, ovz)) / dt : 0;
  w.ay += (acc - w.ay) * Math.min(1, dt * 8);
  animateWolf(game, w, spd, dt);
  w.bite -= dt;
  if (prey && Math.hypot(prey.x - w.x, prey.z - w.z) < 1.45 + (prey.radius || 0.4) && w.bite <= 0) {
    const mods = skillMods(game);
    const dmg = Math.max(1, Math.round(4 * mods.wolf * (p.packT > 0 ? 1.4 : 1)));
    const hx = prey.x - w.x;
    const hz = prey.z - w.z;
    const hd = Math.hypot(hx, hz) || 1;
    game.strikeMonster(prey, dmg, hx / hd, hz / hd, 2, false);
    game.fx.burst(prey.x, prey.y + 0.6, prey.z, [0xfff2c0, 0xc9967a], 4, 2, 0.06, 0.25);
    if (mods.wolfHeal > 0 && !p.dead) {
      const before = p.hp;
      p.heal(mods.wolfHeal);
      if (p.hp > before) game.hud.floatText(...game.screenOf(p.pos.x, p.pos.y + 1.8, p.pos.z), '+1', 'heal');
    }
    w.bite = p.packT > 0 ? 0.35 : 0.7;
  }
}

function cloudFx(game, c, dt) {
  const v = game.vfx;
  const pulse = 0.5 + Math.sin(c.t * 5) * 0.5;
  c.mesh.children[0].material.opacity = 0.14 + pulse * 0.1;
  c.mesh.children[1].material.opacity = 0.35 + pulse * 0.25;
  if (Math.random() < dt * 9 * v.density) {
    const a = Math.random() * Math.PI * 2;
    const d = Math.sqrt(Math.random()) * c.r * 0.9;
    v.glow(c.x + Math.cos(a) * d, c.y + 0.3 + Math.random() * 0.4, c.z + Math.sin(a) * d, Math.random() < 0.7 ? 0x6dce4a : 0x9a5ae0, 1.5 + Math.random(), 1.0, { vy: 0.5, vx: Math.cos(c.t) * 0.3, grow: 0.8, gain: 0.55 });
  }
  if (Math.random() < dt * 14 * v.density) {
    const a = Math.random() * Math.PI * 2;
    const d = Math.sqrt(Math.random()) * c.r;
    v.spark(c.x + Math.cos(a) * d, c.y + 0.1, c.z + Math.sin(a) * d, 0, 0.9 + Math.random() * 0.9, 0, Math.random() < 0.5 ? 0xb8ff7a : 0xd7ffb0, 0.07, 1.1, -0.2, 0.3);
  }
  if (Math.random() < dt * 5) {
    const a = Math.random() * Math.PI * 2;
    const d = Math.sqrt(Math.random()) * c.r;
    game.fx.emit(c.x + Math.cos(a) * d, c.y + 0.2, c.z + Math.sin(a) * d, 0, 0.7, 0, 0x2f5a2a, 0.22, 1.1, -0.3);
  }
}

function animateWolf(game, w, spd, dt) {
  const P = w.parts;
  const run = Math.min(1, spd / 7);
  const gallop = spd > 8.5;
  w.gait += dt * (spd > 0.4 ? 3 + spd * 1.45 : 0);
  const c = w.gait;
  const idle = spd < 0.4;
  const prevStep = w.stepIdx || 0;
  const step = Math.floor(c / Math.PI);
  w.stepIdx = step;
  if (step !== prevStep && spd > 3) {
    game.fx.dust(w.x, w.y, w.z, 1, 0.8);
    if (spd > 8) game.vfx.sparks(w.x, w.y + 0.05, w.z, [0xd9c9a0], 1, 1, 0.05, 0.3, 4);
  }
  w.legs.forEach((leg, i) => {
    const front = i < 2;
    const side = i % 2;
    const ph = gallop ? (front ? 0 : 1.1) + side * 0.35 : (i === 0 || i === 3 ? 0 : Math.PI);
    const s = Math.sin(c + ph);
    const cs = Math.cos(c + ph);
    const amp = (gallop ? 0.95 : 0.6) * run;
    const swing = Math.max(0, -cs);
    const hipT = idle ? 0 : s * amp;
    const kneeT = idle ? 0.08 : (front ? -1 : 1) * 0 + (0.15 + swing * (front ? 0.9 : 1.2)) * run;
    leg.hip.rotation.x += (hipT - leg.hip.rotation.x) * Math.min(1, dt * 24);
    leg.knee.rotation.x += ((front ? -kneeT * 0.8 : kneeT) - leg.knee.rotation.x) * Math.min(1, dt * 24);
  });
  const bodyBob = Math.abs(Math.sin(c)) * (gallop ? 0.1 : 0.04) * run;
  P.bodyG.position.y = 0.5 + bodyBob - (w.bite > 0 && w.bite < 0.25 ? 0.03 : 0);
  const pitchT = clamp(-w.ay * 0.012, -0.18, 0.18) + (gallop ? Math.sin(c) * 0.08 : Math.sin(c * 2) * 0.02 * run);
  w.pitch += (pitchT - w.pitch) * Math.min(1, dt * 12);
  P.bodyG.rotation.x = w.pitch;
  P.bodyG.rotation.z = Math.sin(c) * 0.04 * run;
  P.headG.rotation.x = -w.pitch * 0.6 + Math.sin(c * 2) * 0.05 * run + (idle ? Math.sin(game.time * 1.4) * 0.04 : 0) + (w.bite > 0 && w.bite < 0.22 ? 0.35 : 0);
  P.headG.rotation.y = Math.sin(game.time * 0.9 + w.x) * 0.15 * (idle ? 1 : 0.2);
  P.jaw.rotation.x = w.bite > 0 && w.bite < 0.22 ? 0.7 * (1 - w.bite / 0.22) : 0.05 + (run > 0.6 ? 0.15 : 0);
  const sprint = w.lunge > 0 || game.player.packT > 0;
  P.tail.rotation.x += ((idle ? -0.15 : sprint ? 0.1 : -0.55 + run * 0.25) - P.tail.rotation.x) * Math.min(1, dt * 8);
  P.tail.rotation.y = Math.sin(game.time * (idle ? 5 : 9)) * (idle ? 0.35 : 0.18);
  P.tail2.rotation.y = Math.sin(game.time * (idle ? 5 : 9) - 0.9) * 0.3;
  P.earL.rotation.z = -0.1 + Math.sin(game.time * 3 + 1) * 0.05 - run * 0.3;
  P.earR.rotation.z = 0.1 + Math.sin(game.time * 3.4) * 0.05 + run * 0.3;
  w.mesh.position.set(w.x, w.y, w.z);
  w.mesh.rotation.y = w.yaw;
  if (game.player.packT > 0 && game.vfx) {
    game.vfx.glowNow(w.x, w.y + 0.6, w.z, 0xffa850, 1.5, 0.45);
    if (Math.random() < dt * 20) game.vfx.spark(w.x, w.y + 0.5, w.z, R2(-0.5, 0.5), R2(0.8, 1.8), R2(-0.5, 0.5), 0xffa850, 0.05, 0.5, -0.5, 0.3);
  }
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const R2 = (a, b) => a + Math.random() * (b - a);
