import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import {
  LOAD_CROP_AT,
  LOAD_HOLD_AT,
  LOAD_MIN_MS,
  emberCount,
  holdVideoAtLogo,
  mountLoading,
  nextTip,
  remainMinDisplay,
  setLoadProgress,
} from '../src/ui/boot.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (rel) => readFileSync(join(root, rel), 'utf8');
const file = (rel) => join(root, rel);

function fakeNode(id) {
  const classes = new Set();
  const node = {
    id,
    style: { setProperty() {} },
    textContent: '',
    children: [],
    className: '',
    currentTime: 0,
    ended: false,
    loop: true,
    muted: false,
    playsInline: false,
    paused: false,
    listeners: {},
    classList: {
      add(...c) { c.forEach((x) => classes.add(x)); node.className = [...classes].join(' '); },
      toggle(c, on) {
        if (on ?? !classes.has(c)) classes.add(c);
        else classes.delete(c);
        node.className = [...classes].join(' ');
      },
      contains(c) { return classes.has(c); },
    },
    setAttribute() {},
    replaceChildren(...kids) { node.children = kids; },
    appendChild(c) { node.children.push(c); return c; },
    addEventListener(ev, fn) { node.listeners[ev] = fn; },
    play() { node.paused = false; return Promise.resolve(); },
    pause() { node.paused = true; },
    parentElement: { setAttribute() {} },
  };
  return node;
}

function fakeDoc() {
  const map = {
    loading: fakeNode('loading'),
    'load-video': fakeNode('load-video'),
    'load-tip': fakeNode('load-tip'),
    'load-embers': fakeNode('load-embers'),
    'load-fill': fakeNode('load-fill'),
    'load-text': fakeNode('load-text'),
  };
  return {
    map,
    getElementById(id) { return map[id] || null; },
    createElement() { return fakeNode(''); },
  };
}

test('boot helpers hold the fire-eyes logo frame and honor the min display', () => {
  assert.equal(remainMinDisplay(1000, 1200, 1500), 1300);
  assert.equal(remainMinDisplay(1000, 4000, 1500), 0);
  assert.equal(LOAD_MIN_MS, 1500);
  assert.ok(LOAD_HOLD_AT >= 3 && LOAD_HOLD_AT <= 4);
  assert.ok(LOAD_CROP_AT > LOAD_HOLD_AT && LOAD_CROP_AT < 5);

  const early = { currentTime: 2.1, pause() { this.paused = true; } };
  assert.equal(holdVideoAtLogo(early), false);
  assert.equal(early.paused, undefined);

  const mid = { currentTime: 3.6, pause() { this.paused = true; } };
  assert.equal(holdVideoAtLogo(mid), true);
  assert.equal(mid.paused, true);
  assert.equal(mid.currentTime, LOAD_HOLD_AT);

  const cropped = { currentTime: 4.4, pause() { this.paused = true; } };
  assert.equal(holdVideoAtLogo(cropped), true);
  assert.equal(cropped.paused, true);
  assert.equal(cropped.currentTime, LOAD_HOLD_AT);

  const ended = { currentTime: 6, ended: true, pause() { this.paused = true; } };
  assert.equal(holdVideoAtLogo(ended), true);
  assert.equal(ended.currentTime, LOAD_HOLD_AT);

  assert.equal(nextTip(0), 'A Monster Gate opened in the northern forest.');
  assert.equal(nextTip(5), nextTip(0));
  assert.equal(emberCount({ reduced: true }), 0);
  assert.equal(emberCount({ mobile: true }), 10);
  assert.equal(emberCount({}), 22);
});

test('loading screen mounts, tracks progress, and dismisses', async () => {
  const doc = fakeDoc();
  const ui = mountLoading(doc, { reduced: false, mobile: true, fadeMs: 0, now: 1000 });
  assert.ok(ui);
  assert.equal(doc.map['load-video'].loop, false);
  assert.equal(doc.map['load-video'].muted, true);
  assert.ok(doc.map['load-embers'].children.length > 0);
  assert.match(doc.map['load-tip'].textContent, /Monster Gate/);

  ui.setProgress(0.4, 'carving the gate');
  assert.equal(doc.map['load-fill'].style.width, '40%');
  assert.equal(doc.map['load-text'].textContent, 'carving the gate');

  doc.map['load-video'].currentTime = 3.7;
  doc.map['load-video'].listeners.timeupdate();
  assert.equal(doc.map.loading.classList.contains('held'), true);
  assert.equal(doc.map['load-video'].paused, true);

  await ui.dismiss({ now: 4000, wait: () => 0 });
  assert.equal(doc.map.loading.classList.contains('fading'), true);
  assert.equal(doc.map.loading.classList.contains('hidden'), true);
});

test('reduced motion skips the clip and embers', () => {
  const doc = fakeDoc();
  mountLoading(doc, { reduced: true, fadeMs: 0 });
  assert.equal(doc.map.loading.classList.contains('reduced'), true);
  assert.equal(doc.map['load-video'].paused, true);
  assert.equal(doc.map['load-embers'].children.length, 0);
});

test('setLoadProgress clamps and writes the fill', () => {
  const fill = fakeNode('load-fill');
  const text = fakeNode('load-text');
  assert.equal(setLoadProgress(fill, text, 1.4, 'Ready'), 1);
  assert.equal(fill.style.width, '100%');
  assert.equal(setLoadProgress(fill, text, -2, 'x'), 0);
});

