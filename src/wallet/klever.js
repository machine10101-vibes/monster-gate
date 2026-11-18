import { web } from '@klever/sdk-web';
import { publicKeyFromAddress, verifyKleverSignature } from './verify.js';
import { signedMessage } from '../../supabase/functions/_shared/linkAuth.js';

export const SESSION_KEY = 'monster-gate-klever-session';
const PROMPT_LOCK = 'monster-gate-klever-prompt-lock';
const SIGNER_KEY = 'monster-gate-klever-signer';
const PROMPT_COOL_MS = 90_000;
export const KLEVER_EXTENSION = 'https://chromewebstore.google.com/detail/klever-wallet/ifclboecfhkjbpmhgehodcjpciihhmif';
export const KLEVER_ANDROID = 'https://play.google.com/store/apps/details?id=finance.klever.bitcoin.wallet';
export const KLEVER_IOS = 'https://apps.apple.com/app/klever-wallet-bitcoin-crypto/id1615064243';

const ADDRESS_RE = /^klv1[02-9ac-hj-np-z]{58}$/;
const ADDRESS_SPACE_RE = /[\u0000-\u0020\u007f\u00a0\u1680\u2000-\u200a\u200b\u200c\u200d\u2028\u2029\u202f\u205f\u3000\ufeff]+/g;
const ADDRESS_KEYS = ['address', 'addr', 'walletAddress', 'account'];

/**
 * The account Klever will sign with. The app sometimes wraps it, capitalizes
 * it, or puts a space in the middle. The proof needs the 62-character klv1
 * address and nothing else.
 */
export function normalizeKleverAddress(value, depth = 0) {
  if (value == null || depth > 4) return '';
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = normalizeKleverAddress(item, depth + 1);
      if (found) return found;
    }
    return '';
  }
  if (typeof value === 'object') {
    for (const key of A¶»§q«^