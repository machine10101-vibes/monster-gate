/** Short git sha injected by Vite. Falls back to `dev` in unit tests. */
export const BUILD_ID = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BUILD_ID) || 'dev';
