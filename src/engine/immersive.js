/** Fullscreen + browser-chrome helpers for landscape phones. */

export function isLandscape() {
  return window.innerWidth > window.innerHeight;
}

export function isFullscreen() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement);
}

function lockLandscape() {
  const pending = screen.orientation?.lock?.('landscape');
  pending?.catch?.(() => {});
}

/** Ask the browser to drop its toolbar. Requires a user gesture on most phones. */
export function requestGameFullscreen(lock = false) {
  if (isFullscreen()) {
    if (lock) lockLandscape();
    return;
  }
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!req) return;
  let pending;
  try {
    pending = req.call(el, { navigationUI: 'hide' });
  } catch {
    try {
      pending = req.call(el);
    } catch {
      return;
    }
  }
  if (pending && typeof pending.then === 'function') {
    pending.then(() => {
      if (lock) lockLandscape();
    }).catch(() => {});
  } else if (lock) {
    lockLandscape();
  }
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
