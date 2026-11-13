import { decorateFrame } from '../ui/theme.js';
import { PRESENCE, errorMessage, cleanHunterName } from './constants.js';

const CORNERS = ['nw', 'ne', 'sw', 'se'];

function el(tag, className, html) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (html != null) n.innerHTML = html;
  return n;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function toast(game, msg, ms) {
  game?.hud?.toast?.(msg, ms ?? 2200);
}

async function report(game, res) {
  if (!res) return res;
  if (res.ok) return res;
  toast(game, res.message || errorMessage(res.code), 2400);
  return res;
}

/** Friends panel inside the existing HUD panel chrome. */
export function mountFriends(body, game) {
  const social = game?.social;
  const root = el('div', 'mg-social');
  body.appendChild(root);

  const paint = () => {
    const snap = social?.snapshot?.() || { mode: 'offline', friends: [], pendingIn: [], pendingOut: [], party: null };
    root.innerHTML = '';
    if (!social || snap.mode === 'offline' || !snap.online) {
      root.appendChild(el('p', 'mg-social-note', 'Friends and parties are <b>Online only</b>. Load the hunt with <code>?mmo=1</code> to add hunters and form a party of four.'));
      return;
    }
    if (snap.mode === 'mmo' && !snap.caps.friends && !snap.caps.party) {
      root.appendChild(el('p', 'mg-social-note', 'The world server has not opened friends or parties yet. The journal is ready; MG Servers still needs the protocol in <code>PROTOCOL.md</code>.'));
    }

    const add = el('form', 'mg-social-add');
    add.innerHTML = `
      <label class="wg-label" for="mg-friend-name">Add by name</label>
      <div class="wg-row">
        <input id="mg-friend-name" class="wg-input mg-input" maxlength="16" autocomplete="off" autocapitalize="words" placeholder="Hunter name" />
        <button type="submit" class="mg-btn">Add</button>
      </div>`;
    add.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = add.querySelector('input');
      const name = cleanHunterName(input.value);
      const res = await report(game, await social.requestFriend(name));
      if (res?.ok) {
        input.value = '';
        toast(game, `Request sent to ${name}`, 1600);
      }
      paint();
    });
    root.appendChild(add);

    if (snap.pendingIn?.length) {
      root.appendChild(el('div', 'mg-social-h', 'Pending requests'));
      for (const p of snap.pendingIn) root.appendChild(requestRow(game, social, p, paint));
    }
    if (snap.pendingOut?.length) {
      root.appendChild(el('div', 'mg-social-h', 'Sent'));
      for (const p of snap.pendingOut) {
        const row = personRow(p, 'Waiting');
        root.appendChild(row);
      }
    }

    root.appendChild(el('div', 'mg-social-h', `Friends · ${snap.friends.length}/100`));
    if (!snap.friends.length) {
      root.appendChild(el('p', 'mg-social-empty', 'No friends yet. Add a hunter by name, or tap a nameplate.'));
    }
    for (const p of snap.friends) root.appendChild(friendRow(game, social, p, snap, paint));

    if (snap.blocked?.length) {
      root.appendChild(el('div', 'mg-social-h', 'Blocked'));
      for (const p of snap.blocked) {
        const row = personRow(p, 'Blocked');
        const un = el('button', 'mg-btn quiet', 'Unblock');
        un.type = 'button';
        un.onclick = async () => {
          await report(game, await social.unblockPlayer(p.user_id || p.id));
          paint();
        };
        row.appendChild(un);
        root.appendChild(row);
      }
    }
  };

  paint();
  const off = social?.subscribe?.(() => paint());
  return () => off?.();
}

function presenceLabel(p) {
  if (p.presence === PRESENCE.online) return p.zone || 'Online';
  return 'Offline';
}

function personRow(p, extra) {
  const row = el('div', 'mg-social-row');
  const on = p.presence === PRESENCE.online;
  row.innerHTML = `
    <i class="mg-dot ${on ? 'on' : ''}" aria-hidden="true"></i>
    <div class="mg-social-who">
      <b>${escapeHtml(p.name)}</b>
      <small>${escapeHtml(extra || presenceLabel(p))}</small>
    </div>`;
  return row;
}

