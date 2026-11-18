import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import {
  finishVideoAtEnd,
  LOAD_KEY_CHROMA,
  LOAD_KEY_HI,
  LOAD_KEY_LO,
  LOAD_MIN_MS,
  emberCount,
  lumaKeyRgba,
  lumaOf,
  mountLoading,
  nextTip,
  remainMinDisplay,
  setLoadProgress,
} from '../src/ui/boot.js';
import { consumeRotationRecovery, rememberRotationRecovery, screenOrientation } from '../src/engine/rotationRecovery.js';

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
    play() { node.paused = false; node.listeners.play?.(); return Promise.resolve(); },
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

test('boot helpers let the logo clip finish naturally and honor the min display', () => {
  assert.equal(remainMinDisplay(1000, 1200, 1500), 1300);
  assert.equal(remainMinDisplay(1000, 4000, 1500), 0);
  assert.equal(LOAD_MIN_MS, 1500);

  const playing = { currentTime: 3.6, ended: false, pause() { this.paused = true; } };
  assert.equal(finishVideoAtEnd(playing), false);
  assert.equal(playing.paused, undefined);
  assert.equal(playing.currentTime, 3.6);

  const ended = { currentTime: 6.2, ended: true, pause() { this.paused = true; } };
  assert.equal(finishVideoAtEnd(ended), true);
  assert.equal(ended.paused, true);
  assert.equal(ended.currentTime, 6.2, 'the final frame is not rewound');

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
  assert.equal(doc.map.loading.classList.contains('video-playing'), true, 'native video playback is used without per-frame canvas work');
  assert.ok(doc.map['load-embers'].children.length > 0);
  assert.match(doc.map['load-tip'].textContent, /Monster Gate/);

  ui.setProgress(0.4, 'carving the gate');
  assert.equal(doc.map['load-fill'].style.width, '40%');
  assert.equal(doc.map['load-text'].textContent, 'carving the gate');

  doc.map['load-video'].currentTime = 3.7;
  assert.equal(doc.map.loading.classList.contains('held'), false, 'the clip keeps playing while progress changes');
  assert.equal(doc.map['load-video'].paused, false);

  doc.map['load-video'].currentTime = 6.2;
  doc.map['load-video'].ended = true;
  doc.map['load-video'].listeners.ended();
  assert.equal(doc.map.loading.classList.contains('held'), true);
  assert.equal(doc.map['load-video'].paused, true);
  assert.equal(doc.map['load-video'].currentTime, 6.2);

  await ui.dismiss({ now: 4000, wait: () => 0 });
  assert.equal(doc.map.loading.classList.contains('fading'), true);
  assert.equal(doc.map.loading.classList.contains('hidden'), true);
});

