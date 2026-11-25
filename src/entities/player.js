import * as THREE from 'three';
import { buildHumanoid, buildHeld, S } from './humanoid.js';
import { DUAL_KINDS, TALL_KINDS, gripRoll, placeSheath, swingRoll, bendBowString } from './weaponModels.js';
import { clamp, lerp } from '../engine/voxel.js';
import { WATER_Y, ZONE } from '../world/terrain.js';
import { WeaponTrail } from '../engine/trail.js';
import { SpringSet } from '../engine/motion.js';
import { skillMods } from '../systems/skillcast.js';
import { SKILLFX, meleeSwing } from '../systems/skillfx.js';
import { weaponFamily, isTwoHandedFamily } from './weaponCombat.js';
import { comboStep, sampleStep, stepLunge } from './attackCombos.js';

const R = 0.32;
const TAU = Math.PI * 2;

function angDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}
function ease(t) {
  return t * t * (3 - 2 * t);
}

export class Player {
  constructor(game) {
    this.game = game;
    this.model = buildHumanoid();
    this.obj = new THREE.Group();
    this.pivot = new THREE.Group();
    this.pivot.position.y = 0.55;
    this.model.root.position.y = -0.55;
    this.pivot.add(this.model.root);
    this.obj.add(this.pivot);
    game.scene.add(this.obj);

    this.shadowBlob = null;
    // No selection/ground ring: the hunter's feet and soft shadow define its ground contact.
    this.groundRing = null;
    this._modelReady = false;

    this.pos = new THREE.Vector3(72, 3, 72.5);
    this.vel = new THREE.Vector3();
    this.vy = 0;
    this.yaw = 0;
    this.maxHp = 20;
    this.reduction = 0;
    this.armorKey = '{}';
    this.hp = 20;
    this.maxStamina = 100;
    this.stamina = 100;
    this.maxMana = 50;
    this.mana = 32;
    this.fury = 100;

    this.state = 'idle';
    this.stateT = 0;
    this.stateDur = 0;
    this.combo = 0;
    this.comboT = 0;
    this.attackHit = false;
    this.attackItem = null;
    this.attackStep = null;
    this.attackHitFrac = 0.5;
    this.bufferedAttack = null;
    this.atkPose = {};
    this.cycle = 0;
    this.moveAmt = 0;
    this.speed = 0;
    this.invuln = 0;
    this.chillT = 0;
    this.hurtT = 0;
    this.knock = new THREE.Vector3();
    this.stamDelay = 0;
    this.shielding = false;
    this.rollDir = new THREE.Vector3(0, 0, 1);
    this.dead = false;
    this.wading = false;
    this.aimYaw = 0;
    this.heldKind = null;
    this.sheathKind = null;
    this.sipping = false;
    this.sipFrom = null;
    this.idleArm = 0;
    this.torchLight = new THREE.PointLight(0xffa850, 0, 10, 1.6);
    this.torchLight.position.set(0, 1.6, 0.4);
    this.obj.add(this.torchLight);
    this.mv = new THREE.Vector3();
    this.accSm = 0;
    this.yawRate = 0;
    this.footIdx = 0;
    this.rollPuff = 0;
    this.deadFx = false;
    this.bank = 0;
    this.trail = new WeaponTrail(game.scene);
    this.tA = new THREE.Vector3();
    this.tB = new THREE.Vector3();
    this.cds = {};
    this.stillT = 0;
    this.bulwarkT = 0;
    this.warcryT = 0;
    this.packT = 0;
    this.leapT = 0;
    this.leapArm = false;
    this.leapLand = false;
    this.leapPower = 14;
    this.leapRadius = 2.4;
    this.leapDir = new THREE.Vector3(0, 0, 1);
    this.castT = 0;
    this.castAnim = '';
    this.ironHits = 0;
    this.ironT = 0;
    this.setHeld('blade');
    this.syncObj();
  }

  /** Body, hair and tunic picked when the character was made. */
  setLook(opts) {
    this.lookOpts = opts || {};
    this.armorKey = null;
    this.setArmor(this.armorWorn || {});
  }

  setArmor(look) {
    const key = JSON.stringify(look || {});
    this.armorWorn = look || {};
    if (this.armorKey === key) return;
    this.armorKey = key;
    const old = this.model;
    const next = buildHumanoid({ ...(this.lookOpts || {}), armor: look || {} });
    next.root.position.copy(old.root.position);
    this.pivot.remove(old.root);
    old.root.traverse((o) => {
      if (o.isMesh && o.geometry) o.geometry.dispose();
    });
    this.model = next;
    this.pivot.add(next.root);
    this.heldKind = null;
    const kind = this.wantHeld;
    this.setHeld(kind);
    this.syncSheath();
  }

  /** Equipped weapon to carry on the back whenever it is not in the hand. */
  setSheath(kind) {
    this.sheathKind = kind || null;
    this.syncSheath();
  }

  syncSheath() {
    const slot = this.model.backSlot;
    if (!slot) return;
    while (slot.children.length) slot.remove(slot.children[0]);
    const kind = this.sheathKind;
    if (!kind || kind === this.heldKind) return;
    const g = buildHeld(kind);
    g.traverse((o) => (o.castShadow = true));
    placeSheath(g, kind);
    slot.add(g);
  }

  /** Put the equipped weapon back in the hand and restart the sheath timer. */
  drawWeapon() {
    if (!this.wantHeld || !this.sheathKind || this.wantHeld !== this.sheathKind) return;
    this.idleArm = 0;
    if (this.heldKind !== this.wantHeld) this.showHeld(this.wantHeld);
  }

  /** After five quiet seconds the equipped weapon returns to the back. */
  tickSheath(dt) {
    const weapon = this.wantHeld;
    if (!this.sheathKind || weapon !== this.sheathKind) {
      this.idleArm = 0;
      return;
    }
    if (this.state === 'attack' || this.state === 'use') {
      this.idleArm = 0;
      if (this.state === 'attack' && this.heldKind !== weapon) this.showHeld(weapon);
      return;
    }
    if (this.shielding) return;
    this.idleArm += dt;
    if (this.idleArm >= 5 && this.heldKind) this.showHeld(null);
  }

  setHeld(kind) {
    if (kind === 'blade' && this.sheathKind && this.sheathKind !== 'blade') kind = this.sheathKind;
    this.wantHeld = kind;
    this.idleArm = 0;
    this.showHeld(kind);
  }

  showHeld(kind) {
    if (this.heldKind === kind) {
      if (!this.sipping) this.syncSheath();
      return;
    }
    this.heldKind = kind;
    const slot = this.model.heldSlot;
    while (slot.children.length) slot.remove(slot.children[0]);
    if (kind) {
      const g = buildHeld(kind);
      g.traverse((o) => (o.castShadow = true));
      // Measure in the model's own frame, before it joins the hand.
      this.gripZ = supportGrip(kind, g);
      this.heldTipZ = gripBox.max.z;
      slot.add(g);
    }
    this.bowStr = kind ? slot.getObjectByName('bowString') || null : null;
    this.nockArrow = null;
    if (this.bowStr) {
      this.nockArrow = buildArrow();
      this.nockArrow.visible = false;
      slot.add(this.nockArrow);
    }
    const off = this.model.offhand;
    if (off) {
      while (off.children.length) off.remove(off.children[0]);
      if (DUAL_KINDS.has(kind)) {
        const twin = buildHeld(kind === 'dual' ? 'blade' : kind);
        twin.scale.setScalar(kind === 'dual' ? 0.82 : 0.95);
        twin.rotation.y = Math.PI;
        off.add(twin);
      }
    }
    if (!this.sipping) this.syncSheath();
  }

  get facing() {
    return new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
  }

  syncObj() {
    this.obj.position.copy(this.pos);
    this.obj.rotation.y = this.yaw;

  }

  /** Frost slows the hunter for a few seconds. */
  chill(t) {
    if (this.dead) return;
    if (!(this.chillT > 0)) this.game.hud.floatText(...this.game.screenOf(this.pos.x, this.pos.y + 2.3, this.pos.z), 'Chilled', 'gold');
    this.chillT = Math.max(this.chillT || 0, t);
  }

  heal(n) {
    this.hp = Math.min(this.maxHp, this.hp + n);
  }

  /** returns true if damage was applied; dir is from attacker toward player */
  hurt(dmg, fromX, fromZ, knock = 4) {
    if (this.dead || this.invuln > 0 || this.state === 'roll') return false;
    const g = this.game;
    const dx = this.pos.x - fromX;
    const dz = this.pos.z - fromZ;
    const d = Math.hypot(dx, dz) || 1;
    const f = this.facing;
    const blocked = this.shielding && this.state !== 'attack' && (f.x * -dx + f.z * -dz) / d > 0.25 && this.stamina > 0;
    if (blocked) {
      this.spend(14 + dmg * 3);
      this.stamDelay = 0.9;
      this.knock.set((dx / d) * knock * 0.5, 0, (dz / d) * knock * 0.5);
      g.fx.impact(this.pos.x + f.x * 0.6, this.pos.y + 1, this.pos.z + f.z * 0.6, -dx / d, -dz / d, [0xffffff, 0xffe27a, 0x9fd8ff], 0.9);
      g.punch(0.12);
      g.audio.block();
      g.hud.floatText(...g.screenOf(this.pos.x, this.pos.y + 1.9, this.pos.z), 'Blocked', 'gold');
      g.shake(0.08);
      this.invuln = 0.15;
      if (this.stamina <= 0) {
        this.stagger(0.6);
        g.hud.toast('Guard broken!', 1200);
      }
      return false;
    }
    const mods = skillMods(g);
    if (this.ironHits > 0 && this.ironT > 0) {
      this.ironHits--;
      dmg = 1;
    } else {
      const dr = Math.min(0.65, this.reduction + (mods.dr || 0) + (this.shielding ? mods.blockDr || 0 : 0) + (this.bulwarkT > 0 ? 0.45 : 0));
      dmg = Math.max(1, Math.round(dmg * (1 - dr)));
    }
    this.hp = Math.max(0, this.hp - dmg);
    this.invuln = 0.9;
    this.hurtT = 0.4;
    const auto = !!g.debug?.autoAttack;
    this.knock.set((dx / d) * (auto ? 0 : knock), 0, (dz / d) * (auto ? 0 : knock));
    g.fx.impact(this.pos.x, this.pos.y + 1.1, this.pos.z, dx / d, dz / d, [0xff4d5a, 0xffa0a8, 0xffffff], 0.22);
    g.fx.burst(this.pos.x, this.pos.y + 1.15, this.pos.z, [0xff4d5a, 0xffa0a8], 3, 1.05, 0.045, 0.22);
    g.punch(auto ? 0.1 : 0.28);
    g.audio.hurt();
    g.hud.hurtFlash();
    g.hud.floatText(...g.screenOf(this.pos.x, this.pos.y + 1.9, this.pos.z), '-' + dmg, 'hurt');
    g.shake(auto ? 0.08 : 0.25);
    g.hitstop(0.07);
    if (this.state === 'gather') g.gather.cancel();
    if (!auto && (this.state === 'attack' || this.state === 'use')) this.setState('idle');
    if (this.hp <= 0) this.die();
    return true;
  }

  stagger(t) {
    this.setState('stagger', t);
  }

  die() {
    this.dead = true;
    this.setState('dead', 9);
    this.deadFx = false;
    this.game.slowmo(0.7, 0.35);
    this.game.onPlayerDeath();
  }

  respawn(x, z) {
    this.dead = false;
    this.hp = this.maxHp;
    this.stamina = this.maxStamina;
    this.pos.set(x, this.game.world.heightAt(x, z), z);
    this.pivot.rotation.set(0, 0, 0);
    this.setState('idle');
    this.invuln = 2;
    this.syncObj();
  }

