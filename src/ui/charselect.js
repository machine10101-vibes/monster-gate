import { CLASS_LIST, CLASSES } from '../data/skills.js';
import {
  DEFAULT_LOOK,
  HAIR_COLORS,
  HAIR_STYLES,
  MAX_CHARACTERS,
  RANK_LETTERS,
  SKINS,
  TUNICS,
  cleanName,
  nameProblem,
} from '../systems/roster.js';
import { CampStage } from '../world/camp.js';
import { shortAddress } from '../wallet/klever.js';

const hex = (n) => '#' + n.toString(16).padStart(6, '0');
const $ = (id) => document.getElementById(id);

const LOOK_ROWS = [
  { key: 'skin', label: 'Skin', list: SKINS, swatch: true },
  { key: 'style', label: 'Hair', list: HAIR_STYLES, text: (v) => v.name },
  { key: 'hair', label: 'Hair colour', list: HAIR_COLORS, swatch: true },
  { key: 'tunic', label: 'Tunic', list: TUNICS, swatch: true },
  { key: 'beard', label: 'Beard', toggle: true },
];

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

/** The screen between signing in and entering the world: the camp, the lineup and the character list. */
export class CharacterSelect {
  constructor(game) {
    this.game = game;
    this.stage = null;
    this.active = false;
    this.mode = 'list';
    this.selectedId = null;
    this.filter = '';
    this.collapsed = {};
    this.info = new Map();
    this.draft = null;
    this.hourWas = null;
    this.noteTimer = 0;
    this.plates = new Map();
    this.root = $('charselect');
    this.bind();
  }

  get roster() {
    return this.game.roster;
  }

  /* ------------------------------- open / close ------------------------------- */

  open() {
    const g = this.game;
    if (!this.roster || !this.root) return;
    this.stage ??= new CampStage(g);
    $('title')?.classList.add('hidden');
    this.root.classList.remove('hidden');
    document.body.classList.add('selecting');
    this.active = true;
    g.hud?.clearPlates?.();
    if (this.hourWas == null) this.hourWas = g.sky.hour;
    g.sky.setHour(18.4);
    try {
      this.stage.show();
      $('cs-account').textContent = g.wallet?.email || shortAddress(g.wallet?.address || '');
      g.paintCloudStatus?.();
      this.filter = '';
      $('cs-search').value = '';
      this.refresh();
    } catch (err) {
      this.note(err?.message || 'The camp could not be opened.', true, true);
      throw err;
    } finally {
      if (this.active) g.parkWorld?.();
    }
  }

  close() {
    const g = this.game;
    g.unparkWorld?.();
    g.hud?.clearPlates?.();
    this.active = false;
    this.root?.classList.add('hidden');
    document.body.classList.remove('selecting');
    this.stage?.hide();
    this.clearPlates();
    $('cs-confirm')?.classList.add('hidden');
    if (this.hourWas != null) {
      g.sky.setHour(this.hourWas);
      this.hourWas = null;
    }
  }

  /* --------------------------------- data views --------------------------------- */

  refresh(selectId = null) {
    const roster = this.roster;
    this.info.clear();
    for (const c of roster.chars) this.info.set(c.id, roster.summary(c.id));
    if (!roster.chars.length) {
      this.showForm();
      return;
    }
    this.mode = 'list';
    $('cs-form').classList.add('hidden');
    $('cs-panel').classList.remove('hidden');
    $('cs-enter-wrap').classList.remove('hidden');
    $('cs-toggle').classList.remove('hidden');
    this.root.classList.remove('creating');
    const want = selectId || (roster.get(this.selectedId) ? this.selectedId : roster.last);
    this.selectedId = roster.get(want) ? want : roster.chars[0].id;
    this.stage.setLineup(roster.chars.map((char) => ({ char, info: this.info.get(char.id) })), this.selectedId);
    this.buildPlates();
    this.renderList();
    this.syncChrome();
  }

