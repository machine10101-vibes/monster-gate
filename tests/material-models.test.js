import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MATERIALS, MATERIAL_ORDER } from '../src/data/catalog.js';
import { buildMaterialModel } from '../src/entities/gearModels.js';

test('every monster part has a 3D model, so no catalog, bag or Exchange thumbnail is blank', () => {
  const missing = Object.keys(MATERIALS).filter((id) => !buildMaterialModel(id));
  assert.deepEqual(missing, []);
  for (const id of MATERIAL_ORDER) assert.ok(MATERIALS[id], `${id} is listed in the order and defined`);
});
