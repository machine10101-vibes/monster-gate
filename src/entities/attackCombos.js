/**
 * Per-weapon melee combo choreography for the hunter.
 *
 * Every weapon class gets its own three-step chain. A step is a short
 * keyframed pose track over normalised time (0..1 of the attack's duration):
 *
 *   guard -> anticipation (wind-up) -> strike (contact) -> follow-through -> recovery
 *
 * Strikes accelerate into contact ('in' easing) and decelerate out of it
 * ('out'), so the fast part of each swing is the moment the weapon passes the
 * target, while the wind-up and recovery read clearly. Keys only list the
 * channels that change; everything else carries over from the previous key.
 * The final key returns to the weapon's guard so chained steps flow.
 *
 * Pose channels (radians unless noted; signs follow Player.pose):
 *   aR/aL    shoulder pitch (negative raises forward/up, about -3 is overhead)
 *   aRz/aLz  shoulder roll (aRz + swings the weapon arm out, aLz - swings the off arm out)
 *   eR/eL    extra elbow bend (+ bends, - straightens)
 *   ty       torso yaw (+ draws the weapon shoulder back, - drives it through)
 *   ln       lean (+ forward), cr crouch (world units), tl side tilt
 *   lL/lR    hip pitch (lL + puts the left foot back, lR - puts the right foot forward)
 *   hp       head pitch (+ looks down)
 *   rl       0..1 blend toward an edge-leading quarter roll for flat blades
 *   wp/wy/wr extra wrist pitch / yaw / roll on the held weapon (wp + dips the tip)
 *   lv       0..1 blend that keeps the weapon aligned with the hunter's facing (thrusts, aiming)
 *   aim      0..1 blend toward the step's arm aim (bow arm / wand arm straight at the target,
 *            or the crossbow grip brought to the shoulder)
 *   two      0..1 support hand pinned to the weapon's second grip
 *   dw       0..1 draw hand pinned to the bowstring
 *   pull     0..1 how far the string is drawn
 *   arw      >0.5 shows a nocked arrow
 *   spin     whole-body turn (radians) for spinning moves
 *
 * Step fields:
 *   dur     multiplier on the item's base duration
 *   hit     normalised contact time (the damage frame)
 *   side    +1 forehand / -1 backhand, drives follow-through layering
 *   lunge   [speed, from, to] forward drive during the step
 *   cancel  normalised time after which a buffered attack starts the next step
 *   window  seconds after the step in which another press continues the chain
 *   dmg/reach/knock  multipliers for this step (finishers hit harder)
 *   arc     'full' hits all around (spins); otherwise the item's arc
 *   fx      slash VFX shape: { tilt, flip, sweep, thrust, spin, heavy }
 */

const TAU = Math.PI * 2;

const EASE = {
  lin: (t) => t,
  in: (t) => t * t * t,
  in2: (t) => t * t,
  out: (t) => 1 - Math.pow(1 - t, 3),
  out2: (t) => 1 - (1 - t) * (1 - t),
  io: (t) => t * t * (3 - 2 * t),
  hold: () => 0,
};

const CHANNELS = ['aR', 'aRz', 'aL', 'aLz', 'eR', 'eL', 'ty', 'ln', 'cr', 'tl', 'lL', 'lR', 'hp', 'rl', 'wp', 'wy', 'wr', 'lv', 'spin', 'aim', 'two', 'dw', 'pull', 'arw'];

const ZERO = Object.fromEntries(CHANNELS.map((c) => [c, 0]));

/* ------------------------------------------------------------------ */
/* guards                                                             */
/* ------------------------------------------------------------------ */

const GUARD = {
  sword: { aR: -0.85, aRz: -0.05, aL: -0.45, aLz: 0.08, lL: 0.18, lR: -0.16, ty: 0.06 },
  greatsword: { aR: -0.6, aRz: 0.05, aL: -0.7, aLz: -0.16, lL: 0.24, lR: -0.2, ty: 0.12, ln: 0.04 },
  hammer: { aR: -0.56, aRz: 0.04, aL: -0.66, aLz: -0.14, lL: 0.26, lR: -0.2, ty: 0.1, ln: 0.06, cr: 0.02 },
  spear: { aR: -0.75, aRz: -0.06, eR: 0.55, aL: -0.9, aLz: -0.14, lL: 0.32, lR: -0.26, ty: 0.3, ln: 0.04, lv: 1, wp: -0.4 },
  scythe: { aR: -0.66, aRz: 0.06, aL: -0.8, aLz: -0.16, lL: 0.24, lR: -0.2, ty: 0.1 },
  dual: { aR: -0.78, aRz: 0.06, aL: -0.72, aLz: -0.06, lL: 0.22, lR: -0.2, ln: 0.06, cr: 0.02 },
  claws: { aR: -0.95, aRz: 0.1, aL: -0.9, aLz: -0.1, eR: 0.5, eL: 0.5, lL: 0.28, lR: -0.24, ln: 0.12, cr: 0.05 },
  longbow: { aR: -0.4, aRz: -0.05, aL: -0.25, aLz: 0.05, lL: 0.2, lR: -0.18, ty: -0.12 },
  shortbow: { aR: -0.45, aRz: -0.05, aL: -0.3, aLz: 0.05, lL: 0.2, lR: -0.18, ty: -0.1, ln: 0.04 },
  crossbow: { aR: -0.92, aL: -0.38, aLz: -0.12, lL: 0.2, lR: -0.18, two: 1 },
  staff: { aR: -0.55, aRz: 0.02, aL: -0.2, aLz: 0.05, lL: 0.18, lR: -0.16 },
  wand: { aR: -0.62, aRz: 0.0, aL: -0.35, aLz: 0.08, lL: 0.18, lR: -0.16 },
};

