import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { DEFS, TYPES } from '../src/entities/desertAI.js';
import { CROC_ZONE, patrolPoint, tailWave, inPool, SINK } from '../src/entities/oasiscrocAI.js';
import { buildOasisCrocodile } from '../src/entities/oasiscrocModel.js';
import { buildMaterialModel } from '../src/entities/gearModels.js';
import { MONSTERS, DROPS, MATERIALS, MATERIAL_ORDER } from '../src/data/catalog.js';
import { OASIS } from '../src/world/desert.js';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('the Oasis Crocodile is a level 80 desert beast with stats between the scorpion and the worm', () => {
  assert.ok(TYPES.has('oasiscroc'));
  const d = DEFS.oasiscroc;
  const cat = MONSTERS.find((m) => m.id === 'oasiscroc');
  assert.equal(cat.level, 80);
  assert.match(cat.habitat, /Oasis/);
  // Stats sit between the level 6 scorpion and the level 125 worm.
  assert.ok(d.hp > DEFS.scorpion.hp * 5 && d.hp < DEFS.sandworm.hp);
  assert.ok(d.dmg > DEFS.scorpion.dmg && d.dmg <= DEFS.sandworm.dmg);
  assert.ok(d.gold[0] > DEFS.scorpion.gold[1] && d.gold[1] < DEFS.sandworm.gold[0]);
});

test('crocodile drops are new level 80 parts with a rare amber eye', () => {
  const drops = DROPS.oasiscroc;
  assert.deepEqual(drops.map((d) => d.id), ['crochide', 'croctooth', 'crocscute', 'crocamber']);
  assert.deepEqual(drops.map((d) => d.rate), ['Common', 'Common', 'Uncommon', 'Rare']);
  for (const d of drops) {
    assert.ok(MATERIALS[d.id], d.id);
    assert.ok(MATERIAL_ORDER.includes(d.id), d.id);
    assert.ok(buildMaterialModel(d.id), `${d.id} has a 3D model`);
  }
  // Parts keep the flat 5 gold merchant price (approved 2026-11-27).
  for (const d of drops) assert.equal(MATERIALS[d.id].price, undefined);
  assert.match(src('src/main.js'), /this\.addGold\(n \* 5\)/);
});

test('ten crocodiles spawn around the pool and refill; they move only in the shallows and near the bank', () => {
  const mon = src('src/entities/monsters.js');
  assert.match(mon, /export const OASIS_CROCS = 10;/);
  assert.match(mon, /for \(let i = 0; i < OASIS_CROCS; i\+\+\)[\s\S]{0,120}this\.spawn\('oasiscroc'/);
  assert.match(mon, /this\.fillOasis\(\);/);
  assert.match(mon, /if \(this\.type === 'oasiscroc'\) \{[\s\S]{0,260}d > CROC_ZONE\.leash\) return false;[\s\S]{0,80}d >= CROC_ZONE\.swimIn/);
  assert.ok(CROC_ZONE.swimIn < OASIS.r && CROC_ZONE.bank > OASIS.r && CROC_ZONE.leash <= OASIS.r + OASIS.shore + 12);
});

test('patrol points stay mostly on the waterline, sometimes in the shallows, rarely a little way up the bank', () => {
  let edge = 0;
  let water = 0;
  let bank = 0;
  const N = 4000;
  for (let i = 0; i < N; i++) {
    const p = patrolPoint({ x: OASIS.x + 34, z: OASIS.z });
    const r = Math.hypot(p.x - OASIS.x, p.z - OASIS.z);
    assert.ok(r >= CROC_ZONE.swimIn - 0.01 && r <= CROC_ZONE.haul + 0.01, `patrol radius ${r}`);
    if (r < OASIS.r - 2) water++;
    else if (r <= OASIS.r + 4) edge++;
    else bank++;
  }
  assert.ok(edge / N > 0.5, `edge ${edge / N}`);
  assert.ok(water / N > 0.15 && water / N < 0.35, `water ${water / N}`);
  assert.ok(bank / N > 0.05 && bank / N < 0.25, `bank ${bank / N}`);
  assert.equal(inPool(OASIS.x + OASIS.r - 1, OASIS.z), true);
  assert.equal(inPool(OASIS.x + OASIS.r + 1, OASIS.z), false);
});

test('the tail lies level with the ground and waves as one travelling wave toward the tip', () => {
  const { root, parts } = buildOasisCrocodile();
  assert.equal(parts.tail.length, 6);
  assert.equal(parts.legs.length, 4);
  assert.ok(parts.jaw && parts.head);
  root.updateMatrixWorld(true);
  const box = (o) => new THREE.Box3().setFromObject(o);
  const body = box(parts.body.children.find((c) => c.isMesh));
  const tip = box(parts.tail[5].children.find((c) => c.isMesh));
  const tailRoot = box(parts.tail[0].children.find((c) => c.isMesh));
  // Level: the tail never rises above the body's back, and the tip lies low near the ground.
  for (const seg of parts.tail) assert.ok(box(seg.children.find((c) => c.isMesh)).max.y <= body.max.y + 0.05);
  assert.ok(tip.max.y < 0.35, `tip top ${tip.max.y.toFixed(2)}`);
  assert.ok(tip.max.z < tailRoot.min.z, 'tail runs straight back behind the body');
  // Each joint lags the one before and swings wider toward the tip.
  const amps = [0, 1, 2, 3, 4, 5].map((i) => Math.max(...Array.from({ length: 64 }, (_, k) => Math.abs(tailWave((k / 64) * Math.PI * 2, 0.3, i)))));
  for (let i = 1; i < 6; i++) assert.ok(amps[i] > amps[i - 1]);
  const peakAt = (i) => {
    let best = 0;
    let at = 0;
    for (let k = 0; k < 360; k++) {
      const v = tailWave((k / 360) * Math.PI * 2, 0.3, i);
      if (v > best) {
        best = v;
        at = k;
      }
    }
    return at;
  };
  assert.ok(peakAt(1) > peakAt(0) && peakAt(2) > peakAt(1), 'the wave travels from root to tip');
  assert.ok(SINK > 0 && SINK < 0.3, 'swimming crocodiles ride low but stay visible');
});
