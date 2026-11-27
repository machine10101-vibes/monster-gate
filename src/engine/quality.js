/** Graphics presets shown in Settings. High is the default on every device; players can select another preset. */

export const QUALITY_KEY = 'mg-quality';
export const QUALITY_CHOICE_KEY = 'mg-quality-choice-v2';

export const QUALITIES = [
  { id: 'low', label: 'Low', density: 0.55, scatter: 0.4, motes: 120, gateMotes: 90, shadowSize: 1024, shadowExtent: 26, dpr: 1, shadows: true, viewFar: 118, glow: 0.5 },
  { id: 'medium', label: 'Medium', density: 0.8, scatter: 0.75, motes: 220, gateMotes: 160, shadowSize: 2048, shadowExtent: 30, dpr: 1.25, shadows: true, viewFar: 140, glow: 0.85 },
  { id: 'high', label: 'High', density: 1, scatter: 1, motes: 380, gateMotes: 260, shadowSize: 3072, shadowExtent: 34, dpr: 2, shadows: true, viewFar: 150, glow: 1 },
];

export function qualityById(id) {
  return QUALITIES.find((q) => q.id === id) || null;
}

export function readSavedQuality(storage) {
  try {
    // Older builds could persist Low automatically. Treat it as a legacy default,
    // not an explicit player choice; future selections carry their own marker.
    if (storage?.getItem?.(QUALITY_CHOICE_KEY) !== '1') return null;
    return qualityById(storage?.getItem?.(QUALITY_KEY));
  } catch {
    return null;
  }
}

/**
 * A boot that already died reloads once on the small setting.
 * Normal boots use High unless the hunter has explicitly selected another preset.
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
    scatter: heavy ? Math.min(q.scatter ?? q.density, 0.32) : (q.scatter ?? q.density),
    viewFar: heavy ? Math.min(q.viewFar || 150, 100) : (q.viewFar || 150),
    glow: heavy ? Math.min(q.glow ?? 1, 0.4) : (q.glow ?? 1),
    motes: heavy ? Math.min(q.motes, 80) : q.motes,
    gateMotes: heavy ? Math.min(q.gateMotes, 60) : q.gateMotes,
    dpr: Math.min(q.dpr, Math.round(dprCap * 100) / 100),
    shadowSize: heavy ? 512 : Math.min(q.shadowSize, 1024),
    shadows: heavy ? false : q.shadows,
  };
}

export function defaultQuality() {
  return { ...qualityById('high') };
}

export function chooseBootQuality({ saved = null, safeBoot = false, killed = false, desktop = false, cores = 4, size } = {}) {
  if (killed) {
    return { quality: survivalBudget(QUALITIES[0], true, size), recovered: true, light: true };
  }
  if (saved) {
    return { quality: { ...saved }, recovered: false, light: !!(safeBoot && saved.id === 'low') };
  }
  return { quality: defaultQuality({ desktop, cores }), recovered: false, light: false };
}
