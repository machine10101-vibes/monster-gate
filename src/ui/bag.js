import { GEAR, MATERIAL_ORDER, MATERIALS } from '../data/catalog.js';
import { flushThumbs, renderThumb } from './catalog.js';

function cell(canvas, name, sub, extra) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'bag-cell';
  b.appendChild(canvas);
  const n = document.createElement('b');
  n.textContent = name;
  const s = document.createElement('small');
  s.textContent = sub;
  b.append(n, s);
  if (extra) b.appendChild(extra);
  return b;
}

function badge(text, cls) {
  const i = document.createElement('i');
  i.className = cls;
  i.textContent = text;
  return i;
}

/** The hunter's bag. Every item is a render of its in-game model. */
export function mountBag(body, game) {
  const paint = () => {
    body.innerHTML = '';
    const root = document.createElement('div');
    root.className = 'bag';
    const head = document.createElement('p');
    head.className = 'bag-gold';
    head.textContent = `Gold ${game.gold}`;
    root.appendChild(head);

    const carried = document.createElement('section');
    carried.appendChild(Object.assign(document.createElement('h3'), { textContent: 'Carried' }));
    const cgrid = document.createElement('div');
    cgrid.className = 'bag-grid';
    const forged = new Set(GEAR.map((g) => g.id));
    game.items.forEach((it, i) => {
      if (!it || it.id === 'empty' || !it.held || forged.has(it.id)) return;
      const cv = renderThumb({ kind: 'held', id: it.held }, 96);
      const count = it.count !== undefined ? `x${it.count}` : i === game.sel ? 'In hand' : 'Hotbar';
      const b = cell(cv, it.name, count, it.count !== undefined ? badge(String(it.count), 'bag-n') : null);
      if (i === game.sel) b.classList.add('sel');
      b.onclick = () => {
        if (it.kind === 'use') {
          if (game.player?.tryAttack(it)) game.selectSlot(i, true);
        } else game.selectSlot(i);
        paint();
      };
      cgrid.appendChild(b);
    });
    carried.appendChild(cgrid);
    root.appendChild(carried);

    const gear = document.createElement('section');
    gear.appendChild(Object.assign(document.createElement('h3'), { textContent: 'Gear' }));
    const owned = GEAR.filter((g) => game.progress.crafted(g.id));
    const ggrid = document.createElement('div');
    ggrid.className = 'bag-grid';
    if (!owned.length) {
      const p = document.createElement('p');
      p.className = 'bag-empty';
      p.textContent = 'The Forge in Oakhollow turns monster parts into weapons and armor. They are kept here.';
      gear.appendChild(p);
    }
    for (const g of owned) {
      const cv = renderThumb({ kind: g.type === 'weapon' ? 'weapon' : 'armor', id: g.id }, 96);
      const worn = game.progress.worn(g.id);
      const b = cell(cv, g.name, worn ? 'Equipped' : 'In the bag', worn ? badge('Worn', 'bag-worn') : null);
      if (worn) b.classList.add('worn');
      b.onclick = () => {
        game.wearPiece(g.id);
        paint();
      };
      ggrid.appendChild(b);
    }
    gear.appendChild(ggrid);
    root.appendChild(gear);

    const parts = document.createElement('section');
    parts.appendChild(Object.assign(document.createElement('h3'), { textContent: 'Parts' }));
    const pgrid = document.createElement('div');
    pgrid.className = 'bag-grid';
    let anyPart = false;
    for (const id of MATERIAL_ORDER) {
      const n = game.progress.count(id);
      if (!n) continue;
      anyPart = true;
      const cv = renderThumb({ kind: 'material', id }, 96);
      const b = cell(cv, MATERIALS[id].name, MATERIALS[id].desc, badge(String(n), 'bag-n'));
      b.classList.add('part');
      pgrid.appendChild(b);
    }
    if (!anyPart) {
      const p = document.createElement('p');
      p.className = 'bag-empty';
      p.textContent = 'Monster parts you harvest are kept here until you forge them.';
      parts.appendChild(p);
    }
    parts.appendChild(pgrid);
    root.appendChild(parts);
    body.appendChild(root);
    flushThumbs(240);
  };
  paint();
  return () => {};
}
