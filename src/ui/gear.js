import { ARMOR_SLOTS, GEAR, SLOT_LABEL, gearById } from '../data/catalog.js';
import { STYLE_LABEL } from '../data/skills.js';
import { flushThumbs, renderThumb } from './catalog.js';

const SLOT_ORDER = ['weapon', ...ARMOR_SLOTS];

function slotLabel(slot) {
  return slot === 'weapon' ? 'Weapon' : SLOT_LABEL[slot];
}

function thumbFor(gear) {
  return renderThumb({ kind: gear.type === 'weapon' ? 'weapon' : 'armor', id: gear.id }, 96);
}

/** Character screen: the hunter, the worn slots, and forged gear that is not worn. */
export function mountGear(body, game) {
  const paint = () => {
    game.catalog.stopViewer();
    body.innerHTML = '';
    const pr = game.progress;
    const root = document.createElement('div');
    root.className = 'gear-layout';

    const doll = document.createElement('div');
    doll.className = 'gear-doll';
    const cv = document.createElement('canvas');
    cv.className = 'gear-view';
    doll.appendChild(cv);
    const wornWeapon = gearById(pr.data.weapon);
    const held = game.items[game.sel];
    const hand = wornWeapon || held;
    const caption = document.createElement('p');
    const path = pr.className || 'No path yet';
    caption.textContent = `${path} · ${wornWeapon ? 'Equipped' : 'In hand'}: ${hand?.name || 'Nothing'}`;
    doll.appendChild(caption);
    root.appendChild(doll);

    const slots = document.createElement('div');
    slots.className = 'gear-slots';
    const wornHead = document.createElement('h3');
    wornHead.textContent = 'Equipped';
    slots.appendChild(wornHead);
    for (const slot of SLOT_ORDER) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'gear-slot';
      const gear = slot === 'weapon' ? gearById(pr.data.weapon) : gearById(pr.data.armor[slot]);
      const text = document.createElement('div');
      const lab = document.createElement('span');
      lab.textContent = slotLabel(slot);
      const name = document.createElement('b');
      text.append(lab, name);
      if (gear) {
        btn.classList.add('filled');
        btn.appendChild(thumbFor(gear));
        name.textContent = gear.name;
        btn.title = `Unequip ${gear.name}`;
        btn.onclick = () => {
          game.wearPiece(gear.id);
          paint();
        };
      } else {
        name.textContent = 'Empty';
      }
      btn.appendChild(text);
      slots.appendChild(btn);
    }
    root.appendChild(slots);

    const loose = document.createElement('div');
    loose.className = 'gear-loose';
    const looseHead = document.createElement('h3');
    looseHead.textContent = 'Unequipped';
    loose.appendChild(looseHead);
    const owned = GEAR.filter((g) => pr.crafted(g.id) && !pr.worn(g.id));
    if (!owned.length) {
      const empty = document.createElement('p');
      empty.className = 'gear-empty';
      empty.textContent = 'Gear waiting to be worn shows up here. Craft it at the Forge.';
      loose.appendChild(empty);
    }
    const grid = document.createElement('div');
    grid.className = 'gear-grid';
    for (const gear of owned) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'gear-card';
      btn.appendChild(thumbFor(gear));
      const name = document.createElement('b');
      name.textContent = gear.name;
      const sub = document.createElement('small');
      sub.textContent = gear.type === 'weapon' ? 'Weapon' : slotLabel(gear.slot);
      btn.append(name, sub);
      btn.title = `Equip ${gear.name}`;
      btn.onclick = () => {
        game.wearPiece(gear.id);
        paint();
      };
      grid.appendChild(btn);
    }
    loose.appendChild(grid);
    const stats = document.createElement('p');
    stats.className = 'gear-stats';
    const sets = pr.activeSets.map((s) => s.name).join(', ');
    const style = STYLE_LABEL[wornWeapon?.item?.style || held?.style] || 'None';
    stats.textContent = `Defense ${pr.defense} (−${Math.round(pr.reduction * 100)}% damage). Style ${style}.${sets ? ' Sets: ' + sets + '.' : ''}`;
    loose.appendChild(stats);
    root.appendChild(loose);

    body.appendChild(root);
    flushThumbs(200);
    const look = pr.armorLook();
    game.catalog.startViewer(cv, { kind: 'hunter', armor: look, held: wornWeapon?.held || held?.held || null });
  };
  paint();
  return () => game.catalog.stopViewer();
}
