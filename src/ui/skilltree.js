import { CLASS_LIST, CLASSES, RESOURCE_NAME, SKILLS } from '../data/skills.js';
import { SKILL_POINT_PER_KILLS } from '../systems/progress.js';
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
const BUBBLE_EMPTY = ['Spirit Bolt', 'Empty', 'Fury'];

const TIER_POS = [[1, 0], [0, 1], [1, 2], [2, 3], [1, 4]];

const ATTR_SHAPE = {
  vitality: 'heart', might: 'axe', guard: 'shield', wrath: 'drop',
  endurance: 'leap', precision: 'eye', agility: 'arrow', toxin: 'poison',
  spiritwell: 'nova', arcana: 'spark', focus: 'mark', potency: 'fire',
};
const WEAPON_SHAPE = {
  swordshield: 'bash', twohand: 'axe', dual: 'execute',
  shortbow: 'arrow', longbow: 'shot', crossbow: 'mark',
  staff: 'wave', wand: 'spark', tome: 'eye',
};

function spentIn(pr, path) {
  let n = 0;
  for (const s of path.skills) if (pr.hasSkill(s.id)) n += s.cost;
  return n;
}

function equippedBubbles(game) {
  const row = document.createElement('div');
  row.className = 'sk-bubbles';
  const eq = game.progress.equipped();
  eq.forEach((id, i) => {
    const skill = id && SKILLS[id];
    const b = document.createElement('div');
    b.className = 'sk-bubble' + (skill ? ' on' : '');
    const cv = document.createElement('canvas');
    if (skill) paintSkillIcon(cv, skill.shape, skill.color);
    const num = document.createElement('b');
    num.textContent = String(i + 1);
    const name = document.createElement('span');
    name.textContent = skill ? skill.name : BUBBLE_EMPTY[i];
    b.append(cv, num, name);
    row.appendChild(b);
  });
  return row;
}

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
    const slain = Math.max(0, game.progress.totalKills() - game.progress.kills('chicken'));
    const banked = Math.floor(slain / SKILL_POINT_PER_KILLS);
    intro.textContent = `Choose a path. You start with 2 points, plus 1 for every ${SKILL_POINT_PER_KILLS} monsters slain (${slain} slain, ${banked} banked). Passives turn on when learned. Actives and specials go on the round action buttons 1, 2, and 3 (keys Z, X, and V).`;
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

  let sel = null;

  const paintTree = () => {
    const cls = CLASSES[game.progress.classId];
    const pr = game.progress;
    const pts = pr.skillPoints();
    const eq = pr.equipped();
    const card = root.closest('.panel-card');
    const keep = card ? card.scrollTop : 0;

    const head = document.createElement('div');
    head.className = 'sk-head';
    const learned = Object.keys(pr.data.skills.learned).length;
    const attrRanks = pr.data.skills.attrs || {};
    const weaponRanks = pr.data.skills.weapons || {};
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
    root.appendChild(equippedBubbles(game));

    const state = (s) => {
      const on = pr.hasSkill(s.id);
      const reqOk = !s.req || pr.hasSkill(s.req);
      return on ? 'learned' : reqOk && pts.left >= s.cost ? 'ready' : reqOk ? 'afford' : 'locked';
    };

    if (!sel) {
      const first = cls.paths.flatMap((p) => p.skills.map((raw) => SKILLS[raw.id])).find((s) => state(s) === 'ready');
      sel = { type: 'skill', id: (first || SKILLS[cls.paths[0].skills[0].id]).id };
    }

    const trees = document.createElement('div');
    trees.className = 'tt-trees';
    const best = Math.max(0, ...cls.paths.map((p) => spentIn(pr, p)));
    for (const path of cls.paths) {
      const spent = spentIn(pr, path);
      const col = document.createElement('section');
      col.className = 'tt-tree' + (spent && spent === best ? ' lead' : '');
      col.style.setProperty('--pc', path.color);

      const top = document.createElement('header');
      top.className = 'tt-head';
      const hico = document.createElement('canvas');
      hico.className = 'tt-hico';
      paintSkillIcon(hico, SKILLS[path.skills[0].id].shape, path.color);
      const pip = document.createElement('i');
      pip.textContent = String(spent);
      const name = document.createElement('b');
      name.textContent = path.name;
      top.append(hico, pip, name);
      col.appendChild(top);

      const grid = document.createElement('div');
      grid.className = 'tt-grid';
      const NODE = 52;
      const PX = 76;
      const PY = 62;
      grid.style.width = PX * 2 + NODE + 'px';
      grid.style.height = PY * (TIER_POS.length - 1) + NODE + 'px';
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'tt-lines');
      svg.setAttribute('width', String(PX * 2 + NODE));
      svg.setAttribute('height', String(PY * (TIER_POS.length - 1) + NODE));
      grid.appendChild(svg);

      path.skills.forEach((raw, i) => {
        const s = SKILLS[raw.id];
        const [cx, cy] = TIER_POS[i];
        const x = cx * PX;
        const y = cy * PY;
        if (i > 0) {
          const [px, py] = TIER_POS[i - 1];
          const x1 = px * PX + NODE / 2;
          const y1 = py * PY + NODE;
          const x2 = x + NODE / 2;
          const y2 = y;
          const mid = (y1 + y2) / 2;
          const link = pr.hasSkill(s.id) ? 'on' : pr.hasSkill(path.skills[i - 1].id) ? 'ready' : 'off';
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          line.setAttribute('d', `M${x1} ${y1} V${mid} H${x2} V${y2 - 7}`);
          line.setAttribute('class', 'tt-line ' + link);
          svg.appendChild(line);
          const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
          arrow.setAttribute('points', `${x2 - 6},${y2 - 8} ${x2 + 6},${y2 - 8} ${x2},${y2}`);
          arrow.setAttribute('class', 'tt-arrow ' + link);
          svg.appendChild(arrow);
        }
        const st = state(s);
        const node = document.createElement('button');
        node.type = 'button';
        node.className = `tt-node ${st}${sel.type === 'skill' && sel.id === s.id ? ' sel' : ''}${s.kind === 'special' ? ' special' : ''}${s.kind === 'passive' ? ' passive' : ''}`;
        node.style.left = x + 'px';
        node.style.top = y + 'px';
        node.title = s.name;
        const cv = document.createElement('canvas');
        paintSkillIcon(cv, s.shape, path.color);
        node.appendChild(cv);
        const rank = document.createElement('em');
        rank.textContent = pr.hasSkill(s.id) ? '1' : '0';
        node.appendChild(rank);
        const slot = eq.indexOf(s.id);
        if (slot >= 0) {
          const key = document.createElement('u');
          key.textContent = String(slot + 1);
          node.appendChild(key);
        }
        node.onclick = () => {
          sel = { type: 'skill', id: s.id };
          paint();
        };
        grid.appendChild(node);
      });
      col.appendChild(grid);
      trees.appendChild(col);
    }
    root.appendChild(trees);

    const extra = document.createElement('div');
    extra.className = 'tt-extra';
    extra.appendChild(rankBand('Attributes', 'attr', cls.attributes || [], ATTR_SHAPE, (id) => pr.attrRank(id), cls.color));
    extra.appendChild(rankBand('Weapon mastery', 'weapon', cls.weapons || [], WEAPON_SHAPE, (id) => pr.weaponRank(id), '#ffd23f', game.items[game.sel]?.style));
    root.appendChild(extra);

    root.appendChild(detail());
    if (card) card.scrollTop = keep;

    function rankBand(title, type, list, shapes, rankOf, tint, heldStyle) {
      const sec = document.createElement('section');
      sec.className = 'tt-band';
      sec.style.setProperty('--pc', tint);
      const h = document.createElement('h3');
      h.textContent = title;
      sec.appendChild(h);
      const row = document.createElement('div');
      row.className = 'tt-row';
      for (const def of list) {
        const rank = rankOf(def.id);
        const node = document.createElement('button');
        node.type = 'button';
        const open = pts.left > 0 && rank < def.max;
        node.className = `tt-node ${rank > 0 ? 'learned' : open ? 'ready' : 'afford'}${sel.type === type && sel.id === def.id ? ' sel' : ''}${heldStyle === def.id ? ' held' : ''}`;
        node.title = def.name;
        const cv = document.createElement('canvas');
        paintSkillIcon(cv, shapes[def.id] || 'spark', tint);
        node.appendChild(cv);
        const r = document.createElement('em');
        r.textContent = `${rank}/${def.max}`;
        node.appendChild(r);
        node.onclick = () => {
          sel = { type, id: def.id };
          paint();
        };
        row.appendChild(node);
      }
      sec.appendChild(row);
      return sec;
    }

    function detail() {
      const box = document.createElement('aside');
      box.className = 'tt-detail';
      const cv = document.createElement('canvas');
      cv.className = 'tt-dico';
      const info = document.createElement('div');
      info.className = 'tt-info';
      const acts = document.createElement('div');
      acts.className = 'tt-acts';
      const title = document.createElement('b');
      const meta = document.createElement('small');
      const text = document.createElement('p');

      if (sel.type === 'skill') {
        const s = SKILLS[sel.id];
        const st = state(s);
        box.style.setProperty('--pc', s.color);
        paintSkillIcon(cv, s.shape, s.color);
        title.textContent = s.name;
        const bits = [KIND_LABEL[s.kind], `${s.cost} point${s.cost > 1 ? 's' : ''}`];
        if (s.resource) bits.push(`${resourceCost(game, s)} ${RESOURCE_NAME[s.res]}`, `${s.cd}s cooldown`);
        meta.textContent = bits.join(' · ');
        text.textContent = s.desc;
        if (st === 'learned' && s.kind !== 'passive') {
          ['1', '2', '3'].forEach((key, slot) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'sk-key' + (eq[slot] === s.id ? ' on' : '');
            b.textContent = key;
            b.title = eq[slot] === s.id ? `Take off action button ${key}` : `Place on action button ${key} (${'ZXV'[slot]})`;
            b.onclick = () => {
              game.equipSkill(slot, eq[slot] === s.id ? null : s.id);
              paint();
            };
            acts.appendChild(b);
          });
          const hint = document.createElement('span');
          hint.textContent = 'Place on a round button';
          acts.appendChild(hint);
        } else if (st === 'learned') {
          const on = document.createElement('span');
          on.className = 'tt-ok';
          on.textContent = 'Learned. Always on.';
          acts.appendChild(on);
        } else if (st === 'locked') {
          const lock = document.createElement('span');
          lock.className = 'tt-lock';
          lock.textContent = `Learn ${SKILLS[s.req].name} first.`;
          acts.appendChild(lock);
        } else {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'sk-btn sk-learn';
          b.textContent = st === 'ready' ? `Learn · ${s.cost}` : 'Need points';
          b.disabled = st !== 'ready';
          b.onclick = () => {
            if (game.learnSkill(s.id)) paint();
          };
          acts.appendChild(b);
        }
      } else {
        const list = sel.type === 'attr' ? cls.attributes : cls.weapons;
        const def = list.find((d) => d.id === sel.id);
        const rank = sel.type === 'attr' ? pr.attrRank(def.id) : pr.weaponRank(def.id);
        box.style.setProperty('--pc', sel.type === 'attr' ? cls.color : '#ffd23f');
        paintSkillIcon(cv, (sel.type === 'attr' ? ATTR_SHAPE : WEAPON_SHAPE)[def.id] || 'spark', sel.type === 'attr' ? cls.color : '#ffd23f');
        title.textContent = def.name;
        meta.textContent = `${sel.type === 'attr' ? 'Attribute' : 'Weapon mastery'} · rank ${rank}/${def.max}`;
        text.textContent = rank ? `${def.rankText(rank)}. ${def.blurb}` : def.blurb;
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'sk-btn sk-learn';
        b.textContent = rank >= def.max ? 'Max rank' : pts.left < 1 ? 'Need points' : 'Add rank · 1';
        b.disabled = rank >= def.max || pts.left < 1;
        b.onclick = () => {
          if (sel.type === 'attr' ? game.raiseAttr(def.id) : game.raiseWeapon(def.id)) paint();
        };
        acts.appendChild(b);
      }
      info.append(title, meta, text, acts);
      box.append(cv, info);
      return box;
    }
  };

  paint();
  return () => root.remove();
}
