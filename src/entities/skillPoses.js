/**
 * Keyed body animations for class skills.
 *
 * Each pose is a short timeline (`dur` seconds of visual time; gameplay timing
 * is unchanged) of keys at normalised time u in [0, 1]. A key sets any of:
 *
 *   armR armL      shoulder pitch (negative raises forward / overhead)
 *   armRz armLz    shoulder spread (armRz > 0 and armLz < 0 swing the arms out)
 *   eR eL          elbow bend (0 straight, ~2.4 fully folded)
 *   lean           spine pitch (positive leans forward)
 *   yaw            torso twist
 *   tilt           side bend
 *   crouch         hip drop (knees follow)
 *   legL legR      hip pitch (negative steps forward)
 *   head headYaw   head pitch / turn
 *   hop            lift of the whole body
 *   spin           whole-body turn in radians (for spinning skills)
 *
 * The action lands in the first ~0.1 of the timeline so the body agrees with
 * the effect, which fires on the press. The tail follows through and the pose
 * hands back to normal movement over the last quarter.
 */

const TAU = Math.PI * 2;

/** Ready stance most poses settle through before handing back. */
const SETTLE = { armR: -0.7, armL: -0.4, eR: 0.5, eL: 0.4, lean: 0.06, yaw: 0, crouch: 0.03, legL: 0.25, legR: -0.25, head: 0 };

/** A bow draw: bow arm out straight, draw hand at the cheek, side-on. */
const DRAW = { armL: -1.58, eL: 0.06, armLz: 0.05, armR: -1.45, eR: 2.35, armRz: -0.35, yaw: -0.55, lean: 0.04, head: 0.04, headYaw: 0.5, legL: 0.35, legR: -0.35 };
const LOOSE = { armR: -1.25, eR: 1.4, armRz: 0.25 };

