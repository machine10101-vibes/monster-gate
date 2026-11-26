import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { smithingDurationMs, startSmithingQueue } from '../src/ui/smithingQueue.js';

function fakeElement() {
  return {
    children: [],
    style: {},
    attributes: {},
    append(...nodes) { this.children.push(...nodes); },
    appendChild(node) { this.children.push(node); return node; },
    setAttribute(key, value) { this.attributes[key] = value; },
    remove() { this.removed = true; },
  };
}

function fakeContainer() {
  const doc = { createElement: () => fakeElement() };
  return { ownerDocument: doc, children: [], appendChild(node) { this.children.push(node); } };
}

test('smithing duration scales by the number of bar-equivalent units', () => {
  assert.equal(smithingDurationMs(), 1800);
  assert.equal(smithingDurationMs(2), 3600);
  assert.equal(smithingDurationMs(5), 9000);
  assert.equal(smithingDurationMs(0), 1800);
});

test('smithing queue commits exactly one item per completed interval', () => {
  const oldNow = Date.now;
  const oldSetInterval = globalThis.setInterval;
  const oldClearInterval = globalThis.clearInterval;
  let now = 1000;
  let tick;
  let cleared = false;
  Date.now = () => now;
  globalThis.setInterval = (fn) => { tick = fn; return 7; };
  globalThis.clearInterval = (id) => { assert.equal(id, 7); cleared = true; };
  try {
    const container = fakeContainer();
    const button = { disabled: false };
    const made = [];
    let done = 0;
    startSmithingQueue({
      container,
      label: 'Smelting Iron bar',
      count: 2,
      durationMs: 1800,
      buttons: [button],
      processOne: () => { made.push(made.length + 1); return true; },
      onDone: (n) => { done = n; },
    });
    assert.equal(button.disabled, true);
    assert.equal(made.length, 0);
    now += 1799;
    tick();
    assert.equal(made.length, 0);
    now += 1;
    tick();
    assert.deepEqual(made, [1]);
    assert.equal(done, 0);
    now += 1800;
    tick();
    assert.deepEqual(made, [1, 2]);
    assert.equal(done, 2);
    assert.equal(button.disabled, false);
    assert.equal(cleared, true);
  } finally {
    Date.now = oldNow;
    globalThis.setInterval = oldSetInterval;
    globalThis.clearInterval = oldClearInterval;
  }
});

test('smithy bars and forge arrowheads use timed single-item processing', () => {
  const smithy = readFileSync(new URL('../src/ui/smithy.js', import.meta.url), 'utf8');
  const catalog = readFileSync(new URL('../src/ui/catalog.js', import.meta.url), 'utf8');
  assert.match(smithy, /startSmithingQueue/);
  assert.match(smithy, /smelt\(rec\.id, false\)/);
  assert.doesNotMatch(smithy, /smelt\(rec\.id, true\)/);
  assert.match(catalog, /queueSmithing\(container, 'Forging arrowheads'/);
  assert.match(catalog, /pr\.forgeHeads\(false\)/);
  assert.match(catalog, /Forging \$\{g\.name\}/);
});

test('smithing progress bar is compact and visible', () => {
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  assert.match(css, /\.smith-progress-track\{height:6px/);
  assert.match(css, /linear-gradient\(90deg,#d87928,#ffd36a\)/);
});
