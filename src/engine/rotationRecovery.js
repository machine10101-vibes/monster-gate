const KEY = 'mg-rotation-recovery';
export const ROTATION_RECOVERY_MAX_AGE_MS = 120_000;

export function screenOrientation(width, height) {
  return Number(width) > Number(height) ? 'landscape' : 'portrait';
}

export function rememberRotationRecovery(storage, characterId, orientation, now = Date.now()) {
  if (!storage?.setItem || !characterId || !['portrait', 'landscape'].includes(orientation)) return false;
  try {
    storage.setItem(KEY, JSON.stringify({ characterId: String(characterId), orientation, at: Number(now) }));
    return true;
  } catch {
    return false;
  }
}

/** Consume only a recent Enter World handoff that is followed by an orientation change. */
export function consumeRotationRecovery(storage, orientation, now = Date.now()) {
  if (!storage?.getItem || !storage?.removeItem) return null;
  let record = null;
  try {
    record = JSON.parse(storage.getItem(KEY) || 'null');
    storage.removeItem(KEY);
  } catch {
    return null;
  }
  const age = Number(now) - Number(record?.at);
  if (!record || !record.characterId || !['portrait', 'landscape'].includes(record.orientation)
    || !['portrait', 'landscape'].includes(orientation)
    || record.orientation === orientation || !Number.isFinite(age)
    || age < 0 || age > ROTATION_RECOVERY_MAX_AGE_MS) return null;
  return { characterId: String(record.characterId) };
}

export function clearRotationRecovery(storage) {
  try { storage?.removeItem?.(KEY); } catch { /* storage is optional */ }
}
