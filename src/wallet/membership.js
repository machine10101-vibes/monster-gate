import './membership.css';
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

let kleverPaymentModules;
async function sendSignedKlvTransfer(quote, expectedAddress) {
  // Payment uses Klever's supported BrowserWallet SDK in extension mode.
  // The existing account-link/connectWallet implementation is intentionally untouched.
  if (!kleverPaymentModules) {
    kleverPaymentModules = Promise.all([
      import('https://esm.sh/@klever/connect-wallet@0.2.4'),
      import('https://esm.sh/@klever/connect-provider@0.2.2'),
    ]);
  }
  const [{ BrowserWallet }, { KleverProvider }] = await kleverPaymentModules;
  const provider = new KleverProvider({ network: 'mainnet' });
  const wallet = new BrowserWallet(provider);
  await wallet.connect();
  if (!wallet.address || wallet.address !== expectedAddress) {
    throw new Error('The wallet approved for payment does not match the Klever wallet linked to this game account.');
  }
  const atomic = BigInt(Math.round(Number(quote.klvAmount) * 1_000_000));
  if (atomic <= 0n) throw new Error('The KLV quote is invalid. Refresh the quote and try again.');
  const result = await wallet.transfer({
    receiver: quote.receiverAddress || 'klv1mhrz0thhdsu4rznyfa27c9jr8hwtnf9f4sf8ef2kajgkup4sdhyqfs0wtv',
    amount: atomic.toString(),
  });
  const hash = String(result?.hash?.hash || result?.hash || result?.txHash || '').trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(hash)) {
    throw new Error('Klever Wallet did not return a valid transaction hash. Check your wallet before trying again.');
  }
  return hash;
}

