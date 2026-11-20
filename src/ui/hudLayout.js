/**
 * HUD geometry used by CSS variables and the collision tests.
 * Menu buttons live on the right edge (one column, or two on short
 * phones). The quest tracker is a collapsed chip by default, sitting
 * beside the minimap on touch.
 */

export const MENU_COUNT = 11;
export const QUEST_KEY = 'mg-quest-open';
export const ACTION_GAP = 8;
export const MENU_INSET = 4;
export const CLOCK_GAP = 8;
export const CLOCK_W = 78;
export const CLOCK_H = 34;
export const QUEST_MAX_W = 240;
export const TOUCH_ATTACK_W = 84;

export const HUD_VIEWPORTS = [
  { name: 'phone-landscape', w: 844, h: 390, touch: true },
  { name: 'phone-portrait', w: 390, h: 844, touch: true },
  { name: 'laptop', w: 1280, h: 800, touch: false },
  { name: 'desktop', w: 1920, h: 1080, touch: false },
];

export function fitMenuButtons(h, { touch = false, count = MENU_COUNT, pad = 12 } = {}) {
  const short = touch && h <= 500;
  const cols = short ? 2 : 1;
  const rows = Math.ceil(count / cols);
  const minSize = touch ? (short ? 28 : 32) : 28;
  const maxSize = touch ? 40 : 44;
  const gaps = Math.max(0, rows - 1);
  const inner = Math.max(minSize, h - pad * 2 - (short ? 24 : 0));
  let size = maxSize;
  let gap = touch ? 4 : 8;
  const fits = (s, g) => s * rows + Math.max(0, g) * gaps <= inner + 0.01;
  while (!fits(size, gap) && size > minSize) size -= 1;
  if (!fits(size, gap) && gaps) {
    gap = Math.max(touch ? 2 : 3, Math.floor((inner - size * rows) / gaps));
  }
  if (!fits(size, gap) && gaps) {
    gap = Math.max(0, Math.floor((inner - size * rows) / gaps));
  }
  if (!fits(size, gap)) {
    size = Math.max(minSize, Math.floor((inner - Math.max(0, gap) * gaps) / rows));
  }
  const height = size * rows + Math.max(0, gap) * gaps;
  const colW = size * cols + (cols > 1 ? Math.max(0, gap) : 0);
  return { size, gap: Math.max(0, gap), colW, height, cols, rows };
}

export function rect(id, x, y, w, h) {
  return { id, x, y, w, h };
}

/** Axis-aligned overlap. Touching edges is allowed; a positive area is not. */
export function overlap(a, b, pad = 0.5) {
  return a.x < b.x + b.w - pad && a.x + a.w > b.x + pad && a.y < b.y + b.h - pad && a.y + a.h > b.y + pad;
}

/**
 * CSS px box for a nameplate whose `left/top` is the world anchor and whose
 * style is `transform: translate(-50%, -100%)`.
 */
export function plateAnchorRect(x, y, w, h) {
  const width = Math.max(1, Number(w) || 0);
  const height = Math.max(1, Number(h) || 0);
  return { x: x - width / 2, y: y - height, w: width, h: height };
}

/**
 * Visual CSS-px size of a nameplate, including a subtitle that can sit
 * outside the parent's border box.
 */
export function measurePlateSize(el, fallback = { w: 200, h: 40 }) {
  const fw = Number.isFinite(Number(fallback.w)) && Number(fallback.w) > 0 ? Number(fallback.w) : 200;
  const fh = Number.isFinite(Number(fallback.h)) && Number(fallback.h) > 0 ? Number(fallback.h) : 40;
  if (!el?.getBoundingClientRect) return { w: fw, h: fh };
  const box = el.getBoundingClientRect();
  let w = Number(box.width) || 0;
  let h = Number(box.height) || 0;
  const left = Number(box.left) || 0;
  const top = Number(box.top) || 0;
  for (const node of el.children || []) {
    const c = node.getBoundingClientRect?.();
    if (!c || c.width < 1 || c.height < 1) continue;
    w = Math.max(w, c.right - left, c.width);
    h = Math.max(h, c.bottom - top);
  }
  return { w: w > 0 ? w : fw, h: h > 0 ? h : fh };
}