test('MG-UI-20 loading stage fills the largest 3:2 box above the bar', () => {
  const theme = src('src/ui/theme.css');
  const stage = theme.slice(theme.indexOf('.load-stage {'), theme.indexOf('.load-glow'));
  assert.match(stage, /min\(92vw,\s*calc\(\(100dvh - var\(--load-chrome\)\) \* 1\.5\)\)/);
  assert.doesNotMatch(stage, /720px/);
  assert.match(theme, /#loading \{[\s\S]*--load-chrome:\s*128px/);
  assert.match(theme, /#loading #load-text \{[\s\S]*white-space:\s*nowrap/);
  assert.match(theme, /#loading #load-text \{[\s\S]*font-size:\s*14px/);
  assert.match(theme, /#load-tip \{[\s\S]*font-size:\s*15px/);
  assert.match(theme, /mask-image:\s*radial-gradient\(ellipse 62% 58%/);
  assert.match(theme, /transparent 64%/);
  assert.match(theme, /\.load-stage::after \{[\s\S]*#070308/);
});

test('index.html loading markup has the clip, no extra title, bar below', () => {
  const html = src('index.html');
  const loading = html.slice(html.indexOf('id="loading"'), html.indexOf('id="title"'));
  assert.match(loading, /id="load-video"/);
  assert.match(loading, /brand\/loading\.mp4/);
  assert.match(loading, /muted/);
  assert.match(loading, /autoplay/);
  assert.match(loading, /playsinline/);
  assert.match(loading, /id="load-tip"/);
  assert.match(loading, /id="load-fill"/);
  assert.doesNotMatch(loading, /\sloop\b/);
  assert.doesNotMatch(loading, /<h1>/);
  assert.doesNotMatch(loading, /MONSTER\s*<em>GATE/);
  assert.doesNotMatch(loading, /load-vignette/);
  assert.ok(loading.indexOf('class="load-bar"') < loading.indexOf('id="load-text"'));
  assert.ok(loading.indexOf('id="load-text"') < loading.indexOf('id="load-tip"'));
  assert.ok(loading.indexOf('id="load-video"') < loading.indexOf('id="load-fill"'));
  assert.ok(loading.indexOf('id="load-fill"') < loading.indexOf('id="load-tip"'));
});

test('favicon, manifest, and social meta point at the brand drop', () => {
  const html = src('index.html');
  const manifest = JSON.parse(src('public/manifest.webmanifest'));
  const main = src('src/main.js');
  const theme = src('src/ui/theme.css');

  assert.match(html, /rel="icon" href="\.\/favicon\.ico"/);
  assert.match(html, /favicon-32\.png/);
  assert.match(html, /favicon-16\.png/);
  assert.match(html, /apple-touch-icon\.png/);
  assert.match(html, /manifest\.webmanifest/);
  assert.match(html, /https:\/\/monstergate\.online\/brand\/og-image\.jpg/);
  assert.match(html, /twitter:card" content="summary_large_image"/);
  assert.match(html, /theme-color" content="#14060a"/);
  assert.doesNotMatch(html, /icon\.svg/);

  assert.equal(manifest.name, 'Monster Gate');
  assert.equal(manifest.display, 'fullscreen');
  assert.equal(manifest.theme_color, '#14060a');
  assert.ok(manifest.icons.some((i) => i.src.includes('icon-192.png')));
  assert.ok(manifest.icons.some((i) => i.src.includes('icon-512.png')));

  assert.match(main, /mountLoading/);
  assert.match(main, /loadingScreen\.dismiss/);
  assert.match(theme, /#loading\.held \.load-glow/);
  assert.match(theme, /prefers-reduced-motion: reduce/);
  assert.match(theme, /mask-image:\s*radial-gradient/);
  assert.match(theme, /#loading \.load-bar \{[\s\S]*height:\s*26px/);
  assert.match(theme, /\.load-cap \{[\s\S]*rotate\(45deg\)/);
  assert.doesNotMatch(theme, /\.load-vignette/);
  assert.doesNotMatch(html, /load-vignette/);
  const stage = theme.slice(theme.indexOf('.load-stage {'), theme.indexOf('.load-glow'));
  assert.match(stage, /min\(92vw,\s*calc\(\(100dvh - var\(--load-chrome\)\) \* 1\.5\)\)/);
  assert.doesNotMatch(stage, /720px/);
  assert.match(theme, /#loading #load-text \{[\s\S]*white-space:\s*nowrap/);
  assert.match(theme, /#loading #load-text \{[\s\S]*overflow:\s*visible/);
  assert.match(src('src/world/world.js'), /Raising the mountains/);
  const loading = html.slice(html.indexOf('id="loading"'), html.indexOf('id="title"'));
  assert.ok(loading.indexOf('id="load-text"') > loading.indexOf('class="load-bar"'));
  assert.ok(loading.indexOf('id="load-text"') < loading.indexOf('id="load-tip"'));

  for (const rel of [
    'public/brand/loading.mp4',
    'public/brand/loading-poster.jpg',
    'public/brand/og-image.jpg',
    'public/brand/icon-192.png',
    'public/brand/icon-512.png',
    'public/favicon.ico',
    'public/favicon-16.png',
    'public/favicon-32.png',
    'public/apple-touch-icon.png',
  ]) {
    assert.ok(existsSync(file(rel)), rel);
  }
});