/* ------------------------------------------------------------------ */
/* combos                                                             */
/* ------------------------------------------------------------------ */

const COMBOS = {
  /* One-handed sword (shield on the off arm): quick, clean fencing cuts. */
  sword: [
    {
      // 1. Forehand diagonal: high outside to low inside, shield kept up.
      dur: 1.0, hit: 0.36, side: 1, lunge: [4.6, 0.24, 0.42], cancel: 0.7, window: 0.42,
      fx: { tilt: 0.55, flip: 1 },
      keys: [
        { t: 0.22, e: 'out', aR: -2.65, aRz: 0.62, eR: 0.35, ty: 0.62, ln: -0.12, lL: 0.34, lR: -0.04, rl: 1, aL: -0.8, aLz: 0.18, hp: -0.06, wp: -0.12 },
        { t: 0.36, e: 'in', aR: -1.25, aRz: -0.18, eR: -0.08, ty: -0.5, ln: 0.22, cr: 0.06, lL: 0.56, lR: -0.52, hp: 0.06, wp: 0.12 },
        { t: 0.54, e: 'out', aR: -0.55, aRz: -0.46, ty: -0.78, ln: 0.18, wp: 0.06 },
        { t: 1, e: 'io', reset: true },
      ],
    },
    {
      // 2. Backhand return: a flat cut from across the body back out.
      dur: 0.88, hit: 0.34, side: -1, lunge: [3.8, 0.2, 0.4], cancel: 0.7, window: 0.42,
      fx: { tilt: -0.22, flip: -1 },
      keys: [
        { t: 0.2, e: 'out', aR: -0.95, aRz: -0.98, eR: 0.3, ty: -0.85, ln: 0.06, lL: 0.3, lR: -0.12, rl: 1, aL: -0.6, aLz: 0.3, wp: 0.2, wy: -0.1 },
        { t: 0.34, e: 'in', aR: -0.86, aRz: 0.24, eR: 0, ty: 0.42, ln: 0.16, cr: 0.04, lL: 0.44, lR: -0.38, wp: 0.25, wy: 0.14 },
        { t: 0.52, e: 'out', aR: -0.8, aRz: 0.86, ty: 0.78, ln: 0.12, wy: 0.06 },
        { t: 1, e: 'io', reset: true },
      ],
    },
    {
      // 3. Jumping overhead cleave: rise onto the toes, hang, drive the blade down.
      dur: 1.28, hit: 0.5, side: 1, lunge: [6.4, 0.3, 0.52], cancel: 0.86, window: 0.3,
      dmg: 1.5, reach: 1.2, knock: 1.5,
      fx: { heavy: true, tilt: 1.25 },
      keys: [
        { t: 0.28, e: 'out', aR: -3.0, aRz: 0.16, eR: 0.65, ty: 0.18, ln: -0.3, cr: 0.0, lL: 0.12, lR: 0.06, hp: -0.18, aL: -1.05, aLz: 0.22, wp: -0.25 },
        { t: 0.4, e: 'io', aR: -3.12, eR: 0.75, ln: -0.34, hp: -0.2, wp: -0.3 },
        { t: 0.5, e: 'in', aR: -0.85, aRz: 0.0, eR: -0.1, ty: 0, ln: 0.52, cr: 0.16, lL: 0.9, lR: -0.86, hp: 0.22, aL: -0.55, wp: 0.12 },
        { t: 0.64, e: 'out', aR: -0.42, ln: 0.56, cr: 0.17, wp: 0.05 },
        { t: 1, e: 'io', reset: true },
      ],
    },
  ],

  /* Two-handed greatsword: wide, committed body swings with real wind-up. */
  greatsword: [
    {
      // 1. Horizontal sweep that turns the whole torso through the target.
      dur: 1.0, hit: 0.46, side: 1, lunge: [4.2, 0.32, 0.5], cancel: 0.74, window: 0.5,
      fx: { tilt: 0.18, flip: 1 },
      keys: [
        { t: 0.3, e: 'out', aR: -1.95, aRz: 0.66, aL: -1.62, aLz: 0.36, eR: 0.35, eL: 0.3, ty: 1.02, ln: -0.08, lL: 0.42, lR: -0.08, rl: 1, cr: 0.04 },
        { t: 0.38, e: 'io', ty: 1.08, aRz: 0.7, ln: -0.1 },
        { t: 0.46, e: 'in', aR: -1.55, aRz: -0.2, aL: -1.45, aLz: -0.2, eR: 0, eL: 0, ty: -0.6, ln: 0.2, cr: 0.08, lL: 0.62, lR: -0.56 },
        { t: 0.64, e: 'out', aR: -1.2, aRz: -0.52, aL: -1.12, ty: -1.1, ln: 0.22 },
        { t: 1, e: 'io', reset: true },
      ],
    },
    {
      // 2. Rising reverse diagonal: drop the blade low and rip it upward.
      dur: 0.96, hit: 0.42, side: -1, lunge: [3.6, 0.26, 0.44], cancel: 0.74, window: 0.5,
      fx: { tilt: -0.85, flip: -1 },
      keys: [
        { t: 0.26, e: 'out', aR: -0.42, aRz: -0.5, aL: -0.32, aLz: 0.12, eR: 0.2, ty: -0.9, ln: 0.26, cr: 0.11, lL: 0.5, lR: -0.3, rl: 1, hp: 0.12 },
        { t: 0.42, e: 'in', aR: -1.95, aRz: 0.42, aL: -1.8, aLz: -0.1, eR: -0.05, ty: 0.5, ln: -0.1, cr: 0.02, lL: 0.38, lR: -0.46, hp: -0.12 },
        { t: 0.58, e: 'out', aR: -2.35, aRz: 0.5, aL: -2.2, ty: 0.85, ln: -0.16, hp: -0.16 },
        { t: 1, e: 'io', reset: true },
      ],
    },
    {
      // 3. Stepping overhead cleave from a full raise.
      dur: 1.3, hit: 0.56, side: 1, lunge: [5.6, 0.4, 0.58], cancel: 0.88, window: 0.3,
      dmg: 1.5, reach: 1.2, knock: 1.5,
      fx: { heavy: true, tilt: 1.3 },
      keys: [
        { t: 0.34, e: 'out', aR: -3.05, aRz: 0.1, aL: -2.85, aLz: -0.04, eR: 0.5, eL: 0.5, ty: 0.16, ln: -0.32, hp: -0.16, lL: 0.2, lR: -0.02, wp: -0.22 },
        { t: 0.46, e: 'io', aR: -3.16, aL: -2.95, ln: -0.36, wp: -0.28 },
        { t: 0.56, e: 'in', aR: -0.78, aRz: 0, aL: -0.8, eR: -0.05, eL: 0, ty: 0, ln: 0.6, cr: 0.18, lL: 0.96, lR: -0.9, hp: 0.26, wp: 0.12 },
        { t: 0.7, e: 'out', aR: -0.4, aL: -0.45, ln: 0.62, cr: 0.2, wp: 0.05 },
        { t: 1, e: 'io', reset: true },
      ],
    },
  ],

  /* Hammers and mauls: momentum weapons. Each swing feeds the next. */
  hammer: [
    {
      // 1. Low wide swing, hips leading the head of the hammer.
      dur: 1.0, hit: 0.5, side: 1, lunge: [3.6, 0.36, 0.54], cancel: 0.76, window: 0.55,
      fx: { tilt: 0.1, flip: 1 },
      keys: [
        { t: 0.34, e: 'out', aR: -1.5, aRz: 0.76, aL: -1.3, aLz: 0.42, eR: 0.3, eL: 0.25, ty: 1.12, ln: -0.12, cr: 0.06, lL: 0.46, lR: 0.02 },
        { t: 0.42, e: 'io', ty: 1.18, ln: -0.14 },
        { t: 0.5, e: 'in', aR: -1.42, aRz: -0.16, aL: -1.3, aLz: -0.12, eR: 0, eL: 0, ty: -0.42, ln: 0.26, cr: 0.11, lL: 0.62, lR: -0.6 },
        { t: 0.7, e: 'out', aR: -1.1, aRz: -0.58, aL: -1.0, ty: -1.2, ln: 0.3 },
        { t: 1, e: 'io', reset: true },
      ],
    },
    {
      // 2. The swing's momentum loops into a rising uppercut.
      dur: 1.02, hit: 0.44, side: -1, lunge: [3.4, 0.28, 0.46], cancel: 0.76, window: 0.55,
      fx: { tilt: -1.05, flip: -1 },
      keys: [
        { t: 0.24, e: 'out', aR: -0.18, aRz: -0.42, aL: -0.16, aLz: 0.14, eR: 0.15, ty: -1.05, ln: 0.36, cr: 0.13, lL: 0.56, lR: -0.32, hp: 0.16 },
        { t: 0.44, e: 'in', aR: -2.4, aRz: 0.22, aL: -2.2, aLz: -0.1, ty: 0.22, ln: -0.2, cr: 0.0, lL: 0.3, lR: -0.4, hp: -0.2, wp: -0.15 },
        { t: 0.6, e: 'out', aR: -2.9, aL: -2.66, ty: 0.3, ln: -0.28, hp: -0.22 },
        { t: 1, e: 'io', reset: true },
      ],
    },
    {
      // 3. Earth-splitting slam: full raise, rise on the toes, crash, hold in the ground.
      dur: 1.42, hit: 0.55, side: 1, lunge: [4.6, 0.4, 0.56], cancel: 0.9, window: 0.3,
      dmg: 1.5, reach: 1.2, knock: 1.6,
      fx: { heavy: true, tilt: 1.4 },
      keys: [
        { t: 0.36, e: 'out', aR: -3.1, aRz: 0.06, aL: -2.95, aLz: -0.04, eR: 0.55, eL: 0.55, ty: 0.08, ln: -0.36, cr: -0.0, hp: -0.22, lL: 0.12, lR: 0.04, wp: -0.3 },
        { t: 0.46, e: 'io', aR: -3.2, aL: -3.05, ln: -0.4, wp: -0.34 },
        { t: 0.55, e: 'in', aR: 0.14, aRz: 0, aL: 0.0, eR: 0, eL: 0, ty: 0, ln: 0.72, cr: 0.24, lL: 1.0, lR: -0.95, hp: 0.32, wp: 0.34 },
        { t: 0.76, e: 'hold', ln: 0.68 },
        { t: 1, e: 'io', reset: true },
      ],
    },
  ],

  /* Spear: footwork and reach. Thrusts extend the arms, the body coils behind them. */
  spear: [
    {
      // 1. Quick jab: draw the haft back along the forearm, punch it out level.
      dur: 0.84, hit: 0.38, side: 1, lunge: [5.0, 0.28, 0.42], cancel: 0.66, window: 0.42,
      fx: { thrust: true },
      keys: [
        { t: 0.26, e: 'out', aR: -0.12, eR: 1.3, ty: 0.62, ln: -0.1, lL: 0.42, lR: -0.1, wp: -0.22 },
        { t: 0.38, e: 'in', aR: -1.52, eR: -0.1, ty: -0.22, ln: 0.26, cr: 0.04, lL: 0.52, lR: -0.56, wp: 0.02 },
        { t: 0.5, e: 'out', aR: -1.46, ty: -0.26, ln: 0.24 },
        { t: 1, e: 'io', reset: true },
      ],
    },
    {
      // 2. Haft sweep: pivot on the lead foot and swing the level shaft across.
      dur: 1.0, hit: 0.42, side: -1, lunge: [3.0, 0.26, 0.44], cancel: 0.72, window: 0.45,
      fx: { tilt: -0.1, flip: -1, sweep: 2.8 },
      keys: [
        { t: 0.26, e: 'out', aR: -1.05, eR: 0.45, aRz: 0.55, ty: 0.95, ln: 0.0, lL: 0.3, lR: -0.2, cr: 0.05, wp: 0.05 },
        { t: 0.42, e: 'in', aR: -1.15, aRz: -0.32, ty: -0.62, ln: 0.14, cr: 0.08, lL: 0.46, lR: -0.44, wp: 0.12 },
        { t: 0.6, e: 'out', aRz: -0.48, ty: -1.0, ln: 0.12 },
        { t: 1, e: 'io', reset: true },
      ],
    },
    {
      // 3. Charging lunge: coil low, then drive through with the whole body.
      dur: 1.22, hit: 0.48, side: 1, lunge: [9.0, 0.34, 0.52], cancel: 0.86, window: 0.3,
      dmg: 1.5, reach: 1.25, knock: 1.4,
      fx: { thrust: true, heavy: true },
      keys: [
        { t: 0.32, e: 'out', aR: -0.08, eR: 1.35, ty: 0.8, ln: -0.06, cr: 0.13, lL: 0.52, lR: 0.08, hp: 0.06, wp: -0.12 },
        { t: 0.4, e: 'io', ty: 0.86, cr: 0.15 },
        { t: 0.48, e: 'in', aR: -1.58, eR: -0.1, ty: -0.3, ln: 0.42, cr: 0.13, lL: 0.98, lR: -0.92, hp: -0.04, wp: 0.04 },
        { t: 0.66, e: 'out', ln: 0.4 },
        { t: 1, e: 'io', reset: true },
      ],
    },
  ],

  /* Scythe: hooked reaping arcs that pull through the target, then a full spin. */
  scythe: [
    {
      // 1. High reap: the blade falls from above the shoulder across the body.
      dur: 1.0, hit: 0.45, side: 1, lunge: [4.0, 0.3, 0.48], cancel: 0.72, window: 0.5,
      fx: { tilt: 0.75, flip: 1 },
      keys: [
        { t: 0.3, e: 'out', aR: -2.7, aRz: 0.36, aL: -2.1, aLz: -0.08, eR: 0.3, eL: 0.35, ty: 0.95, ln: -0.15, lL: 0.4, lR: -0.1 },
        { t: 0.45, e: 'in', aR: -1.0, aRz: -0.12, aL: -0.82, aLz: -0.2, eR: 0, eL: 0.05, ty: -0.62, ln: 0.26, cr: 0.08, lL: 0.7, lR: -0.56 },
        { t: 0.62, e: 'out', aR: -0.52, aL: -0.5, ty: -1.05, ln: 0.26 },
        { t: 1, e: 'io', reset: true },
      ],
    },
    {
      // 2. Hooking pull: reach across, then rake the blade back toward the hip.
      dur: 0.96, hit: 0.42, side: -1, lunge: [2.6, 0.24, 0.42], cancel: 0.72, window: 0.5,
      fx: { tilt: -0.3, flip: -1 },
      keys: [
        { t: 0.26, e: 'out', aR: -1.5, aRz: -0.42, aL: -1.62, aLz: 0.32, eR: -0.05, ty: -1.0, ln: 0.24, lL: 0.34, lR: -0.32 },
        { t: 0.42, e: 'in', aR: -1.4, aRz: 0.46, aL: -1.2, aLz: -0.1, eR: 0.45, eL: 0.4, ty: 0.75, ln: -0.06, cr: 0.06, lL: 0.2, lR: -0.24 },
        { t: 0.6, e: 'out', aRz: 0.62, eR: 0.6, ty: 1.12, ln: -0.08 },
        { t: 1, e: 'io', reset: true },
      ],
    },
    {
      // 3. Whirling reap: arms out, the whole body spins the blade around once.
      dur: 1.32, hit: 0.5, side: 1, lunge: [3.4, 0.32, 0.62], cancel: 0.88, window: 0.3,
      dmg: 1.45, reach: 1.15, knock: 1.4, arc: 'full',
      fx: { spin: true, heavy: true },
      keys: [
        { t: 0.3, e: 'out', aR: -1.7, aRz: 0.62, aL: -1.42, aLz: 0.34, ty: 0.82, ln: -0.04, cr: 0.12, lL: 0.44, lR: -0.12 },
        { t: 0.5, e: 'in2', aR: -1.52, aRz: 0.72, aL: -1.5, aLz: -0.24, ty: -0.2, ln: 0.12, cr: 0.08, lL: 0.4, lR: -0.4, spin: -Math.PI * 1.05 },
        { t: 0.68, e: 'out', ty: -0.5, spin: -TAU, ln: 0.18, cr: 0.1 },
        { t: 1, e: 'io', reset: true, spin: -TAU },
      ],
    },
  ],

  /* Dual swords: fast alternating hands, finished with a crossing double cut. */
  dual: [
    {
      // 1. Right-hand diagonal, left blade held forward on guard.
      dur: 0.84, hit: 0.32, side: 1, lunge: [4.6, 0.2, 0.38], cancel: 0.62, window: 0.38,
      fx: { tilt: 0.5, flip: 1 },
      keys: [
        { t: 0.2, e: 'out', aR: -2.42, aRz: 0.56, eR: 0.3, aL: -0.95, aLz: 0.06, ty: 0.52, ln: -0.08, lL: 0.32, lR: -0.08, rl: 1 },
        { t: 0.32, e: 'in', aR: -1.0, aRz: -0.36, eR: -0.08, aL: -0.62, ty: -0.46, ln: 0.18, cr: 0.04, lL: 0.42, lR: -0.38 },
        { t: 0.48, e: 'out', aR: -0.62, aRz: -0.55, ty: -0.62 },
        { t: 1, e: 'io', reset: true },
      ],
    },
    {
      // 2. Mirror cut from the left hand as the hips turn back.
      dur: 0.84, hit: 0.32, side: -1, lunge: [4.6, 0.2, 0.38], cancel: 0.62, window: 0.38,
      fx: { tilt: -0.5, flip: -1 },
      keys: [
        { t: 0.2, e: 'out', aL: -2.42, aLz: -0.56, eL: 0.3, aR: -0.95, aRz: -0.06, ty: -0.52, ln: -0.08, lL: 0.12, lR: -0.3, rl: 1 },
        { t: 0.32, e: 'in', aL: -1.0, aLz: 0.36, eL: -0.08, aR: -0.62, ty: 0.46, ln: 0.18, cr: 0.04, lL: 0.2, lR: -0.5 },
        { t: 0.48, e: 'out', aL: -0.62, aLz: 0.55, ty: 0.62 },
        { t: 1, e: 'io', reset: true },
      ],
    },
    {
      // 3. Cross-cut finisher: blades crossed overhead, torn down and outward.
      dur: 1.18, hit: 0.48, side: 1, lunge: [6.2, 0.3, 0.5], cancel: 0.84, window: 0.3,
      dmg: 1.5, reach: 1.15, knock: 1.5,
      fx: { heavy: true, tilt: 1.0, cross: true },
      keys: [
        { t: 0.3, e: 'out', aR: -2.85, aRz: -0.34, aL: -2.85, aLz: 0.34, eR: 0.35, eL: 0.35, ln: -0.22, hp: -0.12, lL: 0.12, lR: 0.0 },
        { t: 0.4, e: 'io', aR: -2.95, aL: -2.95, ln: -0.25 },
        { t: 0.48, e: 'in', aR: -0.95, aRz: 0.78, aL: -0.95, aLz: -0.78, eR: -0.05, eL: -0.05, ln: 0.36, cr: 0.13, lL: 0.82, lR: -0.78, hp: 0.16 },
        { t: 0.64, e: 'out', aR: -0.6, aRz: 0.9, aL: -0.6, aLz: -0.9, ln: 0.34, cr: 0.14 },
        { t: 1, e: 'io', reset: true },
      ],
    },
  ],

  /* Claws: a brawler's rhythm of rakes and a pouncing double strike. */
  claws: [
    {
      // 1. Straight right rake, punched from the shoulder.
      dur: 0.8, hit: 0.32, side: 1, lunge: [5.0, 0.2, 0.38], cancel: 0.6, window: 0.38,
      fx: { tilt: 0.9, flip: 1, sweep: 1.6 },
      keys: [
        { t: 0.2, e: 'out', aR: -1.2, aRz: 0.3, eR: 1.15, aL: -1.15, eL: 0.7, ty: 0.55, ln: 0.02, cr: 0.06, lL: 0.38, lR: -0.12 },
        { t: 0.32, e: 'in', aR: -1.72, aRz: -0.24, eR: -0.1, ty: -0.42, ln: 0.26, lL: 0.46, lR: -0.44 },
        { t: 0.46, e: 'out', aR: -1.3, aRz: -0.42, eR: 0.2, ty: -0.5 },
        { t: 1, e: 'io', reset: true },
      ],
    },
    {
      // 2. Left hooking rake, sweeping across at chest height.
      dur: 0.82, hit: 0.34, side: -1, lunge: [4.4, 0.22, 0.4], cancel: 0.6, window: 0.38,
      fx: { tilt: -0.3, flip: -1 },
      keys: [
        { t: 0.22, e: 'out', aL: -1.4, aLz: -0.75, eL: 0.55, aR: -1.0, eR: 0.7, ty: -0.62, ln: 0.04, cr: 0.05, lL: 0.2, lR: -0.32 },
        { t: 0.34, e: 'in', aL: -1.55, aLz: 0.52, eL: 0.25, ty: 0.55, ln: 0.2, lL: 0.32, lR: -0.46 },
        { t: 0.5, e: 'out', aLz: 0.72, ty: 0.7 },
        { t: 1, e: 'io', reset: true },
      ],
    },
    {
      // 3. Pounce: crouch, spring forward, rake both claws down together.
      dur: 1.16, hit: 0.5, side: 1, lunge: [8.0, 0.32, 0.5], cancel: 0.84, window: 0.3,
      dmg: 1.5, reach: 1.2, knock: 1.5,
      fx: { heavy: true, tilt: 1.2 },
      keys: [
        { t: 0.3, e: 'out', aR: -0.4, aL: -0.4, aRz: 0.3, aLz: -0.3, eR: 0.9, eL: 0.9, ln: 0.3, cr: 0.2, lL: 0.6, lR: -0.4, hp: -0.15 },
        { t: 0.42, e: 'out2', aR: -2.9, aL: -2.9, aRz: 0.2, aLz: -0.2, eR: 0.4, eL: 0.4, ln: -0.18, cr: 0.0, lL: 0.2, lR: 0.1, hp: -0.2 },
        { t: 0.5, e: 'in', aR: -0.7, aL: -0.7, aRz: 0.05, aLz: -0.05, eR: 0.1, eL: 0.1, ln: 0.5, cr: 0.18, lL: 0.9, lR: -0.86, hp: 0.25 },
        { t: 0.66, e: 'out', aR: -0.4, aL: -0.4, ln: 0.52, cr: 0.2 },
        { t: 1, e: 'io', reset: true },
      ],
    },
  ],
};