  setState(s, dur = 0) {
    const leavingDrink = this.sipping && !(s === 'use' && this.state !== 'use');
    if (leavingDrink) this.endSip();
    if (leavingDrink || (this.state === 'use' && s !== 'use')) this.potionDone = false;
    if (s !== 'attack') this.bufferedAttack = null;
    this.state = s;
    this.stateT = 0;
    this.stateDur = dur;
  }

  /** Show the bottle for a drink without forgetting the weapon in hand. */
  beginSip(kind) {
    this.sipping = true;
    this.sipFrom = this.heldKind || null;
    this.showHeld(kind === 'manapotion' ? 'manapotion' : 'potion');
  }

  /** The gulp lands. Safe to call twice. */
  grantDrink() {
    if (this.potionDone) return;
    this.potionDone = true;
    const g = this.game;
    const fx = this.useFx || { heal: 0, mana: 0 };
    if (fx.eat) g.audio.tone(320, 0.06, 'square', 0.1, 120);
    else g.audio.potion();
    if (fx.heal) {
      this.heal(fx.heal);
      g.fx.burst(this.pos.x, this.pos.y + 1.3, this.pos.z, [0xff6a8a, 0xffc0cc, 0xffffff], 14, 1.8, 0.08, 0.9, -1.5, 0.6);
      g.hud.floatText(...g.screenOf(this.pos.x, this.pos.y + 2, this.pos.z), '+' + fx.heal, 'heal');
    }
    if (fx.mana) {
      const before = this.mana;
      this.mana = Math.min(this.maxMana, this.mana + fx.mana);
      const got = Math.round(this.mana - before);
      g.fx.burst(this.pos.x, this.pos.y + 1.3, this.pos.z, [0x4ec8ff, 0xb8f0ff, 0xffffff], 14, 1.8, 0.08, 0.9, -1.5, 0.6);
      g.hud.floatText(...g.screenOf(this.pos.x, this.pos.y + 2.3, this.pos.z), '+' + got, 'mana');
    }
  }

  /** Put back whatever the hand held before the drink. */
  endSip() {
    if (!this.sipping) return;
    this.grantDrink();
    this.sipping = false;
    const back = this.sipFrom;
    this.sipFrom = null;
    const bottle = this.heldKind === 'potion' || this.heldKind === 'manapotion';
    if (bottle) {
      if (this.heldKind !== back) this.showHeld(back);
    } else this.syncSheath();
  }

  spend(n) {
    const used = Math.min(this.stamina, n);
    this.stamina = Math.max(0, this.stamina - n);
    if (used > 0) this.game.gather.train('stamina', used * 0.5);
  }

  beginGather(kind, x, z, face) {
    this.gatherKind = kind;
    this.gatherGo = { x, z };
    this.gatherFace = face;
    this.gatherReady = false;
    this.gAnim = null;
    this.setState('gather', 1e9);
  }

  endGather() {
    if (this.state === 'gather') this.setState('idle');
    this.gatherGo = null;
    this.gatherReady = false;
    this.gAnim = null;
  }

  /** Eat a gathered good from the bag. */
  tryEat(good) {
    if (this.dead || this.state === 'roll' || this.state === 'stagger' || this.state === 'attack' || this.state === 'use') return false;
    if (this.hp >= this.maxHp) {
      this.game.hud.toast('Already at full health', 1200);
      return false;
    }
    if (this.state === 'gather') this.game.gather.cancel();
    this.useFx = { heal: good.heal, mana: 0, eat: true };
    this.setState('use', 0.6);
    return true;
  }

  tryAttack(item) {
    if (this.state === 'gather') this.game.gather.cancel();
    if (this.dead || this.state === 'roll' || this.state === 'stagger') return false;
    if (this.state === 'attack') return this.bufferAttack(item);
    // A drink plays in the free hand. Swinging still uses the weapon already selected.
    if (this.state === 'use' && !(this.sipping && item.kind !== 'use' && item.kind !== 'light' && item.kind !== 'none')) {
      return false;
    }
    if (item.kind === 'use' && this.game.mmo?.pvpMatchId) {
      this.game.hud.toast('Consumables are disabled in the Colosseum', 1400);
      return false;
    }
    if (item.kind === 'use') {
      const heal = item.heal || 0;
      const mana = item.mana || 0;
      if (item.count <= 0) {
        this.game.hud.toast('Out of potions', 1200);
        return false;
      }
      if (heal && !mana && this.hp >= this.maxHp) {
        this.game.hud.toast('Already at full health', 1200);
        return false;
      }
      if (mana && !heal && this.mana >= this.maxMana) {
        this.game.hud.toast('Spirit already full', 1200);
        return false;
      }
      item.count--;
      this.useFx = { heal, mana };
      this.game.progress.setStock(item.id, item.count);
      this.beginSip(item.held);
      this.setState('use', 0.6);
      this.game.itemsChanged();
      return true;
    }
    if (item.kind === 'light' || item.kind === 'none') return false;
    if (item.kind === 'ranged' && !item.proj && !item.spell) {
      if (!this.game.progress.hasArrow()) {
        this.game.hud.toast(this.game.progress.data.armor.quiver ? 'The quiver is empty' : 'Equip a quiver of arrows', 1400);
        return false;
      }
    }
    if (this.game.mmo?.pvpMatchId && (item.kind === 'melee' || item.kind === 'ranged')) {
      if (this.stamina < 3) return false;
      if (item.kind === 'ranged' && !item.proj && !item.spell && !this.game.progress.drawArrow()) return false;
      const range = item.kind === 'ranged' ? 13 : 4.5;
      if (!this.game.mmo.pvpAttackNearest(range)) return false;
      this.beginAttack(item, item.kind === 'melee' && this.comboT > 0 ? (this.combo + 1) % 3 : 0, true);
      return true;
    }
    if (this.stamina < 3) return false;
    this.beginAttack(item, this.comboT > 0 ? (this.combo + 1) % 3 : 0, false);
    return true;
  }

  /**
   * Start one swing. Melee weapons pick the step of their own three-hit
   * combo; each step carries its own tempo, contact frame and footwork.
   */
  beginAttack(item, combo, hitDone) {
    this.drawWeapon();
    this.attackItem = item;
    this.combo = combo;
    this.attackHit = hitDone;
    this.bufferedAttack = null;
    this.spend(item.stam);
    this.stamDelay = 0.7;
    const swing = skillMods(this.game).speed ?? 1;
    const melee = item.kind === 'melee';
    const step = melee || item.kind === 'ranged' ? comboStep(item, item.held || this.heldKind, combo) : null;
    this.attackStep = step;
    this.attackHitFrac = step ? step.hit : clamp((item.hit ?? item.dur * 0.6) / item.dur, 0.05, 0.9);
    this.setState('attack', item.dur * swing * (step ? step.dur : 1));
    this.game.audio.swing(weaponFamily(item, item.held || this.heldKind));
  }

  /** A press during a swing's follow-through is held and chains into the next step. */
  bufferAttack(item) {
    const cur = this.attackItem;
    if (!cur || cur.kind !== 'melee' || item.kind !== 'melee') return false;
    if (this.stateT / Math.max(1e-4, this.stateDur) < this.attackHitFrac * 0.6) return false;
    this.bufferedAttack = item;
    return false;
  }

  tryRoll(dir) {
    if (this.state === 'gather' && !this.dead) this.game.gather.cancel();
    if (this.dead || this.state === 'roll' || this.state === 'stagger' || this.stamina < 18) return false;
    if (this.game.mmo?.pvpMatchId && !this.game.mmo.sendPvp('pvp_roll')) return false;
    this.spend(22);
    this.game.gather.train('agility', 6);
    this.stamDelay = 0.8;
    this.rollDir.copy(dir.lengthSq() > 0.01 ? dir.clone().normalize() : this.facing);
    this.yaw = Math.atan2(this.rollDir.x, this.rollDir.z);
    this.setState('roll', 0.42);
    this.invuln = 0.38;
    this.rollPuff = 0;
    this.game.audio.evade();
    this.game.fx.dust(this.pos.x, this.pos.y, this.pos.z, 7, 1.8);
    return true;
  }

