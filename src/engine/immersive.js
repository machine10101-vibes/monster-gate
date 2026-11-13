/** Fullscreen + browser-chrome helpers for phones and iPad. */

export function isLandscape() {
  return window.innerWidth > window.innerHeight;
}

export function isFullscreen() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement);
}

/**
 * iPhone, iPad, and iPadOS browsers that pretend to be a desktop Mac.
 * Brave on iPad does both: its desktop site is a Macintosh Safari string, and
 * Shields reports maxTouchPoints as 0, so a touch-count check never sees it.
 * The tab is killed and reloaded when the GPU budget is blown.
 */
export function detectIOS(nav, win = {}) {
  const ua = nav?.userAgent || '';
  if (/iPad|iPhone|iPod/i.test(ua)) return true;
  const points = nav?.maxTouchPoints || 0;
  const mac = nav?.platform === 'MacIntel' || /Macintosh/i.test(ua);
  if (points > 1 && mac) return true;
  // Every iOS WebKit app exposes this. Desktop Safari and desktop Brave do not.
  if (typeof nav?.standalone === 'boolean') return true;
  // iOS Brave, including desktop mode. Desktop Brave identifies as Chrome.
  if (/Brave/i.test(ua) && /AppleWebKit\/605/i.test(ua)) return true;
  if (mac && 'ontouchend' in win && /AppleWebKit\/605/i.test(ua) && !/Chrome|CriOS|Edg\//.test(ua)) return true;
  return false;
}

export function isIOS() {
  return detectIOS(navigator, window);
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
