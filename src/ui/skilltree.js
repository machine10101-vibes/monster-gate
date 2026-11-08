import { CLASS_LIST, CLASSES, RESOURCE_NAME, SKILLS } from '../data/skills.js';
import { resourceCost } from '../systems/skillcast.js';

const SHAPES = {
  shield: [[5, 1, 6, 1], [3, 2, 10, 2], [3, 4, 10, 4], [4, 8, 8, 1], [5, 9, 6, 1], [6, 10, 4, 1], [7, 11, 2, 1]],
  bash: [[2, 6, 7, 3], [8, 5, 3, 3], [10, 4, 2, 2], [3, 10, 4, 2]],
  wall: [[2, 3, 3, 9], [7, 2, 3, 10], [12, 3, 2, 9], [2, 6, 12, 2]],
  drop: [[7, 2, 2, 2], [6, 4, 4, 2], [5, 6, 6, 2], [6, 8, 4, 2], [7, 10, 2, 2]],
  whirl: [[6, 2, 4, 2], [3, 4, 3, 2], [10, 5, 3, 2], [4, 8, 3, 2], [8, 9, 4, 2], [6, 6, 4, 3]],
  execute: [[7, 1, 2, 6], [6, 7, 4, 2], [4, 9, 8, 2], [3, 11, 10, 2]],
  axe: [[3, 3, 4, 5], [7, 4, 2, 8], [9, 3, 3, 2], [9, 6, 3, 2]],
  leap: [[7, 1, 2, 3], [6, 4, 4, 2], [4, 7, 3, 2], [9, 7, 3, 2], [6, 10, 4, 3]],
  cry: [[4, 3, 8, 3], [3, 6, 10, 2], [5, 8, 6, 2], [7, 10, 2, 3]],
  heart: [[3, 3, 4, 3], [9, 3, 4, 3], [3, 6, 10, 2], [5, 8, 6, 2], [7, 10, 2, 2]],
  wolf: [[3, 4, 8, 3], [10, 3, 3, 3], [4, 2, 2, 2], [7, 2, 2, 2], [2, 7, 2, 4], [8, 7, 2, 4]],
  pack: [[2, 5, 5, 3], [9, 4, 5, 3], [6, 8, 4, 3]],
  poison: [[7, 2, 2, 3], [6, 5, 4, 5], [7, 10, 2, 3], [5, 7, 2, 2], [9, 7, 2, 2]],
  arrow: [[2, 7, 8, 2], [10, 5, 2, 2], [12, 6, 2, 2], [11, 8, 2, 2], [9, 9, 2, 2]],
  cloud: [[3, 6, 4, 3], [6, 4, 5, 5], [10, 6, 3, 3], [4, 9, 8, 2]],
  eye: [[2, 6, 12, 4], [6, 7, 4, 2], [7, 7, 2, 2]],
  shot: [[1, 7, 9, 2], [10, 6, 2, 1], [12, 5, 2, 2], [12, 8, 2, 2], [10, 9, 2, 1]],
  mark: [[7, 1, 2, 3], [4, 4, 8, 2], [7, 6, 2, 4], [3, 10, 10, 2], [7, 12, 2, 2]],
  fire: [[7, 2, 2, 2], [6, 4, 4, 3], [5, 7, 6, 3], [7, 10, 2, 3], [4, 8, 2, 2], [10, 8, 2, 2]],
  wave: [[2, 8, 3, 2], [5, 5, 3, 2], [8, 8, 3, 2], [11, 5, 3, 2]],
  ice: [[7, 1, 2, 3], [5, 4, 6, 2], [4, 6, 8, 2], [6, 8, 4, 2], [7, 10, 2, 3]],
  nova: [[7, 2, 2, 2], [7, 12, 2, 2], [2, 7, 2, 2], [12, 7, 2, 2], [5, 5, 6, 6], [7, 7, 2, 2]],
  spark: [[8, 1, 2, 4], [5, 5, 4, 2], [9, 6, 3, 3], [6, 9, 3, 4], [4, 11, 2, 2]],
  chain: [[2, 3, 2, 2], [4, 5, 3, 2], [7, 7, 3, 2], [10, 5, 3, 2], [12, 8, 2, 2], [8, 10, 3, 2]],
};

const ACCENT = {
  shield: [[6, 4, 4, 3]],
  bash: [[9, 5, 2, 2]],
  heart: [[6, 4, 4, 2]],
  fire: [[7, 5, 2, 3]],
  spark: [[9, 2, 1, 2]],
  eye: [[7, 7, 2, 2]],
  mark: [[7, 4, 2, 2]],
};

export function paintSkillIcon(canvas, shape, tint) {
  const ctx = canvas.getContext('2d');
  canvas.width = 16;
  canvas.height = 16;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, 16, 16);
  ctx.fillStyle = tint || '#888';
  ctx.globalAlpha = 0.35;
  ctx.fillRect(1, 1, 14, 14);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#f4efe2';
  for (const [x, y, w, h] of SHAPES[shape] || SHAPES.spark) ctx.fillRect(x, y, w, h);
  ctx.fillStyle = tint || '#fff';
  for (const [x, y, w, h] of ACCENT[shape] || []) ctx.fillRect(x, y, w, h);
}