  update(dt) {
    const g = this.game;
    const inp = g.input;
    const world = g.world;
    this.stateT += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    if (this.chillT > 0) {
      this.chillT = Math.max(0, this.chillT - dt);
      if (Math.random() < dt * 14) this.game.fx.emit(this.pos.x + (Math.random() - 0.5) * 0.7, this.pos.y + 0.3 + Math.random() * 1.4, this.pos.z + (Math.random() - 0.5) * 0.7, 0, 0.5, 0, Math.random() < 0.5 ? 0xbfeaff : 0xffffff, 0.07, 0.5, -0.3);
    }
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.comboT = Math.max(0, this.comboT - dt);
    this.stamDelay = Math.max(0, this.stamDelay - dt);
    this.castT = Math.max(0, this.castT - dt);
    this.bulwarkT = Math.max(0, this.bulwarkT - dt);
    this.ironT = Math.max(0, this.ironT - dt);
    if (this.ironT <= 0) this.ironHits = 0;
    this.warcryT = Math.max(0, this.warcryT - dt);
    this.packT = Math.max(0, this.packT - dt);
    for (const k of Object.keys(this.cds)) {
      this.cds[k] -= dt;
      if (this.cds[k] <= 0) delete this.cds[k];
    }

    if (!this.dead) {
      if (this.stamDelay <= 0 && !(this.shielding && this.state === 'idle')) this.stamina = Math.min(this.maxStamina, this.stamina + 34 * dt);
      this.mana = Math.min(this.maxMana, this.mana + 1.6 * dt);
      this.fury = Math.min(100, this.fury + (1.2 + (skillMods(g).furyRegen || 0)) * dt);
    }

    const cy = g.cam.yaw;
    const right = new THREE.Vector3(Math.cos(cy), 0, -Math.sin(cy));
    const fwd = new THREE.Vector3(-Math.sin(cy), 0, -Math.cos(cy));
    const want = new THREE.Vector3();
    if (!this.dead && !g.uiBlocking) want.addScaledVector(right, inp.moveX).addScaledVector(fwd, -inp.moveY);
    const inputMag = Math.min(1, want.length());

    const wantShield = inp.shieldHeld && !this.dead && (this.state === 'idle' || this.state === 'shield') && this.stamina > 4 && !g.uiBlocking;
    this.shielding = wantShield;
    if (wantShield && this.state === 'idle') this.state = 'idle';
    if (this.model.shieldG) this.model.shieldG.visible = this.shielding;
    const dualHeld = DUAL_KINDS.has(this.heldKind);
    const heldFamily = weaponFamily({ kind: 'melee' }, this.heldKind);
    const twoHandHeld = isTwoHandedFamily(heldFamily);
    if (this.model.offhand) this.model.offhand.visible = dualHeld && !this.shielding;
    if (this.model.bookG) this.model.bookG.visible = !dualHeld && !twoHandHeld && !this.shielding;

    let speed = 0;
    const moveDir = new THREE.Vector3();
    const agi = 1 + (g.progress.level('agility') - 1) * 0.003;
    switch (this.state) {
      case 'roll': {
        const t = this.stateT / this.stateDur;
        speed = 9.5 * agi * (1 - t * 0.55);
        moveDir.copy(this.rollDir);
        if (this.stateT >= this.stateDur) this.setState('idle');
        break;
      }
      case 'attack': {
        const it = this.attackItem;
        const step = this.attackStep;
        const t = this.stateT / this.stateDur;
        const hitT = this.attackHitFrac;
        if (!this.attackHit && t >= hitT) {
          this.attackHit = true;
          this.doAttackHit(it);
        }
        // Footwork belongs to the step: jabs skip in, finishers drive through.
        const lunge = step ? stepLunge(step, t) * (inputMag > 0.1 ? 1.1 : 1) : 0;
        speed = lunge + inputMag * 1.3;
        moveDir.copy(this.facing);
        if (lunge < 0.05 && inputMag > 0.1) {
          moveDir.copy(want).normalize();
          speed = inputMag * (t > hitT ? 1.6 : 1.1);
        }
        const chain = this.bufferedAttack && this.attackHit && step && t >= step.cancel;
        if (chain || this.stateT >= this.stateDur) {
          this.comboT = step ? step.window : 0.45;
          const next = this.bufferedAttack;
          this.bufferedAttack = null;
          this.setState('idle');
          if (next) {
            this.game.faceForAction?.();
            this.tryAttack(next);
          }
        }
        break;
      }
      case 'use': {
        speed = inputMag * 1.4;
        moveDir.copy(want);
        if (!this.potionDone && this.stateT > 0.3) this.grantDrink();
        if (this.stateT >= this.stateDur) this.setState('idle');
        break;
      }
      case 'gather': {
        if (inputMag > 0.35 || this.hurtT > 0.3) {
          g.gather.cancel();
          break;
        }
        const go = this.gatherGo;
        if (go && !this.gatherReady) {
          const dx = go.x - this.pos.x;
          const dz = go.z - this.pos.z;
          const d = Math.hypot(dx, dz);
          if (d > 0.16 && this.stateT < 4.5) {
            moveDir.set(dx / d, 0, dz / d);
            speed = Math.min(3.8, 0.9 + d * 5);
          } else this.gatherReady = true;
        }
        break;
      }
      case 'stagger':
        if (this.stateT >= this.stateDur) this.setState('idle');
        break;
      case 'dead':
        break;
      default: {
        if (inputMag > 0.05) {
          moveDir.copy(want).normalize();
          speed = 4.7 * agi * inputMag * (this.shielding ? 0.5 : 1);
        }
      }
    }

    if (this.wading && this.state !== 'roll') speed *= 0.65;
    if (this.chillT > 0 && this.state !== 'roll') speed *= 0.6;
    if (this.leapT > 0) {
      this.leapT -= dt;
      speed = 13;
      moveDir.copy(this.leapDir);
    }

    const prevAlong = this.vel.x * Math.sin(this.yaw) + this.vel.z * Math.cos(this.yaw);
    const rate = this.state === 'roll' ? 45 : this.state === 'attack' ? 26 : speed > 0 ? 15 : 12;
    this.mv.x += (moveDir.x * speed - this.mv.x) * Math.min(1, dt * rate);
    this.mv.z += (moveDir.z * speed - this.mv.z) * Math.min(1, dt * rate);
    this.vel.copy(this.mv).add(this.knock);
    this.knock.multiplyScalar(Math.max(0, 1 - dt * 9));
    this.moveBy(this.vel.x * dt, this.vel.z * dt);
    this.speed = Math.hypot(this.vel.x, this.vel.z);
    if (!this.dead && this.speed < 0.35 && this.state !== 'roll') this.stillT = Math.min(2.5, this.stillT + dt);
    else this.stillT = 0;
    if (dt > 1e-4) {
      const along = this.vel.x * Math.sin(this.yaw) + this.vel.z * Math.cos(this.yaw);
      this.accSm += ((along - prevAlong) / dt - this.accSm) * Math.min(1, dt * 9);
    }
    const yawBefore = this.yaw;

    if (!this.dead && this.state !== 'roll' && this.state !== 'attack') {
      let target = this.yaw;
      if (this.state === 'gather') {
        if (this.gatherReady) target = this.gatherFace;
        else if (speed > 0.2) target = Math.atan2(moveDir.x, moveDir.z);
      } else if (this.shielding || (inp.attackHeld && !this.game.input.touch)) {
        if (this.aimDir) target = Math.atan2(this.aimDir.x, this.aimDir.z);
      } else if (inputMag > 0.1) target = Math.atan2(moveDir.x, moveDir.z);
      this.yaw += angDiff(this.yaw, target) * Math.min(1, dt * 16);
    }
    if (dt > 1e-4) this.yawRate += (clamp(angDiff(yawBefore, this.yaw) / dt, -14, 14) - this.yawRate) * Math.min(1, dt * 8);

    this.updateGround(dt);

    if (this.state === 'idle' && this.speed > 3.4 && !this.wading) {
      this.runAcc = (this.runAcc || 0) + this.speed * dt;
      if (this.runAcc >= 12) {
        this.runAcc -= 12;
        g.gather.train('agility', 2);
      }
    }
    const moving = this.speed > 0.4 && this.state !== 'dead';
    this.moveAmt = lerp(this.moveAmt, moving ? clamp(this.speed / 4.7, 0.3, 1.4) : 0, Math.min(1, dt * 12));
    this.cycle += dt * (this.speed * 2.2 + 0.01);
    const foot = Math.floor(this.cycle / Math.PI);
    if (foot !== this.footIdx) {
      this.footIdx = foot;
      if (moving && (this.state === 'idle' || this.state === 'use' || this.state === 'gather') && this.speed > 1.2 && !this.wading) {
        g.audio.step();
        if (this.speed > 3) g.fx.dust(this.pos.x - Math.sin(this.yaw) * 0.1, this.pos.y, this.pos.z - Math.cos(this.yaw) * 0.1, 2, 0.7);
      }
    }
    if (this.state === 'idle' && this.accSm < -22 && this.speed > 2.4 && !this.wading && Math.random() < dt * 40) {
      g.fx.dust(this.pos.x, this.pos.y, this.pos.z, 2, 1.2);
    }
    if (this.state === 'roll') {
      this.rollPuff -= dt;
      if (this.rollPuff <= 0) {
        this.rollPuff = 0.06;
        g.fx.dust(this.pos.x, this.pos.y, this.pos.z, 2, 0.8);
      }
    }

    this.tickSheath(dt);
    this.pose(dt);
    if (this.game.started) this._modelReady = true;
    this.syncObj();
    this.updateTrail(dt);

    if (this.hurtT > 0) {
      const k = Math.min(1, this.hurtT / 0.4);
      this.model.mat.emissive.setRGB(0.26 * k, 0.04 * k, 0.03 * k);
    } else this.model.mat.emissive.setRGB(0, 0, 0);
    if (this.invuln > 0 && this.hurtT <= 0 && this.state !== 'roll') {
      this.obj.visible = Math.floor(this.invuln * 18) % 2 === 0 || this.invuln > 1.4;
    } else this.obj.visible = true;

    const torchOn = g.items[g.sel].id === 'torch';
    this.torchLight.intensity = torchOn ? 2.4 + Math.sin(g.time * 14) * 0.25 : 0;
  }

  moveBy(dx, dz) {
    const w = this.game.world;
    const tryAxis = (nx, nz) => {
      const pts = [
        [nx, nz],
        [nx + R, nz],
        [nx - R, nz],
        [nx, nz + R],
        [nx, nz - R],
      ];
      for (const [x, z] of pts) if (!w.canStep(x, z, this.pos.y)) return false;
      return true;
    };
    const nx = this.pos.x + dx;
    const nz = this.pos.z + dz;
    if (tryAxis(nx, nz)) {
      this.pos.x = nx;
      this.pos.z = nz;
    } else if (tryAxis(nx, this.pos.z)) this.pos.x = nx;
    else if (tryAxis(this.pos.x, nz)) this.pos.z = nz;
    w.resolve(this.pos, R);
  }

  updateGround(dt) {
    const w = this.game.world;
    const h = w.heightAt(this.pos.x, this.pos.z);
    this.wading = h < WATER_Y;
    let target = h;
    if (this.wading) target = Math.max(h, WATER_Y - 0.35);
    if (target > this.pos.y) {
      this.pos.y += (target - this.pos.y) * Math.min(1, dt * 20);
      if (target - this.pos.y < 0.01) this.pos.y = target;
      this.vy = 0;
    } else {
      this.vy -= 26 * dt;
      this.pos.y += this.vy * dt;
      if (this.pos.y <= target) {
        if (this.leapArm && this.vy < 0) {
          this.leapArm = false;
          this.leapT = 0;
          this.leapLand = true;
        }
        if (this.vy < -4.5) this.landT = clamp(-this.vy * 0.012, 0.04, 0.16);
        if (this.vy < -7) {
          this.game.fx.burst(this.pos.x, target + 0.1, this.pos.z, [0xd9c9a0, 0x9bd06a], 8, 2, 0.1, 0.4);
        }
        this.pos.y = target;
        this.vy = 0;
      }
    }
    if (this.wading && this.speed > 1 && Math.random() < dt * 14) {
      this.game.fx.ring(this.pos.x, WATER_Y + 0.05, this.pos.z, 0xbfeaff, 6, 1.3, 0.07, 0.45);
    }
  }

  doAttackHit(it) {
    const g = this.game;
    const f = this.facing;
    const mods = skillMods(g);
    if (it.kind === 'melee') {
      const step = this.attackStep;
      const mult = step?.dmg ?? (this.combo === 2 ? 1.5 : 1);
      const knockMult = step?.knock ?? (this.combo === 2 ? 1.5 : 1);
      const reach = it.reach * (step?.reach ?? (this.combo === 2 ? 1.2 : 1));
      const around = step?.arc === 'full';
      meleeSwing(g, this, it, this.combo, reach, step?.fx);
      let hits = 0;
      for (const m of g.monsters) {
        if (m.dead || (m.hover || 0) > 2.5) continue;
        const dx = m.x - this.pos.x;
        const dz = m.z - this.pos.z;
        const d = Math.hypot(dx, dz);
        if (d > reach + m.radius) continue;
        const dot = (dx * f.x + dz * f.z) / (d || 1);
        if (!around && dot < Math.cos(it.arc / 2) && d > m.radius + 0.4) continue;
        const crit = Math.random() < 0.12 + (mods.crit || 0);
        const dmgOut = Math.round(it.dmg * mult * (crit ? 1.8 : 1) * (0.9 + Math.random() * 0.25) * mods.melee);
        g.strikeMonster(m, dmgOut, dx / (d || 1), dz / (d || 1), it.knock * (mods.knock || 1) * knockMult, crit);
        if (!m.serverAuthoritative) g.gather.train('strength', 2 + dmgOut * 0.8);
        if (mods.poison && !m.dead) m.afflict('poison', 4 + (mods.poisonTime || 0), 4 + (mods.poisonBonus || 0));
        hits++;
      }
      if (this.combo === 2) {
        const sx = this.pos.x + f.x * reach * 0.75;
        const sz = this.pos.z + f.z * reach * 0.75;
        g.fx.shockwave(sx, this.pos.y, sz, 0xd9c9a0, 1.6);
        g.shake(0.2);
        g.punch(0.2);
      }
      if (hits) {
        g.hitstop(0.05 + Math.min(0.06, hits * 0.02) + (this.combo === 2 ? 0.04 : 0));
        g.shake(this.combo === 2 ? 0.3 : 0.18);
        g.punch(this.combo === 2 ? 0.34 : 0.16);
        this.fury = Math.min(100, this.fury + Math.round(7 * mods.furyGain) * hits);
        g.audio.hit(weaponFamily(it, it.held || this.heldKind));
      }
    } else if (it.kind === 'ranged') {
      const focus = it.style === 'staff' || it.style === 'wand' || it.style === 'tome';
      let dmg = it.dmg + (it.style === 'crossbow' ? mods.flatRanged || 0 : 0);
      let aimed = false;
      if (mods.deadeye && this.stillT > 0.7 && !focus) {
        dmg = Math.round(dmg * 1.8);
        aimed = true;
        this.stillT = 0;
        g.hud.floatText(...g.screenOf(this.pos.x, this.pos.y + 2.2, this.pos.z), 'Aimed', 'crit');
      }
      const pierce = (it.style === 'crossbow' && mods.pierce) || it.proj === 'crescent';
      if (it.proj) {
        const sp = it.proj === 'gloom' ? 12 : it.proj === 'bolt' ? 16 : 18;
        const lava = it.proj === 'lavabolt';
        const mz = this.muzzle(f, 0.6, 1.2);
        g.spawnProjectile({ owner: 'player', kind: it.proj, spell: focus, x: mz.x, y: mz.y, z: mz.z, vx: mz.dx * (lava ? sp * 0.72 : sp), vz: mz.dz * (lava ? sp * 0.72 : sp), vy: lava ? 4.2 : 0, gravity: lava ? 14 : 0, dmg, life: it.proj === 'gloom' ? 2.6 : lava ? 1.8 : 1.5, r: lava ? 0.58 : 0.5, pierce, homing: it.proj === 'gloom' ? 3.2 : 0, crit: aimed });
        g.audio.release(weaponFamily(it, it.held || this.heldKind));
      } else {
        if (!g.progress.drawArrow()) return;
        const mz = this.muzzle(f, 0.5, 1.15);
        g.spawnProjectile({ owner: 'player', kind: 'arrow', x: mz.x, y: mz.y, z: mz.z, vx: mz.dx * (it.style === 'crossbow' ? 26 : 20), vz: mz.dz * (it.style === 'crossbow' ? 26 : 20), dmg, life: 1.3, r: 0.35, crit: aimed, pierce });
        g.audio.release(weaponFamily(it, it.held || this.heldKind));
      }
    } else if (it.kind === 'throw') {
      if (it.count <= 0) return;
      it.count--;
      g.itemsChanged();
      g.spawnProjectile({ owner: 'player', kind: 'stone', x: this.pos.x + f.x * 0.5, y: this.pos.y + 1.3, z: this.pos.z + f.z * 0.5, vx: f.x * 12, vz: f.z * 12, vy: 3.5, dmg: it.dmg, life: 1.4, r: 0.4, gravity: 12 });
    }
  }

