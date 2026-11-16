/**
 * Guild ledger screens. Every value is escaped. Charts are buttons, so a click becomes a filter.
 */

import {
  BANDS,
  CLASS_DEFS,
  GOLD_BUCKETS,
  PATHS,
  WINDOWS,
  ago,
  creatureName,
  formatCount,
} from '../../supabase/functions/_shared/ledger.js';

const RENDER_CAP = 200;

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

function realmName(id) {
  if (id === 'cave') return 'Darksycle Den';
  if (id === 'over') return 'Overworld';
  return '—';
}

function pct(n, max) {
  if (!max) return 0;
  return Math.max(0, Math.min(100, Math.round((n / max) * 100)));
}

function card(label, value, attrs, hint) {
  return `<button type="button" class="card" ${attrs}>
    <span>${esc(label)}</span>
    <b>${esc(formatCount(value))}</b>
    ${hint ? `<small>${esc(hint)}</small>` : ''}
  </button>`;
}

function barList(rows, valueKey, attr, active) {
  if (!rows.length || rows.every((row) => !row[valueKey])) {
    return '<p class="empty">Nothing in this slice.</p>';
  }
  const live = attr !== 'data-skill';
  const max = Math.max(...rows.map((row) => row[valueKey]));
  return `<div class="bars">${rows.map((row) => {
    const on = active && active === row.id ? ' on' : '';
    const style = ` style="--p:${pct(row[valueKey], max)}%"`;
    const inner = `<span>${esc(row.name || row.label)}</span><b>${esc(formatCount(row[valueKey]))}</b><i></i>`;
    if (!live) return `<div class="bar"${style}>${inner}</div>`;
    return `<button type="button" class="bar${on}" ${attr}="${esc(row.id)}"${style}>${inner}</button>`;
  }).join('')}</div>`;
}

function sheet(title, kicker, body) {
  return `<section class="sheet mg-frame">
    <header><span>${esc(kicker)}</span><h2>${esc(title)}</h2></header>
    ${body}
  </section>`;
}

export function windowsHtml(ui) {
  return WINDOWS.map((item) => {
    const on = ui.window === item.id ? ' on' : '';
    return `<button type="button" class="seg${on}" data-window="${esc(item.id)}">${esc(item.label)}</button>`;
  }).join('');
}

export function chipsHtml(ui) {
  const chips = [];
  if (ui.query) chips.push(['query', `“${ui.query}”`]);
  if (ui.classId) {
    const name = ui.classId === 'unsworn' ? 'Unsworn' : (CLASS_DEFS[ui.classId]?.name || ui.classId);
    chips.push(['class', name]);
  }
  if (ui.pathId) {
    const path = PATHS.find((item) => item.id === ui.pathId);
    chips.push(['path', path?.name || ui.pathId]);
  }
  if (ui.creature) chips.push(['creature', creatureName(ui.creature)]);
  if (ui.band) {
    const band = BANDS.find((item) => item.id === ui.band);
    chips.push(['band', `Lv ${band?.label || ui.band}`]);
  }
  if (ui.realm) chips.push(['realm', ui.realm === 'cave' ? 'Darksycle Den' : 'Overworld']);
  if (ui.bucket) {
    const purse = GOLD_BUCKETS.find((item) => item.id === ui.bucket);
    chips.push(['bucket', `Purse ${purse?.label || ui.bucket}`]);
  }
  if (!chips.length) return '';
  const items = chips.map(([key, label]) => (
    `<button type="button" class="chip" data-clear="${esc(key)}">${esc(label)} <b>×</b></button>`
  )).join('');
  return `${items}<button type="button" class="chip quiet" data-clear="all">Clear</button>`;
}

function sliceLine(model) {
  const total = formatCount(model.total);
  const noun = model.total === 1 ? 'account' : 'accounts';
  if (model.players.length === model.total) return `${total} ${noun} on the record`;
  return `Showing ${formatCount(model.players.length)} of ${total}`;
}

export function toolsNote(model) {
  return sliceLine(model);
}

function cards(model) {
  const pulse = model.pulse;
  return `<div class="cards">
    ${card('Accounts', pulse.accounts, 'data-tab="hunters"', `${formatCount(pulse.wallets)} wallet records`)}
    ${card('Hunters', pulse.hunters, 'data-tab="hunters"', `${formatCount(pulse.retired)} retired`)}
    ${card('Gold', pulse.gold, 'data-tab="coffers"', `median ${formatCount(pulse.median)}`)}
    ${card('Slain', pulse.kills, 'data-tab="bestiary"', `${formatCount(pulse.active.d7)} wrote in 7d`)}
    ${card('Wrote today', pulse.active.h24, 'data-window="1"', `${formatCount(pulse.active.d30)} in 30d`)}
    ${card('In slice', model.players.length, 'data-tab="hunters"', sliceLine(model))}
  </div>`;
}

