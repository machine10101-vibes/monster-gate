import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

/** Default '/' for the custom domain. Pass VITE_BASE=/monster-gate/ for a project-pages path build. */
export function publicBase(env = process.env) {
  const raw = env.VITE_BASE;
  if (raw == null || String(raw).trim() === '') return '/';
  const v = String(raw).trim();
  return v.endsWith('/') ? v : `${v}/`;
}

/**
 * Production tag for title / character-select / Settings.
 * `VITE_BUILD_ID` wins. A gh-pages checkout stamps `origin/main`, not the
 * deploy branch SHA (or a stale working-tree HEAD).
 */
/** Build-time World 1 URL. `MG_WORLD_URL` wins, then `VITE_MMO_URL`. Empty on public Pages. */
export function resolveMmoUrl(env = process.env) {
  const mg = String(env?.MG_WORLD_URL ?? '').trim();
  if (mg) return mg;
  return String(env?.VITE_MMO_URL ?? '').trim();
}

/** Publishable project URL + anon key. Env wins; else public/supabase.json. Never a service-role key. */
export function resolveSupabaseConfig(env = process.env, { readFile, filePath } = {}) {
  let url = String(env?.VITE_SUPABASE_URL ?? '').trim().replace(/\/$/, '');
  let key = String(env?.VITE_SUPABASE_ANON_KEY ?? '').trim();
  if (!url || !key) {
    try {
      const path = filePath || join(dirname(fileURLToPath(import.meta.url)), 'public', 'supabase.json');
      const raw = (readFile || readFileSync)(path, 'utf8');
      const json = JSON.parse(raw);
      if (!url) url = String(json.url || '').trim().replace(/\/$/, '');
      if (!key) key = String(json.key || json.anonKey || '').trim();
    } catch {
      /* Pages without a file stay empty unless env is set */
    }
  }
  if (/service_role/i.test(key)) key = '';
  return { url, key };
}

/** Keep the on-screen tag at 7 hex chars even if a workflow stamps the full SHA. */
export function shortenBuildId(id) {
  const s = String(id ?? '').trim();
  if (/^[0-9a-f]{8,40}$/i.test(s)) return s.slice(0, 7).toLowerCase();
  return s;
}

export function resolveBuildId({ env = process.env, branch = '', headSha = '', mainSha = '' } = {}) {
  const raw = env?.VITE_BUILD_ID;
  if (raw != null && String(raw).trim() !== '') return shortenBuildId(raw);
  if (String(branch) === 'gh-pages' && mainSha) return shortenBuildId(mainSha) || 'dev';
  return shortenBuildId(headSha) || 'dev';
}

function git(cmd) {
  return execSync(cmd, { encoding: 'utf8' }).trim();
}

function shortSha() {
  try {
    const branch = git('git rev-parse --abbrev-ref HEAD');
    const headSha = git('git rev-parse --short HEAD');
    let mainSha = '';
    try {
      mainSha = git('git rev-parse --short origin/main');
    } catch {
      mainSha = '';
    }
    return resolveBuildId({ env: process.env, branch, headSha, mainSha });
  } catch {
    return 'dev';
  }
}

const rootDir = dirname(fileURLToPath(import.meta.url));
const supabase = resolveSupabaseConfig();
const BUILD_STAMP = shortSha();

/** Stamp only the meta token. Never replaceAll: the boot guard also mentioned __MG_BUILD__. */
export function stampIndexHtml(html, stamp) {
  const id = String(stamp || 'dev');
  return String(html).replace('content="__MG_BUILD__"', `content="${id}"`);
}

function versionJsonPlugin(id) {
  const stamp = String(id || 'dev');
  return {
    name: 'mg-version-json',
    transformIndexHtml(html) {
      return stampIndexHtml(html, stamp);
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: `${JSON.stringify({ build: stamp })}\n` });
    },
  };
}

export default defineConfig({
  base: publicBase(),
  plugins: [versionJsonPlugin(BUILD_STAMP)],
  define: {
    'import.meta.env.VITE_BUILD_ID': JSON.stringify(shortSha()),
    'import.meta.env.VITE_MMO_URL': JSON.stringify(resolveMmoUrl()),
    'import.meta.env.VITE_WORLD_URL': JSON.stringify(resolveMmoUrl()),
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabase.url),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabase.key),
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      input: [resolve(rootDir, 'index.html'), resolve(rootDir, 'admin.html')],
    },
  },
  server: { port: 5173 },
});