  /**
   * Where a shot leaves the weapon: the arrow rest of a bow, the nose of a
   * crossbow, the head of a staff or the tip of a wand. The flight converges on
   * the hunter's line of fire, so aim at range is exactly as before. Falls back
   * to the old chest point if the pose is unusable.
   */
  muzzle(f, ahead, height) {
    const out = MUZZLE;
    out.x = this.pos.x + f.x * ahead;
    out.y = this.pos.y + height;
    out.z = this.pos.z + f.z * ahead;
    out.dx = f.x;
    out.dz = f.z;
    const m = this.model;
    if (!this.heldKind || !m?.heldSlot) return out;
    this.obj.updateMatrixWorld(true);
    const p = this.bowStr ? RIG_V1.set(0.03, NOCK_RISE, 0.14) : RIG_V1.set(0, 0, (this.heldTipZ || 0.5) * 0.96);
    m.heldSlot.localToWorld(p);
    const rx = p.x - this.pos.x;
    const rz = p.z - this.pos.z;
    const along = rx * f.x + rz * f.z;
    const side = Math.abs(rx * f.z - rz * f.x);
    const up = p.y - this.pos.y;
    if (!Number.isFinite(along + side + up) || along < 0.15 || along > 2.6 || side > 0.8 || up < 0.5 || up > 2.2) return out;
    out.x = p.x;
    out.y = p.y;
    out.z = p.z;
    const tx = this.pos.x + f.x * 14 - p.x;
    const tz = this.pos.z + f.z * 14 - p.z;
    const d = Math.hypot(tx, tz) || 1;
    out.dx = tx / d;
    out.dz = tz / d;
    return out;
  }

  castBolt() {
    const g = this.game;
    const cost = Math.max(1, Math.round(8 * (skillMods(g).manaCost ?? 1)));
    if (this.dead || this.mana < cost || this.state === 'roll' || this.state === 'stagger') return;
    this.mana -= cost;
    const f = this.facing;
    this.setState('use', 0.32);
    this.potionDone = true;
    g.audio.bolt();
    g.spawnProjectile({ owner: 'player', kind: 'bolt', spell: true, x: this.pos.x + f.x * 0.6, y: this.pos.y + 1.15, z: this.pos.z + f.z * 0.6, vx: f.x * 15, vz: f.z * 15, dmg: 11, life: 1.2, r: 0.5, pierce: true });
  }

  playCast(kind, dur = 0.34) {
    if (this.dead) return;
    this.drawWeapon();
    this.castAnim = kind || 'cast';
    this.castT = dur;
    if (this.state !== 'roll' && this.state !== 'attack' && this.state !== 'dead' && this.state !== 'stagger') {
      this.setState('use', Math.max(0.24, Math.min(0.4, dur)));
      this.potionDone = true;
    }
  }

