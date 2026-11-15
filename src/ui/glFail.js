/**
 * Loading-screen fallback when WebGL never comes up.
 * Does not read or write hunter saves.
 */

export const GL_RESTORE_MS = 5000;
export const GL_FAIL_TITLE = "Your browser couldn't start 3D graphics";
export const GL_FAIL_TIPS = [
  'Turn on hardware acceleration in your browser settings.',
  'Update the browser, or try Chrome, Edge, or Safari.',
  'Close other heavy tabs and try again.',
];
export const GL_FAIL_RETRY = 'Retry';

export function shouldForceNoGL({ search, win } = {}) {
  const w = win || (typeof window !== 'undefined' ? window : null);
  if (w?.__mgForceNoGL) return true;
  const raw = search ?? (typeof w?.location?.search === 'string' ? w.location.search : '');
  return new URLSearchParams(String(raw || '').replace(/^\?/, '')).get('nogl') === '1';
}

export function probeWebGL(canvas, { force = false } = {}) {
  if (force) return { ok: false, reason: 'force' };
  if (!canvas || typeof canvas.getContext !== 'function') return { ok: false, reason: 'no-canvas' };
  try {
    const gl = canvas.getContext('webgl2')
      || canvas.getContext('webgl')
      || canvas.getContext('experimental-webgl');
    if (!gl) return { ok: false, reason: 'null' };
    return { ok: true, gl };
  } catch (error) {
    return { ok: false, reason: 'throw', error };
  }
}

export function isWebGLFailure(err) {
  if (!err) return false;
  if (typeof err === 'object' && err.reason) {
    return err.reason === 'null'
      || err.reason === 'throw'
      || err.reason === 'force'
      || err.reason === 'lost'
      || err.reason === 'no-canvas';
  }
  const msg = String(err.message || err);
  return /webgl|WebGL|Error creating WebGL|graphics memory|3D graphics/i.test(msg);
}

export function armContextLost(canvas, opts = {}) {
  if (!canvas?.addEventListener) return { disarm() {} };
  const restoreMs = opts.restoreMs ?? GL_RESTORE_MS;
  const onFail = opts.onFail;
  const setTimeoutFn = opts.setTimeout || ((fn, ms) => setTimeout(fn, ms));
  const clearTimeoutFn = opts.clearTimeout || ((id) => clearTimeout(id));
  let timer = 0;
  let cancelled = false;
  const lost = (ev) => {
    ev?.preventDefault?.();
    if (timer) return;
    cancelled = false;
    timer = setTimeoutFn(() => {
      timer = 0;
      if (cancelled) return;
      onFail?.({ reason: 'lost' });
    }, restoreMs);
  };
  const restored = () => {
    cancelled = true;
    if (!timer) return;
    clearTimeoutFn(timer);
    timer = 0;
  };
  canvas.addEventListener('webglcontextlost', lost);
  canvas.addEventListener('webglcontextrestored', restored);
  return {
    lost,
    restored,
    disarm() {
      canvas.removeEventListener?.('webglcontextlost', lost);
      canvas.removeEventListener?.('webglcontextrestored', restored);
      if (timer) clearTimeoutFn(timer);
      timer = 0;
    },
  };
}

export function showGlFailPanel(doc = typeof document !== 'undefined' ? document : null, opts = {}) {
  if (!doc?.getElementById) return null;
  const loading = doc.getElementById('loading');
  let panel = doc.getElementById('gl-fail');
  if (!panel) {
    panel = ensurePanel(doc, loading, opts);
  }
  paintPanel(panel, opts);
  panel.hidden = false;
  panel.classList?.remove?.('hidden');
  loading?.classList?.remove?.('hidden', 'fading');
  loading?.classList?.add?.('gl-failed');
  loading?.removeAttribute?.('aria-hidden');
  if (loading) loading.hidden = false;
  const retry = doc.getElementById('gl-fail-retry') || panel.querySelector?.('#gl-fail-retry');
  const reload = opts.reload || (() => {
    if (typeof location !== 'undefined') location.reload();
  });
  if (retry) {
    retry.onclick = (ev) => {
      ev?.preventDefault?.();
      reload();
    };
  }
  if (typeof window !== 'undefined') window.__mgGlFailShown = true;
  return panel;
}

function paintPanel(panel, opts = {}) {
  const title = opts.title || GL_FAIL_TITLE;
  const tips = opts.tips || GL_FAIL_TIPS;
  const heading = panel.querySelector?.('.gl-fail-title') || panel.querySelector?.('h1');
  if (heading) heading.textContent = title;
  const list = panel.querySelector?.('ul');
  if (list && !list.children?.length) {
    for (const tip of tips) {
      const li = (opts.createElement || (typeof document !== 'undefined' ? document.createElement.bind(document) : null))?.('li');
      if (!li) break;
      li.textContent = tip;
      list.appendChild(li);
    }
  }
  const btn = panel.querySelector?.('#gl-fail-retry') || panel.querySelector?.('button');
  if (btn && !btn.textContent) btn.textContent = opts.retryLabel || GL_FAIL_RETRY;
}

function ensurePanel(doc, loading, opts = {}) {
  const make = opts.createElement || ((tag) => doc.createElement(tag));
  const panel = make('div');
  panel.id = 'gl-fail';
  panel.className = 'gl-fail';
  panel.setAttribute?.('role', 'alert');
  const card = make('div');
  card.className = 'gl-fail-card mg-frame';
  const heading = make('p');
  heading.className = 'gl-fail-title';
  heading.textContent = opts.title || GL_FAIL_TITLE;
  const list = make('ul');
  for (const tip of opts.tips || GL_FAIL_TIPS) {
    const li = make('li');
    li.textContent = tip;
    list.appendChild(li);
  }
  const btn = make('button');
  btn.id = 'gl-fail-retry';
  btn.type = 'button';
  btn.className = 'start';
  btn.textContent = opts.retryLabel || GL_FAIL_RETRY;
  card.append(heading, list, btn);
  panel.appendChild(card);
  (loading || doc.body || doc.documentElement)?.appendChild?.(panel);
  return panel;
}

if (typeof window !== 'undefined') {
  window.__mgGlFail = {
    probeWebGL,
    showGlFailPanel,
    armContextLost,
    shouldForceNoGL,
    GL_RESTORE_MS,
    GL_FAIL_TITLE,
  };
}
