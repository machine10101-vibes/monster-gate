import { GOODS, SHAFT_LOGS, SHAFTS_PER_LOG } from '../data/gathering.js';
import { flushThumbs, renderThumb } from './catalog.js';

/** Copper and tin become iron bars. Nothing else is smelted here. */
export function mountSmithy(body, game) {
  const paint = () => {
    body.innerHTML = '';
    const pr = game.progress;
    const intro = document.createElement('p');
    intro.className = 'alc-intro';
    intro.innerHTML = '<b>The Smithy</b>One copper ore and one tin ore make an iron bar. Bring the bars to Bram when you want armor, weapons or arrowheads.';
    body.appendChild(intro);
    const row = document.createElement('div');
    row.className = 'smith-stock';
    for (const id of ['copper_ore', 'tin_ore', 'iron_bar']) {
      const cell = document.createElement('div');
      cell.appendChild(renderThumb({ kind: 'good', id }, 96));
      const lab = document.createElement('span');
      lab.textContent = `${GOODS[id].name}  ${pr.good(id)}`;
      cell.appendChild(lab);
      row.appendChild(cell);
    }
    body.appendChild(row);
    const can = Math.min(pr.good('copper_ore'), pr.good('tin_ore'));
    const acts = document.createElement('div');
    acts.className = 'smith-acts';
    const one = document.createElement('button');
    one.type = 'button';
    one.className = 'cat-btn' + (can >= 1 ? ' go' : '');
    one.textContent = 'Smelt 1 iron bar';
    one.disabled = can < 1;
    one.onclick = () => {
      const n = pr.smeltBars(false);
      if (!n) return;
      game.audio.quest();
      game.hud.toast('Smelted an iron bar', 1400);
      spark(game);
      paint();
    };
    const all = document.createElement('button');
    all.type = 'button';
    all.className = 'cat-btn' + (can >= 1 ? ' go' : '');
    all.textContent = can > 1 ? `Smelt all (${can})` : 'Smelt all';
    all.disabled = can < 1;
    all.onclick = () => {
      const n = pr.smeltBars(true);
      if (!n) return;
      game.audio.quest();
      game.hud.toast(`Smelted ${n} iron bar${n === 1 ? '' : 's'}`, 1600);
      spark(game);
      paint();
    };
    acts.append(one, all);
    body.appendChild(acts);
    if (!can) {
      const note = document.createElement('p');
      note.className = 'cat-muted';
      note.textContent = 'Mine copper and tin in the Greyrock Pit, east of town.';
      body.appendChild(note);
    }
    flushThumbs(200);
  };
  paint();
  return () => {};
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
    intro.innerHTML = `<b>Carving knife</b>One log becomes ${SHAFTS_PER_LOG} arrow shafts. Head them at Bram's forge.`;
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
      info.innerHTML = `<b>${GOODS[id].name}</b><span>${n} in the bag · ${n * SHAFTS_PER_LOG} shafts</span>`;
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
      note.textContent = 'No logs in the bag. Birch, oak and maple all carve the same.';
      body.appendChild(note);
    }
    const have = document.createElement('p');
    have.className = 'alc-gold';
    have.textContent = `Arrow shafts: ${pr.good('arrow_shaft')}`;
    body.appendChild(have);
    flushThumbs(200);
  };
  const carve = (id, all) => {
    const n = game.progress.carveShafts(id, all);
    if (!n) return;
    game.audio.quest();
    game.hud.toast(`Carved ${n} arrow shafts`, 1600);
    paint();
  };
  paint();
  return () => {};
}