/** HUD chrome that world labels must not cover. Measured in CSS px. */
export const HUD_SAFE_IDS = [
  'minimap-wrap',
  'center-bottom',
  'bar-wrap',
  'hotbar',
  'hearts-row',
  'quest',
  'menu-col',
  'touch-btns',
  'tb-talk',
  'stick',
  'hud-corner-right',
  'top-right',
  'clock',
  'btn-fs',
  'btn-snd',
  'debug-badge',
  'world-status',
  'world-status-slot',
  'world-mode-pill',
  'world-chat',
  'cast-buttons',
  'hints',
];

/** Keep labels out of the band just above the hearts / hotbar fade. */
export const HUD_SAFE_PAD = 16;
export const HUD_HOTBAR_FADE = 24;

export function hudSafeMargin(height) {
  const h = Number(height);
  if (Number.isFinite(h) && h > 500) return 14;
  return HUD_SAFE_PAD;
}

export function inflateRect(r, pad, extra = {}) {
  const top = pad + (Number(extra.top) || 0);
  const right = pad + (Number(extra.right) || 0);
  const bottom = pad + (Number(extra.bottom) || 0);
  const left = pad + (Number(extra.left) || 0);
  return {
    id: r.id,
    x: r.x - left,
    y: r.y - top,
    w: r.w + left + right,
    h: r.h + top + bottom,
  };
}

export function padHudSafeRects(rects, pad = HUD_SAFE_PAD) {
  const m = Number(pad);
  const margin = Number.isFinite(m) ? m : HUD_SAFE_PAD;
  return (rects || []).map((r) => {
    const hotbar = r.id === 'center-bottom' || r.id === 'hotbar' || r.id === 'bar-wrap' || r.id === 'hearts-row';
    return inflateRect(r, margin, hotbar ? { top: HUD_HOTBAR_FADE } : {});
  });
}

export function measureHudSafeRects(doc = typeof document !== 'undefined' ? document : null, opts = {}) {
  if (!doc?.getElementById) return [];
  const out = [];
  for (const id of HUD_SAFE_IDS) {
    const el = doc.getElementById(id);
    if (!el) continue;
    if (el.hidden || el.classList.contains('hidden')) continue;
    const r = el.getBoundingClientRect?.();
    if (!r || r.width < 4 || r.height < 4) continue;
    out.push({ id, x: r.x, y: r.y, w: r.width, h: r.height });
  }
  const h = opts.height ?? doc.defaultView?.innerHeight ?? doc.documentElement?.clientHeight;
  const pad = opts.pad ?? hudSafeMargin(h);
  return padHudSafeRects(out, pad);
}

export function nameplateHitsHud(plate, safe, pad = 0.5) {
  if (!plate || !safe?.length) return false;
  return safe.some((s) => overlap(plate, s, pad));
}

/** Hide labels that cross the viewport chrome, with a small inset. */
export const VIEWPORT_PLATE_INSET = 4;

export function nameplateOutsideViewport(plate, vp, inset = VIEWPORT_PLATE_INSET) {
  if (!plate || !vp) return false;
  const pad = Number.isFinite(Number(inset)) ? Number(inset) : VIEWPORT_PLATE_INSET;
  const w = Number(vp.w);
  const h = Number(vp.h);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w < 2 || h < 2) return false;
  return plate.x < pad || plate.y < pad || plate.x + plate.w > w - pad || plate.y + plate.h > h - pad;
}

/**
 * Shift a bottom-center plate anchor so its visual box misses `rects`
 * (and the viewport inset). Prefers right of the blocker, then left, then
 * above. Returns the original point when it already clears.
 */
