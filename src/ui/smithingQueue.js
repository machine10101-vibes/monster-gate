/** Shared, visible work queue for smithing actions. */
export const SMITHING_UNIT_MS = 1800;

/** One bar-sized operation takes 1.8s; larger forged pieces scale by bars used. */
export function smithingDurationMs(units = 1) {
  return Math.max(SMITHING_UNIT_MS, Math.round(SMITHING_UNIT_MS * Math.max(1, Number(units) || 1)));
}

/**
 * Run one operation at a time and keep a compact progress indicator in the UI.
 * The operation is only committed when its timer completes, never up front.
 */
export function startSmithingQueue({
  container,
  label,
  count,
  durationMs = SMITHING_UNIT_MS,
  processOne,
  onStep = () => {},
  onDone = () => {},
}) {
  const total = Math.max(0, count | 0);
  if (!container || total < 1 || typeof processOne !== 'function') return () => {};

  const doc = container.ownerDocument || document;
  const wrap = doc.createElement('div');
  wrap.className = 'smith-progress';
  wrap.setAttribute('role', 'status');
  const caption = doc.createElement('div');
  caption.className = 'smith-progress-label';
  const track = doc.createElement('div');
  track.className = 'smith-progress-track';
  track.setAttribute('role', 'progressbar');
  track.setAttribute('aria-valuemin', '0');
  track.setAttribute('aria-valuemax', String(total));
  const fill = doc.createElement('i');
  track.appendChild(fill);
  wrap.append(caption, track);
  container.appendChild(wrap);

  const stepMs = Math.max(250, durationMs | 0);
  let completed = 0;
  let startedAt = Date.now();
  let interval = 0;
  let stopped = false;

  const paint = (fraction = 0) => {
    const pct = Math.max(0, Math.min(1, fraction));
    fill.style.width = `${pct * 100}%`;
    track.setAttribute('aria-valuenow', String(completed));
    caption.textContent = `${label} · ${completed}/${total}`;
  };

  const finish = () => {
    if (stopped) return;
    stopped = true;
    if (interval) clearInterval(interval);
    wrap.remove();
    onDone(completed);
  };

  paint();
  interval = setInterval(() => {
    if (stopped) return;
    const elapsed = Date.now() - startedAt;
    paint(elapsed / stepMs);
    if (elapsed < stepMs) return;
    const result = processOne();
    if (!result) {
      finish();
      return;
    }
    completed += 1;
    startedAt += stepMs;
    onStep(completed, total, result);
    if (completed >= total) finish();
    else paint(0);
  }, 40);

  return () => {
    if (stopped) return;
    stopped = true;
    if (interval) clearInterval(interval);
    wrap.remove();
  };
}
