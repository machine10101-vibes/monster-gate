import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const src = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

test('renderer records COMPILE_STATUS / LINK_STATUS instead of only grepping p.z', () => {
  const main = src('../src/main.js');
  const world = src('../src/world/world.js');
  const tool = src('../tools/shader-compile-test.mjs');
  assert.match(main, /checkShaderErrors = true/);
  assert.match(main, /onShaderError/);
  assert.match(main, /getShaderParameter\(shader, gl\.COMPILE_STATUS\)/);
  assert.match(main, /getProgramParameter\(program, gl\.LINK_STATUS\)/);
  assert.match(main, /__mgShaderErrors/);
  assert.match(main, /__mgShaderStatus/);
  assert.match(world, /p\.y \* 1\.7/);
  assert.doesNotMatch(world, /p\.z \*/);
  assert.match(tool, /COMPILE_STATUS/);
  assert.match(tool, /LINK_STATUS/);
  assert.match(tool, /info\?\.programs/);
  assert.match(tool, /shaderCompileSpots/);
  assert.match(src('../src/debug/flags.js'), /export function shaderCompileSpots/);
});

test('SwiftShader shader-compile harness is present for local Chrome', () => {
  assert.equal(existsSync(new URL('../tools/shader-compile-test.mjs', import.meta.url)), true);
  const pkg = JSON.parse(src('../package.json'));
  assert.equal(pkg.scripts['test:shaders'], 'node tools/shader-compile-test.mjs');
});