export function nudgeAnchorOffRects(anchorX, anchorY, w, h, rects, vp, gap = 8) {
  const ax = Number(anchorX) || 0;
  const ay = Number(anchorY) || 0;
  const width = Math.max(1, Number(w) || 1);
  const height = Math.max(1, Number(h) || 1);
  const air = Number.isFinite(Number(gap)) ? Number(gap) : 8;
  const boxAt = (x, y) => plateAnchorRect(x, y, width, height);
  const inVp = (b) => !vp || !nameplateOutsideViewport(b, vp);
  const misses = (b, list) => !nameplateHitsHud(b, list) && inVp(b);
  if (misses(boxAt(ax, ay), rects)) return { x: ax, y: ay, moved: false };

  const blockers = Array.isArray(rects) ? rects : [];
  const chat = blockers.filter((r) => r.id === 'world-chat');
  const candidates = [];
  for (const r of blockers) {
    candidates.push({ x: r.x + r.w + air + width / 2, y: ay });
    candidates.push({ x: r.x - air - width / 2, y: ay });
    candidates.push({ x: ax, y: r.y - air });
    candidates.push({ x: r.x + r.w + air + width / 2, y: r.y - air });
    candidates.push({ x: r.x - air - width / 2, y: r.y - air });
  }
  for (const c of candidates) {
    if (misses(boxAt(c.x, c.y), blockers)) return { x: c.x, y: c.y, moved: true };
  }
  if (chat.length) {
    for (const c of candidates) {
      if (misses(boxAt(c.x, c.y), chat)) return { x: c.x, y: c.y, moved: true };
    }
  }
  let x = ax;
  let y = ay;
  if (vp) {
    const pad = VIEWPORT_PLATE_INSET;
    const b = boxAt(x, y);
    if (b.x < pad) x += pad - b.x;
    if (b.x + b.w > vp.w - pad) x -= b.x + b.w - (vp.w - pad);
    if (b.y < pad) y += pad - b.y;
    if (b.y + b.h > vp.h - pad) y -= b.y + b.h - (vp.h - pad);
  }
  return { x, y, moved: x !== ax || y !== ay };
}

/**
 * Offset overlapping world labels using real CSS-px boxes. Near labels stay;
 * farther ones lift until they clear, then hide if they still collide.
 */
/** Extra air between stacked world labels (covers subtitle + text-shadow). */
export const PLATE_STACK_GAP = 16;

/**
 * True when two plate boxes are closer than `gap` on all four sides.
 * Inflates each rect by half-gap (same as inflating one by the full gap)
 * so side-by-side labels collide, not only vertically stacked ones.
 */
export function platesCollide(a, b, gap = PLATE_STACK_GAP) {
  const raw = Number(gap);
  const pad = Number.isFinite(raw) ? raw : PLATE_STACK_GAP;
  const half = pad / 2;
  return overlap(inflateRect(a, half), inflateRect(b, half), 0.5);
}

export function stackNameplates(rows, opts = {}) {
  const gap = opts.gap ?? PLATE_STACK_GAP;
  const maxLift = opts.maxLift ?? 8;
  const fallbackW = opts.defaultW ?? 200;
  const fallbackH = opts.defaultH ?? 40;
  const sorted = rows.slice().sort((a, b) => (a.d ?? 999) - (b.d ?? 999));
  const used = [];
  const sizeOf = (t) => ({
    w: Number.isFinite(Number(t.w)) && Number(t.w) > 0 ? Number(t.w) : fallbackW,
    h: Number.isFinite(Number(t.h)) && Number(t.h) > 0 ? Number(t.h) : fallbackH,
  });
  const rectAt = (t, y) => {
    const { w, h } = sizeOf(t);
    return plateAnchorRect(t.x, y, w, h);
  };
  const collides = (r) => used.some((u) => platesCollide(r, u, gap));
  const out = [];
  for (const t of sorted) {
    const { w, h } = sizeOf(t);
    const step = opts.dy ?? h + gap;
    let y = t.y;
    let n = 0;
    let r = rectAt(t, y);
    while (n < maxLift && collides(r)) {
      y -= step;
      r = rectAt(t, y);
      n += 1;
    }
    if (collides(r) || r.y < -h) {
      out.push({ ...t, w, h, y: t.y, visible: false, rect: rectAt(t, t.y) });
      continue;
    }
    used.push(r);
    out.push({ ...t, w, h, y, visible: true, rect: r });
  }
  return out;
}

