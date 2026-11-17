import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { nextResScale, renderPixelRatio } from '../src/engine/pixels.js';

const src = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

test('the canvas is drawn at the screen pixel ratio, capped by the quality setting', () => {
  assert.equal(renderPixelRatio(2, 2, 1), 2);
  assert.equal(renderPixelRatio(1, 2, 1), 1);
  assert.equal(renderPixelRatio(3, 2, 1), 2);
  assert.equal(renderPixelRatio(2, 1, 1), 1);
  assert.equal(renderPixelRatio(2, 2, 0.85), 1.7);
  assert.equal(renderPixelRatio(0, 2, 1), 1);
  assert.equal(renderPixelRatio(2, 0, 1), 2);
});

test('desktop resolution does not drop, and a phone never drops into a blur', () => {
  assert.equal(nextResScale(1, 40, { allowDrop: false }), 1);
  assert.equal(nextResScale(0.9, 40, { allowDrop: false }), 1);
  assert.equal(nextResScale(1, 40, { allowDrop: true }), 0.95);
  assert.equal(nextResScale(0.85, 80, { allowDrop: true }), 0.85);
  assert.equal(nextResScale(0.85, 10, { allowDrop: true }), 0.9);
  assert.equal(nextResScale(1, 10, { allowDrop: true }), 1);
});

test('the game canvas is not cover-fitted, and Medium draws at native pixels', () => {
  const css = src('../src/style.css');
  const main = src('../src/main.js');
  const atlas = src('../src/engine/materials.js');
  assert.doesNotMatch(css, /#game \{[^}]*object-fit:\s*cover/);
  assert.match(css, /#game \{[^}]*image-rendering:\s*crisp-edges/);
  assert.match(css, /#game \{[^}]*image-rendering:\s*pixelated/);
  assert.match(main, /renderPixelRatio\(/);
  assert.match(main, /id: 'medium'[\s\S]*dpr: 2/);
  assert.doesNotMatch(main, /sqrt\(800000/);
  assert.match(atlas, /NearestFilter/);
  assert.doesNotMatch(atlas, /LinearMipmapLinearFilter/);
});
