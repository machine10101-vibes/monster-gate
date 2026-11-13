import { MONSTERS } from '../data/catalog.js';
import { QUESTS, questById } from '../data/quests.js';

const RANKS = ['F', 'E', 'D', 'C', 'B', 'A', 'S'];

const TABS = [
  { id: 'quests', label: 'Quests' },
  { id: 'challenges', label: 'Challenges' },
  { id: 'beasts', label: 'Beasts' },
  { id: 'activity', label: 'Activity' },
];

function el(tag, className, html) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (html != null) n.innerHTML = html;
  return n;
}

function lockText(q, journal) {
  const missing = q.requires.filter((id) => !journal.row(id)?.done).map((id) => questById(id)?.name || id);
  return missing.length ? `Requires ${missing.join(' and ')}.` : '';
}

function banner() {
  return `
    <div class="qj-banner" aria-hidden="false">
      <svg class="qj-art" viewBox="0 0 960 140" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="qj-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#16365c"/>
            <stop offset="0.45" stop-color="#3e7398"/>
            <stop offset="0.78" stop-color="#e0a15a"/>
            <stop offset="1" stop-color="#f2d39a"/>
          </linearGradient>
        </defs>
        <rect width="960" height="140" fill="url(#qj-sky)"/>
        <circle cx="820" cy="28" r="14" fill="#fff1c2"/>
        <circle cx="826" cy="26" r="12" fill="#16365c" opacity="0.15"/>
        <path d="M0 96 L80 58 L140 84 L230 40 L310 86 L400 34 L490 80 L580 46 L680 88 L790 42 L880 78 L960 50 L960 140 L0 140 Z" fill="#35506e"/>
        <path d="M210 40 L250 40 L236 22 L224 22 Z M390 34 L430 34 L416 16 L404 16 Z" fill="#e8eef4"/>
        <path d="M0 112 L120 78 L210 108 L320 70 L430 112 L540 74 L660 110 L780 80 L900 108 L960 90 L960 140 L0 140 Z" fill="#1d3a2a"/>
        <path d="M40 140 L70 78 L100 140 Z M120 140 L142 96 L164 140 Z M250 140 L286 70 L322 140 Z M700 140 L734 82 L768 140 Z M860 140 L888 100 L916 140 Z" fill="#10261a"/>
        <path d="M430 140 L470 92 L510 140 Z" fill="#3a2c22"/>
        <path d="M448 92 h24 l-4 -28 h-16 z" fill="#6a5344"/>
        <path d="M452 70 h16 v22 h-16 z" fill="#c9a0ff"/>
        <path d="M444 70 h32 l-4 -10 h-24 z" fill="#8d6a48"/>
        <path d="M470 118 v22" stroke="#d7b56a" stroke-width="3"/>
        <circle cx="470" cy="116" r="3" fill="#ffe7a0"/>
      </svg>
      <div class="qj-banner-shade"></div>
      <div class="qj-brand">
        <i class="qj-compass" aria-hidden="true"></i>
        <b>ADVENTURES</b>
      </div>
      <button type="button" class="qj-info" title="How the journal works">i</button>
    </div>`;
}

