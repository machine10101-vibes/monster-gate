/**
 * Bring hunter saves from machine10101-vibes.github.io over to monstergate.online.
 *
 * github.io/monster-gate 301s at GitHub, so that path cannot run. localStorage is
 * per origin: a Pages repo on the same github.io host can still read the old keys
 * first-party. That repo (mg-save-bridge) redirects top-level here with #mgimport=.
 */

import { ANON_KEY } from './progress.js';
import { META_KEY } from './roster.js';
import { dumpRaw, dropKey, importRaw } from './saveio.js';
import { decorateFrame } from '../ui/theme.js';

export const MIGRATED_KEY = 'mg_migrated';
export const BRIDGE_URL = 'https://machine10101-vibes.github.io/mg-save-bridge/';
export const HOME_ORIGIN = 'https://monstergate.online';

const NAME_KEY = 'mg-name';
const QUALITY_KEY = 'mg-quality';

export function isSaveKey(key) {
  const k = String(key || '');
  if (!k || k === MIGRATED_KEY || k === 'mg-boot') return false;
  return k.startsWith('monster-gate-') || k === NAME_KEY || k === QUALITY_KEY;
}

export function isHuntKey(key) {
  const k = String(key || '');
  return k === ANON_KEY || k.startsWith(`${ANON_KEY}:`) || k === META_KEY || k.startsWith(`${META_KEY}:`);
}

export function hasLocalSave() {
  const dump = dumpRaw();
  return Object.keys(dump).some((key) => isHuntKey(key) && dump[key]);
}

export function collectSaves() {
  const dump = dumpRaw();
  const ls = {};
  for (const [key, value] of Object.entries(dump)) {
    if (isSaveKey(key)) ls[key] = value;
  }
  return { v: 1, ls };
}

export function allowedReturn(raw) {
  try {
    const url = new URL(String(raw || ''), HOME_ORIGIN);
    if (url.protocol === 'https:' && url.hostname === 'monstergate.online') {
      return `${HOME_ORIGIN}/`;
    }
  } catch {
    /* fall through */
  }
  return `${HOME_ORIGIN}/`;
}

export function parseImportHash(hash) {
  const raw = String(hash || '');
  const body = raw.startsWith('#') ? raw.slice(1) : raw;
  if (!body.startsWith('mgimport=')) return { present: false, value: '' };
  let value = body.slice('mgimport='.length);
  try {
    value = decodeURIComponent(value);
  } catch {
    /* already decoded */
  }
  return { present: true, value };
}

export function shouldAutoHop({ hash = '', host = '', migrated = false } = {}) {
  if (parseImportHash(hash).present) return false;
  if (migrated) return false;
  if (host !== 'monstergate.online' && host !== 'www.monstergate.online') return false;
  if (hasLocalSave()) return false;
  return true;
}

export function markMigrated() {
  try {
    localStorage.setItem(MIGRATED_KEY, '1');
  } catch {
    /* private mode */
  }
}

export function readMigrated() {
  try {
    return localStorage.getItem(MIGRATED_KEY) === '1';
  } catch {
    return false;
  }
}

