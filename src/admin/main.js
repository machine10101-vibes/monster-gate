import '@fontsource/press-start-2p/400.css';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/600.css';
import '../ui/theme.css';
import './admin.css';
import { checkDevice, clearAccount, readAccount, signInAccount } from '../wallet/account.js';
import { adminHref, gameHref, isAdminAccount } from './gate.js';
import { changeStaff, loadLedger } from './api.js';
import { present } from '../../supabase/functions/_shared/ledger.js';
import { chipsHtml, drawerHtml, leadIndex, stageHtml, toolsNote, windowsHtml } from './view.js';
import { decorateAllFrames } from '../ui/theme.js';

if (typeof document !== 'undefined') document.documentElement.classList.add('ledger');

const TABS = ['ledger', 'hunters', 'coffers', 'bestiary', 'paths'];
const WINDOWS = ['all', '1', '7', '30'];
const state = {
  tab: 'ledger',
  query: '',
  window: 'all',
  classId: '',
  creature: '',
  band: '',
  pathId: '',
  realm: '',
  bucket: '',
  sort: 'updated',
  dir: 'desc',
  selected: '',
  char: 0,
  hold: false,
  ledger: null,
  role: '',
  canPromote: false,
};

let session = null;
let timer = 0;
let seatTimer = 0;
let painting = false;

const $ = (id) => document.getElementById(id);

function model() {
  return present(state.ledger, state);
}

function paint() {
  const view = state.ledger ? model() : null;
  const stage = $('stage');
  const drawer = $('drawer');
  const board = $('board');
  if (stage) {
    const top = stage.scrollTop;
    stage.innerHTML = view ? stageHtml(view, state) : '<p class="empty">Opening the guild record…</p>';
    stage.scrollTop = top;
  }
  if (drawer) drawer.innerHTML = view ? drawerHtml(view, state) : '';
  board?.classList.toggle('open', !!view?.selected);
  $('windows').innerHTML = windowsHtml(state);
  $('chips').innerHTML = chipsHtml(state);
  $('note').textContent = view ? toolsNote(view) : '';
  $('who').textContent = session?.email
    ? (state.role === 'moderator' ? `${session.email} · moderator` : session.email)
    : '';
  document.querySelectorAll('#rail button').forEach((button) => {
    button.classList.toggle('on', button.dataset.tab === state.tab);
  });
  const hold = $('hold');
  hold.classList.toggle('on', !state.hold);
  hold.textContent = state.hold ? 'Held' : 'Live';
  hold.setAttribute('aria-pressed', state.hold ? 'true' : 'false');
  const banner = $('banner');
  banner.textContent = state.error || '';
  banner.classList.toggle('hidden', !state.error);
  decorateAllFrames(document);
}

function showApp() {
  $('gate').classList.add('hidden');
  $('app').classList.remove('hidden');
  $('back').href = gameHref();
  paint();
}

function showGate(message) {
  $('app').classList.add('hidden');
  $('gate').classList.remove('hidden');
  $('login-error').textContent = message || '';
  $('back').href = gameHref();
  decorateAllFrames($('gate'));
}

async function refresh() {
  if (!session || painting) return;
  painting = true;
  try {
    state.ledger = await loadLedger(session);
    state.role = state.ledger.role === 'moderator' ? 'moderator' : 'master';
    state.canPromote = state.role === 'master';
    state.error = '';
    if (state.selected && !state.ledger.players.some((player) => player.id === state.selected)) {
      state.selected = '';
    }
  } catch (err) {
    state.error = err.message || 'The ledger could not be opened.';
    if (err.code === 'denied' || err.code === 'taken') {
      const email = session?.email || '';
      clearAccount();
      session = null;
      showGate(state.error);
      if (email && $('email')) $('email').value = email;
      painting = false;
      return;
    }
  } finally {
    painting = false;
  }
  paint();
}

function selectPlayer(id) {
  if (state.selected === id) {
    state.selected = '';
    return;
  }
  state.selected = id;
  const player = state.ledger?.players?.find((row) => row.id === id);
  state.char = leadIndex(player);
}

function clearFilter(key) {
  if (key === 'all') {
    state.query = '';
    state.classId = '';
    state.creature = '';
    state.band = '';
    state.pathId = '';
    state.realm = '';
    state.bucket = '';
    state.window = 'all';
    $('q').value = '';
    return;
  }
  if (key === 'query') {
    state.query = '';
    $('q').value = '';
  }
  if (key === 'class') state.classId = '';
  if (key === 'creature') state.creature = '';
  if (key === 'band') state.band = '';
  if (key === 'path') state.pathId = '';
  if (key === 'realm') state.realm = '';
  if (key === 'bucket') state.bucket = '';
  if (key === 'player') state.selected = '';
}

