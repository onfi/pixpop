import test from 'node:test';
import assert from 'node:assert/strict';

import { createWasmCoreFromModule, loadWasmCore } from '../dist/wasm-core.js';

function makeExports() {
  return {
    create_canvas: (width, height, r, g, b) => new Uint8Array([width, height, r, g, b]),
    blit_scaled_rgba: (base) => base,
    draw_sjis_text_1bit: (base) => base,
  };
}

test('createWasmCoreFromModule maps required exports', () => {
  const core = createWasmCoreFromModule(makeExports());
  const canvas = core.createCanvas(1, 2, 3, 4, 5);
  assert.deepEqual(Array.from(canvas), [1, 2, 3, 4, 5]);
});

test('loadWasmCore initializes module via init when available', async () => {
  const module = {
    create_canvas: undefined,
    blit_scaled_rgba: undefined,
    draw_sjis_text_1bit: undefined,
    initCalls: 0,
  };

  module.init = async () => {
    module.initCalls += 1;
    Object.assign(module, makeExports());
  };

  const core = await loadWasmCore(async () => module);
  assert.equal(module.initCalls, 1);

  const canvas = core.createCanvas(7, 8, 9, 10, 11);
  assert.deepEqual(Array.from(canvas), [7, 8, 9, 10, 11]);
});

test('loadWasmCore initializes module via default when available', async () => {
  const module = {
    create_canvas: undefined,
    blit_scaled_rgba: undefined,
    draw_sjis_text_1bit: undefined,
    defaultCalls: 0,
  };

  module.default = async () => {
    module.defaultCalls += 1;
    Object.assign(module, makeExports());
  };

  const core = await loadWasmCore(async () => module);
  assert.equal(module.defaultCalls, 1);

  const canvas = core.createCanvas(10, 20, 30, 40, 50);
  assert.deepEqual(Array.from(canvas), [10, 20, 30, 40, 50]);
});
