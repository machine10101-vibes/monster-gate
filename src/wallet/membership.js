import { loadCloudConfig } from './cloud.js';
import { refreshAccountSession, saveAccount } from './account.js';

async function post(session, body) {
  const cfg = await loadCloudConfig();
  if (!cfg.url || !cfg.key) throw new Error('The membership service is not configured.');
  const current = await refreshAccountSession(session);
  if (!current?.accessToken) throw new Error('Sign in to your game account again.');
  const response = await fetch(`${cfg.url}/functions/v1/membership`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: cfg.key,
      authorization: `Bearer ${current.accessToken}`,
    },
    body: JSON.stringify({ ...body, accessToken: current.accessToken }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'The membership service could not be reached.');
  return { data, session: current };
}

export async function membershipStatus(session) {
  const result = await post(session, { op: 'status' });
  if (result.data.walletAddress && result.session.kleverAddress !== result.data.walletAddress) {
    saveAccount({ ...result.session, kleverAddress: result.data.walletAddress });
  }
  return result.data;
}

function node(tag, cls, value) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (value != null) el.textContent = value;
  return el;
}

function copyText(value) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
  const input = node('textarea');
  input.value = value;
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.append(input);
  input.select();
  document.execCommand('copy');
  input.remove();
  return Promise.resolve();
}

function dateLabel(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : value;
}

export async function ensureMembership(session, game) {
  let currentSession = session;
  let status;
  try {
    const checked = await post(currentSession, { op: 'status' });
    currentSession = checked.session;
    status = checked.data;
    if (status.walletAddress && currentSession.kleverAddress !== status.walletAddress) {
      currentSession = saveAccount({ ...currentSession, kleverAddress: status.walletAddress });
    }
  } catch (error) {
    game.charSelect?.note?.(error.message || 'Could not check membership.', true, true);
    return false;
  }
  if (status.active) return true;
  if (!status.connected || !status.walletAddress) {
    game.charSelect?.note?.('Connect your Klever wallet above before entering the world.', true, true);
    document.getElementById('cs-wallet-connect')?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    return false;
  }

  return new Promise((resolve) => {
    let settled = false;
    let quote = null;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      overlay.remove();
      resolve(value);
    };
    const overlay = node('div', 'mg-membership-overlay');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'mg-membership-title');
    const card = node('section', 'mg-membership-card');
    const close = node('button', 'mg-membership-close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close membership');
    close.addEventListener('click', () => finish(false));
    const eyebrow = node('p', 'mg-membership-eyebrow', 'MONSTER GATE MEMBERSHIP');
    const title = node('h2', '', 'The Gate Pass');
    title.id = 'mg-membership-title';
    const intro = node('p', 'mg-membership-intro', 'A membership gives this account 30 days of access to the world. Renewals are manual; the wallet is never charged automatically.');
    const price = node('div', 'mg-membership-price', 'Loading live KLV price…');
    const details = node('p', 'mg-membership-details', 'The KLV amount is calculated from the live KLV/USDT ticker on Bitcoin.me. USDT is used as the USD reference.');
    const addressLabel = node('label', 'mg-membership-label', 'Send KLV to this address');
    const address = node('code', 'mg-membership-address', status.walletAddress ? '' : '');
    const destination = 'klv1mhrz0thhdsu4rznyfa27c9jr8hwtnf9f4sf8ef2kajgkup4sdhyqfs0wtv';
    address.textContent = destination;
    const copyAddress = node('button', 'mg-membership-copy', 'Copy receiving address');
    copyAddress.type = 'button';
    copyAddress.addEventListener('click', async () => {
      try { await copyText(destination); copyAddress.textContent = 'Address copied'; }
      catch { copyAddress.textContent = 'Copy unavailable — select the address'; }
    });
    const amountLabel = node('label', 'mg-membership-label', 'Exact KLV amount');
    const amount = node('code', 'mg-membership-amount', '…');
    const copyAmount = node('button', 'mg-membership-copy', 'Copy amount');
    copyAmount.type = 'button';
    copyAmount.disabled = true;
    copyAmount.addEventListener('click', async () => {
      if (!quote) return;
      try { await copyText(quote.klvAmount); copyAmount.textContent = 'Amount copied'; }
      catch { copyAmount.textContent = quote.klvAmount; }
    });
    const instructions = node('p', 'mg-membership-instructions', 'Send the exact amount from your linked Klever wallet and keep extra KLV for network fees. Then paste the transaction hash below. Only a confirmed mainnet KLV transfer to this address will activate access.');
    const hashLabel = node('label', 'mg-membership-label', 'Klever transaction hash');
    const hash = node('input', 'mg-membership-hash');
    hash.type = 'text';
    hash.autocomplete = 'off';
    hash.spellcheck = false;
    hash.placeholder = '64-character transaction hash';
    hash.maxLength = 66;
    const error = node('p', 'mg-membership-error', '');
    error.setAttribute('role', 'status');
    const submit = node('button', 'mg-membership-submit', 'Verify payment & enter world');
    submit.type = 'button';
    const cancel = node('button', 'mg-membership-cancel', 'Not now');
    cancel.type = 'button';
    cancel.addEventListener('click', () => finish(false));
    submit.addEventListener('click', async () => {
      if (!quote) return;
      const txHash = hash.value.trim().replace(/^0x/i, '');
      if (!/^[0-9a-f]{64}$/i.test(txHash)) {
        error.textContent = 'Paste the 64-character transaction hash from Klever.';
        hash.focus();
        return;
      }
      submit.disabled = true;
      submit.textContent = 'Checking Klever mainnet…';
      error.textContent = '';
      try {
        const result = await post(currentSession, { op: 'verify', quoteId: quote.quoteId, txHash });
        currentSession = result.session;
        error.textContent = `Membership active until ${dateLabel(result.data.expiresAt)}.`;
        submit.textContent = 'Membership active';
        setTimeout(() => finish(true), 650);
      } catch (err) {
        error.textContent = err.message || 'Payment could not be verified.';
        submit.disabled = false;
        submit.textContent = 'Try verification again';
      }
    });
    card.append(close, eyebrow, title, intro, price, details, addressLabel, address, copyAddress, amountLabel, amount, copyAmount, instructions, hashLabel, hash, error, submit, cancel);
    overlay.append(card);
    overlay.addEventListener('click', (event) => { if (event.target === overlay) finish(false); });
    document.body.append(overlay);
    hash.focus();
    post(currentSession, { op: 'quote' }).then(({ data, session: refreshed }) => {
      currentSession = refreshed;
      quote = data;
      price.textContent = `$5.00 USD = ${data.klvAmount} KLV`;
      details.textContent = `1 KLV = $${Number(data.usdPrice).toFixed(8)} USDT · Quote valid until ${dateLabel(data.expiresAt)}.`;
      amount.textContent = data.klvAmount + ' KLV';
      copyAmount.disabled = false;
    }).catch((err) => {
      price.textContent = 'Live KLV price unavailable';
      error.textContent = err.message || 'Could not load a price quote.';
      submit.disabled = true;
    });
  });
}