  castFury() {
    const g = this.game;
    if (this.dead || this.fury < 100 || this.state === 'roll' || this.state === 'stagger') return;
    this.fury = 0;
    this.setState('use', 0.5);
    this.potionDone = true;
    this.invuln = 0.6;
    g.audio.fury();
    g.shake(0.6);
    g.hitstop(0.1);
    SKILLFX.warcry(g, this, 5.5, 0);
    SKILLFX.whirlwind(g, this, 4.6, 0xffb347, 0xfff0b0);
    for (const m of g.monsters) {
      if (m.dead) continue;
      const dx = m.x - this.pos.x;
      const dz = m.z - this.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 5.5) g.strikeMonster(m, 22, dx / (d || 1), dz / (d || 1), 11, true);
    }
  }

  /**
   * Level-held weapons (spears) point along the hunter's facing in body space,
   * whatever the torso and arms are doing, so a thrust drives straight down the
   * line while the arms only supply the reach.
   */
  levelWeapon() {
    const w = this.levelW || 0;
    if (w < 0.01) return;
    const m = this.model;
    this.pivot.updateMatrixWorld(true);
    const parent = m.hand.getWorldQuaternion(LV_Q1).invert();
    const want = this.pivot.getWorldQuaternion(LV_Q2).multiply(LV_Q3.setFromEuler(LV_E.set(this.levelPitch || 0, 0, gripRoll(this.heldKind) + (this.levelRoll || 0))));
    m.heldSlot.quaternion.slerp(parent.multiply(want), Math.min(1, w));
  }

  /**
   * Hand placement after the keyed pose: the weapon arm aims, the weapon is
   * aligned to the line of fire, the support hand is pinned to the second grip
   * and an archer's draw hand is pinned to the string. Every solve is blended
   * by a weight so it eases in and out without popping.
   */
  armRig(dt) {
    const m = this.model;
    const fam = weaponFamily({ kind: 'melee' }, this.heldKind);
    const step = this.state === 'attack' ? this.attackStep : null;
    const ranged = !!step && this.attackItem?.kind === 'ranged';
    const k = step ? this.atkPose : null;
    const busy = this.state === 'roll' || this.state === 'dead' || this.state === 'stagger' || this.state === 'use' || this.state === 'gather';
    const free = !busy && !this.shielding && !this.sipping && !(this.castT > 0) && !this.leapArm && !(this.leapT > 0) && !(this.hurtT > 0.15);
    let want = 0;
    if (free) {
      if (ranged) want = clamp(k.two || 0, 0, 1);
      else if (SUPPORT_FAMILIES.has(fam) && (this.state !== 'attack' || this.attackItem?.kind === 'melee')) want = 1;
    }
    this.ikW = (this.ikW || 0) + (want - (this.ikW || 0)) * Math.min(1, dt * (ranged ? 24 : 14));
    const aimW = free && ranged ? clamp(k.aim || 0, 0, 1) : 0;
    const drawW = free && ranged ? clamp(k.dw || 0, 0, 1) : 0;
    this.pivot.updateMatrixWorld(true);
    if (aimW > 0.01) this.aimArm(step, aimW);
    if (this.ikW > 0.01) this.pullLeadArm();
    this.levelWeapon();
    if (this.ikW > 0.01) this.placeSupportHand(this.ikW);
    if (drawW > 0.01) this.placeDrawHand(k, step, drawW);
    this.updateBowRig(ranged ? k : null, step, drawW);
  }

  /** Bring the weapon arm onto the line of fire (straight arm), or the grip to a point by the shoulder. */
  aimArm(step, w) {
    const m = this.model;
    const L1 = Math.abs(m.elbowR.position.y);
    const L2 = Math.abs(m.hand.position.y);
    const t = RIG_V1;
    if (step.aimMode === 'pt') {
      const [x, y, z] = step.aimPt || [0.1, 0, 0.3];
      m.armR.getWorldPosition(t);
      this.pivot.worldToLocal(t);
      t.x -= x * Math.sign(m.armR.position.x || 1);
      t.y += y;
      t.z += z;
      this.pivot.localToWorld(t);
      m.upper.worldToLocal(t);
      t.sub(m.armR.position);
    } else {
      // Straight down the facing, a touch above level, expressed in the torso's frame.
      const up = m.upper.getWorldQuaternion(RIG_Q1).invert();
      t.set(0, 0.06, 1).applyQuaternion(this.pivot.getWorldQuaternion(RIG_Q2)).applyQuaternion(up).normalize().multiplyScalar(L1 + L2);
    }
    applyArm(m.armR, m.elbowR, solveArm(t, L1, L2), w);
    m.armR.updateMatrixWorld(true);
  }

  /** Weapon grip point in the torso's frame, relative to the left shoulder. */
  gripFromLeftShoulder(out, z) {
    const m = this.model;
    for (const o of [m.heldSlot, m.hand, m.elbowR, m.armR]) o.updateMatrix();
    out.set(0, 0, z).applyMatrix4(m.heldSlot.matrix).applyMatrix4(m.hand.matrix).applyMatrix4(m.elbowR.matrix).applyMatrix4(m.armR.matrix);
    return out.sub(m.armL.position);
  }

  /** Draw the lead arm across the chest just far enough for the support hand to reach the grip. */
  pullLeadArm() {
    const m = this.model;
    const reach = (Math.abs(m.elbowL.position.y) + Math.abs(m.offhand.position.y)) * 0.97;
    const gz = this.gripZ ?? -0.18;
    const baseZ = m.armR.rotation.z;
    const need = (off) => {
      m.armR.rotation.z = baseZ - off;
      return this.gripFromLeftShoulder(RIG_V2, gz).length();
    };
    let off = 0;
    if (need(0) > reach) {
      let lo = 0;
      let hi = 1.1;
      if (need(hi) > reach) off = hi;
      else {
        for (let i = 0; i < 7; i++) {
          const mid = (lo + hi) / 2;
          if (need(mid) > reach) lo = mid;
          else hi = mid;
        }
        off = hi;
      }
    }
    m.armR.rotation.z = baseZ - off * this.ikW;
    m.armR.updateMatrixWorld(true);
  }

  /**
   * Level-held weapons (spears, aimed bows, crossbows, casting wands) point
   * along the hunter's facing in body space, whatever the torso and arms are
   * doing, so the weapon stays on the line while the arms supply the motion.
   */
  levelWeapon() {
    const w = this.levelW || 0;
    if (w < 0.01) return;
    const m = this.model;
    m.hand.updateMatrixWorld(true);
    const parent = m.hand.getWorldQuaternion(LV_Q1).invert();
    const want = this.pivot.getWorldQuaternion(LV_Q2).multiply(LV_Q3.setFromEuler(LV_E.set(this.levelPitch || 0, 0, gripRoll(this.heldKind) + (this.levelRoll || 0))));
    m.heldSlot.quaternion.slerp(parent.multiply(want), Math.min(1, w));
    m.heldSlot.updateMatrixWorld(true);
  }

  /** Pin the left hand to the weapon's second grip. */
  placeSupportHand(w) {
    const m = this.model;
    const L1 = Math.abs(m.elbowL.position.y);
    const L2 = Math.abs(m.offhand.position.y);
    const t = this.gripFromLeftShoulder(RIG_V2, this.gripZ ?? -0.18);
    applyArm(m.armL, m.elbowL, solveArm(t, L1, L2), w);
  }

  /** Pin the draw hand to the bowstring, drawn back `pull` of the bow's draw length. */
  placeDrawHand(k, step, w) {
    const m = this.model;
    const s = this.bowStr;
    if (!s) return;
    const [tx, ty, tz] = s.userData.top;
    const [, by] = s.userData.bottom;
    // The nock sits above the grip, so the anchor lands at the chin, above the bow arm.
    const t = RIG_V2.set(tx, (ty + by) / 2 + NOCK_RISE, tz - clamp(k.pull || 0, 0, 1.1) * (step.drawLen || 0.55));
    m.heldSlot.localToWorld(t);
    m.upper.worldToLocal(t);
    t.sub(m.armL.position);
    applyArm(m.armL, m.elbowL, solveArm(t, Math.abs(m.elbowL.position.y), Math.abs(m.offhand.position.y)), w);
  }

  /** Bend the string to the draw hand and keep a nocked arrow on it until the release. */
  updateBowRig(k, step, drawW) {
    const s = this.bowStr;
    if (!s) return;
    const m = this.model;
    const [tx, ty, tz] = s.userData.top;
    const [, by] = s.userData.bottom;
    const mid = RIG_V3.set(tx, (ty + by) / 2 + NOCK_RISE, tz);
    let nock = null;
    if (k && drawW > 0.05) {
      m.armL.updateMatrixWorld(true);
      const hand = m.offhand.getWorldPosition(RIG_V1);
      m.heldSlot.worldToLocal(hand);
      // The string never pushes forward of rest; it follows the hand back and sideways.
      hand.z = Math.min(hand.z, tz);
      nock = mid.clone().lerp(hand, clamp(drawW, 0, 1));
    }
    bendBowString(s, nock);
    const arrow = this.nockArrow;
    if (!arrow) return;
    const show = !!k && (k.arw || 0) > 0.5;
    arrow.visible = show;
    if (!show) return;
    const tail = nock || mid;
    arrow.position.copy(tail);
    // The shaft runs from the nock to the arrow rest just above the grip, on the riser's side.
    const dir = RIG_V1.set(0.03 - tail.x, mid.y - 0.02 - tail.y, 0.05 - tail.z).normalize();
    arrow.quaternion.setFromUnitVectors(RIG_Z, dir);
  }

  updateTrail(dt) {
    const tr = this.trail;
    const it = this.attackItem;
    if (this.state === 'attack' && it && it.kind === 'melee' && !this.dead) {
      const tt = this.stateT / this.stateDur;
      const hitT = this.attackHitFrac;
      const spin = this.attackStep?.fx?.spin;
      if (tt > hitT - (spin ? 0.2 : 0.1) && tt < hitT + (1 - hitT) * (spin ? 0.4 : 0.3)) {
        const spec = TRAIL_SPEC[this.heldKind] || TRAIL_SPEC.blade;
        tr.setStyle(this.combo === 2 ? spec.hot : spec.col, 0.22);
        this.obj.updateMatrixWorld(true);
        this.tA.set(spec.b[0], spec.b[1], spec.b[2]);
        this.tB.set(spec.t[0], spec.t[1], spec.t[2]);
        this.model.heldSlot.localToWorld(this.tA);
        this.model.heldSlot.localToWorld(this.tB);
        tr.add(this.tA, this.tB);
      }
    }
    tr.update(dt);
  }

  pose(dt) {
    const m = this.model;
    const t = this.game.time;
    const walk = Math.sin(this.cycle);
    const cs = Math.cos(this.cycle);
    const mv = this.moveAmt;
    const run = Math.min(1.1, mv);
    const heldBlade = BLADES.has(this.heldKind);
    const heldFamily = weaponFamily({ kind: 'melee' }, this.heldKind);
    const twoHandHeld = isTwoHandedFamily(heldFamily);
    let armR = heldBlade ? -0.85 : -0.25;
    let armL = 0;
    let armRz = 0;
    let armLz = 0;
    let torsoYaw = 0;
    let lean = 0;
    let crouch = 0;
    let pivotX = 0;
    let pivotY = 0.55;
    let headPitch = 0;
    let headYaw = 0;
    let tilt = 0;
    let hipX = 0;
    let legExtraL = 0;
    let legExtraR = 0;
    let legLz = 0;
    let legRz = 0;
    let liftL = 0;
    let liftR = 0;
    let rate = 22;

    const idle = 1 - Math.min(1, mv * 2);
    const supportHeld = SUPPORT_FAMILIES.has(heldFamily);
    let idleElbowR = 0;
    if (supportHeld) {
      // Two-handed melee rests in a low middle guard; the support hand is pinned to the grip.
      armR = heldFamily === 'spear' ? -0.75 : heldFamily === 'scythe' ? -0.66 : -0.58;
      armL = -0.7;
      armLz = -0.12;
      if (heldFamily === 'spear') idleElbowR = 0.55;
    } else if (twoHandHeld) {
      // Keep both hands on long hafts, stocks and two-handed grips while moving.
      armR = -0.92;
      armL = heldFamily === 'bow' || heldFamily === 'crossbow' ? -0.38 : -0.78;
      armLz = -0.12;
    } else if (heldFamily === 'dual') {
      armR = -0.72;
      armL = -0.68;
    } else if (heldFamily === 'magic') {
      armR = -0.62;
      armL = -0.18;
    }
    armR += walk * 0.55 * mv * (heldBlade ? 0.4 : 1);
    armL = twoHandHeld ? (supportHeld ? -0.7 : -0.78) + walk * 0.18 * mv : heldFamily === 'dual' ? -0.68 - walk * 0.28 * mv : -walk * 1.0 * mv;
    armLz = twoHandHeld ? -0.12 + run * 0.025 : 0.05 + run * 0.1;
    armRz = -0.05 - run * (twoHandHeld ? 0.025 : 0.08);
    let legL = walk * 0.8 * mv;
    let legR = -walk * 0.8 * mv;
    liftL = Math.max(0, -cs) * 0.11 * run;
    liftR = Math.max(0, cs) * 0.11 * run;
    legExtraL = -Math.max(0, -cs) * 0.3 * run;
    legExtraR = -Math.max(0, cs) * 0.3 * run;
    torsoYaw = walk * 0.2 * run;
    lean = run * 0.1 + clamp(this.accSm * 0.0055, -0.14, 0.2);
    tilt = clamp(-this.yawRate * 0.012, -0.16, 0.16) * Math.min(1, run + 0.2);
    hipX = -walk * 0.02 * run + Math.sin(t * 0.8) * 0.012 * idle;
    tilt += hipX * -1.5;
    armR += Math.sin(t * 2.2) * 0.03 * idle;
    armL += Math.sin(t * 2.2 + 1) * 0.04 * idle;
    armLz += Math.sin(t * 1.6) * 0.02 * idle;
    headYaw = Math.sin(t * 0.55) * 0.18 * idle + Math.sin(t * 1.3) * 0.05 * idle;
    headPitch = -lean * 0.6;
    let bobExtra = Math.sin(t * 2.2) * 0.012 * idle;

    const flinch = this.hurtT > 0 ? Math.min(1, this.hurtT / 0.4) : 0;
    if (this.shielding && this.state !== 'attack') {
      armL = -1.42;
      armLz = 0.12;
      armR = heldBlade ? -1.05 : armR;
      torsoYaw = -0.2;
      crouch += 0.025;
    }

    switch (this.state) {
      case 'attack': {
        const it = this.attackItem;
        const tt = clamp(this.stateT / this.stateDur, 0, 1);
        const hitT = this.attackHitFrac;
        rate = 30;
        const family = weaponFamily(it, it.held || this.heldKind);
        const step = this.attackStep;
        if (step) {
          // Each weapon class plays its own keyed three-step chain (attackCombos.js).
          const k = sampleStep(step, tt, this.atkPose);
          rate = it.kind === 'melee' ? 44 : 34;
          armR = k.aR;
          armRz = k.aRz;
          armL = k.aL;
          armLz = k.aLz;
          torsoYaw = k.ty;
          lean = k.ln;
          crouch = k.cr;
          tilt = k.tl;
          legL = k.lL;
          legR = k.lR;
          headPitch = k.hp;
          legExtraL = 0;
          legExtraR = 0;
          liftL = 0;
          liftR = 0;
          if (it.kind === 'ranged') {
            // Shooters keep their eyes on the line of fire while the torso turns side-on,
            // and the shot gives a small kick back through the shoulders.
            const kick = Math.exp(-Math.pow((tt - hitT) / 0.06, 2)) * (tt > hitT - 0.02 ? 1 : 0);
            headYaw -= torsoYaw * 0.62;
            headPitch -= lean * 0.2;
            lean -= kick * (family === 'crossbow' ? 0.07 : 0.035);
            torsoYaw += kick * (family === 'bow' ? 0.06 : 0.03);
            break;
          }
          // Whole-body follow-through: hips and head counter-rotate, then recover
          // after the weapon has passed the target.
          const bodySide = step.side;
          const impactPulse = Math.exp(-Math.pow((tt - hitT) / 0.09, 2));
          const recovery = ease(clamp((tt - hitT) / Math.max(0.08, 1 - hitT), 0, 1));
          const followThrough = Math.sin(Math.PI * clamp(recovery, 0, 1));
          const mass = family === 'heavy' ? 1.3 : family === 'scythe' ? 1.15 : family === 'spear' ? 0.85 : family === 'dual' ? 0.75 : 0.9;
          hipX += bodySide * (0.016 + impactPulse * 0.025) * followThrough * mass;
          tilt += bodySide * impactPulse * 0.04 * mass;
          headYaw -= torsoYaw * 0.18;
          headPitch -= lean * 0.1;
          lean += impactPulse * 0.06 * mass;
          if (family !== 'dual') armLz += bodySide * impactPulse * 0.06;
          // Plant the lead foot and turn the rear foot through the cut.
          legLz = -bodySide * (family === 'dual' ? 0.05 : 0.1) * (0.35 + impactPulse);
          legRz = bodySide * (family === 'heavy' || family === 'scythe' ? 0.13 : 0.08) * (0.3 + impactPulse);
        } else if (it.kind === 'melee') {
          const p = tt < hitT ? ease(tt / hitT) : 1 - ease((tt - hitT) / (1 - hitT));
          armR = lerp(-0.8, -2.5, p);
          torsoYaw = 0.5 * p;
        } else if (it.kind === 'ranged') {
          const releaseT = Number.isFinite(hitT) ? clamp(hitT, 0.2, 0.85) : 0.68;
          const p = tt < releaseT ? ease(tt / releaseT) : 1 - ease((tt - releaseT) / (1 - releaseT));
          const rel = tt > releaseT ? Math.max(0, 1 - (tt - releaseT) / 0.14) : 0;
          if (family === 'bow') {
            // Bow arm points at the target; draw hand travels back to the cheek.
            armR = lerp(-0.35, -1.72, p);
            armL = lerp(-0.1, -1.55, p);
            armRz = -0.16 * p;
            armLz = 0.12 * p;
            torsoYaw = -0.34 * p;
            lean = -0.04 * p - rel * 0.06;
          } else if (family === 'crossbow') {
            // Stock braced at the shoulder; lead hand supports the fore-end.
            armR = lerp(-0.5, -1.42, p);
            armL = lerp(-0.15, -1.2, p);
            armRz = -0.06 * p;
            armLz = 0.08 * p;
            torsoYaw = -0.18 * p;
            lean = -0.08 * p - rel * 0.04;
          } else {
            // Focus weapons rise into a controlled casting line rather than mimicking a bow draw.
            armR = lerp(-0.35, -1.85, p);
            armL = lerp(0, -1.05, p);
            armRz = -0.12 * p;
            torsoYaw = -0.12 * p;
            lean = -0.08 * p;
            headPitch = -0.12 * p;
          }
          // A shot has a small release recoil and a controlled return to aim.
          lean -= rel * (family === 'crossbow' ? 0.075 : 0.045);
          torsoYaw += rel * (family === 'bow' ? 0.09 : 0.045);
          headPitch += rel * 0.045;
          crouch = 0.025 * p;
          legL = lerp(legL, 0.2, p);
          legR = lerp(legR, -0.18, p);
          headPitch += -0.04 * p;
        } else {
          const p = tt < hitT / it.dur ? ease(tt / (hitT / it.dur)) : 1;
          armR = tt < 0.5 ? lerp(-0.6, -2.4, p) : lerp(-2.4, -0.4, ease((tt - 0.5) / 0.5));
          torsoYaw = tt < 0.5 ? 0.4 * p : -0.3;
          lean = tt < 0.5 ? -0.1 * p : 0.2 * (1 - ease((tt - 0.5) / 0.5));
        }
        break;
      }
      case 'use': {
        const tt = clamp(this.stateT / this.stateDur, 0, 1);
        const sw = Math.sin(tt * Math.PI);
        if (this.sipping) {
          armR = lerp(-0.45, -2.55, sw);
          armRz = -0.15 * sw;
          headPitch = -0.7 * sw;
          lean = -0.16 * sw;
        } else {
          armR = -1.6 + sw * -0.6;
          armL = -1.2;
          headPitch = -0.14 * sw;
          lean = -0.06 * sw;
        }
        break;
      }
      case 'roll': {
        const tt = clamp(this.stateT / this.stateDur, 0, 1);
        pivotX = ease(tt) * TAU;
        armR = -1.8;
        armL = -1.8;
        armLz = 0.3;
        armRz = -0.3;
        legL = 1.35;
        legR = 1.35;
        legExtraL = 0;
        legExtraR = 0;
        liftL = 0;
        liftR = 0;
        crouch = 0.24 * Math.sin(tt * Math.PI);
        lean = 0;
        tilt = 0;
        torsoYaw = 0;
        pivotY = 0.55 - 0.1 * Math.sin(tt * Math.PI);
        rate = 40;
        break;
      }
      case 'stagger': {
        const wob = Math.sin(this.stateT * 22) * 0.08;
        armR = -0.1 + wob;
        armL = 0.3 - wob;
        armRz = -0.5;
        armLz = 0.5;
        lean = -0.4;
        headPitch = -0.3;
        crouch = 0.06;
        legL = 0.4;
        legR = -0.35;
        torsoYaw = wob;
        break;
      }
      case 'dead': {
        const u = this.stateT;
        const kneel = ease(clamp(u / 0.35, 0, 1));
        const fall = clamp((u - 0.3) / 0.75, 0, 1);
        const bounce = fall > 0 ? 1 - Math.exp(-5.5 * fall) * Math.cos(9 * fall) : 0;
        crouch = 0.16 * kneel;
        legL = 0.9 * kneel;
        legR = -0.5 * kneel;
        legExtraL = 0;
        legExtraR = 0;
        liftL = 0;
        liftR = 0;
        lean = -0.2 * kneel;
        pivotX = -bounce * 1.52;
        pivotY = 0.55 - 0.27 * ease(fall);
        armR = 0.5 - kneel * 0.6;
        armL = 0.4 - kneel * 0.5;
        armRz = -0.9 * ease(fall);
        armLz = 0.9 * ease(fall);
        headPitch = -0.3 * kneel;
        tilt = 0;
        torsoYaw = 0;
        rate = 16;
        if (!this.deadFx && fall > 0.5) {
          this.deadFx = true;
          this.game.fx.shockwave(this.pos.x, this.pos.y, this.pos.z, 0xd9c9a0, 1.2);
          this.game.shake(0.25);
        }
        break;
      }
      case 'gather': {
        const a = this.gAnim;
        if (!a || !this.gatherReady) break;
        const u = a.u;
        rate = 28;
        legExtraL = 0;
        legExtraR = 0;
        liftL = 0;
        liftR = 0;
        if (a.name === 'mine' || a.name === 'chop') {
          if (u < 0.5) {
            const p = ease(u / 0.5);
            armR = lerp(-0.7, -3.0, p);
            armL = lerp(-0.4, -2.75, p);
            armRz = lerp(-0.05, 0.1, p);
            armLz = lerp(0.05, -0.05, p);
            lean = lerp(0.06, -0.3, p);
            torsoYaw = lerp(0, 0.22, p);
            legL = lerp(0.25, 0.5, p);
            legR = lerp(-0.25, -0.2, p);
            crouch = 0.02;
            headPitch = lerp(0, -0.12, p);
          } else if (u < 0.62) {
            const f = ease((u - 0.5) / 0.12);
            armR = lerp(-3.0, 0.1, f);
            armL = lerp(-2.75, -0.1, f);
            armRz = 0.1;
            lean = lerp(-0.3, 0.62, f);
            torsoYaw = lerp(0.22, -0.12, f);
            legL = lerp(0.5, 0.85, f);
            legR = lerp(-0.2, -0.55, f);
            crouch = lerp(0.02, 0.13, f);
            headPitch = lerp(-0.12, 0.2, f);
          } else {
            const q = ease((u - 0.62) / 0.38);
            armR = lerp(0.1, -0.7, q);
            armL = lerp(-0.1, -0.4, q);
            armRz = 0.1 * (1 - q) - 0.05 * q;
            lean = lerp(0.62, 0.06, q);
            torsoYaw = lerp(-0.12, 0, q);
            legL = lerp(0.85, 0.25, q);
            legR = lerp(-0.55, -0.25, q);
            crouch = lerp(0.13, 0.02, q);
            headPitch = lerp(0.2, 0, q);
          }
        } else if (a.name === 'cast') {
          const back = ease(clamp(u / 0.5, 0, 1));
          const fwd = ease(clamp((u - 0.5) / 0.16, 0, 1));
          const settle = ease(clamp((u - 0.72) / 0.28, 0, 1));
          armR = lerp(lerp(-0.8, -2.7, back), -1.0, fwd);
          armL = lerp(-0.4, -0.9, back) * (1 - fwd * 0.4);
          lean = lerp(lerp(0.04, -0.22, back), 0.2, fwd) * (1 - settle * 0.7);
          torsoYaw = lerp(0.2 * back, -0.15, fwd) * (1 - settle);
          legL = 0.3;
          legR = -0.3;
          headPitch = lerp(0, 0.1, settle);
        } else if (a.name === 'wait') {
          const sway = Math.sin(t * 1.3) * 0.02;
          armR = -1.05 + sway - a.dip * 0.22;
          armL = -0.62 + sway * 0.5;
          armLz = 0.12;
          lean = 0.07;
          torsoYaw = -0.12;
          legL = 0.28;
          legR = -0.28;
          headPitch = 0.14 + a.dip * 0.12;
          headYaw = Math.sin(t * 0.7) * 0.12;
        } else if (a.name === 'bite') {
          const y1 = ease(clamp(u / 0.3, 0, 1));
          const y2 = ease(clamp((u - 0.35) / 0.65, 0, 1));
          armR = lerp(lerp(-1.05, -2.3, y1), -1.1, y2);
          armL = lerp(-0.62, -1.5, y1) * (1 - y2) + -0.6 * y2;
          lean = lerp(lerp(0.07, -0.34, y1), 0.07, y2);
          torsoYaw = -0.12;
          legL = 0.4 * (1 - y2) + 0.28 * y2;
          legR = -0.4 * (1 - y2) - 0.28 * y2;
          headPitch = lerp(0.14, -0.2, y1) * (1 - y2) + 0.14 * y2;
        } else if (a.name === 'net') {
          const rise = ease(clamp(u / 0.22, 0, 1));
          const dip = ease(clamp((u - 0.22) / 0.26, 0, 1));
          const lift = ease(clamp((u - 0.58) / 0.28, 0, 1));
          const rest = ease(clamp((u - 0.86) / 0.14, 0, 1));
          armR = -0.6 - rise * 0.5;
          armR = lerp(armR, 0.2, dip);
          armR = lerp(armR, -1.5, lift);
          armR = lerp(armR, -0.7, rest);
          armL = lerp(-0.3, -0.8, rise) * (1 - dip) + lerp(0.1, -1.1, lift) * dip;
          lean = lerp(0.1 * rise, 0.65, dip);
          lean = lerp(lean, 0.15, lift);
          lean = lerp(lean, 0.06, rest);
          crouch = 0.1 * dip * (1 - lift);
          legL = 0.55 * dip * (1 - lift) + 0.2;
          legR = -0.35 * dip * (1 - lift) - 0.2;
          torsoYaw = -0.1;
          headPitch = 0.2 * dip * (1 - lift);
        } else if (a.name === 'cook') {
          const turn = Math.sin(u * Math.PI * 2);
          crouch = 0.2;
          lean = 0.42;
          armR = -1.15 + turn * 0.18;
          armL = -0.85 - turn * 0.16;
          armRz = 0.15;
          armLz = -0.1;
          legL = 0.7;
          legR = -0.25;
          headPitch = 0.42;
          torsoYaw = turn * 0.1;
        } else if (a.name === 'light') {
          const rise = ease(clamp(u / 0.4, 0, 1));
          const strike = ease(clamp((u - 0.48) / 0.16, 0, 1));
          const back = ease(clamp((u - 0.7) / 0.3, 0, 1));
          crouch = 0.22 * rise * (1 - back * 0.35);
          lean = lerp(0.4 * rise, 0.55, strike) * (1 - back * 0.7);
          armR = lerp(lerp(-0.35, -1.7, rise), 0.35, strike);
          armR = lerp(armR, -0.45, back);
          armL = lerp(-0.2, -0.7, rise) * (1 - back);
          legL = 0.15 + crouch * 2.2;
          legR = -0.1 - crouch;
          headPitch = 0.4 * rise * (1 - back * 0.5);
          torsoYaw = 0.05;
        }
        break;
      }
      default:
    }

    if (this.leapArm || this.leapT > 0) {
      const rising = this.vy > 0;
      armR = rising ? -2.6 : -0.4;
      armL = rising ? -2.6 : -0.2;
      legL = rising ? -0.9 : 0.6;
      legR = rising ? 0.2 : 0.7;
      lean = rising ? 0.45 : 0.15;
      torsoYaw = 0;
    } else if (this.castT > 0) {
      if (this.castAnim === 'spin') {
        armR = -1.6;
        armL = -1.6;
        torsoYaw = Math.sin(this.castT * 32) * 1.15;
        lean = 0.08;
      } else if (this.castAnim === 'bash') {
        armL = -1.9;
        torsoYaw = 0.7;
        lean = 0.12;
      } else if (this.castAnim === 'slam') {
        armR = -2.5;
        armL = -2.5;
        lean = 0.35;
      }
    }

    if (flinch > 0 && this.state !== 'dead' && this.state !== 'roll') {
      const f2 = flinch * flinch;
      lean = lerp(lean, -0.42, f2);
      headPitch = lerp(headPitch, -0.4, f2);
      armRz = lerp(armRz, -0.7, f2);
      armLz = lerp(armLz, 0.7, f2);
      armL = lerp(armL, 0.3, f2);
      torsoYaw += Math.sin(this.hurtT * 50) * 0.08 * flinch;
      crouch += 0.05 * f2;
    }

    dt = Math.min(dt, 0.05);
    const sp = this.sp || (this.sp = new SpringSet());
    if (this.landT > 0) {
      crouch += this.landT;
      this.landT = Math.max(0, this.landT - dt * 0.6);
    }
    const airborne = this.leapArm || this.leapT > 0;
    const locomoting = this.state !== 'attack' && this.state !== 'roll' && this.state !== 'dead' && !airborne;
    const rangedAim = this.state === 'attack' && this.attackItem?.kind === 'ranged';

    const flexOf = (total) => 0.14 + clamp(-total - 0.5, 0, 2.6) * 0.3;
    let eR = flexOf(armR) + (this.state === 'attack' ? 0 : idleElbowR);
    let eL = flexOf(armL);
    const swingR = Math.max(0, -walk);
    const swingL = Math.max(0, walk);
    if (locomoting) {
      eR += run * (0.3 + 0.55 * swingR) * (heldBlade ? 0.65 : 1);
      eL += run * (0.3 + 0.55 * swingL);
    }
    if (this.state === 'attack' && this.attackStep) {
      // Elbows come from the step's keys: loaded on the wind-up, snapping
      // straight through contact, with a brief compression as the blow lands.
      const k = this.atkPose;
      const tt = clamp(this.stateT / this.stateDur, 0, 1);
      const impact = Math.exp(-Math.pow((tt - this.attackHitFrac) / 0.08, 2));
      const ranged = this.attackItem?.kind === 'ranged';
      eR = Math.max(0.04, eR + (k.eR || 0) + impact * (ranged ? 0.02 : 0.1));
      eL = Math.max(0.04, eL + (k.eL || 0) + impact * (ranged ? 0 : 0.06));
    } else if (rangedAim) {
      eR = AIMED_KINDS.has(this.heldKind) ? 0.1 : eR;
    }
    if (this.state === 'roll') {
      eR = 1.6;
      eL = 1.6;
    } else if (this.state === 'dead') {
      eR = 0.5;
      eL = 0.5;
    } else if (this.state === 'stagger') {
      eR += 0.35;
      eL += 0.35;
    }
    if (airborne) {
      eR = this.vy > 0 ? 0.3 : 0.7;
      eL = eR;
    }

    const swL = Math.pow(Math.max(0, -cs), 0.85);
    const swR = Math.pow(Math.max(0, cs), 0.85);
    let kL = 0.06 + run * (0.12 + swL * 1.05);
    let kR = 0.06 + run * (0.12 + swR * 1.05);
    legL += legExtraL * 0.5;
    legR += legExtraR * 0.5;
    if (this.state === 'attack') {
      kL = 0.1 + Math.abs(legL) * 0.45;
      kR = 0.1 + Math.abs(legR) * 0.45;
    }
    if (airborne) {
      kL = this.vy > 0 ? 0.9 : 0.35;
      kR = this.vy > 0 ? 0.25 : 0.45;
    }
    let flex = 0;
    if (this.state === 'roll') {
      kL = 1.5;
      kR = 1.5;
    } else if (this.state === 'dead') {
      kL = 1.3 * (crouch / 0.16 || 0);
      kR = 0.6 * (crouch / 0.16 || 0);
    } else {
      const cs2 = sp.step('crouch', crouch, dt, 18, 0.55);
      flex = Math.acos(clamp(1 - Math.max(0, cs2) / 0.72, 0.2, 1));
      legL -= flex;
      legR -= flex;
      kL += flex * 2;
      kR += flex * 2;
    }

    let near = null;
    let nd = 8;
    for (const mon of this.game.monsters) {
      if (mon.dead) continue;
      const d = Math.hypot(mon.x - this.pos.x, mon.z - this.pos.z);
      if (d < nd) {
        nd = d;
        near = mon;
      }
    }
    if (near && this.state !== 'dead' && this.state !== 'roll') {
      const want = angDiff(this.yaw, Math.atan2(near.x - this.pos.x, near.z - this.pos.z));
      headYaw += clamp(want, -0.85, 0.85) * (this.state === 'attack' ? 0.8 : 0.65);
      headPitch += clamp(((near.y + 1.1) - (this.pos.y + 1.6)) / Math.max(1.5, nd), -0.25, 0.25) * -0.6;
    }

    const pelvis = torsoYaw * 0.3 - walk * 0.1 * run * (locomoting ? 1 : 0);
    const shoulderTargetR = armR + eR;
    const shoulderTargetL = armL + eL;
    const wA = rate;
    const jR = sp.step('armRx', shoulderTargetR, dt, wA, 0.78);
    m.armR.rotation.x = jR;
    m.armR.rotation.z = sp.step('armRz', armRz, dt, wA * 0.8, 0.8);
    m.armL.rotation.x = sp.step('armLx', shoulderTargetL, dt, wA, 0.78);
    m.armL.rotation.z = sp.step('armLz', armLz, dt, wA * 0.8, 0.8);
    m.elbowR.rotation.x = -sp.step('elR', eR, dt, wA * 0.75, 0.55);
    m.elbowL.rotation.x = -sp.step('elL', eL, dt, wA * 0.75, 0.55);
    const aimed = AIMED_KINDS.has(this.heldKind);
    let weaponPitch = 0;
    let weaponYaw = 0;
    let weaponRollLag = 0;
    // A spear rests level along the forearm with its point slightly raised.
    // Bows and crossbows stay upright and level with the body the same way.
    let level = (heldFamily === 'spear' || aimed) && this.state !== 'roll' && this.state !== 'dead' && !this.sipping ? 1 : 0;
    if (level) weaponPitch = -0.4;
    this.levelRoll = 0;
    if (this.state === 'attack' && this.attackItem?.kind === 'ranged' && this.attackStep) {
      // Shots and casts aim the weapon down the line of fire; a brief kick follows the release.
      const k = this.atkPose;
      level = aimed ? 1 : k.lv || 0;
      const tt = clamp(this.stateT / this.stateDur, 0, 1);
      const kick = Math.exp(-Math.pow((tt - this.attackHitFrac) / 0.05, 2)) * (tt > this.attackHitFrac - 0.01 ? 1 : 0);
      const family = weaponFamily(this.attackItem, this.attackItem.held || this.heldKind);
      weaponPitch = (k.wp || 0) - kick * (family === 'crossbow' ? 0.14 : family === 'bow' ? 0.05 : 0.09);
      this.levelRoll = k.wr || 0;
    } else if (this.state === 'attack' && this.attackItem?.kind === 'melee' && this.attackStep) {
      const k = this.atkPose;
      level = k.lv || 0;
      const tt = clamp(this.stateT / this.stateDur, 0, 1);
      const hitT = this.attackHitFrac;
      const impact = Math.exp(-Math.pow((tt - hitT) / 0.08, 2));
      const recover = ease(clamp((tt - hitT) / Math.max(0.08, 1 - hitT), 0, 1));
      const side = this.attackStep.side;
      const family = weaponFamily(this.attackItem, this.attackItem.held || this.heldKind);
      const weight = family === 'heavy' ? 1.3 : family === 'scythe' ? 1.15 : family === 'spear' ? 0.6 : family === 'dual' ? 0.75 : 0.7;
      // The wrist is keyed per step and trails the forearm a little after contact.
      weaponPitch = (k.wp || 0) + impact * 0.06 * weight;
      weaponYaw = (k.wy || 0) + side * (impact * 0.08 + Math.sin(recover * Math.PI) * 0.1) * weight;
      weaponRollLag = (k.wr || 0) + side * (impact * 0.06 + Math.sin(recover * Math.PI) * 0.08) * weight;
    }
    this.levelW = sp.step('weaponLevel', level, dt, rate * 0.8, 0.9);
    if (this.state === 'attack' && this.attackItem?.kind === 'ranged' && this.attackStep) {
      // Shot and cast keys are already eased; follow them exactly so a snap cast lands on the line.
      sp.get('weaponLevel').snap(level);
      this.levelW = level;
    }
    this.levelPitch = weaponPitch;
    m.heldSlot.rotation.x = aimed ? -(m.armR.rotation.x + m.elbowR.rotation.x) : sp.step('weaponPitch', weaponPitch, dt, rate * 0.72, 0.8);
    m.heldSlot.rotation.y = sp.step('weaponYaw', weaponYaw, dt, rate * 0.68, 0.8);
    let roll = gripRoll(this.heldKind);
    if (swingRoll(this.heldKind) && !aimed && this.state === 'attack' && this.attackItem?.kind === 'melee' && this.attackStep) {
      // Flat blades roll edge-first for side cuts; the step keys say how far.
      roll = lerp(roll, roll - Math.PI / 2, clamp(this.atkPose.rl || 0, 0, 1));
    }
    m.heldSlot.rotation.z = roll + sp.step('weaponRollLag', weaponRollLag, dt, rate * 0.62, 0.78);
    if (m.offhand) {
      const dual = DUAL_KINDS.has(this.heldKind);
      let offPitch = 0;
      let offYaw = 0;
      let offRoll = 0;
      if (dual && this.state === 'attack' && this.attackItem?.kind === 'melee') {
        const tt = clamp(this.stateT / this.stateDur, 0, 1);
        const hitT = this.attackHitFrac;
        const pulse = Math.exp(-Math.pow((tt - hitT) / 0.1, 2));
        const lead = this.attackStep?.side ?? (this.combo === 1 ? -1 : 1);
        offPitch = pulse * (this.combo === 2 ? -0.13 : 0.08);
        offYaw = -lead * pulse * 0.12;
        offRoll = -lead * pulse * 0.07;
      }
      m.offhand.rotation.x = sp.step('offhandPitch', offPitch, dt, rate * 0.65, 0.8);
      m.offhand.rotation.y = sp.step('offhandYaw', offYaw, dt, rate * 0.65, 0.8);
      m.offhand.rotation.z = (dual ? roll : 0) + sp.step('offhandRoll', offRoll, dt, rate * 0.65, 0.8);
    }

    const legW = this.state === 'attack' ? 30 : 26;
    m.legL.rotation.x = sp.step('legL', legL, dt, legW, 0.85);
    m.legR.rotation.x = sp.step('legR', legR, dt, legW, 0.85);
    m.kneeL.rotation.x = sp.step('kL', kL, dt, 30, 0.8);
    m.kneeR.rotation.x = sp.step('kR', kR, dt, 30, 0.8);
    m.legL.rotation.z = sp.step('legLz', legLz, dt, legW * 0.7, 0.8);
    m.legR.rotation.z = sp.step('legRz', legRz, dt, legW * 0.7, 0.8);
    m.legL.position.y = 0;
    m.legR.position.y = 0;

    m.hip.rotation.y = sp.step('pelvis', pelvis, dt, 18, 0.8);
    m.upper.rotation.y = sp.step('torsoY', torsoYaw - pelvis, dt, rate * 0.75, 0.7);
    const meleeSwingOn = this.state === 'attack' && this.attackItem?.kind === 'melee';
    m.upper.rotation.x = sp.step('lean', lean, dt, meleeSwingOn ? 24 : 16, 0.7);
    m.upper.rotation.z = sp.step('tiltZ', tilt * 0.6, dt, meleeSwingOn ? 18 : 12, 0.9);
    m.head.rotation.x = sp.step('headX', headPitch, dt, 14, 0.65);
    const torsoWorld = m.hip.rotation.y + m.upper.rotation.y;
    m.head.rotation.y = sp.step('headY', -torsoWorld * 0.55 + headYaw - m.hip.rotation.y * 0, dt, 12, 0.75);
    m.upper.position.y = Math.sin(t * 1.9) * 0.006 * idle;

    const T = 12 * S;
    const depth = (th, k) => T * Math.cos(th) + T * Math.cos(th + k);
    if (this.state === 'roll' || this.state === 'dead') {
      m.hip.position.y = 24 * S - crouch + bobExtra;
    } else {
      const d = Math.max(depth(m.legL.rotation.x, m.kneeL.rotation.x), depth(m.legR.rotation.x, m.kneeR.rotation.x));
      m.hip.position.y = d + bobExtra;
    }
    m.hip.position.x += (hipX - m.hip.position.x) * Math.min(1, dt * 14);
    this.pivot.rotation.x = pivotX;
    // Spinning steps turn the whole body; the turn ends on a full circle so it hands back cleanly.
    this.pivot.rotation.y = this.state === 'attack' && this.attackStep ? this.atkPose.spin || 0 : 0;
    this.pivot.rotation.z += (tilt * 0.4 - this.pivot.rotation.z) * Math.min(1, dt * 10);
    this.pivot.position.y = pivotY;
    this.armRig(dt);
  }
}

