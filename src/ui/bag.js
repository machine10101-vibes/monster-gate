import { GEAR, MATERIAL_ORDER, MATERIALS } from '../data/catalog.js';
import { iconCanvas } from './icons.js';
import { FISH, GOODS, GOODS_ORDER, TOOLS, burnChance } from '../data/gathering.js';
import { flushThumbs, renderThumb } from './catalog.js';

const TABS = [
  ['carried', 'Hotbar'],
  ['tools', 'Tools'],
  ['goods', 'Gathered'],
  ['gear', 'Gear'],
  ['parts', 'Parts'],
];

/** The hunter's bag. Tabs keep each kind of item in one grid, with a detail card. */
export function mountBag(body, game) {
  let tab = 'carried';
  let sel = null;

  const paint = () => {
    const groups = collect(game);
    if (!groups[tab].some((it) => it.key === sel)) sel = groups[tab][0]?.key || null;
    body.innerHTML = '';
    const root = document.createElement('div');
    root.className = 'bag';

    const gold = document.createElement('p');
    gold.className = 'bag-gold';
    gold.textContent = `Gold ${game.gold}`;
    root.appendChild(gold);

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
    root.appendChild(tabs);

    const stage = document.createElement('div');
    stage.className = 'bag-stage';
    const grid = document.createElement('div');
    grid.className = 'bag-grid';
    const list = groups[tab];
    if (!list.length) {
      const p = document.createElement('p');
      p.className = 'bag-empty';
      p.textContent = emptyText(tab);
      grid.appendChild(p);
    }
    for (const it of list) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'bag-cell' + (it.key === sel ? ' sel' : '') + (it.worn ? ' worn' : '');
      b.appendChild(it.canvas());
      b.title = it.name;
      if (it.badge) {
        const i = document.createElement('i');
        i.className = it.worn ? 'bag-worn' : 'bag-n';
        i.textContent = it.badge;
        b.appendChild(i);
      }
      b.onclick = () => {
        sel = it.key;
        paint();
      };
      grid.appendChild(b);
    }
    stage.appendChild(grid);

    const detail = document.createElement('aside');
    detail.className = 'bag-detail';
    const current = list.find((it) => it.key === sel);
    if (!current) {
      const p = document.createElement('span');
      p.textContent = emptyText(tab);
      detail.appendChild(p);
    } else {
      detail.appendChild(current.canvas());
      const name = document.createElement('b');
      name.textContent = current.name;
      const sub = document.createElement('span');
      sub.textContent = current.sub;
      detail.append(name, sub);
      const actions = current.actions || (current.action ? [{ label: current.action, run: current.run }] : []);
      if (actions.length) {
        const row = document.createElement('div');
        row.className = 'bag-acts';
        for (const act of actions) {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'bag-act';
          b.textContent = act.label;
          b.onclick = () => act.run(paint);
          row.appendChild(b);
        }
        detail.appendChild(row);
      }
    }
    stage.appendChild(detail);
    root.appendChild(stage);
    body.appendChild(root);
    flushThumbs(240);
  };

  paint();
  return () => {};
}

function emptyText(tab) {
  if (tab === 'carried') return 'Weapons and supplies on your hotbar show up here.';
  if (tab === 'tools') return 'The tinderbox lights logs you have chopped.';
  if (tab === 'goods') return 'Ore, fish, and logs are kept here. Chop birch, oak, and maple west of town.';
  if (tab === 'gear') return 'The Forge in Oakhollow turns monster parts into weapons and armor.';
  return 'Monster parts you harvest are kept here until you forge them.';
}