function ledgerTab(model, ui) {
  const view = model.view;
  const latest = model.players.slice(0, 6);
  const maxActive = Math.max(1, ...view.activity.map((day) => day.active));
  const days = view.activity.map((day) => `<button type="button" class="day" title="${esc(`${day.month} ${day.label}: ${day.active} wrote, ${day.joined} new`)}">
      <u class="${day.active ? '' : 'flat'}" style="--p:${pct(day.active, maxActive)}%"></u>
      <span>${esc(day.label)}</span>
    </button>`).join('');
  const rows = latest.length
    ? latest.map((player) => `<button type="button" class="recent${player.id === model.selected?.id ? ' on' : ''}" data-player="${esc(player.id)}">
        <b>${esc(player.name)}</b>
        <span>${esc(player.className)}${player.pathName ? ` · ${esc(player.pathName)}` : ''}</span>
        <em>${esc(ago(player.updatedAt, model.now))}</em>
      </button>`).join('')
    : '<p class="empty">No hunts have been written to the guild record yet. Guest hunts stay on the device.</p>';
  return `${cards(model)}
    <div class="split">
      ${sheet('Paths', 'Characters', barList(view.classes, 'n', 'data-class', ui.classId))}
      ${sheet('Levels', 'Characters', barList(view.levels, 'n', 'data-band', ui.band))}
    </div>
    ${sheet('Last 14 days', 'Accounts that wrote', `<div class="days">${days}</div>`)}
    <div class="split">
      ${sheet('Realms', 'Where a hunter stands', barList(view.realms.filter((row) => row.n), 'n', 'data-realm', ui.realm))}
      ${sheet('Latest writing', 'Open a hunter', `<div class="recents">${rows}</div>`)}
    </div>`;
}

function sortHead(label, key, ui) {
  const on = ui.sort === key;
  const mark = on ? (ui.dir === 'asc' ? ' ↑' : ' ↓') : '';
  return `<th><button type="button" data-sort="${esc(key)}" aria-sort="${on ? (ui.dir === 'asc' ? 'ascending' : 'descending') : 'none'}">${esc(label)}${mark}</button></th>`;
}

function huntersTab(model, ui) {
  const rows = model.players.slice(0, RENDER_CAP);
  const body = rows.length
    ? rows.map((player) => `<tr class="${player.id === model.selected?.id ? 'on' : ''}" data-player="${esc(player.id)}">
        <td><b>${esc(player.name)}</b><small>${esc(player.sub)}</small></td>
        <td>${esc(player.className)}${player.pathName ? `<small>${esc(player.pathName)}</small>` : ''}</td>
        <td>${player.level ? esc(String(player.level)) : '—'}${player.rankLetter ? `<small>${esc(player.rankLetter)}</small>` : ''}</td>
        <td>${esc(formatCount(player.gold))}</td>
        <td>${esc(formatCount(player.kills))}</td>
        <td>${esc(ago(player.updatedAt, model.now))}</td>
      </tr>`).join('')
    : '<tr><td colspan="6" class="empty">No hunters in this slice.</td></tr>';
  const more = model.players.length > RENDER_CAP
    ? `<p class="more">Showing the first ${RENDER_CAP}. Narrow the slice to see the rest.</p>`
    : '';
  return `<div class="table-wrap mg-frame">
    <table>
      <thead><tr>
        ${sortHead('Hunter', 'name', ui)}
        ${sortHead('Path', 'class', ui)}
        ${sortHead('Lv', 'level', ui)}
        ${sortHead('Gold', 'gold', ui)}
        ${sortHead('Slain', 'kills', ui)}
        ${sortHead('Wrote', 'updated', ui)}
      </tr></thead>
      <tbody>${body}</tbody>
    </table>
  </div>${more}`;
}

function coffersTab(model, ui) {
  const view = model.view;
  const rich = [...model.players].sort((a, b) => b.gold - a.gold || a.name.localeCompare(b.name)).slice(0, 8);
  const rows = rich.length
    ? rich.map((player, index) => `<button type="button" class="recent" data-player="${esc(player.id)}">
        <em>${index + 1}</em>
        <b>${esc(player.name)}</b>
        <span>${esc(formatCount(player.gold))}</span>
      </button>`).join('')
    : '<p class="empty">No gold in this slice.</p>';
  return `<div class="cards">
      ${card('Gold in slice', view.gold, 'data-tab="coffers"', `${formatCount(view.accounts + view.wallets)} holders`)}
      ${card('Mean', view.mean, 'data-tab="coffers"', 'per account')}
      ${card('Median', view.median, 'data-tab="coffers"', 'per account')}
    </div>
    <div class="split">
      ${sheet('Purses', 'Accounts', barList(view.buckets, 'n', 'data-bucket', ui.bucket))}
      ${sheet('Heaviest purses', 'Open a hunter', `<div class="recents">${rows}</div>`)}
    </div>`;
}

function bestiaryTab(model, ui) {
  const rows = model.view.creatures;
  if (!rows.length) return sheet('Bestiary', 'Slain', '<p class="empty">No creatures have been slain in this slice.</p>');
  const max = Math.max(...rows.map((row) => row.kills));
  const list = rows.map((row) => {
    const on = ui.creature === row.id ? ' on' : '';
    return `<button type="button" class="beast${on}" data-creature="${esc(row.id)}" style="--p:${pct(row.kills, max)}%">
      <b>${esc(row.name)}</b>
      <span>${esc(formatCount(row.kills))} slain · ${esc(formatCount(row.hunters))} hunters</span>
      <i></i>
    </button>`;
  }).join('');
  return sheet('Bestiary', 'Click a creature to keep only its hunters', `<div class="beasts">${list}</div>`);
}

