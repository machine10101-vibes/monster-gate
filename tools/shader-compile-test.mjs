/**
 * Headless SwiftShader pass: boot the built app, teleport every land spot,
 * and assert gl COMPILE_STATUS / LINK_STATUS for every program.
 * Skips when Chrome is missing (GitHub Actions). Run with `npm run test:shaders`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const CHROME = process.env.CHROME || '/usr/local/bin/google-chrome';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:4178';
const OUT = process.env.SHOT_DIR || '/opt/cursor/artifacts/pass42';
const ROOT = path.resolve(import.meta.dirname, '..');

function skip(reason) {
  console.log('SKIP shader-compile-test:', reason);
  process.exit(0);
}

if (!fs.existsSync(CHROME)) skip(`no Chrome at ${CHROME}`);

const puppeteerRoots = [
  '/tmp/mg-cap/node_modules/puppeteer-core',
  path.join(ROOT, 'node_modules/puppeteer-core'),
];
const puppeteerPath = puppeteerRoots.find((p) => fs.existsSync(p));
if (!puppeteerPath) skip('puppeteer-core not installed');

const require = createRequire(import.meta.url);
const puppeteer = require(puppeteerPath);
const { shaderCompileSpots } = await import(pathToFileURL(path.join(ROOT, 'src/debug/flags.js')).href);
const spots = shaderCompileSpots();

async function waitFor(page, fn, { timeout = 180000, step = 400, label = 'wait' } = {}) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    try {
      if (await page.evaluate(fn)) return;
    } catch (err) {
      console.log(label, String(err.message || err).slice(0, 120));
    }
    await new Promise((r) => setTimeout(r, step));
  }
  throw new Error('timeout ' + label);
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--window-size=1280,800',
  ],
  defaultViewport: { width: 1280, height: 800, deviceScaleFactor: 1 },
});

const failures = [];
try {
  const page = await browser.newPage();
  page.on('pageerror', (err) => console.log('pageerror', err.message));
  await page.evaluateOnNewDocument(() => {
    try { localStorage.setItem('mg-quality', 'medium'); } catch {}
  });
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
  await waitFor(page, () => (window.__game.renderer?.info?.render?.triangles | 0) > 2000, { timeout: 60000, label: 'tris' });

  const inspect = () => page.evaluate(() => {
    const g = window.__game;
    const r = g.renderer;
    const gl = r.getContext();
    const programs = r.info?.programs || [];
    const linked = [];
    for (const p of programs) {
      const handle = p.program;
      const ok = handle ? !!gl.getProgramParameter(handle, gl.LINK_STATUS) : null;
      const runnable = p.diagnostics ? p.diagnostics.runnable !== false : true;
      linked.push({
        name: p.name || p.id || '',
        linked: ok,
        runnable,
        usedTimes: p.usedTimes,
      });
      if (ok === false || runnable === false) {
        (window.__mgShaderErrors || (window.__mgShaderErrors = [])).push({
          kind: 'program',
          name: p.name || p.id || '',
          linked: ok,
          runnable,
        });
      }
    }
    const status = window.__mgShaderStatus || [];
    const compileFail = status.filter((s) => s.kind === 'compile' && !s.ok);
    const linkFail = status.filter((s) => s.kind === 'link' && !s.ok);
    return {
      errors: window.__mgShaderErrors || [],
      nPrograms: programs.length,
      nCompile: status.filter((s) => s.kind === 'compile').length,
      nLink: status.filter((s) => s.kind === 'link').length,
      compileFail: compileFail.length,
      linkFail: linkFail.length,
      linked,
    };
  });

  for (const spot of spots) {
    await page.evaluate((id) => {
      const g = window.__game;
      g.hud?.closePanel?.();
      g.teleportDebug(id);
      g.snapCamera?.();
      for (let i = 0; i < 8; i++) g.world?.revealAround?.(g.player.pos.x, g.player.pos.z, 80);
      g.renderer?.render?.(g.scene, g.camera);
    }, spot);
    await new Promise((r) => setTimeout(r, 400));
    const report = await inspect();
    console.log('tp', spot, 'programs', report.nPrograms, 'compile', report.nCompile, 'link', report.nLink);
    if (!report.nCompile || !report.nLink) {
      failures.push({ spot, reason: 'no compile/link records', report });
    }
    if (report.compileFail || report.linkFail || (report.errors && report.errors.length)) {
      failures.push({ spot, reason: 'shader error', report });
    }
    const bad = (report.linked || []).filter((p) => p.linked === false || p.runnable === false);
    if (bad.length) failures.push({ spot, reason: 'LINK_STATUS false', bad });
  }

  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'shader-compile.json'), JSON.stringify({ spots, failures }, null, 2));
} finally {
  await browser.close();
}

if (failures.length) {
  console.error('SHADER COMPILE FAILURES', JSON.stringify(failures, null, 2));
  process.exit(1);
}
console.log('ok', spots.length, 'spots compiled and linked');