/* ------------------------------------------------------------------ */
/* ranged                                                             */
/* ------------------------------------------------------------------ */

/*
 * Ranged steps keep the weapon's base tempo (dur 1) and release near the old
 * 60% mark, so fire rate and damage are unchanged; only the motion is new.
 * aimMode 'dir' points the arm straight down the line of fire, 'pt' brings the
 * weapon hand to aimPt (metres from the right shoulder in body space:
 * x toward the body's left, y up, z forward).
 */

const LONGBOW_SHOT = {
  // Nock, raise, draw to the anchor, hold, release, then reach back to the quiver.
  dur: 1, hit: 0.64, side: 1, cancel: 0.84, window: 0.5, aimMode: 'dir', drawLen: 0.62,
  keys: [
    { t: 0.14, e: 'out', aR: -1.0, aL: -1.25, eL: 1.3, ty: -0.55, lL: 0.34, lR: -0.32, aim: 0.55, lv: 0.85, dw: 0.85, pull: 0.04, arw: 1, hp: 0.02 },
    { t: 0.46, e: 'io', aR: -1.5, aL: -1.5, eL: 2.0, ty: -1.0, ln: -0.04, tl: -0.05, aim: 1, lv: 1, dw: 1, pull: 1 },
    { t: 0.63, e: 'io', ty: -1.02, pull: 1.04 },
    { t: 0.64, e: 'lin', pull: 0, dw: 0, arw: 0, aL: -1.6, aLz: 0.35, eL: 0.6 },
    { t: 0.74, e: 'out', aL: -1.4, aLz: 0.55, eL: 0.35, ty: -0.95, tl: -0.03, ln: -0.06 },
    { t: 0.88, e: 'io', aL: -2.75, aLz: 0.1, eL: 1.6, aim: 0.6, ty: -0.6, lv: 0.7 },
    { t: 1, e: 'io', reset: true },
  ],
};

