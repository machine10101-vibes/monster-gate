/**
 * HUD geometry used by CSS variables and the collision tests.
 * Menu buttons live in one right-edge column. The quest tracker is a
 * collapsed chip by default, sitting beside the minimap on touch.
 */

export const MENU_COUNT = 11;
export const QUEST_KEY = 'mg-quest-open';
export const ACTION_GAP = 8;
export const MENU_INSET = 4;
export const CLOCK_GAP = 8;
export const CLOCK_W = 78;
export const CLOCK_H = 34;
export const QUEST_MAX_W = 340;
export const TOUCH_ATTACK_W = 84;

export const HUD_VIEWPORTS = [
  { name: 'phone-landscape', w: 844, h: 390, touch: true },
  { name: 'phone-portrait', w: 390, h: 844, touch: true },
  { name: 'laptop', w: 1280, h: 800, touch: false },
  { name: 'desktop', w: 1920, h: 1080, touch: false },
];

export function fitMenuButtons(h, { touch = false, count = MENU_COUNT, pad = 12 } = {}) {
  const minSize = touch ? 32 : 28;
  const maxSize = touch ? 40 : 44;
  const gaps = Math.max(0, count - 1);
  const inner = Math.max(minSize, h - pad * 2);
  let size = maxSize;
  let gap = touch ? 4 : 8;
  const fits = (s, g) => s * count + Math.max(0, g) * gaps <= inner + 0.01;
  while (!fits(size, gap) && size > minSize) size -= 1;
  if (!fits(size, gap) && gaps) {
    gap = Math.max(touch ? 2 : 3, Math.floor((inner - size * count) / gaps));
  }
  if (!fits(size, gap) && gaps) {
    gap = Math.max(0, Math.floor((inner - size * count) / gaps));
  }
  if (!fits(size, gap)) {
    size = Math.max(minSize, Math.floor((inner - Math.max(0, gap) * gaps) / count));
  }
  const height = size * count + Math.max(0, gap) * gaps;
  return { size, gap: Math.max(0, gap), colW: size, height };
}

export function rect(id, x, y, w, h) {
  return { id, x, y, w, h };
}

/** Axis-aligned overlap. Touching edges is allowed; a positive area is not. */
export function overlap(a, b, pad = 0.5) {
  return a.x < b.x + b.w - pad && a.x + a.w > b.x + pad && a.y < b.y + b.h - pad && a.y + a.h > b.y + pad;
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
  const minimap = touch
    ? rect('minimap', 8, 6, mm, mm)
    : rect('minimap', 8, h - 8 - mm, mm, mm);

  const questCap = Math.min(QUEST_MAX_W, Math.floor(w * 0.45), w - menu.colW - (touch ? mm + 28 : 32));
  const questMax = Math.max(96, questCap);
  const questW = questOpen ? questMax : 96;
  const questH = questOpen ? Math.min(160, Math.max(92, Math.floor(h * 0.32))) : 28;
  const quest = touch
    ? rect('quest', 8 + mm + 8, 6, questW, questH)
    : rect('quest', 8, 8, questW, questH);

  const hotScale = touch ? 0.86 : 1;
  const clusterW = 520 * hotScale;
  const clusterH = touch ? 86 * hotScale : 190;
  const hotbar = rect('hotbar', w / 2 - clusterW / 2, h - 4 - clusterH, clusterW, clusterH);
  const hearts = rect('hearts', w / 2 - 90 * hotScale, h - 4 - clusterH, 180 * hotScale, 22);

  let menuY = h - 6 - menu.height;
  const menuCol = rect('menu', colX, menuY, menu.colW, menu.height);
  if (overlap(menuCol, hotbar) || overlap(menuCol, hearts)) {
    menuY = Math.max(4, hotbar.y - 4 - menu.height);
    menuCol.y = menuY;
  }

  const ui = Math.max(1, Math.min(1.5, h / 820));
  const bubbleW = short ? 180 : 220;
  const bubbleH = (short ? 160 : 190) * ui;
  const bubbleBottom = touch && w <= 1100 ? 90 : 18;
  const bubbles = touch
    ? rect('bubbles', w - MENU_INSET - menu.colW - ACTION_GAP - bubbleW, h - bubbleBottom - bubbleH, bubbleW, bubbleH)
    : null;

  const chatW = short && touch ? Math.min(240, w * 0.36) : 80;
  const chatH = 36;
  let chat;
  if (touch && short) {
    chat = rect('chat', 8 + mm + 8, h - 90 - 118 - 12 - chatH, chatW, chatH);
  } else if (touch) {
    chat = rect('chat', 8, 6 + mm + 12, chatW, chatH);
  } else {
    chat = rect('chat', 8, h - 8 - mm - 12 - chatH, chatW, chatH);
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
  el.style.setProperty('--hud-clear-bottom', `${clear}px`);
  el.style.setProperty('--hud-menu-bottom', `${menuBottom}px`);
  el.style.setProperty('--hud-action-gap', `${ACTION_GAP}px`);
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
  const scale = short ? ui * 0.92 : ui;
  const boxW = short ? 180 : 220;
  const boxH = short ? 160 : 190;
  const bottom = w <= 1100 ? 90 : 18;
  const right = MENU_INSET + menu.colW + ACTION_GAP;
  const visualW = boxW * scale;
  const visualH = boxH * scale;
  const cluster = rect('cluster', w - right - visualW, h - bottom - visualH, visualW, visualH);
  const attackW = TOUCH_ATTACK_W * scale;
  const attackH = TOUCH_ATTACK_W * scale;
  const attack = rect('attack', cluster.x + cluster.w - attackW, cluster.y + cluster.h - attackH, attackW, attackH);
  const menuRect = rect('menu', w - MENU_INSET - menu.colW, h - 6 - menu.height, menu.colW, menu.height);
  const gap = menuRect.x - (attack.x + attack.w);
  return { menu: menuRect, cluster, attack, gap, scale, right };
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
