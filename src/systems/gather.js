import * as THREE from 'three';
import { FISH, GOODS, LEVEL_SKILLS, ROCKS, TREES, burnChance, burnXp, burntGoodId, chopChance, chopSwingTime, cookTime, fishChance, fishTickTime, isFishGood, lightChance, lightTime, mineChance, mineSwingTime, pickFish, treeByLog } from '../data/gathering.js';
import { buildCampfire, goodsVoxels } from '../world/gatherModels.js';
import { meshFrom } from '../entities/humanoid.js';
import { toonMaterial } from '../engine/materials.js';
import { WATER_Y, ZONE } from '../world/terrain.js';
import { INVENTORY_FULL } from './stacks.js';

const TOOL_HELD = { mine: 'pick', net: 'fishnet', rod: 'fishrod', chop: 'axe', light: 'tinder' };
const STRIKE_AT = 0.56;

const rand = (a, b) => a + Math.random() * (b - a);
const fmtXp = (n) => (Math.abs(n - Math.round(n)) < 0.05 ? String(Math.round(n)) : n.toFixed(1));

/** Levels, XP drops and the mining and fishing routines. */
export class Gathering {
  constructor(game) {
    this.game = game;
    this.session = null;
    this.near = null;
    this.drops = {};
    this.flyers = [];
    this.fires = [];
    this.woodHinted = false;
    this.mat = toonMaterial({ vertexColors: true });
    this.models = {};

    this.bobber = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.1, 0.13), new THREE.MeshBasicMaterial({ color: 0xff3a3a }));
    const bot = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.09, 0.13), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    top.position.y = 0.06;
    bot.position.y = -0.02;
    this.bobber.add(top, bot);
    this.bobber.visible = false;
    game.scene.add(this.bobber);

    const geo = new THREE.BufferGeometry();
    this.linePts = new Float32Array(14 * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(this.linePts, 3));
    this.line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xf6f2e4, transparent: true, opacity: 0.9 }));
    this.line.frustumCulled = false;
    this.line.visible = false;
    game.scene.add(this.line);
    this.tip = new THREE.Vector3();
  }

  get active() {
    return !!this.session;
  }

  /* ------------------------------- training ------------------------------- */
  train(id, xp, now = false) {
    const game = this.game;
    if (!game.progress || !(xp > 0)) return;
    const up = game.progress.addXp(id, xp);
    const d = this.drops[id] || (this.drops[id] = { xp: 0, t: 0 });
    d.xp += xp;
    if (now) d.t = 9;
    if (up) this.levelUp(id, up);
    if (game.hud.panelId === 'stats') game.onStatsChange?.();
  }

  levelUp(id, level) {
    const g = this.game;
    const def = LEVEL_SKILLS[id];
    g.syncVitals();
    g.hud.banner('Level up', `${def.name} ${level}`, 2600);
    g.hud.toast(`Congratulations! Your ${def.name} level is now ${level}.`, 3200);
    g.audio.quest();
    const P = g.player.pos;
    const col = parseInt(def.color.slice(1), 16);
    g.fx.burst(P.x, P.y + 1.4, P.z, [col, 0xffffff, 0xffe9a0], 26, 4, 0.1, 1, -1, 3);
    g.vfx.ring(P.x, P.y + 0.12, P.z, { color: col, r0: 0.3, r1: 2.8, life: 0.7, thick: 0.18, gain: 0.8 });
    g.vfx.ring(P.x, P.y + 0.12, P.z, { color: 0xffffff, r0: 0.2, r1: 2.0, life: 0.55, thick: 0.1, gain: 0.7 });
    for (let k = 0; k < 6; k++) {
      setTimeout(() => {
        const q = g.player.pos;
        g.fx.burst(q.x + (Math.random() - 0.5) * 1.6, q.y + 2 + Math.random() * 1.3, q.z + (Math.random() - 0.5) * 1.6, [col, 0xffffff, 0xffe9a0], 10, 2.4, 0.08, 0.8, 1.5, 0.4);
      }, 120 + k * 110);
    }
  }

  flushDrops(dt) {
    const g = this.game;
    let row = 0;
    for (const id of Object.keys(this.drops)) {
      const d = this.drops[id];
      d.t += dt;
      if (d.t < 1.3 || !g.started) continue;
      const def = LEVEL_SKILLS[id];
      if (d.xp >= 0.5) {
        const P = g.player.pos;
        const [sx, sy] = g.screenOf(P.x, P.y + 2.2 + row * 0.5, P.z);
        g.hud.floatText(sx, sy, `+${fmtXp(d.xp)} ${def.name} XP`, 'xp');
        row++;
      }
      delete this.drops[id];
    }
  }

  /* ------------------------------- targeting ------------------------------- */
  findTarget() {
    const g = this.game;
    const w = g.world;
    const P = g.player.pos;
    let best = null;
    let bd = 99;
    for (const n of w.rockNodes || []) {
      if (!n.ready) continue;
      const d = Math.hypot(n.x - P.x, n.z - P.z);
      if (d < 3.1 && d < bd) {
        bd = d;
        best = { kind: 'mine', node: n, x: n.x, y: n.y + 1.5, z: n.z };
      }
    }
    for (const n of w.treeNodes || []) {
      if (!n.ready) continue;
      const d = Math.hypot(n.x - P.x, n.z - P.z);
      if (d < 3.3 && d < bd) {
        bd = d;
        best = { kind: 'chop', node: n, x: n.x, y: n.y + 2.4, z: n.z };
      }
    }
    const onDock = w.onDock(P.x, P.z, 0.5);
    for (const s of w.fishSpots || []) {
      let d;
      if (s.site === 'lake') {
        if (!onDock) continue;
        d = Math.hypot(s.x - P.x, s.z - P.z);
        if (d >= 5.2) continue;
      } else {
        d = Math.hypot(s.standX - P.x, s.standZ - P.z);
        if (d >= (s.reach || 3.2) || Math.abs(P.y - s.standY) > 1.6) continue;
      }
      if (d < bd) {
        bd = d;
        best = { kind: s.kind, node: s, x: s.x, y: s.y + 1.2, z: s.z };
      }
    }
    return best;
  }

  label(t) {
    const pr = this.game.progress;
    if (t.kind === 'mine') {
      const r = ROCKS[t.node.type];
      return `${r.name}<small>F · mine ${t.node.type}</small>`;
    }
    if (t.kind === 'chop') {
      const tree = TREES[t.node.type];
      const ok = pr.level('woodcutting') >= tree.level;
      return `${tree.name} tree<small>${ok ? 'F · chop' : `Needs Woodcutting Lv ${tree.level}`}</small>`;
    }
    const need = this.spotLevel(t.node);
    const ok = pr.level('fishing') >= need;
    return `${t.node.title}<small>${ok ? `F · ${this.spotVerb(t.node)}` : `Needs Fishing Lv ${need}`}</small>`;
  }

  spotLevel(node) {
    return Math.min(...node.catches.map((id) => FISH[id].level));
  }

  spotVerb(node) {
    const names = node.catches.map((id) => FISH[id].name.toLowerCase());
    return names.length === 1 ? `catch ${names[0]}` : `fish for ${names.join(' or ')}`;
  }

  /* -------------------------------- sessions -------------------------------- */
  begin(t) {
    const g = this.game;
    const p = g.player;
    if (!t || p.dead || this.session) return false;
    if (['roll', 'stagger', 'attack', 'use', 'dead'].includes(p.state)) return false;
    const pr = g.progress;
    let spec;
    if (t.kind === 'mine') {
      const rock = ROCKS[t.node.type];
      if (pr.level('mining') < rock.level) {
        g.hud.toast(`You need Mining level ${rock.level} to mine ${t.node.type}.`, 2000);
        return false;
      }
      spec = { kind: 'mine', node: t.node, go: { x: t.node.standX, z: t.node.standZ }, face: Math.atan2(t.node.x - t.node.standX, t.node.z - t.node.standZ) };
    } else if (t.kind === 'chop') {
      const tree = TREES[t.node.type];
      if (pr.level('woodcutting') < tree.level) {
        g.hud.toast(`You need Woodcutting level ${tree.level} to chop ${tree.name.toLowerCase()}.`, 2200);
        return false;
      }
      spec = { kind: 'chop', node: t.node, tree, go: { x: t.node.standX, z: t.node.standZ }, face: Math.atan2(t.node.x - t.node.standX, t.node.z - t.node.standZ) };
    } else {
      const need = this.spotLevel(t.node);
      if (pr.level('fishing') < need) {
        const first = t.node.catches.map((id) => FISH[id]).sort((a, b) => a.level - b.level)[0];
        g.hud.toast(`You need Fishing level ${need} to catch ${first.name.toLowerCase()}.`, 2200);
        return false;
      }
      const s = t.node;
      spec = { kind: t.kind, node: s, fish: pickFish(s.catches, pr.level('fishing')), go: { x: s.standX, z: s.standZ }, face: Math.atan2(s.x - s.standX, s.z - s.standZ) };
    }
    spec.tool = TOOL_HELD[spec.kind];
    spec.ready = false;
    spec.u = 0;
    spec.prevU = 0;
    spec.phase = spec.kind === 'rod' ? 'cast' : 'work';
    spec.t = 0;
    spec.wait = 0;
    spec.struck = false;
    this.session = spec;
    p.setHeld(spec.tool);
    p.beginGather(spec.kind, spec.go.x, spec.go.z, spec.face);
    g.audio.select();
    return true;
  }

  cancel(silent = true) {
    const s = this.session;
    if (!s) return;
    this.session = null;
    this.bobber.visible = false;
    this.line.visible = false;
    const g = this.game;
    const p = g.player;
    if (p.state === 'gather') p.endGather();
    p.gAnim = null;
    const it = g.items[g.sel];
    if (p.heldKind === s.tool) p.setHeld(it?.held || null);
    if (!silent) g.hud.toast('You stop.', 800);
  }

  update(dt) {
    const g = this.game;
    this.flushDrops(dt);
    this.updateFlyers(dt);
    this.updateFires(dt);
    const p = g.player;

    if (this.session) {
      const s = this.session;
      const bad = p.dead || p.state !== 'gather' || p.heldKind !== s.tool;
      if (bad) {
        this.cancel();
      } else {
        this.run(s, dt);
      }
    }

    if (!this.session && g.started && !g.uiBlocking) {
      this.near = this.findTarget();
    } else if (!this.session) this.near = null;

    if (this.near && !this.session && this.near.kind === 'chop' && !this.woodHinted) {
      this.woodHinted = true;
      g.hud.toast('Whispering Wood — press F to chop. Light the logs from your inventory.', 3200);
    }

    if (this.near && !this.session) {
      const t = this.near;
      const [sx, sy, vis] = g.screenOf(t.x, t.y, t.z, true);
      g.hud.plate('gather', this.label(t));
      g.hud.placePlate('gather', sx, sy, vis);
    } else if (this.session) {
      const s = this.session;
      const [sx, sy, vis] = g.screenOf(s.node.x, (s.node.y || WATER_Y) + 1.6, s.node.z, true);
      let what;
      let note = s.ready ? 'Move to stop' : 'Walking over…';
      if (s.kind === 'mine') what = `Mining ${s.node.type}`;
      else if (s.kind === 'chop') what = `Chopping ${s.tree.name.toLowerCase()}`;
      else if (s.kind === 'light') what = `Lighting ${GOODS[s.log].name.toLowerCase()}`;
      else if (s.kind === 'cook') {
        what = `Cooking ${s.fish.name.toLowerCase()}`;
        if (s.ready) note = `${Math.round(burnChance(s.fish, g.progress.level('cooking')) * 100)}% chance to burn · move to stop`;
        else note = 'Walking to the fire…';
      } else what = s.node.catches.length > 1 ? 'Ice fishing' : s.kind === 'net' ? `Netting ${s.fish.name.toLowerCase()}` : `Fishing for ${s.fish.name.toLowerCase()}`;
      g.hud.plate('gather', `${what}<small>${note}</small>`);
      g.hud.placePlate('gather', sx, sy, vis);
    } else g.hud.removePlate('gather');
  }

  interact() {
    if (this.session) {
      this.cancel(false);
      return true;
    }
    const t = this.near || this.findTarget();
    if (!t) return false;
    this.begin(t);
    return true;
  }

  run(s, dt) {
    const g = this.game;
    const p = g.player;
    s.t += dt;
    if (!s.ready) {
      if (p.gatherReady) {
        s.ready = true;
        s.t = 0;
        s.u = 0;
        s.prevU = 0;
      } else return;
    }
    const skill = s.kind === 'mine' ? 'mining' : s.kind === 'chop' ? 'woodcutting' : s.kind === 'light' ? 'firemaking' : s.kind === 'cook' ? 'cooking' : 'fishing';
    const lvl = g.progress.level(skill);
    if (s.kind === 'mine') this.runMine(s, dt, lvl);
    else if (s.kind === 'chop') this.runChop(s, dt, lvl);
    else if (s.kind === 'light') this.runLight(s, dt, lvl);
    else if (s.kind === 'net') this.runNet(s, dt, lvl);
    else if (s.kind === 'cook') this.runCook(s, dt, lvl);
    else this.runRod(s, dt, lvl);
  }

  /* --------------------------------- mining --------------------------------- */
  runMine(s, dt, lvl) {
    const g = this.game;
    const p = g.player;
    const dur = mineSwingTime(lvl);
    s.prevU = s.u;
    s.u += dt / dur;
    if (s.prevU < STRIKE_AT && s.u >= STRIKE_AT) this.strike(s, lvl);
    if (s.u >= 1) {
      s.u -= 1;
      s.prevU = 0;
    }
    p.gAnim = { name: 'mine', u: s.u };
  }

  strike(s, lvl) {
    const g = this.game;
    const rock = ROCKS[s.node.type];
    const n = s.node;
    if (!n.ready) {
      this.cancel();
      return;
    }
    const f = g.player.facing;
    const hx = g.player.pos.x + f.x * 1.1;
    const hz = g.player.pos.z + f.z * 1.1;
    const hy = n.y + 0.7;
    g.fx.burst(hx, hy, hz, rock.spark, 8, 3.4, 0.06, 0.4, 8, 2);
    g.fx.burst(hx, hy, hz, [0x8d939c, 0x6f747d], 4, 2.4, 0.09, 0.5, 12, 1.4);
    g.vfx.sparks(hx, hy, hz, rock.spark, 8, 3.6, 0.07, 0.45, 8, 1.2);
    g.vfx.flash(hx, hy, hz, rock.color, 1.6, 0.14);
    g.shake(0.06);
    g.audio.tone(1500, 0.07, 'square', 0.1, -700);
    g.audio.noise(0.09, 0.16, 2400, 1.2);
    g.audio.tone(210, 0.1, 'triangle', 0.14, -90, 0.015);
    n.root.scale.set(1.04, 0.95, 1.04);
    setTimeout(() => n.root.scale.set(1, 1, 1), 70);
    if (Math.random() > mineChance(rock.base, lvl)) {
      if (Math.random() < 0.35) g.hud.toast('You swing your pick at the rock.', 700);
      return;
    }
    this.mined(s, rock, n);
  }

  bagGood(id, n, x, y, z) {
    const g = this.game;
    const added = g.progress.addGood(id, n);
    if (added < n) {
      g.dropStack('good', id, n - added, x, y, z);
      g.hud.toast(INVENTORY_FULL, 1800);
    }
    return added;
  }

  mined(s, rock, n) {
    const g = this.game;
    const P = g.player.pos;
    const added = this.bagGood(rock.ore, 1, n.x, n.y + 0.9, n.z);
    if (added) {
      if (g.bounties?.onGather(rock.ore, 1) && g.hud.panelId === 'quest' && g.hud.journalRefresh) g.hud.journalRefresh();
      g.hud.toast(`You manage to mine some ${n.type}.`, 1800);
      g.hud.floatText(...g.screenOf(P.x, P.y + 3.7, P.z), `+1 ${GOODS[rock.ore].name}`, 'gold');
      this.flyGood(rock.ore, n.x, n.y + 0.9, n.z, P.x, P.y + 1.3, P.z, 0.75);
    }
    this.train('mining', rock.xp, true);
    g.audio.coin();
    g.fx.burst(n.x, n.y + 0.8, n.z, [0x8d939c, 0x6f747d, 0xb3b8c0], 14, 3.6, 0.12, 0.8, 11, 2.4);
    g.fx.shockwave(n.x, n.y, n.z, 0xb9ae98, 1.2);
    g.shake(0.14);
    n.ready = false;
    n.respawnT = rock.respawn;
    n.full.visible = false;
    n.dead.visible = true;
    g.bagDirty = true;
    this.cancel();
  }

  /* ------------------------------- woodcutting ------------------------------ */
  runChop(s, dt, lvl) {
    const dur = chopSwingTime(lvl);
    s.prevU = s.u;
    s.u += dt / dur;
    if (s.prevU < STRIKE_AT && s.u >= STRIKE_AT) this.chopStrike(s, lvl);
    if (s.u >= 1) {
      s.u -= 1;
      s.prevU = 0;
    }
    this.game.player.gAnim = { name: 'chop', u: s.u };
  }

  chopStrike(s, lvl) {
    const g = this.game;
    const tree = s.tree;
    const n = s.node;
    if (!n.ready) {
      this.cancel();
      return;
    }
    const f = g.player.facing;
    const hx = g.player.pos.x + f.x * 1.05;
    const hz = g.player.pos.z + f.z * 1.05;
    const hy = n.y + 0.85;
    g.fx.burst(hx, hy, hz, tree.chip, 9, 3.2, 0.07, 0.45, 7, 1.6);
    g.vfx.sparks(hx, hy, hz, tree.chip, 7, 3.2, 0.06, 0.4, 6, 1);
    g.shake(0.05);
    g.audio.tone(210, 0.07, 'triangle', 0.16, -70);
    g.audio.noise(0.07, 0.14, 900, 0.7);
    const lean = Math.random() < 0.5 ? -1 : 1;
    n.full.rotation.z = lean * 0.07;
    setTimeout(() => {
      if (n.full) n.full.rotation.z = 0;
    }, 80);
    if (Math.random() > chopChance(tree, lvl)) {
      if (Math.random() < 0.35) g.hud.toast(`You swing your axe at the ${tree.name.toLowerCase()}.`, 700);
      return;
    }
    this.felled(s, tree, n);
  }

  felled(s, tree, n) {
    const g = this.game;
    const P = g.player.pos;
    const added = this.bagGood(tree.log, 1, n.x, n.y + 1.2, n.z);
    if (added) {
      if (g.bounties?.onGather(tree.log, 1) && g.hud.panelId === 'quest' && g.hud.journalRefresh) g.hud.journalRefresh();
      g.hud.toast(`You get some ${GOODS[tree.log].name.toLowerCase()}.`, 1800);
      g.hud.floatText(...g.screenOf(P.x, P.y + 3.7, P.z), `+1 ${GOODS[tree.log].name}`, 'gold');
      this.flyGood(tree.log, n.x, n.y + 1.2, n.z, P.x, P.y + 1.3, P.z, 0.75);
    }
    this.train('woodcutting', tree.xp, true);
    g.audio.tone(140, 0.14, 'triangle', 0.18, -40);
    g.audio.coin();
    g.fx.burst(n.x, n.y + 1.6, n.z, tree.chip, 18, 3.8, 0.12, 0.9, 6, 2.2);
    g.fx.shockwave(n.x, n.y, n.z, tree.chip[0], 1.3);
    g.shake(0.12);
    n.ready = false;
    n.respawnT = tree.respawn;
    n.full.visible = false;
    n.full.rotation.z = 0;
    n.dead.visible = true;
    g.bagDirty = true;
    this.cancel();
  }

  /* ------------------------------- firemaking ------------------------------- */
  /** Start lighting `id`, or the best log the hunter can burn. */
  light(id) {
    const g = this.game;
    const p = g.player;
    if (p.dead || this.session) return false;
    if (['roll', 'stagger', 'attack', 'use', 'dead'].includes(p.state)) return false;
    const lvl = g.progress.level('firemaking');
    let tree = id ? treeByLog(id) : null;
    if (!id) {
      const owned = Object.values(TREES).filter((t) => g.progress.good(t.log) > 0 && lvl >= t.fireLevel);
      owned.sort((a, b) => b.fireXp - a.fireXp);
      tree = owned[0] || null;
      if (!tree) {
        const any = Object.values(TREES).some((t) => g.progress.good(t.log) > 0);
        g.hud.toast(any ? 'Those logs need a higher Firemaking level.' : 'You need logs. Chop birch, oak or maple west of town.', 2400);
        return false;
      }
    }
    if (!tree) return false;
    if (lvl < tree.fireLevel) {
      g.hud.toast(`You need Firemaking level ${tree.fireLevel} to light ${GOODS[tree.log].name.toLowerCase()}.`, 2200);
      return false;
    }
    if (g.progress.good(tree.log) < 1) {
      g.hud.toast(`You have no ${GOODS[tree.log].name.toLowerCase()}.`, 1600);
      return false;
    }
    if (this.fires.length >= 6) {
      g.hud.toast('There are too many fires burning.', 1600);
      return false;
    }
    const spot = this.fireSpot();
    if (!spot) {
      g.hud.toast("You can't light a fire here.", 1600);
      return false;
    }
    const spec = {
      kind: 'light',
      tree,
      log: tree.log,
      node: { x: spot.x, y: spot.y + 0.6, z: spot.z },
      go: { x: spot.x, z: spot.z },
      face: Math.atan2(p.facing.x, p.facing.z),
      tool: 'tinder',
      ready: false,
      u: 0,
      prevU: 0,
      phase: 'work',
      t: 0,
      struck: false,
    };
    this.session = spec;
    p.setHeld('tinder');
    p.beginGather('light', spot.x, spot.z, spec.face);
    g.audio.select();
    return true;
  }

  fireSpot() {
    const g = this.game;
    const p = g.player.pos;
    const tries = [[0, 0]];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      tries.push([Math.cos(a) * 1.15, Math.sin(a) * 1.15]);
    }
    for (const [dx, dz] of tries) {
      const x = p.x + dx;
      const z = p.z + dz;
      if (this.clearForFire(x, z, p.y)) return { x, z, y: g.world.heightAt(x, z) };
    }
    return null;
  }

  clearForFire(x, z, fromY) {
    const w = this.game.world;
    if (!w.canStep(x, z, fromY) || w.isWater(x, z) || w.onDock(x, z, 0.3)) return false;
    const zn = w.zoneAt(x, z);
    if (zn === ZONE.WATER || zn === ZONE.LAKE) return false;
    if (this.fires.some((f) => f.life > 0 && Math.hypot(f.x - x, f.z - z) < 1.8)) return false;
    if ((w.treeNodes || []).some((n) => Math.hypot(n.x - x, n.z - z) < 1.4)) return false;
    if ((w.rockNodes || []).some((n) => Math.hypot(n.x - x, n.z - z) < 1.5)) return false;
    return true;
  }

  runLight(s, dt, lvl) {
    const g = this.game;
    const dur = lightTime(lvl);
    s.prevU = s.u;
    s.u += dt / dur;
    const n = s.node;
    if (s.prevU < 0.62 && s.u >= 0.62) {
      g.fx.burst(n.x, n.y, n.z, [0xfff2a0, 0xffb020, 0xff6a18], 8, 2.4, 0.05, 0.4, 4, 1.4);
      g.audio.noise(0.08, 0.1, 1800, 0.6);
      g.audio.tone(680, 0.05, 'square', 0.05, 200);
      if (g.progress.good(s.log) < 1) {
        g.hud.toast('You have no logs left.', 1400);
        this.cancel();
        return;
      }
      if (Math.random() <= lightChance(s.tree, lvl)) this.lit(s);
      else if (Math.random() < 0.7) g.hud.toast('The fire fails to light.', 800);
    }
    if (s.u >= 1) {
      s.u -= 1;
      s.prevU = 0;
    }
    g.player.gAnim = { name: 'light', u: Math.min(0.99, s.u) };
  }

  lit(s) {
    const g = this.game;
    if (!g.progress.takeGood(s.log, 1)) {
      this.cancel();
      return;
    }
    this.train('firemaking', s.tree.fireXp, true);
    const n = s.node;
    this.spawnFire(n.x, n.y - 0.6, n.z, s.tree);
    g.hud.toast('The fire catches.', 1600);
    g.audio.tone(420, 0.12, 'triangle', 0.12, 180);
    g.bagDirty = true;
    this.stepOffFire(n.x, n.z);
    this.cancel();
  }

  stepOffFire(x, z) {
    const g = this.game;
    const p = g.player;
    const dirs = [[0, -1.25], [1.25, 0], [-1.25, 0], [0, 1.25], [0.9, 0.9], [-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9]];
    for (const [dx, dz] of dirs) {
      const nx = x + dx;
      const nz = z + dz;
      if (!g.world.canStep(nx, nz, p.pos.y) || g.world.isWater(nx, nz)) continue;
      if (Math.hypot(nx - x, nz - z) < 0.8) continue;
      p.pos.x = nx;
      p.pos.z = nz;
      p.pos.y = g.world.heightAt(nx, nz);
      return;
    }
  }

  spawnFire(x, y, z, tree) {
    const g = this.game;
    const built = buildCampfire(tree.id);
    const logs = this.fireGroup(built.logs);
    const flame = this.fireGroup(built.flame);
    const root = new THREE.Group();
    root.add(logs, flame);
    root.position.set(x, y, z);
    root.rotation.y = Math.random() * Math.PI * 2;
    g.scene.add(root);
    const light = new THREE.PointLight(0xff7a22, 2.2, 8, 1.8);
    light.position.set(x, y + 0.9, z);
    g.scene.add(light);
    g.fx.burst(x, y + 0.5, z, [0xfff2a0, 0xff8a22, 0xfff6e0], 16, 2.8, 0.08, 0.7, 3, 2);
    this.fires.push({ root, flame, light, x, y, z, life: tree.burn, t: 0, tree });
  }

  fireGroup(parts) {
    const g = new THREE.Group();
    const mats = this.game.world.mats;
    for (const p of parts) {
      const mesh = new THREE.Mesh(p.geo, p.kind === 'glow' ? mats.glow : mats.solid);
      mesh.castShadow = p.kind === 'solid';
      g.add(mesh);
    }
    return g;
  }

  updateFires(dt) {
    const g = this.game;
    for (let i = this.fires.length - 1; i >= 0; i--) {
      const f = this.fires[i];
      f.t += dt;
      f.life -= dt;
      const flick = 0.86 + Math.sin(f.t * 17) * 0.08 + Math.sin(f.t * 9.3) * 0.06;
      f.flame.scale.set(1, flick, 1);
      f.flame.position.y = (flick - 1) * 0.15;
      f.light.intensity = 1.5 + Math.sin(f.t * 13) * 0.45 + Math.sin(f.t * 23) * 0.2;
      if (g.started && Math.random() < dt * 7) {
        g.fx.burst(f.x + (Math.random() - 0.5) * 0.3, f.y + 0.7 + Math.random() * 0.4, f.z + (Math.random() - 0.5) * 0.3, [0xfff2a0, 0xff8a22, 0x6a6a6a], 1, 0.7, 0.05, 0.8, -1.2, 1.1);
      }
      if (f.life > 0) continue;
      g.fx.burst(f.x, f.y + 0.3, f.z, [0x6a6a6a, 0x3a3a3a, 0xffe0b0], 10, 1.6, 0.08, 0.7, 1, 1.2);
      g.scene.remove(f.root);
      g.scene.remove(f.light);
      this.fires.splice(i, 1);
    }
  }

  /* -------------------------------- cooking -------------------------------- */
  nearestFire(max = 3.8) {
    const p = this.game.player.pos;
    let best = null;
    let bd = max;
    for (const f of this.fires) {
      if (f.life < 2) continue;
      const d = Math.hypot(f.x - p.x, f.z - p.z);
      if (d < bd) {
        bd = d;
        best = f;
      }
    }
    return best;
  }

  standByFire(fire) {
    const g = this.game;
    const p = g.player;
    const base = Math.atan2(p.pos.z - fire.z, p.pos.x - fire.x);
    for (let i = 0; i < 8; i++) {
      const a = base + (i * Math.PI) / 4;
      const x = fire.x + Math.cos(a) * 1.35;
      const z = fire.z + Math.sin(a) * 1.35;
      if (!g.world.canStep(x, z, p.pos.y) || g.world.isWater(x, z)) continue;
      return { x, z, face: Math.atan2(fire.x - x, fire.z - z) };
    }
    return null;
  }

  /** Cook a raw fish on the nearest campfire. Keeps going until the fish, or the fire, runs out. */
  cook(id) {
    const g = this.game;
    const p = g.player;
    const fish = FISH[id];
    if (!fish?.cooked || this.session) return false;
    if (p.dead || ['roll', 'stagger', 'attack', 'use', 'dead'].includes(p.state)) return false;
    if (g.progress.good(id) < 1) {
      g.hud.toast(`You have no ${fish.name.toLowerCase()} to cook.`, 1600);
      return false;
    }
    const fire = this.nearestFire();
    if (!fire) {
      g.hud.toast('Light a campfire, then cook beside it.', 2200);
      return false;
    }
    const stand = this.standByFire(fire);
    if (!stand) {
      g.hud.toast('There is no room beside the fire.', 1600);
      return false;
    }
    this.session = {
      kind: 'cook',
      fish,
      raw: id,
      fire,
      node: { x: fire.x, y: fire.y + 0.9, z: fire.z },
      go: { x: stand.x, z: stand.z },
      face: stand.face,
      tool: null,
      ready: false,
      u: 0,
      prevU: 0,
      phase: 'work',
      t: 0,
    };
    p.setHeld(null);
    p.beginGather('cook', stand.x, stand.z, stand.face);
    g.audio.select();
    return true;
  }

  runCook(s, dt, lvl) {
    const g = this.game;
    const dur = cookTime(lvl);
    s.prevU = s.u;
    s.u += dt / dur;
    g.player.gAnim = { name: 'cook', u: Math.min(0.99, s.u) };
    if (!this.fires.includes(s.fire) || s.fire.life <= 0) {
      g.hud.toast('The fire goes out.', 1400);
      this.cancel();
      return;
    }
    if (s.u < 1) return;
    s.u -= 1;
    s.prevU = 0;
    this.finishCook(s, lvl);
  }

  finishCook(s, lvl) {
    const g = this.game;
    const fish = s.fish;
    if (g.progress.good(s.raw) < 1) {
      this.cancel(true);
      return;
    }
    if (!g.progress.takeGood(s.raw, 1)) {
      this.cancel(true);
      return;
    }
    const burnt = Math.random() < burnChance(fish, lvl);
    const made = burnt ? burntGoodId(fish.id) : fish.cooked;
    const added = this.bagGood(made, 1, s.fire.x, s.fire.y + 0.6, s.fire.z);
    const P = g.player.pos;
    this.train('cooking', burnt ? burnXp(fish) : fish.cookXp, true);
    if (added) {
      if (burnt) {
        g.hud.toast(`You burn the ${fish.name.toLowerCase()}.`, 1600);
        g.hud.floatText(...g.screenOf(P.x, P.y + 3.4, P.z), `+1 ${GOODS[made].name}`, '');
        g.audio.noise(0.16, 0.12, 500, 0.7);
        g.fx.burst(s.fire.x, s.fire.y + 0.6, s.fire.z, [0x2a2a2a, 0x6a6a6a, 0xffe0b0], 10, 1.8, 0.07, 0.6, 2, 1.4);
      } else {
        g.hud.toast(`You cook the ${fish.name.toLowerCase()}.`, 1600);
        g.audio.tone(520, 0.08, 'triangle', 0.08, 240);
        g.fx.burst(s.fire.x, s.fire.y + 0.6, s.fire.z, [0xfff2a0, 0xff8a22, 0xffe0b0], 10, 1.8, 0.06, 0.6, 2, 1.4);
        g.hud.floatText(...g.screenOf(P.x, P.y + 3.4, P.z), `+1 ${GOODS[made].name}`, 'gold');
      }
      this.flyGood(made, s.fire.x, s.fire.y + 0.7, s.fire.z, P.x, P.y + 1.3, P.z, 0.7);
    } else if (burnt) g.audio.noise(0.16, 0.12, 500, 0.7);
    else g.audio.tone(520, 0.08, 'triangle', 0.08, 240);
    g.bagDirty = true;
    if (g.progress.good(s.raw) < 1) this.cancel(true);
  }

  /* -------------------------------- fishing -------------------------------- */
  runNet(s, dt, lvl) {
    const g = this.game;
    const p = g.player;
    const dur = fishTickTime(lvl) * 0.95;
    s.prevU = s.u;
    s.u += dt / dur;
    const sp = s.node;
    const wy = sp.y;
    const f = p.facing;
    const tx = p.pos.x + f.x * 1.55;
    const tz = p.pos.z + f.z * 1.55;
    if (s.prevU < 0.42 && s.u >= 0.42) {
      g.fx.burst(tx, wy + 0.1, tz, [0xbfeaff, 0xffffff], 9, 2.2, 0.07, 0.5, -5, 1);
      g.fx.ring(tx, wy + 0.07, tz, 0xbfeaff, 10, 1.8, 0.07, 0.5);
      g.audio.noise(0.2, 0.12, 900, 0.8);
    }
    if (s.prevU < 0.72 && s.u >= 0.72) {
      g.fx.burst(tx, wy + 0.2, tz, [0xbfeaff, 0xffffff], 6, 2.4, 0.05, 0.5, 8, 2);
      s.fish = pickFish(sp.catches, lvl) || s.fish;
      if (Math.random() <= fishChance(s.fish, lvl)) this.caught(s, sp, tx, tz);
      else if (Math.random() < 0.5) g.hud.toast('The net comes up empty.', 700);
    }
    if (s.u >= 1) {
      s.u -= 1;
      s.prevU = 0;
    }
    p.gAnim = { name: 'net', u: s.u };
    this.hideLine();
  }

  hideLine() {
    this.bobber.visible = false;
    this.line.visible = false;
  }

  runRod(s, dt, lvl) {
    const g = this.game;
    const p = g.player;
    const sp = s.node;
    const bx = sp.x;
    const bz = sp.z;
    const wy = sp.y;
    if (s.phase === 'cast') {
      s.u += dt / 1.05;
      p.gAnim = { name: 'cast', u: Math.min(1, s.u) };
      if (s.u > 0.52) this.drawLine(s, bx, bz, Math.min(1, (s.u - 0.52) / 0.26), 0);
      else this.hideLine();
      if (s.u >= 1) {
        s.phase = 'wait';
        s.t = 0;
        s.wait = fishTickTime(lvl) * rand(0.8, 1.3);
        s.nibbled = false;
        g.fx.ring(bx, wy + 0.07, bz, 0xbfeaff, 10, 1.6, 0.07, 0.55);
        g.fx.burst(bx, wy + 0.1, bz, [0xbfeaff, 0xffffff], 6, 2, 0.06, 0.4, -4, 1);
        g.audio.noise(0.18, 0.1, 900, 0.8);
      }
    } else if (s.phase === 'wait') {
      const q = s.t / s.wait;
      let dip = 0;
      if (q > 0.55 && q < 0.95) dip = Math.max(0, Math.sin((q - 0.55) * 38)) * 0.6 * (q < 0.8 ? 0.5 : 1);
      if (q > 0.55 && !s.nibbled) {
        s.nibbled = true;
        g.fx.ring(bx, wy + 0.07, bz, 0xffffff, 8, 1.2, 0.06, 0.4);
      }
      p.gAnim = { name: 'wait', u: q, dip };
      this.drawLine(s, bx, bz, 1, dip * 0.12);
      if (s.t >= s.wait) {
        s.fish = pickFish(sp.catches, lvl) || s.fish;
        if (Math.random() <= fishChance(s.fish, lvl)) {
          s.phase = 'bite';
          s.t = 0;
          s.u = 0;
          g.fx.burst(bx, wy + 0.15, bz, [0xbfeaff, 0xffffff], 12, 2.8, 0.07, 0.6, -6, 2.2);
          g.fx.ring(bx, wy + 0.07, bz, 0xbfeaff, 12, 2.2, 0.08, 0.6);
          g.audio.tone(880, 0.08, 'triangle', 0.1, 400);
        } else {
          s.t = 0;
          s.wait = fishTickTime(lvl) * rand(0.8, 1.3);
          s.nibbled = false;
          if (Math.random() < 0.5) g.hud.toast('Something nibbles, but gets away.', 800);
        }
      }
    } else if (s.phase === 'bite') {
      s.u += dt / 0.8;
      const u = Math.min(1, s.u);
      p.gAnim = { name: 'bite', u };
      this.drawLine(s, bx, bz, 1, 0.1 * (1 - u));
      if (s.u >= 0.45 && !s.struck) {
        s.struck = true;
        this.caught(s, sp, bx, bz);
      }
      if (s.u >= 1) {
        s.struck = false;
        s.phase = 'cast';
        s.u = 0;
        this.hideLine();
      }
    }
  }

  tipWorld() {
    const p = this.game.player;
    p.obj.updateMatrixWorld(true);
    this.tip.set(0, 0.08, 1.96);
    p.model.heldSlot.localToWorld(this.tip);
    return this.tip;
  }

  drawLine(s, bx, bz, k, dip) {
    const g = this.game;
    const tip = this.tipWorld();
    const t = g.time;
    const by = s.node.y + 0.06 - dip + Math.sin(t * 2.4) * 0.025;
    const ex = tip.x + (bx - tip.x) * k;
    const ez = tip.z + (bz - tip.z) * k;
    const flight = Math.sin(k * Math.PI) * 1.4;
    const ey = tip.y + (by - tip.y) * k + (k < 1 ? flight : 0);
    this.bobber.visible = k > 0.02;
    this.bobber.position.set(ex, ey, ez);
    const pts = this.linePts;
    const n = pts.length / 3;
    const dist = Math.hypot(ex - tip.x, ez - tip.z);
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      const sag = Math.sin(u * Math.PI) * Math.min(0.5, dist * 0.09) * (k >= 1 ? 1 : 0.4);
      pts[i * 3] = tip.x + (ex - tip.x) * u;
      pts[i * 3 + 1] = tip.y + (ey - tip.y) * u - sag;
      pts[i * 3 + 2] = tip.z + (ez - tip.z) * u;
    }
    this.line.geometry.attributes.position.needsUpdate = true;
    this.line.visible = true;
  }

  caught(s, sp, tx, tz) {
    const g = this.game;
    const P = g.player.pos;
    const fish = s.fish;
    const added = this.bagGood(fish.id, 1, tx, sp.y + 0.3, tz);
    if (added) {
      if (g.bounties?.onGather(fish.id, 1) && g.hud.panelId === 'quest' && g.hud.journalRefresh) g.hud.journalRefresh();
      g.hud.toast(fish.catchText, 1800);
      g.hud.floatText(...g.screenOf(P.x, P.y + 3.7, P.z), `+1 ${GOODS[fish.id].name}`, 'gold');
      this.flyGood(fish.id, tx, sp.y + 0.3, tz, P.x, P.y + 1.4, P.z, 0.8);
    }
    this.train('fishing', fish.xp, true);
    g.audio.coin();
    g.fx.burst(tx, sp.y + 0.2, tz, [0xbfeaff, 0xffffff], 14, 3.4, 0.08, 0.7, 8, 2.8);
    g.fx.ring(tx, sp.y + 0.07, tz, 0xbfeaff, 14, 2.4, 0.08, 0.6);
    g.bagDirty = true;
  }

  /* ---------------------------- flying catch visuals ---------------------------- */
  flyGood(id, x0, y0, z0, x1, y1, z1, dur) {
    const g = this.game;
    if (!this.models[id]) {
      const [m, size, ox, oy, oz] = goodsVoxels(id);
      this.models[id] = meshFrom(m, ox, oy, oz, this.mat, size);
    }
    const mesh = this.models[id].clone();
    const fishish = isFishGood(id);
    mesh.scale.setScalar(fishish ? (id.endsWith('sturgeon') || id.endsWith('tigershark') ? 0.7 : 0.9) : id.endsWith('_logs') ? 0.62 : 0.75);
    g.scene.add(mesh);
    this.flyers.push({ mesh, x0, y0, z0, x1, y1, z1, t: 0, dur, spin: rand(4, 9), id });
  }

  updateFlyers(dt) {
    const g = this.game;
    for (let i = this.flyers.length - 1; i >= 0; i--) {
      const f = this.flyers[i];
      f.t += dt;
      const u = Math.min(1, f.t / f.dur);
      const P = g.player.pos;
      const ex = P.x;
      const ez = P.z;
      const ey = P.y + 1.3;
      const e = u * u * (3 - 2 * u);
      f.mesh.position.set(f.x0 + (ex - f.x0) * e, f.y0 + (ey - f.y0) * e + Math.sin(u * Math.PI) * 1.5, f.z0 + (ez - f.z0) * e);
      const fishish = isFishGood(f.id);
      f.mesh.rotation.set(u * f.spin * 0.5, u * f.spin, fishish ? Math.sin(u * 14) * 0.6 : 0);
      if (u >= 1) {
        g.fx.burst(ex, ey, ez, f.id.endsWith('ore') ? [0xffd9a0, 0xffffff] : [0xbfeaff, 0xffffff], 7, 2, 0.06, 0.5, -1, 0.8);
        g.scene.remove(f.mesh);
        this.flyers.splice(i, 1);
      }
    }
  }
}
