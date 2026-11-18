/**
 * Brand loading screen. The clip carries the MONSTERGATE .online logo;
 * play it once through its final frame, independently of world-build progress.
 */

export const LOAD_MIN_MS = 1500;
const BOOT_IN_PROGRESS_KEY = 'mg-load-in-progress';
export const LOAD_FADE_MS = 420;
export const LOAD_TIP_MS = 3200;
export const LOAD_EMBER_MAX = 22;
export const LOAD_EMBER_MOBILE = 10;
/** Near-neutral blacks below this luma become alpha 0. Colored grout stays. */
export const LOAD_KEY_LO = 22;
/** Luma ramp end; brighter (or chromatic) pixels stay fully opaque. */
export const LOAD_KEY_HI = 40;
export const LOAD_KEY_CHROMA = 18;

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

/** Stop only after the clip reaches its natural final frame; never seek or loop it. */
export function finishVideoAtEnd(video) {
  if (!video?.ended) return false;
  try { video.pause(); } catch { /* the browser may already have stopped it */ }
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

/** Rec. 601 luma in 0..255. */
export function lumaOf(r, g, b) {
  return (r * 77 + g * 150 + b * 29) >> 8;
}

/**
 * Punch out only the clip's near-black, near-neutral background.
 * White letter faces, gold .online, and dark red grout keep alpha 255.
 */
export function lumaKeyRgba(data, { lo = LOAD_KEY_LO, hi = LOAD_KEY_HI, chroma = LOAD_KEY_CHROMA } = {}) {
  const span = Math.max(1, hi - lo);
  const buf = data;
  for (let i = 0; i < buf.length; i += 4) {
    const r = buf[i];
    const g = buf[i + 1];
    const b = buf[i + 2];
    if (Math.max(r, g, b) - Math.min(r, g, b) > chroma) continue;
    const y = lumaOf(r, g, b);
    if (y <= lo) buf[i + 3] = 0;
    else if (y >= hi) buf[i + 3] = 255;
    else buf[i + 3] = Math.round(((y - lo) / span) * 255);
  }
  return buf;
}

export function keySourceToCanvas(src, canvas, opts) {
  if (!src || !canvas) return false;
  const ctx = canvas.getContext?.('2d', { willReadFrequently: true });
  if (!ctx) return false;
  const w = src.videoWidth || src.naturalWidth || canvas.width || 672;
  const h = src.videoHeight || src.naturalHeight || canvas.height || 448;
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  try {
    ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    lumaKeyRgba(img.data, opts);
    ctx.putImageData(img, 0, 0);
    return true;
  } catch {
    return false;
  }
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
  let session = opts.sessionStorage;
  if (session === undefined) {
    try { session = globalThis.sessionStorage; } catch { session = null; }
  }
  const startedAt = opts.now ?? Date.now();
  const skipRepeat = opts.skip === true;
  if (!skipRepeat) {
    try { session?.setItem?.(BOOT_IN_PROGRESS_KEY, '1'); } catch { /* storage is optional */ }
  }
  const video = doc.getElementById('load-video');
  const tipEl = doc.getElementById('load-tip');
  const embers = doc.getElementById('load-embers');
  const reduced = opts.reduced ?? prefersReducedMotion(opts.win || globalThis);
  const mobile = opts.mobile ?? (typeof matchMedia === 'function' && matchMedia('(max-width: 900px), (max-height: 520px)').matches);
  const fadeMs = opts.fadeMs ?? LOAD_FADE_MS;
  let tipIndex = 0;
  let tipTimer = 0;
  let held = false;
  let resolveVideoDone = () => {};
  let videoWaitTimer = 0;
  const videoDone = new Promise((resolve) => { resolveVideoDone = resolve; });

  if (skipRepeat) {
    el.classList.add('hidden');
    el.setAttribute('aria-hidden', 'true');
    try { video?.pause?.(); } catch { /* ignore */ }
    const fill = doc.getElementById('load-fill');
    const text = doc.getElementById('load-text');
    return {
      el, startedAt,
      setProgress(p, t) { return setLoadProgress(fill, text, p, t); },
      async waitForVideo() { return true; },
      async dismiss() { return true; },
    };
  }

  el.classList.toggle('reduced', reduced);
  spawnEmbers(embers, emberCount({ mobile, reduced }), (tag) => doc.createElement(tag));

  const failVideo = () => {
    if (held) return;
    held = true;
    el.classList.add('video-failed', 'held');
    el.classList.remove('video-playing');
    try { video?.pause?.(); } catch { /* the decoder may already be stopped */ }
    resolveVideoDone();
  };
  const finish = () => {
    if (reduced || held || !finishVideoAtEnd(video)) return false;
    held = true;
    el.classList.add('held');
    resolveVideoDone();
    return true;
  };
  if (reduced) {
    try { video?.pause?.(); } catch { /* ignore */ }
    resolveVideoDone();
  } else if (video) {
    video.loop = false;
    video.muted = true;
    video.playsInline = true;
    video.addEventListener('play', () => el.classList.add('video-playing'));
    video.addEventListener('ended', finish);
    video.addEventListener('error', failVideo);
    video.addEventListener('abort', failVideo);
    const play = video.play?.();
    if (play && typeof play.catch === 'function') play.catch(failVideo);
  } else resolveVideoDone();

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
    async waitForVideo({ timeoutMs } = {}) {
      if (reduced || held || !video) return true;
      const duration = Number(video.duration);
      const fallbackMs = Number.isFinite(duration) && duration > 0
        ? Math.max(30000, duration * 1000 + 12000)
        : 45000;
      const limit = Math.max(1000, Number(timeoutMs ?? opts.videoEndTimeoutMs ?? fallbackMs));
      await Promise.race([
        videoDone,
        new Promise((resolve) => {
          videoWaitTimer = setTimeout(() => {
            failVideo();
            resolve();
          }, limit);
        }),
      ]);
      if (videoWaitTimer) clearTimeout(videoWaitTimer);
      videoWaitTimer = 0;
      return true;
    },
    async dismiss({ now, wait = remainMinDisplay } = {}) {
      const delay = wait(startedAt, now ?? Date.now());
      if (delay > 0) await new Promise((r) => setTimeout(r, delay));
      await this.waitForVideo();
      el.classList.add('fading');
      if (fadeMs > 0) await new Promise((r) => setTimeout(r, fadeMs));
      el.classList.add('hidden');
      el.setAttribute('aria-hidden', 'true');
      try { video?.pause?.(); } catch { /* ignore */ }
      if (tipTimer) (opts.clearInterval || clearInterval)(tipTimer);
      try { session?.removeItem?.(BOOT_IN_PROGRESS_KEY); } catch { /* storage is optional */ }
      return true;
    },
  };
}
