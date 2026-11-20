import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const puppeteer = require('/tmp/mg-cap/node_modules/puppeteer-core');

const CHROME = '/usr/local/bin/google-chrome';
const OUT = process.env.SHOT_DIR || '/opt/cursor/artifacts/pass42';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:4178';
const TAG = process.env.SHOT_TAG || 'after';
const log = (...a) => console.log(new Date().toISOString(), ...a);

const FOG = { r: 191, g: 224, b: 244 };

function paleBlue(r, g, b) {
  const dr = r - FOG.r;
  const dg = g - FOG.g;
  const db = b - FOG.b;
  const dist = Math.hypot(dr, dg, db);
  const skyish = b > r + 20 && b > 140 && g > 150 && r > 120;
  return dist < 42 || skyish;
}

async function waitFor(page, fn, { timeout = 180000, step = 400, label = 'wait' } = {}) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    try { if (await page.evaluate(fn)) return; } catch (err) { log(label, String(err.message || err).slice(0, 120)); }
    await new Promise((r) => setTimeout(r, step));
  }
  throw new Error('timeout ' + label);
}

async function boot(page) {
  await page.evaluateOnNewDocument(() => { try { localStorage.setItem('mg-quality', 'medium'); } catch {} });
  await page.goto(`${BASE}/?debug=1`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitFor(page, () => !!(window.__game && !window.__game.glFailed), { label: '__game' });
  await waitFor(page, () => {
    const l = document.getElementById('loading');
    return !!window.__game && (!l || l.classList.contains('hidden'));
  }, { timeout: 420000, label: 'loading' });
  await page.evaluate(() => {
    const g = window.__game;
    if (!g.wallet || g.wallet.kind !== 'guest') g.playAsGuest();
  });
  await new Promise((r) => setTimeout(r, 400));
  await page.evaluate(() => {
    const g = window.__game;
    if (!g.roster.chars.length) g.roster.create({ name: 'Scout', look: { skin: 1, hair: 1, style: 0, tunic: 0, beard: false }, classId: 'warrior' });
    const c = g.roster.chars[0];
    g.charSelect.selectedId = c.id;
    g.enterWorld(c);
  });
  await waitFor(page, () => !!window.__game?.started, { timeout: 60000, label: 'started' });
  await waitFor(page, () => (window.__game.renderer?.info?.render?.triangles | 0) > 20000, { timeout: 60000, label: 'tris' });
}

async function go(page, id) {
  await page.evaluate((spot) => {
    const g = window.__game;
    g.hud?.closePanel?.();
    g.teleportDebug(spot);
    g.snapCamera?.();
    for (let i = 0; i < 12; i++) g.world?.revealAround?.(g.player.pos.x, g.player.pos.z, 80);
    g.snapCamera?.();
  }, id);
  await new Promise((r) => setTimeout(r, 1400));
}

async function scanPale(page, name) {
  return page.evaluate((fogName) => {
    const g = window.__game;
    const gl = g.renderer.getContext();
    const w = g.renderer.domElement.width;
    const h = g.renderer.domElement.height;
    const buf = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    const hits = [];
    const x0 = 0;
    const x1 = Math.floor(w * 0.28);
    const y0 = Math.floor(h * 0.52);
    const y1 = h;
    let maxDist = 0;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = ((h - 1 - y) * w + x) * 4;
        const r = buf[i];
        const gch = buf[i + 1];
        const b = buf[i + 2];
        const dist = Math.hypot(r - 191, gch - 224, b - 244);
        const skyish = b > r + 20 && b > 140 && gch > 150 && r > 120;
        if (dist < 42 || skyish) {
          hits.push({ x, y, r, g: gch, b, dist: +dist.toFixed(1) });
          maxDist = Math.max(maxDist, dist);
        }
      }
    }
    return { name: fogName, w, h, hits: hits.length, sample: hits.slice(0, 8), maxDist };
  }, name);
}

fs.mkdirSync(OUT, { recursive: true });

const sizes = [
  { w: 1920, h: 1200 },
  { w: 1920, h: 1080 },
  { w: 1280, h: 800 },
];

for (const size of sizes) {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', `--window-size=${size.w},${size.h}`],
    defaultViewport: { width: size.w, height: size.h, deviceScaleFactor: 1 },
  });
  try {
    const page = await browser.newPage();
    page.on('pageerror', (err) => log('pageerror', err.message));
    await boot(page);
    await go(page, 'brookside');
    const file = path.join(OUT, `${TAG}_brook_${size.w}x${size.h}.png`);
    await page.screenshot({ path: file, type: 'png' });
    const scan = await scanPale(page, `brook ${size.w}x${size.h}`);
    fs.writeFileSync(path.join(OUT, `${TAG}_brook_${size.w}x${size.h}.json`), JSON.stringify(scan, null, 2));
    log('saved', file, 'paleHits', scan.hits);

    await page.evaluate(() => {
      const g = window.__game;
      g.cam.targetDist = 36;
      g.cam.dist = 36;
      g.snapCamera?.();
    });
    await new Promise((r) => setTimeout(r, 800));
    const outFile = path.join(OUT, `${TAG}_brook_out_${size.w}x${size.h}.png`);
    await page.screenshot({ path: outFile, type: 'png' });
    const scanOut = await scanPale(page, `brook_out ${size.w}x${size.h}`);
    fs.writeFileSync(path.join(OUT, `${TAG}_brook_out_${size.w}x${size.h}.json`), JSON.stringify(scanOut, null, 2));
    log('saved', outFile, 'paleHits', scanOut.hits);

    await go(page, 'pirateshore');
    const pfile = path.join(OUT, `${TAG}_pirate_${size.w}x${size.h}.png`);
    await page.screenshot({ path: pfile, type: 'png' });
    const pirate = await page.evaluate(() => {
      const g = window.__game;
      return {
        pos: [+g.player.pos.x.toFixed(2), +g.player.pos.z.toFixed(2)],
        yaw: +g.player.yaw.toFixed(3),
        camYaw: +g.cam.yaw.toFixed(3),
        pitch: +g.cam.pitch.toFixed(3),
        dist: +g.cam.dist.toFixed(2),
        faceZ: Math.cos(g.player.yaw),
      };
    });
    fs.writeFileSync(path.join(OUT, `${TAG}_pirate_${size.w}x${size.h}.json`), JSON.stringify(pirate, null, 2));
    log('pirate', pirate);
  } finally {
    await browser.close();
  }
}

log('done', paleBlue(191, 224, 244));
