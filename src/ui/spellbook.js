import { RESOURCE_NAME, SKILLS } from '../data/skills.js';
import { resourceCost } from '../systems/skillcast.js';
import { paintSkillIcon } from './skilltree.js';

const BARS = [
  { n: '1', key: 'Z' },
  { n: '2', key: 'X' },
  { n: '3', key: 'V' },
];

function icon(skill) {
  const cv = document.createElement('canvas');
  cv.width = 16;
  cv.height = 16;
  paintSkillIcon(cv, skill.shape, skill.color);
  return cv;
}

/** Place learned skills and spells on the numbered bar. */
export function mountSpellbook(body, game) {
  let dragId = null;
  const paint = () => {
    body.innerHTML = '';
    const root = document.createElement('div');
    root.className = 'book';
    const pr = game.progress;
    if (!pr.classId) {
      const p = document.createElement('p');
      p.textContent = 'Choose a path in the skill tree first. Skills and spells you learn can be placed on the numbered bar.';
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'book-open';
      b.textContent = 'Open skill tree';
      b.onclick = () => game.hud.openPanel('skills', game);
      root.append(p, b);
      body.appendChild(root);
      return;
    }

    const note = document.createElement('p');
    note.className = 'book-note';
    note.textContent = 'The numbered slots are the skill bar at the bottom of the screen. Tap 1, 2, or 3 on a skill to place it, or drag it onto a slot. The buttons on the right of the bar cast the same slots.';
    root.appendChild(note);

    const bar = document.createElement('div');
    bar.className = 'book-bar';
    const eq = pr.equipped();
    BARS.forEach((slot, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'book-slot' + (eq[i] ? ' filled' : '');
      const skill = eq[i] && SKILLS[eq[i]];
      const num = document.createElement('b');
      num.textContent = slot.n;
      b.appendChild(num);
      if (skill) {
        b.appendChild(icon(skill));
        const name = document.createElement('span');
        name.textContent = skill.name;
        b.appendChild(name);
        b.title = `Clear slot ${slot.n}`;
      } else {
        const name = document.createElement('span');
        name.textContent = 'Empty';
        b.appendChild(name);
      }
      const key = document.createElement('small');
      key.textContent = slot.key;
      b.appendChild(key);
      b.onclick = () => {
        if (dragId) return;
        if (eq[i]) {
          game.equipSkill(i, null);
          paint();
        }
      };
      b.addEventListener('dragover', (e) => {
        e.preventDefault();
        b.classList.add('over');
      });
      b.addEventListener('dragleave', () => b.classList.remove('over'));
      b.addEventListener('drop', (e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/plain').replace(/^skill:/, '');
        if (SKILLS[id]) game.equipSkill(i, id);
        dragId = null;
        paint();
      });
      bar.appendChild(b);
    });
    root.appendChild(bar);

    const actives = Object.values(SKILLS).filter((s) => pr.hasSkill(s.id) && s.kind !== 'passive');
    const passives = Object.values(SKILLS).filter((s) => pr.hasSkill(s.id) && s.kind === 'passive');
    root.appendChild(section(game, 'Spells', actives.filter((s) => s.classId === 'mage'), eq, paint, 'Spells are learned on the Mage path.', (id) => (dragId = id)));
    root.appendChild(section(game, 'Skills', actives.filter((s) => s.classId !== 'mage'), eq, paint, 'Warrior and Ranger arts show up here once you learn them.', (id) => (dragId = id)));

    const always = document.createElement('section');
    const h = document.createElement('h3');
    h.textContent = 'Always on';
    always.appendChild(h);
    if (!passives.length) {
      const p = document.createElement('p');
      p.className = 'book-empty';
      p.textContent = 'Passives turn on when you learn them. They do not take a slot.';
      always.appendChild(p);
    }
    const row = document.createElement('div');
    row.className = 'book-passives';
    for (const s of passives) {
      const card = document.createElement('div');
      card.className = 'book-passive';
      card.appendChild(icon(s));
      const info = document.createElement('div');
      const name = document.createElement('b');
      name.textContent = s.name;
      const desc = document.createElement('small');
      desc.textContent = s.desc;
      info.append(name, desc);
      card.appendChild(info);
      row.appendChild(card);
    }
    always.appendChild(row);
    root.appendChild(always);

    const tree = document.createElement('button');
    tree.type = 'button';
    tree.className = 'book-open';
    tree.textContent = 'Skill tree';
    tree.onclick = () => game.hud.openPanel('skills', game);
    root.appendChild(tree);
    body.appendChild(root);
  };
  paint();
  return () => {};
}

function section(game, title, list, eq, paint, emptyText, onDrag) {
  const sec = document.createElement('section');
  const h = document.createElement('h3');
  h.textContent = title;
  sec.appendChild(h);
  if (!list.length) {
    const p = document.createElement('p');
    p.className = 'book-empty';
    p.textContent = emptyText;
    sec.appendChild(p);
    return sec;
  }
  const grid = document.createElement('div');
  grid.className = 'book-list';
  for (const s of list) {
    const card = document.createElement('article');
    card.className = 'book-card';
    card.draggable = true;
    card.style.borderColor = s.color;
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', 'skill:' + s.id);
      e.dataTransfer.effectAllowed = 'copy';
      onDrag(s.id);
    });
    card.appendChild(icon(s));
    const info = document.createElement('div');
    const name = document.createElement('b');
    name.textContent = s.name;
    const meta = document.createElement('small');
    meta.textContent = `${resourceCost(game, s)} ${RESOURCE_NAME[s.res]} · ${s.cd}s`;
    const desc = document.createElement('p');
    desc.textContent = s.desc;
    const keys = document.createElement('div');
    keys.className = 'book-keys';
    BARS.forEach((slot, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'book-key' + (eq[i] === s.id ? ' on' : '');
      b.textContent = slot.n;
      b.title = eq[i] === s.id ? `Take off slot ${slot.n}` : `Place on slot ${slot.n} (${slot.key})`;
      b.onclick = () => {
        game.equipSkill(i, eq[i] === s.id ? null : s.id);
        paint();
      };
      keys.appendChild(b);
    });
    info.append(name, meta, desc, keys);
    card.appendChild(info);
    grid.appendChild(card);
  }
  sec.appendChild(grid);
  return sec;
}
