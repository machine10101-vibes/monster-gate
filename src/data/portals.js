/** Destinations the Teleportation Tome can open. The town is always known. */

export const TOWN_RETURN = {
  id: 'town',
  name: 'Oakhollow',
  place: 'The starter town',
  x: 72,
  z: 73,
  banner: ['Village', 'Oakhollow'],
};

export const PORTALS = [
  {
    id: 'oakhollow',
    name: 'Oakhollow Portal',
    place: 'Just outside the village',
    x: 52,
    z: 90,
    yaw: Math.PI,
    banner: ['Village', 'Outside Oakhollow'],
  },
  {
    id: 'pirates',
    name: 'Pirate Shore Portal',
    place: 'The Dunes, by the pirate docks',
    x: -244,
    z: 384,
    yaw: 0,
    banner: ['Pirate Shore', 'The Dunes'],
  },
  {
    id: 'warfield',
    name: 'Warfield Portal',
    place: 'Between Dawnspire and Hellspire',
    x: -144,
    z: -435,
    yaw: 0,
    banner: ['The Endless Field', 'Between the keeps'],
  },
];

export const PORTAL_IDS = new Set(PORTALS.map((p) => p.id));

export function portalById(id) {
  return PORTALS.find((p) => p.id === id) || null;
}

/** A step in front of the arch, on the side the opening faces. */
export function arrivalOf(portal) {
  const yaw = portal.yaw || 0;
  return {
    x: portal.x + Math.sin(yaw) * 2.8,
    z: portal.z + Math.cos(yaw) * 2.8,
  };
}
