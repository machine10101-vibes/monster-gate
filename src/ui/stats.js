import { CLASSES } from '../data/skills.js';
import { LEVEL_SKILLS, MAX_LEVEL, SKILL_ORDER, xpForLevel } from '../data/gathering.js';
import { iconCanvas } from './icons.js';

const fmt = (n) => Math.floor(n).toLocaleString('en-US');

function iconEl(name, px = 16) {
  const cv = document.createElement('canvas');
  cv.width = 16;
  cv.height = 16;
  cv.getContext('2d').drawImage(iconCanvas(name), 0, 0);
  cv.className = 'st-ico';
  cv.style.width = px * 2 + 'px';
  cv.style.height = px * 2 + 'px';
  return cv;
}

/** RuneScape-style stats page: skill grid, detail card, hunter vitals and talents. */
export function mountStats(body, game, initial = null) {
  const pr = game.progress;
  let sel = initial && LEVEL_SKILLS[initial] ? initial : 'mining';
  let alive = true;

  const paint = () => {
    if (!alive) return;
    body.innerHTML = '';
    const root = document.createElement('div');
    root.className = 'stats';

    const top = document.createElement('div');
    top.className = 'st-top';
    top.innerHTML = `<div><small>Total level</small><b>${pr.totalLevel}</b></div><div><small>Total XP</small><b>${fmt(pr.totalXp)}</b></div><div><small>Monsters slain</small><b>${game.kills}</b></div>`;
    root.appendChild(top);

    const grid = document.createElement('div');
    grid.className = 'st-grid';
    for (const id of SKILL_ORDER) {
      const def = LEVEL_SKILLS[id];
      const lvl = pr.level(id);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'st-tile' + (id === sel ? ' sel' : '');
      b.style.setProperty('--sk', def.color);
      b.dataset.skill = id;
      b.appendChild(iconEl(id));
      const n = document.createElement('span');
      n.className = 'st-name';
      n.textContent = def.name;
      const l = document.createElement('span');
      l.className = 'st-lvl';
      l.innerHTML = `<b>${lvl}</b><i>/${MAX_LEVEL}</i>`;
      const bar = document.createElement('span');
      bar.className = 'st-mini';
      const cur = xpForLevel(lvl);
      const next = xpForLevel(Math.min(MAX_LEVEL, lvl + 1));
      const frac = lvl >= MAX_LEVEL ? 1 : (pr.xp(id) - cur) / Math.max(1, next - cur);
      const fill = document.createElement('i');
      fill.style.width = Math.round(Math.max(0, Math.min(1, frac)) * 100) + '%';
      bar.appendChild(fill);
      b.append(n, l, bar);
      b.onclick = () => {
        sel = id;
        game.audio.select();
        paint();
      };
      grid.appendChild(b);
    }
    root.appendChild(grid);

    root.appendChild(detail(sel));
    root.appendChild(vitals());
    const talents = talentsBlock();
    if (talents) root.appendChild(talents);
    body.appendChild(root);
  };

  const detail = (id) => {
    const def = LEVEL_SKILLS[id];
    const lvl = pr.level(id);
    const xp = pr.xp(id);
    const next = lvl >= MAX_LEVEL ? null : xpForLevel(lvl + 1);
    const cur = xpForLevel(lvl);
    const card = document.createElement('div');
    card.className = 'st-detail';
    card.style.setProperty('--sk', def.color);
    const head = document.createElement('div');
    head.className = 'st-dhead';
    head.appendChild(iconEl(id, 20));
    const title = document.createElement('div');
    title.innerHTML = `<b>${def.name}</b><span>Level ${lvl} / ${MAX_LEVEL}</span>`;
    head.appendChild(title);
    card.appendChild(head);
    const blurb = document.createElement('p');
    blurb.className = 'st-blurb';
    blurb.textContent = def.blurb;
    card.appendChild(blurb);
    const rows = document.createElement('div');
    rows.className = 'st-rows';
    rows.innerHTML = `<div><span>Current XP</span><b>${fmt(xp)}</b></div><div><span>${next ? 'XP for next level' : 'Max level'}</span><b>${next ? fmt(next) : '—'}</b></div><div><span>Remaining</span><b>${next ? fmt(next - xp) : '—'}</b></div><div><span>Active bonus</span><b>${def.effect(lvl)}</b></div>`;
    card.appendChild(rows);
    const bar = document.createElement('div');
    bar.className = 'st-bar';
    const fill = document.createElement('i');
    const frac = next ? (xp - cur) / Math.max(1, next - cur) : 1;
    fill.style.width = Math.round(Math.max(0, Math.min(1, frac)) * 100) + '%';
    bar.appendChild(fill);
    card.appendChild(bar);
    const un = document.createElement('ul');
    un.className = 'st-unlocks';
    for (const [need, text] of def.unlocks) {
      const li = document.createElement('li');
      const ok = lvl >= need;
      li.className = ok ? 'ok' : '';
      li.innerHTML = `<b>Lv ${need}</b><span>${text}</span>`;
      un.appendChild(li);
    }
    card.appendChild(un);
    return card;
  };

  const vitals = () => {
    const p = game.player;
    const sec = document.createElement('section');
    sec.className = 'st-vitals';
    const cls = pr.classId ? CLASSES[pr.classId].name : 'Unsworn';
    const items = [
      ['Class', cls],
      ['Hunter rank', ['F', 'E', 'D', 'C', 'B', 'A', 'S'][game.rank] || 'F'],
      ['Health', `${Math.ceil(p.hp)} / ${p.maxHp}`],
      ['Spirit', `${Math.floor(p.mana)} / ${p.maxMana}`],
      ['Stamina', `${Math.floor(p.stamina)} / ${p.maxStamina}`],
      ['Armor', `${Math.round(pr.reduction * 100)}% damage reduction`],
      ['Gold', fmt(game.gold)],
      ['Skill points', `${pr.skillPoints().left} unspent`],
    ];
    sec.innerHTML = '<h3>Hunter</h3>' + `<div class="st-vgrid">${items.map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('')}</div>`;
    return sec;
  };

  const talentsBlock = () => {
    const cls = CLASSES[pr.classId];
    if (!cls) return null;
    const lines = [];
    for (const a of cls.attributes || []) {
      const r = pr.attrRank(a.id);
      if (r > 0) lines.push([a.name, `${r}/${a.max}`, a.rankText(r)]);
    }
    for (const w of cls.weapons || []) {
      const r = pr.weaponRank(w.id);
      if (r > 0) lines.push([w.name, `${r}/${w.max}`, w.rankText(r)]);
    }
    const sec = document.createElement('section');
    sec.className = 'st-talents';
    sec.innerHTML = '<h3>Talents</h3>';
    if (!lines.length) {
      sec.innerHTML += '<p class="st-none">Spend skill points in the Skill Tree (K) to raise attributes and weapon mastery.</p>';
    } else {
      const ul = document.createElement('ul');
      for (const [n, rank, text] of lines) {
        const li = document.createElement('li');
        li.innerHTML = `<b>${n}</b><i>${rank}</i><span>${text}</span>`;
        ul.appendChild(li);
      }
      sec.appendChild(ul);
    }
    return sec;
  };

  paint();
  const prev = game.onStatsChange;
  game.onStatsChange = () => paint();
  return () => {
    alive = false;
    game.onStatsChange = prev || null;
  };
}
