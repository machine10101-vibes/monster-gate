import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { BUILD_ID } from '../src/ui/buildId.js';
import {
  GL_FAIL_RETRY,
  GL_FAIL_RETRY_MS,
  GL_FAIL_STILL,
  GL_FAIL_TIPS,
  GL_FAIL_TITLE,
  GL_FAIL_TRYING,
  GL_RESTORE_MS,
  armContextLost,
  glFailStatusLine,
  glIsDeadAtBoot,
  hideGlFailPanel,
  isWebGLFailure,
  probeWebGL,
  shouldForceNoGL,
  showGlFailIfNeeded,
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
    disabled: extras.disabled ?? false,
    dataset: extras.dataset || {},
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
      if (sel === '.gl-fail-status' || sel === '#gl-fail-status') return node.children.find((c) => c.id === 'gl-fail-status') || null;
      if (sel === '.gl-fail-build' || sel === '#gl-fail-build') return node.children.find((c) => c.id === 'gl-fail-build') || null;
      return null;
    },
    ...extras,
  };
  if (!node.dataset) node.dataset = {};
  return node;
}

function fakeDoc() {
  const h1 = fakeNode('h1', { tag: 'p', className: 'gl-fail-title', textContent: GL_FAIL_TITLE });
  const ul = fakeNode('ul', { tag: 'ul' });
  ul.children = GL_FAIL_TIPS.map((t) => fakeNode('', { textContent: t }));
  const status = fakeNode('gl-fail-status', { tag: 'p', className: 'gl-fail-status', hidden: true });
  const btn = fakeNode('gl-fail-retry', { tag: 'button', textContent: GL_FAIL_RETRY });
  const build = fakeNode('gl-fail-build', { tag: 'p', className: 'gl-fail-build', textContent: '' });
  const card = fakeNode('card');
  const panel = fakeNode('gl-fail', { hidden: true, className: 'gl-fail hidden' });
  panel.classList.add('hidden');
  card.appendChild(h1);
  card.appendChild(ul);
  card.appendChild(status);
  card.appendChild(btn);
  card.appendChild(build);
  panel.appendChild(card);
  panel.querySelector = (sel) => {
    if (sel === '.gl-fail-title' || sel === 'h1') return h1;
    if (sel === 'ul') return ul;
    if (sel === '#gl-fail-retry' || sel === 'button') return btn;
    if (sel === '.gl-fail-status' || sel === '#gl-fail-status') return status;
    if (sel === '.gl-fail-build' || sel === '#gl-fail-build') return build;
    return null;
  };
  const loading = fakeNode('loading');
  const pageBuild = fakeNode('build-id', { textContent: '' });
  const map = {
    loading,
    'gl-fail': panel,
    'gl-fail-retry': btn,
    'gl-fail-status': status,
    'gl-fail-build': build,
    'build-id': pageBuild,
  };
  return {
    map, h1, ul, btn, panel, loading, status, build, pageBuild,
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

test('showGlFailPanel accepts an opts-only call without a document arg', () => {
  const doc = fakeDoc();
  const prev = globalThis.document;
  globalThis.document = doc;
  try {
    const panel = showGlFailPanel({ probe: () => ({ ok: false }), buildId: 'abc1234' });
    assert.equal(panel, doc.panel);
    assert.equal(doc.build.textContent, 'abc1234');
    assert.equal(doc.loading.classList.contains('gl-failed'), true);
    assert.equal(doc.panel.hidden, false);
  } finally {
    globalThis.document = prev;
  }
});

test('showGlFailIfNeeded paints immediately when nogl is on and skips when GL is healthy', () => {
  const dead = fakeDoc();
  assert.equal(glIsDeadAtBoot({ search: '?nogl=1', probe: () => ({ ok: false }) }), true);
  assert.equal(showGlFailIfNeeded(dead, { search: '?nogl=1', probe: () => ({ ok: false }), buildId: 'dead' }), true);
  assert.equal(dead.panel.hidden, false);
  assert.equal(dead.build.textContent, 'dead');
  const live = fakeDoc();
  assert.equal(glIsDeadAtBoot({ search: '', win: {}, probe: () => ({ ok: true }) }), false);
  assert.equal(showGlFailIfNeeded(live, { search: '', win: {}, probe: () => ({ ok: true }) }), false);
  assert.equal(live.panel.hidden, true);
});

test('MG-UI-40: fallback panel shows the HUD build tag', () => {
  const doc = fakeDoc();
  showGlFailPanel(doc, { probe: () => ({ ok: false }) });
  assert.equal(doc.build.textContent, BUILD_ID);
  assert.equal(doc.pageBuild.textContent, BUILD_ID);
  const html = src('../index.html');
  assert.match(html, /id="gl-fail-build"/);
  assert.match(src('../src/ui/glFail.js'), /BUILD_ID/);
  assert.match(src('../src/ui/theme.css'), /gl-fail-build/);
});

test('showGlFailPanel paints the loading fallback', () => {
  const doc = fakeDoc();
  const panel = showGlFailPanel(doc, { probe: () => ({ ok: false }) });
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
  assert.equal(doc.status.hidden, true);
});

test('MG-UI-41: Retry keeps Trying again for 600ms even if the probe fails instantly', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  assert.equal(GL_FAIL_RETRY_MS, 600);
  const doc = fakeDoc();
  let during = null;
  showGlFailPanel(doc, {
    probe: () => {
      during = { text: doc.btn.textContent, disabled: doc.btn.disabled, status: doc.status.textContent };
      return { ok: false, reason: 'force' };
    },
  });
  doc.btn.onclick({ preventDefault() {} });
  assert.equal(during.text, GL_FAIL_TRYING);
  assert.equal(during.disabled, true);
  assert.equal(during.status, GL_FAIL_TRYING);
  assert.equal(doc.btn.disabled, true);
  assert.equal(doc.btn.textContent, GL_FAIL_TRYING);
  t.mock.timers.tick(599);
  assert.equal(doc.btn.disabled, true);
  assert.equal(doc.btn.textContent, GL_FAIL_TRYING);
  assert.equal(doc.status.textContent, GL_FAIL_TRYING);
  t.mock.timers.tick(1);
  assert.equal(doc.btn.disabled, false);
  assert.equal(doc.btn.textContent, GL_FAIL_RETRY);
  assert.equal(doc.status.hidden, false);
  assert.equal(doc.status.textContent, glFailStatusLine(1));
  assert.match(doc.status.textContent, /Still couldn't start 3D/);
  assert.match(doc.status.textContent, /Try 1/);
  doc.btn.onclick({ preventDefault() {} });
  t.mock.timers.tick(GL_FAIL_RETRY_MS);
  assert.equal(doc.status.textContent, glFailStatusLine(2));
  assert.match(doc.status.textContent, /Try 2/);
  assert.equal(GL_FAIL_STILL, "Still couldn't start 3D. Check the tips above.");
});

test('Retry success waits out the 600ms minimum then continues boot', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const doc = fakeDoc();
  let boots = 0;
  showGlFailPanel(doc, {
    probe: () => ({ ok: true }),
    onSuccess: () => { boots += 1; },
  });
  doc.btn.onclick({ preventDefault() {} });
  assert.equal(boots, 0);
  assert.equal(doc.btn.textContent, GL_FAIL_TRYING);
  assert.equal(doc.btn.disabled, true);
  t.mock.timers.tick(599);
  assert.equal(boots, 0);
  assert.equal(doc.panel.hidden, false);
  t.mock.timers.tick(1);
  assert.equal(boots, 1);
  assert.equal(doc.panel.hidden, true);
  assert.equal(doc.loading.classList.contains('gl-failed'), false);
  hideGlFailPanel(doc);
  assert.equal(doc.panel.hidden, true);
});

test('Retry fires from a pointerup tap as well as click', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const doc = fakeDoc();
  showGlFailPanel(doc, { probe: () => ({ ok: false, reason: 'force' }) });
  assert.equal(typeof doc.btn.onpointerup, 'function');
  doc.btn.onpointerup({ preventDefault() {}, stopPropagation() {}, pointerType: 'touch' });
  assert.equal(doc.btn.textContent, GL_FAIL_TRYING);
  assert.equal(doc.btn.disabled, true);
  t.mock.timers.tick(GL_FAIL_RETRY_MS);
  assert.equal(doc.status.textContent, glFailStatusLine(1));
  doc.btn.onpointerup({ preventDefault() {}, stopPropagation() {}, pointerType: 'touch' });
  doc.btn.onclick({ preventDefault() {}, stopPropagation() {} });
  t.mock.timers.tick(GL_FAIL_RETRY_MS);
  assert.equal(doc.status.textContent, glFailStatusLine(2));
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
  assert.match(html, /id="gl-fail-status"/);
  assert.match(html, /id="gl-fail-build"/);
  const theme = src('../src/ui/theme.css');
  assert.match(theme, /#gl-fail(?:-retry)?[^{]*\{[\s\S]*touch-action:\s*manipulation/);
  assert.match(theme, /#gl-fail \.start[\s\S]*min-height:\s*48px/);
  assert.match(theme, /#loading\.gl-failed > :not\(#gl-fail\) \{[\s\S]*pointer-events:\s*none/);
  assert.match(src('../src/ui/glFail.js'), /onpointerup/);
  assert.match(src('../src/ui/glFail.js'), /GL_FAIL_RETRY_MS/);
  assert.match(html, /hardware acceleration/);
  assert.match(main, /showBootGlFail/);
  assert.match(main, /showGlFailIfNeeded/);
  assert.match(main, /glDeadAtBoot/);
  assert.match(main, /resumeAfterGlFail/);
  assert.match(main, /defaultGlProbe/);
  assert.match(main, /armContextLost/);
  assert.match(main, /onSuccess: resumeAfterGlFail/);
  const mountAt = main.indexOf('let loadingScreen');
  const earlyAt = main.indexOf('showGlFailIfNeeded({');
  const bridgeAt = main.lastIndexOf('runLegacySaveBridge');
  assert.ok(mountAt >= 0 && earlyAt > mountAt && bridgeAt > earlyAt);
  assert.match(main, /if \(!sendingToLedger && !glDeadAtBoot\)/);
  assert.doesNotMatch(main, /localStorage\.(removeItem|clear)/);
  assert.doesNotMatch(boot, /saveio|savebridge/);
});
