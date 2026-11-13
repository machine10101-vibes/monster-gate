/** Click-and-hold on a bag cell before Use / Drop appears. */
export const BAG_HOLD_MS = 450;
/** Steps in front of the hunter so a dropped stack is not picked up underfoot. */
export const BAG_TOSS_DIST = 1.4;
/** Magnet and pickup wait so a just-dropped stack can be walked away from. */
export const BAG_TOSS_SIT = 1.5;

export function tossFrom(pos, yaw, dist = BAG_TOSS_DIST) {
  const a = Number(yaw) || 0;
  return {
    x: pos.x + Math.sin(a) * dist,
    z: pos.z + Math.cos(a) * dist,
  };
}

/** Primary bag action plus whether that cell can be tossed on the ground. */
export function bagHoldChoices(item) {
  const actions = item?.actions || (item?.action ? [{ label: item.action, run: item.run }] : []);
  const use = actions.find((a) => a && a.label && a.run) || null;
  const drop = item?.drop && item.drop.k ? item.drop : null;
  return { use, drop };
}
