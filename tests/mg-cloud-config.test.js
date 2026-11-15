import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  CONFIG_ATTEMPTS,
  loadCloudConfig,
  parseCloudJson,
  readCloudConfig,
  resetCloudConfig,
  viteCloudConfig,
} from '../src/wallet/cloud.js';
import { CLOUD_UNAVAILABLE } from '../src/wallet/account.js';
import { resolveSupabaseConfig } from '../vite.config.js';

const src = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const emptyEnv = {};

function okFetch(url = 'https://proj.supabase.co', key = 'sb_publishable_test') {
  return async () => ({ ok: true, json: async () => ({ url, key }) });
}

test('viteCloudConfig uses baked URL + publishable key and rejects service role', () => {
  assert.deepEqual(viteCloudConfig(emptyEnv), { url: '', key: '' });
  const baked = viteCloudConfig({
    VITE_SUPABASE_URL: 'https://proj.supabase.co/',
    VITE_SUPABASE_ANON_KEY: 'sb_publishable_test',
  });
  assert.equal(baked.url, 'https://proj.supabase.co');
  assert.equal(baked.key, 'sb_publishable_test');
  const role = viteCloudConfig({
    VITE_SUPABASE_URL: 'https://proj.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'eyJ.service_role.xx',
  });
  assert.equal(role.key, '');
});

test('readCloudConfig retries supabase.json before giving up', async () => {
  resetCloudConfig();
  let n = 0;
  const fetchFn = async () => {
    n += 1;
    if (n < 3) throw new Error('offline');
    return { ok: true, json: async () => ({ url: 'https://proj.supabase.co', key: 'sb_publishable_ok' }) };
  };
  const cfg = await readCloudConfig({ fetchFn, env: emptyEnv, sleep: async () => {} });
  assert.equal(n, 3);
  assert.equal(cfg.url, 'https://proj.supabase.co');
  assert.equal(cfg.key, 'sb_publishable_ok');
  assert.equal(CONFIG_ATTEMPTS, 3);
});

test('loadCloudConfig does not cache an empty failure', async () => {
  resetCloudConfig();
  let n = 0;
  const fetchFn = async () => {
    n += 1;
    if (n === 1) return { ok: false };
    return { ok: true, json: async () => ({ url: 'https://proj.supabase.co', key: 'sb_publishable_ok' }) };
  };
  const first = await loadCloudConfig({ fetchFn, env: emptyEnv, attempts: 1, sleep: async () => {} });
  assert.equal(first.url, '');
  assert.equal(n, 1);
  const second = await loadCloudConfig({ fetchFn, env: emptyEnv, attempts: 1, sleep: async () => {} });
  assert.equal(second.url, 'https://proj.supabase.co');
  assert.equal(n, 2);
  resetCloudConfig();
});

test('a successful config is cached until reset', async () => {
  resetCloudConfig();
  let n = 0;
  const fetchFn = async () => {
    n += 1;
    return { ok: true, json: async () => ({ url: 'https://proj.supabase.co', key: 'sb_publishable_ok' }) };
  };
  await loadCloudConfig({ fetchFn, env: emptyEnv, attempts: 1 });
  await loadCloudConfig({ fetchFn, env: emptyEnv, attempts: 1 });
  assert.equal(n, 1);
  resetCloudConfig();
  await loadCloudConfig({ fetchFn, env: emptyEnv, attempts: 1 });
  assert.equal(n, 2);
  resetCloudConfig();
});

test('parseCloudJson ignores junk and service-role keys', () => {
  assert.deepEqual(parseCloudJson({}), { url: '', key: '' });
  assert.deepEqual(parseCloudJson({ url: 'https://proj.supabase.co', key: 'anon' }).url, 'https://proj.supabase.co');
  assert.equal(parseCloudJson({ url: 'https://evil.example', key: 'anon' }).url, '');
  assert.equal(parseCloudJson({ url: 'https://proj.supabase.co', key: 'service_role_xxx' }).key, '');
});

test('account copy, Retry, and Vite bake stay wired', () => {
  const account = src('../src/wallet/account.js');
  const main = src('../src/main.js');
  const html = src('../index.html');
  const vite = src('../vite.config.js');
  assert.match(account, /CLOUD_UNAVAILABLE/);
  assert.equal(CLOUD_UNAVAILABLE, "Couldn't reach the account service. Check your connection and try again.");
  assert.doesNotMatch(account, /Supabase is not connected to this site yet/);
  assert.match(html, /id="account-retry"[^>]*>Retry/);
  assert.match(main, /account-retry/);
  assert.match(main, /err\.code !== 'unavailable'/);
  assert.match(vite, /VITE_SUPABASE_URL/);
  assert.match(vite, /VITE_SUPABASE_ANON_KEY/);
  assert.match(vite, /resolveSupabaseConfig/);
  assert.match(src('../src/wallet/cloud.js'), /import\.meta\.env\.VITE_SUPABASE_URL/);
  assert.match(src('../src/wallet/cloud.js'), /import\.meta\.env\.VITE_SUPABASE_ANON_KEY/);
  const fromEnv = resolveSupabaseConfig({
    VITE_SUPABASE_URL: 'https://from-env.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'from-env-key',
  });
  assert.equal(fromEnv.url, 'https://from-env.supabase.co');
  assert.equal(fromEnv.key, 'from-env-key');
});

test('okFetch helper shape matches parseCloudJson', async () => {
  const res = await okFetch()();
  const json = await res.json();
  assert.equal(parseCloudJson(json).url, 'https://proj.supabase.co');
});
