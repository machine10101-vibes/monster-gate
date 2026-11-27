Warning: truncated output (original token count: 44622)
Total output lines: 4762

import '@fontsource/press-start-2p/400.css';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/600.css';
import './style.css';
import './ui/theme.css';
import './ui/skin.css';
import * as THREE from 'three';
import { World } from './world/world.js';
import { Sky } from './world/sky.js';
import { Snowfall } from './world/snowfall.js';
import { Ashfall } from './world/ashfall.js';
import { FX } from './engine/fx.js';
import { QUALITIES, QUALITY_CHOICE_KEY, chooseBootQuality, qualityById, readSavedQuality } from './engine/quality.js';
import { VFX } from './engine/vfx.js';
import { Audio8 } from './engine/audio.js';
import { Input } from './engine/input.js';
import { hideRadiusPx, hideUniforms } from './engine/materials.js';
import { Player } from './entities/player.js';
import { buildHeld } from './entities/humanoid.js';
import { Spawner } from './entities/monsters.js';
import { RemoteHunter } from './entities/remote.js';
import { Session } from './net/session.js';
import { acquireAutoAttackTarget, attachDebug, grantDebugTankLoot, parseCloudShadowFlag, parseMapLabelsFlag, parsePhotoFlag, setDebugAutoAttack, tickDebugAutoAttack, tickDebugTank } from './debug/flags.js';
import { DEBUG_LOOT_ID, isUnsellableGood, markDebugGranted } from './debug/transient.js';
import { oasisAreaName } from './world/desert.js';
import { attachSocial } from './social/index.js';
import { createAmbient } from './entities/ambient.js';
import { HUD, ITEMS, POTION_SHOP } from './ui/hud.js';
import {
  consumeWorldAuth,
  consumeWorldJoin,
  disposeMmoClient,
  dropOnlineWithoutSession,
  enterOnlineWorld,
  fetchWorldHealth,
  hasWorldSessionToken,
  healthzUrl,
  hrefWithSearch,
  isWorldOnline,
  lastWorldMode,
  leaveOnlineWorld,
  markWorldJoin,
  offlineSearch,
  onlineSearch,
  paintWorldModePill,
  paintWorldPicker,
  rememberWorldMode,
  remountMmoClient,
  shouldDropOnlineWithoutSession,
  shouldForceWorldPick,
  shouldFreshMmoClient,
  shouldMountOnline,
  signedInWorldContinue,
  worldJoinContinue,
  worldPickerState,
  worldServerConfigured,
  worldWsUrl,
} from './net/worldPlay.js';
import { BUILD_ID } from './ui/buildId.js';
import { mountLoading } from './ui/boot.js';
import {
  armContextLost,
  defaultGlProbe,
  isWebGLFailure,
  probeWebGL,
  shouldForceNoGL,
  showGlFailIfNeeded,
  showGlFailPanel,
} from './ui/glFail.js';
import { applyWeaponCursor } from './ui/weaponCursor.js';
import { Progress } from './systems/progress.js';
import { BAG_TOSS_SIT, tossFrom } from './systems/bagDrop.js';
import { Journal } from './systems/journal.js';
import { Bounties } from './systems/bounties.js';
import { Roster, lookOptions } from './systems/roster.js';
import { CharacterSelect } from './ui/charselect.js';
import { CLASSES, SKILLS, attrDef, weaponDef } from './data/skills.js';
import { buildProjectileMesh, endProjectile, initProjectile, tickProjectile } from './systems/skillfx.js';
import { castSkill, clearSkillWorld, noteProjectileEnd, scaleDmg, skillMods, skillOnHit, updateSkillWorld } from './systems/skillcast.js';
import { Catalog } from './ui/catalog.js';
import { Gathering } from './systems/gather.js';
import { GOODS } from './data/gathering.js';
import { updateGatherSites } from './world/gatherSite.js';
import { MONSTERS, MATERIALS, GEAR_DROPS, gearById, gearSalePrice } from './data/catalog.js';
import { ZONE, GATE, GUILD, MINE } from './world/terrain.js';
import { updateCaveTravel, tendCaveDragon, restoreOverworld, enterCave } from './world/cave.js';
import { updateRift, enterRift, lootRiftChest, leaveRift, tryEnterRift, riftReady, syncRiftFollow } from './world/rift.js';
import {
  accountAddress,
  checkDevice,
  clearAccount,
  consumeTakenNotice,
  createAccount,
  legacyUserId,
  markTakenNotice,
  readAccount,
  SESSION_TAKEN,
  signInAccount,
} from './wallet/account.js';
import { adminHref, isAdminAccount } from './admin/gate.js';
import { clearSession, inKleverHandoff, isMobile, launchKleverApp, markPrompt, promptIsCooling, shortAddress, showWalletHelp } from './wallet/klever.js';
import { completeKleverHandoff, loginWithKlever, pollKleverHandoff, startKleverHandoff } from './wallet/link.js';
import { UNLINKED_CODE, UNLINKED_HINT } from '../supabase/functions/_shared/linkAuth.js';
import { installMockWallet } from './wallet/mock.js';
import { clearCloudToken, flushCloud, schedulePush, syncHunt } from './wallet/cloud.js';
import { clamp, lerp } from './engine/voxel.js';
import { exitGameFullscreen, isFullscreen, isIOS, isLandscape as landscapeNow, isTablet, requestGameFullscreen } from './engine/immersive.js';
import { clearRotationRecovery, consumeRotationRecovery, isRotationRecoveryPending, rememberRotationRecovery, screenOrientation } from './engine/rotationRecovery.js';
import { openLegacyBridge, runLegacySaveBridge } from './systems/savebridge.js';
import { INVENTORY_FULL } from './systems/stacks.js';
import { ensureMembership } from './wallet/membership.js';

const CLOUD_AUTOSAVE_MS = 30000;
const DEVICE_CHECK_MS = 4000;
const sendingToLedger = typeof location !== 'undefined' && isAdminAccount(readAccount());
if (sendingToLedger) location.replace(adminHref());
let rotationReload = false;
try {
  rotationReload = !sendingToLedger && typeof window !== 'undefined'
    && isRotationRecoveryPending(
      globalThis.localStorage,
      screenOrientation(window.innerWidth, window.innerHeight),
    );
} catch { /* unavailable storage means show the normal launch splash */ }
const loadingScreen = !sendingToLedger && typeof document !== 'undefined'
  ? mountLoading(document, { skip: rotationReload })
  : null;
/** Paint the WebGL fallback before Game/save-bridge so a hung hop cannot hide it. */
const glDeadAtBoot = !sendingToLedger && typeof document !== 'undefined' && showGlFailIfNeeded({
  probe: defaultGlProbe,
  onSuccess: resumeAfterGlFail,
});

/** Set while a boot is in progress. A reload that finds it still set is the iPad crash-restart. */
const BOOT_KEY = 'mg-boot-v2';
function bootWasKilled() {
  try {
    return sessionStorage.getItem(BOOT_KEY) === '1';
  } catch {
    return false;
  }
}

function markBoot() {
  try {
    sessionStorage.setItem(BOOT_KEY, '1');
  } catch {
    /* private mode */
  }
}

function clearBoot() {
  try {
    sessionStorage.removeItem(BOOT_KEY);
  } catch {
    /* private mode */
  }
}

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

function isDesktopGraphics() {
  try {
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches
      && !window.matchMedia('(pointer: coarse)').matches;
  } catch {
    return true;
  }
}

function graphicsSize() {
  try {
    return {
      screenW: window.screen?.width || 0,
      screenH: window.screen?.height || 0,
      innerW: window.innerWidth || 1,
      innerH: window.innerHeight || 1,
    };
  } catch {
    return {};
  }
}

