import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';

import { createPixelRenderer } from '../dist/index.js';
import { createNodeFsAssetResolver } from '../dist/node-adapters.js';

const testDir = dirname(fileURLToPath(import.meta.url));
const assetDir = join(testDir, '..', 'assets', 'fonts', 'kh-dot-akihabara-16');

function hasAnyNonBlackPixel(image) {
  for (let i = 0; i < image.data.length; i += 4) {
    if (image.data[i] !== 0 || image.data[i + 1] !== 0 || image.data[i + 2] !== 0) {
      return true;
    }
  }
  return false;
}

test('bundled KH-Dot asset can be resolved and registered from bmp.gz', async () => {
  const manifestBytes = await readFile(join(assetDir, 'manifest.json'));
  const manifest = JSON.parse(manifestBytes.toString('utf8'));

  const renderer = createPixelRenderer({
    resolveAsset: createNodeFsAssetResolver(assetDir),
  });

  await renderer.registerBitmapFont(
    {
      manifest,
      atlas1bit: manifest.atlas,
    },
    { id: 'kh-dot-akihabara-16' },
  );

  const result = await renderer.render({
    width: 32,
    height: 16,
    backgroundColor: '#000000',
    requests: [
      { type: 'text', x: 0, y: 0, text: 'A', scale: 1, color: '#ffffff', fontId: 'kh-dot-akihabara-16' },
    ],
  });

  assert.equal(result.image.width, 32);
  assert.equal(result.image.height, 16);
  assert.equal(hasAnyNonBlackPixel(result.image), true);
});
