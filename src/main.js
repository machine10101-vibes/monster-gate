import '@fontsource/press-start-2p/400.css';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/600.css';
import './style.css';
import * as THREE from 'three';
import { World } from './world/world.js';
import { Sky } from './world/sky.js';
import { FX } from './engine/fx.js';
import { Audio8 } from './engine/audio.js';
import { Input } from './engine/input.js';
import { hideUniforms } from './engine/materials.js';
import { Player } from './entities/player.js';
import { Spawner } from './entities/monsters.js';
import { createAmbient } from './entities/ambient.js';
import { HUD, ITEMS } from './ui/hud.js';
import { ZONE, GATE, GUILD } from './world/terrain.js';
import { clamp, lerp } from './engine/voxel.js';

const QUALITIES = [
  { id: 'low', label: 'Low', density: 0.55, motes: 120, gateMotes: 90, shadowSize: 1024, shadowExtent: 26, dpr: 1, shadows: true },
  { id: 'medium', label: 'Medium', density: 0.8, motes: 220, gateMotes: 160, shadowSize: 2048, shadowExtent: 30, dpr: 1.25, shadows: true },
  { id: 'high', label: 'High', density: 1, motes: 380, gateMotes: 260, shadowSize: 3072, shadowExtent: 34, dpr: 2, shadows: true },
];

const ZONE_NAMES = {
  [ZONE.TOWN]: ['Village', 'Oakhollow'],
  [ZONE.FIELD]: ['Open Fields', 'Goldenmeadow'],
  [ZONE.FOREST]: ['Fairy Forest', 'Whispering Wood'],
  [ZONE.MOUNTAIN]: ['Mountain Pass', 'Greystone Peaks'],
  [ZONE.WATER]: ['Waters', 'Silverrun River'],
  [ZONE.FARM]: ['Farmland', "Tobin's Farm"],
  [ZONE.GATE]: ['Danger', 'The Monster Gate'],
};

const RANKS = ['F', 'E', 'D', 'C', 'B', 'A', 'S'];

function pickQuality() {
  const saved = localStorage.getItem('mg-quality');
  const found = QUALITIES.find((q) => q.id === saved);
  if (found) return found;
  const touch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  const cores = navigator.hardwareConcurrency || 4;
  if (touch) return cores >= 8 ? QUALITIES[1] : QUALITIES[0];
  return cores >= 8 ? QUALITIES[2] : QUALITIES[1];
}