const RIG_V1 = new THREE.Vector3();
const RIG_V2 = new THREE.Vector3();
const RIG_V3 = new THREE.Vector3();
const RIG_Z = new THREE.Vector3(0, 0, 1);
const NOCK_RISE = 0.1;
const MUZZLE = { x: 0, y: 0, z: 0, dx: 0, dz: 1 };
const RIG_Q1 = new THREE.Quaternion();
const RIG_Q2 = new THREE.Quaternion();
const ARM_SOL = { x: 0, z: 0, bend: 0 };

/**
 * Analytic two-bone solve for an arm whose hand hangs along -y. Given the hand
 * target relative to the shoulder (in the arm's parent frame), returns the
 * shoulder pitch (x), roll (z) and elbow bend that reach it; out-of-reach
 * targets get a straight arm pointed at them.
 */
function solveArm(t, L1, L2) {
  const d = clamp(t.length(), Math.abs(L1 - L2) + 1e-3, L1 + L2 - 1e-4);
  t.setLength(d);
  const bend = clamp(Math.acos(clamp((d * d - L1 * L1 - L2 * L2) / (2 * L1 * L2), -1, 1)), 0.04, 2.5);
  const hy = -L1 - L2 * Math.cos(bend);
  const hz = L2 * Math.sin(bend);
  const c = Math.asin(clamp(t.x / -hy, -1, 1));
  ARM_SOL.x = Math.atan2(t.z, t.y) - Math.atan2(hz, hy * Math.cos(c));
  ARM_SOL.z = c;
  ARM_SOL.bend = bend;
  return ARM_SOL;
}