  select(id, scroll = true) {
    if (this.mode !== 'list' || !this.roster.get(id)) return;
    this.selectedId = id;
    this.roster.setLast(id);
    this.stage.select(id);
    this.syncChrome();
    this.renderList(scroll);
  }

  syncChrome() {
    const c = this.roster.get(this.selectedId);
    const listMode = this.mode === 'list';
    $('cs-name').textContent = c?.name || '';
    $('cs-enter').disabled = !c || !listMode;
    $('cs-delete').disabled = !c;
    $('cs-restore').disabled = !this.roster.canRestore();
    $('cs-create').disabled = this.roster.full;
    $('cs-create').title = this.roster.full ? `This account holds ${MAX_CHARACTERS} characters.` : '';
    $('cs-rotate').classList.toggle('hidden', !c && listMode);
    for (const [id, p] of this.plates) p.classList.toggle('selected', id === this.selectedId);
  }

  renderList(scroll = false) {
    const list = $('cs-list');
    const q = this.filter.trim().toLowerCase();
    const keep = list.scrollTop;
    list.replaceChildren();
    const chars = this.roster.chars.filter((c) => {
      if (!q) return true;
      const i = this.info.get(c.id);
      return c.name.toLowerCase().includes(q) || (i?.className || '').toLowerCase().includes(q);
    });
    const favs = chars.filter((c) => c.fav);
    const rest = chars.filter((c) => !c.fav);
    const group = (key, title, items) => {
      const head = el('button', 'cs-group' + (this.collapsed[key] ? ' closed' : ''));
      head.type = 'button';
      head.append(el('i', 'cs-caret'), el('span', null, title), el('em', null, String(items.length)));
      head.addEventListener('click', () => {
        this.collapsed[key] = !this.collapsed[key];
        this.renderList();
      });
      list.append(head);
      if (this.collapsed[key]) return;
      for (const c of items) list.append(this.row(c));
    };
    if (favs.length) group('fav', 'Favorites', favs);
    if (rest.length || !favs.length) group('all', 'Characters', rest);
    if (!chars.length && q) list.append(el('p', 'cs-empty', 'No hunter matches that search.'));
    list.scrollTop = keep;
    if (scroll) list.querySelector('.cs-row.selected')?.scrollIntoView({ block: 'nearest' });
  }

