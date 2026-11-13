/** Wallet-keyed hunter auth/load/save is gone. Email accounts own hunts. */

export const RETIRED_HUNTER_OPS = ['auth', 'load', 'save'];
export const RETIRED_HUNTER_STATUS = 410;
export const RETIRED_HUNTER_ERROR =
  'Wallet-only hunter saves are gone. Sign in with email, then connect your wallet in Account settings.';

export function isRetiredHunterOp(op) {
  return RETIRED_HUNTER_OPS.includes(String(op || ''));
}
