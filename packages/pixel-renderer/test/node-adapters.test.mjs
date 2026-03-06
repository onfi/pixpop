import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { gzipSync } from 'node:zlib';

import { createNodeFsAssetResolver } from '../dist/node-adapters.js';

test('createNodeFsAssetResolver returns raw bytes for non-gzip files', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'pixpop-node-adapter-'));
  try {
    const file = path.join(dir, 'font.bin');
    const source = new Uint8Array([0x42, 0x4d, 0x01, 0x02]);
    await writeFile(file, source);

    const resolveAsset = createNodeFsAssetResolver(dir);
    const out = await resolveAsset('font.bin');
    assert.deepEqual(Array.from(out), Array.from(source));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('createNodeFsAssetResolver auto-decompresses gzip files', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'pixpop-node-adapter-'));
  try {
    const file = path.join(dir, 'kh16.bmp.gz');
    const bmpHeaderLike = new Uint8Array([0x42, 0x4d, 0x28, 0x00, 0x00, 0x00]);
    await writeFile(file, gzipSync(bmpHeaderLike));

    const resolveAsset = createNodeFsAssetResolver(dir);
    const out = await resolveAsset('kh16.bmp.gz');
    assert.deepEqual(Array.from(out), Array.from(bmpHeaderLike));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
