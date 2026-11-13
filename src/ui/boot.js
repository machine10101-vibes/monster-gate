/**
 * Brand loading screen. The clip already carries the MONSTERGATE .online logo,
 * so we play it once and hold a clean mid-shot instead of looping the crop.
 */

export const LOAD_MIN_MS = 1500;
export const LOAD_HOLD_AT = 3.55;
export const LOAD_CROP_AT = 4.25;
export const LOAD_FADE_MS = 420;
export const LOAD_TIP_MS = 3200;
export const LOAD_EMBER_MAX = 22;
export const LOAD_EMBER_MOBILE = 10;

export const LOAD_TIPS = [
  'A Monster Gate opened in the northern forest.',
  'Chickens will not fight back. Most things will.',
  'Press F to talk, mine, fish, or chop.',
  'The guild board in Oakhollow pays gold and skill XP.',
  'Hold Shift to raise a shield. Roll with space.',
];

export function prefersReducedMotion(win = globalThis) {
  try {
    return !!win.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  } catch {
    return false;
  }
}

export function remainMinDisplay(startedAt, now = Date.now(), minMs = LOAD_MIN_MS) {
  return Math.max(0, minMs - (Number(now) - Number(startedAt)));
}

export function nextTip(index, tips = LOAD_TIPS) {
  const list = tips?.length ? tips : LOAD_TIPS;
  return list[((index >>> 0) % list.length + list.length) % list.length];
}

/** Pause on the full-logo fire-eyes frame before the camera crops the wordmark. */
export function holdVideoAtLogo(video, { holdAt = LOAD_HOLD_AT, cropAt = LOAD_CROP_AT } = {}) {
  if (!video) return false;
  const t = Number(video.currentTime) || 0;
  const ended = !!video.ended;
  if (!ended && t + 0.04 < holdAt && t + 0.04 < cropAt) return false;
  try {
    video.pause();
    if (typeof video.currentTime === 'number') video.currentTime = holdAt;
  } catch {
    /* some browsers reject seeks while HAVE_NOTHING */
  }
  return true;
}

export function setLoadProgress(fill, textEl, p, t) {
  const pct = Math.max(0, Math.min(1, Number(p) || 0));
  if (fill?.style) fill.style.width = `${Math.round(pct * 100)}%`;
  if (fill?.parentElement) fill.parentElement.setAttribute('aria-valuenow', String(Math.round(pct * 100)));
  if (textEl && t != null) textEl.textContent = t;
  return pct;
}

export function emberCount({ mobile = false, reduced = false } = {}) {
  if (reduced) return 0;
  return mobile ? LOAD_EMBER_MOBILE : LOAD_EMBER_MAX;
}

function spawnEmbers(layer, n, createEl) {
  if (!layer) return;
  layer.replaceChildren();
  const make = createEl || ((tag) => document.createElement(tag));
  for (let i = 0; i < n; i++) {
    const e = make('i');
    e.className = 'load-ember';
    e.style.left = `${(i * 37 + 11) % 100}%`;
    e.style.animationDelay = `${(i * 0.23) % 4.8}s`;
    e.style.animationDuration = `${5.5 + (i % 5) * 0.7}s`;
    e.style.setProperty('--ember-x', `${((i * 13) % 40) - 20}px`);
    layer.appendChild(e);
  }
}

/**
 * Enhance #loading. Video is already in the markup so it can autoplay
 * while the rest of the bundle parses.
 */
export function mountLoading(root = globalThis.document, opts = {}) {
  const doc = root?.getElementById ? root : root?.document;
  const el = doc?.getElementById?.('loading');
  if (!el) return null;
  const video = doc.getElementById('load-video');
  const tipEl = doc.getElementById('load-tip');
  const embers = doc.getElementById('load-embers');
  const reduced = opts.reduced ?? prefersReducedMotion(opts.win || globalThis);
  const mobile = opts.mobile ?? (typeof matchMedia === 'function' && matchMedia('(max-width: 900px), (max-height: 520px)').matches);
  const startedAt = opts.now ?? Date.now();
  const fadeMs = opts.fadeMs ?? LOAD_FADE_MS;
  let tipIndex = 0;
  let tipTimer = 0;
  let held = false;

  el.classList.toggle('reduced', reduced);
  spawnEmbers(embers, emberCount({ mobile, reduced }), (tag) => doc.createElement(tag));

  const hold = () => {
    if (reduced || held) return;
    if (holdVideoAtLogo(video)) {
      held = true;
      el.classList.add('held');
    }
  };

  if (reduced) {
    try { video?.pause?.(); } catch { /* ignore */ }
  } else if (video) {
    video.loop = false;
    video.muted = true;
    video.playsInline = true;
    video.addEventListener('timeupdate', hold);
    video.addEventListener('ended', hold);
    const play = video.play?.();
    if (play && typeof play.catch === 'function') play.catch(() => { el.classList.add('held'); });
  }

  if (tipEl) {
    tipEl.textContent = nextTip(0);
    if (!reduced) {
      tipTimer = (opts.setInterval || setInterval)(() => {
        tipIndex += 1;
        tipEl.textContent = nextTip(tipIndex);
      }, LOAD_TIP_MS);
    }
  }

  const fill = doc.getElementById('load-fill');
  const text = doc.getElementById('load-text');

  return {
    el,
    startedAt,
    setProgress(p, t) { return setLoadProgress(fill, text, p, t); },
    async dismiss({ now, wait = remainMinDisplay } = {}) {
      const delay = wait(startedAt, now ?? Date.now());
      if (delay > 0) await new Promise((r) => setTimeout(r, delay));
      el.classList.add('fading');
      if (fadeMs > 0) await new Promise((r) => setTimeout(r, fadeMs));
      el.classList.add('hidden');
      el.setAttribute('aria-hidden', 'true');
      try { video?.pause?.(); } catch { /* ignore */ }
      if (tipTimer) (opts.clearInterval || clearInterval)(tipTimer);
      return true;
    },
  };
}
