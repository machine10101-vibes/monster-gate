/**
 * Backing-store scale for the game canvas.
 * The screen stays sharp when this matches the display. A smaller value is
 * stretched by the browser, and that stretch is what makes the world look soft.
 */
export function renderPixelRatio(devicePixelRatio, qualityDpr, resScale = 1) {
  const device = Number(devicePixelRatio);
  const cap = Number(qualityDpr);
  const scale = Number(resScale);
  const deviceOk = device > 0 ? device : 1;
  const capOk = cap > 0 ? cap : deviceOk;
  const scaleOk = scale > 0 ? scale : 1;
  return Math.min(deviceOk, capOk) * scaleOk;
}

/**
 * Desktop keeps a full-size picture. A slow phone may step down a little,
 * and never far enough that the stretch turns the world soft.
 */
export function nextResScale(current, avgMs, { allowDrop = false } = {}) {
  const now = Number(current) > 0 ? Number(current) : 1;
  if (!allowDrop) return 1;
  const floor = 0.85;
  if (avgMs > 28 && now > floor) return Math.max(floor, Math.round((now - 0.05) * 100) / 100);
  if (avgMs < 14 && now < 1) return Math.min(1, Math.round((now + 0.05) * 100) / 100);
  return now;
}
