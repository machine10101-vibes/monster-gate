/**
 * The tap that opens a panel still owes a pointerup and a click. Those land
 * on the close control or a destination and shut the panel unless the press
 * is held. Keep the panel inert through that gesture, then take the next tap.
 */

const held = new Set();
const points = new Map();
let newestId = null;
let trackingTarget = null;

export function resetPanelPointers() {
  held.clear();
  points.clear();
  newestId = null;
}

export function pointersHeld() {
  return held.size;
}

export function trackPanelPointers(target) {
  if (!target?.addEventListener || target === trackingTarget) return target;
  trackingTarget = target;
  const note = (e, fromDown) => {
    if (e.pointerId == null) return;
    held.add(e.pointerId);
    if (fromDown) newestId = e.pointerId;
    if (Number.isFinite(e.clientX) && Number.isFinite(e.clientY)) {
      points.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
  };
  const release = (e) => {
    if (e.pointerId == null) return;
    held.delete(e.pointerId);
    if (newestId === e.pointerId) newestId = null;
  };
  target.addEventListener('pointerdown', (e) => note(e, true), true);
  target.addEventListener('pointermove', (e) => note(e, false), true);
  target.addEventListener('pointerup', release, true);
  target.addEventListener('pointercancel', release, true);
  target.addEventListener('lostpointercapture', release, true);
  return target;
}

function nearOpening(e, origins) {
  if (!Number.isFinite(e?.clientX) || !Number.isFinite(e?.clientY)) return false;
  return origins.some((p) => Math.hypot(e.clientX - p.x, e.clientY - p.y) < 48);
}

/**
 * Swallow the pointer that is already down, and the click it synthesizes,
 * so the panel stays open for a later tap. Returns true when a gesture was armed.
 */
export function guardFreshPanel(panel, target = typeof window !== 'undefined' ? window : null) {
  trackPanelPointers(target);
  if (!panel?.classList || newestId == null || !held.has(newestId) || !target?.addEventListener) return false;
  if (panel.classList.contains('panel-gesture')) return true;
  const opening = new Set([newestId]);
  const origins = [...opening].map((id) => points.get(id)).filter(Boolean);
  panel.classList.add('panel-gesture');
  let done = false;
  let phase = 'holding';
  let timer = 0;
  const later = typeof target.setTimeout === 'function' ? target.setTimeout.bind(target) : setTimeout;
  const cancel = typeof target.clearTimeout === 'function' ? target.clearTimeout.bind(target) : clearTimeout;
  const cleanup = () => {
    if (done) return;
    done = true;
    phase = 'live';
    if (timer) cancel(timer);
    panel.classList.remove('panel-gesture');
    target.removeEventListener('pointerdown', onDown, true);
    target.removeEventListener('pointerup', onUp, true);
    target.removeEventListener('pointercancel', onUp, true);
    target.removeEventListener('lostpointercapture', onUp, true);
    target.removeEventListener('click', onClick, true);
    target.removeEventListener('touchend', onClick, true);
  };
  const onUp = (e) => {
    if (!opening.has(e.pointerId)) return;
    opening.delete(e.pointerId);
    e.preventDefault?.();
    if (opening.size > 0) return;
    panel.classList.remove('panel-gesture');
    phase = 'swallow';
    if (!timer) timer = later(() => cleanup(), 400);
  };
  const onDown = (e) => {
    if (opening.has(e.pointerId)) return;
    if (phase === 'holding') return;
    phase = 'next';
  };
  const onClick = (e) => {
    if (phase === 'live') return;
    if (phase === 'next' && !nearOpening(e, origins)) return;
    e.preventDefault?.();
    e.stopPropagation?.();
  };
  target.addEventListener('pointerdown', onDown, true);
  target.addEventListener('pointerup', onUp, true);
  target.addEventListener('pointercancel', onUp, true);
  target.addEventListener('lostpointercapture', onUp, true);
  target.addEventListener('click', onClick, true);
  target.addEventListener('touchend', onClick, true);
  return true;
}