const KIND_LABEL = { passive: 'Passive', active: 'Active', special: 'Special' };

export function mountSkillTree(body, game) {
  const root = document.createElement('div');
  root.className = 'sk-wrap';
  body.appendChild(root);
  let picking = !game.progress.classId;

  const paint = () => {
    root.replaceChildren();
    if (picking || !game.progress.classId) paintPicker();
    else paintTree();
  };

  const paintPicker = () => {
    const intro = document.createElement('p');
    intro.className = 'sk-intro';
    const slain = game.progress.totalKills();
    const banked = Math.floor(slain / 2);
    intro.textContent = `Choose a path. You start with 2 points, plus 1 for every 2 monsters slain (${slain} slain, ${banked} banked). Passives turn on when learned. Actives and specials equip to Z, X, and V.`;
    root.appendChild(intro);
    const row = document.createElement('div');
    row.className = 'sk-pick';
    const cur = game.progress.classId;
    for (const cls of CLASS_LIST) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'sk-class';
      card.style.borderColor = cls.color;
      const cost = cur && cur !== cls.id ? 25 : 0;
      const paths = cls.paths.map((p) => p.name).join(' · ');
      card.innerHTML = `<b style="color:${cls.color}">${cls.name}</b><span>${cls.blurb}</span><small>${paths}</small><em>${cur === cls.id ? 'Current path' : cost ? `Switch · ${cost} gold` : 'Choose'}</em>`;
      card.disabled = cur === cls.id;
      card.onclick = () => {
        if (game.chooseClass(cls.id)) {
          picking = false;
          paint();
        }
      };
      row.appendChild(card);
    }
    root.appendChild(row);
    if (cur) {
      const back = document.createElement('button');
      back.type = 'button';
      back.className = 'sk-btn sk-back';
      back.textContent = 'Back to tree';
      back.onclick = () => {
        picking = false;
        paint();
      };
      root.appendChild(back);
    }
  };

  const paintTree = () => {
    const cls = CLASSES[game.progress.classId];
    const pts = game.progress.skillPoints();
    const head = document.createElement('div');
    head.className = 'sk-head';
    const learned = Object.keys(game.progress.data.skills.learned).length;
    const attrRanks = game.progress.data.skills.attrs || {};
    const weaponRanks = game.progress.data.skills.weapons || {};
    const invested = learned || Object.values(attrRanks).some((n) => n > 0) || Object.values(weaponRanks).some((n) => n > 0);
    head.innerHTML = `<div><b style="color:${cls.color}">${cls.name}</b><span>${pts.left} point${pts.left === 1 ? '' : 's'} ready · ${pts.spent} spent · ${game.gold} gold</span></div>`;
    const actions = document.createElement('div');
    actions.className = 'sk-head-acts';
    const respec = document.createElement('button');
    respec.type = 'button';
    respec.className = 'sk-btn';
    respec.textContent = 'Respec · 15g';
    respec.disabled = !invested || game.gold < 15;
    respec.onclick = () => {
      if (game.respecSkills()) paint();
    };
    const change = document.createElement('button');
    change.type = 'button';
    change.className = 'sk-btn';
    change.textContent = 'Change path';
    change.onclick = () => {
      picking = true;
      paint();
    };
    actions.append(respec, change);
    head.appendChild(actions);
    root.appendChild(head);

    const note = document.createElement('p');
    note.className = 'sk-note';
    note.textContent = `Passives are always on. Attributes and weapon masteries take the same points, one per rank. A mastery applies while that weapon is in your hand. ${cls.name} skills spend ${RESOURCE_NAME[cls.resource]}.`;
    root.appendChild(note);

    const attrs = document.createElement('section');
    attrs.className = 'sk-attrs';
    const attrHead = document.createElement('h3');
    attrHead.textContent = 'Attributes';
    attrs.appendChild(attrHead);
    for (const attr of cls.attributes || []) {
      const rank = game.progress.attrRank(attr.id);
      const row = document.createElement('div');
      row.className = 'sk-attr';
      const name = document.createElement('b');
      name.textContent = attr.name;
      const desc = document.createElement('span');
      desc.textContent = rank ? attr.rankText(rank) : attr.blurb;
      const pips = document.createElement('div');
      pips.className = 'sk-pips';
      for (let i = 0; i < attr.max; i++) {
        const pip = document.createElement('i');
        if (i < rank) pip.className = 'on';
        pips.appendChild(pip);
      }
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sk-btn';
      btn.textContent = rank >= attr.max ? 'Max' : '+1';
      btn.disabled = rank >= attr.max || pts.left < 1;
      btn.onclick = () => {
        if (game.raiseAttr(attr.id)) paint();
      };
      row.append(name, desc, pips, btn);
      attrs.appendChild(row);
    }
    root.appendChild(attrs);

    const weapons = document.createElement('section');
    weapons.className = 'sk-attrs';
    const weaponHead = document.createElement('h3');
    weaponHead.textContent = 'Weapons';
    weapons.appendChild(weaponHead);
    const heldStyle = game.items[game.sel]?.style;
    for (const weapon of cls.weapons || []) {
      const rank = game.progress.weaponRank(weapon.id);
      const row = document.createElement('div');
      row.className = 'sk-attr' + (heldStyle === weapon.id ? ' held' : '');
      const name = document.createElement('b');
      name.textContent = weapon.name;
      const desc = document.createElement('span');
      desc.textContent = rank ? weapon.rankText(rank) : weapon.blurb;
      const pips = document.createElement('div');
      pips.className = 'sk-pips';
      for (let i = 0; i < weapon.max; i++) {
        const pip = document.createElement('i');
        if (i < rank) pip.className = 'on';
        pips.appendChild(pip);
      }
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sk-btn';
      btn.textContent = rank >= weapon.max ? 'Max' : '+1';
      btn.disabled = rank >= weapon.max || pts.left < 1;
      btn.onclick = () => {
        if (game.raiseWeapon(weapon.id)) paint();
      };
      row.append(name, desc, pips, btn);
      weapons.appendChild(row);
    }
    root.appendChild(weapons);

    const cols = document.createElement('div');
    cols.className = 'sk-cols';
    const eq = game.progress.equipped();
    for (const path of cls.paths) {
      const col = document.createElement('section');
      col.className = 'sk-col';
      const h = document.createElement('h3');
      h.textContent = path.name;
      h.style.color = path.color;
      col.appendChild(h);
      path.skills.forEach((raw, index) => {
        const s = SKILLS[raw.id];
        const on = game.progress.hasSkill(s.id);
        const reqOk = !s.req || game.progress.hasSkill(s.req);
        const card = document.createElement('article');
        card.className = 'sk-card' + (on ? ' learned' : reqOk ? ' ready' : ' locked');
        card.style.borderColor = on ? path.color : '';
        const cv = document.createElement('canvas');
        cv.className = 'sk-ico';
        cv.width = 16;
        cv.height = 16;
        paintSkillIcon(cv, s.shape, path.color);
        card.appendChild(cv);
        const info = document.createElement('div');
        const title = document.createElement('div');
        title.className = 'sk-name';
        const tag = document.createElement('i');
        tag.className = 'sk-tag ' + s.kind;
        tag.textContent = KIND_LABEL[s.kind];
        title.append(document.createTextNode(s.name + ' '), tag);
        const meta = document.createElement('small');
        const bits = [`${s.cost} pt${s.cost > 1 ? 's' : ''}`];
        if (s.resource) bits.push(`${resourceCost(game, s)} ${RESOURCE_NAME[s.res]}`, `${s.cd}s`);
        meta.textContent = bits.join(' · ');
        const desc = document.createElement('p');
        desc.textContent = s.desc;
        info.append(title, meta, desc);
        if (on && s.kind !== 'passive') {
          const keys = document.createElement('div');
          keys.className = 'sk-keys';
          ['Z', 'X', 'V'].forEach((key, slot) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'sk-key' + (eq[slot] === s.id ? ' on' : '');
            b.textContent = key;
            b.title = eq[slot] === s.id ? `Unequip from ${key}` : `Equip to ${key}`;
            b.onclick = () => {
              game.equipSkill(slot, eq[slot] === s.id ? null : s.id);
              paint();
            };
            keys.appendChild(b);
          });
          info.appendChild(keys);
        } else if (on) {
          const always = document.createElement('small');
          always.className = 'sk-always';
          always.textContent = 'Always on';
          info.appendChild(always);
        } else if (reqOk) {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'sk-btn sk-learn';
          const afford = pts.left >= s.cost;
          b.textContent = afford ? `Learn · ${s.cost}` : 'Need points';
          b.disabled = !afford;
          b.onclick = () => {
            if (game.learnSkill(s.id)) paint();
          };
          info.appendChild(b);
        } else {
          const lock = document.createElement('small');
          lock.className = 'sk-lock';
          lock.textContent = index === 0 ? 'Locked' : 'Learn the skill above first';
          info.appendChild(lock);
        }
        card.appendChild(info);
        col.appendChild(card);
      });
      cols.appendChild(col);
    }
    root.appendChild(cols);

    const bar = document.createElement('div');
    bar.className = 'sk-equipped';
    const labels = eq.map((id, i) => `${'ZXV'[i]} ${id ? SKILLS[id].name : 'empty'}`);
    bar.textContent = 'Equipped  ' + labels.join('   ·   ');
    root.appendChild(bar);
  };

  paint();
  return () => root.remove();
}