class Game {
  constructor() {
    this.canvas = document.getElementById('game');
    const killed = bootWasKilled();
    markBoot();
    // Use the same preset before character selection and throughout gameplay.
    // A failed WebGL boot retains the one-launch recovery budget.
    this.safeBoot = isIOS() || isTablet() || !isDesktopGraphics() || killed;
    const savedQuality = readSavedQuality(typeof localStorage !== 'undefined' ? localStorage : null);
    const bootQuality = chooseBootQuality({
      saved: savedQuality,
      safeBoot: this.safeBoot,
      killed,
      size: graphicsSize(),
    });
    this.heavyBoot = bootQuality.light;
    this.lightBoot = bootQuality.light;
    this.quality = bootQuality.quality;
    this.bootFrames = 0;
    this.hud = new HUD();
    this.audio = new Audio8();
    this.input = new Input(this.canvas);
    this.input.canTabCamera = () => this.started && !this.uiBlocking && !this.hud?.panelOpen;
    this.hud.layoutHud();
    const buildEl = document.getElementById('build-id');
    if (buildEl) buildEl.textContent = BUILD_ID;
    this.syncPublishedBuild();
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
    this.baseItems = ITEMS.map((i) => ({ ...i }));
    this.items = this.baseItems.slice();
    this.progress = new Progress();
    // Mirror what this hunter uses, sells or drops onto World 1, so the Exchange never sells what is gone.
    this.progress.onSpend = (kind, id, n) => {
      if (!this.marketApplying) this.mmo?.reportSpend?.(kind, id, n);
    };
    this.journal = new Journal(this.progress);
    this.bounties = new Bounties(this.progress);
    this.journalT = 0;
    this.talkScript = null;
    this.talkQuest = false;
    this.gold = this.progress.gold;
    for (const it of this.items) if (it.kind === 'use' && this.progress.hasStock(it.id)) it.count = this.progress.stock(it.id);
    this.catalog = new Catalog(this);
    this.discoverT = 0;
    this.sel = 0;
    this.started = false;
    this.photoMode = false;
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
    this.portalNear = false;
    this.portalHinted = false;
    this.guestBound = false;
    this.parkedHunt = null;
    this.wallet = null;
    this.roster = null;
    this.character = null;
    this.walletBusy = false;
    this.walletNote = '';
    this.cloudState = 'off';
    this.cloudSyncing = false;
    this.cloudConflict = false;
    this.cloudGate = null;
    this.autosaveTimer = 0;
    this.deviceTimer = 0;
    this.autosaveMs = CLOUD_AUTOSAVE_MS;
    this.cloudFailAt = 0;
    this.cloudSavedAt = 0;
    this.cloudReachable = false;
    this.staffRole = '';
    this.saveAcc = 0;
    this.accountWatch = false;
    this.cam = { yaw: Math.PI * 0.08, targetYaw: Math.PI * 0.08, pitch: 0.92, dist: 20, targetDist: 20, pos: new THREE.Vector3(), look: new THREE.Vector3() };
    this.uiBlocking = false;

    if (!this.initRenderer()) {
      this.glFailed = true;
      return;
    }
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.3, 240);
    this.tmpV = new THREE.Vector3();
    this.ray = new THREE.Raycaster();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.bindImmersive();
    this.charSelect = new CharacterSelect(this);
  }

  initRenderer() {
    // iPad Safari and Brave reload the tab when the framebuffer peaks at the end of loading.
    // No multisample buffer, and no preserved backbuffer, on that browser.
    const scratch = typeof document !== 'undefined' ? document.createElement('canvas') : this.canvas;
    const probe = probeWebGL(scratch, { force: shouldForceNoGL() });
    if (!probe.ok) {
      showBootGlFail();
      return false;
    }
    try {
      const lite = this.lightBoot;
      const debugShot = typeof location !== 'undefined' && /(?:^|[?&])debug=1(?:&|$)/.test(location.search);
      const r = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: !lite,
        alpha: false,
        powerPreference: lite ? 'default' : 'high-performance',
        preserveDrawingBuffer: debugShot,
      });
      r.outputColorSpace = THREE.SRGBColorSpace;
      r.toneMapping = THREE.AgXToneMapping;
      r.toneMappingExposure = 1.05;
      r.setClearColor(0x0b0d10, 1);
      r.shadowMap.enabled = true;
      r.shadowMap.type = THREE.PCFShadowMap;
      const draw = r.renderBufferDirect.bind(r);
      r.renderBufferDirect = (camera, scene, geometry, material, object, group) => {
        if (!material || typeof material.onBeforeCompile !== 'function') {
          if (!this._loggedMissingMat) {
            this._loggedMissingMat = true;
            console.warn('MG missing material error', object?.type, object?.name || '', object?.parent?.name || '');
          }
          return;
        }
        try {
          return draw(camera, scene, geometry, material, object, group);
        } catch (err) {
          if (!this._loggedMissingMat) {
            this._loggedMissingMat = true;
            console.warn('MG rbd throw error', object?.type, object?.name || '', object?.parent?.name || '', material?.type || '', err?.message || err);
          }
          return;
        }
      };
      this.renderer = r;
      r.debug.checkShaderErrors = true;
      const gl = r.getContext();
      const shaderErrors = [];
      const shaderStatus = [];
      this.shaderErrors = shaderErrors;
      if (typeof window !== 'undefined') {
        window.__mgShaderErrors = shaderErrors;
        window.__mgShaderStatus = shaderStatus;
      }
      try {
        if (gl && typeof gl.compileShader === 'function') {
          const compile = gl.compileShader.bind(gl);
          gl.compileShader = (shader) => {
            compile(shader);
            const ok = !!gl.getShaderParameter(shader, gl.COMPILE_STATUS);
            shaderStatus.push({ kind: 'compile', ok });
            if (!ok) shaderErrors.push({ kind: 'compile', log: gl.getShaderInfoLog(shader) });
          };
          const link = gl.linkProgram.bind(gl);
          gl.linkProgram = (program) => {
            link(program);
            const ok = !!gl.getProgramParameter(program, gl.LINK_STATUS);
            shaderStatus.push({ kind: 'link', ok });
            if (!ok) shaderErrors.push({ kind: 'link', log: gl.getProgramInfoLog(program) });
          };
        }
      } catch { /* some GL implementations freeze the context methods */ }
      r.debug.onShaderError = (ctx, program, vs, fs) => {
        shaderErrors.push({
          kind: 'three',
          vsOk: ctx.getShaderParameter(vs, ctx.COMPILE_STATUS),
          fsOk: ctx.getShaderParameter(fs, ctx.COMPILE_STATUS),
          linked: ctx.getProgramParameter(program, ctx.LINK_STATUS),
          vs: ctx.getShaderInfoLog(vs),
          fs: ctx.getShaderInfoLog(fs),
          prog: ctx.getProgramInfoLog(program),
        });
      };
      this.glWatch = armContextLost(this.canvas, {
        onFail: () => showBootGlFail(),
      });
      return true;
    } catch {
      showBootGlFail();
      return false;
    }
  }

  /** Meshes built with a missing material crash WebGLProgram on onBeforeCompile. */
  hideBrokenMeshes() {
    const fallback = this._missingMat || (this._missingMat = new THREE.MeshBasicMaterial({ visible: false, fog: true }));
    const ok = (m) => !!(m && typeof m.onBeforeCompile === 'function');
    let fixed = 0;
    const visit = (o) => {
      if (o.customDepthMaterial === null) o.customDepthMaterial = undefined;
      if (o.customDistanceMaterial === null) o.customDistanceMaterial = undefined;
      if (!(o.isMesh || o.isInstancedMesh || o.isPoints || o.isLine || o.isSprite)) return;
      const m = o.material;
      if (Array.isArray(m)) {
        for (let i = 0; i < m.length; i++) {
          if (!ok(m[i])) {
            m[i] = fallback;
            fixed++;
            o.visible = false;
          }
        }
      } else if (!ok(m)) {
        o.material = fallback;
        o.visible = false;
        fixed++;
        console.warn('MG missing material error', o.type, o.name || '', o.parent?.name || '');
      }
    };
    this.scene?.traverse(visit);
    this.world?.group?.traverse(visit);
    this.world?.cave?.group?.traverse(visit);
    this.world?.rift?.group?.traverse(visit);
    this.world?.colosseum?.group?.traverse(visit);
    for (const row of this.world?.parked || []) row.obj?.traverse?.(visit);
    if (fixed) console.warn('MG missing material error fixed', fixed);
    return fixed;
  }

  /** Say what broke, once, on the loading screen or the character camp. */
  reportFault(err) {
    const message = (err && err.message) || String(err || 'The game hit an error.');
    if (this.faultText === message) return;
    this.faultText = message;
    console.error(err);
    const loading = document.getElementById('loading');
    const text = document.getElementById('load-text');
    if (loading && text && !loading.classList.contains('hidden')) text.textContent = 'Failed to load: ' + message;
    if (this.charSelect?.active) this.charSelect.note(message, true, true);
    else this.hud?.toast?.(message, 6000);
  }

  /** Hide the live world while the character camp is on screen so a phone draws one scene. */
  parkWorld() {
    if (this.campParked || !this.world?.group) return;
    const hide = (obj) => {
      if (!obj) return null;
      const visible = obj.visible;
      obj.visible = false;
      return { obj, visible };
    };
    const hideEach = (list) => (list || []).map((item) => hide(item?.obj)).filter(Boolean);
    const quiet = !!(this.input?.touch || this.quality?.id === 'low');
    const shadows = !!this.renderer?.shadowMap.enabled;
    if (quiet && this.renderer) {
      this.renderer.shadowMap.enabled = false;
      this.renderer.shadowMap.needsUpdate = true;
    }
    this.campParked = {
      quiet,
      shadows,
      singles: [
        hide(this.world.group),
        hide(this.world.cave?.group),
        hide(this.player?.obj),
        hide(this.snowfall?.points),
        hide(this.ashfall?.points),
        hide(this.fx?.motes),
        hide(this.fx?.gateMotes),
      ].filter(Boolean),
      crowds: [
        ...hideEach(this.monsters),
        ...hideEach(this.ambient?.npcs),
        ...hideEach(this.ambient?.fowl),
        ...hideEach(this.ambient?.cows),
        ...hideEach(this.ambient?.butterflies),
      ],
    };
  }

  unparkWorld() {
    const held = this.campParked;
    if (!held) return;
    this.campParked = null;
    for (const row of held.singles) if (row.obj) row.obj.visible = row.visible;
    for (const row of held.crowds) if (row.obj) row.obj.visible = row.visible;
    if (held.quiet && this.renderer) {
      this.renderer.shadowMap.enabled = held.shadows;
      this.renderer.shadowMap.needsUpdate = true;
    }
  }

  async load() {
    const fill = document.getElementById('load-fill');
    const text = document.getElementById('load-text');
    const progress = (p, t) => {
      if (loadingScreen) loadingScreen.setProgress(p, t);
      else {
        if (fill) fill.style.width = Math.round(p * 100) + '%';
        if (text) text.textContent = t;
      }
    };
    // Paint a visible loading state before synchronous world setup begins.
    // Klever's Android WebView can otherwise leave the bar looking idle until
    // the first generation milestone several frames into the build.
    progress(0.06, 'Preparing the world');
    await new Promise((resolve) => requestAnimationFrame(resolve));
    this.world = new World(this.quality);
    await this.world.build(progress);
    this.scene.add(this.world.group);
    if (this.world.cave) this.scene.add(this.world.cave.group);
    if (this.world.rift) this.scene.add(this.world.rift.group);
    if (this.world.colosseum) this.scene.add(this.world.colosseum.group);
    this.sky = new Sky(this.scene, this.quality);
    this.sky.cloudShadowStrong = parseCloudShadowFlag(location.search, this);
    this.snowfall = new Snowfall(this.scene);
    this.ashfall = new Ashfall(this.scene);
    this.chill = 0;
    this.ember = 0;
    this.fx = new FX(this.scene, this.quality);
    this.vfx = new VFX(this);
    this.fx.vfx = this.vfx;
    this.gather = new Gathering(this);
    this.player = new Player(this);
    this.spawner = new Spawner(this);
    if (this.safeBoot) {
      this.syncViewDistance();
      this.world.parkBeyond(this.player.pos.x, this.player.pos.z, Math.min(96, this.viewDistance()));
      this.world.streamRadius = this.viewDistance();
      this.ambient = { npcs: [], fowl: [], cows: [], butterflies: [] };
      this.wakeWorld = true;
    }
    progress(0.95, 'Waking the villagers');
    await new Promise((r) => requestAnimationFrame(r));
    if (!this.safeBoot) {
      this.ambient = createAmbient(this);
      this.spawner.populate();
    }

    this.applyGear(true);
    this.restoreItemHotbar();
    this.hud.buildHotbar(this.items, (i) => this.onHotbar(i), (i) => this.hud.openPanel('bag', this, { assignSlot: i }));
    this.selectInitialHotbarSlot();
    this.refreshHud(true);
    this.syncViewDistance();
    const startX = this.player?.pos?.x ?? 72;
    const startZ = this.player?.pos?.z ?? 73;
    this.world.parkBeyond(startX, startZ, this.viewDistance());
    this.world.streamRadius = this.viewDistance();

    this.snapCamera();
    this.hud.drawMinimap(this.world, this.player.pos.x, this.player.pos.z, this.player.yaw, [], [], 0);
    this.bindUI();
    progress(0.98, 'Ready');
    // Every fresh page boot returns to the login gate. Do not silently restore
    // a saved email session here: that skips the required login step and can
    // drop returning players straight into the character/world flow.
    clearSession();
    this.refreshWalletUi();
    const taken = consumeTakenNotice();
    if (taken && !this.wallet) {
      const status = document.getElementById('wallet-status');
      if (status) status.textContent = taken;
    }
    this.applyQuality();
    this.hideBrokenMeshes();
    progress(1, 'Ready');

    if (loadingScreen) await loadingScreen.dismiss();
    else document.getElementById('loading')?.classList.add('hidden');

    // Klever can recreate its Android WebView during a physical rotation. Only
    // restore a hunt when Enter World was tapped moments earlier and the
    // orientation actually changed; ordinary launches still stop at login.
    const rotationRecovery = consumeRotationRecovery(
      localStorage,
      screenOrientation(window.innerWidth, window.innerHeight),
    );
    if (rotationRecovery) {
      const account = readAccount();
      if (account) {
        await this.applyWallet(account);
        const selected = this.roster?.get(rotationRecovery.characterId);
        if (selected) this.enterWorld(selected);
      }
    }
    consumeWorldAuth();
    if (shouldForceWorldPick() && !this.started) this.showWorldPicker({ force: true });
    if (this.started) document.getElementById('title')?.classList.add('hidden');
    else if (!this.charSelect.active) document.getElementById('title').classList.remove('hidden');
    this.last = performance.now();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  async start() {
    if (this.started) return;
    if (!this.wallet?.address || this.cloudSyncing || !this.character) return;
    if (this.wallet.kind !== 'guest' && !this.membershipGatePassed) {
      if (this.membershipChecking) return;
      this.membershipChecking = true;
      try {
        const account = readAccount();
        if ((this.wallet?.kind !== 'email' || !account?.userId || this.wallet.userId !== account.userId || !account?.accessToken)) {
          this.openSocialSignIn();
          return;
        }
        const allowed = await ensureMembership(account, this);
        if (!allowed || this.started) return;
        this.membershipGatePassed = true;
      } finally {
        this.membershipChecking = false;
      }
    }
    if (this.wallet.kind === 'guest') this.cloudState = 'off';
    document.body.classList.add('hunting');
    if (this.input.touch && (this.isLandscape() || isTablet())) {
      // Avoid requesting a native orientation lock during the first world entry.
      // Some Android in-app WebViews restart their renderer while changing orientation.
      this.enterImmersive({ gesture: false, lock: false });
    }
    this.started = true;
    if (typeof window !== 'undefined') {
      window.__mgHuntStarted = true;
      if (window.__mgPendingBuild) this.offerBuildReload(window.__mgPendingBuild);
    }
    this.ensureWorldConnection?.();
    // Keep the one-shot splash marker for this tab so auth/session reloads do not replay it.
    if (this.wakeWorld) {
      this.wakeWorld = false;
      this.ambient = createAmbient(this);
      this.spawner.populate(true);
    }
    this.audio.unlock();
    this.cam.targetDist = 18;
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
    this.journal?.rebind();
    this.bounties?.rebind();
    this.gold = this.progress.gold;
    this.baseItems = ITEMS.map((i) => ({ ...i }));
    this.items = this.baseItems.slice();
    for (const it of this.items) if (it.kind === 'use' && this.progress.hasStock(it.id)) it.count = this.progress.stock(it.id);
    this.applyGear(true);
    this.restoreItemHotbar();
    this.hud.buildHotbar(this.items, (i) => this.onHotbar(i), (i) => this.hud.openPanel('bag', this, { assignSlot: i }));
    this.selectInitialHotbarSlot();
    this.refreshHud(true);
  }

  onPushed(result, session = this.wallet) {
    if (!result || (session && this.wallet !== session)) return;
    if (result.taken) {
      this.dropTakenAccount(result.message);
      return;
    }
    if (result.error) {
      this.cloudReachable = false;
      this.noteCloudFailure();
      this.paintCloudStatus();
      return;
    }
    if (result.revision && this.roster) this.roster.revision = result.revision;
    // A confirmed account-save response is stronger evidence than a previous
    // transient sync failure; keep the account-save indicator in sync.
    this.cloudState = 'on';
    this.cloudReachable = true;
    this.cloudSavedAt = Number(result.savedAt) || Date.now();
    if (result.progress && this.roster?.mergeFrom) {
      const outcome = this.roster.mergeFrom(result.progress);
      const activeReplaced = !!(this.character && outcome.replacedIds?.includes(this.character.id));
      if (activeReplaced && this.started) this.adoptActiveHunt();
      else if (this.charSelect?.active) this.charSelect.refresh();
      if (outcome.push && !result.retried && this.wallet && this.cloudState === 'on' && !activeReplaced) {
        const session = this.wallet;
        schedulePush(session, this.roster.data, (next) => this.onPushed({ ...next, retried: true }, session));
        flushCloud();
      }
    }
    this.paintCloudStatus();
  }

  cloudStatusText() {
    if (!this.wallet) return '';
    if (this.wallet.kind === 'guest') return 'Guest hunt. Saved on this device only.';
    if (this.cloudSyncing) return 'Opening the hunt saved to your account…';
    if (this.cloudState === 'on' && this.cloudReachable) return 'Saved to your account';
    return 'Saved on this device — awaiting database sync';
  }

  paintCloudStatus() {
    const el = document.getElementById('cs-save');
    if (el) el.textContent = this.cloudStatusText();
    const row = document.getElementById('set-cloud');
    if (row) row.textContent = this.cloudStatusText();
  }

  /** The guild record has a newer copy of the hunter who is in the world. Use it. */
  adoptActiveHunt() {
    if (!this.character || !this.roster) return;
    const hunt = this.roster.hunt(this.character.id);
    if (!hunt) return;
    this.progress.loadRaw(hunt);
    this.progress.save(false);
    this.rebindFromProgress();
    this.restoreHunter();
    const noun = this.wallet?.kind === 'email' ? 'account' : 'wallet';
    this.hud?.toast(`Loaded the newer hunt saved to this ${noun}.`, 3600);
  }

  noteCloudFailure() {
    if (!this.started) return;
    const now = Date.now();
    if (now - this.cloudFailAt < 60000) return;
    this.cloudFailAt = now;
    const noun = this.wallet?.kind === 'email' ? 'account' : 'wallet';
    this.hud?.toast(`Progress is saved on this device. It could not reach the ${noun} just now.`, 3600);
  }

  bindCloudPush() {
    if (this.wallet?.kind === 'guest') {
      this.progress.onCloud = null;
      this.stopAutosave();
      return;
    }
    this.progress.onCloud = (data) => {
      if (!this.roster || !this.wallet) return;
      const session = this.wallet;
      this.roster.touch(data.savedAt);
      schedulePush(session, this.roster.data, (result) => this.onPushed(result, session));
    };
    this.startAutosave();
  }

  startAutosave() {
    this.stopAutosave();
    this.autosaveTimer = setInterval(() => {
      this.autosaveCloud();
    }, this.autosaveMs);
    this.startDeviceWatch();
  }

  stopAutosave() {
    if (this.autosaveTimer) clearInterval(this.autosaveTimer);
    this.autosaveTimer = 0;
    this.stopDeviceWatch();
  }

  startDeviceWatch() {
    this.stopDeviceWatch();
    if (this.wallet?.kind !== 'email' || !this.wallet.accessToken) return;
    this.deviceTimer = setInterval(() => {
      this.watchDevice();
    }, DEVICE_CHECK_MS);
  }

  stopDeviceWatch() {
    if (this.deviceTimer) clearInterval(this.deviceTimer);
    this.deviceTimer = 0;
  }

  async watchDevice() {
    if (!this.wallet || this.wallet.kind !== 'email' || this.cloudSyncing) return;
    try {
      await checkDevice(this.wallet);
    } catch (err) {
      if (err?.code === 'taken') this.dropTakenAccount(err.message);
    }
  }

  dropTakenAccount(message) {
    if (this.cloudGate) this.cloudGate.open = false;
    this.stopAutosave();
    this.stopDeviceWatch();
    markTakenNotice(message || SESSION_TAKEN);
    clearAccount();
    clearCloudToken();
    location.reload();
  }

  /** Write the roster, hunts included, to the guild record. */
  autosaveCloud() {
    if (!this.wallet || this.wallet.kind === 'guest' || !this.roster) return;
    // Always checkpoint the active hunt locally, even during an outage or conflict.
    if (this.started) this.captureHunter();
    this.roster.save();
    if (this.cloudSyncing || this.cloudConflict) return;
    if (this.cloudState === 'error') {
      this.applyWallet(this.wallet);
      return;
    }
    if (this.cloudState !== 'on') return;
    const session = this.wallet;
    schedulePush(session, this.roster.data, (result) => this.onPushed(result, session));
    flushCloud();
  }

  /** Send the character list to the guild record after it changes. */
  pushRoster() {
    if (!this.roster || !this.wallet) return;
    this.roster.touch(Date.now());
    this.roster.save();
    if (this.wallet.kind === 'guest' || this.cloudState !== 'on' || this.cloudConflict) return;
    schedulePush(this.wallet, this.roster.data, (result) => this.onPushed(result));
  }

  async applyWallet(session) {
    if (isAdminAccount(session)) {
      location.replace(adminHref());
      return;
    }
    if (this.cloudSyncing && this.wallet === session) return;
    if (this.cloudGate) this.cloudGate.open = false;
    const gate = { open: true };
    this.cloudGate = gate;
    this.wallet = session;
    this.cloudConflict = false;
    this.stopAutosave();
    this.progress.onCloud = null;
    this.character = null;
    this.charSelect.close();
    this.roster = new Roster(session.address, session.email || '');
    if (session.kind === 'email' && session.email) {
      const oldId = legacyUserId(session.email);
      const oldOwner = oldId ? accountAddress(oldId) : '';
      if (oldOwner && oldOwner !== session.address) this.roster.absorbOwner(oldOwner);
    }
    this.walletNote = this.roster.chars.length ? 'loaded' : 'new';
    this.cloudSyncing = true;
    this.cloudState = 'off';
    this.refreshWalletUi();
    let result = { state: 'error', replaced: false };
    try {
      for (let attempt = 0; attempt < 2 && gate.open && this.wallet === session; attempt++) {
        try {
          result = await syncHunt(session, this.roster, gate);
          if (result?.state !== 'error') break;
        } catch (err) {
          if (err?.code === 'taken') {
            this.dropTakenAccount(err.message);
            return;
          }
          result = { state: 'error', replaced: false };
        }
        if (attempt === 0 && gate.open && this.wallet === session) {
          await new Promise((r) => setTimeout(r, 700));
        }
      }
    } finally {
      if (this.cloudGate === gate) this.cloudSyncing = false;
    }
    if (this.cloudGate !== gate || this.wallet !== session || !gate.open) return;
    this.cloudState = result?.abandoned ? 'off' : (result?.state || 'error');
    this.staffRole = result?.staff === 'moderator' ? 'moderator' : '';
    if (this.hud && (this.hud.panelId === 'settings' || this.hud.panelId === 'menu')) {
      this.hud.openPanel(this.hud.panelId, this);
    }
    if (result?.replaced) this.walletNote = 'loaded';
    if (this.cloudState === 'on') {
      this.cloudReachable = true;
      this.cloudSavedAt = this.roster?.savedAt || Date.now();
      this.bindCloudPush();
    } else if (this.cloudState === 'error') this.startAutosave();
    this.paintCloudStatus();
    this.refreshWalletUi();
    if (shouldFreshMmoClient({
      search: typeof location !== 'undefined' ? location.search : '',
      signedIn: !!(session && session.kind !== 'guest'),
      authReject: !!this.worldView?.authReject,
      mmo: this.mmo,
    })) {
      await this.remountOnlineClient();
      return;
    }
    if (!this.started) this.continueAfterAccount();
  }

  async remountOnlineClient() {
    const view = this.worldView;
    const search = typeof location !== 'undefined' ? location.search : '';
    if (!view || !isWorldOnline(search)) {
      enterOnlineWorld();
      return null;
    }
    view.clearAuthLatch?.();
    this.hideWorldAuth();
    const { attachMmo } = await import('./net/mmo.js');
    const next = remountMmoClient({ game: this, view, attach: attachMmo, search });
    if (!this.started) this.continueSignedInHunt();
    return next;
  }

  continueAfterAccount() {
    if (this.started) return;
    // Always restore the hunter camp first. Auto-entering a saved character here
    // can close character selection before cloud sync/world startup is ready,
    // leaving Klever's recreated WebView on a blank or inaccessible screen.
    const signed = !!(this.wallet && this.wallet.kind === 'email');
    // Email authentication returns to the hunter camp, unless World 1 was the
    // button that opened sign-in. That choice has to keep ?mmo=1 or the pill
    // stays Offline on a solo hunt.
    if (signed) {
      const join = consumeWorldJoin();
      const search = typeof location !== 'undefined' ? location.search : '';
      if (signedInWorldContinue({
        join,
        search,
        hasToken: hasWorldSessionToken(),
      }) === 'enter-online') {
        enterOnlineWorld();
        return;
      }
      this.openCharacterSelect();
      return;
    }
    if (shouldForceWorldPick()) {
      this.showWorldPicker({ force: true });
      return;
    }
    const join = consumeWorldJoin();
    const next = worldJoinContinue({
      signedIn: false,
      join,
      hasCharacter: !!this.roster?.chars?.length,
    });
    if (next === 'select') {
      this.openCharacterSelect();
      return;
    }
    if (next === 'signin') {
      this.openSocialSignIn();
      return;
    }
    if (this.wallet) this.openCharacterSelect();
  }
  continueSignedInHunt() {
    // Signing in restores the account, not the previous character selection.
    // Always let the hunter choose a character before entering the world.
    this.hideWorldPicker();
    this.hideWorldAuth();
    this.openCharacterSelect();
  }

  showWorldPicker({ force = false } = {}) {
    if (this.started) return;
    this.worldPickOpen = true;
    this.worldJoining = false;
    this.hideWorldAuth();
    this.charSelect?.close?.();
    document.getElementById('title')?.classList.remove('hidden');
    document.getElementById('account-choices')?.classList.add('hidden');
    const root = document.getElementById('world-picker');
    if (root) {
      root.hidden = false;
      root.classList.remove('hidden');
    }
    this.paintWorldPickerUi({ force });
    this.refreshWorldHealth();
  }

  hideWorldPicker() {
    this.worldPickOpen = false;
    this.worldJoining = false;
    const root = document.getElementById('world-picker');
    if (root) {
      root.hidden = true;
      root.classList.add('hidden');
    }
  }

  paintWorldPickerUi({ force = false } = {}) {
    const signed = !!(this.wallet && this.wallet.kind !== 'guest');
    const state = worldPickerState({
      search: typeof location !== 'undefined' ? location.search : '',
      last: lastWorldMode(),
      health: this.worldHealth,
      joining: !!this.worldJoining,
      signedIn: signed,
      force: force || shouldForceWorldPick() || this.worldPickOpen,
    });
    paintWorldPicker(document.getElementById('world-picker'), state);
    return state;
  }

  refreshWorldHealth() {
    const url = healthzUrl(worldWsUrl(typeof location !== 'undefined' ? location.search : ''));
    const gen = (this.worldHealthGen = (this.worldHealthGen || 0) + 1);
    fetchWorldHealth(url).then((health) => {
      if (gen !== this.worldHealthGen) return;
      this.worldHealth = health;
      if (this.worldPickOpen) this.paintWorldPickerUi();
      if (this.charSelect?.worldsOpen) this.charSelect.paintWorldMenu();
    }).catch(() => {
      if (gen !== this.worldHealthGen) return;
      this.worldHealth = { live: false, label: 'Waking…', players: null };
      if (this.worldPickOpen) this.paintWorldPickerUi();
      if (this.charSelect?.worldsOpen) this.charSelect.paintWorldMenu();
    });
  }

  worldOneReady() {
    return worldServerConfigured(typeof location !== 'undefined' ? location.search : '');
  }

  /** Drop a live World 1 socket without reloading, so the camp can start a solo hunt. */
  leaveOnlineInPlace() {
    const search = typeof location !== 'undefined' ? location.search : '';
    if (isWorldOnline(search) && typeof history !== 'undefined' && history.replaceState) {
      try { history.replaceState({}, '', hrefWithSearch(offlineSearch(search), location)); } catch { /* ignore */ }
    }
    // Detach the presentation before closing the socket: an intentional exit
    // must not paint the reconnect/error UI or reopen an auth overlay.
    const client = this.mmo;
    const view = this.worldView;
    if (client) client.view = null;
    if (client) disposeMmoClient(client, this);
    view?.dispose?.();
    this.worldView = null;
    const pill = typeof document !== 'undefined' ? document.getElementById('world-mode-pill') : null;
    if (pill?.dataset) delete pill.dataset.connectionState;
    paintWorldModePill(pill, { search: typeof location !== 'undefined' ? location.search : '' });
  }

  enterSoloHunt(char) {
    if (this.started || !char) return;
    rememberWorldMode('offline');
    this.charSelect?.hideWorldMenu?.();
    this.leaveOnlineInPlace();
    this.enterWorld(char);
  }

  async ensureOnlineClient() {
    const search = typeof location !== 'undefined' ? location.search : '';
    if (!shouldMountOnline({ search })) return null;
    const worldViewMod = await import('./net/worldView.js');
    let view = this.worldView;
    if (!view) view = await worldViewMod.init(this.scene, { game: this, search });
    if (!this.mmo || this.mmo.closed) {
      const { attachMmo } = await import('./net/mmo.js');
      attachMmo(this, view, { search });
    }
    return view;
  }

  async enterWorldOneHunt(char) {
    if (this.started || this.worldJoining || !char) return;
    const search = typeof location !== 'undefined' ? location.search : '';
    if (!worldServerConfigured(search)) {
      this.charSelect?.note?.('World 1 is not open on this build.', true);
      return;
    }
    if (!hasWorldSessionToken()) {
      this.charSelect?.hideWorldMenu?.();
      rememberWorldMode('online');
      markWorldJoin('online');
      this.openSocialSignIn();
      return;
    }
    rememberWorldMode('online');
    // Character Select's World 1 shortcut enters in-place (unlike the title
    // picker, which navigates). Mark the URL first so the MMO client is mounted
    // by both start() and ensureOnlineClient().
    if (!isWorldOnline(search) && typeof history !== 'undefined' && history.replaceState) {
      try { history.replaceState({}, '', hrefWithSearch(onlineSearch(search), location)); } catch { /* ignore */ }
    }
    this.hideWorldPicker();
    this.charSelect?.hideWorldMenu?.();
    await this.enterWorld(char);
    if (!this.started) return;
    await this.ensureOnlineClient();
  }

  async pickWorldOnline() {
    if (this.started || this.worldJoining) return;
    const search = typeof location !== 'undefined' ? location.search : '';
    if (!worldServerConfigured(search)) return;

    // Resolve the signed-in account and Gate Pass before asking for the
    // separate World 1 session token. Otherwise an account with no world
    // token is sent straight back to sign-in and never sees membership.
    const account = readAccount();
    if (this.wallet?.kind !== 'email' || !account?.userId
      || this.wallet.userId !== account.userId || !account?.accessToken) {
      rememberWorldMode('online');
      markWorldJoin('online');
      this.openSocialSignIn();
      return;
    }

    this.worldJoining = true;
    this.paintWorldPickerUi();
    try {
      const allowed = await ensureMembership(account, this);
      if (!allowed) {
        // ensureMembership may ask the player to link a Klever wallet. The
        // world picker hides the character camp, so expose that screen and
        // its existing, unchanged wallet-connect control.
        this.hideWorldPicker();
        if (!this.charSelect?.active) this.charSelect?.open?.();
        return;
      }
      this.membershipGatePassed = true;

      // Membership can now be purchased/verified even when the multiplayer
      // session token needs to be refreshed. Continue the existing sign-in
      // flow only after the Gate Pass UI has had a chance to run.
      if (!hasWorldSessionToken()) {
        rememberWorldMode('online');
        markWorldJoin('online');
        this.openSocialSignIn();
        return;
      }

      rememberWorldMode('online');
      markWorldJoin('online');
      enterOnlineWorld();
    } catch (error) {
      const message = error?.message || 'Could not verify your Gate Pass.';
      this.charSelect?.note?.(message, true, true);
      this.hud?.toast?.(message, 4200);
      this.hideWorldPicker();
      if (!this.charSelect?.active) this.charSelect?.open?.();
    } finally {
      this.worldJoining = false;
      if (!this.started) this.paintWorldPickerUi();
    }
  }

  pickWorldSolo() {
    if (this.started || this.worldJoining) return;
    rememberWorldMode('offline');
    this.hideWorldPicker();
    if (isWorldOnline(typeof location !== 'undefined' ? location.search : '')) {
      leaveOnlineWorld();
      return;
    }
    this.openCharacterSelect();
  }

  showWorldAuth() {
    this.hideWorldPicker();
    const root = document.getElementById('world-auth');
    if (root) {
      root.hidden = false;
      root.classList.remove('hidden');
    }
    this.worldView?.latchAuthReject?.('Sign in to hunt online. Guests stay solo.');
    document.getElementById('title')?.classList.remove('hidden');
  }

  hideWorldAuth() {
    const root = document.getElementById('world-auth');
    if (root) {
      root.hidden = true;
      root.classList.add('hidden');
    }
    if (this.worldView?.authReject) this.worldView.clearAuthLatch();
  }

  onWorldAuthSignIn() {
    this.hideWorldAuth();
    document.getElementById('title')?.classList.remove('hidden');
    this.openAccount('signin');
  }

  onWorldAuthSolo() {
    this.hideWorldAuth();
    this.worldView?.clearAuthLatch?.();
    if (isWorldOnline(typeof location !== 'undefined' ? location.search : '')) leaveOnlineWorld();
    else this.refreshWalletUi();
  }

  openSocialSignIn() {
    document.getElementById('title')?.classList.remove('hidden');
    this.openAccount('signin');
  }

  joinWorld1() {
    const search = typeof location !== 'undefined' ? location.search : '';
    if (!hasWorldSessionToken()) {
      this.openSocialSignIn();
      return;
    }
    if (shouldFreshMmoClient({
      search,
      signedIn: true,
      authReject: !!this.worldView?.authReject,
      mmo: this.mmo,
    })) {
      this.remountOnlineClient();
      return;
    }
    if (!this.started && !isWorldOnline(search)) {
      this.showWorldPicker();
      return;
    }
    enterOnlineWorld();
  }

  openCharacterSelect() {
    if (this.started || !this.wallet?.address || !this.roster || this.cloudSyncing) return;
    this.charSelect.open();
  }

  /** Open the github.io bridge so this device can re-read the old-origin saves. */
  async importOldSaves() {
    const ok = await openLegacyBridge();
    if (!ok) this.hud?.toast('The old-site restore page is not up yet.', 3200);
  }

  /** Local hunt only. No guild record, and the waygate stays closed. */
  playAsGuest() {
    if (this.started || this.walletBusy) return;
    if (this.wallet?.address) return;
    rememberWorldMode('offline');
    if (isWorldOnline(location.search)) {
      leaveOnlineWorld();
      return;
    }
    this.closeAccount();
    this.hideWorldPicker();
    this.hideWorldAuth();
    this.wallet = { kind: 'guest', address: 'guest:local' };
    this.cloudState = 'off';
    this.cloudSyncing = false;
    this.cloudConflict = false;
    this.cloudReachable = false;
    this.staffRole = '';
    this.progress.onCloud = null;
    this.stopAutosave();
    this.roster = new Roster(this.wallet.address, 'Guest');
    this.walletNote = this.roster.chars.length ? 'loaded' : 'new';
    this.refreshWalletUi();
    this.openCharacterSelect();
  }

  leaveCharacterSelect() {
    this.signOut(false);
  }

  /** Save the active hunter and return to camp without signing out. */
  returnToCharacterSelect() {
    if (!this.started || !this.character || !this.wallet?.address || !this.roster) return false;
    this.captureHunter();
    this.progress?.save?.();
    this.roster.touch(Date.now());
    this.roster.save();
    // Local progress is already safe; finish the cloud push in the background.
    this.pushRoster();
    Promise.resolve(flushCloud()).catch(() => {});
    this.started = false;
    clearRotationRecovery(localStorage);
    this.hud?.closePanel?.();
    document.getElementById('hud')?.classList.add('hidden');
    this.leaveOnlineInPlace();
    // Keep the preferred world and account session for the next hunter.
    if (this.net?.role) this.net.leave();
    if (typeof window !== 'undefined') window.__mgHuntStarted = false;
    document.body.classList.remove('hunting', 'landscape-full');
    document.documentElement.classList.remove('landscape-full');
    this.hud?.closePanel?.();
    this.hud?.hideDialog?.();
    this.hud?.closeSkillPicker?.();
    document.getElementById('hud')?.classList.add('hidden');
    this.hideWorldPicker();
    this.hideWorldAuth();
    this.character = null;
    this.charSelect?.open?.();
    return !!this.charSelect?.active;
  }

  /** Put the chosen character in the world. Runs inside the tap so phones can go fullscreen. */
  async enterWorld(char) {
    if (this.started || !this.roster?.get(char.id) || this.membershipChecking) return;
    if (this.wallet?.kind === 'guest' && isWorldOnline(location.search)) return;
    if (this.wallet?.kind !== 'guest') {
    this.membershipChecking = true;
    try {
      const account = readAccount();
      if (this.wallet?.kind !== 'email' || !account?.userId || this.wallet.userId !== account.userId || !account?.accessToken) {
        this.charSelect?.note?.('Sign in with an account and connect Klever to play.', true, true);
        this.openSocialSignIn();
        return;
      }
      const allowed = await ensureMembership(account, this);
      if (!allowed || this.started || !this.roster?.get(char.id)) return;
      this.membershipGatePassed = true;
    } finally {
      this.membershipChecking = false;
    }
    }
    rememberRotationRecovery(
      localStorage,
      char.id,
      screenOrientation(window.innerWidth, window.innerHeight),
    );
    this.character = char;
    this.roster.played(char.id);
    this.progress.useCharacter(this.roster.charKey(char.id));
    const warn = this.progress.saveWarning || this.roster.saveWarning;
    if (warn) {
      this.progress.saveWarning = null;
      this.roster.saveWarning = null;
      queueMicrotask(() => this.hud?.toast('A hunt save was damaged. A backup was kept. Starting a fresh hunt.', 5200));
    }
    rememberWorldMode(isWorldOnline(location.search) ? 'online' : 'offline');
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
    const unlinkedOpen = !!document.getElementById('wallet-unlinked') && !document.getElementById('wallet-unlinked').classList.contains('hidden');
    const picking = !!this.worldPickOpen;
    const signed = !!this.wallet?.address;
    const email = this.wallet?.kind === 'email';
    const guest = this.wallet?.kind === 'guest';
    choices?.classList.toggle('hidden', signed || forming || unlinkedOpen || picking);
    const picker = document.getElementById('world-picker');
    if (picker && !picking) {
      picker.hidden = true;
      picker.classList.add('hidden');
    }
    sign.classList.toggle('hidden', signed || forming || unlinkedOpen);
    start.classList.add('hidden');
    start.textContent = 'Begin the hunt';
    swap.classList.toggle('hidden', !signed);
    if (!signed) {
      help?.classList.add('hidden');
      if (!forming) {
        sign.textContent = 'Log in with Klever';
        if (!unlinkedOpen) {
          status.textContent = 'Play as a guest on this device, or sign in to keep the hunt on your account.';
        }
      }
      return;
    }
    if (guest) {
      if (!forming) {
        panel?.classList.add('hidden');
        status.textContent = 'Playing as guest. The hunt stays on this device.';
      }
      help?.classList.add('hidden');
      swap.textContent = 'Leave guest hunt';
      return;
    }
    panel?.classList.add('hidden');
    help?.classList.add('hidden');
    swap.textContent = 'Sign out';
    if (this.cloudState === 'error' && !this.cloudSyncing && !this.started) {
      status.replaceChildren();
      const noun = email ? 'account' : 'wallet';
      status.append(`The characters saved to this ${noun} could not be opened. `);
      const who = document.createElement('b');
      if (email) who.className = 'account-email';
      who.textContent = this.wallet.email || shortAddress(this.wallet.address);
      status.append(who, ' is signed in.');
      start.textContent = 'Try again';
      start.classList.remove('hidden');
      return;
    }
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
    this.hideWalletUnlinked();
    this.hideWorldPicker();
    this.hideWorldAuth();
    panel.dataset.mode = mode;
    panel.classList.remove('hidden');
    confirm?.classList.toggle('hidden', mode !== 'create');
    confirmLabel?.classList.toggle('hidden', mode !== 'create');
    if (submit) submit.textContent = mode === 'create' ? 'Create account' : 'Sign in';
    if (password) password.setAttribute('autocomplete', mode === 'create' ? 'new-password' : 'current-password');
    document.getElementById('account-pass-hint')?.classList.toggle('hidden', mode !== 'create');
    document.getElementById('account-retry')?.classList.add('hidden');
    if (error) error.textContent = '';
    if (status) {
      status.textContent = mode === 'create'
        ? 'Choose an email and a password of 8 to 72 characters. This account signs in on any device.'
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
    document.getElementById('account-retry')?.classList.add('hidden');
    this.hideWalletUnlinked();
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
    document.getElementById('account-retry')?.classList.add('hidden');
    try {
      const session = mode === 'create'
        ? await createAccount(email, password, confirm)
        : await signInAccount(email, password);
      if (isAdminAccount(session)) {
        location.replace(adminHref());
        return;
      }
      this.closeAccount();
      await this.applyWallet(session);
      this.watchAccount();
    } catch (err) {
      if (error) error.textContent = err.message || 'The account could not be created.';
      document.getElementById('account-retry')?.classList.toggle('hidden', err.code !== 'unavailable');
    } finally {
      this.walletBusy = false;
      if (submit) submit.disabled = false;
    }
  }

  async signOut(repromptKlever) {
    if (this.logoutSaving) return;
    const leaveWorld = this.started;
    const session = this.wallet;
    if (leaveWorld && session && this.roster) {
      this.logoutSaving = true;
      const button = document.getElementById('set-out');
      if (button) { button.disabled = true; button.textContent = 'Saving progress…'; }
      const onCloud = this.progress.onCloud;
      this.stopAutosave();
      this.progress.onCloud = null;
      let confirmed = false;
      let deadline;
      try {
        this.captureHunter();
        this.progress.save(false);
        this.roster.touch(Date.now());
        this.roster.save();
        if (session.kind === 'guest') confirmed = true;
        else if (session.kind === 'email' && !this.cloudSyncing && !this.cloudConflict) {
          confirmed = await Promise.race([
            new Promise(resolve => {
              schedulePush(session, this.roster.data, result => {
                resolve(!!result?.revision && !result.error && !result.conflict);
              });
              flushCloud();
            }),
            new Promise(resolve => { deadline = setTimeout(() => resolve(false), 15000); }),
          ]);
        }
      } catch { /* keep the account open for retry */ }
      finally { clearTimeout(deadline); this.logoutSaving = false; }
      if (!confirmed || this.wallet !== session) {
        if (this.wallet === session) {
          this.progress.onCloud = onCloud;
          if (session.kind !== 'guest') this.startAutosave();
          if (button) { button.disabled = false; button.textContent = 'Retry save & log out'; }
          this.hud?.toast('Save not confirmed. Progress retained locally; retry logout.', 5000);
        }
        return;
      }
    }
    clearRotationRecovery(localStorage);
    if (this.cloudGate) this.cloudGate.open = false;
    this.stopAutosave();
    this.stopDeviceWatch();
    clearSession();
    clearAccount();
    clearCloudToken();
    this.progress.onCloud = null;
    this.wallet = null;
    this.roster = null;
    this.character = null;
    this.walletNote = '';
    this.cloudState = 'off';
    this.cloudReachable = false;
    this.staffRole = '';
    this.cloudSavedAt = 0;
    if (leaveWorld) {
      location.reload();
      return;
    }
    this.charSelect.close();
    this.hideWorldPicker();
    this.hideWorldAuth();
    document.getElementById('title').classList.remove('hidden');
    this.closeAccount();
    this.refreshWalletUi();
  }

  async handOffToWallet() {
    const sign = document.getElementById('btn-wallet');
    const status = document.getElementById('wallet-status');
    if (sign) sign.disabled = true;
    if (status) status.textContent = 'Preparing secure Klever sign-in…';
    document.getElementById('account-choices')?.classList.add('hidden');
    try {
      const handoff = await startKleverHandoff();
      if (status) status.textContent = 'Opening Klever Wallet… approve the sign-in there, then return here.';
      launchKleverApp(handoff.id);
      const deadline = Date.now() + 5 * 60 * 1000;
      while (Date.now() < deadline && !this.wallet?.address) {
        await new Promise((resolve) => window.setTimeout(resolve, 1800));
        const session = await pollKleverHandoff(handoff);
        if (session) {
          this.hideWalletUnlinked();
          await this.applyWallet(session);
          this.watchAccount();
          if (status) status.textContent = 'Klever sign-in complete.';
          return;
        }
      }
      if (!this.wallet?.address && status) status.textContent = 'Still waiting for Klever. Approve the request in Klever Wallet, then return to this browser.';
    } catch (err) {
      if (status) status.textContent = err.message || 'Klever sign-in could not be completed.';
    } finally {
      this.walletBusy = false;
      if (sign) sign.disabled = false;
      if (!th…14622 tokens truncated…apCamera();
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
    if (this.debug?.facingLock || (this.debug?.autoAttack && this.debug.autoLock && !this.debug.autoLock.dead)) return;
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

  setDebugAutoAttack(on) {
    return setDebugAutoAttack(this, on);
  }

  doAttack() {
    const P = this.player;
    if (P.dead) return;
    let it = this.carried(this.items[this.sel]);
    if (it !== this.items[this.sel]) {
      this.items[this.sel] = it;
      this.player.setHeld(it.held || null);
      this.hud.buildHotbar(this.items, (n) => this.onHotbar(n), (n) => this.hud.openPanel('bag', this, { assignSlot: n }));
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
    if (this.net?.role === 'guest') {
      this.net.relayHit(m, dmg, dx, dz, knock, crit);
      return;
    }
    const riftOwned = m.realm === 'rift' && this.riftRun?.serverOwned;
    const serverCombat = this.mmo?.ws?.readyState === 1 && this.mmo.you?.guest === false;
    if (!riftOwned) {
      m.takeHit(dmg, dx, dz, knock, crit);
      return;
    }
    if (!serverCombat) return;
    if (m.serverAuthoritative && m.serverId) {
      this.mmo.attackMonster(m.serverId);
      return;
    }
    const serverMob = (this.mmo.entities?.monsters || [])
      .filter((candidate) => candidate.zone === 'rift' && candidate.type === m.type)
      .map((candidate) => ({ candidate, distance: Math.hypot(candidate.x - m.x, candidate.z - m.z) }))
      .sort((a, b) => a.distance - b.distance)[0];
    if (serverMob && serverMob.distance <= 18) {
      m.serverId = serverMob.candidate.id;
      m.serverAuthoritative = true;
      this.mmo.attackMonster(serverMob.candidate.id);
    }
  }

  enterPvpArenaFromServer(info) {
    const w = this.world, arena = w?.colosseum, pose = info?.pose;
    if (!w || !arena || !pose || !this.player || w.realm === 'rift') return false;
    if (w.cave) w.cave.group.visible = false;
    if (w.rift) w.rift.group.visible = false;
    w.group.visible = false;
    arena.group.visible = true;
    w.realm = 'colosseum';
    this.player.pos.set(Number(pose.x) || arena.arena.x, Number(pose.y) || 2.2, Number(pose.z) || arena.arena.z);
    this.player.yaw = Number(pose.yaw) || 0;
    this.player.vel?.set(0, 0, 0);
    this.player.knock?.set(0, 0, 0);
    this.player.syncObj?.();
    this.player.hp = Number(info.hp) || this.player.hp;
    this.player.dead = false;
    this.player.setState?.('idle');
    this.cam.targetYaw = this.player.yaw;
    this.sky.indoors = true;
    this.snapCamera();
    this.zone = 'colosseum';
    this.hud.setArea('Gilantre Colosseum');
    this.hud.banner('Colosseum', info.mode || 'Match begins', 2600);
    this.refreshHud?.();
    return true;
  }

  leavePvpArenaFromServer(info) {
    const w = this.world, arena = w?.colosseum, pose = info?.return_pose;
    if (!w || !arena || !this.player) return false;
    arena.group.visible = false;
    const zone = String(pose?.zone || 'Oakhollow');
    const realm = zone === 'cave' ? 'cave' : zone === 'rift' ? 'rift' : 'over';
    w.realm = realm;
    w.group.visible = realm === 'over';
    if (w.cave) w.cave.group.visible = realm === 'cave';
    if (w.rift) w.rift.group.visible = realm === 'rift';
    if (pose) {
      this.player.pos.set(Number(pose.x) || 72, Number(pose.y) || 3, Number(pose.z) || 72.5);
      this.player.yaw = Number(pose.yaw) || 0;
    }
    this.player.vel?.set(0, 0, 0);
    this.player.knock?.set(0, 0, 0);
    this.player.syncObj?.();
    this.player.hp = Number(info.hp) || this.player.hp;
    this.player.dead = false;
    this.player.setState?.('idle');
    this.cam.targetYaw = this.player.yaw;
    this.sky.indoors = realm !== 'over';
    this.snapCamera();
    this.zone = zone;
    this.hud.setArea(zone === 'cave' ? 'Darksycle Den' : zone === 'rift' ? 'Waygate Rift' : zone);
    this.refreshHud?.();
    return true;
  }

  enterRiftFromServer(info) {
    if (this.world?.realm === 'rift') return;
    enterRift(this, { party: info?.party_size || 1, follow: false, serverOwned: true });
  }

  leaveRiftFromServer() {
    if (this.world?.realm !== 'rift') return;
    leaveRift(this);
  }

  syncServerRewardState(snapshot) {
    if (!snapshot || !this.progress) return;
    const mergeCounts = (local, server) => {
      const next = { ...(local || {}) };
      for (const [id, raw] of Object.entries(server || {})) {
        const value = Math.max(0, Math.floor(Number(raw) || 0));
        if (value > (Number(next[id]) || 0)) next[id] = value;
      }
      return next;
    };
    this.progress.data.gold = Math.max(this.progress.gold, Math.floor(Number(snapshot.gold) || 0));
    this.progress.data.xp = mergeCounts(this.progress.data.xp, snapshot.xp);
    this.progress.data.goods = mergeCounts(this.progress.data.goods, snapshot.goods);
    this.progress.data.materials = mergeCounts(this.progress.data.materials, snapshot.materials);
    this.progress.data.riftClearAt = Math.max(Number(this.progress.data.riftClearAt) || 0, Number(snapshot.riftClearAt) || 0);
    this.progress.data.crafted = { ...(this.progress.data.crafted || {}) };
    for (const [id, owned] of Object.entries(snapshot.crafted || {})) if (owned) this.progress.data.crafted[id] = true;
    this.progress.save(false);
    this.gold = this.progress.gold;
    if (this.player) {
      this.applyGear();
      this.hud?.setGold?.(this.gold);
      this.itemsChanged?.();
      this.refreshHud?.();
    }
  }

  applyServerReward(reward) {
    if (!reward || !this.progress || !(Number(reward.amount) > 0)) return;
    const amount = Math.floor(Number(reward.amount));
    if (reward.kind === 'gold') { this.addGold(amount); return; }
    if (reward.kind === 'xp') {
      const levelled = this.progress.addXp(String(reward.id), amount);
      if (levelled) this.hud.banner('Level up', `${reward.id} ${levelled}`, 2600);
      return;
    }
    if (reward.kind === 'gear') {
      if (this.progress.grantFound(String(reward.id))) {
        this.applyGear();
        this.itemsChanged();
        this.hud.toast(`Found ${String(reward.id)}!`, 2200);
      } else if (!this.progress.crafted(String(reward.id))) this.hud.toast(INVENTORY_FULL, 1800);
      return;
    }
    let added = 0;
    if (reward.kind === 'good') added = this.progress.addGood(String(reward.id), amount);
    else if (reward.kind === 'material') added = this.progress.addPart(String(reward.id), amount);
    if (added > 0) this.itemsChanged();
    if (added < amount) this.hud.toast(INVENTORY_FULL, 1800);
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

  parkLocalHunt() {
    if (this.parkedHunt) return;
    this.guestBound = false;
    this.parkedHunt = this.monsters.slice();
    this.monsters = [];
  }

  restoreParkedHunt() {
    const parked = this.parkedHunt;
    this.parkedHunt = null;
    if (!parked) return false;
    for (const m of this.monsters) m.dispose();
    this.monsters = parked;
    this.guestBound = false;
    return true;
  }

  dropParkedHunt() {
    if (!this.parkedHunt) return;
    for (const m of this.parkedHunt) m.dispose();
    this.parkedHunt = null;
  }

  suspendLocalHunt() {
    this.parkLocalHunt();
  }

  onSessionEnd(wasGuest) {
    this.clearRemotes();
    this.guestBound = false;
    if (!wasGuest) return;
    if (this.restoreParkedHunt()) return;
    for (const m of this.monsters) m.dispose();
    this.monsters = [];
    this.spawner?.populate();
  }

  applyWorld(data) {
    if (!data || this.net.role !== 'guest') return;
    if (!this.guestBound) {
      this.guestBound = true;
      this.dropParkedHunt();
      this.net.clearJoinTimer();
      for (const m of this.monsters) m.dispose();
      this.monsters = [];
    }
    if (data.rift) syncRiftFollow(this, data.rift);
    const seen = new Set();
    for (const row of data.m || []) {
      const [id, type, x, y, z, yaw, hp, state] = row;
      seen.add(id);
      let mon = this.monsters.find((m) => m.id === id);
      if (!mon) {
        mon = this.spawner.spawn(type, x, z, false);
        mon.id = id;
        mon.puppet = true;
        if (this.world.realm === 'rift') mon.realm = 'rift';
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
    const riftBtn = document.getElementById('wg-rift-enter');
    const riftNote = document.getElementById('wg-rift-note');
    const cool = riftReady(this);
    if (riftBtn) {
      const inside = this.world.realm === 'rift';
      const guestNet = net.role === 'guest';
      riftBtn.disabled = inside || guestNet || !cool.ok;
      riftBtn.textContent = inside ? 'Already in the rift' : guestNet ? 'Host opens the rift' : cool.ok ? 'Enter a rift' : 'Rift sealed';
    }
    if (riftNote) {
      const party = this.wallet?.kind === 'guest' ? 1 : Math.min(4, 1 + (net.peers?.size || 0));
      riftNote.textContent = cool.ok
        ? `A short instanced hunt. Waves scale with the party (${party}). Guests can enter solo. Host and join stay account-only.`
        : `The last chest sealed the tear for ${Math.max(1, Math.ceil(cool.wait / 1000))}s.`;
    }
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

  nearestPortal() {
    const p = this.player.pos;
    let best = null;
    let bd = 3.6;
    for (const site of this.world.teleports || []) {
      const d = Math.hypot(p.x - site.x, p.z - site.z);
      if (d < bd) {
        bd = d;
        best = site;
      }
    }
    return best;
  }

  openTome() {
    if (this.hud.panelId === 'tome') return;
    this.hud.openPanel('tome', this);
    this.hud.panelId = 'tome';
    this.audio.select();
  }

  attunePortal(site) {
    if (!site) return;
    const fresh = this.progress.rememberPortal(site.id);
    this.audio.portal();
    this.fx.burst(site.x, site.y + 1.6, site.z, [0xd6f3ff, 0xffffff, 0x6fd6ff], 14, 2.2, 0.08, 0.45);
    this.hud.toast(fresh ? `${site.name} is written in the tome` : `${site.name} is already in the tome`, 2400);
    this.openTome();
  }

  travelTo(dest) {
    if (!this.started || !this.player || this.player.dead || !dest) return;
    if (this.world.realm === 'cave' || this.world.realm === 'rift') restoreOverworld(this);
    this.gather?.cancel?.();
    const y = this.world.heightAt(dest.x, dest.z);
    this.player.dead = false;
    this.player.pos.set(dest.x, y, dest.z);
    this.player.vel.set(0, 0, 0);
    this.player.knock?.set(0, 0, 0);
    this.player.setState('idle');
    this.player.invuln = 0.8;
    this.player.syncObj();
    // Force destination streaming before the next draw, not after it.
    this._streamX = null;
    this._streamZ = null;
    this.snapCamera();
    this.hud.closePanel();
    this.audio.portal();
    this.fx.burst(dest.x, y + 1.2, dest.z, [0xd6f3ff, 0xffffff, 0x6fd6ff], 18, 2.6, 0.1, 0.5);
    const banner = dest.banner || ['Travel', dest.name];
    this.hud.banner(banner[0], banner[1], 2400);
  }

  updatePortals() {
    const site = this.nearestPortal();
    this.portalNear = !!(site && this.started);
    if (this.portalNear && !this.portalHinted) {
      this.portalHinted = true;
      this.hud.toast('Teleportation Portal — press F to attune it to your tome', 2800);
    }
    if (site) {
      const known = this.progress.knowsPortal(site.id);
      const [sx, sy, vis] = this.screenOf(site.x, site.y + 3.2, site.z, true);
      const label = known
        ? `${site.name}<small>F · open tome</small>`
        : `${site.name}<small>F · attune</small>`;
      this.hud.plate('portal', label);
      this.hud.placePlate('portal', sx, sy, vis, { dist: Math.hypot(this.player.pos.x - site.x, this.player.pos.z - site.z) });
    } else this.hud.removePlate('portal');
  }

  clickPortal() {
    const aim = this.input.aim;
    if (!this.started || !aim.has || this.input.touch) return false;
    const P = this.player.pos;
    for (const site of this.world.teleports || []) {
      if (Math.hypot(P.x - site.x, P.z - site.z) > 4.2) continue;
      const hits = this.ray.intersectObject(site.group, true);
      if (!hits.length) continue;
      this.attunePortal(site);
      return true;
    }
    return false;
  }

  tryTalk() {
    const w = this.world.waygate;
    const p = this.player.pos;
    const wd = w ? Math.hypot(p.x - w.x, p.z - w.z) : 99;
    const npcNear = this.ambient.npcs.find((n) => n.near);
    const nd = npcNear ? Math.hypot(p.x - npcNear.x, p.z - npcNear.z) : 99;
    if (this.world.realm === 'colosseum' && (this.mmo?.pvpMatchId || this.mmo?.pvpProposalId)) {
      this.mmo.showPvpPanel();
      this.audio.select();
      return;
    }
    if (this.world.realm === 'rift') {
      const chest = this.world.rift?.chest;
      if (chest?.ready && !chest.looted && Math.hypot(p.x - chest.x, p.z - chest.z) < 2.4) {
        lootRiftChest(this);
        return;
      }
      const r = this.world.rift;
      if (r && !this.riftRun?.follow && r.cool <= 0 && Math.hypot(p.x - r.spawn.x, p.z - r.spawn.z) < 2.8 && p.z >= r.spawn.z - 0.4) {
        leaveRift(this);
        return;
      }
    }
    if (!this.talkNpc && this.gather.interact()) return;
    const crate = this.world.storage;
    const sd = crate ? Math.hypot(p.x - crate.x, p.z - crate.z) : 99;
    const closerThanShops = () => {
      const shop = (spot) => (spot ? Math.hypot(p.x - spot.x, p.z - spot.z) : 99);
      return sd <= shop(this.world.market) && sd <= shop(this.world.alchemy) && sd <= shop(this.world.forge) && sd <= shop(this.world.smithy) && sd <= wd;
    };
    if (!this.talkNpc && this.storageNear && !npcNear && closerThanShops()) {
      this.openStorage();
      return;
    }
    const portal = this.nearestPortal();
    const pd = portal ? Math.hypot(p.x - portal.x, p.z - portal.z) : 99;
    const shop = (spot) => (spot ? Math.hypot(p.x - spot.x, p.z - spot.z) : 99);
    if (!this.talkNpc && portal && pd < 3.6 && !npcNear && pd <= sd && pd <= wd && pd <= shop(this.world.market) && pd <= shop(this.world.alchemy) && pd <= shop(this.world.forge) && pd <= shop(this.world.smithy)) {
      this.attunePortal(portal);
      return;
    }
    if (!this.talkNpc && this.marketNear && !npcNear) {
      this.openMarket();
      return;
    }
    if (!this.talkNpc && this.colosseumNear && !npcNear) {
      this.openColosseumBoard();
      return;
    }
    if (!this.talkNpc && this.alchemyNear && !npcNear) {
      this.openAlchemy();
      return;
    }
    if (!this.talkNpc && this.smithyNear && !npcNear) {
      this.openSmithy();
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
      if (this.talkScript) {
        this.advanceQuestTalk(npc);
        return;
      }
      if (npc.dialogLeft > 0) {
        npc.dialogLeft--;
        this.hud.showDialog(npc.name, npc.nextLine());
      } else {
        this.hud.hideDialog();
        this.talkNpc = null;
        if (!this.talkQuest && npc.def.service === 'forge') this.openForge();
        this.talkQuest = false;
      }
      this.audio.select();
      return;
    }
    const near = this.ambient.npcs.find((n) => n.near);
    if (!near) return;
    let script = this.journal.scriptFor(near.def.id);
    if (!script) {
      const offer = this.journal.offerFor(near.def.id);
      if (offer) {
        const started = this.journal.start(offer.id, true);
        if (started) this.applyJournal(started);
        script = this.journal.scriptFor(near.def.id);
      }
    }
    if (near.def.service === 'market' && !script) {
      this.openMarket(near.def.name);
      return;
    }
    if (near.def.service === 'exchange' && !script) {
      this.openExchange();
      return;
    }
    if (near.def.service === 'alchemy' && !script) {
      this.openAlchemy();
      return;
    }
    this.talkNpc = near;
    this.talkQuest = !!script;
    if (script) {
      this.talkScript = { questId: script.questId, lines: script.lines, choices: script.choices, index: 0, phase: 'line', choiceId: null };
      this.hud.showDialog(near.name, script.lines[0] || '...');
    } else {
      this.talkScript = null;
      near.dialogLeft = near.def.lines.length - 1;
      this.hud.showDialog(near.name, near.nextLine());
    }
    this.audio.select();
  }

  advanceQuestTalk(npc) {
    const s = this.talkScript;
    if (!s) return;
    if (s.phase === 'choice') {
      this.audio.select();
      return;
    }
    if (s.phase === 'lack') {
      this.hud.hideDialog();
      this.talkNpc = null;
      this.talkScript = null;
      this.talkQuest = false;
      this.audio.select();
      return;
    }
    if (s.phase === 'reply') {
      this.finishQuestTalk(s.choiceId);
      return;
    }
    s.index += 1;
    if (s.index < s.lines.length) {
      this.hud.showDialog(npc.name, s.lines[s.index]);
      this.audio.select();
      return;
    }
    if (s.choices?.length) {
      s.phase = 'choice';
      this.hud.showDialog(npc.name, s.lines[s.lines.length - 1] || '');
      this.hud.showChoices(s.choices, (id) => this.pickTalk(id));
      this.audio.select();
      return;
    }
    this.finishQuestTalk(null);
  }

  pickTalk(id) {
    const s = this.talkScript;
    if (!s || s.phase !== 'choice' || !this.talkNpc) return;
    const choice = s.choices.find((c) => c.id === id);
    if (!choice) return;
    s.choiceId = id;
    s.phase = 'reply';
    this.hud.showDialog(this.talkNpc.name, choice.reply);
    this.audio.select();
  }

  finishQuestTalk(choiceId) {
    const s = this.talkScript;
    const result = s ? this.journal.finishTalk(s.questId, choiceId) : { ok: false };
    if (result.blocked) {
      s.phase = 'lack';
      this.hud.showDialog(this.talkNpc.name, result.line || 'You do not have it yet.');
      this.audio.select();
      return;
    }
    this.hud.hideDialog();
    this.talkNpc = null;
    this.talkScript = null;
    this.talkQuest = false;
    if (result.ok) this.applyJournal(result);
    this.audio.select();
  }

  addGold(n) {
    this.gold = Math.max(0, this.gold + n);
    this.hud.setGold(this.gold);
    this.progress.setGold(this.gold);
  }

  buyPotion(id) {
    const offer = POTION_SHOP[id];
    const it = this.baseItems.find((i) => i.id === id);
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

  nearestSpot(list) {
    const P = this.player.pos;
    let spot = null;
    let d = Infinity;
    for (const s of list) {
      if (!s) continue;
      const sd = Math.hypot(P.x - s.x, P.z - s.z);
      if (sd < d) { spot = s; d = sd; }
    }
    return { spot, d };
  }

  openAlchemy() {
    this.hud.openPanel('alchemy', this);
    this.hud.panelId = 'alchemy';
    this.audio.select();
    const a = this._alchemySpot || this.world.alchemy;
    if (a) this.fx.burst(a.x, a.y + 0.8, a.z, [0x5dffb0, 0xb8ffe0, 0xffffff], 12, 1.6, 0.07, 0.8, -1.2, 1.4);
  }

  updateAlchemy(dt) {
    const { spot: a, d } = this.nearestSpot([this.world.alchemy, this.world.gilantreAlchemy]);
    this._alchemySpot = a;
    if (!a) return;
    this.alchemyNear = d < 3.4 && this.started;
    if (d < 20 && Math.random() < dt * 8) {
      this.fx.burst(a.x + (Math.random() - 0.5) * 0.3, a.y + 0.55, a.z + (Math.random() - 0.5) * 0.3, [0x5dffb0, 0xc8ffe4, 0x4ec8ff], 1, 0.35, 0.07, 1.1, -1.6, 1.3);
    }
    const label = a.name || "Lira's Alchemy";
    if (this.alchemyNear && !this.alchemyHinted) {
      this.alchemyHinted = true;
      this.hud.toast(`${label} - press F to buy potions`, 2600);
    }
    if (this.alchemyNear) {
      const [sx, sy, vis] = this.screenOf(a.x, a.y + 1.5, a.z, true);
      this.hud.plate('alchemy', `${label}<small>F · buy potions</small>`);
      this.hud.placePlate('alchemy', sx, sy, vis, { dist: d });
    } else this.hud.removePlate('alchemy');
  }

  sellGood(id, n = 1) {
    const g = GOODS[id];
    if (!g || isUnsellableGood(g) || !Number.isSafeInteger(n) || n < 1 || !(g.price > 0)) return false;
    if (!this.progress.takeGood(id, n)) return false;
    this.addGold(g.price * n);
    this.audio.coin();
    const m = this.world.market;
    if (m) this.fx.burst(m.x, m.y + 1.3, m.z, [0xffd23f, 0xfff3a8, 0xffffff], 10, 2, 0.07, 0.6, 3, 2);
    this.hud.toast(`Sold ${n} ${g.name.toLowerCase()} for ${g.price * n}g`, 1400);
    return true;
  }

  sellGear(id) {
    const g = gearById(id);
    const pr = this.progress;
    if (!g || id === 'knife' || id.startsWith('__') || pr.data.debugGranted?.items?.includes(id) || pr.data.debugGranted?.weapon === id || !pr.crafted(id) || pr.storedGear(id) || pr.worn(id)) return false;
    if (!pr.releaseCrafted(id)) return false;
    this.addGold(gearSalePrice(g));
    this.applyGear();
    this.itemsChanged();
    this.audio.coin();
    return true;
  }

  sellPart(id, n = 1) {
    if (!MATERIALS[id] || !Number.isSafeInteger(n) || n < 1 || !this.progress.takePart(id, n)) return false;
    this.addGold(n * 5);
    this.audio.coin();
    return true;
  }

  sellAllGoods() {
    let gold = 0;
    for (const g of Object.values(GOODS)) {
      if (isUnsellableGood(g) || !(g.price > 0)) continue;
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

  cookFish(id) {
    return this.gather.cook(id);
  }

  eatGood(id) {
    const g = GOODS[id];
    if (!g || !g.heal || this.progress.good(id) < 1) return false;
    if (!this.player.tryEat(g)) return false;
    this.progress.takeGood(id, 1);
    return true;
  }

  /* ------------------------------ Gilantre Exchange ------------------------------ */

  openExchange() {
    this.hud.openPanel('exchange', this);
    this.hud.panelId = 'exchange';
    this.audio.select();
  }

  /** Applies an Exchange result to this hunter's own save without echoing it back as spending. */
  applyMarket(fn) {
    this.marketApplying = true;
    try {
      fn();
    } finally {
      this.marketApplying = false;
    }
    this.applyGear?.();
    this.itemsChanged?.();
    this.hud.setGold(this.gold);
  }

  /** Items the server took into escrow for a new listing leave the local bag too. */
  marketTake(kind, id, qty) {
    this.applyMarket(() => {
      if (kind === 'good') this.progress.takeGood(id, Math.min(qty, this.progress.good(id)));
      else if (kind === 'material') this.progress.takePart(id, Math.min(qty, this.progress.count(id)));
      else if (kind === 'gear') this.progress.releaseCrafted(id);
    });
  }

  /** Items bought, cancelled back or returned after expiry arrive in the local bag. */
  marketGive(kind, id, qty) {
    this.applyMarket(() => {
      if (kind === 'good') this.progress.addGood(id, qty);
      else if (kind === 'material') this.progress.addPart(id, qty);
      else if (kind === 'gear') this.progress.grantFound(id);
    });
  }

  marketGold(delta) {
    if (!delta) return;
    this.applyMarket(() => this.addGold(delta));
  }

  /** A listing this hunter opened just sold on World 1. */
  marketNotice(msg) {
    if (msg?.kind !== 'sold') return;
    this.hud.toast(`${msg.name}${msg.qty > 1 ? ' x' + msg.qty : ''} sold for ${msg.price} gold. Collect ${msg.payout} at the Gilantre Exchange.`, 4200);
    this.audio.select?.();
    this.exchangeRefresh?.();
  }

  openMarket(name = 'Dalla') {
    this.marketName = name;
    this.hud.openPanel('market', this);
    this.hud.panelId = 'market';
    this.audio.select();
  }

  updateMarket() {
    const m = this.world.market;
    if (!m) return;
    const P = this.player.pos;
    const d = Math.hypot(P.x - m.x, P.z - m.z);
    this.marketNear = d < 3.4 && this.started;
    if (this.marketNear && !this.marketHinted) {
      this.marketHinted = true;
      this.hud.toast("Dalla's Market - press F to sell ore and fish", 2600);
    }
    if (this.marketNear) {
      const [sx, sy, vis] = this.screenOf(m.x, m.y + 2.4, m.z, true);
      this.hud.plate('market', "Dalla's Market<small>F · sell ore &amp; fish</small>");
      this.hud.placePlate('market', sx, sy, vis, { dist: d });
    } else this.hud.removePlate('market');
  }

  openColosseumBoard() {
    const ui = this.mmo?.pvpBoard;
    const signedIn = this.mmo?.you?.guest === false && this.mmo?.ws?.readyState === 1;
    if (!ui || !signedIn) {
      this.hud.toast('Sign in to World 1 to sign up for the Colosseum', 2400);
      this.audio.select();
      return;
    }
    this.mmo.showPvpPanel();
    this.audio.select();
  }

  updateColosseumBoard() {
    const b = this.world.colosseumBoard;
    if (!b) return;
    const P = this.player.pos;
    const d = Math.hypot(P.x - b.x, P.z - b.z);
    this.colosseumNear = d < 4.8 && this.started && this.world.realm === 'over';
    if (this.colosseumNear && !this.colosseumHinted) {
      this.colosseumHinted = true;
      this.hud.toast('Click the Colosseum board to sign up for PvP', 2600);
    }
    if (this.colosseumNear) {
      const [sx, sy, vis] = this.screenOf(b.x, b.y + 2.6, b.z, true);
      this.hud.plate('colosseum', 'Colosseum board<small>click or F · sign up</small>');
      this.hud.placePlate('colosseum', sx, sy, vis, { dist: d });
    } else {
      this.hud.removePlate('colosseum');
      const mmo = this.mmo;
      const busy = mmo && (mmo.pvpMatchId || mmo.pvpQueueMode || mmo.pvpProposalId || mmo.pendingPartyInvite);
      if (!busy) mmo?.hidePvpPanel?.();
    }
  }

  clickColosseumBoard() {
    const b = this.world.colosseumBoard;
    const aim = this.input.aim;
    if (!b?.group || !this.started || !aim.has || this.input.touch) return false;
    if (Math.hypot(this.player.pos.x - b.x, this.player.pos.z - b.z) > 4.2) return false;
    if (!this.ray.intersectObject(b.group, true).length) return false;
    this.openColosseumBoard();
    return true;
  }

  openStorage() {
    this.hud.openPanel('storage', this);
    this.hud.panelId = 'storage';
    this.audio.select();
    const c = this.world.storage;
    if (c) {
      c.open = true;
      this.fx.burst(c.x, c.y + 1.2, c.z, [0x3f7d79, 0xe6b73c, 0xfff3c4], 12, 1.6, 0.07, 0.7, 2, 1.4);
    }
  }

  updateStorage() {
    const c = this.world.storage;
    if (!c) return;
    const P = this.player.pos;
    const d = Math.hypot(P.x - c.x, P.z - c.z);
    this.storageNear = d < 3.6 && this.started;
    if (this.storageNear && !this.storageHinted) {
      this.storageHinted = true;
      this.hud.toast('Storage Crate — press F, or click it, to store items', 2600);
    }
    if (this.storageNear) {
      const [sx, sy, vis] = this.screenOf(c.x, c.y + 2.2, c.z, true);
      this.hud.plate('storage', 'Storage Crate<small>F · store items</small>');
      this.hud.placePlate('storage', sx, sy, vis, { dist: d });
    } else this.hud.removePlate('storage');
    const showing = this.hud.panelId === 'storage' && this.hud.panelOpen;
    c.open = showing && d < 4.8;
    if (showing && d > 4.8) this.hud.closePanel();
  }

  clickStorage() {
    const c = this.world.storage;
    const aim = this.input.aim;
    if (!c || !this.started || !aim.has || this.input.touch) return false;
    const P = this.player.pos;
    if (Math.hypot(P.x - c.x, P.z - c.z) > 4.2) return false;
    const hits = this.ray.intersectObject(c.group, true);
    if (!hits.length) return false;
    this.openStorage();
    return true;
  }

  storeInCrate(k, id, n, page = 0) {
    n = n | 0;
    if (n < 1) return false;
    const pr = this.progress;
    if (k === 'gear' && pr.storedGear(id)) {
      this.hud.toast('That is already in the crate', 1400);
      return false;
    }
    if (!pr.canFitStorage(k, id, n, page)) {
      this.hud.toast('The crate is full', 1400);
      return false;
    }
    const refund = () => {
      if (k === 'good') pr.addGood(id, n);
      else if (k === 'part') pr.addPart(id, n);
      else if (k === 'potion') {
        const it = this.baseItems.find((i) => i.id === id);
        if (it) {
          it.count += n;
          pr.setStock(id, it.count);
          this.itemsChanged();
        }
      }
    };
    if (k === 'good') {
      if (!pr.takeGood(id, n)) return false;
    } else if (k === 'part') {
      if (!pr.takePart(id, n)) return false;
    } else if (k === 'gear') {
      if (!pr.crafted(id)) return false;
      const g = gearById(id);
      if (pr.worn(id)) {
        pr.toggleWear(id);
        this.applyGear();
        if (g?.type === 'weapon') this.selectSlot(0, true);
      }
    } else if (k === 'potion') {
      const it = this.baseItems.find((i) => i.id === id);
      if (!it || it.count < n) return false;
      it.count -= n;
      pr.setStock(id, it.count);
      this.itemsChanged();
    } else return false;
    if (!pr.putStorage(k, id, n, page)) {
      refund();
      this.hud.toast('The crate is full', 1400);
      return false;
    }
    this.audio.select();
    return true;
  }

  takeFromCrate(index, n) {
    const pr = this.progress;
    const s = pr.data.storage[index];
    if (!s) return false;
    let want = n == null ? s.n : Math.min(s.n, n | 0);
    if (want < 1) return false;
    if (s.k === 'potion') {
      const it = this.baseItems.find((i) => i.id === s.id);
      const room = (POTION_SHOP[s.id]?.max ?? 99) - (it?.count | 0);
      if (room < 1) {
        this.hud.toast('Your belt is full of those', 1400);
        return false;
      }
      want = Math.min(want, room);
    } else if (s.k === 'good') {
      want = Math.min(want, pr.roomFor('good', s.id));
      if (want < 1) {
        this.hud.toast(INVENTORY_FULL, 1400);
        return false;
      }
    } else if (s.k === 'part') {
      want = Math.min(want, pr.roomFor('part', s.id));
      if (want < 1) {
        this.hud.toast(INVENTORY_FULL, 1400);
        return false;
      }
    } else if (s.k === 'gear' && !pr.fitsBag(pr.bagSlotsUsed() + 1)) {
      this.hud.toast(INVENTORY_FULL, 1400);
      return false;
    }
    const out = pr.pullStorage(index, want);
    if (!out) return false;
    if (out.k === 'good') pr.addGood(out.id, out.n);
    else if (out.k === 'part') pr.addPart(out.id, out.n);
    else if (out.k === 'potion') {
      const it = this.baseItems.find((i) => i.id === out.id);
      if (it) {
        it.count += out.n;
        pr.setStock(out.id, it.count);
        this.itemsChanged();
      }
    }
    this.audio.select();
    return true;
  }

  openSmithy() {
    this.hud.openPanel('smithy', this);
    this.hud.panelId = 'smithy';
    this.audio.select();
    const s = this._smithySpot || this.world.smithy;
    if (s) this.fx.burst(s.x, s.y + 1.2, s.z, [0xff8a1e, 0xffd27a, 0xffffff], 10, 2.2, 0.08, 0.7, -1, 1.2);
  }

  updateSmithy(dt) {
    const { spot: s, d } = this.nearestSpot([this.world.smithy, this.world.gilantreSmithy]);
    this._smithySpot = s;
    if (!s) return;
    this.smithyNear = d < 4.2 && this.started;
    if (d < 22 && Math.random() < dt * 8) {
      this.fx.burst(s.x + 0.4, s.y + 1.1, s.z, [0xff8a1e, 0xffd27a, 0xff5a1a], 1, 0.6, 0.06, 1.1, -1.4, 1.6);
    }
    if (d < 22 && Math.random() < dt * 2) {
      this.fx.burst(s.x - 0.6, s.y + 3.2, s.z, [0x6a6a70, 0x8a8a90], 1, 0.35, 0.16, 1.6, -0.4, 0.7);
    }
    const label = s.name || 'The Smithy';
    if (this.smithyNear && !this.smithyHinted) {
      this.smithyHinted = true;
      this.hud.toast(`${label} - press F to smelt ore into bars`, 2800);
    }
    if (this.smithyNear) {
      const [sx, sy, vis] = this.screenOf(s.x, s.y + 3.2, s.z, true);
      this.hud.plate('smithy', `${label}<small>F · smelt bars</small>`);
      this.hud.placePlate('smithy', sx, sy, vis, { dist: d });
    } else this.hud.removePlate('smithy');
    if (this.hud.panelId === 'smithy' && d > 5.2) this.hud.closePanel();
  }

  clickSmithy() {
    const aim = this.input.aim;
    if (!this.started || !aim.has || this.input.touch) return false;
    const P = this.player.pos;
    for (const s of [this.world.smithy, this.world.gilantreSmithy]) {
      if (!s?.group) continue;
      if (Math.hypot(P.x - s.x, P.z - s.z) > 4.8) continue;
      const hits = this.ray.intersectObject(s.group, true);
      if (!hits.length) continue;
      this._smithySpot = s;
      this.openSmithy();
      return true;
    }
    return false;
  }

  openCarve() {
    this.hud.openPanel('carve', this);
    this.hud.panelId = 'carve';
    this.audio.select();
  }

  openForge() {
    this.hud.openPanel('forge', this);
    this.hud.panelId = 'forge';
    this.audio.select();
    const f = this._forgeSpot || this.world.forge;
    if (f) this.fx.burst(f.x + 0.4, f.y + 1.3, f.z, [0xff8a1e, 0xffd27a, 0xffffff], 10, 2.2, 0.08, 0.7, -1, 1.2);
  }

  updateForge(dt) {
    const { spot: f, d } = this.nearestSpot([this.world.forge, this.world.gilantreForge]);
    this._forgeSpot = f;
    if (!f) return;
    this.forgeNear = d < 3.6 && this.started;
    if (d < 22 && Math.random() < dt * 9) {
      this.fx.burst(f.x + 0.5, f.y + 0.7, f.z + (Math.random() - 0.5) * 0.4, [0xff8a1e, 0xffd27a, 0xff5a1a], 1, 0.6, 0.06, 1.1, -1.4, 1.6);
    }
    if (d < 22 && Math.random() < dt * 3) {
      this.fx.burst(f.x, f.y + 2.5, f.z, [0x6a6a70, 0x8a8a90], 1, 0.35, 0.16, 1.6, -0.5, 0.8);
    }
    const label = f.name || 'The Forge';
    if (this.forgeNear && !this.forgeHinted) {
      this.forgeHinted = true;
      this.hud.toast(`${label} - press F to forge weapons and armor`, 2600);
    }
    if (this.forgeNear) {
      const [sx, sy, vis] = this.screenOf(f.x, f.y + 2.9, f.z, true);
      this.hud.plate('forge', `${label}<small>F · forge gear</small>`);
      this.hud.placePlate('forge', sx, sy, vis, { dist: d });
    } else this.hud.removePlate('forge');
  }

  setPhotoMode(on) {
    this.photoMode = !!on;
    document.body.classList.toggle('photo-mode', this.photoMode);
    document.documentElement.classList.toggle('photo-mode', this.photoMode);
    if (this.fx) this.fx.photoMode = this.photoMode;
  }

  handleInput() {
    const inp = this.input;
    const hud = this.hud;
    if (hud.skillPicker) {
      if (inp.take('escape')) hud.closeSkillPicker();
      inp.releaseControls();
      this.uiBlocking = true;
      return;
    }
    if (inp.take('photo') && this.started) this.setPhotoMode(!this.photoMode);
    if (inp.take('maplabels') && this.started && hud.panelOpen && hud.panelId === 'map') {
      hud.setMapLabels(!hud.mapLabels);
    }
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
      const slot = inp.slotSelect;
      inp.slotSelect = -1;
      const picked = this.items[slot];
      if (picked?.kind === 'use') {
        if (!hud.panelOpen && this.started) this.player?.tryAttack(picked);
      } else this.selectSlot(slot);
    }
    if (!this.started) this.cam.targetYaw += this.rawDt * 0.12;
    this.cam.targetYaw += inp.rotateDelta;
    inp.rotateDelta = 0;
    if (inp.take('rotateR')) this.cam.targetYaw += Math.PI / 4;
    if (inp.take('rotateL')) this.cam.targetYaw -= Math.PI / 4;
    if (inp.zoomDelta) {
      this.cam.targetDist = clamp(this.cam.targetDist + inp.zoomDelta * 1.6, 8, 52);
      inp.zoomDelta = 0;
    }

    const blocked = this.uiBlocking;
    this.aimAtMouse();
    if (inp.take('talk')) {
      if (!blocked) this.tryTalk();
    }
    const autoLocked = !blocked && this.debug?.autoAttack && acquireAutoAttackTarget(this);
    if (inp.take('attack') && !blocked) {
      if (autoLocked) {
        /* Hostile lock holds: crates, portals, and the smithy cannot steal the swing. */
      } else if (!this.clickStorage() && !this.clickPortal() && !this.clickSmithy() && !this.clickColosseumBoard()) this.doAttack();
    } else if (!autoLocked && inp.attackHeld && !blocked && this.player.state === 'idle') {
      this.doAttack();
    }
    if (!blocked) tickDebugAutoAttack(this, this.rawDt, typeof performance !== 'undefined' ? performance.now() : 0);
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
    this.cam.dist = this.cam.targetDist;
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
    const ahead = Number(c.lookAhead) || 0;
    const face = Number(this.player.yaw) || 0;
    const tx = P.x + Math.sin(face) * ahead;
    const ty = P.y + 1.3;
    const tz = P.z + Math.cos(face) * ahead;
    c.look.x += (tx - c.look.x) * k;
    c.look.y += (ty - c.look.y) * Math.min(1, dt === 0 ? 1 : dt * 5);
    c.look.z += (tz - c.look.z) * k;

    const inTown = this.world?.zoneAt?.(P.x, P.z) === ZONE.TOWN;
    const pitch = c.pitch + this.forestAmt * 0.36 + (inTown ? 0.14 : 0);
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const dist = c.dist * (1 + this.forestAmt * 0.12 + (inTown ? 0.08 : 0));
    const cx = c.look.x + Math.sin(c.yaw) * cp * dist;
    const cz = c.look.z + Math.cos(c.yaw) * cp * dist;
    let cy = c.look.y + sp * dist;
    const gh = this.world.heightAt(cx, cz);
    if (cy < gh + 1.2) cy = gh + 1.2;
    if (this.world.realm === 'cave' && cy < 8.2) cy = 8.2;
    if (this.world.realm === 'rift' && cy < 6.4) cy = 6.4;
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
    const cam = this.camera;
    const rh = this.renderer.domElement.height;
    const rw = this.renderer.domElement.width;
    this.tmpV.set(P.x, P.y, P.z);
    const feetY = this.tmpV.project(cam).y;
    this.tmpV.set(P.x, P.y + 2.2, P.z);
    const headY = this.tmpV.project(cam).y;
    const inTown = this.world?.zoneAt?.(this.player.pos.x, this.player.pos.z) === ZONE.TOWN;
    const heroPx = Math.abs(headY - feetY) * (inTown ? 0.85 : 0.62) * rh;
    hideUniforms.uHideRadius.value = hideRadiusPx(rw, rh, heroPx);
    this.tmpV.set(P.x, P.y + 1, P.z);
    const depth = this.tmpV.clone().applyMatrix4(cam.matrixWorldInverse).z * -1;
    const proj = this.tmpV.project(cam);
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
      this.ember += (0 - this.ember) * Math.min(1, dt * 2);
      return;
    }
    if (this.world.realm === 'rift') {
      if (this.zone !== 'rift') {
        this.zone = 'rift';
        this.hud.setArea('Waygate Rift');
      }
      this.forestAmt += (0 - this.forestAmt) * Math.min(1, dt * 1.5);
      this.chill += (0 - this.chill) * Math.min(1, dt * 2);
      this.ember += (0 - this.ember) * Math.min(1, dt * 2);
      return;
    }
    if (this.world.realm === 'colosseum') {
      if (this.zone !== 'colosseum') {
        this.zone = 'colosseum';
        this.hud.setArea('Gilantre Colosseum');
      }
      this.forestAmt += (0 - this.forestAmt) * Math.min(1, dt * 1.5);
      this.chill += (0 - this.chill) * Math.min(1, dt * 2);
      this.ember += (0 - this.ember) * Math.min(1, dt * 2);
      return;
    }

    const land = this.world.landAt(P.x, P.z);
    const oasisName = oasisAreaName(P.x, P.z);
    if (oasisName) {
      if (this.zone !== oasisName) {
        const first = this.zone === -1;
        this.zone = oasisName;
        this.hud.setArea(oasisName);
        if (!first && this.started) this.hud.banner('The Living Water', oasisName, 2600);
      }
      const shade = land?.shade || 0;
      this.forestAmt += (shade - this.forestAmt) * Math.min(1, dt * 1.5);
      this.chill += (0 - this.chill) * Math.min(1, dt * 1.2);
      this.ember += (0 - this.ember) * Math.min(1, dt * 1.2);
      return;
    }
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
      const emberGoal = land.emberAt ? land.emberAt(Math.floor(P.x) - land.x0, Math.floor(P.z) - land.z0) : 0;
      this.ember += (emberGoal - this.ember) * Math.min(1, dt * 1.2);
      return;
    }
    this.chill += (0 - this.chill) * Math.min(1, dt * 1.2);
    this.ember += (0 - this.ember) * Math.min(1, dt * 1.2);
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

  /** Wood smoke drifting up from the village fires of the Northern Jungle, only near the hunter. */
  emitVillageSmoke(dt) {
    const spots = this.world?.tribe?.smoke;
    if (!spots?.length || !this.fx) return;
    const P = this.player.pos;
    for (const s of spots) {
      if (Math.abs(s.x - P.x) > 70 || Math.abs(s.z - P.z) > 70) continue;
      s.acc = (s.acc || 0) + dt * 7;
      while (s.acc >= 1) {
        s.acc -= 1;
        const c = [0x9a948a, 0x8a847a, 0xb0aaa0, 0x7a746c][Math.floor(Math.random() * 4)];
        this.fx.emit(s.x + (Math.random() - 0.5) * 0.6, s.y, s.z + (Math.random() - 0.5) * 0.6, 0.25 + (Math.random() - 0.5) * 0.3, 1.1 + Math.random() * 0.5, (Math.random() - 0.5) * 0.3, c, 0.22 + Math.random() * 0.14, 3.2, -0.12);
      }
    }
  }

  /* ------------------------------ loop ------------------------------ */
  loop(now) {
    requestAnimationFrame(this.loop);
    if (this.walletBusy || this.renderer?.getContext()?.isContextLost?.()) {
      this.last = now;
      return;
    }
    try {
      const raw = now - this.last;
      this.last = now;
      if (!(raw >= 0)) return;
      const rawMs = Math.min(raw, 250);
      this.adaptResolution(rawMs);
      let dt = Math.min(rawMs / 1000, 0.05);
      if (this.hitstopT > 0) {
        this.hitstopT -= dt;
        dt *= 0.08;
      } else if (this.slowT > 0) {
        this.slowT -= dt;
        dt *= this.slowK + (1 - this.slowK) * Math.max(0, 1 - this.slowT / 0.25) * (this.slowT < 0.25 ? 1 : 0);
      }
      this.step(dt, rawMs / 1000);
      if (this.world && this.player && this.started) {
        const px = this.player.pos.x;
        const pz = this.player.pos.z;
        const moved = (px - (this._streamX ?? px)) ** 2 + (pz - (this._streamZ ?? pz)) ** 2;
        if (this._streamX == null || moved > 20 * 20) {
          this.world.parkBeyond(px, pz, this.viewDistance());
          this._streamX = px;
          this._streamZ = pz;
        }
        if (this.world.parked?.length) {
          const budget = this.quality?.id === 'low' ? 10 : this.safeBoot ? 20 : 18;
          this.world.revealAround(px, pz, budget);
        }
      }
      this.renderer.render(this.scene, this.camera);
      // A successfully rendered title or character screen proves the boot worked.
      // Do not treat a normal logout or refresh there as a crash next launch.
      if (this.bootFrames >= 0) {
        this.bootFrames += 1;
        if (this.bootFrames === 1) {
          clearBoot();
          this.bootFrames = -1;
        }
      }

    } catch (err) {
      this.reportFault(err);
    }
  }

  step(dt, rawDt) {
    this.time += dt;
    this.rawDt = rawDt;
    const t = this.time;
    this.input.update();
    this.handleInput();

    // Debug cloudshadow=strong only: freeze lighting for screenshots. Never saved.
    if (this.started && !(this.debug && this.sky?.cloudShadowStrong)) this.sky.setHour(this.sky.hour + rawDt / 50);

    if (!this.campParked) this.player.update(dt);
    updateCaveTravel(this, dt);
    tendCaveDragon(this, dt);
    updateRift(this, dt);
    if (this.player) updateSkillWorld(this, dt);
    this.net.update(dt);
    for (const r of this.remotes.values()) r.update(dt);
    if (!this.campParked) {
      for (const m of this.monsters) {
        m.update(dt);
        if (m.serverAuthoritative) this.mmo?.updateMonster?.(m);
      }
      if (this.monsters.some((m) => m.remove)) {
        for (const m of this.monsters) if (m.remove) m.dispose();
        this.monsters = this.monsters.filter((m) => !m.remove);
      }
    }
    if (this.started) {
      this.checkDiscoveries(dt);
      this.journalT -= dt;
      if (this.journalT <= 0) {
        this.journalT = 0.45;
        // A quest reward that did not fit in the bag is delivered as soon as there is room.
        for (const id of this.journal.owedGear()) this.deliverQuestGear(id);
        const gilan = this.world.gilantre;
        this.applyJournal(this.journal.pulse(this.player.pos, {
          gate: GATE,
          pit: MINE,
          guild: GUILD,
          smithy: this.world.smithy,
          forge: this.world.forge,
          hellspire: this.world.demonKeep,
          dawnspire: this.world.holyKeep,
          warfield: this.world.warfield,
          coliseum: gilan?.arena,
          westwood: gilan?.grove,
          markoak: gilan?.oak,
          reed: gilan?.reed,
        }));
      }
    }
    if (this.started) this.spawner.update(dt);
    if (this.started && this.debug) tickDebugTank(this, dt);
    if (this.started && this.wallet) {
      this.saveAcc += dt;
      if (this.saveAcc > 5) {
        this.saveAcc = 0;
        this.captureHunter();
      }
    }
    if (!this.campParked) {
      for (const n of this.ambient.npcs) n.update(dt, t);
      for (const f of this.ambient.fowl) f.update(dt, t);
      for (const c of this.ambient.cows || []) c.update(dt, t);
      for (const b of this.ambient.butterflies) b.update(dt);
      this.emitVillageSmoke(dt);
    }
    this.updateProjectiles(dt);
    this.updatePickups(dt);

    this.positionCamera(rawDt);
    this.updateHideUniforms();
    this.updateZone(dt);

    const P = this.player;
    this.sky.chill = this.chill;
    this.sky.ember = this.ember;
    if (this.mmo || this.worldView) this.sky.cloudShadowStrong = false;
    this.sky.update(dt, t, this.camera.position.clone().lerp(this.cam.look, 0.5), this.camera);
    this.syncViewDistance();
    if (!this.campParked) {
      this.snowfall.update(dt, t, this.camera.position, this.world.realm === 'cave' || this.world.realm === 'rift' ? 0 : this.chill);
      this.ashfall.update(dt, t, this.camera.position, this.world.realm === 'cave' || this.world.realm === 'rift' ? 0 : this.ember);
    }
    const camp = this.charSelect?.active ? this.charSelect.stage : null;
    const lights = camp ? camp.lightSpots : this.world.realm === 'cave' ? this.world.cave.lights : this.world.realm === 'rift' ? this.world.rift.lights : this.world.lightSpots;
    if (camp) this.sky.assignTorchLights(lights, camp.origin.x, camp.origin.z);
    else this.sky.assignTorchLights(lights, P.pos.x, P.pos.z);
    const night = this.sky.night;
    const scale = this.pxScale * 0.03;
    if (this.fx) this.fx.photoMode = !!this.photoMode;
    this.fx.update(dt, t, P.pos, scale, night, this.forestAmt);
    this.vfx.update(dt, this.camera);
    this.world.haloMat.uniforms.uScale.value = scale;
    this.world.haloMat.uniforms.uNight.value = night;
    if (this.world.lavaHaloMat) this.world.lavaHaloMat.uniforms.uScale.value = scale;
    if (!this.campParked) this.world.update(dt, t);

    this.hud.setClock(this.sky.hour);
    this.refreshHud();
    const wgate = this.world.waygate;
    this.waygateNear = !!(wgate && Math.hypot(P.pos.x - wgate.x, P.pos.z - wgate.z) < 3.6);
    if (this.waygateNear && !this.waygateHinted && this.started) {
      this.waygateHinted = true;
      this.hud.toast('Waygate — press F for a rift, or host with an account', 2400);
    }
    if (this.waygateNear && wgate) {
      const [sx, sy, vis] = this.screenOf(wgate.x, wgate.y + 3.5, wgate.z, true);
      const label = this.net.role ? `Waygate<small>${this.net.code} · ${this.net.count}/6</small>` : 'Waygate<small>F · rift or friends</small>';
      this.hud.plate('waygate', label);
      this.hud.placePlate('waygate', sx, sy, vis, { dist: Math.hypot(P.pos.x - wgate.x, P.pos.z - wgate.z) });
    } else this.hud.removePlate('waygate');
    const chest = this.world.rift?.chest;
    if (this.world.realm === 'rift' && chest?.ready && !chest.looted) {
      const [sx, sy, vis] = this.screenOf(chest.x, chest.y + 1.2, chest.z, true);
      this.hud.plate('riftchest', 'Rift chest<small>F · take the spoils</small>');
      this.hud.placePlate('riftchest', sx, sy, vis, { dist: Math.hypot(P.pos.x - chest.x, P.pos.z - chest.z) });
    } else this.hud.removePlate('riftchest');
    this.updateForge(dt);
    this.updateSmithy(dt);
    this.updateAlchemy(dt);
    this.updateMarket();
    this.updateColosseumBoard();
    this.updateStorage();
    this.updatePortals();
    updateGatherSites(this.world, dt, t, this);
    this.gather.update(dt);
    const near = this.ambient.npcs.some((n) => n.near) || this.waygateNear || this.portalNear || this.forgeNear || this.smithyNear || this.alchemyNear || this.marketNear || this.storageNear || this.colosseumNear || !!this.gather.near || this.gather.active;
    this.hud.setTalkVisible(near && this.input.touch);
    this.hud.layoutInteractPlates();
    this.hud.drawMinimap(this.world, P.pos.x, P.pos.z, P.yaw, this.monsters.filter((m) => !m.dead), this.ambient.npcs, t, this.remotes.values(), this.social);
  }
}

function resumeAfterGlFail() {
  if (typeof window !== 'undefined' && window.__game && !window.__game.glFailed) {
    location.reload();
    return;
  }
  startGame();
}

function showBootGlFail() {
  showGlFailPanel({
    probe: defaultGlProbe,
    onSuccess: resumeAfterGlFail,
  });
}

async function startGame() {
  if (isAdminAccount(readAccount())) {
    location.replace(adminHref());
    return;
  }
  // Start WebGL and world generation immediately alongside the branded intro.
  // The intro is only awaited when the game is ready to dismiss the loading UI.
  const bootSearch = typeof location !== 'undefined' ? location.search : '';
  if (shouldDropOnlineWithoutSession({ search: bootSearch })) {
    dropOnlineWithoutSession({ search: bootSearch });
  }
  if (shouldForceNoGL() || !defaultGlProbe().ok) {
    showBootGlFail();
    return;
  }
  let game;
  try {
    game = new Game();
  } catch (err) {
    showBootGlFail();
    console.error(err);
    return;
  }
  if (game.glFailed) return;
  window.__game = game;
  try {
    installMockWallet();
    attachDebug(game);
    game.setPhotoMode(parsePhotoFlag(location.search));
    game.hud?.setMapLabels(parseMapLabelsFlag(location.search));
    attachSocial(game);
    const q = new URLSearchParams(location.search);
    const liveSearch = location.search;
    const mockOn = q.get('mock') === '1';
    const wakeRaw = q.get('mockwake');
    const mockWake = !!(wakeRaw && wakeRaw !== '0' && wakeRaw !== 'false');
    if (q.get('mmo') === '1' && (shouldMountOnline({ search: liveSearch }) || mockOn || mockWake)) {
      game.worldViewReady = import('./net/worldView.js').then(async (m) => {
        const flags = m.parseMmoFlags(liveSearch);
        const view = await m.init(game.scene, {
          game,
          mock: flags.mockFeed || flags.mockwake,
          search: liveSearch,
          wakeMs: flags.wakeSeconds ? flags.wakeSeconds * 1000 : undefined,
        });
        return { view, flags };
      }).catch((err) => {
        console.warn('world view', err);
        return null;
      });
      game.ensureWorldConnection = async () => {
        const search = typeof location !== 'undefined' ? location.search : liveSearch;
        if (game.mmo || mockOn || mockWake || !shouldMountOnline({ search })) return;
        try {
          const ready = await game.worldViewReady;
          if (!ready || ready.flags.mock || ready.flags.mockwake) return;
          const { attachMmo } = await import('./net/mmo.js');
          attachMmo(game, ready.view, { search });
        } catch (err) {
          console.warn('world connection', err);
        }
      };
    }
  } catch {
    /* query parsing failed; stay offline */
  }
  game.load().catch((e) => {
    console.error(e);
    if (isWebGLFailure(e)) {
      showBootGlFail();
      return;
    }
    document.getElementById('load-text').textContent = 'Failed to load: ' + e.message;
  });
}

if (!sendingToLedger && !glDeadAtBoot) {
  runLegacySaveBridge().then((result) => {
    if (result === 'away') return;
    startGame();
  }).catch((e) => {
    console.warn('save bridge', e);
    startGame();
  });
}

export { lerp, GUILD };
