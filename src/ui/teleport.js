import { PORTALS, TOWN_RETURN, arrivalOf } from '../data/portals.js';

/** The Teleportation Tome. Oakhollow is always written in it. Attuned portals are added underneath. */
export function mountTeleport(body, game) {
  const root = document.createElement('div');
  root.className = 'tome';
  const note = document.createElement('p');
  note.className = 'tome-note';
  note.textContent = 'The tome opens a path to places it remembers. Oakhollow is written on the first page. Walk up to a light-blue portal and attune it to add another.';
  root.appendChild(note);

  const list = document.createElement('div');
  list.className = 'tome-list';
  const known = new Set(game.progress.knownPortals());
  const destinations = [
    TOWN_RETURN,
    ...PORTALS.filter((p) => known.has(p.id)).map((p) => {
      const at = arrivalOf(p);
      return { ...p, x: at.x, z: at.z };
    }),
  ];
  for (const dest of destinations) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tome-go';
    const name = document.createElement('b');
    name.textContent = dest.name;
    const place = document.createElement('small');
    place.textContent = dest.place;
    b.append(name, place);
    b.onclick = () => game.travelTo(dest);
    list.appendChild(b);
  }
  root.appendChild(list);

  const left = PORTALS.filter((p) => !known.has(p.id)).length;
  if (left) {
    const more = document.createElement('p');
    more.className = 'tome-more';
    more.textContent = left === 1
      ? 'One portal is still unwritten.'
      : `${left} portals are still unwritten.`;
    root.appendChild(more);
  }
  body.appendChild(root);
  return () => {};
}
