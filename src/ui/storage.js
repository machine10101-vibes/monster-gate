import { GEAR, MATERIAL_ORDER, MATERIALS } from '../data/catalog.js';
import { GOODS, GOODS_ORDER } from '../data/gathering.js';
import { STORAGE_SLOTS } from '../systems/progress.js';
import { flushThumbs, renderThumb } from './catalog.js';

const POTIONS = [
  { id: 'potion', name: 'Healing Potion', held: 'potion' },
  { id: 'manapotion', name: 'Spirit Philter', held: 'manapotion' },
];

const TABS = [
  ['goods', 'Gathered'],
  ['parts', 'Parts'],
  ['gear', 'Gear'],
  ['potions', 'Potions'],
];

/** The town crate. The bag is on the left, thirty storage slots on the right. */
export function mountStorage(body, game) {
  let tab = 'goods';
  let sel = null;
  let slot = null;

  const paint = () => {
    const groups = collect(game);
    if (!groups[tab].some((it) => it.key === sel)) sel = groups[tab][0]?.key || null;
    const slots = game.progress.data.storage;
    if (slot != null && !slots[slot]) slot = null;
    body.innerHTML = '';

    const root = document.createElement('div');
    root.className = 'stash';

    const help = document.createElement('p');
    help.className = 'stash-help';
    help.textContent = 'Thirty slots, shared with this hunter. Choose something you are carrying and store it. Choose a stored stack to take it back.';
    root.appendChild(help);

    const cols = document.createElement('div');
    cols.className = 'stash-cols';

    const left = document.createElement('section');
    left.className = 'stash-bag';
    const tabs = document.createElement('div');
    tabs.className = 'bag-tabs';
    for (const [id, label] of TABS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'bag-tab' + (id === tab ? ' on' : '');
      b.textContent = `${label} ${groups[id].length}`;
      b.onclick = () => {
        tab = id;
        sel = groups[id][0]?.key || null;
        paint();
      };
      tabs.appendChild(b);
    }
    left.appendChild(tabs);

    const grid = document.createElement('div');
    grid.className = 'bag-grid';
    const list = groups[tab];
    if (!list.length) {
      const p = document.createElement('p');
      p.className = 'bag-empty';
      p.textContent = 'Nothing in this pocket to store.';
      grid.appendChild(p);
    }
    for (const it of list) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'bag-cell' + (it.key === sel ? ' sel' : '');
      b.appendChild(it.canvas());
      b.title = `Store ${it.name}`;
      if (it.badge) {
        const i = document.createElement('i');
        i.className = 'bag-n';
        i.textContent = it.badge;
        b.appendChild(i);
      }
      b.onclick = () => {
        sel = it.key;
        paint();
      };
      grid.appendChild(b);
    }
    left.appendChild(grid);

    const current = list.find((it) => it.key === sel);
    if (current) {
      const row = document.createElement('div');
      row.className = 'bag-acts';
      const all = document.createElement('button');
      all.type = 'button';
      all.className = 'bag-act';
      all.textContent = current.n > 1 ? 'Store all' : 'Store';
      all.onclick = () => {
        game.storeInCrate(current.k, current.id, current.n);
        paint();
      };
      row.appendChild(all);
      if (current.n > 1) {
        const one = document.createElement('button');
        one.type = 'button';
        one.className = 'bag-act';
        one.textContent = 'Store 1';
        one.onclick = () => {
          game.storeInCrate(current.k, current.id, 1);
          paint();
        };
        row.appendChild(one);
      }
      left.appendChild(row);
    }

    const right = document.createElement('section');
    right.className = 'stash-hold';
    const head = document.createElement('p');
    head.className = 'stash-count';
    head.textContent = `${game.progress.storageUsed()} / ${STORAGE_SLOTS} slots`;
    right.appendChild(head);
    const hold = document.createElement('div');
    hold.className = 'stash-slots';
    slots.forEach((s, index) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'stash-slot' + (s ? '' : ' empty') + (index === slot ? ' sel' : '');
      if (!s) {
        b.disabled = true;
        b.textContent = '';
      } else {
        const spec = thumbOf(s);
        b.appendChild(renderThumb(spec, 64));
        b.title = labelOf(s);
        const i = document.createElement('i');
        i.textContent = s.k === 'gear' ? '' : String(s.n);
        if (s.k !== 'gear') b.appendChild(i);
        b.onclick = () => {
          slot = index;
          paint();
        };
      }
      hold.appendChild(b);
    });
    right.appendChild(hold);
    const picked = slot != null ? slots[slot] : null;
    if (picked) {
      const row = document.createElement('div');
      row.className = 'bag-acts';
      const all = document.createElement('button');
      all.type = 'button';
      all.className = 'bag-act';
      all.textContent = picked.n > 1 ? 'Take all' : 'Take';
      all.onclick = () => {
        game.takeFromCrate(slot);
        paint();
      };
      row.appendChild(all);
      if (picked.n > 1) {
        const one = document.createElement('button');
        one.type = 'button';
        one.className = 'bag-act';
        one.textContent = 'Take 1';
        one.onclick = () => {
          game.takeFromCrate(slot, 1);
          paint();
        };
        row.appendChild(one);
      }
      right.appendChild(row);
    }

    cols.append(left, right);
    root.appendChild(cols);
    body.appendChild(root);
    flushThumbs(240);
  };

  paint();
  return () => {};
}