const SHORTBOW_SHOT = {
  // Snap shot: canted bow, quick partial draw, crisp release.
  dur: 1, hit: 0.58, side: 1, cancel: 0.8, window: 0.45, aimMode: 'dir', drawLen: 0.48,
  keys: [
    { t: 0.16, e: 'out', aR: -1.1, aL: -1.3, eL: 1.4, ty: -0.42, lL: 0.3, lR: -0.28, aim: 0.6, lv: 0.9, wr: 0.32, dw: 0.9, pull: 0.08, arw: 1 },
    { t: 0.48, e: 'io', aR: -1.5, aL: -1.5, eL: 1.85, ty: -0.72, ln: 0.02, aim: 1, lv: 1, wr: 0.38, dw: 1, pull: 0.88 },
    { t: 0.57, e: 'io', pull: 0.92 },
    { t: 0.58, e: 'lin', pull: 0, dw: 0, arw: 0, aL: -1.55, aLz: 0.3, eL: 0.55 },
    { t: 0.7, e: 'out', aL: -1.35, aLz: 0.5, eL: 0.3, ty: -0.65 },
    { t: 1, e: 'io', reset: true },
  ],
};

const CROSSBOW_SHOT = {
  // Shoulder, settle, trigger, recoil, then drop the nose to cock and raise again.
  dur: 1, hit: 0.5, side: 1, cancel: 0.9, window: 0.45, aimMode: 'pt', aimPt: [0.1, 0.04, 0.3],
  lunge: [-1.6, 0.5, 0.62],
  keys: [
    { t: 0.24, e: 'out', aR: -1.3, ty: -0.32, tl: 0.05, hp: 0.06, lL: 0.32, lR: -0.24, aim: 1, lv: 1, wp: 0.02 },
    { t: 0.48, e: 'io', ty: -0.36, wp: 0.0 },
    { t: 0.5, e: 'in', wp: 0.0 },
    { t: 0.58, e: 'out', wp: -0.42, ln: -0.14, ty: -0.24, hp: -0.04, aim: 0.85 },
    { t: 0.74, e: 'io', aim: 0.15, lv: 0.6, wp: 0.6, ln: 0.08, cr: 0.04, ty: -0.1, two: 0, aL: -0.75, eL: 1.25, aLz: 0.3, hp: 0.12 },
    { t: 0.84, e: 'io', aL: -0.4, eL: 1.5, aLz: 0.15 },
    { t: 0.94, e: 'io', two: 1, wp: 0.3, aim: 0.1 },
    { t: 1, e: 'io', reset: true },
  ],
};

