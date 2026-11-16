import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { ADMIN_EMAIL as GATE_EMAIL } from '../src/admin/gate.js';
import { drawerHtml, esc, stageHtml } from '../src/admin/view.js';
import {
  ADMIN_EMAIL,
  buildLedger,
  creatureName,
  filterPlayers,
  isAdminEmail,
  present,
  sortPlayers,
} from '../supabase/functions/_shared/ledger.js';

const NOW = Date.UTC(2026, 10, 15, 12, 0, 0);
const BRAM = '11111111-1111-4111-8111-111111111111';
const LIRA = '22222222-2222-4222-8222-222222222222';

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git' || name === 'dist') continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(js|ts|html|css|sql|json|md)$/.test(name)) out.push(path);
  }
  return out;
}

test('the guild master email is one address and the password is not in the source', () => {
  assert.equal(GATE_EMAIL, ADMIN_EMAIL);
  assert.equal(isAdminEmail('  MonsterGateOnline@gmail.com '), true);
  assert.equal(isAdminEmail('hunter@hunt.test'), false);
  const root = new URL('..', import.meta.url).pathname;
  const secret = ['OMFG', 'nub', '123'].join('');
  for (const file of walk(root)) {
    assert.equal(readFileSync(file, 'utf8').includes(secret), false, file);
  }
});

test('a roster becomes hunters, gold, slain, path, and level', () => {
  const ledger = buildLedger({
    accounts: [
      {
        user_id: BRAM,
        email: 'bram@hunt.test',
        revision: 4,
        updated_at: new Date(NOW - 60 * 60 * 1000).toISOString(),
        created_at: new Date(NOW - 3 * 86400000).toISOString(),
        progress: {
          roster: {
            chars: [
              {
                id: 'c1',
                name: 'A<b>',
                playedAt: NOW - 1000,
                hunt: {
                  gold: 120,
                  kills: { slime: 6, budgedragon: 2, chicken: 3 },
                  skills: { classId: 'warrior', learned: { fortify: true, shieldbash: true } },
                  xp: { strength: 5000 },
                  hunter: { rank: 2, realm: 'over', quest: { text: 'Slay the gate' } },
                },
              },
              {
                id: 'c2',
                name: 'Lira',
                hunt: {
                  gold: 40,
                  kills: { slime: 1 },
                  skills: { classId: 'mage', learned: { kindle: true } },
                  hunter: { realm: 'cave', rank: 0 },
                },
              },
            ],
            deleted: [{ name: 'Old', deletedAt: NOW - 5000 }],
          },
        },
      },
      {
        user_id: LIRA,
        email: ADMIN_EMAIL,
        updated_at: new Date(NOW).toISOString(),
        created_at: new Date(NOW).toISOString(),
        progress: { gold: 9999, kills: { slime: 99 } },
      },
    ],
    wallets: [
      {
        address: 'klv1hunter',
        updated_at: new Date(NOW - 10 * 86400000).toISOString(),
        created_at: new Date(NOW - 12 * 86400000).toISOString(),
        facts: { gold: 10, kills: { slime: 2 } },
        progress: { gold: 1 },
      },
    ],
  }, NOW);

  assert.equal(ledger.players.some((player) => player.email === ADMIN_EMAIL), false);
  assert.equal(JSON.stringify(ledger).includes('"progress"'), false);
  const bram = ledger.players.find((player) => player.email === 'bram@hunt.test');
  assert.equal(bram.characters, 2);
  assert.equal(bram.gold, 160);
  assert.equal(bram.kills, 12);
  assert.equal(bram.className, 'Warrior');
  assert.equal(bram.pathName, 'Tank');
  assert.equal(bram.roster[0].pathDepth, 2);
  assert.ok(bram.level > 1);
  assert.equal(bram.roster[1].level, 1);
  assert.equal(bram.roster[0].slain.find((row) => row.id === 'budgedragon').name, 'Green Budge Dragon');
  assert.equal(creatureName('budgedragon'), 'Green Budge Dragon');
  assert.equal(bram.retired.length, 1);
  assert.equal(bram.rankLetter, 'D');

  const wallet = ledger.players.find((player) => player.kind === 'wallet');
  assert.equal(wallet.gold, 10);
  assert.equal(wallet.kills, 2);
  assert.equal(wallet.name, 'Hunter');

  const pulse = present(ledger, { now: NOW }).pulse;
  assert.equal(pulse.accounts, 1);
  assert.equal(pulse.wallets, 1);
  assert.equal(pulse.hunters, 3);
  assert.equal(pulse.gold, 170);
  assert.equal(pulse.kills, 14);
  assert.equal(pulse.median, 85);
  assert.equal(pulse.active.h24, 1);
  assert.equal(pulse.active.d30, 2);
  assert.equal(pulse.classes.find((row) => row.id === 'warrior').n, 1);
  assert.equal(pulse.classes.find((row) => row.id === 'mage').n, 1);
  assert.equal(pulse.retired, 1);
  assert.equal(pulse.paths.find((row) => row.id === 'tank').n, 1);
  assert.equal(pulse.realms.find((row) => row.id === 'cave').n, 1);
});

test('filters, sort, and the screen escape hunter names', () => {
  const ledger = buildLedger({
    accounts: [
      {
        user_id: BRAM,
        email: 'bram@hunt.test',
        updated_at: new Date(NOW - 60 * 60 * 1000).toISOString(),
        created_at: new Date(NOW - 86400000).toISOString(),
        progress: {
          roster: {
            chars: [{
              id: 'c1',
              name: 'A<b>',
              hunt: { gold: 120, kills: { slime: 4 }, skills: { classId: 'warrior' }, xp: { strength: 5000 } },
            }],
          },
        },
      },
    ],
  }, NOW);
  const [player] = ledger.players;
  assert.equal(filterPlayers(ledger.players, { query: 'bram', now: NOW }).length, 1);
  assert.equal(filterPlayers(ledger.players, { query: 'nope', now: NOW }).length, 0);
  assert.equal(filterPlayers(ledger.players, { classId: 'mage', now: NOW }).length, 0);
  assert.equal(filterPlayers(ledger.players, { creature: 'slime', now: NOW }).length, 1);
  assert.equal(filterPlayers(ledger.players, { window: '1', now: NOW + 3 * 86400000 }).length, 0);
  assert.equal(filterPlayers(ledger.players, { bucket: '100', now: NOW }).length, 1);
  assert.equal(sortPlayers(ledger.players, 'gold', 'asc')[0].gold, 120);

  const screen = present(ledger, { now: NOW, tab: 'hunters', selected: ledger.players[0].id });
  const html = stageHtml(screen, { tab: 'hunters', sort: 'updated', dir: 'desc' });
  const drawer = drawerHtml(screen, { char: 0 });
  assert.match(html, /A&lt;b&gt;/);
  assert.doesNotMatch(html, /A<b>/);
  assert.match(drawer, /A&lt;b&gt;/);
  assert.match(html, /Warrior/);
  assert.equal(esc('<>&"\''), '&lt;&gt;&amp;&quot;&#39;');
  assert.equal(player.email, 'bram@hunt.test');
});
