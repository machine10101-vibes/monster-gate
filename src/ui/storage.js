import { GEAR, MATERIAL_ORDER, MATERIALS } from '../data/catalog.js';
import { GOODS, GOODS_ORDER } from '../data/gathering.js';
import { STORAGE_SLOTS } from '../systems/progress.js';
import { splitStacks, storageVisual } from '../systems/stacks.js';
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

const HOLD_MS = 450;
let askEl = null;
let pending = [];

function isTouch() {
  return document.body.classList.contains('touch') || window.matchMedia('(pointer: coarse)').matches;
}

function clearPending() {
  for (const id of pending) clearTimeout(id);
  pending = [];
}

function closeAsk() {
  askEl?.remove();
  askEl = null;
}

/** One, all, or a typed count. `run` receives the chosen amount. */
function openAsk(anchor, { name, max, verb, run, done }) {
  closeAsk();
  const back = document.createElement('div');
  back.className = 'stash-ask-back';
  const card = document.createElement('div');
  card.className = 'stash-ask';

  const x = document.createElement('button');
  x.type = 'button';
  x.className = 'stash-ask-x';
  x.textContent = '×';
  x.onclick = () => closeAsk();

  const title = document.createElement('b');
  title.textContent = name;
  const hint = document.createElement('p');
  hint.textContent = max > 1 ? `${verb} how many? You have ${max}.` : `${verb} this?`;

  const row = document.createElement('div');
  row.className = 'stash-ask-row';
  const one = document.createElement('button');
  one.type = 'button';
  one.textContent = 'One';
  one.onclick = () => choose(1);
  const all = document.createElement('button');
  all.type = 'button';
  all.textContent = 'All';
  all.onclick = () => choose(max);
  row.append(one, all);

  const custom = document.createElement('div');
  custom.className = 'stash-ask-custom';
  const input = document.createElement('input');
  input.type = 'number';
  input.inputMode = 'numeric';
  input.min = '1';
  input.max = String(max);
  input.placeholder = 'Number';
  input.enterKeyHint = 'done';
  const go = document.createElement('button');
  go.type = 'button';
  go.textContent = verb;
  const submitCustom = () => {
    const n = input.valueAsNumber;
    if (!Number.isFinite(n)) return;
    choose(Math.max(1, Math.min(max, Math.floor(n))));
  };
  go.onclick = submitCustom;
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitCustom();
    }
  });
  input.addEventListener('focus', () => {
    card.style.top = '12px';
    card.style.left = Math.max(8, (window.innerWidth - card.offsetWidth) / 2) + 'px';
  });
  custom.append(input, go);
  card.append(x, title, hint, row, custom);
  back.appendChild(card);
  document.body.appendChild(back);
  askEl = back;
  card.style.pointerEvents = 'none';
  const arm = () => {
    if (askEl !== back) return;
    card.style.pointerEvents = '';
    window.removeEventListener('pointerup', arm, true);
    window.removeEventListener('pointercancel', arm, true);
  };
  window.addEventListener('pointerup', arm, true);
  window.addEventListener('pointercancel', arm, true);

  const r = anchor.getBoundingClientRect();
  const c = card.getBoundingClientRect();
  let left = r.left + r.width / 2 - c.width / 2;
  let top = r.bottom + 8;
  left = Math.max(8, Math.min(left, window.innerWidth - c.width - 8));
  if (top + c.height > window.innerHeight - 8) top = Math.max(8, r.top - c.height - 8);
  card.style.left = left + 'px';
  card.style.top = top + 'px';

  back.addEventListener('pointerdown', (e) => {
    if (e.target === back) closeAsk();
  });

  function choose(n) {
    closeAsk();
    if (n >= 1) run(n);
    done();
  }
}

/** Touch: a tap moves the whole stack. A hold opens the amount window. */
function bindHold(button, spec) {
  let timer = 0;
  let suppress = false;
  let sx = 0;
  let sy = 0;
  const stop = () => {
    if (timer) {
      clearTimeout(timer);
      timer = 0;
    }
    button.classList.remove('holding');
  };
  button.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    suppress = false;
    sx = e.clientX;
    sy = e.clientY;
    button.classList.add('holding');
    timer = setTimeout(() => {
      timer = 0;
      suppress = true;
      button.classList.remove('holding');
      openAsk(button, spec);
    }, HOLD_MS);
    pending.push(timer);
  });
  button.addEventListener('pointermove', (e) => {
    if (timer && Math.hypot(e.clientX - sx, e.clientY - sy) > 14) stop();
  });
  button.addEventListener('pointerup', stop);
  button.addEventListener('pointercancel', stop);
  button.addEventListener('contextmenu', (e) => e.preventDefault());
  button.addEventListener('click', (e) => {
    if (suppress) {
      suppress = false;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    spec.run(spec.max);
    spec.done();
  });
}