function collect(game) {
  const forged = new Set(GEAR.map((g) => g.id));
  const carried = [];
  game.items.forEach((it, i) => {
    if (!it || it.id === 'empty' || !it.held || forged.has(it.id)) return;
    const count = it.count !== undefined ? `Carried ${it.count}` : i === game.sel ? 'In hand' : 'On the hotbar';
    carried.push({
      key: 'c' + i,
      name: it.name,
      sub: it.desc ? `${count}. ${it.desc}` : count,
      badge: it.count !== undefined ? String(it.count) : null,
      canvas: () => renderThumb({ kind: 'held', id: it.held }, 96),
      action: it.kind === 'use' ? 'Use' : 'Hold',
      run: (paint) => {
        if (it.kind === 'use') {
          if (game.player?.tryAttack(it)) game.selectSlot(i, true);
        } else game.selectSlot(i);
        paint();
      },
    });
  });

  const tools = [{
    key: 'tome',
    name: 'Teleportation Tome',
    sub: 'Opens a path back to Oakhollow, and to every portal you have attuned.',
    canvas: () => {
      const c = document.createElement('canvas');
      c.width = 96;
      c.height = 96;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(iconCanvas('warp'), 16, 16, 64, 64);
      return c;
    },
    action: 'Open',
    run: () => game.openTome(),
  }].concat(game.progress.crafted('knife') ? [{
    key: 'tkife',
    name: 'Carving knife',
    sub: 'Shaves a log into 15 arrow shafts. Works anywhere.',
    canvas: () => renderThumb({ kind: 'held', id: 'knife' }, 96),
    action: 'Carve',
    run: () => game.openCarve(),
  }] : []).concat(TOOLS.filter((x) => x.id !== 'pickaxe').map((t) => ({
    key: 't' + t.id,
    name: t.name,
    sub: t.id === 'tinderbox' ? 'Light a log from Gathered.' : t.desc,
    canvas: () => renderThumb({ kind: 'held', id: t.held }, 96),
    action: t.id === 'tinderbox' ? 'Light logs' : null,
    run: () => {
      if (game.lightLog()) game.hud.closePanel();
    },
  })));

  const goods = [];
  for (const id of GOODS_ORDER) {
    const n = game.progress.good(id);
    if (!n) continue;
    const g = GOODS[id];
    const fish = FISH[id];
    let sub;
    let actions = null;
    let action = null;
    let run = null;
    if (fish) {
      const cooked = GOODS[fish.cooked];
      const burn = Math.round(burnChance(fish, game.progress.level('fishing')) * 100);
      sub = `Eat for ${g.heal} health. Cook on a fire for ${cooked.heal} health, with a ${burn}% chance to burn. You have ${n}.`;
      actions = [
        { label: 'Eat', run: (paint) => { if (game.eatGood(id)) paint(); } },
        { label: 'Cook', run: (paint) => { if (game.cookFish(id)) game.hud.closePanel(); else paint(); } },
      ];
    } else if (g.heal) {
      sub = `Eat to restore ${g.heal} health. You have ${n}.`;
      action = 'Eat';
      run = (paint) => { if (game.eatGood(id)) paint(); };
    } else if (g.kind === 'bar' || g.kind === 'part' || g.kind === 'arrow') {
      sub = `${g.desc} You have ${n}.`;
    } else if (g.kind === 'log') {
      sub = `Light with the tinderbox. You have ${n}.`;
      action = 'Light';
      run = (paint) => { if (game.lightLog(id)) game.hud.closePanel(); else paint(); };
    } else sub = `Sells for ${g.price} gold each. You have ${n}.`;
    goods.push({
      key: 'g' + id,
      name: g.name,
      sub,
      badge: String(n),
      canvas: () => renderThumb({ kind: 'good', id }, 96),
      action,
      actions,
      run,
    });
  }

  const gear = GEAR.filter((g) => game.progress.crafted(g.id) && !game.progress.storedGear(g.id)).map((g) => {
    const worn = game.progress.worn(g.id);
    return {
      key: 'w' + g.id,
      name: g.name,
      sub: worn ? 'Equipped. Take it off, or open Character to see the full set.' : 'In the bag. Wear it from here or from the Character screen.',
      badge: worn ? 'Worn' : null,
      worn,
      canvas: () => renderThumb({ kind: g.type === 'weapon' ? 'weapon' : 'armor', id: g.id }, 96),
      action: worn ? 'Unequip' : 'Equip',
      run: (paint) => {
        game.wearPiece(g.id);
        paint();
      },
    };
  });

  const parts = [];
  for (const id of MATERIAL_ORDER) {
    const n = game.progress.count(id);
    if (!n) continue;
    parts.push({
      key: 'p' + id,
      name: MATERIALS[id].name,
      sub: `${MATERIALS[id].desc} You have ${n}.`,
      badge: String(n),
      canvas: () => renderThumb({ kind: 'material', id }, 96),
    });
  }

  return { carried, tools, goods, gear, parts };
}