/** Blend an arm toward a solve, staying in the same turn as its current shoulder angle. */
function applyArm(arm, elbow, sol, w) {
  let x = sol.x;
  while (x - arm.rotation.x > Math.PI) x -= TAU;
  while (x - arm.rotation.x < -Math.PI) x += TAU;
  arm.rotation.x = lerp(arm.rotation.x, x, w);
  arm.rotation.z = lerp(arm.rotation.z, sol.z, w);
  elbow.rotation.x = lerp(elbow.rotation.x, -sol.bend, w);
}

let arrowParts = null;
/** A nocked arrow: tail at the origin, pointing along +z. */
function buildArrow() {
  if (!arrowParts) {
    const box = (w, h, d, z) => new THREE.BoxGeometry(w, h, d).translate(0, 0, z);
    arrowParts = [
      [box(0.018, 0.018, 0.92, 0.46), new THREE.MeshLambertMaterial({ color: 0x8a6a42 })],
      [box(0.04, 0.012, 0.08, 0.95), new THREE.MeshLambertMaterial({ color: 0x5c6168 })],
      [box(0.004, 0.05, 0.11, 0.08), new THREE.MeshLambertMaterial({ color: 0xe2dccb })],
      [box(0.05, 0.004, 0.11, 0.08), new THREE.MeshLambertMaterial({ color: 0xb8402e })],
    ];
  }
  const g = new THREE.Group();
  g.name = 'nockArrow';
  for (const [geo, mat] of arrowParts) g.add(new THREE.Mesh(geo, mat));
  return g;
}

