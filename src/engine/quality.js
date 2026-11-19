/** Graphics presets shown in Settings. The hunt starts small on a phone, then the hunter can pick one of these. */

export const QUALITY_KEY = 'mg-quality';

export const QUALITIES = [
  { id: 'low', label: 'Low', density: 0.55, motes: 120, gateMotes: 90, shadowSize: 1024, shadowExtent: 26, dpr: 1, shadows: true },
  { id: 'medium', label: 'Medium', density: 0.8, motes: 220, gateMotes: 160, shadowSize: 2048, shadowExtent: 30, dpr: 1.25, shadows: true },
  { id: 'high', label: 'High', density: 1, motes: 380, gateMotes: 260, shadowSize: 3072, shadowExtent: 34, dpr: 2, shadows: true },
];

export function qualityById(id) {
  return QUALITIES.find((q) => q.id === id) || null;
}

export function readSavedQuality(storage) {
  try {
    return qualityById(storage?.getItem?.(QUALITY_KEY));
  } catch {
    return null;
  }
}

/**
 * A boot that already died reloads once on the small setting.
 * The first phone boot keeps that small setting too. A choice the hunter
 * already made is used on the next launch.
 */
export function survivalBudget(q, heavy, size = {}) {
  const w = Math.max(size.screenW || 0, size.innerW || 1);
  const h = Math.max(size.screenH || 0, size.innerH || 1);
  const dprCap = heavy ? Math.max(0.6, Math.min(1, Math.sqrt(800000 / (w * h)))) : 1;
  return {
    ...q,
    id: heavy ? 'low' : q.id,
    label: heavy ? 'Low' : q.label,
    density: heavy ? Math.min(q.density, 0.45) : q.density,
    motes: heavy ? Math.min(q.motes, 80) : q.motes,
    gateMotes: heavy ? Math.min(q.gateMotes, 60) : q.gateMotes,
    dpr: Math.min(q.dpr, Math.round(dprCap * 100) / 100),
    shadowSize: heavy ? 512 : Math.min(q.shadowSize, 1024),
    shadows: heavy ? false : q.shadows,
  };
}

export function defaultQuality({ desktop, cores = 4 } = {}) {
  if (desktop) return { ...QUALITIES[1] };
  return { ...(cores >= 8 ? QUALITIES[1] : QUALITIES[0]) };
}

export function chooseBootQuality({ saved = null, safeBoot = false, killed = false, desktop = false, cores = 4, size } = {}) {
  if (killed) {
    return { quality: survivalBudget(QUALITIES[0], true, size), recovered: true, light: true };
  }
  if (saved) {
    return { quality: { ...saved }, recovered: false, light: !!(safeBoot && saved.id === 'low') };
  }
  if (safeBoot) {
    return { quality: survivalBudget(QUALITIES[0], true, size), recovered: false, light: true };
  }
  return { quality: defaultQuality({ desktop, cores }), recovered: false, light: false };
}