export function overlapsOf(items, pairs) {
  const hits = [];
  for (const [a, b] of pairs) {
    const A = items[a];
    const B = items[b];
    if (A && B && overlap(A, B)) hits.push(`${a}×${b}`);
  }
  return hits;
}

/**
 * Layout rectangles for a viewport. Quest uses the collapsed chip.
 * Chat uses the collapsed toggle. `--ui` is treated as 1.
 */
export function hudRects(vp, { questOpen = false } = {}) {
  const w = vp.w;
  const h = vp.h;
  const touch = !!vp.touch;
  const short = h <= 500;
  const menu = fitMenuButtons(h, { touch });
  const colX = w - MENU_INSET - menu.colW;

  const mmScale = touch ? 0.78 : 1;
  const mm = 142 * mmScale;
  const minimap = rect('minimap', 8, 6, mm, mm);

  const questCap = Math.min(QUEST_MAX_W, Math.floor(w * 0.36), w - menu.colW - (mm + 28));
  const questMax = Math.max(72, questCap);
  const questW = questOpen ? questMax : 72;
  const questH = questOpen ? Math.min(120, Math.max(72, Math.floor(h * 0.26))) : 22;
  const quest = rect('quest', 8 + mm + 8, 6, questW, questH);

  const hotScale = touch ? (short ? 0.78 : 0.86) : 1;
  const clusterW = (short && touch ? 460 : 520) * hotScale;
  const clusterH = touch ? 86 * hotScale : 190;
  const hotShift = short && touch ? 36 : 0;
  const hotbar = rect('hotbar', w / 2 - clusterW / 2 - hotShift, h - 4 - clusterH, clusterW, clusterH);
  const hearts = rect('hearts', w / 2 - 90 * hotScale, h - 4 - clusterH, 180 * hotScale, 22);

  let menuY = h - 6 - menu.height;
  const menuCol = rect('menu', colX, menuY, menu.colW, menu.height);
  if (overlap(menuCol, hotbar) || overlap(menuCol, hearts)) {
    menuY = Math.max(4, hotbar.y - 4 - menu.height);
    menuCol.y = menuY;
  }

  const ui = Math.max(1, Math.min(1.5, h / 820));
  const actGap = short ? 14 : ACTION_GAP;
  const bubbleW = short ? 180 : 220;
  const bubbleH = (short ? 160 : 190) * ui;
  const bubbleBottom = touch && w <= 1100 ? 90 : 18;
  const bubbles = touch
    ? rect('bubbles', w - MENU_INSET - menu.colW - actGap - bubbleW, h - bubbleBottom - bubbleH, bubbleW, bubbleH)
    : null;

  const chatW = short && touch ? Math.min(240, w * 0.36) : 80;
  const chatH = 36;
  let chat;
  if (touch && short) {
    chat = rect('chat', 8 + mm + 8, h - 90 - 118 - 12 - chatH, chatW, chatH);
  } else if (touch) {
    chat = rect('chat', 8, 6 + mm + 12, chatW, chatH);
  } else {
    chat = rect('chat', 8, h - 8 - chatH, chatW, chatH);
  }

  const clockRight = MENU_INSET + menu.colW + CLOCK_GAP;
  const clock = rect('clock', w - clockRight - CLOCK_W, 8, CLOCK_W, CLOCK_H);
  const debugW = 88;
  const debugH = 28;
  const debug = rect('debug', w - clockRight - debugW, 8 + CLOCK_H + CLOCK_GAP, debugW, debugH);

  const out = { menu: menuCol, minimap, quest, hotbar, hearts, chat, clock, debug };
  if (bubbles) out.bubbles = bubbles;
  out.menuFit = menu;
  return out;
}