test('a splash is never replayed after it has appeared in this tab, even after an interrupted reload', async () => {
  const values = new Map();
  const store = {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
  const noTimers = { setInterval: () => 0, clearInterval: () => {} };
  const first = fakeDoc();
  const firstUi = mountLoading(first, { ...noTimers, sessionStorage: store, reduced: true, fadeMs: 0 });
  assert.equal(first.map.loading.classList.contains('hidden'), false);
  assert.equal(values.get('mg-load-seen'), '1');
  assert.equal(values.get('mg-load-in-progress'), '1', 'splash uses its own in-progress marker');
  assert.equal(values.has('mg-boot'), false, 'game crash-recovery marker is independent');
  await firstUi.dismiss({ now: 4000, wait: () => 0 });
  assert.equal(values.has('mg-load-in-progress'), false, 'successful completion clears only the splash marker');
  values.set('mg-boot', '1');
  const gameReload = fakeDoc();
  mountLoading(gameReload, { ...noTimers, sessionStorage: store, reduced: true, fadeMs: 0 });
  assert.equal(gameReload.map.loading.classList.contains('hidden'), true, 'game boot marker must not replay the splash on internal reload');
  values.delete('mg-boot');

  const repeat = fakeDoc();
  mountLoading(repeat, { ...noTimers, sessionStorage: store, reduced: true, fadeMs: 0 });
  assert.equal(repeat.map.loading.classList.contains('hidden'), true, 'auth/session reload skips the already completed splash');

  values.set('mg-load-in-progress', '1');
  const interrupted = fakeDoc();
  mountLoading(interrupted, { ...noTimers, sessionStorage: store, reduced: true, fadeMs: 0 });
  assert.equal(interrupted.map.loading.classList.contains('hidden'), true, 'an interrupted world reload must not replay the splash');
});

test('loading splash suppression survives a fresh WebView session but expires', () => {
  const makeStore = () => {
    const values = new Map();
    return {
      values,
      getItem(key) { return values.get(key) ?? null; },
      setItem(key, value) { values.set(key, String(value)); },
      removeItem(key) { values.delete(key); },
    };
  };
  const persistent = makeStore();
  const firstSession = makeStore();
  const first = fakeDoc();
  mountLoading(first, { sessionStorage: firstSession, localStorage: persistent, reduced: true, now: 1000 });
  assert.equal(first.map.loading.classList.contains('hidden'), false);
  assert.equal(persistent.getItem('mg-load-seen-at'), '1000');

  const restartedSession = makeStore();
  const restarted = fakeDoc();
  mountLoading(restarted, { sessionStorage: restartedSession, localStorage: persistent, reduced: true, now: 5000 });
  assert.equal(restarted.map.loading.classList.contains('hidden'), true, 'a new WebView session skips the already-seen splash');

  const expiredSession = makeStore();
  const expired = fakeDoc();
  mountLoading(expired, { sessionStorage: expiredSession, localStorage: persistent, reduced: true, now: 1000 + 6 * 60 * 60 * 1000 });
  assert.equal(expired.map.loading.classList.contains('hidden'), false, 'a genuinely new visit can show the splash after the six-hour window');
});

test('rotation recovery is one-shot, short-lived, and only follows a real orientation change', () => {
  const values = new Map();
  const storage = {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
  assert.equal(screenOrientation(390, 844), 'portrait');
  assert.equal(screenOrientation(844, 390), 'landscape');
  assert.equal(rememberRotationRecovery(storage, 'hunter-1', 'portrait', 1000), true);
  assert.equal(consumeRotationRecovery(storage, 'portrait', 2000), null, 'same-orientation fresh boots still require login');
  assert.equal(rememberRotationRecovery(storage, 'hunter-1', 'portrait', 1000), true);
  assert.deepEqual(consumeRotationRecovery(storage, 'landscape', 2000), { characterId: 'hunter-1' });
  assert.equal(consumeRotationRecovery(storage, 'landscape', 2001), null, 'handoff is consumed once');
  assert.equal(rememberRotationRecovery(storage, 'hunter-1', 'portrait', 1000), true);
  assert.equal(consumeRotationRecovery(storage, 'landscape', 122000), null, 'stale handoffs never bypass login');
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
  assert.doesNotMatch(theme, /mix-blend-mode:\s*screen/);
  assert.match(theme, /mask-image:\s*radial-gradient\(ellipse 74% 84%/);
  assert.match(theme, /linear-gradient\(to right, transparent 0%, #000 10%/);
  assert.match(theme, /linear-gradient\(to bottom, transparent 0%, #000 8%/);
  assert.match(theme, /-webkit-mask-image:/);
  assert.match(theme, /mask-composite:\s*intersect/);
  assert.match(theme, /\.load-poster,\s*\n#load-video,\s*\n\.load-key \{[\s\S]*background:\s*transparent/);
  assert.match(theme, /\.load-stage \{[\s\S]*background:\s*transparent/);
  assert.match(theme, /\.load-shell \{[\s\S]*background:\s*transparent/);
  assert.doesNotMatch(theme, /\.load-stage::after \{/);
});

test('luma key punches near-black and keeps logo faces and grout', () => {
  assert.equal(LOAD_KEY_LO, 22);
  assert.equal(LOAD_KEY_HI, 40);
  assert.equal(LOAD_KEY_CHROMA, 18);
  const px = (r, g, b, a = 255) => [r, g, b, a];
  const buf = Uint8ClampedArray.from([
    ...px(0, 0, 0),
    ...px(12, 12, 12),
    ...px(221, 189, 185),
    ...px(255, 255, 255),
    ...px(26, 7, 3),
    ...px(214, 88, 38),
    ...px(11, 9, 10),
  ]);
  lumaKeyRgba(buf);
  assert.equal(buf[3], 0, 'pure black surround');
  assert.equal(buf[7], 0, 'near-black surround');
  assert.equal(buf[8], 221);
  assert.equal(buf[11], 255, 'stone letter face stays opaque');
  assert.ok(lumaOf(buf[8], buf[9], buf[10]) >= 190);
  assert.equal(buf[12], 255);
  assert.equal(buf[15], 255, 'white stays opaque');
  assert.equal(buf[19], 255, 'dark red grout stays');
  assert.equal(buf[20], 214);
  assert.equal(buf[23], 255, 'gold .online stays');
  assert.equal(buf[27], 0, 'neutral dark outline-adjacent black keys out');
});

test('index.html loading markup has the clip, no extra title, bar below', () => {
  const html = src('index.html');
  const loading = html.slice(html.indexOf('id="loading"'), html.indexOf('id="title"'));
  assert.match(loading, /id="load-video"/);
  assert.match(loading, /id="load-key"/);
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

  assert.doesNotMatch(main, /readResumeCharacter|rememberResumeCharacter|mg-resume-character/, 'a page restart must never auto-enter a saved hunter');
  assert.match(main, /clearSession\(\);/, 'fresh boot returns to the explicit login gate');
  assert.match(main, /if \(signed\) \{\s*this\.openCharacterSelect\(\);/, 'successful email sign-in opens character selection');
  assert.match(main, /mountLoading/);
  assert.match(main, /loadingScreen\.dismiss/);
  assert.match(main, /this\.safeBoot = isIOS\(\) \|\| isTablet\(\) \|\| !isDesktopGraphics\(\) \|\| killed/);
  assert.match(main, /if \(this\.started && this\.bootFrames >= 0\)/);
  assert.match(main, /this\.bootFrames === 600/);
  assert.match(main, /this\.enterImmersive\(\{ gesture: false, lock: false \}\)/);
  assert.doesNotMatch(main, /requestGameFullscreen\(true\)/);
  assert.doesNotMatch(main, /lock:\s*this\.isLandscape\(\)\s*&&\s*!tablet/, 'generic touch/click handler must not request orientation lock');
  const immersive = main.slice(main.indexOf('  syncImmersive()'), main.indexOf('  tuckChrome()'));
  assert.match(immersive, /scheduleResize\(\)/, 'orientation and viewport events coalesce renderer resizes');
  assert.doesNotMatch(immersive, /this\.tuckChrome\(\)/, 'orientation changes must not scroll or resize the document to hide browser chrome');
  assert.doesNotMatch(immersive, /setTimeout\(sync, 80\)|setTimeout\(sync, 350\)/, 'avoid repeated delayed resize passes after rotation');
  assert.doesNotMatch(main, /clearSkip/);
  assert.doesNotMatch(src('src/ui/boot.js'), /requestAnimationFrame|keySourceToCanvas\(video/);
  assert.match(theme, /#load-key \{ display: none !important; \}/);
  assert.match(theme, /#loading\.video-playing \.load-poster/);
  assert.match(src('src/ui/charselect.js'), /single-character/);
  assert.match(src('src/style.css'), /#charselect\.single-character \.cs-panel/);
  assert.match(theme, /#loading\.held \.load-glow/);
  assert.match(theme, /#loading\.held #load-video \\{ opacity: 0; \\}/);
  assert.match(theme, /#loading\.held \.load-poster \\{ opacity: 1; \\}/);
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