const RANGED = {
  longbow: [LONGBOW_SHOT, LONGBOW_SHOT, LONGBOW_SHOT],
  shortbow: [SHORTBOW_SHOT, SHORTBOW_SHOT, SHORTBOW_SHOT],
  crossbow: [CROSSBOW_SHOT, CROSSBOW_SHOT, CROSSBOW_SHOT],

  /* War staff: a two-handed caster's chain of lance, sweep and invocation. */
  staff: [
    {
      // 1. Lance: draw the staff back along the forearm, then drive the head at the target.
      dur: 1, hit: 0.6, side: 1, cancel: 0.82, window: 0.5, lunge: [2.6, 0.48, 0.64],
      keys: [
        { t: 0.3, e: 'out', aR: -0.45, eR: 1.05, aL: -0.9, ty: 0.45, ln: -0.1, lL: 0.34, lR: -0.12, two: 1, lv: 1, wp: -0.25, hp: 0.04 },
        { t: 0.52, e: 'io', ty: 0.52, wp: -0.3, ln: -0.12 },
        { t: 0.57, e: 'in', aR: -1.45, eR: -0.05, ty: -0.22, ln: 0.22, cr: 0.04, lL: 0.5, lR: -0.5, wp: 0.04 },
        { t: 0.74, e: 'out', ln: 0.2, ty: -0.26 },
        { t: 1, e: 'io', reset: true },
      ],
    },
    {
      // 2. Sweep: the staff swings out across the body and snaps level at the target.
      dur: 1, hit: 0.6, side: -1, cancel: 0.82, window: 0.5,
      keys: [
        { t: 0.3, e: 'out', aR: -1.05, aRz: 0.55, aL: -1.2, aLz: 0.3, ty: 0.9, ln: -0.04, lL: 0.3, lR: -0.16, two: 1, lv: 0.2 },
        { t: 0.52, e: 'io', ty: 0.98 },
        { t: 0.57, e: 'in', aR: -1.35, aRz: -0.12, ty: -0.28, ln: 0.16, lL: 0.42, lR: -0.42, lv: 1, wp: 0.05 },
        { t: 0.76, e: 'out', ty: -0.34 },
        { t: 1, e: 'io', reset: true },
      ],
    },
    {
      // 3. Invocation: raise the staff high in both hands, then bring the head down onto the line.
      dur: 1, hit: 0.6, side: 1, cancel: 0.84, window: 0.4, lunge: [2.2, 0.5, 0.64],
      keys: [
        { t: 0.34, e: 'out', aR: -2.8, aRz: 0.08, aL: -2.6, eR: 0.3, ln: -0.18, hp: -0.22, lL: 0.12, lR: -0.06, two: 1, lv: 0, wp: -0.2 },
        { t: 0.52, e: 'io', aR: -2.95, aL: -2.75, ln: -0.22, hp: -0.25 },
        { t: 0.57, e: 'in', aR: -1.35, aL: -1.2, eR: 0, ln: 0.26, cr: 0.08, lL: 0.62, lR: -0.6, hp: 0.06, lv: 1, wp: 0.12 },
        { t: 0.76, e: 'out', ln: 0.24, cr: 0.09 },
        { t: 1, e: 'io', reset: true },
      ],
    },
  ],

  /* Wand: wrist-led flicks, the free hand (and any grimoire) held forward. */
  wand: [
    {
      // 1. Cocked flick: wand back by the ear, snapped straight down the line.
      dur: 1, hit: 0.55, side: 1, cancel: 0.78, window: 0.45, aimMode: 'dir',
      keys: [
        { t: 0.3, e: 'out', aR: -2.1, aRz: 0.2, eR: 1.3, aL: -0.9, ty: 0.42, ln: -0.06, lL: 0.28, lR: -0.12, wp: -0.4 },
        { t: 0.5, e: 'io', aR: -2.2, eR: 1.4, ty: 0.46 },
        { t: 0.53, e: 'in', aR: -1.5, aRz: 0, eR: 0.02, ty: -0.22, ln: 0.12, lL: 0.4, lR: -0.36, aim: 1, lv: 1, wp: 0 },
        { t: 0.7, e: 'out', ty: -0.26 },
        { t: 1, e: 'io', reset: true },
      ],
    },
    {
      // 2. Backhand cut: from across the body out to the target.
      dur: 1, hit: 0.55, side: -1, cancel: 0.78, window: 0.45, aimMode: 'dir',
      keys: [
        { t: 0.3, e: 'out', aR: -1.15, aRz: -0.95, eR: 0.5, aL: -0.7, ty: -0.62, lL: 0.2, lR: -0.24 },
        { t: 0.5, e: 'io', aRz: -1.02, ty: -0.68 },
        { t: 0.53, e: 'in', aR: -1.5, aRz: 0.18, eR: 0, ty: 0.18, ln: 0.1, lL: 0.32, lR: -0.38, aim: 1, lv: 1 },
        { t: 0.7, e: 'out', ty: 0.22 },
        { t: 1, e: 'io', reset: true },
      ],
    },
    {
      // 3. Flourish: a circle overhead, then a full-arm point with a step in.
      dur: 1, hit: 0.55, side: 1, cancel: 0.8, window: 0.4, aimMode: 'dir', lunge: [2.4, 0.45, 0.6],
      keys: [
        { t: 0.24, e: 'out', aR: -2.65, aRz: 0.32, eR: 0.3, aL: -1.2, ln: -0.12, hp: -0.16, lL: 0.2, lR: -0.1 },
        { t: 0.4, e: 'io', aR: -2.75, aRz: -0.32, ty: 0.25 },
        { t: 0.5, e: 'io', aR: -2.4, aRz: 0.1, ty: 0.32 },
        { t: 0.53, e: 'in', aR: -1.5, aRz: 0, eR: 0, ty: -0.2, ln: 0.18, cr: 0.05, hp: 0.02, lL: 0.56, lR: -0.54, aim: 1, lv: 1 },
        { t: 0.72, e: 'out', ln: 0.16 },
        { t: 1, e: 'io', reset: true },
      ],
    },
  ],
};

