/**
 * Rune gates are persistent map landmarks. Keep their map realm even when
 * world streaming temporarily detaches their meshes from the scene graph.
 */
export function visibleMonsterGates(world) {
  const realm = world?.realm || 'over';
  if (realm !== 'over' && realm !== 'cave') return [];
  const parent = realm === 'cave' ? world?.cave?.group : world?.group;
  if (!parent) return [];
  return (world.runeGates || []).filter((gate) => {
    const mapParent = gate.mapParent || gate.group?.parent;
    return mapParent === parent && Number.isFinite(gate.x) && Number.isFinite(gate.z);
  });
}

/** Draw a compact red beacon whose halo breathes in time with the game clock. */
export function paintMonsterGateMarker(ctx, x, y, radius, time = 0) {
  const beat = 0.5 + 0.5 * Math.sin((Number(time) || 0) * 4.2);
  const outer = radius * (1.18 + beat * 0.42);
  ctx.save();
  ctx.globalAlpha = 0.2 + beat * 0.16;
  ctx.fillStyle = '#ff1728';
  ctx.shadowColor = '#ff2638';
  ctx.shadowBlur = radius * 2.4;
  ctx.beginPath();
  ctx.arc(x, y, outer, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = Math.max(1, radius * 0.32);
  ctx.strokeStyle = '#ff6670';
  ctx.beginPath();
  ctx.arc(x, y, outer * 0.76, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#c90e20';
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.56, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff0f0';
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.8, radius * 0.18), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
