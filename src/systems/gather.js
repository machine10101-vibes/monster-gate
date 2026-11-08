import * as THREE from 'three';
import { FISH, GOODS, LEVEL_SKILLS, ROCKS, fishChance, fishTickTime, mineChance, mineSwingTime } from '../data/gathering.js';
import { goodsVoxels } from '../world/gatherModels.js';
import { meshFrom } from '../entities/humanoid.js';
import { toonMaterial } from '../engine/materials.js';
import { WATER_Y } from '../world/terrain.js';

const TOOL_HELD = { mine: 'pick', net: 'fishnet', rod: 'fishrod' };
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
    if (w.onDock(P.x, P.z, 0.5)) {
      for (const s of w.fishSpots || []) {
        const d = Math.hypot(s.x - P.x, s.z - P.z);
        if (d < 5.2 && d < bd) {
          bd = d;
          best = { kind: s.kind, node: s, x: s.x, y: WATER_Y + 1.2, z: s.z };
        }
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
    const f = t.kind === 'net' ? FISH.shrimp : FISH.trout;
    const ok = pr.level('fishing') >= f.level;
    const name = t.kind === 'net' ? 'Net fishing spot' : 'Pole fishing spot';
    return `${name}<small>${ok ? `F · catch ${f.name.toLowerCase()}` : `Needs Fishing Lv ${f.level}`}</small>`;
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
    } else {
      const fish = t.kind === 'net' ? FISH.shrimp : FISH.trout;
      if (pr.level('fishing') < fish.level) {
        g.hud.toast(`You need Fishing level ${fish.level} to catch ${fish.name.toLowerCase()}.`, 2200);
        return false;
      }
      const s = t.node;
      spec = { kind: t.kind, node: s, fish, go: { x: s.standX, z: s.standZ }, face: Math.atan2(s.x - s.standX, s.z - s.standZ) };
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

    if (this.near && !this.session) {
      const t = this.near;
      const [sx, sy, vis] = g.screenOf(t.x, t.y, t.z, true);
      g.hud.plate('gather', this.label(t));
      g.hud.placePlate('gather', sx, sy, vis);
    } else if (this.session) {
      const s = this.session;
      const [sx, sy, vis] = g.screenOf(s.node.x, (s.node.y || WATER_Y) + 1.6, s.node.z, true);
      const what = s.kind === 'mine' ? `Mining ${s.node.type}` : s.kind === 'net' ? 'Netting shrimp' : 'Fishing for trout';
      g.hud.plate('gather', `${what}<small>${s.ready ? 'Move to stop' : 'Walking over…'}</small>`);
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
    const lvl = g.progress.level(s.kind === 'mine' ? 'mining' : 'fishing');
    if (s.kind === 'mine') this.runMine(s, dt, lvl);
    else if (s.kind === 'net') this.runNet(s, dt, lvl);
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

  mined(s, rock, n) {
    const g = this.game;
    const P = g.player.pos;
    g.progress.addGood(rock.ore, 1);
    this.train('mining', rock.xp, true);
    g.hud.toast(`You manage to mine some ${n.type}.`, 1800);
    g.audio.coin();
    g.fx.burst(n.x, n.y + 0.8, n.z, [0x8d939c, 0x6f747d, 0xb3b8c0], 14, 3.6, 0.12, 0.8, 11, 2.4);
    g.fx.shockwave(n.x, n.y, n.z, 0xb9ae98, 1.2);
    g.shake(0.14);
    n.ready = false;
    n.respawnT = rock.respawn;
    n.full.visible = false;
    n.dead.visible = true;
    this.flyGood(rock.ore, n.x, n.y + 0.9, n.z, P.x, P.y + 1.3, P.z, 0.75);
    g.hud.floatText(...g.screenOf(P.x, P.y + 3.7, P.z), `+1 ${GOODS[rock.ore].name}`, 'gold');
    g.bagDirty = true;
    this.cancel();
  }

  /* -------------------------------- fishing -------------------------------- */
  runNet(s, dt, lvl) {
    const g = this.game;
    const p = g.player;
    const dur = fishTickTime(lvl) * 0.95;
    s.prevU = s.u;
    s.u += dt / dur;
    const sp = s.node;
    const f = p.facing;
    const tx = p.pos.x + f.x * 1.55;
    const tz = p.pos.z + f.z * 1.55;
    if (s.prevU < 0.42 && s.u >= 0.42) {
      g.fx.burst(tx, WATER_Y + 0.1, tz, [0xbfeaff, 0xffffff], 9, 2.2, 0.07, 0.5, -5, 1);
      g.fx.ring(tx, WATER_Y + 0.07, tz, 0xbfeaff, 10, 1.8, 0.07, 0.5);
      g.audio.noise(0.2, 0.12, 900, 0.8);
    }
    if (s.prevU < 0.72 && s.u >= 0.72) {
      g.fx.burst(tx, WATER_Y + 0.2, tz, [0xbfeaff, 0xffffff], 6, 2.4, 0.05, 0.5, 8, 2);
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
        g.fx.ring(bx, WATER_Y + 0.07, bz, 0xbfeaff, 10, 1.6, 0.07, 0.55);
        g.fx.burst(bx, WATER_Y + 0.1, bz, [0xbfeaff, 0xffffff], 6, 2, 0.06, 0.4, -4, 1);
        g.audio.noise(0.18, 0.1, 900, 0.8);
      }
    } else if (s.phase === 'wait') {
      const q = s.t / s.wait;
      let dip = 0;
      if (q > 0.55 && q < 0.95) dip = Math.max(0, Math.sin((q - 0.55) * 38)) * 0.6 * (q < 0.8 ? 0.5 : 1);
      if (q > 0.55 && !s.nibbled) {
        s.nibbled = true;
        g.fx.ring(bx, WATER_Y + 0.07, bz, 0xffffff, 8, 1.2, 0.06, 0.4);
      }
      p.gAnim = { name: 'wait', u: q, dip };
      this.drawLine(s, bx, bz, 1, dip * 0.12);
      if (s.t >= s.wait) {
        if (Math.random() <= fishChance(s.fish, lvl)) {
          s.phase = 'bite';
          s.t = 0;
          s.u = 0;
          g.fx.burst(bx, WATER_Y + 0.15, bz, [0xbfeaff, 0xffffff], 12, 2.8, 0.07, 0.6, -6, 2.2);
          g.fx.ring(bx, WATER_Y + 0.07, bz, 0xbfeaff, 12, 2.2, 0.08, 0.6);
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
    const by = WATER_Y + 0.06 - dip + Math.sin(t * 2.4) * 0.025;
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
    g.progress.addGood(fish.id, 1);
    this.train('fishing', fish.xp, true);
    g.hud.toast(fish.id === 'trout' ? 'You catch a trout.' : 'You catch some shrimp.', 1800);
    g.audio.coin();
    g.fx.burst(tx, WATER_Y + 0.2, tz, [0xbfeaff, 0xffffff], 14, 3.4, 0.08, 0.7, 8, 2.8);
    g.fx.ring(tx, WATER_Y + 0.07, tz, 0xbfeaff, 14, 2.4, 0.08, 0.6);
    this.flyGood(fish.id, tx, WATER_Y + 0.3, tz, P.x, P.y + 1.4, P.z, 0.8);
    g.hud.floatText(...g.screenOf(P.x, P.y + 3.7, P.z), `+1 ${GOODS[fish.id].name}`, 'gold');
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
    mesh.scale.setScalar(id === 'trout' || id === 'shrimp' ? 0.9 : 0.75);
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
      f.mesh.rotation.set(u * f.spin * 0.5, u * f.spin, f.id === 'trout' || f.id === 'shrimp' ? Math.sin(u * 14) * 0.6 : 0);
      if (u >= 1) {
        g.fx.burst(ex, ey, ez, f.id.endsWith('ore') ? [0xffd9a0, 0xffffff] : [0xbfeaff, 0xffffff], 7, 2, 0.06, 0.5, -1, 0.8);
        g.scene.remove(f.mesh);
        this.flyers.splice(i, 1);
      }
    }
  }
}
