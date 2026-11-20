import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { publicBase, resolveBuildId, resolveMmoUrl } from '../vite.config.js';

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

test('gh-pages World 1 URL comes from MG_WORLD_URL and stays empty by default', () => {
  assert.equal(resolveMmoUrl({}), '');
  assert.equal(resolveMmoUrl({ MG_WORLD_URL: 'wss://world.example/ws' }), 'wss://world.example/ws');
  assert.match(src('../vite.config.js'), /MG_WORLD_URL/);
  assert.match(src('../README.md'), /MG_WORLD_URL=/);
});

test('gh-pages build stamps origin/main, not the deploy-branch SHA', () => {
  assert.equal(resolveBuildId({ env: { VITE_BUILD_ID: 'abc1234' }, branch: 'gh-pages', headSha: '64fde99', mainSha: '00eeb62' }), 'abc1234');
  assert.equal(resolveBuildId({ env: { VITE_BUILD_ID: 'e92c7e1b3a4c5d6e7f8091a2b3c4d5e6f8091a2b' }, branch: 'main', headSha: 'deadbee', mainSha: '00eeb62' }), 'e92c7e1');
  assert.equal(resolveBuildId({ env: {}, branch: 'gh-pages', headSha: '64fde99', mainSha: '00eeb62' }), '00eeb62');
  assert.equal(resolveBuildId({ env: {}, branch: 'main', headSha: '00eeb62', mainSha: '00eeb62' }), '00eeb62');
  assert.equal(resolveBuildId({ env: {}, branch: 'cursor/pass-19-hud-mock-fda8', headSha: '39e2ae1', mainSha: '00eeb62' }), '39e2ae1');
  assert.match(src('../vite.config.js'), /origin\/main/);
  assert.match(src('../vite.config.js'), /shortenBuildId/);
  assert.match(src('../.github/workflows/publish-pages.yml'), /GITHUB_SHA:0:7/);
  assert.match(src('../.github/workflows/publish-pages.yml'), /steps\.buildid\.outputs\.short/);
  assert.doesNotMatch(src('../.github/workflows/publish-pages.yml'), /VITE_BUILD_ID: \$\{{\s*github\.sha\s*\}\}/);
});

test('Pages index.html cache-busts the build tag via version.json', () => {
  const html = src('../index.html');
  const vite = src('../vite.config.js');
  const main = src('../src/main.js');
  assert.match(html, /Cache-Control" content="no-cache, no-store, must-revalidate"/);
  assert.match(html, /name="mg-build"/);
  assert.match(html, /version\.json\?t=/);
  assert.match(html, /cache: 'no-store'/);
  assert.match(html, /mg-build-reload/);
  assert.match(html, /__mgHuntStarted/);
  assert.match(html, /__mgOfferBuildReload/);
  assert.match(html, /id="build-reload"/);
  assert.match(html, /New version available, reload\?/);
  assert.match(main, /offerBuildReload/);
  assert.match(main, /captureHunter\(\)/);
  assert.match(main, /progress\?\.save\?\.\(false\)/);
  assert.match(vite, /fileName: 'version\.json'/);
  assert.match(vite, /transformIndexHtml/);
  assert.match(vite, /__MG_BUILD__/);
});
