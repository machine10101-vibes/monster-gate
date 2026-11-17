import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { guardFreshPanel, resetPanelPointers, trackPanelPointers } from '../src/ui/panelGesture.js';

const src = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

function eventTarget() {
  const listeners = new Map();
  return {
    timers: [],
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
    },
    removeEventListener(type, fn) {
      listeners.get(type)?.delete(fn);
    },
    dispatch(type, event) {
      event.type = type;
      for (const fn of [...(listeners.get(type) || [])]) fn(event);
    },
    setTimeout(fn) {
      this.timers.push(fn);
      return this.timers.length;
    },
    clearTimeout() {},
  };
}

function classList() {
  const set = new Set();
  return {
    add: (c) => set.add(c),
    remove: (c) => set.delete(c),
    contains: (c) => set.has(c),
  };
}

function pointer(id, x, y) {
  return {
    pointerId: id,
    clientX: x,
    clientY: y,
    prevented: false,
    stopped: false,
    preventDefault() { this.prevented = true; },
    stopPropagation() { this.stopped = true; },
  };
}

test('a tap opens the tome and the same gesture cannot close it', () => {
  resetPanelPointers();
  const target = eventTarget();
  const panel = { classList: classList() };
  trackPanelPointers(target);
  target.dispatch('pointerdown', pointer(1, 40, 500));
  assert.equal(guardFreshPanel(panel, target), true);
  assert.equal(panel.classList.contains('panel-gesture'), true);

  const up = pointer(1, 40, 500);
  target.dispatch('pointerup', up);
  assert.equal(up.prevented, true);
  assert.equal(panel.classList.contains('panel-gesture'), false);

  const closing = pointer(1, 40, 500);
  target.dispatch('click', closing);
  assert.equal(closing.stopped, true);

  const stray = pointer(1, 300, 40);
  target.dispatch('click', stray);
  assert.equal(stray.stopped, true);

  target.dispatch('pointerdown', pointer(2, 300, 40));
  const choose = pointer(2, 300, 40);
  target.dispatch('click', choose);
  assert.equal(choose.stopped, false);
});

test('a keyboard open does not arm the gesture guard', () => {
  resetPanelPointers();
  const target = eventTarget();
  const panel = { classList: classList() };
  trackPanelPointers(target);
  assert.equal(guardFreshPanel(panel, target), false);
  assert.equal(panel.classList.contains('panel-gesture'), false);
});

test('the tome is wired to ignore the opening press', () => {
  const hud = src('../src/ui/hud.js');
  const theme = src('../src/ui/theme.css');
  const input = src('../src/engine/input.js');
  assert.match(hud, /guardFreshPanel\(this\.el\.panel\)/);
  assert.match(theme, /#panel\.panel-gesture/);
  assert.match(input, /trackPanelPointers/);
  const up = input.slice(input.indexOf('const up ='));
  assert.match(up.slice(0, 180), /preventDefault\(\)/);
});
