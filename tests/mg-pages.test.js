import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { publicBase, resolveBuildId } from '../vite.config.js';

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
  assert.match(src('../docs/worldView-interface.md'), /mocksocial=1/);
  assert.match(src('../docs/SOCIAL_SPEC.md'), /monstergate\.online\/\?mmo=1&mocksocial=1/);
});

test('gh-pages build stamps origin/main, not the deploy-branch SHA', () => {
  assert.equal(resolveBuildId({ env: { VITE_BUILD_ID: 'abc1234' }, branch: 'gh-pages', headSha: '64fde99', mainSha: '00eeb62' }), 'abc1234');
  assert.equal(resolveBuildId({ env: {}, branch: 'gh-pages', headSha: '64fde99', mainSha: '00eeb62' }), '00eeb62');
  assert.equal(resolveBuildId({ env: {}, branch: 'main', headSha: '00eeb62', mainSha: '00eeb62' }), '00eeb62');
  assert.equal(resolveBuildId({ env: {}, branch: 'cursor/pass-19-hud-mock-fda8', headSha: '39e2ae1', mainSha: '00eeb62' }), '39e2ae1');
  assert.match(src('../vite.config.js'), /origin\/main/);
});