function requestRow(game, social, p, paint) {
  const row = personRow(p, 'Wants to be friends');
  const yes = el('button', 'mg-btn', 'Accept');
  const no = el('button', 'mg-btn quiet', 'Decline');
  yes.type = 'button';
  no.type = 'button';
  yes.onclick = async () => {
    await report(game, await social.acceptFriend(p.user_id || p.id));
    paint();
  };
  no.onclick = async () => {
    await report(game, await social.declineFriend(p.user_id || p.id));
    paint();
  };
  row.append(yes, no);
  return row;
}

function friendRow(game, social, p, snap, paint) {
  const row = personRow(p);
    const invite = el('button', 'mg-btn', 'Invite');
    invite.type = 'button';
    const leader = !snap.party || snap.party.leader === snap.self?.id;
    invite.disabled = p.presence !== PRESENCE.online || !leader;
    invite.title = !leader ? 'Only the leader can invite' : p.presence === PRESENCE.online ? 'Invite to party' : 'They are offline';
  invite.onclick = async () => {
    const res = await report(game, await social.inviteToParty(p.id || p.name));
    if (res?.ok) toast(game, `${p.name} joined the party`, 1600);
    paint();
  };
  const more = el('button', 'mg-btn quiet', 'Remove');
  more.type = 'button';
  more.onclick = async () => {
    await report(game, await social.removeFriend(p.user_id || p.id));
    paint();
  };
  row.append(invite, more);
  return row;
}