function pathsTab(model, ui) {
  const groups = ['warrior', 'ranger', 'mage'].map((classId) => {
    const paths = model.view.paths.filter((path) => path.classId === classId);
    const cls = CLASS_DEFS[classId];
    const items = paths.map((path) => {
      const on = ui.pathId === path.id ? ' on' : '';
      return `<button type="button" class="bar${on}" data-path="${esc(path.id)}" style="--p:${pct(path.n, Math.max(1, ...paths.map((item) => item.n)))}%">
        <span>${esc(path.name)}</span>
        <b>${esc(formatCount(path.n))}${path.n ? ` · ${esc(String(path.depth))}/5` : ''}</b>
        <i></i>
      </button>`;
    }).join('');
    return `<section class="sheet mg-frame" style="--ink:${esc(cls.color)}">
      <header><span>${esc(cls.name)}</span><h2>${esc(cls.name)}</h2></header>
      <div class="bars">${items}</div>
    </section>`;
  }).join('');
  const skills = sheet('Trades', 'Levels gained above 1', barList(
    model.view.skills.map((skill) => ({ ...skill, name: skill.name })),
    'gained',
    'data-skill',
    '',
  ));
  return `<div class="split paths">${groups}</div>${skills}`;
}

export function stageHtml(model, ui) {
  if (!model) return '<p class="empty">Opening the guild record…</p>';
  if (ui.tab === 'hunters') return huntersTab(model, ui);
  if (ui.tab === 'coffers') return coffersTab(model, ui);
  if (ui.tab === 'bestiary') return bestiaryTab(model, ui);
  if (ui.tab === 'paths') return pathsTab(model, ui);
  return ledgerTab(model, ui);
}

export function drawerHtml(model, ui) {
  const player = model?.selected;
  if (!player) return '';
  const roster = player.roster;
  const index = Math.max(0, Math.min(roster.length - 1, ui.char | 0));
  const character = roster[index];
  const tabs = roster.map((item, i) => (
    `<button type="button" class="char-tab${i === index ? ' on' : ''}" data-char="${i}">${esc(item.name)}</button>`
  )).join('');
  const body = character ? characterBody(character) : '<p class="empty">This account has not made a hunter.</p>';
  const retired = player.retired.length
    ? `<p class="retired">${player.retired.length} retired: ${esc(player.retired.map((item) => item.name).join(', '))}</p>`
    : '';
  return `<aside class="drawer mg-frame" aria-label="Hunter">
    <header>
      <div>
        <b>${esc(player.name)}</b>
        <small>${esc(player.sub)}</small>
      </div>
      <button type="button" class="icon" data-clear="player" aria-label="Close">×</button>
    </header>
    ${player.email ? `<button type="button" class="copy" data-copy="${esc(player.email)}">Copy email</button>` : ''}
    ${tabs ? `<div class="char-tabs">${tabs}</div>` : ''}
    ${body}
    ${retired}
  </aside>`;
}

function characterBody(character) {
  const skills = character.skills.map((skill) => (
    `<div class="skill" title="${esc(skill.name)} ${skill.level}"><span>${esc(skill.name)}</span><b>${skill.level}</b><i style="--p:${pct(skill.level, 99)}%"></i></div>`
  )).join('');
  const slain = character.slain.slice(0, 8).map((row) => (
    `<li><span>${esc(row.name)}</span><b>${esc(formatCount(row.n))}</b></li>`
  )).join('');
  const path = character.pathName ? `${character.pathName} ${character.pathDepth}/5` : 'No path yet';
  return `<dl class="facts">
      <div><dt>Path</dt><dd>${esc(character.className)} · ${esc(path)}</dd></div>
      <div><dt>Level</dt><dd>${character.level} · rank ${esc(character.rankLetter)}</dd></div>
      <div><dt>Gold</dt><dd>${esc(formatCount(character.gold))}</dd></div>
      <div><dt>Slain</dt><dd>${esc(formatCount(character.kills))}</dd></div>
      <div><dt>Realm</dt><dd>${esc(realmName(character.realm))}</dd></div>
      ${character.quest ? `<div><dt>Quest</dt><dd>${esc(character.quest)}</dd></div>` : ''}
    </dl>
    <h3>Trades</h3>
    <div class="skills">${skills}</div>
    <h3>Slain</h3>
    ${slain ? `<ul class="slain">${slain}</ul>` : '<p class="empty">Nothing slain.</p>'}`;
}

export function leadIndex(player) {
  if (!player?.roster?.length) return 0;
  let best = 0;
  player.roster.forEach((character, index) => {
    const lead = player.roster[best];
    if (character.level > lead.level || (character.level === lead.level && character.kills > lead.kills)) best = index;
  });
  return best;
}
