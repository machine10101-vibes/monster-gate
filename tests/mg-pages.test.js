import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createContext, runInContext } from 'node:vm';
import { publicBase, resolveBuildId, resolveMmoUrl, stampIndexHtml } from '../vite.config.js';

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
  assert.match(html, /'__MG_' \+ 'BUILD__'/);
  assert.match(html, /searchParams\.has\('mgb'\)/);
  assert.match(html, /id="build-stale"/);
  assert.match(html, /New version available, it'll load in a few minutes/);
  assert.match(html, /__mgForceBuildReload/);
  assert.match(main, /showStaleBuildNotice/);
  assert.match(main, /searchParams\.has\('mgb'\)/);
  assert.match(main, /__mgForceBuildReload/);
  assert.doesNotMatch(html, /cache: 'reload'/);
  assert.match(html, /__mgHuntStarted/);
  assert.match(html, /__mgOfferBuildReload/);
  assert.match(html, /id="build-reload"/);
  assert.match(html, /New version available, reload\?/);
  assert.doesNotMatch(html, /mg-build-reload/);
  assert.match(main, /offerBuildReload/);
  assert.match(main, /syncPublishedBuild/);
  assert.match(main, /cache: 'no-store'/);
  assert.match(main, /remote === BUILD_ID/);
  assert.match(main, /captureHunter\(\)/);
  assert.match(main, /progress\?\.save\?\.\(false\)/);
  assert.match(vite, /fileName: 'version\.json'/);
  assert.match(vite, /transformIndexHtml/);
  assert.match(vite, /stampIndexHtml/);
  assert.match(vite, /content="__MG_BUILD__"/);
  assert.doesNotMatch(vite, /replaceAll\('__MG_BUILD__'/);
});

test('MG-SYS-10: stamping index.html leaves the version.json guard and fetch intact', async () => {
  const stamp = 'deadbee';
  const html = src('../index.html');
  const naive = html.replaceAll('__MG_BUILD__', stamp);
  assert.doesNotMatch(naive, /mine === 'deadbee'/);
  assert.match(naive, /'__MG_' \+ 'BUILD__'/);

  const out = stampIndexHtml(html, stamp);
  assert.match(out, /name="mg-build" content="deadbee"/);
  assert.match(out, /'__MG_' \+ 'BUILD__'/);
  assert.doesNotMatch(out, /mine === 'deadbee'/);
  assert.doesNotMatch(out, /content="__MG_BUILD__"/);
  assert.match(out, /version\.json\?t=/);
  assert.match(out, /cache: 'no-store'/);

  const boot = out.match(/<script>\s*(\(function \(\) \{[\s\S]*?\}\)\(\);)/)?.[1];
  assert.ok(boot, 'inline boot script');

  const fetches = [];
  const sandbox = {
    Date,
    URL,
    document: {
      querySelector: (sel) => (String(sel).includes('mg-build') ? { getAttribute: () => stamp } : null),
      body: { classList: { contains: () => false } },
    },
    location: { href: 'https://monstergate.online/', search: '' },
    window: {},
    fetch(url, opts) {
      fetches.push({ url: String(url), cache: opts?.cache });
      return Promise.resolve({ ok: true, json: async () => ({ build: stamp }) });
    },
  };
  sandbox.window = sandbox;
  runInContext(boot, createContext(sandbox));
  await Promise.resolve();
  await Promise.resolve();
  const hit = fetches.find((f) => String(f.url).includes('version.json'));
  assert.ok(hit, `boot script must fetch version.json, got ${JSON.stringify(fetches)}`);
  assert.match(String(hit.url), /[?&]t=/);
  assert.equal(hit.cache, 'no-store');
});

test('MG-SYS-11: a stale ?mgb= does not replace again; title shows a wait notice', async () => {
  const stamp = 'oldsha1';
  const html = stampIndexHtml(src('../index.html'), stamp);
  const boot = html.match(/<script>\s*(\(function \(\) \{[\s\S]*?\}\)\(\);)/)?.[1];
  assert.ok(boot, 'inline boot script');

  let replaced = null;
  let reloaded = 0;
  const stale = {
    classList: { hidden: true, remove(name) { if (name === 'hidden') this.hidden = false; } },
  };
  const fetches = [];
  const sandbox = {
    Date,
    URL,
    document: {
      readyState: 'complete',
      addEventListener() {},
      querySelector: (sel) => (String(sel).includes('mg-build') ? { getAttribute: () => stamp } : null),
      getElementById: (id) => (id === 'build-stale' ? stale : null),
      body: { classList: { contains: () => false } },
    },
    location: {
      href: 'https://monstergate.online/?mgb=oldsha1',
      search: '?mgb=oldsha1',
      replace(url) { replaced = String(url); },
      reload() { reloaded += 1; },
    },
    window: {},
    fetch(url, opts) {
      fetches.push({ url: String(url), cache: opts?.cache });
      return Promise.resolve({ ok: true, json: async () => ({ build: 'newsha2' }) });
    },
  };
  sandbox.window = sandbox;
  const ctx = createContext(sandbox);
  runInContext(boot, ctx);
  await Promise.resolve();
  await Promise.resolve();
  const hit = fetches.find((f) => String(f.url).includes('version.json'));
  assert.ok(hit);
  assert.equal(hit.cache, 'no-store');
  ctx.__mgApplyBuildReload('newsha2');
  assert.equal(replaced, null, 'must not location.replace when ?mgb= is already set');
  assert.equal(stale.classList.hidden, false, 'title notice must unhide');
  ctx.__mgForceBuildReload('newsha2');
  assert.equal(reloaded, 1, 'in-world reload still reloads when mgb is present');
});

test('MG-SYS-11: first mismatch without ?mgb= still does one cache-bust replace', async () => {
  const stamp = 'oldsha1';
  const html = stampIndexHtml(src('../index.html'), stamp);
  const boot = html.match(/<script>\s*(\(function \(\) \{[\s\S]*?\}\)\(\);)/)?.[1];
  let replaced = null;
  const sandbox = {
    Date,
    URL,
    document: {
      readyState: 'complete',
      addEventListener() {},
      querySelector: (sel) => (String(sel).includes('mg-build') ? { getAttribute: () => stamp } : null),
      getElementById: () => null,
      body: { classList: { contains: () => false } },
    },
    location: {
      href: 'https://monstergate.online/',
      search: '',
      replace(url) { replaced = String(url); },
    },
    window: {},
    fetch() {
      return Promise.resolve({ ok: true, json: async () => ({ build: 'newsha2' }) });
    },
  };
  sandbox.window = sandbox;
  const ctx = createContext(sandbox);
  runInContext(boot, ctx);
  ctx.__mgApplyBuildReload('newsha2');
  assert.match(String(replaced), /[?&]mgb=newsha2/);
});
