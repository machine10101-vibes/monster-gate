import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  GL_FAIL_RETRY,
  GL_FAIL_TIPS,
  GL_FAIL_TITLE,
  GL_RESTORE_MS,
  armContextLost,
  isWebGLFailure,
  probeWebGL,
  shouldForceNoGL,
  showGlFailPanel,
} from '../src/ui/glFail.js';

const src = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

function fakeNode(id, extras = {}) {
  const classes = new Set();
  const node = {
    id,
    hidden: extras.hidden ?? false,
    textContent: extras.textContent ?? '',
    children: [],
    className: extras.className || '',
    listeners: {},
    style: {},
    classList: {
      add(...c) { c.forEach((x) => classes.add(x)); node.className = [...classes].join(' '); },
      remove(...c) { c.forEach((x) => classes.delete(x)); node.className = [...classes].join(' '); },
      contains(c) { return classes.has(c); },
    },
    setAttribute(name, value) { node[name] = value; },
    removeAttribute(name) { delete node[name]; },
    appendChild(c) { node.children.push(c); return c; },
    addEventListener(ev, fn) { node.listeners[ev] = fn; },
    removeEventListener(ev) { delete node.listeners[ev]; },
    querySelector(sel) {
      if (sel === 'h1') return node.children.find((c) => c.id === 'h1' || c.tag === 'h1') || null;
      if (sel === 'ul') return node.children.find((c) => c.id === 'ul' || c.tag === 'ul') || null;
      if (sel === '#gl-fail-retry' || sel === 'button') return node.children.find((c) => c.id === 'gl-fail-retry') || null;
      return null;
    },
    ...extras,
  };
  return node;
}

function fakeDoc() {
  const h1 = fakeNode('h1', { tag: 'p', className: 'gl-fail-title', textContent: GL_FAIL_TITLE });
  const ul = fakeNode('ul', { tag: 'ul', children: GL_FAIL_TIPS.map((t) => fakeNode('', { textContent: t })) });
  ul.children = GL_FAIL_TIPS.map((t) => fakeNode('', { textContent: t }));
  const btn = fakeNode('gl-fail-retry', { tag: 'button', textContent: GL_FAIL_RETRY });
  const card = fakeNode('card');
  const panel = fakeNode('gl-fail', { hidden: true, className: 'gl-fail hidden' });
  panel.classList.add('hidden');
  card.appendChild(h1);
  card.appendChild(ul);
  card.appendChild(btn);
  panel.appendChild(card);
  panel.querySelector = (sel) => {
    if (sel === '.gl-fail-title' || sel === 'h1') return h1;
    if (sel === 'ul') return ul;
    if (sel === '#gl-fail-retry' || sel === 'button') return btn;
    return null;
  };
  const loading = fakeNode('loading');
  const map = { loading, 'gl-fail': panel, 'gl-fail-retry': btn };
  return {
    map, h1, ul, btn, panel, loading,
    getElementById(id) { return map[id] || null; },
    createElement(tag) { return fakeNode(tag, { tag }); },
  };
}

test('probeWebGL reports null, throw, and ok contexts', () => {
  assert.deepEqual(probeWebGL(null), { ok: false, reason: 'no-canvas' });
  assert.equal(probeWebGL({}, { force: true }).reason, 'force');
  assert.equal(probeWebGL({ getContext: () => null }).reason, 'null');
  assert.equal(probeWebGL({
    getContext(type) { if (type === 'webgl2') throw new Error('WEBGL_lose_context'); return null; },
  }).reason, 'throw');
  const gl = { id: 'gl' };
  const ok = probeWebGL({ getContext(type) { return type === 'webgl' ? gl : null; } });
  assert.equal(ok.ok, true);
  assert.equal(ok.gl, gl);
});

test('isWebGLFailure matches renderer errors and probe reasons', () => {
  assert.equal(isWebGLFailure({ reason: 'null' }), true);
  assert.equal(isWebGLFailure({ reason: 'lost' }), true);
  assert.equal(isWebGLFailure(new Error('Error creating WebGL context.')), true);
  assert.equal(isWebGLFailure(new Error('This device ran out of graphics memory.')), true);
  assert.equal(isWebGLFailure(new Error('Failed to load: missing tile')), false);
});

test('shouldForceNoGL honors the nogl test hook', () => {
  assert.equal(shouldForceNoGL({ search: '' }), false);
  assert.equal(shouldForceNoGL({ search: '?nogl=1' }), true);
  assert.equal(shouldForceNoGL({ search: '', win: { __mgForceNoGL: true } }), true);
});

test('showGlFailPanel paints the loading fallback and Retry reloads', () => {
  const doc = fakeDoc();
  let reloads = 0;
  const panel = showGlFailPanel(doc, { reload: () => { reloads += 1; } });
  assert.equal(panel, doc.panel);
  assert.equal(doc.loading.classList.contains('gl-failed'), true);
  assert.equal(doc.loading.classList.contains('hidden'), false);
  assert.equal(doc.panel.hidden, false);
  assert.equal(doc.h1.textContent, GL_FAIL_TITLE);
  assert.equal(doc.ul.children.length, 3);
  assert.match(doc.ul.children[0].textContent, /hardware acceleration/i);
  assert.match(doc.ul.children[1].textContent, /Chrome, Edge, or Safari/);
  assert.match(doc.ul.children[2].textContent, /heavy tabs/i);
  assert.equal(doc.btn.textContent, 'Retry');
  doc.btn.onclick({ preventDefault() {} });
  assert.equal(reloads, 1);
});

test('context lost waits ~5s and is cancelled if WebGL restores', () => {
  assert.equal(GL_RESTORE_MS, 5000);
  const canvas = fakeNode('game');
  const timers = [];
  let fails = 0;
  const watch = armContextLost(canvas, {
    restoreMs: GL_RESTORE_MS,
    onFail: () => { fails += 1; },
    setTimeout(fn, ms) {
      const id = timers.length + 1;
      timers.push({ id, fn, ms });
      return id;
    },
    clearTimeout(id) {
      const row = timers.find((t) => t.id === id);
      if (row) row.cleared = true;
    },
  });
  canvas.listeners.webglcontextlost({ preventDefault() {} });
  assert.equal(timers[0].ms, 5000);
  assert.equal(fails, 0);
  watch.restored();
  assert.equal(timers[0].cleared, true);
  timers[0].fn();
  assert.equal(fails, 0);

  const late = [];
  const watch2 = armContextLost(canvas, {
    restoreMs: GL_RESTORE_MS,
    onFail: () => { fails += 1; },
    setTimeout(fn, ms) { late.push(fn); return 7; },
    clearTimeout() {},
  });
  watch2.lost({ preventDefault() {} });
  late[0]();
  assert.equal(fails, 1);
});

test('loading markup, Retry, and Game boot all wire the WebGL fallback', () => {
  const html = src('../index.html');
  const main = src('../src/main.js');
  const boot = src('../src/ui/boot.js');
  assert.match(html, /Your browser couldn't start 3D graphics/);
  assert.match(html, /id="gl-fail-retry"[^>]*>Retry/);
  assert.match(html, /hardware acceleration/);
  assert.match(main, /showGlFailPanel/);
  assert.match(main, /armContextLost/);
  assert.match(main, /probeWebGL/);
  assert.doesNotMatch(main, /localStorage\.(removeItem|clear)/);
  assert.doesNotMatch(boot, /saveio|savebridge/);
});