function collect(game) {
  const pr = game.progress;
  const goods = [];
  for (const id of GOODS_ORDER) {
    const n = pr.good(id);
    if (!n) continue;
    goods.push({ key: 'g' + id, k: 'good', id, n, name: GOODS[id].name, badge: String(n), canvas: () => renderThumb({ kind: 'good', id }, 72) });
  }
  const parts = [];
  for (const id of MATERIAL_ORDER) {
    const n = pr.count(id);
    if (!n) continue;
    parts.push({ key: 'p' + id, k: 'part', id, n, name: MATERIALS[id].name, badge: String(n), canvas: () => renderThumb({ kind: 'material', id }, 72) });
  }
  const gear = GEAR.filter((g) => pr.crafted(g.id) && !pr.storedGear(g.id)).map((g) => ({
    key: 'w' + g.id,
    k: 'gear',
    id: g.id,
    n: 1,
    name: g.name,
    badge: pr.worn(g.id) ? 'Worn' : null,
    canvas: () => renderThumb({ kind: g.type === 'weapon' ? 'weapon' : 'armor', id: g.id }, 72),
  }));
  const potions = [];
  for (const it of POTIONS) {
    const live = game.items.find((i) => i.id === it.id);
    const n = live?.count | 0;
    if (!n) continue;
    potions.push({
      key: 'u' + it.id,
      k: 'potion',
      id: it.id,
      n,
      name: it.name,
      badge: String(n),
      canvas: () => renderThumb({ kind: 'held', id: it.held }, 72),
    });
  }
  return { goods, parts, gear, potions };
}

function thumbOf(s) {
  if (s.k === 'good') return { kind: 'good', id: s.id };
  if (s.k === 'part') return { kind: 'material', id: s.id };
  if (s.k === 'potion') return { kind: 'held', id: s.id === 'manapotion' ? 'manapotion' : 'potion' };
  const g = GEAR.find((x) => x.id === s.id);
  return { kind: g?.type === 'weapon' ? 'weapon' : 'armor', id: s.id };
}

function labelOf(s) {
  if (s.k === 'good') return GOODS[s.id]?.name || s.id;
  if (s.k === 'part') return MATERIALS[s.id]?.name || s.id;
  if (s.k === 'potion') return POTIONS.find((i) => i.id === s.id)?.name || s.id;
  return GEAR.find((g) => g.id === s.id)?.name || s.id;
}