export const SKILL_POSES = {
  /* ------------------------------- warrior ------------------------------- */
  shieldbash: {
    dur: 0.62,
    keys: [
      [0, { armL: -1.15, eL: 1.3, yaw: 0.45, lean: -0.05, crouch: 0.07, legL: 0.15, legR: -0.15, armR: -0.6 }],
      [0.13, { armL: -1.72, eL: 0.1, yaw: -0.35, lean: 0.34, crouch: 0.13, legL: -0.6, legR: 0.5, armR: -0.4, head: 0.1 }],
      [0.48, { armL: -1.6, eL: 0.2, yaw: -0.25, lean: 0.24, crouch: 0.1, legL: -0.5, legR: 0.45 }],
      [1, SETTLE],
    ],
  },
  bulwark: {
    dur: 0.85,
    keys: [
      [0, { crouch: 0.05, armL: -1.0, eL: 1.0 }],
      [0.16, { crouch: 0.22, legL: -0.5, legR: 0.45, armL: -1.9, eL: 0.45, armLz: 0.1, yaw: 0.45, lean: 0.16, armR: -0.7, eR: 0.9, head: 0.12 }],
      [0.7, { crouch: 0.2, legL: -0.48, legR: 0.44, armL: -1.85, eL: 0.5, yaw: 0.42, lean: 0.15, head: 0.1 }],
      [1, SETTLE],
    ],
  },
  ironcitadel: {
    dur: 0.95,
    keys: [
      [0, { armR: -1.35, eR: 2.2, armL: -1.25, eL: 2.1, lean: -0.05, crouch: 0.05 }],
      [0.18, { armR: -1.55, eR: 2.35, armL: -1.5, eL: 2.3, lean: -0.22, head: -0.28, crouch: 0.02 }],
      [0.42, { armR: -0.9, eR: 1.1, armRz: 0.75, armL: -0.9, eL: 1.1, armLz: -0.75, crouch: 0.2, legL: -0.45, legR: 0.45, lean: 0.12, head: 0.05 }],
      [0.72, { armR: -0.85, eR: 1.1, armRz: 0.7, armL: -0.85, eL: 1.1, armLz: -0.7, crouch: 0.18, legL: -0.42, legR: 0.42, lean: 0.1 }],
      [1, SETTLE],
    ],
  },
  whirlwind: {
    dur: 0.62,
    keys: [
      [0, { armR: -1.5, eR: 0.15, armRz: 0.9, armL: -1.2, eL: 0.4, armLz: -0.9, crouch: 0.14, lean: 0.12, spin: 0 }],
      [0.7, { armR: -1.45, eR: 0.15, armRz: 0.95, armL: -1.15, eL: 0.4, armLz: -0.95, crouch: 0.16, lean: 0.14, spin: TAU * 2 }],
      [1, { ...SETTLE, spin: TAU * 2 }],
    ],
  },
  bloodstorm: {
    dur: 0.8,
    keys: [
      [0, { armR: -1.6, eR: 0.1, armRz: 1.0, armL: -1.4, eL: 0.2, armLz: -1.0, crouch: 0.18, hop: 0, spin: 0, lean: 0.1 }],
      [0.35, { hop: 0.35, spin: TAU * 1.4, armR: -2.0, armL: -1.8, crouch: 0.05, lean: -0.05 }],
      [0.7, { hop: 0, spin: TAU * 3, armR: -1.3, armL: -1.1, crouch: 0.22, lean: 0.2 }],
      [1, { ...SETTLE, spin: TAU * 3 }],
    ],
  },
  execute: {
    dur: 0.72,
    keys: [
      [0, { armR: -2.85, eR: 0.55, armL: -2.6, eL: 0.6, lean: -0.26, yaw: 0.25, hop: 0.12, head: -0.15 }],
      [0.14, { armR: 0.3, eR: 0.1, armL: 0.12, eL: 0.12, lean: 0.58, yaw: -0.12, crouch: 0.17, legL: -0.65, legR: 0.55, head: 0.28, hop: 0 }],
      [0.48, { armR: 0.25, eR: 0.15, armL: 0.08, eL: 0.15, lean: 0.5, crouch: 0.15, legL: -0.6, legR: 0.5, head: 0.25 }],
      [1, SETTLE],
    ],
  },
  earthquake: {
    dur: 0.95,
    keys: [
      [0, { armR: -2.9, eR: 0.4, armL: -2.9, eL: 0.4, lean: -0.3, hop: 0.25, legL: 0.3, legR: -0.3, head: -0.2 }],
      [0.17, { armR: 0.35, eR: 0.1, armL: 0.3, eL: 0.1, lean: 0.62, crouch: 0.3, legL: -0.72, legR: 0.62, head: 0.32, hop: 0 }],
      [0.55, { armR: 0.3, eR: 0.15, armL: 0.25, eL: 0.15, lean: 0.55, crouch: 0.28, legL: -0.7, legR: 0.6, head: 0.28 }],
      [1, SETTLE],
    ],
  },
  warcry: {
    dur: 0.95,
    keys: [
      [0, { lean: 0.12, armR: -0.9, eR: 1.4, armL: -0.9, eL: 1.4, crouch: 0.05 }],
      [0.14, { lean: -0.32, head: -0.5, armR: 0.2, eR: 1.0, armRz: 0.75, armL: 0.2, eL: 1.0, armLz: -0.75, crouch: 0.14, legL: -0.45, legR: 0.45 }],
      [0.66, { lean: -0.28, head: -0.42, armR: 0.18, eR: 1.05, armRz: 0.7, armL: 0.18, eL: 1.05, armLz: -0.7, crouch: 0.13, legL: -0.42, legR: 0.42 }],
      [1, SETTLE],
    ],
  },

  /* -------------------------------- ranger -------------------------------- */
  callwolf: {
    dur: 0.85,
    keys: [
      [0, { armL: -2.25, eL: 2.4, head: -0.18, lean: -0.05 }],
      [0.3, { armL: -2.3, eL: 2.45, head: -0.22, lean: -0.08 }],
      [0.45, { armL: -1.62, eL: 0.06, yaw: 0.25, lean: 0.1, head: 0.05, legL: -0.3, legR: 0.3 }],
      [0.75, { armL: -1.58, eL: 0.08, yaw: 0.22, lean: 0.08 }],
      [1, SETTLE],
    ],
  },
  packtactics: {
    dur: 0.7,
    keys: [
      [0, { armL: -1.55, eL: 0.2, yaw: -0.5, lean: 0.05 }],
      [0.3, { armL: -1.62, eL: 0.08, yaw: 0.45, lean: 0.14, legL: -0.35, legR: 0.3 }],
      [0.6, { armL: -1.5, eL: 0.12, yaw: 0.35, lean: 0.1 }],
      [1, SETTLE],
    ],
  },
  howl: {
    dur: 1.0,
    keys: [
      [0, { lean: 0.15, head: 0.2, crouch: 0.1 }],
      [0.18, { lean: -0.34, head: -0.62, armR: 0.25, eR: 0.6, armRz: 0.5, armL: 0.25, eL: 0.6, armLz: -0.5, crouch: 0.08 }],
      [0.7, { lean: -0.3, head: -0.58, armR: 0.22, eR: 0.6, armRz: 0.48, armL: 0.22, eL: 0.6, armLz: -0.48 }],
      [1, SETTLE],
    ],
  },
  poisonvolley: {
    dur: 0.62,
    keys: [
      [0, DRAW],
      [0.12, { ...DRAW, ...LOOSE }],
      [0.4, { ...DRAW, ...LOOSE, yaw: -0.4 }],
      [1, SETTLE],
    ],
  },
  aimedshot: {
    dur: 0.75,
    keys: [
      [0, { ...DRAW, eR: 2.45, lean: 0.06 }],
      [0.14, { ...DRAW, ...LOOSE, armRz: 0.45, lean: 0.0 }],
      [0.5, { ...DRAW, ...LOOSE, armRz: 0.4 }],
      [1, SETTLE],
    ],
  },
  plaguearrow: {
    dur: 0.72,
    keys: [
      [0, { ...DRAW, armL: -1.75 }],
      [0.13, { ...DRAW, ...LOOSE, armL: -1.72 }],
      [0.48, { ...DRAW, ...LOOSE, armL: -1.68 }],
      [1, SETTLE],
    ],
  },
  snipe: {
    dur: 0.95,
    keys: [
      [0, { ...DRAW, crouch: 0.26, legL: -0.85, legR: 0.75, lean: 0.12 }],
      [0.16, { ...DRAW, ...LOOSE, crouch: 0.26, legL: -0.85, legR: 0.75, lean: 0.06, armRz: 0.5 }],
      [0.6, { ...DRAW, ...LOOSE, crouch: 0.24, legL: -0.8, legR: 0.7, armRz: 0.45 }],
      [1, SETTLE],
    ],
  },
  markedprey: {
    dur: 0.7,
    keys: [
      [0, { armL: -1.3, eL: 1.0, yaw: 0.2 }],
      [0.15, { armL: -1.66, eL: 0.04, yaw: 0.32, lean: 0.12, head: 0.08, headYaw: -0.15 }],
      [0.6, { armL: -1.62, eL: 0.06, yaw: 0.3, lean: 0.1 }],
      [1, SETTLE],
    ],
  },
  toxiccloud: {
    dur: 0.7,
    keys: [
      [0, { armR: 0.65, eR: 0.35, crouch: 0.12, lean: 0.22, yaw: 0.3, legL: -0.4, legR: 0.35 }],
      [0.15, { armR: -2.15, eR: 0.25, crouch: 0.04, lean: -0.06, yaw: -0.2, legL: -0.45, legR: 0.4 }],
      [0.45, { armR: -1.9, eR: 0.3, lean: 0.0, yaw: -0.15 }],
      [1, SETTLE],
    ],
  },

  /* --------------------------------- mage --------------------------------- */
  fireball: {
    dur: 0.62,
    keys: [
      [0, { armR: -1.0, eR: 1.7, yaw: 0.45, lean: -0.1, armL: -0.9, eL: 1.2 }],
      [0.1, { armR: -1.66, eR: 0.04, yaw: -0.32, lean: 0.26, legL: -0.45, legR: 0.35, armL: -0.5, eL: 0.8 }],
      [0.42, { armR: -1.6, eR: 0.1, yaw: -0.25, lean: 0.2, legL: -0.42, legR: 0.32 }],
      [1, SETTLE],
    ],
  },
  flamewave: {
    dur: 0.72,
    keys: [
      [0, { armR: -1.2, eR: 1.7, armL: -1.2, eL: 1.7, lean: -0.12, crouch: 0.06 }],
      [0.15, { armR: -1.62, eR: 0.08, armL: -1.62, eL: 0.08, lean: 0.32, crouch: 0.12, legL: -0.52, legR: 0.42 }],
      [0.5, { armR: -1.58, eR: 0.12, armL: -1.58, eL: 0.12, lean: 0.28, crouch: 0.1, legL: -0.5, legR: 0.4 }],
      [1, SETTLE],
    ],
  },
  meteor: {
    dur: 1.0,
    keys: [
      [0, { armR: -2.95, eR: 0.25, armL: -2.95, eL: 0.25, head: -0.45, lean: -0.22, hop: 0.06 }],
      [0.35, { armR: -3.0, eR: 0.2, armRz: 0.25, armL: -3.0, eL: 0.2, armLz: -0.25, head: -0.5, lean: -0.25, hop: 0.08 }],
      [0.55, { armR: -1.3, eR: 0.1, armL: -1.3, eL: 0.1, lean: 0.36, crouch: 0.14, head: 0.18, legL: -0.5, legR: 0.4, hop: 0 }],
      [1, SETTLE],
    ],
  },
  frostbolt: {
    dur: 0.62,
    keys: [
      [0, { armL: -1.0, eL: 1.7, yaw: -0.45, lean: -0.08 }],
      [0.1, { armL: -1.66, eL: 0.04, yaw: 0.32, lean: 0.24, legL: -0.42, legR: 0.34 }],
      [0.42, { armL: -1.6, eL: 0.1, yaw: 0.25, lean: 0.2 }],
      [1, SETTLE],
    ],
  },
  icenova: {
    dur: 0.85,
    keys: [
      [0, { crouch: 0.26, armR: -1.2, eR: 2.1, armL: -1.2, eL: 2.1, lean: 0.32, head: 0.2 }],
      [0.14, { crouch: 0.04, armR: -1.95, eR: 0.08, armRz: 1.1, armL: -1.95, eL: 0.08, armLz: -1.1, lean: -0.16, head: -0.22, hop: 0.12 }],
      [0.55, { crouch: 0.05, armR: -1.85, eR: 0.12, armRz: 1.0, armL: -1.85, eL: 0.12, armLz: -1.0, lean: -0.12, hop: 0 }],
      [1, SETTLE],
    ],
  },
  glacier: {
    dur: 0.85,
    keys: [
      [0, { hop: 0.12, armR: -2.1, eR: 0.6, armL: -2.1, eL: 0.6, lean: -0.12, legL: 0.3, legR: -0.2 }],
      [0.15, { hop: 0, crouch: 0.22, legL: -0.7, legR: 0.4, armR: -1.42, eR: 0.08, armL: -1.42, eL: 0.08, lean: 0.36, head: 0.15 }],
      [0.55, { crouch: 0.2, legL: -0.66, legR: 0.38, armR: -1.4, eR: 0.12, armL: -1.4, eL: 0.12, lean: 0.32 }],
      [1, SETTLE],
    ],
  },
  spark: {
    dur: 0.5,
    keys: [
      [0, { armR: -1.25, eR: 1.3, yaw: 0.3 }],
      [0.08, { armR: -1.72, eR: 0.04, yaw: -0.22, lean: 0.12 }],
      [0.4, { armR: -1.65, eR: 0.1, yaw: -0.18, lean: 0.1 }],
      [1, SETTLE],
    ],
  },
  chainlightning: {
    dur: 0.8,
    keys: [
      [0, { armR: -1.62, eR: 0.06, yaw: 0.62, lean: 0.12, legL: -0.4, legR: 0.3 }],
      [0.45, { armR: -1.62, eR: 0.06, yaw: -0.52, lean: 0.16, legL: -0.4, legR: 0.3 }],
      [0.65, { armR: -1.55, eR: 0.12, yaw: -0.45, lean: 0.12 }],
      [1, SETTLE],
    ],
  },
  thunderclap: {
    dur: 0.85,
    keys: [
      [0, { armR: -2.85, eR: 0.5, armRz: -0.25, armL: -2.85, eL: 0.5, armLz: 0.25, head: -0.35, lean: -0.15, hop: 0.1 }],
      [0.13, { armR: -0.55, eR: 0.15, armL: -0.55, eL: 0.15, crouch: 0.26, lean: 0.34, legL: -0.6, legR: 0.55, head: 0.25, hop: 0 }],
      [0.5, { armR: -0.5, eR: 0.2, armL: -0.5, eL: 0.2, crouch: 0.24, lean: 0.3, legL: -0.58, legR: 0.52 }],
      [1, SETTLE],
    ],
  },

  /* ------------------------------- paladin ------------------------------- */
  layhands: {
    dur: 1.0,
    keys: [
      [0, { armR: -1.4, eR: 1.6, armL: -1.4, eL: 1.6, lean: 0.08, head: 0.15 }],
      [0.2, { armR: -2.5, eR: 0.3, armRz: 0.35, armL: -2.5, eL: 0.3, armLz: -0.35, lean: -0.22, head: -0.42, crouch: 0.02 }],
      [0.6, { armR: -1.5, eR: 0.3, armL: -1.5, eL: 0.3, lean: 0.14, head: 0.12, crouch: 0.08 }],
      [1, SETTLE],
    ],
  },
  smite: {
    dur: 0.72,
    keys: [
      [0, { armR: -2.6, eR: 0.5, armL: -1.05, eL: 0.9, lean: -0.28, yaw: 0.18, head: -0.12 }],
      [0.12, { armR: -0.55, eR: 0.1, armL: -0.55, eL: 0.6, lean: 0.34, yaw: -0.22, crouch: 0.1, legL: -0.5, legR: 0.4, head: 0.16 }],
      [0.48, { armR: -0.6, eR: 0.15, lean: 0.28, yaw: -0.18, crouch: 0.08 }],
      [1, SETTLE],
    ],
  },
  consecration: {
    dur: 1.0,
    keys: [
      [0, { armR: -2.45, eR: 0.6, armL: -2.25, eL: 0.6, lean: -0.12, head: -0.1 }],
      [0.18, { armR: -0.25, eR: 0.15, armL: -0.3, eL: 0.2, crouch: 0.32, legL: -0.9, legR: 0.85, lean: 0.42, head: 0.32 }],
      [0.72, { armR: -0.25, eR: 0.15, armL: -0.3, eL: 0.2, crouch: 0.3, legL: -0.88, legR: 0.82, lean: 0.4, head: 0.3 }],
      [1, SETTLE],
    ],
  },
  crusader: {
    dur: 0.72,
    keys: [
      [0, { armR: -2.85, eR: 0.5, armL: -2.4, eL: 0.6, yaw: 0.38, lean: -0.16 }],
      [0.13, { armR: 0.25, eR: 0.12, armL: -0.15, eL: 0.2, yaw: -0.7, lean: 0.24, crouch: 0.06, legL: -0.5, legR: 0.35, head: 0.1 }],
      [0.48, { armR: 0.15, eR: 0.2, yaw: -0.6, lean: 0.2, crouch: 0.05 }],
      [1, SETTLE],
    ],
  },
  judgment: {
    dur: 0.85,
    keys: [
      [0, { hop: 0.42, armR: -2.95, eR: 0.35, armL: -2.95, eL: 0.35, lean: -0.26, legL: -0.4, legR: 0.3, head: -0.2 }],
      [0.2, { hop: 0, armR: 0.3, eR: 0.1, armL: 0.25, eL: 0.12, lean: 0.56, crouch: 0.2, legL: -0.66, legR: 0.58, head: 0.3 }],
      [0.55, { armR: 0.25, eR: 0.15, armL: 0.2, eL: 0.15, lean: 0.5, crouch: 0.18, legL: -0.62, legR: 0.55 }],
      [1, SETTLE],
    ],
  },
  divinestorm: {
    dur: 0.8,
    keys: [
      [0, { armR: -2.5, eR: 0.3, armRz: 0.5, armL: -1.6, eL: 0.4, armLz: -0.6, crouch: 0.1, spin: 0, head: -0.1 }],
      [0.7, { armR: -2.45, eR: 0.3, armRz: 0.55, armL: -1.55, eL: 0.4, armLz: -0.65, crouch: 0.12, spin: TAU * 2 }],
      [1, { ...SETTLE, spin: TAU * 2 }],
    ],
  },
  faithshield: {
    dur: 0.85,
    keys: [
      [0, { armL: -1.0, eL: 1.2, crouch: 0.05 }],
      [0.16, { armL: -1.9, eL: 0.4, yaw: 0.42, lean: 0.14, crouch: 0.16, legL: -0.45, legR: 0.4, armR: -2.2, eR: 0.5, head: 0.08 }],
      [0.7, { armL: -1.85, eL: 0.45, yaw: 0.4, lean: 0.12, crouch: 0.15, armR: -2.1, eR: 0.5 }],
      [1, SETTLE],
    ],
  },
  avengershield: {
    dur: 0.7,
    keys: [
      [0, { armL: -1.0, eL: 1.9, armLz: 0.35, yaw: 0.72, lean: -0.05, crouch: 0.08 }],
      [0.14, { armL: -1.62, eL: 0.06, armLz: -0.3, yaw: -0.52, lean: 0.24, legL: -0.5, legR: 0.4 }],
      [0.45, { armL: -1.5, eL: 0.12, yaw: -0.42, lean: 0.18 }],
      [1, SETTLE],
    ],
  },
  divineprotection: {
    dur: 1.1,
    keys: [
      [0, { crouch: 0.1, armR: -1.2, eR: 1.6, armL: -1.2, eL: 1.6 }],
      [0.2, { crouch: 0.32, legL: -0.92, legR: 0.82, armR: -1.42, eR: 2.05, armRz: -0.25, armL: -1.42, eL: 2.05, armLz: 0.25, head: 0.28, lean: 0.2 }],
      [0.55, { crouch: 0.3, legL: -0.9, legR: 0.8, armR: -2.6, eR: 0.3, armL: -2.6, eL: 0.3, head: -0.3, lean: -0.12 }],
      [0.8, { crouch: 0.26, legL: -0.85, legR: 0.75, armR: -2.55, eR: 0.3, armL: -2.55, eL: 0.3, head: -0.28, lean: -0.1 }],
      [1, SETTLE],
    ],
  },
};

const smooth = (t) => t * t * (3 - 2 * t);

/**
 * Sample a pose at u in [0, 1]. Returns the keyed values and a weight that
 * stays at 1 through the action and eases to 0 over the last quarter, so the
 * hunter flows back into whatever they were doing.
 */
export function samplePose(pose, u) {
  const keys = pose.keys;
  const out = {};
  const names = new Set();
  for (const [, k] of keys) for (const n of Object.keys(k)) names.add(n);
  for (const n of names) {
    let a = null;
    let b = null;
    for (const key of keys) {
      if (!(n in key[1])) continue;
      if (key[0] <= u) a = key;
      if (key[0] >= u && !b) b = key;
    }
    if (!a) a = b;
    if (!b) b = a;
    if (!a) continue;
    if (a === b || b[0] === a[0]) out[n] = a[1][n];
    else {
      const t = smooth(Math.min(1, Math.max(0, (u - a[0]) / (b[0] - a[0]))));
      out[n] = a[1][n] + (b[1][n] - a[1][n]) * t;
    }
  }
  const w = u < 0.75 ? 1 : 1 - smooth((u - 0.75) / 0.25);
  return { v: out, w };
}
