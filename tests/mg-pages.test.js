import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { publicBase } from '../vite.config.js';

const src = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

test('Pages CNAME is the custom domain and the Vite base defaults to /', () => {
  assert.equal(src('../public/CNAME').trim(), 'monstergate.online');
  assert.equal(publicBase({}), '/');
  assert.equal(publicBase({ VITE_BASE: '' }), '/');
  assert.equal(publicBase({ VITE_BASE: '/monster-gate/' }), '/monster-gate/');
  assert.equal(publicBase({ VITE_BASE: '/monster-gate' }), '/monster-gate/');
  assert.match(src('../package.json'), /build:gh-path/);
  assert.match(src('../docs/debug-flags.md'), /https:\/\/monstergate\.online\/\?debug=1/);
  assert.match(src('../docs/worldView-interface.md'), /https:\/\/monstergate\.online\/\?mmo=1&mockwake=1/);
});