/* ------------------------------------------------------------------ */
/* resolution                                                         */
/* ------------------------------------------------------------------ */

function resolve(style, steps) {
  const guard = { ...ZERO, ...GUARD[style] };
  return steps.map((step) => {
    const keys = [{ t: 0, e: 'lin', p: guard }];
    let prev = guard;
    for (const k of step.keys) {
      const { t, e, reset, ...vals } = k;
      const p = { ...(reset ? guard : prev), ...vals };
      keys.push({ t, e: e || 'io', p });
      prev = p;
    }
    return { ...step, style, guard, keys };
  });
}

const RESOLVED = Object.fromEntries([...Object.entries(COMBOS), ...Object.entries(RANGED)].map(([k, v]) => [k, resolve(k, v)]));

/** Which shooting/casting set a ranged weapon uses. */
export function rangedStyle(item = {}, heldKind = item.held || '') {
  const held = String(heldKind || item.held || item.id || '').toLowerCase();
  const style = String(item.style || '').toLowerCase();
  if (/crossbow|gun/.test(held) || style === 'crossbow') return 'crossbow';
  if (/shortbow/.test(held) || style === 'shortbow') return 'shortbow';
  if (/bow/.test(held) || style.includes('bow')) return 'longbow';
  if (/staff/.test(held) || style === 'staff') return 'staff';
  return 'wand';
}

