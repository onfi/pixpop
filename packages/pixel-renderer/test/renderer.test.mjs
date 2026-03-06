import test from 'node:test';
import assert from 'node:assert/strict';

import { createPixelRenderer, PixelRendererError } from '../dist/index.js';

function bitIndex(width, x, y, bitOrder = 'msb') {
  const bitIndex = y * width + x;
  if (bitOrder === 'lsb') {
    return [bitIndex >> 3, bitIndex & 7];
  }
  return [bitIndex >> 3, 7 - (bitIndex & 7)];
}

function makePackedAtlasWithSinglePixel(glyphWidth, glyphHeight, code, bitOrder = 'msb', px = 0, py = 0) {
  const atlasWidth = 256 * glyphWidth;
  const atlasHeight = 256 * glyphHeight;
  const packed = new Uint8Array(Math.ceil((atlasWidth * atlasHeight) / 8));

  const high = (code >> 8) & 0xff;
  const low = code & 0xff;
  const atlasX = low * glyphWidth + px;
  const atlasY = high * glyphHeight + py;

  const [byteIndex, bitInByte] = bitIndex(atlasWidth, atlasX, atlasY, bitOrder);
  packed[byteIndex] |= 1 << bitInByte;
  return packed;
}

function getPixel(image, x, y) {
  const i = (y * image.width + x) * 4;
  return Array.from(image.data.slice(i, i + 4));
}

test('render text draws color from registered packed font atlas', async () => {
  const renderer = createPixelRenderer({
    encodeSjis: (text) => new Uint16Array([...text].map((ch) => ch.charCodeAt(0))),
  });

  const glyphWidth = 1;
  const glyphHeight = 1;
  const code = 'A'.charCodeAt(0);

  await renderer.registerBitmapFont({
    manifest: {
      version: 1,
      encoding: 'sjis',
      atlas: 'unused.bin',
      glyphWidth,
      glyphHeight,
      layout: 'sjis-byte-matrix-256',
      bitDepth: 1,
      bitOrder: 'msb',
    },
    atlas1bit: makePackedAtlasWithSinglePixel(glyphWidth, glyphHeight, code, 'msb'),
  });

  const result = await renderer.render({
    width: 4,
    height: 4,
    backgroundColor: '#000000',
    requests: [{ type: 'text', x: 1, y: 2, text: 'A', scale: 1, color: '#ff0000' }],
  });

  assert.deepEqual(getPixel(result.image, 1, 2), [255, 0, 0, 255]);
  assert.deepEqual(getPixel(result.image, 0, 0), [0, 0, 0, 255]);
});

test('render text respects lsb bitOrder from manifest', async () => {
  const renderer = createPixelRenderer({
    encodeSjis: (text) => new Uint16Array([...text].map((ch) => ch.charCodeAt(0))),
  });

  const glyphWidth = 1;
  const glyphHeight = 1;
  const code = 'A'.charCodeAt(0);

  await renderer.registerBitmapFont({
    manifest: {
      version: 1,
      encoding: 'sjis',
      atlas: 'unused.bin',
      glyphWidth,
      glyphHeight,
      layout: 'sjis-byte-matrix-256',
      bitDepth: 1,
      bitOrder: 'lsb',
    },
    atlas1bit: makePackedAtlasWithSinglePixel(glyphWidth, glyphHeight, code, 'lsb'),
  });

  const result = await renderer.render({
    width: 2,
    height: 2,
    backgroundColor: '#000000',
    requests: [{ type: 'text', x: 0, y: 0, text: 'A', scale: 1, color: '#00ff00' }],
  });

  assert.deepEqual(getPixel(result.image, 0, 0), [0, 255, 0, 255]);
});

test('render png request uses decodeSpriteImage when image is bytes', async () => {
  const renderer = createPixelRenderer({
    decodeSpriteImage: async () => ({
      width: 1,
      height: 1,
      data: new Uint8Array([0, 255, 0, 255]),
    }),
  });

  const result = await renderer.render({
    width: 2,
    height: 2,
    backgroundColor: '#000000',
    requests: [{ type: 'png', x: 1, y: 1, scale: 1, image: new Uint8Array([1, 2, 3]) }],
  });

  assert.deepEqual(getPixel(result.image, 1, 1), [0, 255, 0, 255]);
});

test('toPng throws when encodePng is not configured', async () => {
  const renderer = createPixelRenderer();
  const result = await renderer.render({
    width: 1,
    height: 1,
    backgroundColor: '#000000',
    requests: [],
  });

  await assert.rejects(() => result.toPng(), (err) => {
    assert.ok(err instanceof PixelRendererError);
    assert.equal(err.code, 'E_INVALID_IMAGE_DATA');
    return true;
  });
});
