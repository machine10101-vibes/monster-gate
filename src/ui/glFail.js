/**
 * Loading-screen fallback when WebGL never comes up.
 * Does not read or write hunter saves.
 */

import { BUILD_ID } from './buildId.js';

export const GL_RESTORE_MS = 5000;
export const GL_FAIL_TITLE = "Your browser couldn't start 3D graphics";
export const GL_FAIL_TIPS = [
  'Turn on hardware acceleration in your browser settings.',
  'Update the browser, or try Chrome, Edge, or Safari.',
  'Close other heavy tabs and try again.',
];
export const GL_FAIL_RETRY = 'Retry';
export const GL_FAIL_TRYING = 'Trying again…';
export const GL_FAIL_STILL = "Still couldn't start 3D. Check the tips above.";

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

export function defaultGlProbe({ createCanvas, force } = {}) {
  const canvas = createCanvas
    ? createCanvas()
    : (typeof document !== 'undefined' ? document.createElement('canvas') : null);
  return probeWebGL(canvas, { force: force ?? shouldForceNoGL() });
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

export function glFailStatusLine(attempts) {
  const n = Math.max(1, Number(attempts) || 1);
  return `${GL_FAIL_STILL} Try ${n}.`;
}

function resolveDoc(docOrOpts, maybeOpts) {
  if (docOrOpts && typeof docOrOpts.getElementById === 'function') {
    return { doc: docOrOpts, opts: maybeOpts || {} };
  }
  const opts = (docOrOpts && typeof docOrOpts === 'object') ? { ...docOrOpts, ...(maybeOpts || {}) } : (maybeOpts || {});
  const doc = typeof document !== 'undefined' ? document : null;
  return { doc, opts };
}

export function hideGlFailPanel(doc = typeof document !== 'undefined' ? document : null) {
  if (!doc?.getElementById) return;
  const panel = doc.getElementById('gl-fail');
  const loading = doc.getElementById('loading');
  if (panel) {
    panel.hidden = true;
    panel.classList?.add?.('hidden');
  }
  loading?.classList?.remove?.('gl-failed');
  if (typeof window !== 'undefined') window.__mgGlFailShown = false;
}

/** True when 3D cannot start, so boot can skip save-bridge and paint the fallback now. */
export function glIsDeadAtBoot(opts = {}) {
  if (shouldForceNoGL(opts)) return true;
  const probe = opts.probe || defaultGlProbe;
  try {
    return !probe({ force: shouldForceNoGL(opts) })?.ok;
  } catch {
    return true;
  }
}

/** Paint the fallback as soon as the loading screen exists, before Game or save-bridge. */
export function showGlFailIfNeeded(docOrOpts, maybeOpts) {
  const { doc, opts } = resolveDoc(docOrOpts, maybeOpts);
  if (!glIsDeadAtBoot(opts)) return false;
  return !!showGlFailPanel(doc, opts);
}

export function showGlFailPanel(docOrOpts, maybeOpts) {
  const { doc, opts } = resolveDoc(docOrOpts, maybeOpts);
  if (!doc?.getElementById) return null;
  const loading = doc.getElementById('loading');
  let panel = doc.getElementById('gl-fail');
  if (!panel) {
    panel = ensurePanel(doc, loading, opts);
  }
  paintPanel(panel, opts, doc);
  panel.hidden = false;
  panel.classList?.remove?.('hidden');
  loading?.classList?.remove?.('hidden', 'fading');
  loading?.classList?.add?.('gl-failed');
  loading?.removeAttribute?.('aria-hidden');
  if (loading) loading.hidden = false;
  bindRetry(doc, panel, opts);
  if (typeof window !== 'undefined') window.__mgGlFailShown = true;
  return panel;
}

function q(panel, doc, ...sels) {
  for (const sel of sels) {
    const fromPanel = panel.querySelector?.(sel);
    if (fromPanel) return fromPanel;
    if (sel.startsWith('#') && doc?.getElementById) {
      const byId = doc.getElementById(sel.slice(1));
      if (byId) return byId;
    }
  }
  return null;
}

function paintPanel(panel, opts = {}, doc = null) {
  const title = opts.title || GL_FAIL_TITLE;
  const tips = opts.tips || GL_FAIL_TIPS;
  const heading = q(panel, doc, '.gl-fail-title', 'h1');
  if (heading) heading.textContent = title;
  const list = q(panel, doc, 'ul');
  if (list && !list.children?.length) {
    for (const tip of tips) {
      const li = (opts.createElement || (typeof document !== 'undefined' ? document.createElement.bind(document) : null))?.('li');
      if (!li) break;
      li.textContent = tip;
      list.appendChild(li);
    }
  }
  const btn = q(panel, doc, '#gl-fail-retry', 'button');
  if (btn) {
    if (!btn.textContent || btn.textContent === GL_FAIL_TRYING) btn.textContent = opts.retryLabel || GL_FAIL_RETRY;
    btn.disabled = false;
  }
  const build = String(opts.buildId || BUILD_ID || 'dev');
  const buildEl = q(panel, doc, '.gl-fail-build', '#gl-fail-build');
  if (buildEl) {
    buildEl.textContent = build;
    buildEl.hidden = false;
  }
  const pageBuild = doc?.getElementById?.('build-id')
    || (typeof document !== 'undefined' ? document.getElementById?.('build-id') : null);
  if (pageBuild && !pageBuild.textContent) pageBuild.textContent = build;
  const status = q(panel, doc, '.gl-fail-status', '#gl-fail-status');
  if (status && !opts.keepStatus) {
    status.textContent = '';
    status.hidden = true;
  }
}

function bindRetry(doc, panel, opts = {}) {
  const retry = doc.getElementById('gl-fail-retry') || panel.querySelector?.('#gl-fail-retry');
  if (!retry) return;
  const probe = opts.probe || defaultGlProbe;
  const onSuccess = opts.onSuccess || opts.reload || (() => {
    if (typeof location !== 'undefined') location.reload();
  });
  retry.onclick = (ev) => {
    ev?.preventDefault?.();
    if (retry.disabled) return;
    const attempts = (Number(panel.dataset?.tries || panel.tries) || 0) + 1;
    if (panel.dataset) panel.dataset.tries = String(attempts);
    else panel.tries = attempts;
    paintTrying(retry, panel, doc);
    const finish = (result) => {
      if (result?.ok) {
        hideGlFailPanel(doc);
        onSuccess(result);
        return;
      }
      paintStillFailed(retry, panel, attempts, doc);
      opts.onFail?.(result, attempts);
    };
    let out;
    try {
      out = probe({ force: shouldForceNoGL() });
    } catch {
      finish({ ok: false, reason: 'throw' });
      return;
    }
    if (out && typeof out.then === 'function') {
      out.then(finish, () => finish({ ok: false, reason: 'throw' }));
      return;
    }
    finish(out);
  };
}

function paintTrying(retry, panel, doc) {
  retry.disabled = true;
  retry.setAttribute?.('aria-busy', 'true');
  retry.textContent = GL_FAIL_TRYING;
  const status = q(panel, doc, '.gl-fail-status', '#gl-fail-status');
  if (status) {
    status.hidden = false;
    status.textContent = GL_FAIL_TRYING;
  }
}

function paintStillFailed(retry, panel, attempts, doc) {
  retry.disabled = false;
  retry.removeAttribute?.('aria-busy');
  retry.textContent = GL_FAIL_RETRY;
  const status = q(panel, doc, '.gl-fail-status', '#gl-fail-status');
  if (status) {
    status.hidden = false;
    status.textContent = glFailStatusLine(attempts);
  }
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
  const status = make('p');
  status.id = 'gl-fail-status';
  status.className = 'gl-fail-status';
  status.hidden = true;
  const btn = make('button');
  btn.id = 'gl-fail-retry';
  btn.type = 'button';
  btn.className = 'start';
  btn.textContent = opts.retryLabel || GL_FAIL_RETRY;
  const build = make('p');
  build.id = 'gl-fail-build';
  build.className = 'gl-fail-build';
  build.textContent = String(opts.buildId ?? BUILD_ID ?? 'dev');
  card.appendChild(heading);
  card.appendChild(list);
  card.appendChild(status);
  card.appendChild(btn);
  card.appendChild(build);
  panel.appendChild(card);
  panel.querySelector = (sel) => {
    if (sel === '.gl-fail-title' || sel === 'h1') return heading;
    if (sel === 'ul') return list;
    if (sel === '#gl-fail-retry' || sel === 'button') return btn;
    if (sel === '.gl-fail-status' || sel === '#gl-fail-status') return status;
    if (sel === '.gl-fail-build' || sel === '#gl-fail-build') return build;
    return null;
  };
  (loading || doc.body || doc.documentElement)?.appendChild?.(panel);
  return panel;
}

if (typeof window !== 'undefined') {
  window.__mgGlFail = {
    probeWebGL,
    showGlFailPanel,
    hideGlFailPanel,
    showGlFailIfNeeded,
    glIsDeadAtBoot,
    armContextLost,
    shouldForceNoGL,
    GL_RESTORE_MS,
    GL_FAIL_TITLE,
    GL_FAIL_TRYING,
    GL_FAIL_STILL,
    BUILD_ID,
  };
}
