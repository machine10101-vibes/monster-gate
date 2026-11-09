import '@fontsource/press-start-2p/400.css';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/600.css';
import './style.css';
import * as THREE from 'three';
import { World } from './world/world.js';
import { Sky } from './world/sky.js';
import { Snowfall } from './world/snowfall.js';
import { FX } from './engine/fx.js';
import { VFX } from './engine/vfx.js';
import { Audio8 } from './engine/audio.js';
import { Input } from './engine/input.js';
import { hideUniforms } from './engine/materials.js';
import { Player } from './entities/player.js';
import { buildHeld } from './entities/humanoid.js';
import { Spawner } from './entities/monsters.js';
import { RemoteHunter } from './entities/remote.js';
import { Session } from './net/session.js';
import { createAmbient } from './entities/ambient.js';
import { HUD, ITEMS, POTION_SHOP } from './ui/hud.js';
import { Progress } from './systems/progress.js';
import { Roster, lookOptions } from './systems/roster.js';
import { CharacterSelect } from './ui/charselect.js';
import { CLASSES, SKILLS, attrDef, weaponDef } from './data/skills.js';
import { buildProjectileMesh, endProjectile, initProjectile, tickProjectile } from './systems/skillfx.js';
import { castSkill, clearSkillWorld, noteProjectileEnd, scaleDmg, skillMods, skillOnHit, updateSkillWorld } from './systems/skillcast.js';
import { Catalog } from './ui/catalog.js';
import { Gathering } from './systems/gather.js';
import { GOODS } from './data/gathering.js';
import { updateGatherSites } from './world/gatherSite.js';
import { MONSTERS, MATERIALS, gearById } from './data/catalog.js';
import { ZONE, GATE, GUILD } from './world/terrain.js';
import { updateCaveTravel, tendCaveDragon, restoreOverworld, enterCave } from './world/cave.js';
import { clearAccount, createAccount, readAccount, signInAccount } from './wallet/account.js';
import { clearSession, inKleverHandoff, isMobile, launchKleverApp, markPrompt, promptIsCooling, readSession, shortAddress, showWalletHelp, signIn } from './wallet/klever.js';
import { clearCloudToken, flushCloud, schedulePush, syncHunt } from './wallet/cloud.js';
import { clamp, lerp } from './engine/voxel.js';
import { exitGameFullscreen, isFullscreen, isLandscape as landscapeNow, requestGameFullscreen } from './engine/immersive.js';

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
  [ZONE.MINE]: ['Mine', 'Greyrock Pit'],
  [ZONE.LAKE]: ['Lake', 'Mirrormere'],
  [ZONE.SOUTH]: ['River Vale', 'Southford'],
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
    this.punchAmt = 0;
    this.slowT = 0;
    this.slowK = 1;
    this.shakeAmt = 0;
    this.monsters = [];
    this.projectiles = [];
    this.pickups = [];
    this.gold = 0;
    this.kills = 0;
    this.rank = 0;
    this.quest = { text: 'Slay 5 Gate monsters', n: 0, total: 5 };
    this.items = ITEMS.map((i) => ({ ...i }));
    this.progress = new Progress();
    this.gold = this.progress.gold;
    for (const it of this.items) if (it.kind === 'use' && this.progress.hasStock(it.id)) it.count = this.progress.stock(it.id);
    this.catalog = new Catalog(this);
    this.discoverT = 0;
    this.sel = 0;
    this.started = false;
    this.zone = -1;
    this.forestAmt = 0;
    this.resScale = 1;
    this.frameAvg = 16;
    this.frameAcc = 0;
    this.frameCnt = 0;
    this.talkNpc = null;
    this.remotes = new Map();
    this.net = new Session(this);
    this.net.onChange = () => this.refreshWaygate();
    this.waygateNear = false;
    this.waygateHinted = false;
    this.guestBound = false;
    this.wallet = null;
    this.roster = null;
    this.character = null;
    this.walletBusy = false;
    this.walletNote = '';
    this.cloudState = 'off';
    this.cloudSyncing = false;
    this.cloudConflict = false;
    this.saveAcc = 0;
    this.accountWatch = false;
    this.cam = { yaw: Math.PI * 0.08, targetYaw: Math.PI * 0.08, pitch: 0.8, dist: 24, targetDist: 24, pos: new THREE.Vector3(), look: new THREE.Vector3() };
    this.uiBlocking = false;

    this.initRenderer();
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.3, 320);
    this.tmpV = new THREE.Vector3();
    this.ray = new THREE.Raycaster();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.bindImmersive();
    this.charSelect = new CharacterSelect(this);
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
    if (this.world.cave) this.scene.add(this.world.cave.group);
    this.sky = new Sky(this.scene, this.quality);
    this.snowfall = new Snowfall(this.scene);
    this.chill = 0;
    this.fx = new FX(this.scene, this.quality);
    this.vfx = new VFX(this);
    this.fx.vfx = this.vfx;
    this.gather = new Gathering(this);
    this.player = new Player(this);
    this.spawner = new Spawner(this);
    progress(0.95, 'Waking the villagers');
    await new Promise((r) => requestAnimationFrame(r));
    this.ambient = createAmbient(this);
    this.spawner.populate();

    this.applyGear(true);
    this.hud.buildHotbar(this.items, (i) => this.onHotbar(i));
    this.selectSlot(0, true);
    this.refreshHud(true);

    this.snapCamera();
    this.hud.drawMinimap(this.world, this.player.pos.x, this.player.pos.z, this.cam.yaw, [], [], 0);
    this.bindUI();
    this.applyQuality();
    const account = readAccount();
    const klever = readSession();
    const session = account && klever
      ? ((account.at || 0) >= (klever.at || 0) ? account : klever)
      : (account || klever);
    if (session) {
      await this.applyWallet(session);
      this.watchAccount();
    }
    this.refreshWalletUi();
    progress(1, 'Ready');
    this.renderer.compile(this.scene, this.camera);

    document.getElementById('loading').classList.add('hidden');
    if (!this.charSelect.active) document.getElementById('title').classList.remove('hidden');
    this.last = performance.now();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  start() {
    if (this.started) return;
    if (!this.wallet?.address || this.cloudSyncing || !this.character) return;
    document.body.classList.add('hunting');
    if (this.input.touch && this.isLandscape()) this.enterImmersive({ gesture: true, lock: true });
    this.started = true;
    this.audio.unlock();
    this.cam.targetDist = 16;
    document.getElementById('title').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    const returning = this.restoreHunter();
    if (this.world.realm === 'cave') this.hud.banner('Dragon Cave', 'Darksycle Den', 3200);
    else if (returning) this.hud.banner('Welcome back', this.character.name, 3200);
    else {
      this.hud.banner('Village', 'Oakhollow', 3600);
      setTimeout(() => this.hud.toast('A Monster Gate has opened in the northern forest!', 4200), 3700);
    }
    this.audio.select();
    this.watchAccount();
  }

  rebindFromProgress() {
    this.gold = this.progress.gold;
    this.items = ITEMS.map((i) => ({ ...i }));
    for (const it of this.items) if (it.kind === 'use' && this.progress.hasStock(it.id)) it.count = this.progress.stock(it.id);
    this.applyGear(true);
    this.hud.buildHotbar(this.items, (i) => this.onHotbar(i));
    this.selectSlot(0, true);
    this.refreshHud(true);
  }

  onPushed(result) {
    if (!result) return;
    if (result.revision && this.roster) this.roster.revision = result.revision;
    if (result.conflict && !this.cloudConflict) {
      this.cloudConflict = true;
      this.progress.onCloud = null;
      const noun = this.wallet?.kind === 'email' ? 'account' : 'wallet';
      this.hud?.toast(`A newer hunt is saved to this ${noun}. Reload to use it.`, 4200);
      this.charSelect?.note(`A newer hunt is saved to this ${noun}. Reload to use it.`, true);
    }
  }

  bindCloudPush() {
    this.progress.onCloud = (data) => {
      this.roster.touch(data.savedAt);
      schedulePush(this.wallet, this.roster.data, (result) => this.onPushed(result));
    };
  }

  /** Send the character list to the guild record after it changes. */
  pushRoster() {
    if (!this.roster || !this.wallet) return;
    this.roster.touch(Date.now());
    this.roster.save();
    if (this.cloudState !== 'on' || this.cloudConflict) return;
    schedulePush(this.wallet, this.roster.data, (result) => this.onPushed(result));
  }

  async applyWallet(session) {
    this.wallet = session;
    this.cloudConflict = false;
    this.progress.onCloud = null;
    this.character = null;
    this.charSelect.close();
    this.roster = new Roster(session.address, session.email || '');
    this.walletNote = this.roster.chars.length ? 'loaded' : 'new';
    this.cloudSyncing = true;
    this.cloudState = 'off';
    this.refreshWalletUi();
    const gate = { open: true };
    try {
      const result = await Promise.race([
        syncHunt(session, this.roster, gate).catch(() => ({ state: 'error', replaced: false })),
        new Promise((_, reject) => setTimeout(() => {
          gate.open = false;
          reject(new Error('timeout'));
        }, 8000)),
      ]);
      this.cloudState = result.state;
      if (result.replaced) this.walletNote = 'loaded';
      if (result.state === 'on') this.bindCloudPush();
    } catch {
      this.cloudState = 'error';
    }
    this.cloudSyncing = false;
    this.refreshWalletUi();
    if (this.wallet === session && !this.started) this.openCharacterSelect();
  }

  openCharacterSelect() {
    if (this.started || !this.wallet?.address || !this.roster || this.cloudSyncing) return;
    this.charSelect.open();
  }

  leaveCharacterSelect() {
    this.signOut(false);
  }

  /** Put the chosen character in the world. Runs inside the tap so phones can go fullscreen. */
  enterWorld(char) {
    if (this.started || !this.roster?.get(char.id)) return;
    this.character = char;
    this.roster.played(char.id);
    this.progress.useCharacter(this.roster.charKey(char.id));
    if (this.cloudState === 'on' && !this.cloudConflict) this.bindCloudPush();
    this.player.lookOpts = lookOptions(char.look);
    this.player.armorKey = null;
    this.rebindFromProgress();
    this.net.name = char.name;
    try {
      localStorage.setItem('mg-name', char.name);
    } catch {
      /* the name just will not prefill */
    }
    this.charSelect.close();
    this.start();
    this.pushRoster();
  }

  refreshWalletUi() {
    const status = document.getElementById('wallet-status');
    const sign = document.getElementById('btn-wallet');
    const start = document.getElementById('btn-start');
    const swap = document.getElementById('btn-wallet-switch');
    const help = document.getElementById('wallet-help');
    if (!status || !sign || !start || !swap) return;
    const choices = document.getElementById('account-choices');
    const panel = document.getElementById('account-panel');
    const forming = !!panel && !panel.classList.contains('hidden');
    const signed = !!this.wallet?.address;
    const email = this.wallet?.kind === 'email';
    choices?.classList.toggle('hidden', signed || forming);
    sign.classList.toggle('hidden', signed || forming);
    start.classList.add('hidden');
    swap.classList.toggle('hidden', !signed);
    if (!signed) {
      help?.classList.add('hidden');
      if (!forming) {
        const where = window.kleverWeb ? (isMobile() ? 'Klever Wallet' : 'the Klever extension') : 'your Klever wallet';
        sign.textContent = window.kleverWeb ? `Sign in with ${where}` : 'Sign in with Klever';
        status.textContent = window.kleverWeb
          ? 'Tap Sign in. On the Klever screen, tap Confirm and leave that window open until it accepts.'
          : 'Create an account with your email and password. The same account signs in on any device.';
      }
      return;
    }
    panel?.classList.add('hidden');
    help?.classList.add('hidden');
    swap.textContent = email ? 'Sign out' : 'Use a different wallet';
    status.replaceChildren();
    const who = document.createElement('b');
    if (email) who.className = 'account-email';
    who.textContent = this.wallet.email || shortAddress(this.wallet.address);
    const noun = email ? 'account' : 'wallet';
    status.append(
      this.cloudSyncing ? `Opening the characters saved to this ${noun}, ` : 'Signed in as ',
      who,
      this.cloudSyncing ? '…' : '.'
    );
  }

  openAccount(mode) {
    const panel = document.getElementById('account-panel');
    const status = document.getElementById('wallet-status');
    const confirm = document.getElementById('account-confirm');
    const confirmLabel = document.getElementById('account-confirm-label');
    const submit = document.getElementById('account-submit');
    const password = document.getElementById('account-password');
    const error = document.getElementById('account-error');
    if (!panel) return;
    panel.dataset.mode = mode;
    panel.classList.remove('hidden');
    confirm?.classList.toggle('hidden', mode !== 'create');
    confirmLabel?.classList.toggle('hidden', mode !== 'create');
    if (submit) submit.textContent = mode === 'create' ? 'Create account' : 'Sign in';
    if (password) password.setAttribute('autocomplete', mode === 'create' ? 'new-password' : 'current-password');
    if (error) error.textContent = '';
    if (status) {
      status.textContent = mode === 'create'
        ? 'Choose an email and a password. This account signs in on any device.'
        : 'Sign in with the email and password for your account.';
    }
    this.refreshWalletUi();
    document.getElementById('account-email')?.focus();
  }

  closeAccount() {
    const panel = document.getElementById('account-panel');
    panel?.reset();
    panel?.classList.add('hidden');
    const error = document.getElementById('account-error');
    if (error) error.textContent = '';
  }

  async onAccountSubmit(event) {
    event.preventDefault();
    if (this.walletBusy) return;
    const panel = document.getElementById('account-panel');
    const mode = panel?.dataset.mode || 'create';
    const email = document.getElementById('account-email')?.value || '';
    const password = document.getElementById('account-password')?.value || '';
    const confirm = document.getElementById('account-confirm')?.value || '';
    const error = document.getElementById('account-error');
    const submit = document.getElementById('account-submit');
    this.walletBusy = true;
    if (submit) submit.disabled = true;
    if (error) error.textContent = '';
    try {
      const session = mode === 'create'
        ? await createAccount(email, password, confirm)
        : await signInAccount(email, password);
      this.closeAccount();
      await this.applyWallet(session);
      this.watchAccount();
    } catch (err) {
      if (error) error.textContent = err.message || 'The account could not be created.';
    } finally {
      this.walletBusy = false;
      if (submit) submit.disabled = false;
    }
  }

  signOut(repromptKlever) {
    this.captureHunter();
    flushCloud();
    clearSession();
    clearAccount();
    clearCloudToken();
    this.progress.onCloud = null;
    this.wallet = null;
    this.roster = null;
    this.character = null;
    this.walletNote = '';
    this.cloudState = 'off';
    this.charSelect.close();
    document.getElementById('title').classList.remove('hidden');
    this.closeAccount();
    this.refreshWalletUi();
    if (repromptKlever) this.onWallet();
  }

  handOffToWallet() {
    const sign = document.getElementById('btn-wallet');
    const status = document.getElementById('wallet-status');
    if (sign) sign.disabled = true;
    if (status) status.textContent = 'Opening Klever Wallet…';
    launchKleverApp();
    document.getElementById('account-choices')?.classList.add('hidden');
    const finish = () => {
      this.walletBusy = false;
      if (sign) sign.disabled = false;
      if (this.wallet?.address) return;
      document.getElementById('account-choices')?.classList.remove('hidden');
      // Coming back from the wallet must not open it again. The hunter taps Sign in to retry.
      const help = document.getElementById('wallet-help');
      if (help) showWalletHelp(help, 'mobile-app');
      if (status) status.textContent = 'Klever Wallet is open. Tap Sign in there, then approve the signature.';
    };
    window.setTimeout(() => {
      if (!document.hidden) {
        finish();
        return;
      }
      const onBack = () => {
        if (document.hidden) return;
        document.removeEventListener('visibilitychange', onBack);
        finish();
      };
      document.addEventListener('visibilitychange', onBack);
    }, 1500);
  }

  async onWallet(automatic = false) {
    if (this.walletBusy) return;
    if (automatic && (this.wallet?.address || promptIsCooling())) return;
    if (isMobile() && !window.kleverWeb && !inKleverHandoff()) {
      markPrompt();
      this.walletBusy = true;
      this.handOffToWallet();
      return;
    }
    markPrompt();
    this.walletBusy = true;
    document.getElementById('account-choices')?.classList.add('hidden');
    this.closeAccount();
    const sign = document.getElementById('btn-wallet');
    const status = document.getElementById('wallet-status');
    if (sign) sign.disabled = true;
    if (status) status.textContent = isMobile()
      ? 'Confirm the signature in the Klever Wallet app…'
      : 'Confirm the signature in the Klever extension…';
    try {
      const session = await signIn();
      await this.applyWallet(session);
      this.watchAccount();
    } catch (err) {
      const help = document.getElementById('wallet-help');
      if (help && (err.code === 'mobile-app' || err.code === 'extension')) showWalletHelp(help, err.code);
      if (status) status.textContent = err.message || 'Klever sign-in failed.';
    } finally {
      this.walletBusy = false;
      if (sign) sign.disabled = false;
      if (!this.wallet?.address) document.getElementById('account-choices')?.classList.remove('hidden');
    }
  }

  watchAccount() {
    const hub = window.kleverHub;
    if (this.accountWatch || !hub || typeof hub.onAccountChanged !== 'function') return;
    this.accountWatch = true;
    hub.onAccountChanged((event) => {
      const next = event?.address;
      if (!next || next === this.wallet?.address) return;
      this.captureHunter();
      clearSession();
      this.wallet = null;
      if (this.started) location.reload();
      else {
        this.roster = null;
        this.charSelect.close();
        document.getElementById('title').classList.remove('hidden');
        this.refreshWalletUi();
      }
    });
  }

  captureHunter() {
    if (!this.started || !this.wallet || !this.player) return;
    const p = this.player;
    this.progress.rememberHunter({
      x: p.pos.x,
      z: p.pos.z,
      yaw: p.yaw,
      hp: p.hp,
      mana: p.mana,
      stamina: p.stamina,
      rank: this.rank,
      quest: this.quest,
      realm: this.world?.realm,
    });
  }

  restoreHunter() {
    const h = this.progress.data.hunter;
    if (!h) return false;
    this.rank = h.rank;
    if (h.quest?.text) this.quest = { text: h.quest.text, n: h.quest.n, total: h.quest.total };
    if (h.realm === 'cave' && this.world.cave) enterCave(this);
    else if (this.world.playable(h.x, h.z)) {
      const y = this.world.heightAt(h.x, h.z);
      this.player.pos.set(h.x, y, h.z);
      this.player.yaw = h.yaw;
      this.cam.yaw = h.yaw;
      this.cam.targetYaw = h.yaw;
      this.player.syncObj();
    }
    this.syncVitals();
    const p = this.player;
    if (h.hp > 0) p.hp = Math.min(p.maxHp, h.hp);
    p.mana = Math.min(p.maxMana, h.mana);
    p.stamina = Math.min(p.maxStamina, h.stamina);
    this.refreshHud(true);
    this.snapCamera();
    return true;
  }

  bindUI() {
    const start = document.getElementById('btn-start');
    const sign = document.getElementById('btn-wallet');
    const swap = document.getElementById('btn-wallet-switch');
    start.addEventListener('click', () => this.start());
    sign.addEventListener('click', () => this.onWallet());
    document.getElementById('btn-account-create')?.addEventListener('click', () => this.openAccount('create'));
    document.getElementById('btn-account-signin')?.addEventListener('click', () => this.openAccount('signin'));
    document.getElementById('account-cancel')?.addEventListener('click', () => {
      this.closeAccount();
      this.refreshWalletUi();
    });
    document.getElementById('account-panel')?.addEventListener('submit', (event) => this.onAccountSubmit(event));
    swap.addEventListener('click', () => this.signOut(this.wallet?.kind !== 'email'));
    window.addEventListener('keydown', (e) => {
      if (this.started || this.charSelect.active || (e.code !== 'Enter' && e.code !== 'Space')) return;
      if (e.target?.closest?.('input, textarea, #account-panel')) return;
      if (!document.getElementById('account-panel')?.classList.contains('hidden')) return;
      if (this.wallet) {
        e.preventDefault();
        return;
      }
      e.preventDefault();
    });
    document.getElementById('panel-close').addEventListener('click', () => this.hud.closePanel());
    document.getElementById('btn-fs').addEventListener('click', () => this.toggleFullscreen());
    document.getElementById('btn-snd').addEventListener('click', () => {
      this.audio.unlock();
      this.audio.toggle();
    });
    document.addEventListener('visibilitychange', () => {
      this.last = performance.now();
      if (document.hidden) this.captureHunter();
    });
    window.addEventListener('pagehide', () => {
      this.captureHunter();
      flushCloud();
    });
    document.addEventListener('pointerdown', () => this.audio.unlock(), { once: true });
  }

  toggleFullscreen() {
    if (isFullscreen()) exitGameFullscreen();
    else this.enterImmersive({ gesture: true, lock: this.input.touch });
  }

  /* ------------------------- landscape fullscreen ------------------------- */
  bindImmersive() {
    const sync = () => this.syncImmersive();
    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', () => {
      this.tucked = false;
      sync();
      setTimeout(sync, 80);
      setTimeout(sync, 350);
    });
    screen.orientation?.addEventListener?.('change', () => {
      this.tucked = false;
      sync();
    });
    const onViewport = () => {
      // A Klever confirm sheet resizes the page. Resizing back dismisses that sheet.
      if (!this.started || this.walletBusy) return;
      this.resize();
    };
    window.visualViewport?.addEventListener('resize', onViewport);
    window.visualViewport?.addEventListener('scroll', onViewport);
    document.addEventListener('fullscreenchange', onViewport);
    document.addEventListener('webkitfullscreenchange', onViewport);
    window.addEventListener(
      'pointerdown',
      (e) => {
        if (!this.started || this.walletBusy || !this.input.touch || e.target.closest?.('#btn-fs, #title, #wallet-help, #loading')) return;
        if (this.isLandscape()) this.enterImmersive({ gesture: true, lock: true });
        else if (e.target.closest?.('#rotate-overlay')) requestGameFullscreen(true);
      },
      { capture: true }
    );
    sync();
  }

  isLandscape() {
    return landscapeNow();
  }

  syncImmersive() {
    if (this.walletBusy || !this.started) return;
    if (!this.input.touch) {
      this.resize();
      return;
    }
    if (this.isLandscape()) this.enterImmersive();
    else {
      document.documentElement.classList.remove('landscape-full');
      this.tucked = false;
      this.clearTuck();
      this.resize();
    }
  }

  /**
   * Landscape phones: hide the browser toolbar and stretch the game to the screen.
   * `gesture` is set when this runs inside a tap, which is when browsers allow fullscreen.
   */
  enterImmersive({ gesture = false, lock = false } = {}) {
    document.documentElement.classList.add('landscape-full');
    const now = performance.now();
    const cooled = !this.fsTriedAt || now - this.fsTriedAt > 900;
    if (!isFullscreen() && (gesture || cooled)) {
      this.fsTriedAt = now;
      requestGameFullscreen(lock && gesture);
    }
    if (gesture || !this.tucked) {
      this.tucked = true;
      this.tuckChrome();
    }
    this.resize();
  }

  /** Scroll the mobile URL bar off, then pin the game to the visible screen. */
  tuckChrome() {
    if (isFullscreen() || this.tuckTimer) return;
    const html = document.documentElement;
    const tall = window.innerHeight + 120 + 'px';
    html.style.height = 'auto';
    html.style.minHeight = tall;
    html.style.overflow = 'auto';
    document.body.style.minHeight = tall;
    const kick = () => window.scrollTo(0, 80);
    kick();
    setTimeout(kick, 40);
    this.tuckTimer = setTimeout(() => {
      this.tuckTimer = 0;
      if (!document.documentElement.classList.contains('landscape-full')) return;
      if (isFullscreen()) this.clearTuck();
      else window.scrollTo(0, 1);
      document.documentElement.style.overflow = 'hidden';
      this.resize();
    }, 280);
  }

  clearTuck() {
    if (this.tuckTimer) {
      clearTimeout(this.tuckTimer);
      this.tuckTimer = 0;
    }
    const html = document.documentElement;
    html.style.overflow = '';
    html.style.height = '';
    html.style.minHeight = '';
    document.body.style.minHeight = '';
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
    if (this.vfx) this.vfx.density = q.density;
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
    const app = document.getElementById('app');
    const vv = window.visualViewport;
    let w = window.innerWidth;
    let h = window.innerHeight;
    if (this.input?.touch && this.isLandscape?.()) {
      if (isFullscreen()) {
        w = window.innerWidth;
        h = window.innerHeight;
      } else if (vv) {
        w = vv.width;
        h = vv.height;
      }
      if (app) {
        app.style.left = '0px';
        app.style.top = (isFullscreen() ? 0 : Math.round(vv?.offsetTop || 0)) + 'px';
        app.style.width = Math.round(w) + 'px';
        app.style.height = Math.round(h) + 'px';
      }
    } else if (app) {
      app.style.left = '';
      app.style.top = '';
      app.style.width = '';
      app.style.height = '';
    }
    w = Math.round(w);
    h = Math.round(h);
    if (w < 2 || h < 2) return;
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

  punch(a) {
    this.punchAmt = Math.max(this.punchAmt, a);
  }

  slowmo(t, k = 0.3) {
    this.slowT = Math.max(this.slowT, t);
    this.slowK = k;
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

  /** Hotbar taps select gear. Potions and philters are drunk on the tap. */
  onHotbar(i) {
    const it = this.items[i];
    if (!it) return;
    if (it.kind === 'use') {
      if (this.player?.tryAttack(it)) this.selectSlot(i, true);
      return;
    }
    this.selectSlot(i);
  }

  /** The starter blade stands in for whatever weapon is actually equipped. */
  carried(it) {
    const w = this.progress.weaponItem;
    if (w && it && (it.id === 'blade' || it.held === 'blade')) return { ...w };
    return it;
  }

  selectSlot(i, silent = false) {
    if (i < 0 || i >= this.items.length) return;
    this.sel = i;
    const raw = this.items[i];
    const it = this.carried(raw);
    if (it !== raw) {
      this.items[i] = it;
      this.hud.buildHotbar(this.items, (n) => this.onHotbar(n));
    }
    this.player.setHeld(it.held || null);
    this.syncVitals();
    this.itemsChanged();
    if (!silent) {
      this.audio.select();
      this.hud.toast(it.name, 900);
    }
  }

  applyGear(initial = false) {
    const pr = this.progress;
    const p = this.player;
    p.setArmor(pr.armorLook());
    p.reduction = pr.reduction;
    this.syncVitals();
    const w = pr.weaponItem;
    // The equipped weapon replaces the starter blade in the main hand slot.
    this.items[0] = w ? { ...w } : { ...ITEMS[0] };
    this.items[7] = { ...ITEMS[7] };
    p.setSheath(w?.held || 'blade');
    if (!initial) {
      this.hud.buildHotbar(this.items, (i) => this.onHotbar(i));
      this.selectSlot(this.sel, true);
      this.refreshHud();
    }
  }

  syncVitals() {
    const p = this.player;
    if (!p) return;
    const mods = skillMods(this);
    const max = Math.min(40, 20 + this.rank * 2) + this.progress.bonusHp + (mods.hp || 0);
    if (p.maxHp !== max) {
      const gain = Math.max(0, max - p.maxHp);
      p.maxHp = max;
      p.hp = Math.min(max, p.hp + gain);
    }
    const maxMana = 50 + this.rank * 5 + this.progress.bonusMana + (mods.mana || 0);
    if (p.maxMana !== maxMana) {
      const gain = Math.max(0, maxMana - p.maxMana);
      p.maxMana = maxMana;
      p.mana = Math.min(maxMana, p.mana + gain);
    }
    const maxStamina = 100 + (mods.stamina || 0);
    if (p.maxStamina !== maxStamina) {
      const gain = Math.max(0, maxStamina - p.maxStamina);
      p.maxStamina = maxStamina;
      p.stamina = Math.min(maxStamina, p.stamina + gain);
    }
  }

  castSlot(i) {
    const p = this.player;
    if (!p || p.dead) return false;
    const id = this.progress.equipped()[i];
    if (!id) {
      if (i === 0) {
        this.faceForAction();
        p.castBolt();
        return true;
      }
      if (i === 2) {
        p.castFury();
        return true;
      }
      this.hud.toast('No skill equipped. Press K.');
      return false;
    }
    this.faceForAction();
    return castSkill(this, id);
  }

  chooseClass(id) {
    const cur = this.progress.classId;
    if (!CLASSES[id] || cur === id) return false;
    const cost = cur ? 25 : 0;
    if (this.gold < cost) {
      this.hud.toast('Need 25 gold to walk a different path.');
      return false;
    }
    if (cost) this.addGold(-cost);
    this.progress.setClass(id);
    clearSkillWorld(this);
    this.applyGear();
    this.hud.toast(CLASSES[id].name + ' path chosen.');
    return true;
  }

  learnSkill(id) {
    if (!this.progress.learn(id)) return false;
    this.applyGear();
    const skill = SKILLS[id];
    if (skill) this.hud.toast(skill.name + ' learned.', 1400);
    return true;
  }

  raiseAttr(id) {
    if (!this.progress.raiseAttr(id)) return false;
    this.applyGear();
    const def = attrDef(this.progress.classId, id);
    if (def) this.hud.toast(def.name + ' raised.', 1200);
    return true;
  }

  raiseWeapon(id) {
    if (!this.progress.raiseWeapon(id)) return false;
    this.applyGear();
    const def = weaponDef(this.progress.classId, id);
    if (def) this.hud.toast(def.name + ' raised.', 1200);
    return true;
  }

  wearPiece(id) {
    const g = gearById(id);
    if (!g || !this.progress.crafted(id)) return false;
    const was = this.progress.worn(id);
    this.progress.toggleWear(id);
    this.applyGear();
    if (g.type === 'weapon') this.selectSlot(0, true);
    this.audio.select();
    this.hud.toast(was ? `${g.name} unequipped` : `${g.name} equipped`, 1200);
    return true;
  }

  equipSkill(slot, id) {
    const ok = this.progress.equip(slot, id);
    if (ok) this.hud.updateSkillbar(this);
    return ok;
  }

  respecSkills() {
    if (!this.progress.classId) return false;
    const learned = Object.keys(this.progress.data.skills.learned).length;
    const attrs = this.progress.data.skills.attrs || {};
    const weapons = this.progress.data.skills.weapons || {};
    const invested = learned || Object.values(attrs).some((n) => n > 0) || Object.values(weapons).some((n) => n > 0);
    if (!invested) {
      this.hud.toast('No skills to respec.');
      return false;
    }
    if (this.gold < 15) {
      this.hud.toast('Respec costs 15 gold.');
      return false;
    }
    this.addGold(-15);
    this.progress.clearLearned();
    clearSkillWorld(this);
    this.applyGear();
    this.hud.toast('Skills cleared. Points returned.');
    return true;
  }

  checkDiscoveries(dt) {
    this.discoverT -= dt;
    if (this.discoverT > 0) return;
    this.discoverT = 0.5;
    const P = this.player.pos;
    for (const m of this.monsters) {
      if (m.dead || this.progress.seen(m.type)) continue;
      if (Math.hypot(m.x - P.x, m.z - P.z) > 15) continue;
      this.progress.discover(m.type);
      const info = MONSTERS.find((x) => x.id === m.type);
      if (info) {
        this.hud.banner('Catalog updated', info.name, 3000);
        this.audio.quest();
      }
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
    this.hud.updateSkillbar(this);
  }

  /* ------------------------------ gameplay ------------------------------ */
  spawnProjectile(o) {
    const mesh = buildProjectileMesh(o);
    mesh.position.set(o.x, o.y, o.z);
    mesh.rotation.y = Math.atan2(o.vx, o.vz);
    this.scene.add(mesh);
    const proj = { vy: 0, gravity: 0, ...o, mesh, age: 0, hit: new Set() };
    this.projectiles.push(proj);
    initProjectile(this, proj);
  }

  killProjectile(p, fx = true, ground = false) {
    noteProjectileEnd(this, p);
    p.dead = true;
    this.scene.remove(p.mesh);
    p.mesh.traverse((o) => {
      if (o.isMesh) {
        o.geometry.dispose();
        o.material.dispose();
      }
    });
    if (fx) endProjectile(this, p, ground);
    else p.trail?.end();
  }

  steerProjectile(p, dt) {
    const m = p.mesh;
    let tx;
    let ty;
    let tz;
    if (p.owner === 'player') {
      let best = null;
      let bd = 12;
      for (const mon of this.monsters) {
        if (mon.dead) continue;
        const d = Math.hypot(mon.x - m.position.x, mon.z - m.position.z);
        if (d < bd) {
          bd = d;
          best = mon;
        }
      }
      if (!best) return;
      tx = best.x;
      ty = best.y + best.hover + 0.9;
      tz = best.z;
    } else {
      tx = this.player.pos.x;
      ty = this.player.pos.y + 1;
      tz = this.player.pos.z;
    }
    const sp = Math.hypot(p.vx, p.vz) || 1;
    const dx = tx - m.position.x;
    const dz = tz - m.position.z;
    const d = Math.hypot(dx, dz) || 1;
    const k = Math.min(1, dt * p.homing);
    const nx = p.vx / sp + (dx / d - p.vx / sp) * k;
    const nz = p.vz / sp + (dz / d - p.vz / sp) * k;
    const nl = Math.hypot(nx, nz) || 1;
    p.vx = (nx / nl) * sp;
    p.vz = (nz / nl) * sp;
    p.vy += ((ty - m.position.y) / Math.max(0.6, d / sp) - p.vy) * k;
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
      if (p.kind === 'bolt' || p.kind === 'orb' || p.kind === 'ember' || p.kind === 'frost') m.rotation.x += dt * 8;
      if (p.kind === 'crescent') m.rotation.y += dt * 16;
      if (p.kind === 'gloom') m.rotation.y += dt * 5;
      if (p.homing && p.age > 0.25) this.steerProjectile(p, dt);
      tickProjectile(this, p, dt);
      if (p.age > p.life) {
        this.killProjectile(p, p.kind !== 'arrow');
        continue;
      }
      const gh = this.world.heightAt(m.position.x, m.position.z);
      if (m.position.y < gh + 0.1 || gh > m.position.y + 0.9) {
        this.killProjectile(p, true, true);
        continue;
      }
      if (p.owner === 'player') {
        for (const mon of this.monsters) {
          if (mon.dead || p.hit.has(mon)) continue;
          const dx = mon.x - m.position.x;
          const dz = mon.z - m.position.z;
          if (Math.hypot(dx, dz) < mon.radius + p.r && Math.abs(m.position.y - (mon.y + (mon.hover || 0) + 0.8)) < 1.6 + ((mon.hover || 0) > 2.5 ? mon.hover : 0)) {
            p.hit.add(mon);
            const d = Math.hypot(p.vx, p.vz) || 1;
            const mods = skillMods(this);
            let dealt = scaleDmg(this, Math.round(p.dmg * (0.9 + Math.random() * 0.25)), p.spell ? 'spell' : 'ranged');
            if (!p.spell && this.progress.hasSkill('killshot') && mon.markT > 0) dealt = Math.round(dealt * 1.25);
            let crit = !!p.crit;
            if (!crit && Math.random() < (mods.crit || 0)) {
              crit = true;
              dealt = Math.round(dealt * 1.8);
            }
            this.strikeMonster(mon, dealt, p.vx / d, p.vz / d, p.kind === 'bolt' || p.kind === 'frost' ? 3 : 2, crit);
            if (!p.skill && (p.kind === 'icicle' || p.kind === 'frost') && !mon.dead) mon.afflict('slow', 1.6, 0.7);
            skillOnHit(this, p, mon);
            this.audio.hit();
            P.fury = Math.min(100, P.fury + Math.round(3 * (mods.furyGain || 1)));
            if (!p.pierce) {
              this.killProjectile(p);
              break;
            }
          }
        }
      } else {
        let struck = false;
        if (Math.hypot(P.pos.x - m.position.x, P.pos.z - m.position.z) < 0.55 + p.r && Math.abs(m.position.y - (P.pos.y + 1)) < 1.2) {
          if (P.hurt(p.dmg, m.position.x - p.vx * 0.1, m.position.z - p.vz * 0.1, 3)) {
            this.audio.hurt();
            if (p.kind === 'icebreath') P.chill(2.2);
            else if (p.kind === 'iceboulder') P.chill(2.6);
          }
          struck = true;
        }
        if (this.net?.role === 'host') {
          for (const rp of this.remotes.values()) {
            if (!rp.ready || rp.dead) continue;
            if (Math.hypot(rp.x - m.position.x, rp.z - m.position.z) < 0.7 + p.r && Math.abs(m.position.y - (rp.y + 1)) < 1.3) {
              this.net.sendHurt(rp.id, p.dmg, m.position.x, m.position.z, 3);
              struck = true;
            }
          }
        }
        if (struck) this.killProjectile(p);
      }
    }
    this.projectiles = this.projectiles.filter((p) => !p.dead);
  }

  onMonsterKilled(m) {
    this.kills++;
    if (m.type === 'orcscout') {
      if (Math.random() < 0.72) {
        const n = m.def.gold[0] + Math.floor(Math.random() * (m.def.gold[1] - m.def.gold[0] + 1));
        const coins = 1 + Math.floor(Math.random() * 3);
        const each = Math.max(1, Math.ceil(n / coins));
        for (let i = 0; i < coins; i++) this.dropCoin(m.x, m.y + 0.6, m.z, each);
      }
      if (Math.random() < 0.4 && !this.progress.crafted('orcblade')) this.dropBlade(m.x, m.y + 0.8, m.z);
    } else {
      const [a, b] = m.def.gold;
      const n = Math.round(a + Math.random() * (b - a));
      const coins = Math.max(1, Math.min(4, Math.round(n / 2)));
      const each = Math.ceil(n / coins);
      for (let i = 0; i < coins; i++) this.dropCoin(m.x, m.y + 0.6, m.z, each);
    }
    if (Math.random() < 0.18) this.dropCoin(m.x, m.y + 0.6, m.z, 0, 'heart');
    const hadPoints = this.progress.classId ? this.progress.skillPoints().earned : 0;
    const fresh = !this.progress.seen(m.type);
    const parts = this.progress.harvest(m.type);
    if (this.progress.classId && this.progress.skillPoints().earned > hadPoints) {
      this.hud.toast('Skill point earned. Press K.', 2200);
    }
    if (parts.length) {
      const line = parts.map((d) => `+${d.n} ${MATERIALS[d.id].name}`).join('   ');
      this.hud.toast(line, 2600);
      this.hud.floatText(...this.screenOf(m.x, m.y + 2.2, m.z), parts.map((d) => `+${d.n}`).join(' '), 'gold');
      this.fx.burst(m.x, m.y + 1, m.z, [0x6fd45a, 0xf1e6c6, 0xffd23f], 12, 3.5, 0.1, 0.8);
    }
    if (fresh) this.hud.banner('Catalog updated', m.name, 3000);
    this.quest.n++;
    if (this.quest.n >= this.quest.total) this.completeQuest();
    else this.hud.setQuest(this.quest.text, this.quest.n, this.quest.total);
  }

  completeQuest() {
    const reward = 20 + this.rank * 15;
    this.addGold(reward);
    this.rank = Math.min(RANKS.length - 1, this.rank + 1);
    this.applyGear();
    const p = this.player;
    p.hp = p.maxHp;
    p.mana = p.maxMana;
    this.quest = { text: `Slay ${5 + this.rank * 3} Gate monsters`, n: 0, total: 5 + this.rank * 3 };
    this.hud.setQuest(this.quest.text, 0, this.quest.total);
    this.hud.setRank(RANKS[this.rank]);
    this.hud.banner('Hunt complete', `Rank ${RANKS[this.rank]}  +${reward}g`, 3800);
    this.audio.quest();
    this.captureHunter();
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

  dropBlade(x, y, z) {
    const model = buildHeld('orcblade');
    model.scale.setScalar(0.85);
    const holder = new THREE.Group();
    holder.add(model);
    holder.position.set(x, y, z);
    this.scene.add(holder);
    const a = Math.random() * Math.PI * 2;
    const s = 1.2 + Math.random();
    this.pickups.push({ holder, mesh: model, kind: 'orcblade', value: 0, vx: Math.cos(a) * s, vz: Math.sin(a) * s, vy: 4.2, age: 0, grounded: false });
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
        } else if (k.kind === 'orcblade') {
          const got = this.progress.grantFound('orcblade');
          this.audio.quest();
          this.hud.toast(got ? 'Orc Scout Blade' : 'You already carry that blade', 1800);
          this.hud.floatText(...this.screenOf(P.x, P.y + 2, P.z), 'Orc Blade', 'gold');
          if (got && this.progress.data.weapon === 'orcblade') {
            this.applyGear();
            this.selectSlot(0, true);
          }
        } else {
          this.addGold(k.value);
          this.audio.coin();
        }
        this.fx.burst(h.x, h.y, h.z, k.kind === 'heart' ? [0xff4a5c, 0xffffff] : k.kind === 'orcblade' ? [0xb0b4bc, 0xe6dcc4, 0xffffff] : [0xffd23f, 0xffffff], 5, 2, 0.07, 0.3);
      } else if (k.age > 40) k.done = true;
      if (k.done) {
        this.scene.remove(k.holder);
        if (k.kind === 'orcblade') k.holder.traverse((o) => { if (o.isMesh && o.geometry) o.geometry.dispose(); });
        else {
          k.mesh.geometry.dispose();
          k.mesh.material.dispose();
        }
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
    if (this.world.realm === 'cave') restoreOverworld(this);
    this.player.respawn(72, 73);
    this.zone = this.world.zoneAt(72, 73);
    this.hud.setArea('Oakhollow');
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
    let it = this.carried(this.items[this.sel]);
    if (it !== this.items[this.sel]) {
      this.items[this.sel] = it;
      this.player.setHeld(it.held || null);
      this.hud.buildHotbar(this.items, (n) => this.onHotbar(n));
      this.itemsChanged();
    }
    if (it.kind === 'light' || it.kind === 'none') {
      this.hud.toast(it.kind === 'light' ? 'Torch lit - hold it up in the dark' : 'Nothing equipped', 900);
      return;
    }
    if (it.kind !== 'use') {
      this.faceForAction();
      P.drawWeapon();
    }
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

  strikeMonster(m, dmg, dx, dz, knock, crit = false) {
    if (!m || m.dead) return;
    if (this.net?.role === 'guest') this.net.relayHit(m, dmg, dx, dz, knock, crit);
    else m.takeHit(dmg, dx, dz, knock, crit);
  }

  ensureRemote(id, name) {
    let r = this.remotes.get(id);
    if (!r) {
      r = new RemoteHunter(this, id, name);
      this.remotes.set(id, r);
    } else if (name) r.name = name;
    return r;
  }

  removeRemote(id) {
    const r = this.remotes.get(id);
    if (!r) return;
    r.dispose();
    this.remotes.delete(id);
  }

  clearRemotes() {
    for (const r of this.remotes.values()) r.dispose();
    this.remotes.clear();
  }

  suspendLocalHunt() {
    this.guestBound = false;
    for (const m of this.monsters) m.dispose();
    this.monsters = [];
  }

  onSessionEnd(wasGuest) {
    this.clearRemotes();
    this.guestBound = false;
    if (!wasGuest) return;
    for (const m of this.monsters) m.dispose();
    this.monsters = [];
    this.spawner?.populate();
  }

  applyWorld(data) {
    if (!data?.m || this.net.role !== 'guest') return;
    if (!this.guestBound) {
      this.guestBound = true;
      for (const m of this.monsters) m.dispose();
      this.monsters = [];
    }
    const seen = new Set();
    for (const row of data.m) {
      const [id, type, x, y, z, yaw, hp, state] = row;
      seen.add(id);
      let mon = this.monsters.find((m) => m.id === id);
      if (!mon) {
        mon = this.spawner.spawn(type, x, z, false);
        mon.id = id;
        mon.puppet = true;
      }
      if (!mon.dead) mon.snap({ x, y, z, yaw, hp, state });
    }
    for (const mon of this.monsters) {
      if (mon.puppet && !mon.dead && !seen.has(mon.id)) {
        mon.hp = 0;
        mon.die();
      }
    }
  }

  refreshWaygate() {
    const status = document.getElementById('wg-status');
    if (!status || this.hud.panelId !== 'waygate') return;
    const net = this.net;
    const lobby = document.getElementById('wg-lobby');
    const session = document.getElementById('wg-session');
    status.textContent = net.status;
    if (!net.role) {
      lobby?.classList.remove('hidden');
      session?.classList.add('hidden');
      return;
    }
    lobby?.classList.add('hidden');
    session?.classList.remove('hidden');
    const code = document.getElementById('wg-code');
    if (code) code.textContent = net.code;
    const count = document.getElementById('wg-count');
    if (count) count.textContent = `${net.count} / 6 hunters`;
    const list = document.getElementById('wg-players');
    if (list) {
      list.innerHTML = '';
      const add = (label) => {
        const li = document.createElement('li');
        li.textContent = label;
        list.appendChild(li);
      };
      add(net.name + ' (you)');
      for (const peer of net.peers.values()) add(peer.name);
    }
  }

  tryTalk() {
    const w = this.world.waygate;
    const p = this.player.pos;
    const wd = w ? Math.hypot(p.x - w.x, p.z - w.z) : 99;
    const npcNear = this.ambient.npcs.find((n) => n.near);
    const nd = npcNear ? Math.hypot(p.x - npcNear.x, p.z - npcNear.z) : 99;
    if (!this.talkNpc && this.gather.interact()) return;
    if (!this.talkNpc && this.marketNear && !npcNear) {
      this.openMarket();
      return;
    }
    if (!this.talkNpc && this.alchemyNear && !npcNear) {
      this.openAlchemy();
      return;
    }
    if (!this.talkNpc && this.forgeNear && !npcNear) {
      this.openForge();
      return;
    }
    if (!this.talkNpc && w && wd < 3.6 && wd <= nd) {
      this.hud.openPanel('waygate', this);
      this.hud.panelId = 'waygate';
      this.audio.portal();
      return;
    }
    if (this.talkNpc) {
      const npc = this.talkNpc;
      if (npc.dialogLeft > 0) {
        npc.dialogLeft--;
        this.hud.showDialog(npc.name, npc.nextLine());
      } else {
        this.hud.hideDialog();
        this.talkNpc = null;
        if (npc.def.service === 'forge') this.openForge();
      }
      this.audio.select();
      return;
    }
    const near = this.ambient.npcs.find((n) => n.near);
    if (!near) return;
    if (near.def.service === 'alchemy') {
      this.openAlchemy();
      return;
    }
    this.talkNpc = near;
    near.dialogLeft = near.def.lines.length - 1;
    this.hud.showDialog(near.name, near.nextLine());
    this.audio.select();
  }

  addGold(n) {
    this.gold = Math.max(0, this.gold + n);
    this.hud.setGold(this.gold);
    this.progress.setGold(this.gold);
  }

  buyPotion(id) {
    const offer = POTION_SHOP[id];
    const it = this.items.find((i) => i.id === id);
    if (!offer || !it) return false;
    if (it.count >= offer.max) {
      this.hud.toast('Your belt is full of those', 1400);
      return false;
    }
    if (this.gold < offer.price) {
      this.hud.toast('Not enough gold', 1400);
      return false;
    }
    this.addGold(-offer.price);
    it.count++;
    this.progress.setStock(id, it.count);
    this.itemsChanged();
    this.audio.coin();
    this.hud.toast(`Bought ${it.name}`, 1200);
    const a = this.world.alchemy;
    if (a) this.fx.burst(a.x, a.y + 0.7, a.z, id === 'manapotion' ? [0x4ec8ff, 0xffffff] : [0xff6a8a, 0xffffff], 10, 2, 0.07, 0.6, -1, 1);
    return true;
  }

  openAlchemy() {
    this.hud.openPanel('alchemy', this);
    this.hud.panelId = 'alchemy';
    this.audio.select();
    const a = this.world.alchemy;
    if (a) this.fx.burst(a.x, a.y + 0.8, a.z, [0x5dffb0, 0xb8ffe0, 0xffffff], 12, 1.6, 0.07, 0.8, -1.2, 1.4);
  }

  updateAlchemy(dt) {
    const a = this.world.alchemy;
    if (!a) return;
    const P = this.player.pos;
    const d = Math.hypot(P.x - a.x, P.z - a.z);
    this.alchemyNear = d < 3.4 && this.started;
    if (d < 20 && Math.random() < dt * 8) {
      this.fx.burst(a.x + (Math.random() - 0.5) * 0.3, a.y + 0.55, a.z + (Math.random() - 0.5) * 0.3, [0x5dffb0, 0xc8ffe4, 0x4ec8ff], 1, 0.35, 0.07, 1.1, -1.6, 1.3);
    }
    if (this.alchemyNear && !this.alchemyHinted) {
      this.alchemyHinted = true;
      this.hud.toast("Lira's Alchemy - press F to buy potions", 2600);
    }
    if (this.alchemyNear) {
      const [sx, sy, vis] = this.screenOf(a.x, a.y + 1.5, a.z, true);
      this.hud.plate('alchemy', "Lira's Alchemy<small>F · buy potions</small>");
      this.hud.placePlate('alchemy', sx, sy, vis);
    } else this.hud.removePlate('alchemy');
  }

  sellGood(id, n = 1) {
    const g = GOODS[id];
    if (!g || !this.progress.takeGood(id, n)) return false;
    this.addGold(g.price * n);
    this.audio.coin();
    const m = this.world.market;
    if (m) this.fx.burst(m.x, m.y + 1.3, m.z, [0xffd23f, 0xfff3a8, 0xffffff], 10, 2, 0.07, 0.6, 3, 2);
    this.hud.toast(`Sold ${n} ${g.name.toLowerCase()} for ${g.price * n}g`, 1400);
    return true;
  }

  sellAllGoods() {
    let gold = 0;
    for (const g of Object.values(GOODS)) {
      const n = this.progress.good(g.id);
      if (n > 0 && this.progress.takeGood(g.id, n)) gold += n * g.price;
    }
    if (!gold) return false;
    this.addGold(gold);
    this.audio.coin();
    this.hud.toast(`Sold your goods for ${gold}g`, 1800);
    return true;
  }

  lightLog(id) {
    return this.gather.light(id);
  }

  eatGood(id) {
    const g = GOODS[id];
    if (!g || !g.heal || this.progress.good(id) < 1) return false;
    if (!this.player.tryEat(g)) return false;
    this.progress.takeGood(id, 1);
    return true;
  }

  openMarket() {
    this.hud.openPanel('market', this);
    this.hud.panelId = 'market';
    this.audio.select();
  }

  updateMarket() {
    const m = this.world.market;
    if (!m) return;
    const P = this.player.pos;
    const d = Math.hypot(P.x - m.x, P.z - m.z);
    this.marketNear = d < 3.2 && this.started;
    if (this.marketNear && !this.marketHinted) {
      this.marketHinted = true;
      this.hud.toast("Dalla's Market - press F to sell ore and fish", 2600);
    }
    if (this.marketNear) {
      const [sx, sy, vis] = this.screenOf(m.x, m.y + 2.4, m.z, true);
      this.hud.plate('market', "Dalla's Market<small>F · sell ore &amp; fish</small>");
      this.hud.placePlate('market', sx, sy, vis);
    } else this.hud.removePlate('market');
  }

  openForge() {
    this.hud.openPanel('forge', this);
    this.hud.panelId = 'forge';
    this.audio.select();
    const f = this.world.forge;
    if (f) this.fx.burst(f.x + 0.4, f.y + 1.3, f.z, [0xff8a1e, 0xffd27a, 0xffffff], 10, 2.2, 0.08, 0.7, -1, 1.2);
  }

  updateForge(dt) {
    const f = this.world.forge;
    if (!f) return;
    const P = this.player.pos;
    const d = Math.hypot(P.x - f.x, P.z - f.z);
    this.forgeNear = d < 3.6 && this.started;
    if (d < 22 && Math.random() < dt * 9) {
      this.fx.burst(f.x + 0.5, f.y + 0.7, f.z + (Math.random() - 0.5) * 0.4, [0xff8a1e, 0xffd27a, 0xff5a1a], 1, 0.6, 0.06, 1.1, -1.4, 1.6);
    }
    if (d < 22 && Math.random() < dt * 3) {
      this.fx.burst(f.x, f.y + 2.5, f.z, [0x6a6a70, 0x8a8a90], 1, 0.35, 0.16, 1.6, -0.5, 0.8);
    }
    if (this.forgeNear && !this.forgeHinted) {
      this.forgeHinted = true;
      this.hud.toast('The Forge - press F to forge weapons and armor', 2600);
    }
    if (this.forgeNear) {
      const [sx, sy, vis] = this.screenOf(f.x, f.y + 2.9, f.z, true);
      this.hud.plate('forge', 'The Forge<small>F · forge gear</small>');
      this.hud.placePlate('forge', sx, sy, vis);
    } else this.hud.removePlate('forge');
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
    if (inp.take('bolt') && !blocked) this.castSlot(0);
    if (inp.take('skill') && !blocked) this.castSlot(1);
    if (inp.take('fury') && !blocked) this.castSlot(2);
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
    if (this.charSelect?.active) {
      this.charSelect.update(dt, this.time);
      return;
    }
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
    if (this.world.realm === 'cave' && cy < 8.2) cy = 8.2;
    this.camera.position.set(cx, cy, cz);

    if (this.punchAmt > 0.002) {
      const pl = this.punchAmt / Math.max(4, dist);
      this.camera.position.x += (c.look.x - cx) * pl;
      this.camera.position.y += (c.look.y - cy) * pl;
      this.camera.position.z += (c.look.z - cz) * pl;
      this.punchAmt *= Math.max(0, 1 - dt * 12);
    }

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
    if (this.charSelect?.active) {
      hideUniforms.uPlayerScreen.value.set(-9999, -9999);
      hideUniforms.uPlayerDepth.value = 0;
      return;
    }
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
    if (this.world.realm === 'cave') {
      if (this.zone !== 'cave') {
        this.zone = 'cave';
        this.hud.setArea('Darksycle Den');
      }
      this.forestAmt += (0 - this.forestAmt) * Math.min(1, dt * 1.5);
      this.chill += (0 - this.chill) * Math.min(1, dt * 2);
      return;
    }
    const land = this.world.landAt(P.x, P.z);
    if (land?.banner) {
      if (this.zone !== land.banner[1]) {
        const first = this.zone === -1;
        this.zone = land.banner[1];
        this.hud.setArea(land.banner[1]);
        if (!first && this.started) this.hud.banner(land.banner[0], land.banner[1], 2600);
      }
      const shade = land.shade || 0;
      this.forestAmt += (shade - this.forestAmt) * Math.min(1, dt * 1.5);
      const goal = land.chillAt ? land.chillAt(Math.floor(P.x) - land.x0, Math.floor(P.z) - land.z0) : 0;
      this.chill += (goal - this.chill) * Math.min(1, dt * 1.2);
      return;
    }
    this.chill += (0 - this.chill) * Math.min(1, dt * 1.2);
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
    if (this.walletBusy) {
      this.last = now;
      return;
    }
    const raw = now - this.last;
    this.last = now;
    if (!(raw >= 0) || raw > 250) return;
    this.adaptResolution(raw);
    let dt = Math.min(raw / 1000, 0.05);
    if (this.hitstopT > 0) {
      this.hitstopT -= dt;
      dt *= 0.08;
    } else if (this.slowT > 0) {
      this.slowT -= dt;
      dt *= this.slowK + (1 - this.slowK) * Math.max(0, 1 - this.slowT / 0.25) * (this.slowT < 0.25 ? 1 : 0);
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
    updateCaveTravel(this, dt);
    tendCaveDragon(this, dt);
    if (this.player) updateSkillWorld(this, dt);
    this.net.update(dt);
    for (const r of this.remotes.values()) r.update(dt);
    for (const m of this.monsters) m.update(dt);
    if (this.started) this.checkDiscoveries(dt);
    if (this.monsters.some((m) => m.remove)) {
      for (const m of this.monsters) if (m.remove) m.dispose();
      this.monsters = this.monsters.filter((m) => !m.remove);
    }
    if (this.started) this.spawner.update(dt);
    if (this.started && this.wallet) {
      this.saveAcc += dt;
      if (this.saveAcc > 5) {
        this.saveAcc = 0;
        this.captureHunter();
      }
    }
    for (const n of this.ambient.npcs) n.update(dt, t);
    for (const f of this.ambient.fowl) f.update(dt, t);
    for (const b of this.ambient.butterflies) b.update(dt);
    this.updateProjectiles(dt);
    this.updatePickups(dt);

    this.positionCamera(rawDt);
    this.updateHideUniforms();
    this.updateZone(dt);

    const P = this.player;
    this.sky.chill = this.chill;
    this.sky.update(dt, t, this.camera.position.clone().lerp(this.cam.look, 0.5), this.camera);
    this.snowfall.update(dt, t, this.camera.position, this.world.realm === 'cave' ? 0 : this.chill);
    const camp = this.charSelect?.active ? this.charSelect.stage : null;
    const lights = camp ? camp.lightSpots : this.world.realm === 'cave' ? this.world.cave.lights : this.world.lightSpots;
    if (camp) this.sky.assignTorchLights(lights, camp.origin.x, camp.origin.z);
    else this.sky.assignTorchLights(lights, P.pos.x, P.pos.z);
    const night = this.sky.night;
    const scale = this.pxScale * 0.03;
    this.fx.update(dt, t, P.pos, scale, night, this.forestAmt);
    this.vfx.update(dt, this.camera);
    this.world.haloMat.uniforms.uScale.value = scale;
    this.world.haloMat.uniforms.uNight.value = night;
    this.world.update(dt, t);

    this.hud.setClock(this.sky.hour);
    this.refreshHud();
    const wgate = this.world.waygate;
    this.waygateNear = !!(wgate && Math.hypot(P.pos.x - wgate.x, P.pos.z - wgate.z) < 3.6);
    if (this.waygateNear && !this.waygateHinted && this.started) {
      this.waygateHinted = true;
      this.hud.toast('Waygate — press F to host or join', 2400);
    }
    if (this.waygateNear && wgate) {
      const [sx, sy, vis] = this.screenOf(wgate.x, wgate.y + 3.5, wgate.z, true);
      const label = this.net.role ? `Waygate<small>${this.net.code} · ${this.net.count}/6</small>` : 'Waygate<small>F · host or join</small>';
      this.hud.plate('waygate', label);
      this.hud.placePlate('waygate', sx, sy, vis);
    } else this.hud.removePlate('waygate');
    this.updateForge(dt);
    this.updateAlchemy(dt);
    this.updateMarket();
    updateGatherSites(this.world, dt, t, this);
    this.gather.update(dt);
    const near = this.ambient.npcs.some((n) => n.near) || this.waygateNear || this.forgeNear || this.alchemyNear || this.marketNear || !!this.gather.near || this.gather.active;
    this.hud.setTalkVisible(near && this.input.touch);
    this.hud.drawMinimap(this.world, P.pos.x, P.pos.z, this.cam.yaw, this.monsters.filter((m) => !m.dead), this.ambient.npcs, t, this.remotes.values());
  }
}

const game = new Game();
window.__game = game;
game.load().catch((e) => {
  console.error(e);
  document.getElementById('load-text').textContent = 'Failed to load: ' + e.message;
});

export { lerp, GUILD };
