import { MARKET, CATEGORIES, FAMILIES, SORTS, feeFor, payoutFor, subsFor, tradeable, marketMessage, TRADEABLE } from '../data/market.js';
import { flushThumbs, renderThumb } from './catalog.js';

/**
 * The Gilantre Exchange panel. Four tabs:
 *   Browse   search box, category chips, type, monster and level filters, price range, sort, pages
 *   Sell     what both this hunter and World 1 hold, quantity, price with the going rate and fee
 *   Listings open, sold and expired listings with cancel
 *   Collect  gold from sales (less the fee) and expired lots, in one press
 *
 * Every trade asks the World 1 server; the local save follows the server's answer.
 */

const TABS = [
  ['browse', 'Browse'],
  ['sell', 'Sell'],
  ['mine', 'My listings'],
  ['collect', 'Collect'],
];

const fmt = (n) => Math.max(0, Math.round(Number(n) || 0)).toLocaleString('en-US');
const thumbSpec = (t) => (t.kind === 'gear' ? { kind: t.category === 'weapon' ? 'weapon' : 'armor', id: t.id } : { kind: t.kind, id: t.id });

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function button(label, cls, onclick) {
  const b = el('button', 'mg-btn ' + (cls || ''), label);
  b.type = 'button';
  b.onclick = onclick;
  return b;
}