function onClick(event) {
  const button = event.target.closest('button, tr');
  if (!button) return;
  if (button.dataset.tab) state.tab = button.dataset.tab;
  if (button.dataset.window) state.window = button.dataset.window;
  if (button.dataset.class) {
    state.classId = state.classId === button.dataset.class ? '' : button.dataset.class;
    state.tab = 'hunters';
  }
  if (button.dataset.creature) {
    state.creature = state.creature === button.dataset.creature ? '' : button.dataset.creature;
    state.tab = 'hunters';
  }
  if (button.dataset.band) {
    state.band = state.band === button.dataset.band ? '' : button.dataset.band;
    state.tab = 'hunters';
  }
  if (button.dataset.path) {
    state.pathId = state.pathId === button.dataset.path ? '' : button.dataset.path;
    state.tab = 'hunters';
  }
  if (button.dataset.realm) {
    state.realm = state.realm === button.dataset.realm ? '' : button.dataset.realm;
    state.tab = 'hunters';
  }
  if (button.dataset.bucket) {
    state.bucket = state.bucket === button.dataset.bucket ? '' : button.dataset.bucket;
    state.tab = 'hunters';
  }
  if (button.dataset.sort) {
    if (state.sort === button.dataset.sort) state.dir = state.dir === 'asc' ? 'desc' : 'asc';
    else {
      state.sort = button.dataset.sort;
      state.dir = button.dataset.sort === 'name' || button.dataset.sort === 'class' ? 'asc' : 'desc';
    }
  }
  if (button.dataset.player) selectPlayer(button.dataset.player);
  if (button.dataset.char != null) state.char = Number(button.dataset.char) || 0;
  if (button.dataset.clear) clearFilter(button.dataset.clear);
  if (button.dataset.copy) navigator.clipboard?.writeText(button.dataset.copy).catch(() => {});
  if (button.dataset.promote) {
    setStaff('promote', button.dataset.promote);
    return;
  }
  if (button.dataset.demote) {
    setStaff('demote', button.dataset.demote);
    return;
  }
  paint();
}

async function setStaff(op, id) {
  if (!session || !state.canPromote) return;
  const player = state.ledger?.players?.find((row) => row.id === id);
  const label = player?.name || 'this hunter';
  const ok = op === 'promote'
    ? window.confirm(`Make ${label} a moderator? They keep hunting and can open the ledger.`)
    : window.confirm(`Remove moderator from ${label}?`);
  if (!ok) return;
  try {
    state.ledger = await changeStaff(session, op, player?.userId || id);
    state.role = state.ledger.role === 'moderator' ? 'moderator' : 'master';
    state.canPromote = state.role === 'master';
    state.error = '';
  } catch (err) {
    state.error = err.message || 'The staff list could not be saved.';
  }
  paint();
}

function move(step) {
  const rows = model().players;
  if (!rows.length) return;
  const index = rows.findIndex((player) => player.id === state.selected);
  const next = rows[Math.max(0, Math.min(rows.length - 1, (index < 0 ? 0 : index + step)))];
  if (!next) return;
  state.selected = next.id;
  state.char = leadIndex(next);
  state.tab = state.tab === 'ledger' ? 'hunters' : state.tab;
  paint();
  document.querySelector('tr.on, .recent.on')?.scrollIntoView({ block: 'nearest' });
}

function onKey(event) {
  const typing = event.target.closest('input, textarea');
  if (event.key === 'Escape') {
    if (state.selected) state.selected = '';
    else if (typing) typing.blur();
    paint();
    return;
  }
  if (typing) return;
  if (event.key === '/') {
    event.preventDefault();
    $('q').focus();
    return;
  }
  if (event.key >= '1' && event.key <= '5') {
    state.tab = TABS[Number(event.key) - 1];
    paint();
    return;
  }
  if (event.key === 'f' || event.key === 'F') {
    const index = WINDOWS.indexOf(state.window);
    state.window = WINDOWS[(index + 1) % WINDOWS.length];
    paint();
    return;
  }
  if (event.key === 'r' || event.key === 'R') {
    refresh();
    return;
  }
  if (event.key === 'j' || event.key === 'J' || event.key === 'ArrowDown') {
    event.preventDefault();
    move(1);
  }
  if (event.key === 'k' || event.key === 'K' || event.key === 'ArrowUp') {
    event.preventDefault();
    move(-1);
  }
}

async function watchSeat() {
  if (!session) return;
  try {
    await checkDevice(session);
  } catch (err) {
    if (err.code !== 'taken') return;
    const email = session.email || '';
    clearAccount();
    session = null;
    state.ledger = null;
    showGate(err.message);
    if (email && $('email')) $('email').value = email;
  }
}

function arm() {
  clearInterval(timer);
  clearInterval(seatTimer);
  timer = setInterval(() => {
    if (!state.hold && document.visibilityState === 'visible') refresh();
  }, 30000);
  seatTimer = setInterval(() => {
    if (document.visibilityState === 'visible') watchSeat();
  }, 4000);
}

async function boot() {
  $('back').href = gameHref();
  decorateAllFrames($('gate'));
  const seated = readAccount();
  if (isAdminAccount(seated)) {
    session = seated;
    showApp();
    await refresh();
  } else if (seated?.kind === 'email') {
    location.replace(gameHref());
    return;
  }
  arm();
}

$('login').addEventListener('submit', async (event) => {
  event.preventDefault();
  const submit = event.target.querySelector('button[type="submit"]');
  const error = $('login-error');
  error.textContent = '';
  submit.disabled = true;
  try {
    const next = await signInAccount($('email').value, $('password').value);
    if (!isAdminAccount(next)) {
      location.replace(gameHref());
      return;
    }
    session = next;
    $('password').value = '';
    showApp();
    await refresh();
  } catch (err) {
    error.textContent = err.message || 'The ledger could not be opened.';
  } finally {
    submit.disabled = false;
  }
});

$('app').addEventListener('click', onClick);
document.addEventListener('keydown', onKey);
$('q').addEventListener('input', () => {
  state.query = $('q').value;
  paint();
});
$('refresh').addEventListener('click', () => refresh());
$('hold').addEventListener('click', () => {
  state.hold = !state.hold;
  paint();
});
$('signout').addEventListener('click', () => {
  clearAccount();
  session = null;
  state.ledger = null;
  state.selected = '';
  state.role = '';
  state.canPromote = false;
  showGate('');
});
document.addEventListener('visibilitychange', () => {
  if (!state.hold && document.visibilityState === 'visible' && session) refresh();
});

if (location.pathname.endsWith('/admin.html') || location.pathname.endsWith('/admin')) boot();

export { adminHref };
