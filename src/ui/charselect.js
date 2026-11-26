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
  canEditRoster,
} from '../systems/roster.js';
import { CampStage } from '../world/camp.js';
import { shortAddress } from '../wallet/klever.js';
import { readAccount } from '../wallet/account.js';
import { linkKleverWallet, linkedWalletStatus } from '../wallet/link.js';

const hex = (n) => '#' + n.toString(16).padStart(6, '0');
const $ = (id) => document.getElementById(id);

const LOOK_ROWS = [
  { key: 'skin', label: 'Skin', list: SKINS, swatch: true },
  { key: 'style', label: 'Hair', list: HAIR_STYLES, text: (v) => v.name },
  { key: 'hair', label: 'Hair colour', list: HAIR_COLORS, swatch: true },
  { key: 'tunic', label: 'Tunic', list: TUNICS, swatch: true },
  { key: 'beard', label: 'Beard', toggle: true },
];

/** Suggested names for the dice button. Each passes the roster's name rules. */
const NAME_IDEAS = [
  'Aldric', 'Brynn', 'Corvin', 'Dagny', 'Edrin', 'Fenna', 'Garrick', 'Hilde', 'Ivo', 'Jora',
  'Kael', 'Liora', 'Magnus', 'Nyra', 'Orin', 'Petra', 'Quill', 'Rowan', 'Sable', 'Torvin',
  'Ulla', 'Varek', 'Wren', 'Yara', 'Zane', 'Bram', 'Elka', 'Thane', 'Mira', 'Rook',
  'Astrid', 'Cassian', 'Dorin', 'Isolde', 'Lucan', 'Maren', 'Osric', 'Rhea', 'Soren', 'Talia',
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
    this.worldsOpen = false;
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
    g.sky.setHour(16.7);
    g.sky.camp = true;
    try {
      this.stage.show();
      $('cs-account').textContent = g.wallet?.kind === 'guest'
        ? 'Playing as guest'
        : (g.wallet?.email || shortAddress(g.wallet?.address || ''));
      this.paintWalletLink();
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

  paintWalletLink() {
    const button = $('cs-wallet-connect');
    const status = $('cs-wallet-status');
    if (!button || !status) return;
    const session = readAccount();
    const eligible = !!(session?.kind === 'email' && session.userId);
    button.classList.toggle('hidden', !eligible);
    status.textContent = '';
    button.disabled = false;
    button.textContent = session?.kleverAddress ? 'Klever Wallet Connected' : 'Connect Klever Wallet';
    if (!eligible) return;
    linkedWalletStatus(session).then((result) => {
      if (!this.active) return;
      if (result.address) {
        session.kleverAddress = result.address;
        button.textContent = 'Klever Wallet Connected';
      } else {
        button.textContent = 'Connect Klever Wallet';
      }
    }).catch(() => {});
  }

  async connectKlever() {
    const button = $('cs-wallet-connect');
    const status = $('cs-wallet-status');
    const session = readAccount();
    if (!button || !session?.userId) {
      if (status) status.textContent = 'Please sign in with email first.';
      return;
    }
    button.disabled = true;
    status.textContent = 'Confirm the connection in Klever Wallet…';
    try {
      await linkKleverWallet(session);
      status.textContent = 'Klever wallet connected.';
      this.paintWalletLink();
    } catch (error) {
      status.textContent = error?.message || 'The wallet could not be connected.';
      button.disabled = false;
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
    this.hideWorldMenu();
    g.sky.camp = false;
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
    const canEdit = canEditRoster({ kind: this.game.wallet?.kind, cloudState: this.game.cloudState });
    const syncError = $('cs-sync-error');
    if (syncError) syncError.hidden = canEdit;
    if (!roster.chars.length) {
      this.root?.classList.remove('single-character');
      if (!canEdit) {
        this.mode = 'list';
        this.selectedId = null;
        $('cs-form').classList.add('hidden');
        $('cs-panel').classList.remove('hidden');
        $('cs-search').classList.add('hidden');
        $('cs-list').classList.add('hidden');
        $('cs-panel').querySelector('.cs-foot')?.classList.add('hidden');
        $('cs-enter-wrap').classList.add('hidden');
        $('cs-toggle').classList.add('hidden');
        this.root.classList.remove('creating');
        return;
      }
      this.showForm();
      return;
    }
    $('cs-search').classList.remove('hidden');
    $('cs-list').classList.remove('hidden');
    $('cs-panel').querySelector('.cs-foot')?.classList.remove('hidden');
    this.mode = 'list';
    this.root?.classList.toggle('single-character', roster.chars.length === 1);
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
    const canEnter = !!c && listMode;
    const choose = $('cs-choose-world');
    const solo = $('cs-play-solo');
    if (choose) choose.disabled = !canEnter;
    if (solo) solo.disabled = !canEnter;
    $('cs-delete').disabled = !c;
    $('cs-restore').disabled = !this.roster.canRestore();
    const canEdit = canEditRoster({ kind: this.game.wallet?.kind, cloudState: this.game.cloudState });
    $('cs-create').disabled = this.roster.full || !canEdit;
    $('cs-delete').disabled = !c || !canEdit;
    $('cs-restore').disabled = !this.roster.canRestore() || !canEdit;
    $('cs-create').title = !canEdit
      ? 'Account sync is unavailable. Retry account sync before changing characters.'
      : (this.roster.full ? `This account holds ${MAX_CHARACTERS} characters.` : '');
    $('cs-rotate').classList.toggle('hidden', !c && listMode);
    for (const [id, p] of this.plates) p.classList.toggle('selected', id === this.selectedId || id === 'preview');
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
      this.frameAt = (this.frameAt || 0) - dt;
      if (this.frameAt <= 0) {
        this.frameAt = 0.25;
        this.stage.frame = this.measureFrame();
      }
      const p = this.plates.get('preview');
      if (p) this.place(p, this.stage.screenAt('preview', 2.45));
      this.place($('cs-rotate'), this.stage.screenAt('preview', 0.05));
    }
  }

  /* ----------------------------------- actions ----------------------------------- */

  async retryAccountSync() {
    const button = $('cs-sync-retry');
    const session = readAccount();
    if (!button || !session || this.game.cloudSyncing) return;
    button.disabled = true;
    button.textContent = 'Retrying…';
    try {
      await this.game.applyWallet(session);
    } catch (error) {
      this.note(error?.message || 'Account sync failed. Your saved characters have not been changed.', true, true);
    } finally {
      button.disabled = false;
      button.textContent = 'Retry account sync';
    }
  }

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
    this.playSolo();
  }

  playSolo() {
    this.hideWorldMenu();
    if (!this.active || this.mode !== 'list') return;
    const c = this.roster.get(this.selectedId);
    if (!c) return;
    if (typeof this.game.enterSoloHunt === 'function') this.game.enterSoloHunt(c);
    else this.game.enterWorld(c);
  }

  chooseWorld() {
    if (!this.active || this.mode !== 'list' || !this.roster.get(this.selectedId)) return;
    this.worldsOpen = true;
    const root = $('cs-worlds');
    if (!root) return;
    root.classList.remove('hidden');
    root.hidden = false;
    this.game.refreshWorldHealth?.();
    this.paintWorldMenu();
  }

  hideWorldMenu() {
    this.worldsOpen = false;
    const root = $('cs-worlds');
    if (!root) return;
    root.classList.add('hidden');
    root.hidden = true;
  }

  paintWorldMenu() {
    const btn = $('cs-world-1');
    const status = $('cs-world-1-status');
    const ready = this.game.worldOneReady?.() !== false;
    if (btn) btn.disabled = !ready;
    if (status) status.textContent = ready ? (this.game.worldHealth?.label || 'Checking…') : 'Coming soon';
  }

  pickWorld1() {
    if (!this.worldsOpen || $('cs-world-1')?.disabled) return;
    const c = this.roster.get(this.selectedId);
    if (c) this.game.enterWorldOneHunt?.(c);
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
    if (!canEditRoster({ kind: this.game.wallet?.kind, cloudState: this.game.cloudState })) return;
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
    if (!canEditRoster({ kind: this.game.wallet?.kind, cloudState: this.game.cloudState })) return;
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
    if (!canEditRoster({ kind: this.game.wallet?.kind, cloudState: this.game.cloudState })) {
      this.note('Your saved characters could not be loaded. Retry account sync before creating a character.', true, true);
      return;
    }
    this.mode = 'create';
    this.root.classList.add('creating');
    $('cs-panel').classList.add('hidden');
    $('cs-form').classList.remove('hidden', 'minimized');
    this.toggleFormMinimized(false);
    $('cs-enter-wrap').classList.add('hidden');
    $('cs-toggle').classList.add('hidden');
    this.clearPlates();
    this.draft = { look: { ...DEFAULT_LOOK }, classId: null };
    this.setTab('class');
    this.frameAt = 0;
    $('cs-name-input').value = '';
    $('cs-form-error').textContent = '';
    $('cs-form-cancel').textContent = this.roster.chars.length ? 'Cancel' : 'Back';
    this.stage.setPreview(this.draft.look, {}, 'blade');
    const host = $('cs-plates');
    const p = el('button', 'cs-plate selected');
    p.type = 'button';
    p.tabIndex = -1;
    p.append(el('b', null, 'New Hunter'), el('span', null, 'Level 1'));
    host.append(p);
    this.plates.set('preview', p);
    this.buildClasses();
    this.buildLooks();
    $('cs-rotate').classList.remove('hidden');
    this.syncChrome();
    if (!matchMedia('(pointer: coarse)').matches) $('cs-name-input').focus();
  }

  toggleFormMinimized(force) {
    const form = $('cs-form');
    if (!form || this.mode !== 'create') return;
    const minimized = typeof force === 'boolean' ? force : !form.classList.contains('minimized');
    form.classList.toggle('minimized', minimized);
    const button = $('cs-form-minimize');
    if (button) {
      button.setAttribute('aria-expanded', String(!minimized));
      button.setAttribute('aria-label', minimized ? 'Expand character creation' : 'Minimize character creation');
      button.textContent = minimized ? '＋' : '−';
    }
  }

  hideForm() {
    this.stage.frame = null;
    this.stage.endPreview();
    this.refresh();
  }

  buildClasses() {
    const host = $('cs-classes');
    host.replaceChildren();
    for (const def of CLASS_LIST) {
      const on = def.id === this.draft.classId;
      const b = el('button', 'cs-class' + (on ? ' on' : ''));
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.type = 'button';
      b.dataset.id = def.id;
      b.style.setProperty('--c', def.color);
      const paths = def.paths.map((p) => p.name);
      const text = el('span', 'cs-class-text');
      const tags = el('span', 'cs-class-paths');
      for (const name of paths) tags.append(el('i', null, name));
      text.append(el('b', null, def.name), tags);
      b.append(el('span', 'cs-emblem', def.name.charAt(0)), text);
      b.title = `${def.name}. ${paths.join(', ')}.`;
      b.addEventListener('click', () => {
        this.draft.classId = def.id;
        this.buildClasses();
      });
      host.append(b);
    }
    const def = CLASSES[this.draft.classId];
    const blurb = $('cs-class-blurb');
    blurb.textContent = def?.blurb || 'Choose a class to determine this hunter’s starting path.';
    blurb.style.setProperty('--c', def?.color || 'var(--rs-gold)');
    this.paintClassDetail(def);
    const plate = this.plates.get('preview');
    if (plate) plate.querySelector('span').textContent = def ? `Level 1 ${def.name}` : 'Level 1';
  }

  /** What the chosen class plays like: its resource, weapon masteries, and each path's signature skills. */
  paintClassDetail(def) {
    const host = $('cs-class-detail');
    if (!host) return;
    host.replaceChildren();
    if (!def) return;
    host.style.setProperty('--c', def.color);
    const facts = el('dl', 'cs-class-facts');
    const fact = (label, text) => {
      const row = el('div');
      row.append(el('dt', null, label), el('dd', null, text));
      facts.append(row);
    };
    const res = String(def.resource || '');
    if (res) fact('Resource', res.charAt(0).toUpperCase() + res.slice(1));
    if (def.weapons?.length) fact('Masteries', def.weapons.map((w) => w.name).join(' · '));
    host.append(facts);
    const list = el('ul', 'cs-path-list');
    for (const path of def.paths) {
      const li = el('li');
      const name = el('b', null, path.name);
      if (path.color) name.style.color = path.color;
      const skills = (path.skills || []).slice(0, 2).map((k) => k.name).join(', ');
      li.append(name, el('span', null, skills));
      list.append(li);
    }
    host.append(list);
  }

  buildLooks() {
    const host = $('cs-looks');
    host.replaceChildren();
    const rnd = el('button', 'cs-random', 'Randomize look');
    rnd.type = 'button';
    rnd.addEventListener('click', () => {
      const pick = (n) => Math.floor(Math.random() * n);
      this.draft.look = { skin: pick(SKINS.length), hair: pick(HAIR_COLORS.length), style: pick(HAIR_STYLES.length), tunic: pick(TUNICS.length), beard: Math.random() < 0.35 };
      this.buildLooks();
      this.redraw();
    });
    for (const row of LOOK_ROWS) {
      const line = el('div', 'cs-opt');
      line.append(el('span', 'cs-opt-label', row.label));
      const picks = el('div', row.swatch ? 'cs-swatches' : 'cs-chips');
      picks.setAttribute('role', 'radiogroup');
      picks.setAttribute('aria-label', row.label);
      const choices = row.toggle
        ? [{ value: false, label: 'None' }, { value: true, label: 'Beard' }]
        : row.list.map((v, i) => ({ value: i, label: row.swatch ? `${row.label} ${i + 1}` : row.text(v), color: row.swatch ? hex(v) : null }));
      const buttons = [];
      const paint = () => {
        const cur = this.draft.look[row.key];
        for (const { b, value } of buttons) {
          const on = row.toggle ? !!cur === value : cur === value;
          b.classList.toggle('on', on);
          b.setAttribute('aria-checked', String(on));
        }
      };
      for (const c of choices) {
        const b = el('button', row.swatch ? 'cs-sw' : 'cs-chip', row.swatch ? null : c.label);
        b.type = 'button';
        b.setAttribute('role', 'radio');
        b.setAttribute('aria-label', c.label);
        if (c.color) b.style.setProperty('--sw', c.color);
        b.addEventListener('click', () => {
          this.draft.look[row.key] = c.value;
          paint();
          this.redraw();
        });
        buttons.push({ b, value: c.value });
        picks.append(b);
      }
      paint();
      line.append(picks);
      host.append(line);
    }
    host.append(rnd);
  }

  setTab(tab) {
    const form = $('cs-form');
    if (!form) return;
    form.dataset.tab = tab;
    for (const b of form.querySelectorAll('.cs-tab')) {
      const on = b.dataset.tab === tab;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', String(on));
    }
  }

  rollName() {
    const input = $('cs-name-input');
    const taken = (n) => !!nameProblem(n, this.roster);
    const open = NAME_IDEAS.filter((n) => !taken(n) && n !== input.value);
    if (!open.length) return;
    input.value = open[Math.floor(Math.random() * open.length)];
    this.onName();
  }

  /** The part of the screen the panels leave open, so the camera can stand the hunter there. */
  measureFrame() {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const f = { l: 0, t: 0, r: W, b: H, W, H };
    const top = this.root.querySelector('.cs-top');
    const blocks = [top, ...this.root.querySelectorAll('#cs-form .cs-sec, #cs-form .cs-name-block, #cs-form .cs-form-foot, #cs-form .cs-form-title, #cs-form .cs-tabs')];
    const form = $('cs-form');
    if (form && getComputedStyle(form).display !== 'grid') blocks.push(form);
    for (const node of blocks) {
      if (!node || node.offsetParent === null) continue;
      const r = node.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      const cx = (r.left + r.right) / 2;
      if (r.width < W * 0.6 && cx < W / 3) f.l = Math.max(f.l, r.right);
      else if (r.width < W * 0.6 && cx > (W * 2) / 3) f.r = Math.min(f.r, r.left);
      else if (r.bottom <= H * 0.35) f.t = Math.max(f.t, r.bottom);
      else f.b = Math.min(f.b, r.top);
    }
    if (f.r - f.l < 120 || f.b - f.t < 120) return { l: 0, t: 0, r: W, b: H, W, H };
    return f;
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
    if (!canEditRoster({ kind: this.game.wallet?.kind, cloudState: this.game.cloudState })) {
      $('cs-form-error').textContent = 'Account sync is unavailable. Your characters are safe; retry sync before creating.';
      return;
    }
    if (!this.draft?.classId || !CLASSES[this.draft.classId]) {
      $('cs-form-error').textContent = 'Choose a class before creating your character.';
      this.setTab('class');
      $('cs-classes')?.querySelector('.cs-class')?.focus();
      return;
    }
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
    $('cs-play-solo')?.addEventListener('click', () => this.playSolo());
    $('cs-choose-world')?.addEventListener('click', () => this.chooseWorld());
    $('cs-world-1')?.addEventListener('click', () => this.pickWorld1());
    $('cs-worlds-back')?.addEventListener('click', () => this.hideWorldMenu());
    $('cs-worlds')?.addEventListener('click', (e) => {
      if (e.target === $('cs-worlds')) this.hideWorldMenu();
    });
    $('cs-wallet-connect').addEventListener('click', () => this.connectKlever());
    $('cs-back').addEventListener('click', () => this.back());
    $('cs-create').addEventListener('click', () => this.showForm());
    $('cs-sync-retry')?.addEventListener('click', () => this.retryAccountSync());
    $('cs-delete').addEventListener('click', () => this.askDelete());
    $('cs-restore').addEventListener('click', () => this.doRestore());
    $('cs-confirm-no').addEventListener('click', () => $('cs-confirm').classList.add('hidden'));
    $('cs-confirm-yes').addEventListener('click', () => this.doDelete());
    $('cs-form-minimize')?.addEventListener('click', () => this.toggleFormMinimized());
    $('cs-form').addEventListener('submit', (e) => this.submitForm(e));
    $('cs-form-cancel').addEventListener('click', () => this.back());
    $('cs-name-input').addEventListener('input', () => this.onName());
    $('cs-name-roll')?.addEventListener('click', () => this.rollName());
    for (const b of this.root.querySelectorAll('#cs-form .cs-tab')) b.addEventListener('click', () => this.setTab(b.dataset.tab));
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

    const zoomRoot = this.root;
    let pinchStart = null;
    let pinching = false;
    const touchDistance = (touches) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.hypot(dx, dy);
    };
    zoomRoot.addEventListener('touchstart', (e) => {
      if (!this.active || this.mode !== 'create' || e.touches.length !== 2) return;
      e.preventDefault();
      pinchStart = { distance: touchDistance(e.touches), zoom: this.stage?.createZoom || 1 };
      pinching = true;
      drag = null;
    }, { passive: false });
    zoomRoot.addEventListener('touchmove', (e) => {
      if (!pinchStart || e.touches.length !== 2 || this.mode !== 'create') return;
      e.preventDefault();
      const distance = touchDistance(e.touches);
      if (distance > 0) this.stage.setCreateZoom(pinchStart.zoom * pinchStart.distance / distance);
    }, { passive: false });
    const endPinch = () => { pinchStart = null; pinching = false; drag = null; };
    zoomRoot.addEventListener('touchend', endPinch, { passive: true });
    zoomRoot.addEventListener('touchcancel', endPinch, { passive: true });

    const stage = $('cs-stage');
    let drag = null;
    stage.addEventListener('pointerdown', (e) => {
      drag = { x: e.clientX, y: e.clientY, last: e.clientX, moved: 0 };
      stage.setPointerCapture?.(e.pointerId);
    });
    stage.addEventListener('pointermove', (e) => {
      if (!drag || pinching) return;
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
        else if (this.worldsOpen) this.hideWorldMenu();
        else if (this.mode === 'create') this.back();
        else return;
        e.preventDefault();
        return;
      }
      if (this.worldsOpen) return;
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