/** Which combo set a melee weapon uses. */
export function comboStyle(item = {}, heldKind = item.held || '') {
  const held = String(heldKind || item.held || item.id || '').toLowerCase();
  const style = String(item.style || '').toLowerCase();
  if (/scythe/.test(held)) return 'scythe';
  if (/spear|pike|lance/.test(held)) return 'spear';
  if (/claws/.test(held)) return 'claws';
  if (/dual/.test(held) || style === 'dual') return 'dual';
  if (/hammer|maul/.test(held)) return 'hammer';
  if (/greatsword|cleaver|axe/.test(held) || style === 'twohand') return 'greatsword';
  return 'sword';
}

/** The step of a weapon's combo (0, 1 or 2). */
export function comboStep(item, heldKind, combo) {
  const style = item?.kind === 'ranged' ? rangedStyle(item, heldKind) : comboStyle(item, heldKind);
  const set = RESOLVED[style] || RESOLVED.sword;
  return set[((combo % 3) + 3) % 3];
}

/** Guard pose of a combo style. */
export function comboGuard(style) {
  return (RESOLVED[style] || RESOLVED.sword)[0].guard;
}

/** Pose channels of a step at normalised time tt. Writes into `out`. */
export function sampleStep(step, tt, out = {}) {
  const keys = step.keys;
  const t = Math.min(1, Math.max(0, tt));
  let i = 1;
  while (i < keys.length - 1 && keys[i].t < t) i++;
  const a = keys[i - 1];
  const b = keys[i];
  const span = Math.max(1e-4, b.t - a.t);
  const u = Math.min(1, Math.max(0, (t - a.t) / span));
  const k = (EASE[b.e] || EASE.io)(u);
  for (const c of CHANNELS) out[c] = a.p[c] + (b.p[c] - a.p[c]) * k;
  return out;
}

/** Forward drive of a step at normalised time tt (world units per second). */
export function stepLunge(step, tt) {
  const l = step.lunge;
  if (!l) return 0;
  const [speed, from, to] = l;
  if (tt <= from || tt >= to) return 0;
  // Bell-shaped push: the step accelerates in and plants before recovery.
  const u = (tt - from) / (to - from);
  return speed * Math.sin(Math.PI * u) * 1.25;
}

export { COMBOS, RANGED, GUARD };
