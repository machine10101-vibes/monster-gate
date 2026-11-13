import { defineConfig } from 'vite';

/** Default '/' for the custom domain. Pass VITE_BASE=/monster-gate/ for a project-pages path build. */
export function publicBase(env = process.env) {
  const raw = env.VITE_BASE;
  if (raw == null || String(raw).trim() === '') return '/';
  const v = String(raw).trim();
  return v.endsWith('/') ? v : `${v}/`;
}

export default defineConfig({
  base: publicBase(),
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1200,
  },
  server: { port: 5173 },
});