const LV_Q1 = new THREE.Quaternion();
const LV_Q2 = new THREE.Quaternion();
const LV_Q3 = new THREE.Quaternion();
const LV_E = new THREE.Euler();

/** Melee families held with both hands on the haft. */
const SUPPORT_FAMILIES = new Set(['heavy', 'spear', 'scythe', 'crossbow']);
const gripBox = new THREE.Box3();

/**
 * Where the support hand sits along a two-handed weapon (heldSlot +z runs
 * toward the head). Swords and mauls take it below the lead hand on the
 * pommel; spears and scythes reach up the shaft; short hafts stack it above.
 */
function supportGrip(kind, g) {
  const fam = weaponFamily({ kind: 'melee' }, kind);
  g.updateMatrixWorld(true);
  gripBox.setFromObject(g);
  if (fam === 'spear') return 0.5;
  if (fam === 'scythe') return 0.42;
  if (fam === 'crossbow') return 0.42;
  if (fam === 'staff') return 0.36;
  return gripBox.min.z < -0.15 ? Math.max(-0.2, gripBox.min.z + 0.09) : 0.19;
}

/** Bows and crossbows keep their frame level with the body while the arm raises them to aim. */
const AIMED_KINDS = new Set([...TALL_KINDS, 'crossbow', 'budgecrossbow', 'darkcrossbow', 'yeticrossbow', 'volccrossbow', 'raptorcrossbow', 'buccaneergun']);

const BLADES = new Set(['blade', 'axe', 'pick', 'hammer', 'budgeblade', 'budgemaul', 'darkscythe', 'darksword', 'budgegreatsword', 'darkgreatsword', 'budgedual', 'darkdual', 'darkhammer', 'budgespear', 'darkspear', 'volcsword', 'volcgreatsword', 'volcdual', 'volchammer', 'volcspear', 'volcscythe', 'yetisword', 'yetigreatsword', 'yetidual', 'yetihammer', 'yetispear', 'yetiscythe', 'demonsword', 'holyhammer', 'tigerclaws', 'tigerspear', 'raptorsaber', 'raptorscythe', 'piratecutlass', 'piratedual', 'piratecleaver', 'cursedblade']);

const TRAIL_SPEC = {
  blade: { b: [0, 0, 0.35], t: [0, 0, 1.25], col: 0xfff2c0, hot: 0xffd27a },
  axe: { b: [0, 0, 0.5], t: [0, 0, 1.1], col: 0xfff2c0, hot: 0xffd27a },
  pick: { b: [0, 0, 0.5], t: [0, 0, 1.1], col: 0xe6e0d0, hot: 0xffd27a },
  hammer: { b: [0, 0, 0.6], t: [0, 0, 1.2], col: 0xe6e0d0, hot: 0xffd27a },
  budgeblade: { b: [-0.02, 0, 0.4], t: [-0.12, 0, 1.42], col: 0xb8ff8a, hot: 0xfff09a },
  budgemaul: { b: [0, 0, 0.85], t: [0, 0, 1.54], col: 0xb8ff8a, hot: 0xfff09a },
  darkscythe: { b: [-0.1, 0, 1.4], t: [-0.8, 0, 1.07], col: 0xc78bff, hot: 0xe6c8ff },
  darksword: { b: [0.03, 0, 0.41], t: [0.19, 0, 1.46], col: 0xc78bff, hot: 0xe6c8ff },
  budgegreatsword: { b: [0, 0, 0.52], t: [0, 0, 1.85], col: 0xb8ff8a, hot: 0xfff09a },
  darkgreatsword: { b: [0.07, 0, 0.53], t: [0.5, 0, 1.9], col: 0xc78bff, hot: 0xe6c8ff },
  budgedual: { b: [0.03, 0, 0.27], t: [0.21, 0, 0.98], col: 0xb8ff8a, hot: 0xfff09a },
  darkdual: { b: [0.09, 0, 0.25], t: [0.62, 0, 0.57], col: 0xc78bff, hot: 0xe6c8ff },
  darkhammer: { b: [0, 0, 0.83], t: [0.03, 0, 1.5], col: 0xc78bff, hot: 0xe6c8ff },
  budgespear: { b: [0, 0, 1.6], t: [-0.06, 0, 2.3], col: 0xb8ff8a, hot: 0xfff09a },
  darkspear: { b: [0, 0, 1.6], t: [0, 0, 2.3], col: 0xc78bff, hot: 0xe6c8ff },
  volcsword: { b: [0.02, 0, 0.41], t: [0.14, 0, 1.46], col: 0xff6a12, hot: 0xffe08a },
  volcgreatsword: { b: [0, 0, 0.53], t: [0, 0, 1.9], col: 0xff6a12, hot: 0xffe08a },
  volcdual: { b: [0.08, 0, 0.25], t: [0.52, 0, 0.78], col: 0xff6a12, hot: 0xffe08a },
  volchammer: { b: [0, 0, 0.85], t: [0.05, 0, 1.54], col: 0xff6a12, hot: 0xffe08a },
  volcspear: { b: [0, 0, 1.6], t: [0.01, 0, 2.28], col: 0xff6a12, hot: 0xffe08a },
  volcscythe: { b: [-0.1, 0, 1.4], t: [-0.69, 0, 1.05], col: 0xff6a12, hot: 0xffe08a },
  yetisword: { b: [0.02, 0, 0.4], t: [0.15, 0, 1.44], col: 0x9fdcff, hot: 0xf2fbff },
  yetigreatsword: { b: [0, 0, 0.53], t: [-0.05, 0, 1.88], col: 0x9fdcff, hot: 0xf2fbff },
  yetidual: { b: [0.07, 0, 0.25], t: [0.47, 0, 0.8], col: 0x9fdcff, hot: 0xf2fbff },
  yetihammer: { b: [0, 0, 0.81], t: [0, 0, 1.47], col: 0x9fdcff, hot: 0xf2fbff },
  yetispear: { b: [0, 0, 1.6], t: [0, 0, 2.23], col: 0x9fdcff, hot: 0xf2fbff },
  yetiscythe: { b: [-0.1, 0, 1.4], t: [-0.72, 0, 1.05], col: 0x9fdcff, hot: 0xf2fbff },
  tigerclaws: { b: [0, 0, 0.25], t: [-0.3, 0, 1.05], col: 0xff9a3a, hot: 0xfff0c0 },
  tigerspear: { b: [0, 0, 1.6], t: [-0.1, 0, 2.35], col: 0xff9a3a, hot: 0xfff0c0 },
  raptorsaber: { b: [0, 0, 0.35], t: [-0.33, 0, 1.42], col: 0xd2da72, hot: 0xfff6d0 },
  raptorscythe: { b: [-0.1, 0, 1.35], t: [-0.6, 0, 1.15], col: 0xd2da72, hot: 0xfff6d0 },
  piratecutlass: { b: [0, 0, 0.3], t: [-0.18, 0, 1.3], col: 0xdfe8f5, hot: 0xffd95a },
  piratedual: { b: [0, 0, 0.2], t: [-0.24, 0, 1.05], col: 0xdfe8f5, hot: 0xffd95a },
  piratecleaver: { b: [0, 0, 0.5], t: [-0.21, 0, 1.86], col: 0xdfe8f5, hot: 0xffd95a },
  cursedblade: { b: [0, 0, 0.3], t: [-0.15, 0, 1.38], col: 0x5cff9a, hot: 0xd8ffe4 },
  demonsword: { b: [0, 0, 0.55], t: [0, 0, 2.2], col: 0xff3a1a, hot: 0xffb070 },
  holyhammer: { b: [0, 0, 1.0], t: [0, 0, 1.7], col: 0x9fd0ff, hot: 0xffffff },
};