export const HUD_CLEAR_PAIRS = [
  ['menu', 'hotbar'],
  ['menu', 'hearts'],
  ['menu', 'minimap'],
  ['menu', 'quest'],
  ['menu', 'chat'],
  ['menu', 'bubbles'],
  ['menu', 'clock'],
  ['menu', 'debug'],
  ['clock', 'debug'],
  ['quest', 'minimap'],
  ['chat', 'minimap'],
  ['chat', 'quest'],
];

export function dialogClearance(vp) {
  const rects = hudRects(vp);
  let fromBottom = vp.h - rects.hotbar.y + 20;
  if (rects.bubbles) fromBottom = Math.max(fromBottom, vp.h - rects.bubbles.y + 24);
  return Math.ceil(fromBottom);
}

export function applyHudLayout(el, vp) {
  if (!el?.style) return fitMenuButtons(vp.h, { touch: vp.touch });
  const menu = fitMenuButtons(vp.h, { touch: vp.touch });
  const rects = hudRects(vp);
  const clear = dialogClearance(vp);
  const menuBottom = Math.max(6, vp.h - (rects.menu.y + rects.menu.h));
  el.style.setProperty('--menu-btn', `${menu.size}px`);
  el.style.setProperty('--menu-gap', `${menu.gap}px`);
  el.style.setProperty('--menu-col-w', `${menu.colW}px`);
  el.style.setProperty('--menu-cols', String(menu.cols || 1));
  el.style.setProperty('--hud-clear-bottom', `${clear}px`);
  el.style.setProperty('--hud-menu-bottom', `${menuBottom}px`);
  el.style.setProperty('--hud-action-gap', `${vp.h <= 500 ? 14 : ACTION_GAP}px`);
  if (el.dataset) el.dataset.menuCols = String(menu.cols || 1);
  el.style.setProperty('--hud-menu-inset', `${MENU_INSET}px`);
  el.style.setProperty('--hud-clock-gap', `${CLOCK_GAP}px`);
  return menu;
}

/**
 * CSS-equivalent bounding rects for the touch action cluster vs #menu-col.
 * Origin is bottom-right, so scale does not eat the gap on the menu side.
 */
export function touchActionRects(vp) {
  const w = vp.w;
  const h = vp.h;
  const menu = fitMenuButtons(h, { touch: true });
  const short = h <= 500;
  const ui = Math.max(1, Math.min(1.5, h / 820));
  const scale = short ? ui * 0.82 : ui;
  const boxW = 220;
  const boxH = short ? 200 : 190;
  const bottom = w <= 1100 ? 90 : 18;
  const right = MENU_INSET + menu.colW + (short ? 14 : ACTION_GAP);
  const visualW = boxW * scale;
  const visualH = boxH * scale;
  const cluster = rect('cluster', w - right - visualW, h - bottom - visualH, visualW, visualH);
  const attackW = TOUCH_ATTACK_W * scale;
  const attackH = TOUCH_ATTACK_W * scale;
  const attack = rect('attack', cluster.x + cluster.w - attackW, cluster.y + cluster.h - attackH, attackW, attackH);
  const menuRect = rect('menu', w - MENU_INSET - menu.colW, h - 6 - menu.height, menu.colW, menu.height);
  const gap = menuRect.x - (attack.x + attack.w);
  const talkW = 58 * scale;
  const talkH = 58 * scale;
  const talk = rect(
    'talk',
    cluster.x + (boxW - 150 - 58) * scale,
    cluster.y + (boxH - 130 - 58) * scale,
    talkW,
    talkH,
  );
  return { menu: menuRect, cluster, attack, talk, gap, scale, right, boxW, boxH };
}

