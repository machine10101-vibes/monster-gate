import { execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const rootDir = dirname(fileURLToPath(import.meta.url));

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

export function resolveBuildId({ env = process.env, branch = '', headSha = '', mainSha = '' } = {}) {
  const raw = env?.VITE_BUILD_ID;
  if (raw != null && String(raw).trim() !== '') return String(raw).trim();
  if (String(branch) === 'gh-pages' && mainSha) return String(mainSha).trim();
  return (headSha && String(headSha).trim()) || 'dev';
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

export default defineConfig({
  base: publicBase(),
  define: {
    'import.meta.env.VITE_BUILD_ID': JSON.stringify(shortSha()),
    'import.meta.env.VITE_MMO_URL': JSON.stringify(resolveMmoUrl()),
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
