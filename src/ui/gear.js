import { GEAR, SLOT_LABEL, TIER_LABEL, gearById, setById } from '../data/catalog.js';
import { STYLE_LABEL } from '../data/skills.js';
import { ARROW_TYPES, GOODS, QUIVER_MAX } from '../data/gathering.js';
import { INVENTORY_FULL } from '../systems/stacks.js';
import { flushThumbs, renderThumb } from './catalog.js';

const RANKS = ['F', 'E', 'D', 'C', 'B', 'A', 'S'];
const LEFT = ['helm', 'chest', 'arms'];
const RIGHT = ['legs', 'boots', 'quiver'];
const BOTTOM = ['weapon', 'shield', 'book', 'ammo'];
const TIER_COLOR = { metal: '#aab4c4', leather: '#c88a4a', cloth: '#b98aff' };
const TABS = [
  ['gear', 'Character'],
  ['bag', 'Inventory'],
  ['stats', 'Stats'],
  ['skills', 'Skill Tree'],
];

const slotLabel = (slot) => (slot === 'weapon' ? 'Weapon' : SLOT_LABEL[slot]);

function thumbFor(gear, px = 96) {
  if (gear.type === 'ammo') return renderThumb({ kind: 'good', id: gear.id }, px);
  return renderThumb({ kind: gear.type === 'weapon' ? 'weapon' : 'armor', id: gear.id }, px);
}

function colorOf(gear) {
  if (!gear) return '';
  if (gear.type === 'weapon') return '#ffd23f';
  if (gear.slot === 'book') return '#b98aff';
  return TIER_COLOR[setById(gear.set)?.tier] || '#aab4c4';
}

function bonusText(gear) {
  const b = gear.bonus || {};
  const bits = [];
  if (b.mana) bits.push(`+${b.mana} spirit`);
  if (b.spell) bits.push(`+${Math.round(b.spell * 100)}% spells`);
  if (b.hp) bits.push(`+${b.hp} health`);
  if (b.stamina) bits.push(`+${b.stamina} stamina`);
  if (b.ranged) bits.push(`+${Math.round(b.ranged * 100)}% ranged`);
  if (b.crit) bits.push(`+${Math.round(b.crit * 100)}% crit`);
  return bits.join(', ');
}

function statLine(gear) {
  if (gear.type === 'ammo') return gear.line;
  if (gear.type === 'weapon') {
    const need = gear.reqLevel ? ` · Str ${gear.reqLevel}` : '';
    return `Damage ${gear.item.dmg} · ${STYLE_LABEL[gear.item.style] || 'Weapon'}${need}`;
  }
  if (gear.slot === 'book') return bonusText(gear) || 'Spell book';
  const tier = TIER_LABEL[setById(gear.set)?.tier] || '';
  return `Defense ${gear.def}${tier ? ' · ' + tier : ''}`;
}