  row(c) {
    const i = this.info.get(c.id);
    const row = el('div', 'cs-row' + (c.id === this.selectedId ? ' selected' : ''));
    row.setAttribute('role', 'option');
    row.setAttribute('aria-selected', String(c.id === this.selectedId));
    row.tabIndex = 0;
    row.dataset.id = c.id;
    const emblem = el('span', 'cs-emblem', (i.className || '?').charAt(0));
    emblem.style.setProperty('--c', i.color);
    const text = el('span', 'cs-info');
    const lv = el('span', 'cs-lv', `Level ${i.level} `);
    const cls = el('i', null, i.className);
    cls.style.color = i.color;
    lv.append(cls);
    const sub = el('small', null, `Rank ${RANK_LETTERS[i.rank]} · ${i.realm === 'cave' ? 'Darksycle Den' : 'Oakhollow'}`);
    text.append(el('b', null, c.name), lv, sub);
    const star = el('span', 'cs-star' + (c.fav ? ' on' : ''));
    star.setAttribute('role', 'button');
    star.setAttribute('aria-label', c.fav ? 'Remove from favorites' : 'Add to favorites');
    star.addEventListener('click', (e) => {
      e.stopPropagation();
      this.roster.setFav(c.id, !c.fav);
      this.game.pushRoster();
      this.renderList();
    });
    const rank = el('span', 'cs-rank', RANK_LETTERS[i.rank]);
    row.append(emblem, text, star, rank);
    row.addEventListener('click', () => this.select(c.id, false));
    row.addEventListener('dblclick', () => this.enter());
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.select(c.id, false);
      }
    });
    return row;
  }

  /* --------------------------------- nameplates --------------------------------- */

  clearPlates() {
    for (const p of this.plates.values()) p.remove();
    this.plates.clear();
  }

  buildPlates() {
    this.clearPlates();
    const host = $('cs-plates');
    for (const c of this.roster.chars) {
      const i = this.info.get(c.id);
      const p = el('button', 'cs-plate' + (c.id === this.selectedId ? ' selected' : ''));
      p.type = 'button';
      p.tabIndex = -1;
      p.append(el('b', null, c.name), el('span', null, `Level ${i.level}`));
      p.addEventListener('click', () => this.select(c.id));
      p.style.display = 'none';
      host.append(p);
      this.plates.set(c.id, p);
    }
  }

  place(node, pos, dx = 0) {
    if (!node) return;
    if (!pos || !pos[2]) {
      node.style.display = 'none';
      return;
    }
    node.style.display = '';
    node.style.left = Math.round(pos[0] + dx) + 'px';
    node.style.top = Math.round(pos[1]) + 'px';
  }

  update(dt, t) {
    if (!this.active || !this.stage) return;
    this.stage.update(dt, t);
    this.stage.placeCamera(dt);
    if (this.mode === 'list') {
      for (const [id, p] of this.plates) this.place(p, this.stage.screenAt(id, 2.3));
      this.place($('cs-rotate'), this.stage.screenAt(this.selectedId, 0.05));
    } else if (this.stage.preview) {
      const p = this.plates.get('preview');
      if (p) this.place(p, this.stage.screenAt('preview', 2.45));
      this.place($('cs-rotate'), this.stage.screenAt('preview', 0.05));
    }
  }

  /* ----------------------------------- actions ----------------------------------- */

  note(text, bad = false, hold = false) {
    let n = $('cs-note');
    if (!n) {
      n = el('div', 'cs-note');
      n.id = 'cs-note';
      this.root.append(n);
    }
    n.textContent = text;
    n.classList.toggle('bad', bad);
    n.classList.add('show');
    clearTimeout(this.noteTimer);
    if (!hold) this.noteTimer = setTimeout(() => n.classList.remove('show'), 2800);
  }

  enter() {
    if (!this.active || this.mode !== 'list') return;
    const c = this.roster.get(this.selectedId);
    if (c) this.game.enterWorld(c);
  }

  back() {
    if (this.mode === 'create' && this.roster.chars.length) {
      this.hideForm();
      return;
    }
    this.game.leaveCharacterSelect();
  }

  askDelete() {
    const c = this.roster.get(this.selectedId);
    if (!c) return;
    const text = $('cs-confirm-text');
    text.replaceChildren('Delete ', el('b', null, c.name), '? You can bring this character back with the restore button for 30 days.');
    $('cs-confirm').classList.remove('hidden');
    $('cs-confirm-no').focus();
    this.pendingDelete = c.id;
  }

  doDelete() {
    const id = this.pendingDelete;
    this.pendingDelete = null;
    $('cs-confirm').classList.add('hidden');
    const c = this.roster.get(id);
    if (!c || !this.roster.remove(id)) return;
    this.game.pushRoster();
    this.note(`${c.name} was deleted.`);
    this.refresh();
  }

  doRestore() {
    const c = this.roster.restore();
    if (!c) {
      this.note(this.roster.full ? `This account holds ${MAX_CHARACTERS} characters.` : 'Nothing to restore.', true);
      return;
    }
    this.game.pushRoster();
    this.note(`${c.name} was restored.`);
    this.refresh(c.id);
  }

  /* ---------------------------------- creation ---------------------------------- */

  showForm() {
    this.mode = 'create';
    this.root.classList.add('creating');
    $('cs-panel').classList.add('hidden');
    $('cs-form').classList.remove('hidden');
    $('cs-enter-wrap').classList.add('hidden');
    $('cs-toggle').classList.add('hidden');
    this.clearPlates();
    this.draft = { look: { ...DEFAULT_LOOK }, classId: CLASS_LIST[0].id };
    $('cs-name-input').value = '';
    $('cs-form-error').textContent = '';
    $('cs-form-cancel').textContent = this.roster.chars.length ? 'Cancel' : 'Back';
    this.buildClasses();
    this.buildLooks();
    this.stage.setPreview(this.draft.look, {}, 'blade');
    const host = $('cs-plates');
    const p = el('button', 'cs-plate selected');
    p.type = 'button';
    p.tabIndex = -1;
    p.append(el('b', null, 'New Hunter'), el('span', null, 'Level 1'));
    host.append(p);
    this.plates.set('preview', p);
    $('cs-rotate').classList.remove('hidden');
    this.syncChrome();
    if (!matchMedia('(pointer: coarse)').matches) $('cs-name-input').focus();
  }

  hideForm() {
    this.stage.endPreview();
    this.refresh();
  }

  buildClasses() {
    const host = $('cs-classes');
    host.replaceChildren();
    for (const def of CLASS_LIST) {
      const b = el('button', 'cs-class' + (def.id === this.draft.classId ? ' on' : ''));
      b.type = 'button';
      b.dataset.id = def.id;
      b.style.setProperty('--c', def.color);
      b.append(el('span', 'cs-emblem', def.name.charAt(0)), el('b', null, def.name));
      b.addEventListener('click', () => {
        this.draft.classId = def.id;
        this.buildClasses();
      });
      host.append(b);
    }
    const def = CLASSES[this.draft.classId];
    $('cs-class-blurb').textContent = def.blurb;
  }

  buildLooks() {
    const host = $('cs-looks');
    host.replaceChildren();
    const rnd = el('button', 'cs-random', 'Randomize');
    rnd.type = 'button';
    rnd.addEventListener('click', () => {
      const pick = (n) => Math.floor(Math.random() * n);
      this.draft.look = { skin: pick(SKINS.length), hair: pick(HAIR_COLORS.length), style: pick(HAIR_STYLES.length), tunic: pick(TUNICS.length), beard: Math.random() < 0.35 };
      this.buildLooks();
      this.redraw();
    });
    host.append(rnd);
    for (const row of LOOK_ROWS) {
      const line = el('div', 'cs-opt');
      line.append(el('span', null, row.label));
      const prev = el('button', 'cs-step', '‹');
      const next = el('button', 'cs-step', '›');
      prev.type = next.type = 'button';
      prev.setAttribute('aria-label', `Previous ${row.label}`);
      next.setAttribute('aria-label', `Next ${row.label}`);
      const value = el('i', 'cs-val');
      const paint = () => {
        const v = this.draft.look[row.key];
        if (row.toggle) value.textContent = v ? 'Yes' : 'None';
        else if (row.swatch) {
          value.textContent = '';
          value.style.background = hex(row.list[v]);
          value.classList.add('swatch');
        } else value.textContent = row.text(row.list[v]);
      };
      const step = (d) => {
        const look = this.draft.look;
        if (row.toggle) look.beard = !look.beard;
        else look[row.key] = (look[row.key] + d + row.list.length) % row.list.length;
        paint();
        this.redraw();
      };
      prev.addEventListener('click', () => step(-1));
      next.addEventListener('click', () => step(1));
      paint();
      line.append(prev, value, next);
      host.append(line);
    }
  }

  redraw() {
    this.stage.setPreview(this.draft.look, {}, 'blade');
  }

  onName() {
    const input = $('cs-name-input');
    const name = cleanName(input.value);
    const plate = this.plates.get('preview');
    if (plate) plate.querySelector('b').textContent = name || 'New Hunter';
    $('cs-form-error').textContent = '';
  }

  submitForm(event) {
    event.preventDefault();
    const name = $('cs-name-input').value;
    const problem = nameProblem(name, this.roster);
    if (problem) {
      $('cs-form-error').textContent = problem;
      $('cs-name-input').focus();
      return;
    }
    try {
      const c = this.roster.create({ name, look: this.draft.look, classId: this.draft.classId });
      this.stage.endPreview();
      this.game.pushRoster();
      this.refresh(c.id);
      this.note(`${c.name} joins the guild.`);
    } catch (err) {
      $('cs-form-error').textContent = err.message || 'That character could not be made.';
    }
  }

  /* ---------------------------------- wiring ---------------------------------- */

  bind() {
    if (!this.root) return;
    $('cs-enter').addEventListener('click', () => this.enter());
    $('cs-back').addEventListener('click', () => this.back());
    $('cs-create').addEventListener('click', () => this.showForm());
    $('cs-delete').addEventListener('click', () => this.askDelete());
    $('cs-restore').addEventListener('click', () => this.doRestore());
    $('cs-confirm-no').addEventListener('click', () => $('cs-confirm').classList.add('hidden'));
    $('cs-confirm-yes').addEventListener('click', () => this.doDelete());
    $('cs-form').addEventListener('submit', (e) => this.submitForm(e));
    $('cs-form-cancel').addEventListener('click', () => this.back());
    $('cs-name-input').addEventListener('input', () => this.onName());
    $('cs-search').addEventListener('input', (e) => {
      this.filter = e.target.value;
      this.renderList();
    });
    $('cs-list-toggle').addEventListener('click', () => {
      const off = this.root.classList.toggle('list-off');
      $('cs-list-toggle').setAttribute('aria-pressed', String(!off));
    });

    for (const [id, dir] of [['cs-rot-left', -1], ['cs-rot-right', 1]]) {
      const b = $(id);
      const stop = () => this.spin(0);
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        b.setPointerCapture?.(e.pointerId);
        this.spin(dir);
      });
      b.addEventListener('pointerup', stop);
      b.addEventListener('pointercancel', stop);
      b.addEventListener('lostpointercapture', stop);
    }

    const stage = $('cs-stage');
    let drag = null;
    stage.addEventListener('pointerdown', (e) => {
      drag = { x: e.clientX, y: e.clientY, last: e.clientX, moved: 0 };
      stage.setPointerCapture?.(e.pointerId);
    });
    stage.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.last;
      drag.last = e.clientX;
      drag.moved += Math.abs(dx);
      if (drag.moved > 8) this.turn(dx * 0.012);
    });
    const end = (e) => {
      if (!drag) return;
      const tap = drag.moved <= 8;
      drag = null;
      if (tap && this.mode === 'list') {
        const id = this.stage.pick(e.clientX, e.clientY);
        if (id) this.select(id);
      }
    };
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', () => (drag = null));

    window.addEventListener('keydown', (e) => {
      if (!this.active) return;
      const typing = e.target?.closest?.('input, textarea');
      if (e.key === 'Escape') {
        if (!$('cs-confirm').classList.contains('hidden')) $('cs-confirm').classList.add('hidden');
        else if (this.mode === 'create') this.back();
        else return;
        e.preventDefault();
        return;
      }
      if (typing || this.mode !== 'list' || !$('cs-confirm').classList.contains('hidden')) return;
      if (e.key === 'Enter') {
        if (e.target?.closest?.('button, .cs-row')) return;
        e.preventDefault();
        this.enter();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const ids = this.roster.chars.map((c) => c.id);
        const at = ids.indexOf(this.selectedId);
        const next = ids[(at + (e.key === 'ArrowRight' ? 1 : -1) + ids.length) % ids.length];
        if (next) this.select(next);
        e.preventDefault();
      }
    });
  }

  spin(dir) {
    if (this.mode === 'create') {
      if (this.stage.preview) this.stage.preview.spinV = dir * 2.4;
    } else this.stage?.spinSelected(dir);
  }

  turn(rad) {
    if (this.mode === 'create') {
      if (this.stage.preview) this.stage.preview.spin += rad;
    } else this.stage?.nudgeSelected(rad);
  }
}