/** The town crate. The bag is on the left, thirty storage slots on the right. */
export function mountStorage(body, game) {
  let tab = 'goods';
  let sel = null;
  let slot = null;
  const touch = isTouch();

  const paint = () => {
    clearPending();
    closeAsk();
    const groups = collect(game);
    if (!groups[tab].some((it) => it.key === sel)) sel = groups[tab][0]?.key || null;
    const cells = storageVisual(game.progress.data.storage, STORAGE_SLOTS);
    if (slot != null && !cells[slot]) slot = null;
    body.innerHTML = '';

    const root = document.createElement('div');
    root.className = 'stash';

    const help = document.createElement('p');
    help.className = 'stash-help';
    help.textContent = touch
      ? 'Tap an item to store all of it. Hold an item to store one, all, or a number you choose. Tap a stored stack to take it out, or hold it to choose how many.'
      : 'Thirty slots, shared with this hunter. Choose something you are carrying and store it. Choose a stored stack to take it back.';
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
      if (touch) bindHold(b, { name: it.name, max: carriedCount(game, it), verb: 'Store', run: (n) => game.storeInCrate(it.k, it.id, n), done: () => paint() });
      else b.onclick = () => {
        sel = it.key;
        paint();
      };
      grid.appendChild(b);
    }
    left.appendChild(grid);

    const current = list.find((it) => it.key === sel);
    if (!touch && current) {
      const total = carriedCount(game, current);
      const row = document.createElement('div');
      row.className = 'bag-acts';
      const all = document.createElement('button');
      all.type = 'button';
      all.className = 'bag-act';
      all.textContent = total > 1 ? 'Store all' : 'Store';
      all.onclick = () => {
        game.storeInCrate(current.k, current.id, total);
        paint();
      };
      row.appendChild(all);
      if (total > 1) {
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
    cells.forEach((s, index) => {
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
        if (touch) {
          bindHold(b, {
            name: labelOf(s),
            max: game.progress.data.storage[s.src]?.n || s.n,
            verb: 'Take',
            run: (n) => game.takeFromCrate(s.src, n),
            done: () => paint(),
          });
        } else b.onclick = () => {
          slot = index;
          paint();
        };
      }
      hold.appendChild(b);
    });
    right.appendChild(hold);
    const picked = slot != null ? cells[slot] : null;
    if (!touch && picked) {
      const storedN = game.progress.data.storage[picked.src]?.n || picked.n;
      const row = document.createElement('div');
      row.className = 'bag-acts';
      const all = document.createElement('button');
      all.type = 'button';
      all.className = 'bag-act';
      all.textContent = storedN > 1 ? 'Take all' : 'Take';
      all.onclick = () => {
        game.takeFromCrate(picked.src, storedN);
        paint();
      };
      row.appendChild(all);
      if (storedN > 1) {
        const one = document.createElement('button');
        one.type = 'button';
        one.className = 'bag-act';
        one.textContent = 'Take 1';
        one.onclick = () => {
          game.takeFromCrate(picked.src, 1);
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
  return () => {
    clearPending();
    closeAsk();
  };
}

function carriedCount(game, it) {
  if (it.k === 'good') return game.progress.good(it.id);
  if (it.k === 'part') return game.progress.count(it.id);
  if (it.k === 'potion') return game.items.find((i) => i.id === it.id)?.count | 0;
  return it.n;
}

function collect(game) {
  const pr = game.progress;
  const goods = [];
  for (const id of GOODS_ORDER) {
    const total = pr.good(id);
    if (!total) continue;
    splitStacks(total).forEach((n, i) => {
      goods.push({ key: 'g' + id + ':' + i, k: 'good', id, n, name: GOODS[id].name, badge: String(n), canvas: () => renderThumb({ kind: 'good', id }, 72) });
    });
  }
  const parts = [];
  for (const id of MATERIAL_ORDER) {
    const total = pr.count(id);
    if (!total) continue;
    splitStacks(total).forEach((n, i) => {
      parts.push({ key: 'p' + id + ':' + i, k: 'part', id, n, name: MATERIALS[id].name, badge: String(n), canvas: () => renderThumb({ kind: 'material', id }, 72) });
    });
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
    const total = live?.count | 0;
    if (!total) continue;
    splitStacks(total).forEach((n, i) => {
      potions.push({
        key: 'u' + it.id + ':' + i,
        k: 'potion',
        id: it.id,
        n,
        name: it.name,
        badge: String(n),
        canvas: () => renderThumb({ kind: 'held', id: it.held }, 72),
      });
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