/** Party frame, invite modal, and hunter context menu. */
export function mountSocialHud(game) {
  if (typeof document === 'undefined') return () => {};
  const hud = document.getElementById('hud');
  if (!hud || document.getElementById('party-frame')) return () => {};
  const host = document.getElementById('top-left') || hud;

  const frame = el('div', 'mg-frame pe');
  frame.id = 'party-frame';
  frame.hidden = true;
  frame.innerHTML = `
    <div class="mg-party-h">Party</div>
    <ul class="mg-party-list"></ul>
    <div class="mg-party-actions"></div>`;
  decorateFrame(frame);
  host.appendChild(frame);

  const modal = el('div', 'mg-frame pe');
  modal.id = 'social-invite';
  modal.hidden = true;
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-label', 'Party invite');
  hud.appendChild(modal);
  decorateFrame(modal);

  const menu = el('div', 'mg-frame pe');
  menu.id = 'social-menu';
  menu.hidden = true;
  menu.setAttribute('role', 'menu');
  hud.appendChild(menu);
  decorateFrame(menu);

  const social = game.social;
  let inviteTimer = 0;
  let lastInvite = '';

  const hideMenu = () => { menu.hidden = true; };
  const onDoc = (e) => {
    if (!menu.hidden && !menu.contains(e.target)) hideMenu();
  };
  document.addEventListener('pointerdown', onDoc, true);

  const paintParty = (snap) => {
    const party = snap?.party;
    const list = frame.querySelector('.mg-party-list');
    const actions = frame.querySelector('.mg-party-actions');
    if (!party?.members?.length) {
      frame.hidden = true;
      tintPlates(game, []);
      return;
    }
    frame.hidden = false;
    const you = snap.self?.id;
    const leader = party.leader;
    list.innerHTML = party.members.map((m) => {
      const hp = Math.max(0, Math.min(1, (m.hp ?? 20) / (m.max_hp || 20)));
      const crown = m.id === leader ? '<i class="mg-crown" title="Leader"></i>' : '';
      const youMark = m.id === you ? '<small>you</small>' : '';
      return `<li data-id="${escapeHtml(m.id)}" data-name="${escapeHtml(m.name)}">
        <div class="mg-party-name">${crown}<b>${escapeHtml(m.name)}</b>${youMark}</div>
        <div class="mg-hp"><i style="width:${(hp * 100).toFixed(0)}%"></i></div>
        <small>${escapeHtml(m.zone || (m.online ? 'Online' : 'Offline'))}</small>
      </li>`;
    }).join('');
    actions.innerHTML = '';
    const leave = el('button', 'mg-btn quiet', 'Leave');
    leave.type = 'button';
    leave.onclick = async () => {
      await report(game, await social.leaveParty());
    };
    actions.appendChild(leave);
    if (leader === you) {
      for (const m of party.members) {
        if (m.id === you) continue;
        const kick = el('button', 'mg-btn quiet', `Kick ${m.name}`);
        kick.type = 'button';
        kick.onclick = async () => report(game, await social.kick(m.id));
        actions.appendChild(kick);
      }
    }
    tintPlates(game, party.members);
  };

  const paintInvite = (snap) => {
    const inv = (snap?.invites || [])[0];
    if (!inv) {
      modal.hidden = true;
      lastInvite = '';
      clearInterval(inviteTimer);
      return;
    }
    const left = Math.max(0, Math.ceil((inv.expires_at - Date.now()) / 1000));
    modal.hidden = false;
    if (lastInvite === inv.invite_id) {
      const count = modal.querySelector('.mg-social-count');
      if (count) count.textContent = `Expires in ${left}s`;
      if (left <= 0) social.backend?.expireInvites?.();
      return;
    }
    lastInvite = inv.invite_id;
    modal.innerHTML = `
      <small>Party invite</small>
      <p><b>${escapeHtml(inv.from.name)}</b> asked you to hunt together.</p>
      <p class="mg-social-count">Expires in ${left}s</p>
      <div class="mg-social-btns">
        <button type="button" class="mg-btn" data-act="yes">Accept</button>
        <button type="button" class="mg-btn quiet" data-act="no">Decline</button>
      </div>`;
    for (const c of CORNERS) {
      if (modal.querySelector(`:scope > .mg-corner.${c}`)) continue;
      const i = document.createElement('i');
      i.className = `mg-corner ${c}`;
      i.setAttribute('aria-hidden', 'true');
      modal.appendChild(i);
    }
    modal.querySelector('[data-act="yes"]').onclick = async () => {
      await report(game, await social.acceptParty(inv.invite_id));
    };
    modal.querySelector('[data-act="no"]').onclick = async () => {
      await report(game, await social.declineParty(inv.invite_id));
    };
    clearInterval(inviteTimer);
    inviteTimer = setInterval(() => paintInvite(social.snapshot()), 250);
  };

  const onSnap = (snap) => {
    paintParty(snap);
    paintInvite(snap);
  };
  const off = social?.subscribe?.(onSnap);
  onSnap(social?.snapshot?.());

  const openMenu = (player, ev) => {
    if (!player?.name) return;
    const snap = social?.snapshot?.() || {};
    const offline = !social || snap.mode === 'offline';
    const caps = snap.caps || {};
    const isSelf = player.id && snap.self?.id && player.id === snap.self.id;
    const isFriend = (snap.friends || []).some((f) => matchPerson(f, player));
    const inParty = social?.isPartyMember?.(player.id, player.name);
    menu.hidden = false;
    const whisperOn = caps.whisper;
    menu.innerHTML = `
      <b>${escapeHtml(player.name)}</b>
      ${offline ? '<p class="mg-social-note">Friends and parties are <b>Online only</b>.</p>' : ''}
      <button type="button" data-act="friend" ${offline || isSelf || isFriend ? 'disabled' : ''}>${isFriend ? 'Friends' : 'Add friend'}</button>
      <button type="button" data-act="party" ${offline || isSelf || inParty ? 'disabled' : ''}>${inParty ? 'In party' : 'Invite to party'}</button>
      <button type="button" data-act="whisper" ${offline || isSelf || !whisperOn ? 'disabled' : ''}>Whisper</button>
      <button type="button" data-act="block" ${offline || isSelf || !caps.block ? 'disabled' : ''}>Block</button>`;
    for (const c of CORNERS) {
      if (menu.querySelector(`:scope > .mg-corner.${c}`)) continue;
      const i = document.createElement('i');
      i.className = `mg-corner ${c}`;
      i.setAttribute('aria-hidden', 'true');
      menu.appendChild(i);
    }
    placeMenu(menu, ev);
    menu.querySelector('[data-act="friend"]').onclick = async () => {
      hideMenu();
      const res = await report(game, await social.requestFriend(player.name));
      if (res?.ok) toast(game, `Request sent to ${player.name}`, 1600);
    };
    menu.querySelector('[data-act="party"]').onclick = async () => {
      hideMenu();
      const res = await report(game, await social.inviteToParty(player.id || player.name));
      if (res?.ok) toast(game, `${player.name} joined the party`, 1600);
    };
    menu.querySelector('[data-act="whisper"]').onclick = () => {
      hideMenu();
      focusWhisper(game, player);
    };
    menu.querySelector('[data-act="block"]').onclick = async () => {
      hideMenu();
      await report(game, await social.blockPlayer(player.id || player.name));
    };
  };

  const onPlate = (e) => {
    const plate = e.target.closest?.('.nameplate.hunter');
    if (!plate) return;
    e.preventDefault();
    e.stopPropagation();
    openMenu({ id: plate.dataset.pid, name: plate.dataset.pname || plate.textContent.trim() }, e);
  };
  const plates = document.getElementById('nameplates');
  plates?.addEventListener('pointerdown', onPlate);

  const onChat = (e) => {
    const name = e.target.closest?.('.wc-name');
    if (!name) return;
    e.preventDefault();
    e.stopPropagation();
    openMenu({ id: name.dataset.pid, name: name.dataset.pname || name.textContent.trim() }, e);
  };
  document.getElementById('world-chat')?.addEventListener('pointerdown', onChat);
  const chatObs = observeChat(onChat);

  const view = game.worldView;
  const prev = view?.onPlayerActivate;
  if (view && typeof view.onPlayerActivate === 'function') {
    /* already a setter */
  }
  if (view) {
    view._onPlayerActivate = (player, ev) => openMenu(player, ev);
  }

  return () => {
    off?.();
    clearInterval(inviteTimer);
    document.removeEventListener('pointerdown', onDoc, true);
    plates?.removeEventListener('pointerdown', onPlate);
    chatObs?.();
    frame.remove();
    modal.remove();
    menu.remove();
    if (view && view._onPlayerActivate) view._onPlayerActivate = prev || null;
  };
}

