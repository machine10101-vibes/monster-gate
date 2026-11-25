import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const edge = readFileSync(new URL('../supabase/functions/membership/index.ts', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../supabase/migrations/20261125040000_gate_pass_subscription_tiers.sql', import.meta.url), 'utf8');

test('server only accepts the three published prepaid membership tiers', () => {
  assert.match(edge, /"monthly":\{days:30,usd:5\}/);
  assert.match(edge, /"six-month":\{days:180,usd:27\}/);
  assert.match(edge, /"annual":\{days:365,usd:48\}/);
  assert.match(edge, /usd_amount:plan\.usd,duration_days:plan\.days/);
  assert.match(edge, /const atomic=BigInt\(Math\.ceil\(plan\.usd\/p\.price\*1e6\)\)/);
});

test('verified payment activates the exact duration recorded in its server quote', () => {
  assert.match(migration, /duration_days not in \(30,180,365\)/);
  assert.match(migration, /v_quoted_amount<>p_amount_atomic/);
  assert.match(migration, /v_quoted_price<>p_usd_price/);
  assert.match(migration, /make_interval\(days=>v_duration_days\)/);
  assert.match(migration, /membership_quotes_term_price_check/);
});
