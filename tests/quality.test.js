import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { QUALITIES, QUALITY_CHOICE_KEY, chooseBootQuality, qualityById, readSavedQuality } from '../src/engine/quality.js';

const src = (rel) => readFileSync(new URL('../' + rel, import.meta.url), 'utf8');

test('settings offers Low, Medium, and High', () => {
  const hud = src('src/ui/hud.js');
  assert.match(hud, /class="gfx-switch"/);
  assert.match(hud, /QUALITIES\.map/);
  assert.match(hud, /game\.setQuality\(btn\.dataset\.q\)/);
  assert.deepEqual(QUALITIES.map((q) => q.label), ['Low', 'Medium', 'High']);
});

test('a phone with no saved choice boots on High and can still select the others', () => {
  const boot = chooseBootQuality({ safeBoot: true, desktop: false, cores: 4 });
  assert.equal(boot.quality.id, 'high');
  assert.equal(boot.quality.label, 'High');
  assert.equal(boot.quality.dpr, 2);
  assert.equal(boot.light, false);
  assert.equal(qualityById('medium').label, 'Medium');
  assert.equal(qualityById('high').label, 'High');
});

test('a saved Medium or High choice is the one the next launch uses', () => {
  const medium = chooseBootQuality({ saved: qualityById('medium'), safeBoot: true });
  assert.equal(medium.quality.id, 'medium');
  assert.equal(medium.quality.label, 'Medium');
  assert.equal(medium.quality.dpr, 1.25);
  assert.equal(medium.light, false);

  const high = chooseBootQuality({ saved: qualityById('high'), safeBoot: true });
  assert.equal(high.quality.id, 'high');
  assert.equal(high.quality.shadowSize, 3072);
  assert.equal(high.quality.density, 1);
});

test('a boot that died restarts on Low without forgetting that Low is one of three presets', () => {
  const boot = chooseBootQuality({ saved: qualityById('high'), safeBoot: true, killed: true });
  assert.equal(boot.quality.id, 'low');
  assert.equal(boot.quality.label, 'Low');
  assert.equal(boot.recovered, true);
  assert.equal(boot.light, true);
  assert.equal(boot.quality.shadows, false);
});

test('a desktop with no saved choice starts on High', () => {
  const boot = chooseBootQuality({ safeBoot: false, desktop: true });
  assert.equal(boot.quality.id, 'high');
  assert.equal(boot.light, false);
});

test('legacy Low is not treated as a choice, but a deliberate Low remains saved', () => {
  const values = new Map([['mg-quality', 'low']]);
  const storage = { getItem: (key) => values.get(key) || null };
  assert.equal(readSavedQuality(storage), null);
  assert.equal(chooseBootQuality({ saved: readSavedQuality(storage) }).quality.id, 'high');
  values.set(QUALITY_CHOICE_KEY, '1');
  assert.equal(readSavedQuality(storage)?.id, 'low');
  assert.match(src('src/main.js'), /localStorage\.setItem\(QUALITY_CHOICE_KEY, '1'\)/);
});

test('a working login screen clears the boot failure marker before gameplay', () => {
  const main = src('src/main.js');
  assert.match(main, /this\.renderer\.render\(this\.scene, this\.camera\);[\s\S]*?if \(this\.bootFrames >= 0\) \{[\s\S]*?clearBoot\(\)/);
});

test('explicit Low choice is preserved', () => {
  assert.equal(chooseBootQuality({ saved: qualityById('low'), safeBoot: true }).quality.id, 'low');
});
