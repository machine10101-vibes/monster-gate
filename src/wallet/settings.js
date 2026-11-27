import { decorateFrame } from '../ui/theme.js';
import { shortAddress } from './klever.js';
import { isMockWallet, mockAddress } from './mock.js';
import { linkKleverWallet, linkedWalletStatus, unlinkKleverWallet } from './link.js';

function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text != null) n.textContent = text;
  return n;
}

export function gatePassStatusText(status, now = Date.now()) {
  if (!status) return 'Checking subscription…';
  const expires = Date.parse(status.expiresAt);
  if (status.active && Number.isFinite(expires) && expires > now) {
    const days = Math.ceil((expires - now) / 86_400_000);
    return `Active Gate Pass · ${days} ${days === 1 ? 'day' : 'days'} remaining · expires ${new Date(expires).toLocaleDateString()}`;
  }
  return 'No active Gate Pass.';
}

export function mountWalletSettings(body, game) {
  if (game.wallet?.kind !== 'email') return;
  const card = el('div', 'wallet-link-card mg-frame');
  decorateFrame(card);
  const title = el('h3', 'mg-title', 'Connect Klever wallet');
  const copy = el('p', 'wallet-link-copy');
  const who = el('p', 'wallet-link-who');
  const err = el('p', 'account-error');
  err.setAttribute('role', 'alert');
  const actions = el('div', 'wallet-link-actions');
  const confirm = el('div', 'wallet-link-confirm hidden');
  confirm.append(
    el('p', '', 'Unlink this Klever wallet from your account?'),
  );
  const confirmRow = el('div', 'wallet-link-actions');
  const yes = el('button', 'mg-btn', 'Unlink');
  yes.type = 'button';
  const no = el('button', 'mg-btn quiet', 'Cancel');
  no.type = 'button';
  confirmRow.append(yes, no);
  confirm.appendChild(confirmRow);
  const pass = el('section', 'mg-profile-pass');
  const passTitle = el('h3', 'mg-title', 'Gate Pass');
  const passStatus = el('p', 'wallet-link-copy', 'Checking subscription…');
  const passAction = el('button', 'mg-btn', 'Get 30-day access');
  passAction.type = 'button';
  pass.append(passTitle, passStatus, passAction);
  card.append(title, copy, who, err, actions, confirm, pass);
  body.appendChild(card);

  let busy = false;
  let address = game.wallet.kleverAddress || '';
  let membership = null;
  let membershipError = '';

  const paint = () => {
    passStatus.textContent = membershipError || gatePassStatusText(membership);
    passAction.hidden = !!membership?.active;
    err.textContent = '';
    confirm.classList.add('hidden');
    actions.replaceChildren();
    if (isMockWallet()) {
      copy.textContent = `Tester mock wallet ${shortAddress(mockAddress())} is session-only. It never creates an account.`;
    } else {
      copy.textContent = 'Connect the Klever extension, then sign a short message. One wallet per account.';
    }
    if (address) {
      who.textContent = `Linked ${shortAddress(address)}`;
      const unlink = el('button', 'mg-btn quiet', 'Unlink');
      unlink.type = 'button';
      unlink.id = 'set-wallet-unlink';
      unlink.onclick = () => {
        err.textContent = '';
        confirm.classList.remove('hidden');
      };
      actions.appendChild(unlink);
    } else {
      who.textContent = 'No Klever wallet is linked to this account.';
      const connect = el('button', 'mg-btn', 'Connect Klever wallet');
      connect.type = 'button';
      connect.id = 'set-wallet-connect';
      connect.onclick = async () => {
        if (busy) return;
        busy = true;
        connect.disabled = true;
        err.textContent = '';
        who.textContent = 'Confirm the signature in the Klever extension…';
        try {
          await linkKleverWallet(game.wallet);
          address = game.wallet.kleverAddress || '';
          game.hud?.toast?.('Klever wallet linked.', 2400);
          paint();
        } catch (e) {
          who.textContent = 'No Klever wallet is linked to this account.';
          err.textContent = e.message || 'The wallet could not be linked.';
          connect.disabled = false;
        } finally {
          busy = false;
        }
      };
      actions.appendChild(connect);
    }
  };

  passAction.onclick = async () => {
    if (busy) return;
    busy = true;
    passAction.disabled = true;
    passStatus.textContent = 'Preparing secure checkout…';
    try {
      const { ensureMembership, membershipStatus } = await import('./membership.js');
      await ensureMembership(game.wallet, game);
      membership = await membershipStatus(game.wallet);
      membershipError = '';
    } catch (e) {
      membershipError = e.message || 'Could not open Gate Pass checkout.';
    } finally {
      busy = false;
      passAction.disabled = false;
      paint();
    }
  };

  yes.onclick = async () => {
    if (busy) return;
    busy = true;
    yes.disabled = true;
    try {
      await unlinkKleverWallet(game.wallet);
      address = '';
      game.hud?.toast?.('Klever wallet unlinked.', 2400);
      paint();
    } catch (e) {
      err.textContent = e.message || 'The wallet could not be unlinked.';
    } finally {
      busy = false;
      yes.disabled = false;
    }
  };
  no.onclick = () => {
    confirm.classList.add('hidden');
  };

  paint();
  import('./membership.js').then(({ membershipStatus }) => membershipStatus(game.wallet)).then((status) => {
    membership = status;
    membershipError = '';
    paint();
  }).catch(() => {
    membershipError = 'Subscription status is temporarily unavailable.';
    paint();
  });
  linkedWalletStatus(game.wallet).then((status) => {
    if (status.address !== undefined) {
      address = status.address || '';
      game.wallet.kleverAddress = address;
      paint();
    }
  }).catch(() => {});
}
