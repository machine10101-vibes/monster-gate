import test from 'node:test';
import assert from 'node:assert/strict';
import { COMBOS, comboStyle, comboStep, comboGuard, sampleStep, stepLunge } from '../src/entities/attackCombos.js';

const STYLES = ['sword', 'greatsword', 'hammer', 'spear', 'scythe', 'dual', 'claws'];

test('each melee weapon class maps to its own combo set', () => {
  assert.equal(comboStyle({ kind: 'melee', style: 'swordshield', held: 'orcblade' }), 'sword');
  assert.equal(comboStyle({ kind: 'melee', style: 'twohand', held: 'darkgreatsword' }), 'greatsword');
  assert.equal(comboStyle({ kind: 'melee', style: 'twohand', held: 'piratecleaver' }), 'greatsword');
  assert.equal(comboStyle({ kind: 'melee', style: 'twohand', held: 'holyhammer' }), 'hammer');
  assert.equal(comboStyle({ kind: 'melee', style: 'twohand', held: 'budgemaul' }), 'hammer');
  assert.equal(comboStyle({ kind: 'melee', style: 'twohand', held: 'yetispear' }), 'spear');
  assert.equal(comboStyle({ kind: 'melee', style: 'twohand', held: 'raptorscythe' }), 'scythe');
  assert.equal(comboStyle({ kind: 'melee', style: 'dual', held: 'piratedual' }), 'dual');
  assert.equal(comboStyle({ kind: 'melee', style: 'dual', held: 'tigerclaws' }), 'claws');
  assert.equal(comboStyle({ kind: 'melee', held: 'pick' }), 'sword');
});

test('every class has three distinct steps with an ordered wind-up, contact and recovery', () => {
  for (const style of STYLES) {
    const steps = COMBOS[style];
    assert.equal(steps.length, 3, style);
    for (const [i, step] of steps.entries()) {
      const times = step.keys.map((k) => k.t);
      for (let j = 1; j < times.length; j++) assert.ok(times[j] > times[j - 1], `${style} ${i} keys ordered`);
      assert.equal(times.at(-1), 1, `${style} ${i} returns to guard`);
      assert.ok(step.hit > 0.25 && step.hit < 0.65, `${style} ${i} contact frame`);
      assert.ok(times.includes(step.hit), `${style} ${i} has a contact key`);
      assert.ok(times[0] < step.hit, `${style} ${i} winds up before contact`);
      assert.ok(step.cancel > step.hit && step.cancel < 1, `${style} ${i} chains after contact`);
    }
    // The finisher is the slowest, hardest step of the chain.
    assert.ok(steps[2].dur > steps[0].dur && steps[2].dur > steps[1].dur, `${style} finisher tempo`);
    assert.ok((steps[2].dmg || 1) > 1, `${style} finisher damage`);
  }
});

test('combos differ between weapon classes', () => {
  const sig = (style) => COMBOS[style].map((s) => JSON.stringify(s.keys)).join('|');
  const seen = new Set(STYLES.map(sig));
  assert.equal(seen.size, STYLES.length);
});

test('a step starts and ends in its guard and strikes fastest around contact', () => {
  for (const style of STYLES) {
    const guard = comboGuard(style);
    for (let c = 0; c < 3; c++) {
      const step = comboStep({ kind: 'melee', held: style === 'sword' ? 'blade' : style }, undefined, c);
      const a = sampleStep(step, 0);
      const z = sampleStep(step, 1);
      for (const k of ['aR', 'aL', 'ty', 'ln']) {
        assert.ok(Math.abs(a[k] - guard[k]) < 1e-9, `${style} ${c} start ${k}`);
        assert.ok(Math.abs(z[k] - guard[k]) < 1e-9, `${style} ${c} end ${k}`);
      }
      // Average joint speed just before contact beats the speed during recovery.
      const speed = (t0, t1) => {
        const p = sampleStep(step, t0);
        const q = sampleStep(step, t1);
        return (Math.abs(q.aR - p.aR) + Math.abs(q.aL - p.aL) + Math.abs(q.ty - p.ty) + Math.abs((q.spin || 0) - (p.spin || 0))) / (t1 - t0);
      };
      const strike = speed(step.hit - 0.06, step.hit);
      const settle = speed(0.86, 1);
      assert.ok(strike > settle, `${style} ${c} strike ${strike.toFixed(2)} vs settle ${settle.toFixed(2)}`);
    }
  }
});

test('footwork only drives during the step window', () => {
  const step = comboStep({ kind: 'melee', held: 'darkspear' }, undefined, 2);
  const [, from, to] = step.lunge;
  assert.equal(stepLunge(step, from - 0.01), 0);
  assert.equal(stepLunge(step, to + 0.01), 0);
  assert.ok(stepLunge(step, (from + to) / 2) > step.lunge[0]);
});

test('spinning steps complete a full turn so they hand back to the facing', () => {
  const step = comboStep({ kind: 'melee', held: 'darkscythe' }, undefined, 2);
  assert.equal(step.arc, 'full');
  assert.ok(Math.abs(Math.abs(sampleStep(step, 1).spin) - Math.PI * 2) < 1e-9);
});
