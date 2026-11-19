import { GOODS, SHAFT_FROM_LOG, SHAFT_IDS, SHAFT_LOGS, SHAFTS_PER_LOG, SMELTS } from '../data/gathering.js';
import { METALS } from '../data/metals.js';
import { flushThumbs, renderThumb } from './catalog.js';

const STOCK = [...METALS.filter((m) => m.ore).map((m) => m.oreId), 'coal', ...METALS.map((m) => m.barId)];

/** Ore and coal become bars here. Each recipe wants a Smithing level. */
export function mountSmithy(body, game) {
  const paint = () => {
    body.innerHTML = '';
    const pr = game.progress;
    const intro = document.createElement('p');
    intro.className = 'alc-intro';
    intro.innerHTML = `<b>The Smithy</b>Copper, iron, mithril, adamite, titanium and platinum smelt into bars. Steel is iron ore plus coal. Smithing ${pr.level('smithing')} opens the next metal.`;
    body.appendChild(intro);
    const row = document.createElement('div');
    row.className = 'smith-stock';
    for (const id of STOCK) {
      const cell = document.createElement('div');
      cell.appendChild(renderThumb({ kind: 'good', id }, 96));
      const lab = document.createElement('span');
      lab.textContent = `${GOODS[id].name}  ${pr.good(id)}`;
      cell.appendChild(lab);
      row.appendChild(cell);
    }
    body.appendChild(row);
    for (const rec of Object.values(SMELTS)) {
      const lock = pr.smeltLocked(rec.id);
      const can = pr.smeltCan(rec.id);
      const acts = document.createElement('div');
      acts.className = 'smith-acts';
      const one = document.createElement('button');
      one.type = 'button';
      one.className = 'cat-btn' + (can >= 1 ? ' go' : '');
      one.textContent = `Smelt 1 ${rec.name.toLowerCase()}`;
      one.disabled = can < 1;
      one.onclick = () => {
        const before = pr.level('smithing');
        const n = pr.smelt(rec.id, false);
        if (!n) return;
        pingSmith(game, rec, n, before);
        paint();
      };
      const all = document.createElement('button');
      all.type = 'button';
      all.className = 'cat-btn' + (can >= 1 ? ' go' : '');
      all.textContent = can > 1 ? `Smelt all (${can})` : 'Smelt all';
      all.disabled = can < 1;
      all.onclick = () => {
        const before = pr.level('smithing');
        const n = pr.smelt(rec.id, true);
        if (!n) return;
        pingSmith(game, rec, n, before);
        paint();
      };
      acts.append(one, all);
      body.appendChild(acts);
      if (lock === `smith:${rec.level}`) {
        const note = document.createElement('p');
        note.className = 'cat-muted';
        note.textContent = `Need Smithing ${rec.level}. ${rec.hint}`;
        body.appendChild(note);
      } else if (!can) {
        const note = document.createElement('p');
        note.className = 'cat-muted';
        note.textContent = rec.hint;
        body.appendChild(note);
      }
    }
    flushThumbs(200);
  };
  paint();
  return () => {};
}

function pingSmith(game, rec, n, before) {
  game.audio.quest();
  game.hud.toast(`Smelted ${n === 1 ? 'a' : n} ${rec.name.toLowerCase()}${n === 1 ? '' : 's'}`, 1400);
  const after = game.progress.level('smithing');
  if (after > before) game.gather?.levelUp('smithing', after);
  spark(game);
}

function spark(game) {
  const s = game.world.smithy;
  if (!s) return;
  game.fx.burst(s.x, s.y + 1.3, s.z, [0xff8a1e, 0xffd27a, 0xffffff], 18, 3.2, 0.08, 0.8, 5, 2);
}

/** The carving knife shaves any log into arrow shafts. */
export function mountCarve(body, game) {
  const paint = () => {
    body.innerHTML = '';
    const pr = game.progress;
    const intro = document.createElement('p');
    intro.className = 'alc-intro';
    intro.innerHTML = `<b>Carving knife</b>One log becomes ${SHAFTS_PER_LOG} shafts of that wood. Fletch them with a feather and an arrowhead at Bram's forge.`;
    body.appendChild(intro);
    let any = false;
    for (const id of SHAFT_LOGS) {
      const n = pr.good(id);
      if (!n) continue;
      any = true;
      const row = document.createElement('div');
      row.className = 'alc-row';
      const holder = document.createElement('div');
      holder.className = 'mk-thumb';
      holder.appendChild(renderThumb({ kind: 'good', id }, 96));
      row.appendChild(holder);
      const info = document.createElement('div');
      info.className = 'alc-info';
      const shaft = GOODS[SHAFT_FROM_LOG[id]];
      info.innerHTML = `<b>${GOODS[id].name}</b><span>${n} in the bag · ${n * SHAFTS_PER_LOG} ${shaft.name.toLowerCase()}s</span>`;
      row.appendChild(info);
      const col = document.createElement('div');
      col.className = 'smith-acts';
      const one = document.createElement('button');
      one.type = 'button';
      one.className = 'cat-btn go';
      one.textContent = `Carve ${SHAFTS_PER_LOG}`;
      one.onclick = () => carve(id, false);
      const all = document.createElement('button');
      all.type = 'button';
      all.className = 'cat-btn go';
      all.textContent = 'Carve all';
      all.onclick = () => carve(id, true);
      col.append(one, all);
      row.appendChild(col);
      body.appendChild(row);
    }
    if (!any) {
      const note = document.createElement('p');
      note.className = 'cat-muted';
      note.textContent = 'No logs in the bag. Any log you chop shaves into shafts of that wood.';
      body.appendChild(note);
    }
    const have = document.createElement('p');
    have.className = 'alc-gold';
    have.textContent = [...SHAFT_IDS.map((id) => `${GOODS[id].name}s ${pr.good(id)}`), `Feathers ${pr.good('feather')}`].join(' · ');
    body.appendChild(have);
    flushThumbs(200);
  };
  const carve = (id, all) => {
    const n = game.progress.carveShafts(id, all);
    if (!n) return;
    game.audio.quest();
    game.hud.toast(`Carved ${n} ${GOODS[SHAFT_FROM_LOG[id]].name.toLowerCase()}s`, 1600);
    paint();
  };
  paint();
  return () => {};
}