function timeLeft(ms) {
  if (ms <= 0) return 'Expired';
  const h = Math.floor(ms / 3600_000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h left`;
  if (h >= 1) return `${h}h left`;
  return `${Math.max(1, Math.floor(ms / 60_000))}m left`;
}

/** Whether the hunter stands at the Exchange (the server checks too). */
export function atExchange(game) {
  const p = game.player?.pos;
  return !!p && Math.hypot(p.x - MARKET.plaza.x, p.z - MARKET.plaza.z) <= MARKET.reach - 1;
}

/** What this hunter could list: held in their own bag and on World 1. */
export function sellable(game, vault) {
  const pr = game.progress;
  const out = [];
  for (const t of TRADEABLE) {
    let local = 0;
    let server = 0;
    if (t.kind === 'good') {
      local = pr.good(t.id);
      server = vault?.goods?.[t.id] || 0;
    } else if (t.kind === 'material') {
      local = pr.count(t.id);
      server = vault?.materials?.[t.id] || 0;
    } else {
      local = pr.crafted(t.id) && !pr.storedGear?.(t.id) ? 1 : 0;
      server = vault?.gear?.includes(t.id) ? 1 : 0;
    }
    const max = Math.min(local, server);
    if (local > 0) out.push({ t, local, server, max });
  }
  return out.sort((a, b) => b.max - a.max || a.t.name.localeCompare(b.t.name));
}

export function mountExchange(body, game) {
  const mmo = game.mmo;
  const state = {
    tab: 'browse',
    filters: { q: '', category: 'all', sub: '', family: '', minLevel: 0, maxLevel: 0, minPrice: 0, maxPrice: 0, sort: 'price' },
    page: 0,
    results: null,
    loading: false,
    mine: null,
    sellPick: null,
    sellQty: 1,
    sellPrice: 0,
    going: null,
    busy: false,
    note: '',
  };
  let alive = true;
  let searchTimer = 0;
  let seq = 0;

  const root = el('div', 'ex');
  body.appendChild(root);

  const online = () => !!mmo?.marketReady;
  const say = (text, bad = false) => {
    state.note = text;
    state.noteBad = bad;
    paintNote();
  };
  const fail = (r) => say(marketMessage(r?.code), true);

  async function loadMine() {
    if (!online()) return;
    const r = await mmo.marketRequest('market_mine');
    if (!alive) return;
    if (r.ok) state.mine = r;
    else fail(r);
    paint();
  }

  async function search(resetPage = false) {
    if (!online()) return;
    if (resetPage) state.page = 0;
    const mySeq = ++seq;
    state.loading = true;
    paintResults();
    const r = await mmo.marketRequest('market_search', { ...state.filters, page: state.page });
    if (!alive || mySeq !== seq) return;
    state.loading = false;
    if (r.ok) state.results = r;
    else fail(r);
    paintResults();
  }

  const searchSoon = () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => search(true), 260);
  };

  /* ------------------------------ frame ------------------------------ */

  function paint() {
    if (!alive) return;
    root.innerHTML = '';
    const head = el('div', 'ex-head');
    const crest = el('div', 'ex-crest');
    crest.append(el('b', null, 'Trade with every hunter on World 1'), el('small', null, at() ? 'You are at the Exchange.' : 'Browse anywhere. Trade at the Exchange, outside Gilantre\'s east gate.'));
    const purse = el('div', 'ex-purse');
    const vault = state.mine?.vault;
    purse.append(el('span', 'ex-coin', `${fmt(vault ? vault.gold : 0)}`), el('small', null, 'World 1 gold'));
    head.append(crest, purse);
    root.appendChild(head);

    if (!online()) {
      const off = el('div', 'ex-offline');
      off.append(el('b', null, 'The Exchange trades on World 1'), el('p', null, 'Sign in and choose World 1 to browse, buy and sell with other hunters. Items and gold you trade are held on the World 1 server.'));
      root.appendChild(off);
      return;
    }

    const tabs = el('div', 'ex-tabs');
    for (const [id, label] of TABS) {
      const t = el('button', 'mg-tab' + (state.tab === id ? ' on' : ''), label);
      t.type = 'button';
      const badge = id === 'collect' ? (state.mine?.due || 0) + (state.mine?.expired || 0) : id === 'mine' ? (state.mine?.listings?.filter((l) => l.status === 'active').length || 0) : 0;
      if (badge) t.appendChild(el('i', 'ex-badge', id === 'collect' && state.mine?.due ? fmt(state.mine.due) + 'g' : String(badge)));
      t.onclick = () => {
        state.tab = id;
        state.note = '';
        paint();
        if (id === 'browse' && !state.results) search(true);
      };
      tabs.appendChild(t);
    }
    root.appendChild(tabs);
    const note = el('div', 'ex-note');
    note.dataset.role = 'note';
    root.appendChild(note);
    paintNote();

    if (state.tab === 'browse') paintBrowse();
    else if (state.tab === 'sell') paintSell();
    else if (state.tab === 'mine') paintMine();
    else paintCollect();
    flushThumbs(60);
  }

  function paintNote() {
    const n = root.querySelector('[data-role="note"]');
    if (!n) return;
    n.textContent = state.note || '';
    n.classList.toggle('bad', !!state.noteBad);
    n.hidden = !state.note;
  }

  const at = () => atExchange(game);

  /* ------------------------------ browse ------------------------------ */

  function paintBrowse() {
    const wrap = el('div', 'ex-browse');
    const side = el('div', 'ex-filters');
    const f = state.filters;

    const q = el('input', 'mg-input ex-search');
    q.type = 'search';
    q.placeholder = 'Search items or monsters';
    q.value = f.q;
    q.oninput = () => {
      f.q = q.value;
      searchSoon();
    };
    q.onkeydown = (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') search(true);
    };
    side.appendChild(q);

    const chips = el('div', 'ex-chips');
    for (const c of CATEGORIES) {
      const b = el('button', 'ex-chip' + (f.category === c.id ? ' on' : ''), c.label);
      b.type = 'button';
      b.onclick = () => {
        f.category = c.id;
        f.sub = '';
        paint();
        search(true);
      };
      chips.appendChild(b);
    }
    side.appendChild(chips);
    // On narrow screens the detailed filters fold behind one toggle, so results stay in view.
    const active = [f.sub, f.family, f.minLevel, f.maxLevel, f.minPrice, f.maxPrice].filter(Boolean).length + (f.sort !== 'price' ? 1 : 0);
    const more = el('button', 'mg-btn quiet ex-more', active ? `Filters (${active})` : 'Filters');
    more.type = 'button';
    more.onclick = () => {
      state.filtersOpen = !state.filtersOpen;
      side.classList.toggle('open', state.filtersOpen);
    };
    side.classList.toggle('open', !!state.filtersOpen);
    side.appendChild(more);

    const field = (label, input) => {
      const row = el('label', 'ex-field');
      row.append(el('span', null, label), input);
      side.appendChild(row);
      return input;
    };
    const select = (opts, value, on) => {
      const s = el('select', 'mg-input');
      for (const o of opts) {
        const op = el('option', null, o.label);
        op.value = o.id;
        s.appendChild(op);
      }
      s.value = value;
      s.onchange = () => on(s.value);
      return s;
    };
    if (f.category !== 'all') {
      const label = { weapon: 'Weapon type', armor: 'Slot', material: 'From', good: 'Kind' }[f.category];
      field(label, select([{ id: '', label: 'Any' }, ...subsFor(f.category)], f.sub, (v) => {
        f.sub = v;
        search(true);
      }));
    }
    if (f.category !== 'good') {
      field('Monster', select([{ id: '', label: 'Any monster' }, ...FAMILIES], f.family, (v) => {
        f.family = v;
        search(true);
      }));
    }
    const num = (value, on, ph) => {
      const i = el('input', 'mg-input ex-num');
      i.type = 'number';
      i.min = '0';
      i.inputMode = 'numeric';
      i.placeholder = ph;
      i.value = value || '';
      i.onkeydown = (e) => e.stopPropagation();
      i.onchange = () => {
        on(Math.max(0, Math.floor(Number(i.value) || 0)));
        search(true);
      };
      return i;
    };
    if (f.category === 'weapon' || f.category === 'armor' || f.category === 'all') {
      const lv = el('div', 'ex-range');
      lv.append(num(f.minLevel, (v) => (f.minLevel = v), 'Min'), el('span', null, 'to'), num(f.maxLevel, (v) => (f.maxLevel = v), 'Max'));
      field('Level', lv);
    }
    const pr = el('div', 'ex-range');
    pr.append(num(f.minPrice, (v) => (f.minPrice = v), 'Min'), el('span', null, 'to'), num(f.maxPrice, (v) => (f.maxPrice = v), 'Max'));
    field('Price', pr);
    field('Sort', select(SORTS, f.sort, (v) => {
      f.sort = v;
      search(true);
    }));
    side.appendChild(button('Clear filters', 'quiet', () => {
      state.filters = { q: '', category: 'all', sub: '', family: '', minLevel: 0, maxLevel: 0, minPrice: 0, maxPrice: 0, sort: 'price' };
      paint();
      search(true);
    }));

    const list = el('div', 'ex-results');
    list.dataset.role = 'results';
    wrap.append(side, list);
    root.appendChild(wrap);
    paintResults();
  }

  function paintResults() {
    const list = root.querySelector('[data-role="results"]');
    if (!list) return;
    list.innerHTML = '';
    const r = state.results;
    const top = el('div', 'ex-results-top');
    const count = r ? (r.total ? `${fmt(r.page * r.pageSize + 1)}-${fmt(Math.min(r.total, (r.page + 1) * r.pageSize))} of ${fmt(r.total)}` : 'No listings match') : '';
    top.append(el('span', 'ex-count', state.loading ? 'Searching...' : count));
    const pager = el('div', 'ex-pager');
    const prev = button('Prev', 'quiet', () => {
      state.page = Math.max(0, state.page - 1);
      search();
    });
    const next = button('Next', 'quiet', () => {
      state.page += 1;
      search();
    });
    prev.disabled = !r || state.page === 0;
    next.disabled = !r || (state.page + 1) * r.pageSize >= r.total;
    pager.append(prev, next);
    top.appendChild(pager);
    list.appendChild(top);
    if (!r) return;
    if (!r.listings.length) {
      const empty = el('div', 'ex-empty');
      empty.append(el('b', null, 'Nothing for sale that matches.'), el('p', null, 'Loosen a filter, or be the first: list one from the Sell tab.'));
      list.appendChild(empty);
      return;
    }
    const grid = el('div', 'ex-grid');
    const now = Date.now();
    const gold = state.mine?.vault?.gold ?? Infinity;
    for (const l of r.listings) {
      const t = tradeable(l.kind, l.itemId);
      const card = el('div', 'ex-card' + (l.mine ? ' mine' : ''));
      const pic = el('div', 'ex-pic');
      if (t) pic.appendChild(renderThumb(thumbSpec(t), 64));
      if (l.qty > 1) pic.appendChild(el('i', 'ex-qty', 'x' + fmt(l.qty)));
      const info = el('div', 'ex-info');
      info.append(el('b', null, l.name), el('small', null, t ? [t.subLabel, t.familyLabel, t.kind === 'gear' && t.level > 1 ? 'Lv ' + t.level : ''].filter(Boolean).join(' · ') : ''));
      const meta = el('div', 'ex-meta');
      meta.append(el('span', 'ex-seller', l.mine ? 'Your listing' : l.seller), el('span', null, timeLeft(l.expiresAt - now)));
      info.appendChild(meta);
      const buy = el('div', 'ex-buy');
      buy.append(el('span', 'ex-price', fmt(l.price)), el('small', null, l.qty > 1 ? `${fmt(Math.ceil(l.price / l.qty))} each` : 'gold'));
      const b = button(l.mine ? 'Yours' : 'Buy', '', () => confirmBuy(l, t));
      b.disabled = l.mine || state.busy || l.price > gold;
      if (!l.mine && l.price > gold) b.title = 'Not enough World 1 gold';
      buy.appendChild(b);
      card.append(pic, info, buy);
      grid.appendChild(card);
    }
    list.appendChild(grid);
    flushThumbs(60);
  }

  function confirmBuy(l, t) {
    if (!at()) {
      say(marketMessage('market_far'), true);
      return;
    }
    const gold = state.mine?.vault?.gold ?? 0;
    ask(`Buy ${l.name}${l.qty > 1 ? ' x' + l.qty : ''}?`, `${fmt(l.price)} gold from ${l.seller}. You will have ${fmt(gold - l.price)} World 1 gold left.`, 'Buy', async () => {
      state.busy = true;
      const r = await mmo.marketRequest('market_buy', { listingId: l.id });
      state.busy = false;
      if (!alive) return;
      if (!r.ok) {
        fail(r);
        search();
        return;
      }
      game.marketGold(-r.price);
      game.marketGive(r.kind, r.itemId, r.qty);
      say(`Bought ${t?.name || r.itemId}${r.qty > 1 ? ' x' + r.qty : ''} for ${fmt(r.price)} gold.`);
      game.audio?.coin?.();
      await loadMine();
      search();
    });
  }

  /* ------------------------------ sell ------------------------------ */

  function paintSell() {
    const vault = state.mine?.vault;
    const items = sellable(game, vault);
    const wrap = el('div', 'ex-sell');
    const pick = el('div', 'ex-pick');
    if (!items.length) {
      const empty = el('div', 'ex-empty');
      empty.append(el('b', null, 'Nothing to sell yet.'), el('p', null, 'Gear, monster parts and goods you hold appear here.'));
      pick.appendChild(empty);
    }
    for (const it of items) {
      const row = el('button', 'ex-pick-row' + (state.sellPick === it.t.kind + ':' + it.t.id ? ' on' : '') + (it.max < 1 ? ' off' : ''));
      row.type = 'button';
      const pic = el('div', 'ex-pic sm');
      pic.appendChild(renderThumb(thumbSpec(it.t), 48));
      const txt = el('div', 'ex-info');
      txt.append(el('b', null, it.t.name), el('small', null, it.max < 1 ? 'Not on World 1 yet' : it.t.stack ? `${fmt(it.max)} you can list` : 'Ready to list'));
      row.append(pic, txt);
      row.onclick = () => {
        state.sellPick = it.t.kind + ':' + it.t.id;
        state.sellQty = Math.max(1, Math.min(it.max || 1, it.t.stack ? it.max : 1));
        state.going = null;
        state.sellPrice = Math.max(1, it.t.value * state.sellQty);
        paint();
        goingRate(it.t);
      };
      pick.appendChild(row);
    }
    const form = el('div', 'ex-form');
    const it = items.find((x) => x.t.kind + ':' + x.t.id === state.sellPick);
    if (!it) {
      form.append(el('p', 'ex-help', 'Pick something on the left to list it. It leaves your bag and waits on World 1 until it sells, you cancel it, or 3 days pass.'));
    } else {
      const t = it.t;
      const hero = el('div', 'ex-hero');
      const pic = el('div', 'ex-pic lg');
      pic.appendChild(renderThumb(thumbSpec(t), 96));
      const txt = el('div', 'ex-info');
      txt.append(el('b', null, t.name), el('small', null, [t.subLabel, t.familyLabel].filter(Boolean).join(' · ')), el('p', 'ex-desc', t.desc));
      hero.append(pic, txt);
      form.appendChild(hero);
      if (it.max < 1) {
        form.appendChild(el('p', 'ex-help bad', 'World 1 does not hold this one. Items earned in solo play stay in your own save; anything you gather, loot or buy online can be sold here.'));
      } else {
        if (t.stack) {
          const qrow = el('div', 'ex-qtyrow');
          const qn = el('input', 'mg-input ex-num');
          qn.type = 'number';
          qn.min = '1';
          qn.max = String(it.max);
          qn.value = String(state.sellQty);
          qn.onkeydown = (e) => e.stopPropagation();
          const setQ = (v) => {
            const old = state.sellQty;
            state.sellQty = Math.max(1, Math.min(it.max, Math.floor(Number(v) || 1)));
            if (old > 0) state.sellPrice = Math.max(1, Math.round((state.sellPrice / old) * state.sellQty));
            paint();
          };
          qn.onchange = () => setQ(qn.value);
          qrow.append(el('span', null, 'Quantity'), button('-', 'quiet', () => setQ(state.sellQty - 1)), qn, button('+', 'quiet', () => setQ(state.sellQty + 1)), button('All', 'quiet', () => setQ(it.max)));
          form.appendChild(qrow);
        }
        const prow = el('div', 'ex-qtyrow');
        const pn = el('input', 'mg-input ex-num ex-price-in');
        pn.type = 'number';
        pn.min = '1';
        pn.max = String(MARKET.maxPrice);
        pn.value = String(state.sellPrice);
        pn.onkeydown = (e) => e.stopPropagation();
        pn.oninput = () => {
          state.sellPrice = Math.max(1, Math.min(MARKET.maxPrice, Math.floor(Number(pn.value) || 1)));
          paintFee();
        };
        prow.append(el('span', null, t.stack && state.sellQty > 1 ? 'Price for all' : 'Price'), pn, el('span', 'ex-coin-s', 'gold'));
        form.appendChild(prow);
        const going = el('div', 'ex-going');
        going.dataset.role = 'going';
        form.appendChild(going);
        const fee = el('div', 'ex-fee');
        fee.dataset.role = 'fee';
        form.appendChild(fee);
        const go = button('List for sale', 'ex-go', () => listIt(t));
        go.disabled = state.busy || !at();
        form.appendChild(go);
        if (!at()) form.appendChild(el('p', 'ex-help', marketMessage('market_far')));
      }
    }
    wrap.append(pick, form);
    root.appendChild(wrap);
    paintFee();
    paintGoing();
  }

  function paintFee() {
    const f = root.querySelector('[data-role="fee"]');
    if (!f) return;
    f.innerHTML = '';
    const each = state.sellQty > 1 ? ` (${fmt(Math.ceil(state.sellPrice / state.sellQty))} each)` : '';
    f.append(el('span', null, `Price ${fmt(state.sellPrice)}${each}`), el('span', null, `Exchange fee ${MARKET.feeBp / 100}%: ${fmt(feeFor(state.sellPrice))}`), el('b', null, `You receive ${fmt(payoutFor(state.sellPrice))} gold`));
  }

  function paintGoing() {
    const g = root.querySelector('[data-role="going"]');
    if (!g) return;
    const r = state.going;
    if (!r) {
      g.textContent = 'Checking the going rate...';
      return;
    }
    if (!r.total) {
      g.textContent = 'Nobody else is selling this right now. You set the price.';
      return;
    }
    const low = r.listings[0];
    g.innerHTML = '';
    g.append(el('span', null, `${fmt(r.total)} on sale. Lowest ${fmt(Math.ceil(low.price / low.qty))} each.`));
    const match = button('Match lowest', 'quiet', () => {
      state.sellPrice = Math.max(1, Math.ceil((low.price / low.qty) * state.sellQty));
      paint();
    });
    g.appendChild(match);
  }

  async function goingRate(t) {
    const r = await mmo.marketRequest('market_search', { q: t.name, category: t.category, sort: 'unit', page: 0 });
    if (!alive || state.sellPick !== t.kind + ':' + t.id) return;
    state.going = r.ok ? { total: r.listings.filter((l) => l.itemId === t.id).length, listings: r.listings.filter((l) => l.itemId === t.id) } : { total: 0, listings: [] };
    paintGoing();
  }

  async function listIt(t) {
    if (state.busy) return;
    state.busy = true;
    const r = await mmo.marketRequest('market_list', { kind: t.kind, itemId: t.id, qty: t.stack ? state.sellQty : 1, price: state.sellPrice });
    state.busy = false;
    if (!alive) return;
    if (!r.ok) {
      fail(r);
      paint();
      return;
    }
    game.marketTake(r.kind, r.itemId, r.qty);
    say(`Listed ${t.name}${r.qty > 1 ? ' x' + r.qty : ''} for ${fmt(r.price)} gold.`);
    state.sellPick = null;
    state.results = null;
    await loadMine();
  }

  /* ------------------------------ my listings ------------------------------ */

  function paintMine() {
    const rows = state.mine?.listings || [];
    const wrap = el('div', 'ex-mine');
    if (!rows.length) {
      const empty = el('div', 'ex-empty');
      empty.append(el('b', null, 'No listings yet.'), el('p', null, `List up to ${MARKET.maxActive} things at once from the Sell tab.`));
      wrap.appendChild(empty);
    }
    const now = Date.now();
    for (const l of rows) {
      const t = tradeable(l.kind, l.itemId);
      const row = el('div', 'ex-mine-row ' + l.status);
      const pic = el('div', 'ex-pic sm');
      if (t) pic.appendChild(renderThumb(thumbSpec(t), 48));
      const info = el('div', 'ex-info');
      const status = l.status === 'sold' ? `Sold to ${l.buyer || 'a hunter'}. Collect ${fmt(l.price - l.fee)} gold.` : l.expiresAt <= now ? 'Expired. Collect to get it back.' : timeLeft(l.expiresAt - now);
      info.append(el('b', null, `${l.name}${l.qty > 1 ? ' x' + l.qty : ''}`), el('small', null, `${fmt(l.price)} gold · ${status}`));
      row.append(pic, info);
      if (l.status === 'active' && l.expiresAt > now) {
        const c = button('Cancel', 'quiet', async () => {
          if (!at()) {
            say(marketMessage('market_far'), true);
            return;
          }
          state.busy = true;
          const r = await mmo.marketRequest('market_cancel', { listingId: l.id });
          state.busy = false;
          if (!alive) return;
          if (!r.ok) {
            fail(r);
            return;
          }
          game.marketGive(r.kind, r.itemId, r.qty);
          say(`${l.name} is back in your bag.`);
          await loadMine();
        });
        c.disabled = state.busy;
        row.appendChild(c);
      }
      wrap.appendChild(row);
    }
    root.appendChild(wrap);
  }

  /* ------------------------------ collect ------------------------------ */

  function paintCollect() {
    const due = state.mine?.due || 0;
    const expired = state.mine?.expired || 0;
    const wrap = el('div', 'ex-collect');
    const chest = el('div', 'ex-chest');
    chest.append(el('span', 'ex-coin big', fmt(due)), el('small', null, 'gold from sales, after the fee'));
    wrap.appendChild(chest);
    wrap.appendChild(el('p', 'ex-help', expired ? `${expired} expired listing${expired > 1 ? 's' : ''} will come back to your bag.` : 'Expired listings come back here too.'));
    const go = button(due || expired ? 'Collect everything' : 'Nothing to collect', 'ex-go', async () => {
      if (!at()) {
        say(marketMessage('market_far'), true);
        return;
      }
      state.busy = true;
      const r = await mmo.marketRequest('market_collect');
      state.busy = false;
      if (!alive) return;
      if (!r.ok) {
        fail(r);
        return;
      }
      if (r.gold) game.marketGold(r.gold);
      for (const it of r.items || []) game.marketGive(it.kind, it.id, it.qty);
      say(r.gold || r.items?.length ? `Collected ${fmt(r.gold)} gold${r.items?.length ? ` and ${r.items.length} returned listing${r.items.length > 1 ? 's' : ''}` : ''}.` : 'Nothing to collect.');
      game.audio?.coin?.();
      await loadMine();
    });
    go.disabled = state.busy || (!due && !expired);
    wrap.appendChild(go);
    if (!at()) wrap.appendChild(el('p', 'ex-help', marketMessage('market_far')));
    root.appendChild(wrap);
  }

  /* ------------------------------ confirm ------------------------------ */

  function ask(title, text, verb, run) {
    root.querySelector('.ex-ask-back')?.remove();
    const back = el('div', 'ex-ask-back');
    const card = el('div', 'ex-ask');
    card.append(el('b', null, title), el('p', null, text));
    const row = el('div', 'ex-ask-row');
    row.append(button('Cancel', 'quiet', () => back.remove()), button(verb, '', () => {
      back.remove();
      run();
    }));
    card.appendChild(row);
    back.appendChild(card);
    back.onclick = (e) => {
      if (e.target === back) back.remove();
    };
    root.appendChild(back);
  }

  game.exchangeRefresh = () => {
    if (!alive) return;
    loadMine();
    if (state.tab === 'browse') search();
  };

  paint();
  if (online()) {
    loadMine();
    search(true);
  }
  return () => {
    alive = false;
    clearTimeout(searchTimer);
    if (game.exchangeRefresh) game.exchangeRefresh = null;
  };
}