export function mountJournal(body, game) {
  const journal = game.journal;
  const state = {
    tab: 'quests',
    sort: 'series',
    beastSort: 'name',
    locked: true,
    done: false,
    quests: true,
    minis: true,
    unknown: true,
    known: true,
    selected: null,
    overview: false,
    detail: false,
  };

  const root = el('div', 'qj');
  body.appendChild(root);

  const pickDefault = () => {
    const rows = visibleQuests();
    const active = rows.find((q) => journal.status(q.id) === 'active');
    return (active || rows[0])?.id || null;
  };

  const visibleQuests = () => {
    let rows = QUESTS.filter((q) => {
      const st = journal.status(q.id);
      if (st === 'locked' && !state.locked) return false;
      if (st === 'done' && !state.done) return false;
      if (q.kind === 'quest' && !state.quests) return false;
      if (q.kind === 'miniquest' && !state.minis) return false;
      return true;
    });
    if (state.sort === 'name') rows = [...rows].sort((a, b) => a.name.localeCompare(b.name));
    else if (state.sort === 'points') rows = [...rows].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
    else if (state.sort === 'progress') {
      const rank = { active: 0, available: 1, done: 2, locked: 3 };
      rows = [...rows].sort((a, b) => rank[journal.status(a.id)] - rank[journal.status(b.id)] || a.name.localeCompare(b.name));
    }
    return rows;
  };

  const paint = () => {
    const narrow = window.matchMedia('(max-width: 800px)').matches;
    if (state.tab === 'quests') {
      const rows = visibleQuests();
      if (!rows.some((q) => q.id === state.selected)) {
        const active = rows.find((q) => journal.status(q.id) === 'active');
        state.selected = (active || rows[0])?.id || null;
      }
      if (state.selected && (!narrow || state.detail)) journal.seeQuest(state.selected);
    }
    if (state.tab === 'challenges') journal.seeChallenges();
    const unseen = journal.unseenQuests();
    const challengeNew = journal.state.challengeNew || 0;
    root.innerHTML = banner();
    root.querySelector('.qj-info').addEventListener('click', () => {
      game.hud.toast('Quests record the story. Challenges are the guild board. Beasts are what you have met.', 3200);
    });

    const tabs = el('div', 'qj-tabs');
    for (const tab of TABS) {
      const b = el('button', 'qj-tab' + (state.tab === tab.id ? ' on' : ''), tab.label);
      b.type = 'button';
      const badge = tab.id === 'quests' ? unseen : tab.id === 'challenges' ? challengeNew : 0;
      if (badge) {
        const n = el('i', 'qj-badge', String(badge));
        b.appendChild(n);
      }
      b.addEventListener('click', () => {
        state.tab = tab.id;
        state.detail = false;
        state.overview = false;
        if (tab.id === 'challenges') journal.seeChallenges();
        paint();
      });
      tabs.appendChild(b);
    }
    root.appendChild(tabs);

    const bodyRow = el('div', 'qj-body' + (state.detail ? ' detail-open' : ''));
    bodyRow.appendChild(side());
    bodyRow.appendChild(main());
    root.appendChild(bodyRow);
    for (const c of ['nw', 'ne', 'sw', 'se']) root.appendChild(el('i', 'qj-corner ' + c));

    const log = root.querySelector('.qj-log');
    if (log) log.scrollTop = state.overview ? 0 : log.scrollHeight;
  };

  const side = () => {
    const box = el('aside', 'qj-side');
    const head = el('div', 'qj-side-h');
    head.appendChild(el('i', 'qj-mini-compass'));
    head.appendChild(el('b', '', state.tab === 'beasts' ? 'BEASTS' : state.tab === 'activity' ? 'LOG' : state.tab === 'challenges' ? 'BOARD' : 'QUESTS'));
    box.appendChild(head);

    if (state.tab === 'quests' || state.tab === 'beasts') {
      const sortKey = state.tab === 'beasts' ? 'beastSort' : 'sort';
      const sorts = state.tab === 'beasts'
        ? [['name', 'Name'], ['level', 'Level']]
        : [['series', 'Series'], ['name', 'Name'], ['progress', 'Progress'], ['points', 'Points']];
      const label = el('label', 'qj-sort');
      const sel = document.createElement('select');
      for (const [id, name] of sorts) {
        const o = document.createElement('option');
        o.value = id;
        o.textContent = name;
        if (state[sortKey] === id) o.selected = true;
        sel.appendChild(o);
      }
      sel.addEventListener('change', () => {
        state[sortKey] = sel.value;
        paint();
      });
      label.appendChild(sel);
      box.appendChild(label);

      const filters = el('div', 'qj-filters');
      const checks = state.tab === 'beasts'
        ? [['unknown', 'Show unknown'], ['known', 'Show discovered']]
        : [['locked', 'Show locked'], ['done', 'Show completed'], ['quests', 'Show quests'], ['minis', 'Show miniquests']];
      for (const [key, text] of checks) {
        const row = el('label', 'qj-check');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = !!state[key];
        input.addEventListener('change', () => {
          state[key] = input.checked;
          paint();
        });
        row.appendChild(input);
        row.appendChild(document.createTextNode(text));
        filters.appendChild(row);
      }
      box.appendChild(filters);
    }

    const list = el('div', 'qj-list');
    if (state.tab === 'quests') fillQuests(list);
    else if (state.tab === 'beasts') fillBeasts(list);
    else if (state.tab === 'challenges') fillSimple(list, challengeRows());
    else fillSimple(list, game.journal.state.activity.map((a, i) => ({ id: 'a' + i, name: a.title, sub: a.text.slice(0, 42) })));
    box.appendChild(list);

    if (state.tab === 'quests') {
      const pts = journal.points();
      box.appendChild(el('div', 'qj-points', `Quest Points: ${pts.n} / ${pts.total}`));
    } else if (state.tab === 'beasts') {
      const known = MONSTERS.filter((m) => game.progress.seen(m.id)).length;
      box.appendChild(el('div', 'qj-points', `Beasts met: ${known} / ${MONSTERS.length}`));
    } else if (state.tab === 'challenges') {
      const left = game.bounties?.remainingClaims?.() ?? 6;
      box.appendChild(el('div', 'qj-points', `Rank ${RANKS[game.rank] || 'F'} · ${left} claims left this hour`));
    } else {
      box.appendChild(el('div', 'qj-points', `${game.journal.state.activity.length} entries`));
    }
    return box;
  };

  const fillQuests = (list) => {
    const rows = visibleQuests();
    if (!rows.some((q) => q.id === state.selected)) state.selected = pickDefault();
    let series = '';
    if (!rows.length) {
      list.appendChild(el('p', 'qj-empty', 'Nothing matches these filters.'));
      return;
    }
    for (const q of rows) {
      if (state.sort === 'series' && q.series !== series) {
        series = q.series;
        list.appendChild(el('div', 'qj-series', series));
      }
      const st = journal.status(q.id);
      const btn = el('button', `qj-item ${st}` + (state.selected === q.id ? ' on' : ''));
      btn.type = 'button';
      const mark = q.kind === 'miniquest' ? 'mini' : 'quest';
      btn.innerHTML = `<i class="qj-gem ${mark}"></i><span><b>${q.name}</b><small>${q.series}</small></span>`;
      if (journal.row(q.id)?.unseen) btn.appendChild(el('em', 'qj-dot'));
      btn.addEventListener('click', () => {
        state.selected = q.id;
        state.detail = true;
        state.overview = false;
        journal.seeQuest(q.id);
        paint();
      });
      list.appendChild(btn);
    }
  };

  const fillBeasts = (list) => {
    let rows = MONSTERS.filter((m) => {
      const known = game.progress.seen(m.id);
      if (known && !state.known) return false;
      if (!known && !state.unknown) return false;
      return true;
    });
    rows = [...rows].sort((a, b) => state.beastSort === 'level' ? a.level - b.level || a.name.localeCompare(b.name) : a.name.localeCompare(b.name));
    if (!rows.some((m) => m.id === state.selected)) state.selected = rows[0]?.id || null;
    if (!rows.length) {
      list.appendChild(el('p', 'qj-empty', 'No beasts match these filters.'));
      return;
    }
    for (const m of rows) {
      const known = game.progress.seen(m.id);
      const btn = el('button', 'qj-item ' + (known ? 'done' : 'locked') + (state.selected === m.id ? ' on' : ''));
      btn.type = 'button';
      btn.innerHTML = `<i class="qj-gem beast"></i><span><b>${known ? m.name : '???'}</b><small>${known ? 'Level ' + m.level : 'Not met'}</small></span>`;
      btn.addEventListener('click', () => {
        state.selected = m.id;
        state.detail = true;
        paint();
      });
      list.appendChild(btn);
    }
  };

  const fillSimple = (list, rows) => {
    if (!rows.length) {
      list.appendChild(el('p', 'qj-empty', 'Nothing has been written here yet.'));
      state.selected = null;
      return;
    }
    if (!rows.some((r) => r.id === state.selected)) state.selected = rows[0].id;
    for (const r of rows) {
      const btn = el('button', 'qj-item active' + (state.selected === r.id ? ' on' : ''));
      btn.type = 'button';
      btn.innerHTML = `<i class="qj-gem quest"></i><span><b>${r.name}</b><small>${r.sub}</small></span>`;
      btn.addEventListener('click', () => {
        state.selected = r.id;
        state.detail = true;
        paint();
      });
      list.appendChild(btn);
    }
  };

  const main = () => {
    const pane = el('section', 'qj-main');
    const back = el('button', 'qj-back', '‹ Back');
    back.type = 'button';
    back.addEventListener('click', () => {
      state.detail = false;
      paint();
    });
    pane.appendChild(back);

    if (state.tab === 'quests') questDetail(pane);
    else if (state.tab === 'beasts') beastDetail(pane);
    else if (state.tab === 'challenges') challengeDetail(pane);
    else activityDetail(pane);
    return pane;
  };

  const footer = (pane, onPrev, onNext, actionLabel, onAction) => {
    const foot = el('div', 'qj-foot');
    const prev = el('button', 'qj-arrow', '‹');
    const next = el('button', 'qj-arrow', '›');
    prev.type = 'button';
    next.type = 'button';
    prev.addEventListener('click', onPrev);
    next.addEventListener('click', onNext);
    const go = el('button', 'qj-action', actionLabel);
    go.type = 'button';
    go.addEventListener('click', onAction);
    foot.append(prev, next, go);
    pane.appendChild(foot);
  };

  const shift = (dir, ids) => {
    const i = Math.max(0, ids.indexOf(state.selected));
    const n = ids.length;
    if (!n) return;
    state.selected = ids[(i + dir + n) % n];
    state.overview = false;
    if (state.tab === 'quests') journal.seeQuest(state.selected);
    paint();
  };

  const questDetail = (pane) => {
    const rows = visibleQuests();
    const q = questById(state.selected) || rows[0];
    if (!q) {
      pane.appendChild(el('h3', 'qj-title', 'QUESTS'));
      pane.appendChild(el('div', 'qj-log', '<p>No quests to show. Change the filters.</p>'));
      return;
    }
    state.selected = q.id;
    const st = journal.status(q.id);
    const head = el('div', 'qj-title-row');
    head.appendChild(el('h3', 'qj-title', q.name));
    pane.appendChild(head);
    const log = el('div', 'qj-log' + (state.overview || st === 'available' ? ' overview' : ' story'));
    if (state.overview || st === 'available') {
      log.appendChild(el('p', '', `<b>Series.</b> ${q.series}`));
      log.appendChild(el('p', '', `<b>From.</b> ${q.giver}`));
      log.appendChild(el('p', '', q.blurb));
      if (q.requires.length) {
        log.appendChild(el('p', '', `<b>Requires.</b> ${q.requires.map((id) => questById(id)?.name).join(', ')}`));
      }
      const obj = journal.objective(q.id);
      log.appendChild(el('p', '', `<b>Now.</b> ${st === 'done' ? 'Complete.' : obj ? obj.text : 'Locked.'}`));
      log.appendChild(el('p', '', `<b>Reward.</b> ${q.points} quest point${q.points === 1 ? '' : 's'} and ${q.reward.gold} gold.`));
      if (st === 'locked') log.appendChild(el('p', 'qj-lock', lockText(q, journal)));
    } else if (st === 'locked') {
      log.appendChild(el('p', '', q.blurb));
      log.appendChild(el('p', 'qj-lock', lockText(q, journal)));
    } else {
      const pages = journal.row(q.id)?.pages || [];
      for (const page of pages) log.appendChild(el('p', '', page));
      const obj = journal.objective(q.id);
      if (obj) log.appendChild(el('p', 'qj-now', obj.text + (obj.total > 1 ? ` (${obj.n}/${obj.total})` : '')));
      if (st === 'done') log.appendChild(el('p', 'qj-complete', 'QUEST COMPLETE!'));
    }
    pane.appendChild(log);
    const ids = rows.map((r) => r.id);
    footer(
      pane,
      () => shift(-1, ids),
      () => shift(1, ids),
      state.overview ? 'READ JOURNAL' : 'QUEST OVERVIEW',
      () => {
        state.overview = !state.overview;
        paint();
      },
    );
  };

  const beastDetail = (pane) => {
    const rows = MONSTERS.filter((m) => {
      const known = game.progress.seen(m.id);
      if (known && !state.known) return false;
      if (!known && !state.unknown) return false;
      return true;
    });
    const m = MONSTERS.find((b) => b.id === state.selected) || rows[0];
    if (!m) {
      pane.appendChild(el('h3', 'qj-title', 'BEASTS'));
      pane.appendChild(el('div', 'qj-log', '<p>No beasts match these filters.</p>'));
      return;
    }
    const known = game.progress.seen(m.id);
    pane.appendChild(el('h3', 'qj-title', known ? m.name : 'UNKNOWN'));
    const log = el('div', 'qj-log story');
    if (!known) {
      log.appendChild(el('p', '', 'You have not met this creature. The catalog stays shut until you do.'));
    } else {
      log.appendChild(el('p', '', m.desc));
      log.appendChild(el('p', '', `<b>Temper.</b> ${m.temper}. <b>Style.</b> ${m.style}.`));
      log.appendChild(el('p', '', `<b>Where.</b> ${m.habitat}`));
      log.appendChild(el('p', '', `<b>Slain.</b> ${game.progress.kills(m.id)}.`));
    }
    pane.appendChild(log);
    const ids = rows.map((r) => r.id);
    footer(pane, () => shift(-1, ids), () => shift(1, ids), 'BEAST LORE', () => {
      state.overview = !state.overview;
      paint();
    });
  };

  const challengeRows = () => {
    const rows = [{ id: 'board', name: 'Guild Hunt', sub: 'Repeating rank hunt' }];
    const slots = game.bounties?.slots?.() || [];
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      const got = game.bounties.progressOf(s);
      rows.push({
        id: 'b' + i,
        name: s.claimed ? `${s.label} (paid)` : s.label,
        sub: s.claimed ? 'Turned in' : `${s.kind === 'kill' ? 'Slay' : 'Gather'} ${got}/${s.need}`,
      });
    }
    return rows;
  };

  const fmtWait = (ms) => {
    const s = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m ? `${m}m ${r}s` : `${r}s`;
  };

  const challengeDetail = (pane) => {
    const sel = String(state.selected || 'board');
    if (/^b\d+$/.test(sel)) {
      const i = Number(sel.slice(1));
      const slot = game.bounties?.slot(i);
      pane.appendChild(el('h3', 'qj-title', slot ? slot.label.toUpperCase() : 'BOUNTY'));
      const log = el('div', 'qj-log story');
      if (!slot) {
        log.appendChild(el('p', '', 'That posting fell off the board.'));
      } else {
        const got = game.bounties.progressOf(slot);
        const kind = slot.kind === 'kill' ? 'Hunt' : 'Gather';
        log.appendChild(el('p', '', `${kind}. ${slot.claimed ? 'Paid.' : `${got} / ${slot.need}`}.`));
        log.appendChild(el('p', '', `<b>Pay.</b> ${slot.gold} gold and ${slot.xp} ${slot.skill} XP.`));
        log.appendChild(el('p', '', 'Counts start when the posting is pinned. Old stacks in the bag do not count. Six turn-ins an hour.'));
        if (!slot.claimed) {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'qj-action qj-bounty-go';
          const ready = game.bounties.ready(slot);
          const cap = (game.bounties.remainingClaims() | 0) <= 0;
          b.textContent = cap ? 'Hourly cap' : ready ? 'Turn in' : 'Not yet';
          b.disabled = !ready || cap;
          b.addEventListener('click', () => {
            if (game.claimBounty(i)) paint();
          });
          log.appendChild(b);
        }
      }
      pane.appendChild(log);
      footer(pane, () => {}, () => {}, 'BOARD', () => {
        state.selected = 'board';
        paint();
      });
      return;
    }
    pane.appendChild(el('h3', 'qj-title', 'GUILD BOARD'));
    const log = el('div', 'qj-log story');
    const q = game.quest;
    const wait = game.bounties?.msUntilRotate?.() || 0;
    const left = game.bounties?.remainingClaims?.() ?? 6;
    log.appendChild(el('p', '', 'The board in the guild hall does not close. Mira pins three bounties that rotate, plus the old rank hunt. Chickens are still not on it.'));
    log.appendChild(el('p', '', `<b>Rank.</b> ${RANKS[game.rank] || 'F'}. <b>Claims left this hour.</b> ${left}. <b>New postings in</b> ${fmtWait(wait)}.`));
    log.appendChild(el('p', 'qj-now', `${q.text} (${q.n}/${q.total})`));
    log.appendChild(el('p', '', 'Gold waits at the end of the rank count. Bounties pay coins and skill XP. Story quests in the other tab are separate.'));
    pane.appendChild(log);
    footer(pane, () => {}, () => {}, 'QUESTS', () => {
      state.tab = 'quests';
      state.detail = false;
      paint();
    });
  };

  const activityDetail = (pane) => {
    const items = game.journal.state.activity;
    const idx = Number(String(state.selected || '').replace('a', ''));
    const entry = items[idx] || items[0];
    pane.appendChild(el('h3', 'qj-title', entry ? entry.title : 'ACTIVITY'));
    const log = el('div', 'qj-log story');
    log.appendChild(el('p', '', entry ? entry.text : 'The log is empty. Talk to Mira, or walk north.'));
    pane.appendChild(log);
    const ids = items.map((_, i) => 'a' + i);
    footer(pane, () => shift(-1, ids), () => shift(1, ids), 'QUESTS', () => {
      state.tab = 'quests';
      state.detail = false;
      paint();
    });
  };

  paint();
  game.hud.journalRefresh = paint;
  return () => {
    if (game.hud.journalRefresh === paint) game.hud.journalRefresh = null;
  };
}