function dateLabel(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : String(value || '');
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
    let pollTimer = null;
    let pollInFlight = false;
    let quoteLoading = false;\n    let paymentInFlight = false;\n    let paymentHash = '';
    let pollCount = 0;
    const destination = 'klv1mhrz0thhdsu4rznyfa27c9jr8hwtnf9f4sf8ef2kajgkup4sdhyqfs0wtv';

    const overlay = node('div', 'mg-gatepass-overlay');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'mg-gatepass-title');
    const card = node('section', 'mg-gatepass-card');
    const close = node('button', 'mg-gatepass-close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close Gate Pass');
    const head = node('div', 'mg-gatepass-head');
    const mark = node('div', 'mg-gatepass-mark', 'MG');
    mark.setAttribute('aria-hidden', 'true');
    const brandcopy = node('div');
    brandcopy.append(
      node('p', 'mg-gatepass-kicker', 'MONSTER GATE MEMBERSHIP'),
      node('p', 'mg-gatepass-brand', 'OFFICIAL WORLD ACCESS'),
    );
    head.append(mark, brandcopy);
    const title = node('h2', 'mg-gatepass-title', 'The Gate Pass');
    title.id = 'mg-gatepass-title';
    const intro = node('p', 'mg-gatepass-lede', 'Your key to the world beyond the Gate. Unlock 30 days of hunting, exploring, and fighting alongside the community.');
    const priceGrid = node('div', 'mg-gatepass-pricegrid');
    const usdBox = node('div', 'mg-gatepass-pricebox primary');
    usdBox.append(node('span', 'mg-gatepass-label', 'Membership'), node('strong', 'mg-gatepass-usd', '$5.00 USD'));
    const daysBox = node('div', 'mg-gatepass-pricebox');
    daysBox.append(node('span', 'mg-gatepass-label', 'Access period'), node('strong', 'mg-gatepass-days', '30 days'));
    priceGrid.append(usdBox, daysBox);
    const tokenLine = node('div', 'mg-gatepass-tokenline');
    const livePrice = node('strong', '', 'Fetching live KLV price…');
    const quoteExpiry = node('span', '', 'Swopus live pool · KLV/USDT');
    tokenLine.append(livePrice, quoteExpiry);

    const amountLabel = node('span', 'mg-gatepass-sectionlabel', 'Your exact payment amount');
    const amountRow = node('div', 'mg-gatepass-amountrow');
    const amount = node('code', 'mg-gatepass-amount', '— KLV');
    const copyAmount = node('button', 'mg-gatepass-copy', 'Copy');
    copyAmount.type = 'button';
    copyAmount.disabled = true;
    copyAmount.addEventListener('click', async () => {
      if (!quote) return;
      try { await copyText(quote.klvAmount); copyAmount.textContent = 'Copied'; }
      catch { copyAmount.textContent = 'Select amount'; }
    });
    amountRow.append(amount, copyAmount);

    const addressLabel = node('span', 'mg-gatepass-sectionlabel', 'Send KLV to the membership vault');
    const addressRow = node('div', 'mg-gatepass-addressrow');
    const address = node('code', 'mg-gatepass-address', destination);
    const copyAddress = node('button', 'mg-gatepass-copy', 'Copy');
    copyAddress.type = 'button';
    copyAddress.addEventListener('click', async () => {
      try { await copyText(destination); copyAddress.textContent = 'Copied'; }
      catch { copyAddress.textContent = 'Select address'; }
    });
    addressRow.append(address, copyAddress);

    const steps = node('div', 'mg-gatepass-steps');
    const step1 = node('div', 'mg-gatepass-step');
    step1.append(node('span', 'mg-gatepass-stepnum', '1'), node('span', '', 'Send the exact KLV amount from the Klever wallet linked to this game account. Keep a little extra KLV for network fees.'));
    const step2 = node('div', 'mg-gatepass-step');
    step2.append(node('span', 'mg-gatepass-stepnum', '2'), node('span', '', 'That’s it. We automatically watch the Klever chain and verify your payment. No transaction hash to copy or paste.'));
    steps.append(step1, step2);

    const watch = node('div', 'mg-gatepass-watch');
    const watchIcon = node('span', 'mg-gatepass-watchicon');
    watchIcon.setAttribute('aria-hidden', 'true');
    const watchCopy = node('div', 'mg-gatepass-watchcopy');
    const watchTitle = node('p', 'mg-gatepass-watchtitle', 'Waiting for your KLV transfer');
    const watchText = node('p', 'mg-gatepass-watchtext', 'This window will update automatically when KleverScan indexes a matching payment.');
    watchCopy.append(watchTitle, watchText);
    watch.append(watchIcon, watchCopy);

    const actions = node('div', 'mg-gatepass-actions');
    const checkNow = node('button', 'mg-gatepass-check', 'Check for payment now');
    checkNow.type = 'button';
    const refresh = node('button', 'mg-gatepass-refresh', 'Refresh quote');
    refresh.type = 'button';
    actions.append(payNow, checkNow, refresh);

    const footnote = node('p', 'mg-gatepass-footnote', 'Manual renewal · No recurring wallet charge · Network fees are paid separately.');
    const explorer = node('a', 'mg-gatepass-explorer', 'View membership wallet on KleverScan');
    explorer.href = `https://kleverscan.org/address/${destination}`;
    explorer.target = '_blank';
    explorer.rel = 'noopener noreferrer';
    explorer.style.display = 'block';
    explorer.style.width = 'fit-content';
    explorer.style.margin = '12px auto 0';
    explorer.style.fontSize = '11px';

    const setWatch = (heading, message, isError = false) => {
      watch.classList.toggle('error', isError);
      watchTitle.textContent = heading;
      watchText.textContent = message;
    };
    const finish = (value) => {
      if (settled) return;
      settled = true;
      if (pollTimer) clearTimeout(pollTimer);
      document.removeEventListener('keydown', onKeyDown);
      overlay.remove();
      resolve(value);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') finish(false);
    };
    const schedulePoll = (delay = 5000) => {
      if (settled || !quote) return;
      if (pollTimer) clearTimeout(pollTimer);
      pollTimer = setTimeout(checkPayment, delay);
    };
    const checkPayment = async () => {
      if (settled || !quote || pollInFlight) return;
      pollInFlight = true;
      pollCount += 1;
      checkNow.disabled = true;
      checkNow.textContent = 'Checking KleverScan…';
      try {
        const result = await post(currentSession, { op: 'watch', quoteId: quote.quoteId, txHash: paymentHash || undefined });
        currentSession = result.session;
        if (result.data?.ok && result.data.expiresAt) {
          setWatch('Gate Pass activated!', `Your 30-day access is active until ${dateLabel(result.data.expiresAt)}.`);
          checkNow.textContent = 'Payment confirmed';
          setTimeout(() => finish(true), 900);
          return;
        }
        setWatch(
          'Watching the Klever chain',
          pollCount > 1
            ? 'No matching transfer yet. We’ll keep checking in the background.'
            : 'Your payment has not appeared yet. You can leave this open while we keep watching.',
        );
      } catch (error) {
        const message = error.message || 'The chain could not be checked just now.';
        if (/quote expired|wallet changed|already been used|could not be found/i.test(message)) {
          quote = null;
          setWatch('Refresh your quote', message, true);
          return;
        }
        setWatch('Still watching for your payment', 'KleverScan is taking a moment to respond. We’ll retry automatically.', true);
      } finally {
        pollInFlight = false;
        checkNow.disabled = false;
        if (!quote) {
          checkNow.disabled = true;
          checkNow.textContent = 'Refresh quote to continue';
        } else if (checkNow.textContent !== 'Payment confirmed') {
          checkNow.disabled = false;
          checkNow.textContent = 'Check for payment now';
        }
        schedulePoll();
      }
    };
    const loadQuote = async () => {
      if (settled || quoteLoading) return;
      if (pollTimer) clearTimeout(pollTimer);
      quote = null;
      quoteLoading = true;
      refresh.disabled = true;
      checkNow.disabled = true;
      livePrice.textContent = 'Fetching live KLV price…';
      quoteExpiry.textContent = 'Bitcoin.me · KLV/USDT';
      amount.textContent = '— KLV';
      copyAmount.disabled = true;
      setWatch('Preparing your Gate Pass', 'Getting a fresh KLV/USDT quote before you send anything.');
      try {
        const result = await post(currentSession, { op: 'quote' });
        currentSession = result.session;
        quote = result.data;
        livePrice.textContent = `1 KLV = $${Number(quote.usdPrice).toFixed(8)} USDT`;
        quoteExpiry.textContent = `${quote.priceSource || 'Swopus'} · Quote valid until ${dateLabel(quote.expiresAt)}`;
        amount.textContent = `${quote.klvAmount} KLV`;
        copyAmount.disabled = false;
        setWatch('Waiting for your KLV transfer', 'Once you send the exact amount from your linked wallet, we’ll detect it and activate your pass automatically.');
        checkNow.disabled = false;
        schedulePoll(2500);
      } catch (error) {
        quote = null;
        livePrice.textContent = 'Live KLV price unavailable';
        quoteExpiry.textContent = 'Tap Refresh quote to retry';
        setWatch('Could not load a live quote', error.message || 'The live KLV price service is temporarily unavailable. No payment has been requested.', true);
        checkNow.disabled = true;
      } finally {
        quoteLoading = false;
        refresh.disabled = false;
      }
    };
    payNow.addEventListener('click', async () => {\n      if (settled || !quote || paymentInFlight) return;\n      paymentInFlight = true;\n      payNow.disabled = true;\n      refresh.disabled = true;\n      checkNow.disabled = true;\n      payNow.textContent = 'Approve in Klever Wallet…';\n      setWatch('Approve your payment in Klever Wallet', `Review the ${quote.klvAmount} KLV transfer to the Monster Gate membership vault. Your wallet will ask you to sign it.`);\n      try {\n        paymentHash = await sendSignedKlvTransfer(quote, status.walletAddress);\n        payNow.textContent = 'Payment sent';\n        setWatch('Transfer broadcast — verifying', 'Your signed transaction was submitted. We are waiting for Klever mainnet confirmation before activating access.');\n        schedulePoll(1000);\n        checkPayment();\n      } catch (error) {\n        const message = error?.message || 'The payment could not be signed.';\n        setWatch('Payment not sent', message, true);\n        payNow.textContent = 'Pay with Klever Wallet';\n        payNow.disabled = false;\n      } finally {\n        paymentInFlight = false;\n        refresh.disabled = false;\n        if (quote && !paymentHash) checkNow.disabled = false;\n      }\n    });\n    checkNow.addEventListener('click', () => {
      if (pollTimer) clearTimeout(pollTimer);
      checkPayment();
    });
    refresh.addEventListener('click', loadQuote);
    close.addEventListener('click', () => finish(false));
    overlay.addEventListener('click', (event) => { if (event.target === overlay) finish(false); });

    card.append(close, head, title, intro, priceGrid, tokenLine, amountLabel, amountRow, addressLabel, addressRow, steps, watch, actions, footnote, explorer);
    overlay.append(card);
    document.body.append(overlay);
    document.addEventListener('keydown', onKeyDown);
    loadQuote();
  });
}