function matchPerson(a, b) {
  if (!a || !b) return false;
  if (a.id && b.id && a.id === b.id) return true;
  if (a.user_id && b.id && a.user_id === b.id) return true;
  return String(a.name || '').toLowerCase() === String(b.name || '').toLowerCase();
}

function tintPlates(game, members) {
  const names = new Set((members || []).map((m) => String(m.name || '').toLowerCase()));
  const ids = new Set((members || []).flatMap((m) => [m.id, ...(m.aliases || [])].filter(Boolean)));
  const hud = game?.hud;
  if (!hud?.plates) return;
  for (const [id, p] of hud.plates) {
    const name = (p.dataset.pname || '').toLowerCase();
    const on = ids.has(id) || ids.has(p.dataset.pid) || (name && names.has(name));
    p.classList.toggle('party', on);
  }
}

function placeMenu(menu, ev) {
  const x = ev?.clientX ?? 80;
  const y = ev?.clientY ?? 80;
  menu.style.left = '0px';
  menu.style.top = '0px';
  const w = menu.offsetWidth || 180;
  const h = menu.offsetHeight || 160;
  const left = Math.min(window.innerWidth - w - 8, Math.max(8, x));
  const top = Math.min(window.innerHeight - h - 8, Math.max(8, y));
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
}

function focusWhisper(game, player) {
  const chat = document.getElementById('world-chat');
  const input = chat?.querySelector('.wc-in');
  if (chat) chat.classList.remove('collapsed');
  if (input) {
    input.value = `/w ${player.name} `;
    input.focus();
  } else {
    toast(game, `Whisper ${player.name}`, 1400);
  }
}

function observeChat(onChat) {
  const hud = document.getElementById('hud');
  if (!hud || typeof MutationObserver === 'undefined') return () => {};
  const bind = (node) => {
    if (node?.id === 'world-chat') node.addEventListener('pointerdown', onChat);
  };
  hud.querySelector('#world-chat') && bind(hud.querySelector('#world-chat'));
  const mo = new MutationObserver((recs) => {
    for (const r of recs) {
      for (const n of r.addedNodes) if (n.nodeType === 1) bind(n);
    }
  });
  mo.observe(hud, { childList: true });
  return () => mo.disconnect();
}

export { tintPlates, escapeHtml };