/** Character screen: the hunter between two slot columns, a bottom weapon row, and a stat sheet. Clicking a slot lists only what fits it. */
export function mountGear(body, game) {
  let openSlot = null;
  let outside = null;

  const equippedIn = (slot) => {
    const d = game.progress.data;
    if (slot === 'ammo') {
      const id = d.ammo;
      if (!id || !GOODS[id]) return null;
      const loaded = d.quiverLoad?.id === id ? d.quiverLoad.n : 0;
      const bag = game.progress.good(id);
      return {
        id,
        name: GOODS[id].name,
        type: 'ammo',
        line: d.armor.quiver ? `${loaded}/${QUIVER_MAX} in the quiver · ${bag} in the bag` : `${bag} in the bag · equip a quiver to carry them`,
      };
    }
    return gearById(slot === 'weapon' ? d.weapon : d.armor[slot]);
  };
  const ownedFor = (slot) =>
    GEAR.filter((g) => game.progress.crafted(g.id) && !game.progress.storedGear(g.id) && (slot === 'weapon' ? g.type === 'weapon' : g.type === 'armor' && g.slot === slot));

  const paint = () => {
    game.catalog.stopViewer();
    detach();
    body.innerHTML = '';
    const pr = game.progress;
    const root = document.createElement('div');
    root.className = 'cg';

    const main = document.createElement('div');
    main.className = 'cg-main';

    const wornWeapon = gearById(pr.data.weapon);
    const held = game.items[game.sel];
    const bar = document.createElement('div');
    bar.className = 'cg-title';
    const who = document.createElement('b');
    who.textContent = `${pr.className || 'Hunter'} · Rank ${RANKS[game.rank] || 'F'}`;
    const hand = document.createElement('span');
    hand.textContent = `${wornWeapon ? 'Equipped' : 'In hand'}: ${(wornWeapon || held)?.name || 'Nothing'}`;
    bar.append(who, hand);
    main.appendChild(bar);

    const stage = document.createElement('div');
    stage.className = 'cg-stage';
    const left = column(LEFT);
    const cv = document.createElement('canvas');
    cv.className = 'cg-view';
    const right = column(RIGHT);
    const row = document.createElement('div');
    row.className = 'cg-weapons';
    for (const slot of BOTTOM) row.appendChild(slotButton(slot));
    const mid = document.createElement('div');
    mid.className = 'cg-mid';
    mid.append(cv, row);
    stage.append(left, mid, right);

    const pop = document.createElement('div');
    pop.className = 'cg-pop hidden';
    main.appendChild(stage);

    const tabs = document.createElement('div');
    tabs.className = 'cg-tabs';
    for (const [id, label] of TABS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cg-tab' + (id === 'gear' ? ' on' : '');
      b.textContent = label;
      if (id !== 'gear') b.onclick = () => game.hud.openPanel(id, game);
      tabs.appendChild(b);
    }
    main.appendChild(tabs);

    root.append(main, infoPanel(wornWeapon, held), pop);
    body.appendChild(root);
    flushThumbs(200);
    const look = pr.armorLook();
    game.catalog.startViewer(cv, { kind: 'hunter', armor: look, held: wornWeapon?.held || held?.held || null });

    function column(slots) {
      const col = document.createElement('div');
      col.className = 'cg-col';
      for (const slot of slots) col.appendChild(slotButton(slot));
      return col;
    }

    function slotButton(slot) {
      const gear = equippedIn(slot);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.slot = slot;
      btn.className = 'cg-slot' + (gear ? ' filled' : '') + (openSlot === slot ? ' open' : '');
      btn.title = gear ? `${slotLabel(slot)}: ${gear.name}` : `${slotLabel(slot)}: empty`;
      if (gear) {
        btn.style.setProperty('--rc', colorOf(gear));
        btn.appendChild(thumbFor(gear));
        if (slot === 'ammo') {
          const n = game.progress.data.quiverLoad?.id === gear.id ? game.progress.data.quiverLoad.n : 0;
          const badge = document.createElement('b');
          badge.className = 'cg-count';
          badge.textContent = game.progress.data.armor.quiver ? `${n}` : '';
          if (badge.textContent) btn.appendChild(badge);
        }
      } else {
        const lab = document.createElement('span');
        lab.textContent = slotLabel(slot);
        btn.appendChild(lab);
      }
      const n = ownedFor(slot).filter((g) => !pr.worn(g.id)).length;
      if (n) {
        const dot = document.createElement('i');
        dot.textContent = String(n);
        btn.appendChild(dot);
      }
      btn.onclick = () => {
        openSlot = openSlot === slot ? null : slot;
        stage.querySelectorAll('.cg-slot').forEach((s) => s.classList.toggle('open', s.dataset.slot === openSlot));
        fillPop(pop, stage, btn);
      };
      return btn;
    }

    if (openSlot) {
      const btn = stage.querySelector(`.cg-slot[data-slot="${openSlot}"]`);
      if (btn) fillPop(pop, stage, btn);
    }
    outside = (e) => {
      if (!openSlot) return;
      if (e.target.closest && (e.target.closest('.cg-pop') || e.target.closest('.cg-slot'))) return;
      openSlot = null;
      stage.querySelectorAll('.cg-slot').forEach((s) => s.classList.remove('open'));
      pop.classList.add('hidden');
    };
    body.addEventListener('pointerdown', outside);
  };

  function detach() {
    if (outside) body.removeEventListener('pointerdown', outside);
    outside = null;
  }

  function fillPop(pop, stage, btn) {
    pop.replaceChildren();
    if (!openSlot) {
      pop.classList.add('hidden');
      return;
    }
    const pr = game.progress;
    const slot = openSlot;
    const worn = equippedIn(slot);
    pop.className = 'cg-pop';
    const rr = pop.parentElement.getBoundingClientRect();
    const br = btn.getBoundingClientRect();
    const room = Math.min(300, Math.max(148, rr.height * 0.62));
    pop.style.top = Math.max(0, Math.min(Math.max(0, rr.height - room), br.top - rr.top - 8)) + 'px';

    const head = document.createElement('div');
    head.className = 'cg-pop-head';
    const title = document.createElement('b');
    title.textContent = slotLabel(slot);
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'x';
    close.onclick = () => {
      openSlot = null;
      stage.querySelectorAll('.cg-slot').forEach((s) => s.classList.remove('open'));
      pop.classList.add('hidden');
    };
    head.append(title, close);
    pop.appendChild(head);

    if (slot === 'ammo') {
      fillAmmo(pop, pr);
      return;
    }
    const list = ownedFor(slot).sort((a, b) => (pr.worn(b.id) ? 1 : 0) - (pr.worn(a.id) ? 1 : 0) || (b.def || 0) - (a.def || 0));
    const wrap = document.createElement('div');
    wrap.className = 'cg-pop-list';
    if (!list.length) {
      const p = document.createElement('p');
      p.className = 'cg-pop-empty';
      p.textContent = slot === 'weapon'
        ? 'No weapons yet. Forge one from monster parts, or iron bars at Bram\'s.'
        : slot === 'quiver'
          ? 'No quiver yet. Forge one at Bram\'s from an iron bar and two birch logs.'
          : `No ${slotLabel(slot).toLowerCase()} in your bag. Forge one from monster parts, or iron bars at Bram\'s.`;
      wrap.appendChild(p);
    }
    for (const gear of list) {
      const isWorn = pr.worn(gear.id);
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'cg-item' + (isWorn ? ' worn' : '');
      item.style.setProperty('--rc', colorOf(gear));
      item.title = isWorn ? `Unequip ${gear.name}` : `Equip ${gear.name}`;
      item.appendChild(thumbFor(gear));
      const info = document.createElement('div');
      const name = document.createElement('b');
      name.textContent = gear.name;
      const line = document.createElement('small');
      line.textContent = statLine(gear);
      info.append(name, line);
      if (!isWorn && gear.type === 'armor' && gear.slot !== 'book') {
        const diff = gear.def - (worn?.def || 0);
        const d = document.createElement('em');
        d.className = diff > 0 ? 'up' : diff < 0 ? 'down' : '';
        d.textContent = diff > 0 ? `+${diff} defense` : diff < 0 ? `${diff} defense` : 'Same defense';
        info.appendChild(d);
      }
      const tag = document.createElement('u');
      tag.textContent = isWorn ? 'Unequip' : 'Equip';
      item.append(info, tag);
      const locked = !isWorn && gear.reqLevel && !pr.meetsReq(gear);
      if (locked) {
        tag.textContent = `Str ${gear.reqLevel}`;
        item.disabled = true;
        item.title = `Need Strength ${gear.reqLevel} to wield ${gear.name}`;
      }
      item.onclick = () => {
        game.wearPiece(gear.id);
        openSlot = null;
        paint();
      };
      wrap.appendChild(item);
    }
    pop.appendChild(wrap);
    flushThumbs(200);
  }

  function fillAmmo(pop, pr) {
    const wrap = document.createElement('div');
    wrap.className = 'cg-pop-list';
    const wornId = pr.data.ammo;
    for (const id of ARROW_TYPES) {
      const bag = pr.good(id);
      const loaded = pr.data.quiverLoad?.id === id ? pr.data.quiverLoad.n : 0;
      const on = wornId === id;
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'cg-item' + (on ? ' worn' : '');
      item.appendChild(renderThumb({ kind: 'good', id }, 96));
      const info = document.createElement('div');
      const name = document.createElement('b');
      name.textContent = GOODS[id].name;
      const line = document.createElement('small');
      line.textContent = pr.data.armor.quiver ? `${loaded}/${QUIVER_MAX} loaded · ${bag} in the bag` : `${bag} in the bag`;
      info.append(name, line);
      const tag = document.createElement('u');
      tag.textContent = on ? 'Clear' : 'Select';
      item.append(info, tag);
      item.onclick = () => {
        if (pr.setAmmo(id) === false) game.hud.toast(INVENTORY_FULL, 1400);
        openSlot = null;
        paint();
      };
      wrap.appendChild(item);
    }
    if (!ARROW_TYPES.length) {
      const p = document.createElement('p');
      p.className = 'cg-pop-empty';
      p.textContent = 'No arrow types yet.';
      wrap.appendChild(p);
    }
    pop.appendChild(wrap);
  }

  function infoPanel(wornWeapon, held) {
    const pr = game.progress;
    const p = game.player;
    const side = document.createElement('aside');
    side.className = 'cg-info';
    const box = (title, rows) => {
      const sec = document.createElement('section');
      const h = document.createElement('h3');
      h.textContent = title;
      sec.appendChild(h);
      for (const [a, b] of rows) {
        const r = document.createElement('div');
        r.className = 'cg-row';
        const l = document.createElement('span');
        l.textContent = a;
        const v = document.createElement('b');
        v.textContent = b;
        r.append(l, v);
        sec.appendChild(r);
      }
      return sec;
    };

    const def = document.createElement('section');
    def.className = 'cg-def';
    const h = document.createElement('h3');
    h.textContent = 'Defense';
    const big = document.createElement('div');
    big.className = 'cg-big';
    big.textContent = String(pr.defense);
    const sub = document.createElement('small');
    sub.textContent = `${Math.round(pr.reduction * 100)}% less damage taken`;
    def.append(h, big, sub);
    side.appendChild(def);

    const style = STYLE_LABEL[wornWeapon?.item?.style || held?.style] || 'None';
    side.appendChild(
      box('Attributes', [
        ['Health', p ? `${Math.ceil(p.maxHp)}` : '-'],
        ['Spirit', p ? `${Math.floor(p.maxMana)}` : '-'],
        ['Stamina', p ? `${Math.floor(p.maxStamina)}` : '-'],
        ['Weapon style', style],
      ])
    );

    const b = pr.gearBonus;
    const pct = (n) => (n ? `+${Math.round(n * 100)}%` : '-');
    side.appendChild(
      box('Enhancements', [
        ['Max health', b.hp ? `+${b.hp}` : '-'],
        ['Max spirit', b.mana ? `+${b.mana}` : '-'],
        ['Max stamina', b.stamina ? `+${b.stamina}` : '-'],
        ['Spell damage', pct(b.spell)],
        ['Ranged damage', pct(b.ranged)],
        ['Critical chance', pct(b.crit)],
      ])
    );

    const sets = document.createElement('section');
    const sh = document.createElement('h3');
    sh.textContent = 'Set bonus';
    sets.appendChild(sh);
    const active = pr.activeSets;
    const note = document.createElement('p');
    note.className = 'cg-note';
    note.textContent = active.length ? active.map((s) => `${s.name}: ${s.bonus}`).join(' ') : 'Wear a full set (helm, chest, gloves, legs, boots) to unlock its bonus.';
    sets.appendChild(note);
    side.appendChild(sets);
    return side;
  }

  paint();
  return () => {
    detach();
    game.catalog.stopViewer();
  };
}