export function readQuestOpen(store) {
  try {
    return (store || globalThis.localStorage)?.getItem(QUEST_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeQuestOpen(open, store) {
  try {
    (store || globalThis.localStorage)?.setItem(QUEST_KEY, open ? '1' : '0');
  } catch {
    /* private mode */
  }
}

/** Extra place-names drawn on the hunter Map that sit on top of a tile. */
export const PLAYMAP_LANDMARKS = new Set([
  'Monster Gate',
  'Greyrock Pit',
  "Tobin's Farm",
  'Mirrormere',
  'Darksycle Cave',
  'Darksycle Den',
]);

const CLUSTER = new Set(['Oakhollow', 'Southmead', 'Southford', 'Broadshire', 'Brookside']);

export function playmapLabelKind(label) {
  if (label?.city) return 'city';
  if (label?.landmark || PLAYMAP_LANDMARKS.has(label?.name)) return 'landmark';
  if (label?.uncharted) return 'uncharted';
  return 'minor';
}

const PLAYMAP_FRAME_PAD_PX = 56;
const PLAYMAP_MAX_PIN_PX = 30;
const PLAYMAP_HARD_PIN_PX = 52;

/** Cardinal sides first, then diagonals. Distances are scaled to stay near the pin. */
const PLAYMAP_SIDES = [
  [0, 0],
  [-1, 0], [1, 0], [0, -1], [0, 1],
  [-1, -1], [1, -1], [-1, 1], [1, 1],
];

const PLAYMAP_PIN_NUDGES = {
  'Monster Gate': [0, -1],
  'Greyrock Pit': [1, 0],
  Oakhollow: [0, -1],
  Harefield: [-1, 0],
  Northleas: [0, -1],
  Goldmead: [1, 0],
  Snowfall: [1, 0],
  Cinderfall: [-1, 0],
  Dawnspire: [1, 0],
  Hellspire: [0, -1],
  Bramblewood: [-1, 0],
  Runmouth: [-1, 0],
  Southmead: [0, -1],
  Southford: [0, 1],
  Broadshire: [1, 0],
  Brookside: [-1, 0],
  'The Lagoon': [1, 1],
  'Silverrun Canopy': [-1, -1],
};

const PLAYMAP_SIDE_NAME = {
  '0,0': '',
  '-1,0': 'w',
  '1,0': 'e',
  '0,-1': 'n',
  '0,1': 's',
  '-1,-1': 'nw',
  '1,-1': 'ne',
  '-1,1': 'sw',
  '1,1': 'se',
};

/**
 * Place Map labels inside the parchment (off the gold frame), within about
 * 30px of the pin. Collisions flip to left/right/above/below instead of a
 * long shove that can park a name on the frame or on the wrong biome.
 */
export function layoutPlaymapLabels(labels, opts = {}) {
  const mapW = Number(opts.mapW) > 0 ? Number(opts.mapW) : 720;
  const mapH = Number(opts.mapH) > 0 ? Number(opts.mapH) : 560;
  const padX = (PLAYMAP_FRAME_PAD_PX / mapW) * 100;
  const padY = (PLAYMAP_FRAME_PAD_PX / mapH) * 100;
  const list = (labels || []).map((label, i) => {
    const kind = playmapLabelKind(label);
    const font = kind === 'city' ? 14 : kind === 'landmark' ? 13 : kind === 'uncharted' ? 12 : 12;
    const name = String(label.name || '');
    const twoLine = /\s/.test(name) || name.length > 10;
    const bw = Math.min(mapW * 0.14, Math.max(36, name.length * font * (twoLine ? 0.52 : 0.62) + 14));
    const bh = font * (twoLine ? 2.6 : 1.55);
    return {
      ...label,
      i,
      kind,
      font,
      bw,
      bh,
      ax: Number(label.nx),
      ay: Number(label.ny),
      x: Number(label.nx),
      y: Number(label.ny),
      visible: true,
      lead: false,
      rank: kind === 'city' ? 0 : kind === 'landmark' ? 1 : kind === 'uncharted' ? 3 : 2,
    };
  });
  list.sort((a, b) => a.rank - b.rank || a.i - b.i);
  const used = [];
  const boxAt = (it, x, y) => ({
    x: (x / 100) * mapW - it.bw / 2,
    y: (y / 100) * mapH - it.bh / 2,
    w: it.bw,
    h: it.bh,
  });
  const blocked = (r) => used.some((u) => overlap(r, u, -2));
  const clampBox = (it, x, y) => {
    const halfW = (it.bw / 2 / mapW) * 100;
    const halfH = (it.bh / 2 / mapH) * 100;
    const loX = padX + halfW;
    const hiX = 100 - padX - halfW;
    const loY = padY + halfH;
    const hiY = 100 - padY - halfH;
    return {
      x: Math.min(hiX, Math.max(loX, x)),
      y: Math.min(hiY, Math.max(loY, y)),
    };
  };
  const clusters = list.filter((it) => it.kind === 'city' || CLUSTER.has(it.name));
  const nearCluster = (it) => clusters.some((c) => Math.hypot(it.ax - c.ax, it.ay - c.ay) < 9);
  for (const it of list) {
    if ((it.kind === 'minor' || it.kind === 'uncharted') && nearCluster(it) && !CLUSTER.has(it.name)) {
      it.visible = false;
      it.lead = false;
      it.x = it.ax;
      it.y = it.ay;
      continue;
    }
    const pin = PLAYMAP_PIN_NUDGES[it.name];
    const hugPin = it.kind === 'city' || it.kind === 'landmark';
    const offCenter = PLAYMAP_SIDES.filter(([dx, dy]) => dx || dy);
    const slots = pin ? [pin, ...offCenter] : hugPin ? offCenter : PLAYMAP_SIDES;
    const tryReach = (maxPx) => {
      const maxDx = (maxPx / mapW) * 100;
      const maxDy = (maxPx / mapH) * 100;
      const stepX = Math.min(maxDx, ((it.bw * 0.55 + 8) / mapW) * 100);
      const stepY = Math.min(maxDy, ((it.bh * 0.85 + 8) / mapH) * 100);
      for (let s = 0; s < slots.length; s++) {
        const [dx, dy] = slots[s];
        const c = clampBox(it, it.ax + dx * stepX, it.ay + dy * stepY);
        if (Math.hypot(c.x - it.ax, c.y - it.ay) > Math.hypot(maxDx, maxDy) + 0.15 && (dx || dy)) continue;
        const r = boxAt(it, c.x, c.y);
        if (blocked(r)) continue;
        it.x = c.x;
        it.y = c.y;
        it.side = PLAYMAP_SIDE_NAME[`${dx},${dy}`] || '';
        const d = Math.hypot(c.x - it.ax, c.y - it.ay);
        it.lead = !it.side && (it.kind === 'city' || it.kind === 'landmark') && it.uncharted !== true && it.charted !== false && d > 0.7 && d < 8;
        it.visible = true;
        used.push(r);
        return true;
      }
      return false;
    };
    let placed = tryReach(PLAYMAP_MAX_PIN_PX);
    if (!placed && (it.kind === 'city' || it.kind === 'landmark')) placed = tryReach(PLAYMAP_HARD_PIN_PX);
    if (!placed) {
      const c = clampBox(it, it.ax, it.ay);
      it.visible = it.kind === 'city';
      it.lead = false;
      it.x = c.x;
      it.y = c.y;
      if (it.visible) used.push(boxAt(it, it.x, it.y));
    }
  }
  list.sort((a, b) => a.i - b.i);
  return list;
}

/**
 * Inner map size after the Map panel chrome. Models the CSS contract:
 * `#panel.map-open .panel-card` has a real height (not only max-height) so
 * the contain/flex map is not a 0px speck.
 */
export function playmapPanelInner(vw, vh) {
  const w = Math.max(1, Number(vw) || 0);
  const h = Math.max(1, Number(vh) || 0);
  const short = h <= 520;
  const cardW = Math.min(920, short ? w : w * 0.96);
  const cardH = short ? h : Math.min(0.9 * h, 920);
  const chromeX = short ? 16 : 36;
  const chromeY = short ? 44 : 96;
  const innerW = Math.max(0, cardW - chromeX);
  const innerH = Math.max(0, cardH - chromeY);
  const map = Math.min(innerW, innerH);
  return { cardW, cardH, innerW, innerH, map };
}
