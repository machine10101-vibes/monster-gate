import { bech32 } from 'bech32';
import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha2.js';
import { keccak_256 } from '@noble/hashes/sha3.js';

// Sync verification needs a SHA-512 implementation. The wallet never sees this key.
ed.hashes.sha512 = sha512;

const PREFIX = '\u0017Klever Signed Message:\n';
// Older Klever builds sign the same line without the leading length byte.
const LEGACY_PREFIX = 'Klever Signed Message:\n';

/** Klever addresses are bech32 encodings of the 32-byte Ed25519 public key. */
export function publicKeyFromAddress(address) {
  if (typeof address !== 'string' || !address.startsWith('klv1')) return null;
  let decoded;
  try {
    decoded = bech32.decode(address, 120);
  } catch {
    return null;
  }
  if (decoded.prefix !== 'klv') return null;
  const bytes = Uint8Array.from(bech32.fromWords(decoded.words));
  return bytes.length === 32 ? bytes : null;
}

export function addressFromPublicKey(publicKey) {
  return bech32.encode('klv', bech32.toWords(publicKey), 120);
}

/**
 * Hash the extension and the Klever Wallet app actually sign.
 * The prefix keeps a login signature from ever being a transaction.
 */
function preparedHash(body, length) {
  return keccak_256(preparedBytes(body, length));
}

function preparedBytes(body, length, prefixText = PREFIX) {
  const prefix = new TextEncoder().encode(prefixText);
  const digits = new TextEncoder().encode(String(length));
  const bytes = new Uint8Array(prefix.length + digits.length + body.length);
  bytes.set(prefix, 0);
  bytes.set(digits, prefix.length);
  bytes.set(body, prefix.length + digits.length);
  return bytes;
}

/** Klever's prepare_message uses the UTF-8 byte length, then keccak256. */
export function kleverMessageHash(message) {
  const body = new TextEncoder().encode(String(message));
  return preparedHash(body, body.length);
}

function hexText(body) {
  let out = '';
  for (let i = 0; i < body.length; i++) out += body[i].toString(16).padStart(2, '0');
  return out;
}

/**
 * The extension popup URI-encodes the message before showing it, then decodes
 * it again before signing. A build that signs the encoded text is the same
 * login: the encoding is a pure function of the message the hunter saw.
 */
function signedTexts(message) {
  const text = String(message);
  const texts = [text];
  if (text.includes('\n')) texts.push(text.replace(/\n/g, '\r\n'));
  const encoded = encodeURIComponent(text);
  if (encoded !== text) texts.push(encoded);
  try {
    const decoded = decodeURIComponent(text);
    if (!texts.includes(decoded)) texts.push(decoded);
  } catch {
    /* the message is not URI-encoded */
  }
  return texts;
}

function accepts(compact, pub, text) {
  const body = new TextEncoder().encode(text);
  const prefixed = preparedBytes(body, body.length);
  const prefix = new TextEncoder().encode(PREFIX);
  const withPrefix = new Uint8Array(prefix.length + body.length);
  withPrefix.set(prefix, 0);
  withPrefix.set(body, prefix.length);
  const hexBody = new TextEncoder().encode(hexText(body));
  const payloads = [
    preparedHash(body, body.length),
    keccak_256(preparedBytes(body, body.length, LEGACY_PREFIX)),
    body,
    prefixed,
    withPrefix,
    keccak_256(withPrefix),
    keccak_256(body),
    preparedHash(hexBody, hexBody.length),
    hexBody,
  ];
  // The extension's own validator uses the JavaScript string length.
  if (text.length !== body.length) payloads.push(preparedHash(body, text.length));
  return payloads.some((payload) => {
    try {
      return ed.verify(compact, payload, pub);
    } catch {
      return false;
    }
  });
}

export function signatureBytes(signature) {
  const raw = signature == null ? '' : String(signature).trim().replace(/^0x/i, '');
  if (/^[0-9a-fA-F]+$/.test(raw) && raw.length % 2 === 0) {
    const out = new Uint8Array(raw.length / 2);
    for (let i = 0; i < out.length; i++) out[i] = Number.parseInt(raw.slice(i * 2, i * 2 + 2), 16);
    return out;
  }
  try {
    const bin = atob(raw);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return new Uint8Array();
  }
}

/** True only when `signature` was produced by the private key behind `address`. */
export function verifyKleverSignature(message, signature, address) {
  const pub = publicKeyFromAddress(address);
  const sig = signatureBytes(signature);
  if (!pub || sig.length < 64) return false;
  const compact = sig.length === 64 ? sig : sig.slice(0, 64);
  return signedTexts(message).some((text) => accepts(compact, pub, text));
}