export function toBase64Url(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = '';
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  const b64 = typeof btoa === 'function' ? btoa(bin) : Buffer.from(u8).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(text) {
  const pad = text.length % 4 === 0 ? '' : '='.repeat(4 - (text.length % 4));
  const b64 = String(text || '').replace(/-/g, '+').replace(/_/g, '/') + pad;
  if (typeof atob === 'function') {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

async function gzipText(text) {
  const bytes = new TextEncoder().encode(text);
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function gunzipText(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new TextDecoder().decode(await new Response(stream).arrayBuffer());
}

export async function encodeBundle(bundle) {
  const json = JSON.stringify(bundle && typeof bundle === 'object' ? bundle : { v: 1, ls: {} });
  return toBase64Url(await gzipText(json));
}

export async function decodeBundle(text) {
  const raw = String(text || '');
  if (!raw || raw === 'none') return null;
  const json = await gunzipText(fromBase64Url(raw));
  const data = JSON.parse(json);
  if (!data || typeof data !== 'object' || data.ls == null || typeof data.ls !== 'object' || Array.isArray(data.ls)) {
    throw new Error('bad payload');
  }
  return { v: 1, ls: data.ls };
}

export function applyBundle(bundle, { overwrite = false } = {}) {
  const ls = bundle?.ls && typeof bundle.ls === 'object' ? bundle.ls : null;
  if (!ls) return { applied: false, reason: 'empty' };
  if (hasLocalSave() && !overwrite) return { applied: false, reason: 'exists' };
  if (overwrite) {
    const drop = Object.keys(dumpRaw()).filter((key) => isSaveKey(key));
    for (const key of drop) dropKey(key);
  }
  let n = 0;
  for (const [key, value] of Object.entries(ls)) {
    if (!isSaveKey(key)) continue;
    if (importRaw(key, value)) n += 1;
  }
  return { applied: n > 0, count: n };
}

export function stripImportHash() {
  if (typeof history === 'undefined' || typeof location === 'undefined') return;
  try {
    history.replaceState(null, '', `${location.pathname}${location.search}`);
  } catch {
    location.hash = '';
  }
}

function liveHost(host) {
  return host === 'monstergate.online' || host === 'www.monstergate.online';
}

async function bridgeReachable() {
  try {
    const res = await fetch(BRIDGE_URL, { cache: 'no-store', mode: 'cors' });
    return res.ok;
  } catch {
    return false;
  }
}

function showPrompt(bundle) {
  return new Promise((resolve) => {
    const existing = hasLocalSave();
    const root = document.createElement('div');
    root.id = 'mg-import';
    root.innerHTML = `
      <div class="mg-import-card mg-frame">
        <small>Save restore</small>
        <h2>Old hunters</h2>
        <p class="mg-import-msg">Bring over your hunters from the old site?</p>
        <p class="mg-import-warn" hidden>This will replace hunters already on this device.</p>
        <div class="mg-import-actions">
          <button type="button" class="start" data-act="import">Import</button>
          <button type="button" class="start quiet" data-act="skip">Skip</button>
        </div>
      </div>`;
    const warn = root.querySelector('.mg-import-warn');
    if (existing && warn) warn.hidden = false;
    decorateFrame(root.querySelector('.mg-import-card'));
    (document.getElementById('app') || document.body).appendChild(root);
    const finish = (imported) => {
      root.remove();
      stripImportHash();
      resolve(imported);
    };
    root.querySelector('[data-act="skip"]').addEventListener('click', () => finish(false));
    root.querySelector('[data-act="import"]').addEventListener('click', () => {
      const result = applyBundle(bundle, { overwrite: existing });
      if (!result.applied && existing) {
        warn.hidden = false;
        warn.textContent = 'Could not replace the hunters already on this device.';
        return;
      }
      finish(true);
    });
  });
}

/**
 * Handle #mgimport= and the one-time hop to the github.io bridge.
 * Returns `away` when this page is navigating off, otherwise `go`.
 */
export async function runLegacySaveBridge() {
  if (typeof location === 'undefined') return 'go';
  const parsed = parseImportHash(location.hash);
  if (parsed.present) {
    markMigrated();
    if (!parsed.value || parsed.value === 'none') {
      stripImportHash();
      return 'go';
    }
    let bundle = null;
    try {
      bundle = await decodeBundle(parsed.value);
    } catch {
      stripImportHash();
      return 'go';
    }
    if (!bundle || !Object.keys(bundle.ls).some((key) => isSaveKey(key))) {
      stripImportHash();
      return 'go';
    }
    await showPrompt(bundle);
    return 'go';
  }
  if (!shouldAutoHop({ hash: location.hash, host: location.hostname, migrated: readMigrated() })) {
    return 'go';
  }
  if (!(await bridgeReachable())) return 'go';
  markMigrated();
  location.replace(BRIDGE_URL);
  return 'away';
}

export async function openLegacyBridge() {
  if (!(await bridgeReachable())) return false;
  location.assign(BRIDGE_URL);
  return true;
}
