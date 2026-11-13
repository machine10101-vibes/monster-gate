/** Fullscreen + browser-chrome helpers for phones and iPad. */

export function isLandscape() {
  return window.innerWidth > window.innerHeight;
}

export function isFullscreen() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement);
}

/**
 * iPhone, iPad, and iPadOS Safari in desktop mode (Macintosh + touch).
 * That browser kills the tab and reloads it when the GPU budget is blown.
 */
export function isIOS() {
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/i.test(ua)) return true;
  const touch = navigator.maxTouchPoints || 0;
  return touch > 1 && (navigator.platform === 'MacIntel' || /Macintosh/i.test(ua));
}

/** iPad, including iPadOS Safari which presents itself as a desktop Mac. */
export function isTablet() {
  const ua = navigator.userAgent || '';
  if (/iPhone|iPod/i.test(ua) && !/iPad/i.test(ua)) return false;
  if (/iPad/i.test(ua)) return true;
  const points = navigator.maxTouchPoints || 0;
  if (points > 1 && (navigator.platform === 'MacIntel' || /Macintosh/i.test(ua))) return true;
  const touch = points > 1 || 'ontouchstart' in window;
  if (!touch) return false;
  const shortSide = Math.min(window.screen?.width || 0, window.screen?.height || 0);
  return shortSide >= 744;
}

function lockLandscape() {
  const pending = screen.orientation?.lock?.('landscape');
  pending?.catch?.(() => {});
}

function callFullscreen(el, opts) {
  const req = el.requestFullscreen || el.webkitRequestFullscreen || el.webkitRequestFullScreen;
  if (!req) return Promise.reject(new Error('unsupported'));
  try {
    const result = opts === undefined ? req.call(el) : req.call(el, opts);
    if (result && typeof result.then === 'function') return result;
    return isFullscreen() ? Promise.resolve() : Promise.reject(new Error('no fullscreen'));
  } catch (err) {
    return Promise.reject(err);
  }
}

/**
 * Hide the browser header. iPad Safari accepts this from a tap, and rejects
 * `navigationUI` on some versions, so a rejection is tried again without it.
 * Returns a promise that resolves true when the page is fullscreen.
 */
export function requestGameFullscreen(lock = false) {
  if (isFullscreen()) {
    if (lock) lockLandscape();
    return Promise.resolve(true);
  }
  const root = document.documentElement;
  const app = document.getElementById('app');
  const ask = (el) => callFullscreen(el, { navigationUI: 'hide' }).catch(() => callFullscreen(el));
  let pending = ask(root);
  if (app && app !== root) pending = pending.catch(() => ask(app));
  return pending.then(() => {
    if (lock) lockLandscape();
    return true;
  }).catch(() => false);
}

export function exitGameFullscreen() {
  if (!isFullscreen()) return;
  const exit = document.exitFullscreen || document.webkitExitFullscreen;
  try {
    const pending = exit?.call(document);
    pending?.catch?.(() => {});
  } catch {
    /* already leaving fullscreen */
  }
  try {
    screen.orientation?.unlock?.();
  } catch {
    /* unlock throws when nothing is locked */
  }
}
