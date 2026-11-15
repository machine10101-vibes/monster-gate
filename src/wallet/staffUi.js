import { decorateFrame } from '../ui/theme.js';
import { createModeratorAccount, demoteModerator, listModerators, promoteModerator } from './staff.js';

function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text != null) n.textContent = text;
  return n;
}

function field(label, opts = {}) {
  const wrap = el('label', 'staff-field');
  wrap.appendChild(el('span', '', label));
  const input = document.createElement('input');
  input.type = opts.type || 'email';
  input.autocomplete = opts.autocomplete || 'off';
  input.spellcheck = false;
  if (opts.maxLength) input.maxLength = opts.maxLength;
  wrap.appendChild(input);
  return { wrap, input };
}

/** Settings card: admin creates new moderator accounts or promotes existing ones. */
export function mountStaffSettings(body, game) {
  if (!game.isAdmin?.()) return;
  const card = el('div', 'wallet-link-card staff-card mg-frame');
  decorateFrame(card);
  card.appendChild(el('h3', 'mg-title', 'Moderators'));
  const copy = el('p', 'wallet-link-copy', 'Moderator accounts play the hunt and are the only ones that open World Creator. You can create a new account or promote one that already exists.');
  const err = el('p', 'account-error');
  err.setAttribute('role', 'alert');
  const list = el('ul', 'staff-list');
  const createTitle = el('p', 'wallet-link-who', 'Create a moderator account');
  const createEmail = field('Email');
  const createPass = field('Password', { type: 'password', autocomplete: 'new-password', maxLength: 72 });
  const createBtn = el('button', 'mg-btn', 'Create moderator');
  createBtn.type = 'button';
  const promoteTitle = el('p', 'wallet-link-who', 'Make an existing account a moderator');
  const promoteEmail = field('Existing email');
  const promoteBtn = el('button', 'mg-btn', 'Make moderator');
  promoteBtn.type = 'button';

  card.append(
    copy,
    list,
    createTitle,
    createEmail.wrap,
    createPass.wrap,
    createBtn,
    promoteTitle,
    promoteEmail.wrap,
    promoteBtn,
    err,
  );
  body.appendChild(card);

  let busy = false;
  const note = (text, isError = false) => {
    err.textContent = text || '';
    err.classList.toggle('staff-ok', !!text && !isError);
  };

  const paintList = (mods) => {
    list.replaceChildren();
    if (!mods.length) {
      list.appendChild(el('li', 'staff-empty', 'No moderator accounts yet.'));
      return;
    }
    for (const row of mods) {
      const item = el('li', 'staff-row');
      item.appendChild(el('span', '', row.email));
      const drop = el('button', 'mg-btn quiet', 'Remove');
      drop.type = 'button';
      drop.onclick = async () => {
        if (busy) return;
        busy = true;
        note('');
        try {
          await demoteModerator(game.wallet, row.email);
          game.hud?.toast?.('Moderator removed.', 2200);
          await refresh();
        } catch (e) {
          note(e.message || 'That moderator could not be removed.', true);
        } finally {
          busy = false;
        }
      };
      item.appendChild(drop);
      list.appendChild(item);
    }
  };

  const refresh = async () => {
    try {
      paintList(await listModerators(game.wallet));
    } catch (e) {
      note(e.message || 'The staff list could not be opened.', true);
    }
  };

  createBtn.onclick = async () => {
    if (busy) return;
    busy = true;
    createBtn.disabled = true;
    note('');
    try {
      await createModeratorAccount(game.wallet, createEmail.input.value, createPass.input.value);
      createEmail.input.value = '';
      createPass.input.value = '';
      game.hud?.toast?.('Moderator account created.', 2400);
      await refresh();
    } catch (e) {
      note(e.message || 'The moderator account could not be created.', true);
    } finally {
      busy = false;
      createBtn.disabled = false;
    }
  };

  promoteBtn.onclick = async () => {
    if (busy) return;
    busy = true;
    promoteBtn.disabled = true;
    note('');
    try {
      const result = await promoteModerator(game.wallet, promoteEmail.input.value);
      promoteEmail.input.value = '';
      game.hud?.toast?.(result.already ? 'That account is already a moderator.' : 'Account is now a moderator.', 2400);
      await refresh();
    } catch (e) {
      note(e.message || 'That account could not be made a moderator.', true);
    } finally {
      busy = false;
      promoteBtn.disabled = false;
    }
  };

  refresh();
}
