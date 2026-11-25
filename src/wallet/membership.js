import './membership.css';
import { loadCloudConfig } from './cloud.js';
import { refreshAccountSession, saveAccount } from './account.js';
import { linkKleverWallet } from './link.js';

async function post(session, body) {
  const cfg = await loadCloudConfig();
  if (!cfg.url || !cfg.key) throw new Error('The membership service is not configured.');
  const current = await refreshAccountSession(session);
  if (!current?.accessToken) throw new Error('Sign in to your game account again.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${cfg.url}/functions/v1/membership`, {
      method: 'POST',
      signal: controller.signal,
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
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('The membership service took too long to respond. Please refresh the quote and try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
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
// Payment SDK loading is retried across independent ESM hosts; do not regress to a single CDN import.
async function loadKleverPaymentModules() {
  if (!kleverPaymentModules) {
    // esm.sh can intermittently fail to serve browser modules. Retry through
    // jsDelivr's ESM endpoint before reporting a wallet integration failure.
    const sources = [
      'https://esm.sh/@klever/connect@0.1.9?bundle&target=es2022',
      'https://cdn.jsdelivr.net/npm/@klever/connect@0.1.9/+esm',
    ];
    kleverPaymentModules = (async () => {
      let lastError;
      for (const source of sources) {
        try {
          return await import(/* @vite-ignore */ source);
        } catch (error) {
          lastError = error;
        }
      }
      const error = new Error('Klever Wallet payment support could not be loaded. Check your connection or browser content blocker, then try again.');
      error.cause = lastError;
      throw error;
    })();
  }
  try {
    return await kleverPaymentModules;
  } catch (error) {
    // Do not cache a rejected import: the player can retry after the network recovers.
    kleverPaymentModules = null;
    throw error;
  }
}

async function sendSignedKlvTransfer(quote, expectedAddress) {
  // Payment uses Klever's supported BrowserWallet SDK in extension mode.
  // The existing account-link/connectWallet implementation is intentionally left unchanged.
  const { BrowserWallet, KleverProvider } = await loadKleverPaymentModules();
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
  return new Promise((resolve) => {
    let settled = false;
    let quote = null;
    let estimatedKlvAmount = '';
    let liveKlvUsdPrice = 0;
    let selectedPlanId = 'monthly';
    let pollTimer = null;
    let pollInFlight = false;
    let quoteLoading = false;
    let rateLoading = false;
    let paymentInFlight = false;
    let paymentHash = '';
    let pollCount = 0;
    const destination = 'klv1mhrz0thhdsu4rznyfa27c9jr8hwtnf9f4sf8ef2kajgkup4sdhyqfs0wtv';
    const plans = [
      { id: 'monthly', days: 30, total: 5, title: '30 days', rate: '$5.00 / month' },
      { id: 'six-month', days: 180, total: 27, title: '6 months', rate: '$4.50 / month' },
      { id: 'annual', days: 365, total: 48, title: '12 months', rate: '$4.00 / month' },
    ];
    const selectedPlan = () => plans.find((plan) => plan.id === selectedPlanId) || plans[0];

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
    const intro = node('p', 'mg-gatepass-lede', 'Your key to the world beyond the Gate. Choose your access term or redeem a free 10-day pass code.');
    const codePanel = node('section', 'mg-gatepass-code-panel');
    const codeHeading = node('span', 'mg-gatepass-sectionlabel', 'Have a 10-day free pass code?');
    const codeRow = node('div', 'mg-gatepass-code-row');
    const codeInput = node('input', 'mg-gatepass-code-input');
    codeInput.type = 'text';
    codeInput.placeholder = 'MG-XXXX-XXXX-XXXX-XXXX';
    codeInput.autocomplete = 'off';
    codeInput.autocapitalize = 'characters';
    codeInput.spellcheck = false;
    codeInput.maxLength = 23;
    codeInput.setAttribute('aria-label', '10-day free pass code');
    const redeemButton = node('button', 'mg-gatepass-redeem', 'Redeem code');
    redeemButton.type = 'button';
    const codeFeedback = node('p', 'mg-gatepass-code-feedback', status.walletAddress ? 'Each code can be used once.' : 'You can redeem a free pass without connecting a Klever wallet.');
    codeRow.append(codeInput, redeemButton);
    codePanel.append(codeHeading, codeRow, codeFeedback);
    const paymentPanel = node('div', 'mg-gatepass-payment-panel');
    paymentPanel.hidden = false;
    const priceGrid = node('div', 'mg-gatepass-pricegrid');
    const planButtons = new Map();
    const renderPlans = () => plans.forEach((plan) => {
      const button = planButtons.get(plan.id);
      const active = plan.id === selectedPlanId;
      button.classList.toggle('selected', active);
      button.setAttribute('aria-pressed', String(active));
    });
    for (const plan of plans) {
      const button = node('button', 'mg-gatepass-plan', '');
      button.type = 'button';
      button.append(node('span', 'mg-gatepass-plan-title', plan.title),
        node('strong', 'mg-gatepass-plan-rate', plan.rate),
        node('span', 'mg-gatepass-plan-total', `$${plan.total.toFixed(2)} total`));
      button.setAttribute('aria-label', `${plan.title}, ${plan.rate}, ${plan.total.toFixed(2)} dollars total`);
      button.addEventListener('click', () => {
        if (selectedPlanId === plan.id || settled) return;
        selectedPlanId = plan.id;
        renderPlans();
        quote = null;
        if (liveKlvUsdPrice > 0) {
          const atomic = Math.ceil((selectedPlan().total / liveKlvUsdPrice) * 1_000_000);
          estimatedKlvAmount = (atomic / 1_000_000).toFixed(6);
          amount.textContent = `${estimatedKlvAmount} KLV`;
          amountLabel.textContent = 'Estimated payment amount';
        }
        if (status.walletAddress) loadQuote();
      });
      planButtons.set(plan.id, button);
      priceGrid.append(button);
    }
    renderPlans();
    const tokenLine = node('div', 'mg-gatepass-tokenline');
    const livePrice = node('strong', '', 'Fetching live KLV price…');
    const quoteExpiry = node('span', '', 'Swopus live pool · KLV/USDT');
    tokenLine.append(livePrice, quoteExpiry);
    const amountLabel = node('span', 'mg-gatepass-sectionlabel', 'Estimated KLV payment');
    const amountRow = node('div', 'mg-gatepass-amountrow');
    const amount = node('code', 'mg-gatepass-amount', '— KLV');
    amountRow.append(amount);

    const watch = node('div', 'mg-gatepass-watch');
    const watchIcon = node('span', 'mg-gatepass-watchicon');
    watchIcon.setAttribute('aria-hidden', 'true');
    const watchCopy = node('div', 'mg-gatepass-watchcopy');
    const watchTitle = node('p', 'mg-gatepass-watchtitle', 'Waiting for your KLV transfer');
    const watchText = node('p', 'mg-gatepass-watchtext', 'This window will update automatically when KleverScan indexes a matching payment.');
    watchCopy.append(watchTitle, watchText);
    watch.append(watchIcon, watchCopy);

    const actions = node('div', 'mg-gatepass-actions');
    const payNow = node('button', 'mg-gatepass-pay', 'Buy Membership');
    payNow.type = 'button';
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
    const redeemPass = async () => {
      if (settled || redeemButton.disabled) return;
      const code = codeInput.value.trim().toUpperCase();
      if (!code) {
        codeFeedback.textContent = 'Enter your free pass code.';
        codeInput.focus();
        return;
      }
      redeemButton.disabled = true;
      redeemButton.textContent = 'Redeeming…';
      codeFeedback.textContent = 'Checking your code…';
      try {
        const result = await post(currentSession, { op: 'redeem', code });
        currentSession = result.session;
        codeFeedback.textContent = 'Free pass activated — 10 days added to your Gate Pass.';
        setTimeout(() => finish(true), 700);
      } catch (error) {
        codeFeedback.textContent = error.message || 'That code could not be redeemed.';
      } finally {
        if (!settled) {
          redeemButton.disabled = false;
          redeemButton.textContent = 'Redeem code';
        }
      }
    };
    redeemButton.addEventListener('click', redeemPass);
    codeInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        redeemPass();
      }
    });
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
          setWatch('Gate Pass activated!', `Your membership is active until ${dateLabel(result.data.expiresAt)}.`);
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
        setWatch('Still watching for your payment', 'Klever mainnet is taking a moment to respond. We’ll retry automatically.', true);
      } finally {
        pollInFlight = false;
        checkNow.disabled = false;
        if (!quote) {
          payNow.disabled = true;
          checkNow.disabled = true;
          checkNow.textContent = 'Refresh quote to continue';
        } else if (checkNow.textContent !== 'Payment confirmed') {
          checkNow.disabled = false;
          checkNow.textContent = 'Check for payment now';
        }
        schedulePoll();
      }
    };
    const loadRate = async () => {
      if (settled || rateLoading) return;
      rateLoading = true;
      livePrice.textContent = 'Loading current KLV rate…';
      quoteExpiry.textContent = 'Swopus live pool · KLV/USDT';
      try {
        const result = await post(currentSession, { op: 'rate' });
        currentSession = result.session;
        const price = Number(result.data.usdPrice);
        if (!Number.isFinite(price) || price <= 0) throw new Error('Swopus returned an invalid KLV price.');
        liveKlvUsdPrice = price;
        const atomic = Math.ceil((selectedPlan().total / price) * 1_000_000);
        estimatedKlvAmount = (atomic / 1_000_000).toFixed(6);
        livePrice.textContent = `1 KLV = ${price.toFixed(8)} USDT`;
        quoteExpiry.textContent = `Live estimate · ${result.data.priceSource || 'Swopus'} KLV/USDT`;
        amountLabel.textContent = 'Estimated payment amount';
        amount.textContent = `${estimatedKlvAmount} KLV`;
      } catch (error) {
        livePrice.textContent = 'KLV rate temporarily unavailable';
        quoteExpiry.textContent = 'Swopus live pool · retry shortly';
        amount.textContent = 'Rate unavailable';
      } finally {
        rateLoading = false;
      }
    };
    const loadQuote = async () => {
      if (settled || quoteLoading) return;
      if (pollTimer) clearTimeout(pollTimer);
      quote = null;
      quoteLoading = true;
      payNow.disabled = true;
      payNow.textContent = 'Preparing KLV quote…';
      payNow.title = 'A fresh, wallet-bound KLV quote is being prepared.';
      refresh.disabled = true;
      checkNow.disabled = true;
      livePrice.textContent = 'Fetching live KLV price…';
      quoteExpiry.textContent = 'Swopus live pool · KLV/USDT';
      if (!estimatedKlvAmount) amount.textContent = 'Calculating…';
      amountLabel.textContent = 'Exact payment amount';
      copyAmount.disabled = !estimatedKlvAmount;
      setWatch('Preparing your Gate Pass', 'Getting a fresh KLV/USDT quote before you send anything.');
      const requestedPlanId = selectedPlanId;
      try {
        const result = await post(currentSession, { op: 'quote', plan: requestedPlanId });
        currentSession = result.session;
        if (requestedPlanId !== selectedPlanId) {
          quoteLoading = false;
          return loadQuote();
        }
        quote = result.data;
        livePrice.textContent = `1 KLV = $${Number(quote.usdPrice).toFixed(8)} USDT`;
        quoteExpiry.textContent = `${quote.priceSource || 'Swopus'} · Quote valid until ${dateLabel(quote.expiresAt)}`;
        amount.textContent = `${quote.klvAmount} KLV`;
        amountLabel.textContent = `Exact KLV amount · ${Number(quote.usdAmount).toFixed(2)} total`;
        payNow.disabled = false;
        payNow.textContent = 'Buy Membership';
        payNow.title = 'Approve the exact quoted KLV amount in Klever Wallet.';
        setWatch('Waiting for your KLV transfer', 'Once you send the exact amount from your linked wallet, we’ll detect it and activate your pass automatically.');
        checkNow.disabled = false;
        schedulePoll(2500);
      } catch (error) {
        quote = null;
        livePrice.textContent = 'Live KLV price unavailable';
        quoteExpiry.textContent = 'Tap Refresh quote to retry';
        payNow.disabled = true;
        payNow.textContent = 'Buy Membership';
        payNow.disabled = false;
        payNow.title = 'Select Buy Membership to retry the live payment quote. No payment has been requested.';
        setWatch('Could not load a live quote', error.message || 'The live KLV price service is temporarily unavailable. No payment has been requested.', true);
        checkNow.disabled = true;
      } finally {
        quoteLoading = false;
        refresh.disabled = false;
      }
    };
    payNow.addEventListener('click', async () => {
      if (settled || paymentInFlight) return;
      if (!status.walletAddress) {
        paymentInFlight = true;
        payNow.disabled = true;
        payNow.textContent = 'Connecting wallet…';
        setWatch('Connect your Klever wallet to pay', 'Your live KLV amount is already shown above. Klever Wallet will ask you to approve linking this wallet to your game account before payment.');
        try {
          currentSession = await linkKleverWallet(currentSession);
          const refreshed = await post(currentSession, { op: 'status' });
          currentSession = refreshed.session;
          status.walletAddress = refreshed.data.walletAddress || currentSession.kleverAddress || '';
          if (!status.walletAddress) throw new Error('The wallet was not linked to this game account. Please try again.');
          currentSession = saveAccount({ ...currentSession, kleverAddress: status.walletAddress });
          setWatch('Wallet linked', 'Preparing your exact KLV payment amount. Select Buy Membership again to approve the transfer.');
          await loadQuote();
        } catch (error) {
          setWatch('Wallet not linked', error.message || 'Klever Wallet could not be linked. Please try again.', true);
        } finally {
          paymentInFlight = false;
          if (!settled) {
            payNow.disabled = false;
            payNow.textContent = 'Buy Membership';
          }
        }
        return;
      }
      if (!quote) {
        await loadQuote();
        return;
      }
      paymentInFlight = true;
      payNow.disabled = true;
      refresh.disabled = true;
      checkNow.disabled = true;
      payNow.textContent = 'Approve in Klever Wallet…';
      setWatch('Approve your payment in Klever Wallet', `Review the ${quote.klvAmount} KLV transfer to the Monster Gate membership vault. Your wallet will ask you to sign it.`);
      try {
        paymentHash = await sendSignedKlvTransfer(quote, status.walletAddress);
        payNow.textContent = 'Payment sent';
        setWatch('Transfer broadcast — verifying', 'Your signed transaction was submitted. We are waiting for Klever mainnet confirmation before activating access.');
        schedulePoll(1000);
        checkPayment();
      } catch (error) {
        const message = error?.message || 'The payment could not be signed.';
        setWatch('Payment not sent', message, true);
        payNow.textContent = 'Buy Membership';
        payNow.disabled = false;
      } finally {
        paymentInFlight = false;
        refresh.disabled = false;
        if (quote && !paymentHash) checkNow.disabled = false;
      }
    });
    checkNow.addEventListener('click', () => {
      if (pollTimer) clearTimeout(pollTimer);
      checkPayment();
    });
    refresh.addEventListener('click', () => status.walletAddress ? loadQuote() : loadRate());
    close.addEventListener('click', () => finish(false));
    overlay.addEventListener('click', (event) => { if (event.target === overlay) finish(false); });

    paymentPanel.append(priceGrid, tokenLine, amountLabel, amountRow, watch, actions, footnote, explorer);
    card.append(close, head, title, intro, codePanel, paymentPanel);
    overlay.append(card);
    document.body.append(overlay);
    document.addEventListener('keydown', onKeyDown);
    if (status.walletAddress) {
      loadQuote();
    } else {
      loadRate();
      payNow.disabled = false;
      payNow.textContent = 'Buy Membership';
      payNow.title = 'View the live KLV estimate above, then select Buy Membership to connect your wallet and pay.';
      checkNow.disabled = true;
      refresh.disabled = false;
      setWatch('Ready to buy membership', 'Your live KLV amount is shown above. Select Buy Membership when you are ready to connect Klever Wallet and approve payment.');
    }
  });
}