class Game {
  constructor() {
    this.canvas = document.getElementById('game');
    this.quality = pickQuality();
    this.hud = new HUD();
    this.audio = new Audio8();
    this.input = new Input(this.canvas);
    this.time = 0;
    this.hitstopT = 0;
    this.shakeAmt = 0;
    this.monsters = [];
    this.projectiles = [];
    this.pickups = [];
    this.gold = 0;
    this.kills = 0;
    this.rank = 0;
    this.quest = { text: 'Slay 5 Gate monsters', n: 0, total: 5 };
    this.items = ITEMS.map((i) => ({ ...i }));
    this.sel = 0;
    this.started = false;
    this.zone = -1;
    this.forestAmt = 0;
    this.resScale = 1;
    this.frameAvg = 16;
    this.frameAcc = 0;
    this.frameCnt = 0;
    this.talkNpc = null;
    this.cam = { yaw: Math.PI * 0.08, targetYaw: Math.PI * 0.08, pitch: 0.8, dist: 24, targetDist: 24, pos: new THREE.Vector3(), look: new THREE.Vector3() };
    this.uiBlocking = false;

    this.initRenderer();
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.3, 320);
    this.tmpV = new THREE.Vector3();
    this.ray = new THREE.Raycaster();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 250));
  }

  initRenderer() {
    const r = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NoToneMapping;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    this.renderer = r;
  }

  async load() {
    const fill = document.getElementById('load-fill');
    const text = document.getElementById('load-text');
    const progress = (p, t) => {
      fill.style.width = Math.round(p * 100) + '%';
      text.textContent = t;
    };
    this.world = new World(this.quality);
    await this.world.build(progress);
    this.scene.add(this.world.group);
    this.sky = new Sky(this.scene, this.quality);
    this.fx = new FX(this.scene, this.quality);
    this.player = new Player(this);
    this.spawner = new Spawner(this);
    progress(0.95, 'Waking the villagers');
    await new Promise((r) => requestAnimationFrame(r));
    this.ambient = createAmbient(this);
    this.spawner.populate();

    this.hud.buildHotbar(this.items, (i) => this.selectSlot(i));
    this.selectSlot(0, true);
    this.refreshHud(true);

    this.snapCamera();
    this.hud.drawMinimap(this.world, this.player.pos.x, this.player.pos.z, this.cam.yaw, [], [], 0);
    this.bindUI();
    this.applyQuality();
    progress(1, 'Ready');
    this.renderer.compile(this.scene, this.camera);

    document.getElementById('loading').classList.add('hidden');
    document.getElementById('title').classList.remove('hidden');
    this.last = performance.now();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.audio.unlock();
    this.cam.targetDist = 16;
    document.getElementById('title').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    this.hud.banner('Village', 'Oakhollow', 3600);
    setTimeout(() => this.hud.toast('A Monster Gate has opened in the northern forest!', 4200), 3700);
    this.audio.select();
  }

  bindUI() {
    const start = document.getElementById('btn-start');
    start.addEventListener('click', () => this.start());
    window.addEventListener('keydown', (e) => {
      if (!this.started && (e.code === 'Enter' || e.code === 'Space')) {
        this.start();
        e.preventDefault();
      }
    });
    document.getElementById('panel-close').addEventListener('click', () => this.hud.closePanel());
    document.getElementById('btn-fs').addEventListener('click', () => this.toggleFullscreen());
    document.getElementById('btn-snd').addEventListener('click', () => {
      this.audio.unlock();
      this.audio.toggle();
    });
    document.addEventListener('visibilitychange', () => {
      this.last = performance.now();
    });
    document.addEventListener('pointerdown', () => this.audio.unlock(), { once: true });
  }

  toggleFullscreen() {
    const el = document.documentElement;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el);
    if (screen.orientation?.lock && this.input.touch) screen.orientation.lock('landscape').catch(() => {});
  }

  /* ------------------------------ quality ------------------------------ */
  cycleQuality() {
    const i = QUALITIES.indexOf(this.quality);
    this.quality = QUALITIES[(i + 1) % QUALITIES.length];
    localStorage.setItem('mg-quality', this.quality.id);
    this.applyQuality();
    this.hud.toast(`Graphics: ${this.quality.label} (foliage density applies on reload)`, 2600);
  }

  applyQuality() {
    const q = this.quality;
    this.renderer.shadowMap.enabled = q.shadows;
    const sh = this.sky.sun.shadow;
    if (sh.mapSize.x !== q.shadowSize) {
      sh.mapSize.set(q.shadowSize, q.shadowSize);
      sh.map?.dispose();
      sh.map = null;
    }
    this.sky.shadowExtent = q.shadowExtent;
    const cam = sh.camera;
    cam.left = -q.shadowExtent;
    cam.right = q.shadowExtent;
    cam.top = q.shadowExtent;
    cam.bottom = -q.shadowExtent;
    cam.updateProjectionMatrix();
    this.resScale = 1;
    this.resize();
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, this.quality.dpr) * this.resScale;
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 1.2 ? 46 : 38;
    this.camera.updateProjectionMatrix();
    this.pxScale = this.renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)));
    hideUniforms.uHideRadius.value = Math.max(60, this.renderer.domElement.height * 0.09);
  }

  adaptResolution(rawMs) {
    this.frameAcc += rawMs;
    this.frameCnt++;
    if (this.frameCnt < 45) return;
    const avg = this.frameAcc / this.frameCnt;
    this.frameAcc = 0;
    this.frameCnt = 0;
    let s = this.resScale;
    if (avg > 24 && s > 0.55) s = Math.max(0.55, s - 0.15);
    else if (avg < 12.5 && s < 1) s = Math.min(1, s + 0.1);
    if (s !== this.resScale) {
      this.resScale = s;
      this.resize();
    }
  }

  /* ------------------------------ helpers ------------------------------ */
  shake(a) {
    this.shakeAmt = Math.max(this.shakeAmt, a);
  }

  hitstop(t) {
    this.hitstopT = Math.max(this.hitstopT, t);
  }

  screenOf(x, y, z, withVis = false) {
    this.tmpV.set(x, y, z).project(this.camera);
    const sx = (this.tmpV.x * 0.5 + 0.5) * window.innerWidth;
    const sy = (-this.tmpV.y * 0.5 + 0.5) * window.innerHeight;
    if (withVis) return [sx, sy, this.tmpV.z < 1 && Math.abs(this.tmpV.x) < 1.15 && Math.abs(this.tmpV.y) < 1.15];
    return [sx, sy];
  }

  itemsChanged() {
    this.hud.updateSlots(this.items, this.sel);
  }

  selectSlot(i, silent = false) {
    if (i < 0 || i >= this.items.length) return;
    this.sel = i;
    const it = this.items[i];
    this.player.setHeld(it.held || null);
    this.itemsChanged();
    if (!silent) {
      this.audio.select();
      this.hud.toast(it.name, 900);
    }
  }

  refreshHud(force = false) {
    const p = this.player;
    this.hud.setHP(p.hp, p.maxHp);
    this.hud.setStamina(p.stamina, p.maxStamina);
    this.hud.setOrb('mana', p.mana, p.maxMana);
    this.hud.setOrb('fury', p.fury, 100);
    if (force) {
      this.hud.setQuest(this.quest.text, this.quest.n, this.quest.total);
      this.hud.setGold(this.gold);
      this.hud.setRank(RANKS[this.rank]);
    }
  }

  /* ------------------------------ gameplay ------------------------------ */
  spawnProjectile(o) {
    const kind = o.kind;
    let mesh;
    if (kind === 'arrow') {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.7), new THREE.MeshBasicMaterial({ color: 0xe9d9a8 }));
    } else if (kind === 'stone') {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), new THREE.MeshBasicMaterial({ color: 0xa9a9b2 }));
    } else if (kind === 'bolt') {
      mesh = new THREE.Group();
      mesh.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshBasicMaterial({ color: 0xd9ffff })));
      mesh.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshBasicMaterial({ color: 0x4ad0ff, transparent: true, opacity: 0.45, depthWrite: false })));
    } else {
      mesh = new THREE.Group();
      mesh.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshBasicMaterial({ color: 0xf3d6ff })));
      mesh.add(new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), new THREE.MeshBasicMaterial({ color: 0xb04dff, transparent: true, opacity: 0.45, depthWrite: false })));
    }
    mesh.position.set(o.x, o.y, o.z);
    mesh.rotation.y = Math.atan2(o.vx, o.vz);
    this.scene.add(mesh);
    this.projectiles.push({ vy: 0, gravity: 0, ...o, mesh, age: 0, hit: new Set() });
  }

  killProjectile(p, fx = true) {
    p.dead = true;
    this.scene.remove(p.mesh);
    p.mesh.traverse((o) => {
      if (o.isMesh) {
        o.geometry.dispose();
        o.material.dispose();
      }
    });
    if (fx) {
      const c = p.kind === 'orb' ? [0xb04dff, 0xf3d6ff] : p.kind === 'bolt' ? [0x4ad0ff, 0xd9ffff] : [0xffffff, 0xd9c9a0];
      this.fx.burst(p.mesh.position.x, p.mesh.position.y, p.mesh.position.z, c, 7, 2.6, 0.08, 0.35);
    }
  }

  updateProjectiles(dt) {
    const P = this.player;
    for (const p of this.projectiles) {
      if (p.dead) continue;
      p.age += dt;
      p.vy -= p.gravity * dt;
      const m = p.mesh;
      m.position.x += p.vx * dt;
      m.position.y += p.vy * dt;
      m.position.z += p.vz * dt;
      if (p.kind === 'bolt' || p.kind === 'orb') m.rotation.x += dt * 8;
      if (p.age > p.life) {
        this.killProjectile(p, p.kind !== 'arrow');
        continue;
      }
      const gh = this.world.heightAt(m.position.x, m.position.z);
      if (m.position.y < gh + 0.1 || gh > m.position.y + 0.9) {
        this.killProjectile(p);
        continue;
      }
      if (p.owner === 'player') {
        for (const mon of this.monsters) {
          if (mon.dead || p.hit.has(mon)) continue;
          const dx = mon.x - m.position.x;
          const dz = mon.z - m.position.z;
          if (Math.hypot(dx, dz) < mon.radius + p.r && Math.abs(m.position.y - (mon.y + 0.8)) < 1.6) {
            p.hit.add(mon);
            const d = Math.hypot(p.vx, p.vz) || 1;
            mon.takeHit(Math.round(p.dmg * (0.9 + Math.random() * 0.25)), p.vx / d, p.vz / d, p.kind === 'bolt' ? 3 : 2);
            this.audio.hit();
            P.fury = Math.min(100, P.fury + 3);
            if (!p.pierce) {
              this.killProjectile(p);
              break;
            }
          }
        }
      } else if (Math.hypot(P.pos.x - m.position.x, P.pos.z - m.position.z) < 0.55 + p.r && Math.abs(m.position.y - (P.pos.y + 1)) < 1.2) {
        if (P.hurt(p.dmg, m.position.x - p.vx * 0.1, m.position.z - p.vz * 0.1, 3)) this.audio.hurt();
        this.killProjectile(p);
      }
    }
    this.projectiles = this.projectiles.filter((p) => !p.dead);
  }

  onMonsterKilled(m) {
    this.kills++;
    const [a, b] = m.def.gold;
    const n = Math.round(a + Math.random() * (b - a));
    const coins = Math.max(1, Math.min(4, Math.round(n / 2)));
    const each = Math.ceil(n / coins);
    for (let i = 0; i < coins; i++) this.dropCoin(m.x, m.y + 0.6, m.z, each);
    if (Math.random() < 0.18) this.dropCoin(m.x, m.y + 0.6, m.z, 0, 'heart');
    this.quest.n++;
    if (this.quest.n >= this.quest.total) this.completeQuest();
    else this.hud.setQuest(this.quest.text, this.quest.n, this.quest.total);
  }

  completeQuest() {
    const reward = 20 + this.rank * 15;
    this.gold += reward;
    this.rank = Math.min(RANKS.length - 1, this.rank + 1);
    const p = this.player;
    p.maxHp = Math.min(40, 20 + this.rank * 2);
    p.hp = p.maxHp;
    p.maxMana = 50 + this.rank * 5;
    this.quest = { text: `Slay ${5 + this.rank * 3} Gate monsters`, n: 0, total: 5 + this.rank * 3 };
    this.hud.setQuest(this.quest.text, 0, this.quest.total);
    this.hud.setGold(this.gold);
    this.hud.setRank(RANKS[this.rank]);
    this.hud.banner('Hunt complete', `Rank ${RANKS[this.rank]}  +${reward}g`, 3800);
    this.audio.quest();
    this.fx.ring(p.pos.x, p.pos.y + 0.3, p.pos.z, 0xffd23f, 22, 5, 0.12, 0.7);
    this.fx.burst(p.pos.x, p.pos.y + 1, p.pos.z, [0xffd23f, 0xffffff, 0xffa030], 24, 5, 0.12, 0.9);
  }

  dropCoin(x, y, z, value, kind = 'coin') {
    const geo = kind === 'heart' ? new THREE.BoxGeometry(0.3, 0.3, 0.12) : new THREE.CylinderGeometry(0.2, 0.2, 0.07, 8);
    const mat = new THREE.MeshBasicMaterial({ color: kind === 'heart' ? 0xff4a5c : 0xffd23f });
    const mesh = new THREE.Mesh(geo, mat);
    if (kind === 'coin') mesh.rotation.x = Math.PI / 2;
    const holder = new THREE.Group();
    holder.add(mesh);
    holder.position.set(x, y, z);
    this.scene.add(holder);
    const a = Math.random() * Math.PI * 2;
    const s = 1.5 + Math.random() * 2;
    this.pickups.push({ holder, mesh, kind, value, vx: Math.cos(a) * s, vz: Math.sin(a) * s, vy: 4 + Math.random() * 2, age: 0, grounded: false });
  }

  updatePickups(dt) {
    const P = this.player.pos;
    for (const k of this.pickups) {
      k.age += dt;
      const h = k.holder.position;
      if (!k.grounded) {
        k.vy -= 18 * dt;
        h.x += k.vx * dt;
        h.z += k.vz * dt;
        h.y += k.vy * dt;
        const gh = Math.max(this.world.heightAt(h.x, h.z), 0.4) + 0.35;
        if (h.y <= gh && k.vy < 0) {
          h.y = gh;
          k.vy = -k.vy * 0.35;
          k.vx *= 0.6;
          k.vz *= 0.6;
          if (Math.abs(k.vy) < 1) k.grounded = true;
        }
      } else {
        const gh = Math.max(this.world.heightAt(h.x, h.z), 0.4) + 0.4 + Math.sin(this.time * 4 + k.age) * 0.06;
        h.y = gh;
      }
      k.mesh.rotation.y += dt * 4;
      if (k.kind === 'heart') k.mesh.rotation.z = 0;
      const dx = P.x - h.x;
      const dz = P.z - h.z;
      const d = Math.hypot(dx, dz);
      if (k.age > 0.6 && d < 3.2) {
        const pull = (1 - d / 3.2) * 12 + 3;
        h.x += (dx / (d || 1)) * pull * dt;
        h.z += (dz / (d || 1)) * pull * dt;
        h.y += (P.y + 0.9 - h.y) * Math.min(1, dt * 6);
      }
      if (k.age > 0.5 && d < 0.8) {
        k.done = true;
        if (k.kind === 'heart') {
          this.player.heal(4);
          this.audio.potion();
          this.hud.floatText(...this.screenOf(P.x, P.y + 2, P.z), '+2', 'heal');
        } else {
          this.gold += k.value;
          this.hud.setGold(this.gold);
          this.audio.coin();
        }
        this.fx.burst(h.x, h.y, h.z, k.kind === 'heart' ? [0xff4a5c, 0xffffff] : [0xffd23f, 0xffffff], 5, 2, 0.07, 0.3);
      } else if (k.age > 40) k.done = true;
      if (k.done) {
        this.scene.remove(k.holder);
        k.mesh.geometry.dispose();
        k.mesh.material.dispose();
      }
    }
    this.pickups = this.pickups.filter((k) => !k.done);
  }

  onPlayerDeath() {
    this.hud.hurtFlash();
    document.getElementById('faint').classList.remove('hidden');
    this.audio.hurt();
    this.hitstop(0.15);
    setTimeout(() => this.respawnPlayer(), 2800);
  }

  respawnPlayer() {
    document.getElementById('faint').classList.add('hidden');
    this.player.respawn(72, 73);
    for (const m of this.monsters) if (!m.dead && Math.hypot(m.x - 72, m.z - 73) < 12) m.state = 'wander';
    this.snapCamera();
    this.hud.banner('Village', 'Oakhollow', 2400);
  }

  /* ------------------------------ interaction ------------------------------ */
  nearestMonster(maxD, from, dirBias = null) {
    let best = null;
    let bd = maxD;
    for (const m of this.monsters) {
      if (m.dead) continue;
      let d = Math.hypot(m.x - from.x, m.z - from.z);
      if (dirBias) {
        const dot = ((m.x - from.x) * dirBias.x + (m.z - from.z) * dirBias.z) / (d || 1);
        if (dot < -0.1) continue;
        d -= dot * 1.2;
      }
      if (d < bd) {
        bd = d;
        best = m;
      }
    }
    return best;
  }

  aimAtMouse() {
    const a = this.input.aim;
    if (!a.has || this.input.touch) return false;
    const nx = (a.x / window.innerWidth) * 2 - 1;
    const ny = -(a.y / window.innerHeight) * 2 + 1;
    this.ray.setFromCamera({ x: nx, y: ny }, this.camera);
    this.groundPlane.constant = -(this.player.pos.y + 0.8);
    const hit = this.ray.ray.intersectPlane(this.groundPlane, this.tmpV);
    if (!hit) return false;
    const dx = hit.x - this.player.pos.x;
    const dz = hit.z - this.player.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.2) return false;
    this.player.aimDir = new THREE.Vector3(dx / d, 0, dz / d);
    return true;
  }

  faceForAction() {
    const P = this.player;
    const f = P.facing;
    if (this.input.touch) {
      const m = this.nearestMonster(5.5, P.pos, f);
      if (m) {
        const d = Math.hypot(m.x - P.pos.x, m.z - P.pos.z) || 1;
        P.yaw = Math.atan2((m.x - P.pos.x) / d, (m.z - P.pos.z) / d);
      }
    } else if (P.aimDir && this.input.aim.has) {
      P.yaw = Math.atan2(P.aimDir.x, P.aimDir.z);
    }
  }

  doAttack() {
    const P = this.player;
    if (P.dead) return;
    const it = this.items[this.sel];
    if (it.kind === 'light' || it.kind === 'none') {
      this.hud.toast(it.kind === 'light' ? 'Torch lit - hold it up in the dark' : 'Nothing equipped', 900);
      return;
    }
    if (it.kind !== 'use') this.faceForAction();
    P.tryAttack(it);
  }

  doEvade() {
    const P = this.player;
    const inp = this.input;
    const cy = this.cam.yaw;
    const dir = new THREE.Vector3();
    if (inp.moveX || inp.moveY) {
      dir.set(Math.cos(cy) * inp.moveX + -Math.sin(cy) * -inp.moveY, 0, -Math.sin(cy) * inp.moveX + -Math.cos(cy) * -inp.moveY);
    }
    P.tryRoll(dir);
  }

  tryTalk() {
    if (this.talkNpc) {
      const npc = this.talkNpc;
      if (npc.dialogLeft > 0) {
        npc.dialogLeft--;
        this.hud.showDialog(npc.name, npc.nextLine());
      } else {
        this.hud.hideDialog();
        this.talkNpc = null;
      }
      this.audio.select();
      return;
    }
    const near = this.ambient.npcs.find((n) => n.near);
    if (!near) return;
    this.talkNpc = near;
    near.dialogLeft = Math.min(2, near.def.lines.length - 1);
    this.hud.showDialog(near.name, near.nextLine());
    this.audio.select();
  }

  handleInput() {
    const inp = this.input;
    const hud = this.hud;
    if (inp.take('escape')) {
      if (hud.panelOpen) hud.closePanel();
      else if (this.talkNpc) {
        hud.hideDialog();
        this.talkNpc = null;
      }
    }
    for (const name of [...inp.pressed]) {
      if (name.startsWith('panel:')) {
        inp.take(name);
        if (!this.started) continue;
        const id = name.slice(6);
        if (hud.panelOpen && hud.panelId === id) hud.closePanel();
        else {
          hud.openPanel(id, this);
          hud.panelId = id;
        }
        this.audio.select();
      }
    }
    if (!hud.panelOpen) hud.panelId = null;
    this.uiBlocking = hud.panelOpen || !this.started;

    if (inp.slotSelect >= 0) {
      this.selectSlot(inp.slotSelect);
      inp.slotSelect = -1;
    }
    if (!this.started) this.cam.targetYaw += this.rawDt * 0.12;
    this.cam.targetYaw += inp.rotateDelta;
    inp.rotateDelta = 0;
    if (inp.take('rotateR')) this.cam.targetYaw += Math.PI / 4;
    if (inp.take('rotateL')) this.cam.targetYaw -= Math.PI / 4;
    if (inp.zoomDelta) {
      this.cam.targetDist = clamp(this.cam.targetDist + inp.zoomDelta * 1.2, 8, 22);
      inp.zoomDelta = 0;
    }

    const blocked = this.uiBlocking;
    this.aimAtMouse();
    if (inp.take('talk')) {
      if (!blocked) this.tryTalk();
    }
    if (inp.take('attack') && !blocked) this.doAttack();
    else if (inp.attackHeld && !blocked && this.player.state === 'idle' && !inp.touch) this.doAttack();
    else if (inp.attackHeld && !blocked && this.player.state === 'idle' && inp.touch) this.doAttack();
    if (inp.take('evade') && !blocked) this.doEvade();
    if (inp.take('bolt') && !blocked) {
      this.faceForAction();
      this.player.castBolt();
    }
    if (inp.take('fury') && !blocked) this.player.castFury();
    inp.pressed.clear();

    if (this.talkNpc) {
      const n = this.talkNpc;
      if (Math.hypot(n.x - this.player.pos.x, n.z - this.player.pos.z) > 4.2) {
        hud.hideDialog();
        this.talkNpc = null;
      }
    }
  }

  /* ------------------------------ camera ------------------------------ */
  snapCamera() {
    const P = this.player.pos;
    this.cam.look.set(P.x, P.y + 1.3, P.z);
    this.cam.yaw = this.cam.targetYaw;
    this.positionCamera(0);
  }

  positionCamera(dt) {
    const c = this.cam;
    const P = this.player.pos;
    const k = dt === 0 ? 1 : Math.min(1, dt * 7);
    c.yaw += (c.targetYaw - c.yaw) * Math.min(1, dt === 0 ? 1 : dt * 9);
    c.dist += (c.targetDist - c.dist) * Math.min(1, dt === 0 ? 1 : dt * 6);
    const tx = P.x;
    const ty = P.y + 1.3;
    const tz = P.z;
    c.look.x += (tx - c.look.x) * k;
    c.look.y += (ty - c.look.y) * Math.min(1, dt === 0 ? 1 : dt * 5);
    c.look.z += (tz - c.look.z) * k;

    const pitch = c.pitch + this.forestAmt * 0.36;
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const dist = c.dist * (1 + this.forestAmt * 0.12);
    const cx = c.look.x + Math.sin(c.yaw) * cp * dist;
    const cz = c.look.z + Math.cos(c.yaw) * cp * dist;
    let cy = c.look.y + sp * dist;
    const gh = this.world.heightAt(cx, cz);
    if (cy < gh + 1.2) cy = gh + 1.2;
    this.camera.position.set(cx, cy, cz);

    if (this.shakeAmt > 0.001) {
      const s = this.shakeAmt;
      this.camera.position.x += (Math.random() - 0.5) * s * 0.9;
      this.camera.position.y += (Math.random() - 0.5) * s * 0.9;
      this.camera.position.z += (Math.random() - 0.5) * s * 0.9;
      this.shakeAmt *= Math.max(0, 1 - dt * 9);
    }
    this.camera.lookAt(c.look);
    this.camera.updateMatrixWorld();
  }

  updateHideUniforms() {
    const P = this.player.pos;
    this.tmpV.set(P.x, P.y + 1, P.z);
    const cam = this.camera;
    const depth = this.tmpV.clone().applyMatrix4(cam.matrixWorldInverse).z * -1;
    const proj = this.tmpV.project(cam);
    const rh = this.renderer.domElement.height;
    const rw = this.renderer.domElement.width;
    hideUniforms.uPlayerScreen.value.set((proj.x * 0.5 + 0.5) * rw, (proj.y * 0.5 + 0.5) * rh);
    hideUniforms.uPlayerDepth.value = depth;
  }

  /* ------------------------------ world state ------------------------------ */
  updateZone(dt) {
    const P = this.player.pos;
    const z = this.world.zoneAt(P.x, P.z);
    const dg = Math.hypot(P.x - GATE.x, P.z - GATE.z);
    const zone = dg < 11 ? ZONE.GATE : z;
    if (zone !== this.zone) {
      const first = this.zone === -1;
      this.zone = zone;
      const n = ZONE_NAMES[zone] || ['Wilds', 'Wilds'];
      this.hud.setArea(n[1]);
      if (!first && this.started && zone !== ZONE.WATER) this.hud.banner(n[0], n[1], 2800);
    }
    const inForest = zone === ZONE.FOREST || zone === ZONE.GATE ? 1 : 0;
    this.forestAmt += (inForest - this.forestAmt) * Math.min(1, dt * 1.5);
  }

  /* ------------------------------ loop ------------------------------ */
  loop(now) {
    requestAnimationFrame(this.loop);
    const raw = now - this.last;
    this.last = now;
    if (raw > 250) return;
    this.adaptResolution(raw);
    let dt = Math.min(raw / 1000, 0.05);
    if (this.hitstopT > 0) {
      this.hitstopT -= dt;
      dt *= 0.08;
    }
    this.step(dt, raw / 1000);
    this.renderer.render(this.scene, this.camera);
  }

  step(dt, rawDt) {
    this.time += dt;
    this.rawDt = rawDt;
    const t = this.time;
    this.input.update();
    this.handleInput();

    if (this.started) this.sky.setHour(this.sky.hour + rawDt / 50);

    this.player.update(dt);
    for (const m of this.monsters) m.update(dt);
    if (this.monsters.some((m) => m.remove)) {
      for (const m of this.monsters) if (m.remove) m.dispose();
      this.monsters = this.monsters.filter((m) => !m.remove);
    }
    if (this.started) this.spawner.update(dt);
    for (const n of this.ambient.npcs) n.update(dt, t);
    for (const f of this.ambient.fowl) f.update(dt, t);
    for (const b of this.ambient.butterflies) b.update(dt);
    this.updateProjectiles(dt);
    this.updatePickups(dt);

    this.positionCamera(rawDt);
    this.updateHideUniforms();
    this.updateZone(dt);

    const P = this.player;
    this.sky.update(dt, t, this.camera.position.clone().lerp(this.cam.look, 0.5), this.camera);
    this.sky.assignTorchLights(this.world.lightSpots, P.pos.x, P.pos.z);
    const night = this.sky.night;
    const scale = this.pxScale * 0.03;
    this.fx.update(dt, t, P.pos, scale, night, this.forestAmt);
    this.world.haloMat.uniforms.uScale.value = scale;
    this.world.haloMat.uniforms.uNight.value = night;
    this.world.update(dt, t);

    this.hud.setClock(this.sky.hour);
    this.refreshHud();
    const near = this.ambient.npcs.some((n) => n.near);
    this.hud.setTalkVisible(near && this.input.touch);
    this.hud.drawMinimap(this.world, P.pos.x, P.pos.z, this.cam.yaw, this.monsters.filter((m) => !m.dead), this.ambient.npcs, t);
  }
}

const game = new Game();
window.__game = game;
game.load().catch((e) => {
  console.error(e);
  document.getElementById('load-text').textContent = 'Failed to load: ' + e.message;
});

export { lerp, GUILD };
