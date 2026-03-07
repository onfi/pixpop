# pixpop

`pixpop` is a library for easily generating PNG images by rendering bitmap-font text and sprites.

- npm package: `pixpop`
- Demo: https://onfi.github.io/pixpop/demo/

## Features

- Text rendering with 1-bit BMP font atlas (SJIS byte-matrix 256)
- Default UTF-8 to CP932 conversion
- Layered composition of background and sprites (`png` requests)
- Works in both Node.js and browsers (`toPng()`)
- Browser-only `toImage()` for `HTMLImageElement`

## Repository Layout

- `packages/pixel-renderer`: core package (published to npm)
- `packages/make-sjis-bmp-from-ttf`: TTF/OTF to `bmp.gz` converter script
- `packages/pixel-core-wasm`: WASM core
- `docs/demo`: browser demo

## Usage in Node.js

Requirements:
- Node.js 20+

Install:

```bash
npm i pixpop
```

Minimal example (Node.js):

```ts
import { createPixelRenderer } from "pixpop";
import { createNodeFsAssetResolver, createNodeCodecAdapters } from "pixpop/node-adapters";

const codec = createNodeCodecAdapters({
  decode: async (_bytes) => {
    throw new Error("Implement PNG/BMP decode (pngjs/sharp, etc.)");
  },
  encodePng: async (_image) => {
    throw new Error("Implement PNG encode (pngjs/sharp, etc.)");
  },
});

const renderer = createPixelRenderer({
  resolveAsset: createNodeFsAssetResolver(process.cwd()),
  decodeSpriteImage: codec.decodeSpriteImage,
  encodePng: codec.encodePng,
});
```

## Usage in Browser

```ts
import { createPixelRenderer } from "pixpop";
import { createWebPngEncode } from "pixpop/web-adapters";

const renderer = createPixelRenderer({
  encodePng: createWebPngEncode(),
});
```

- `toPng()` works in both Node.js and browsers
- `toImage()` is browser-only (`E_WEB_API_UNAVAILABLE` in Node.js)

## Typical Config

Example config for Cloudflare Worker:

```json
{
  "fontManifestPath": "fonts/kh-dot-akihabara-16/manifest.json",
  "fontAtlasGzPath": "fonts/kh-dot-akihabara-16/KH-Dot-Akihabara-16-sjis16.bmp.gz",
  "backgroundPngPath": "bg.png",
  "textColor": "#000000",
  "center": { "x": 194, "y": 110 },
  "textScale": 1,
  "outputScale": 5
}
```

- Background image size: `384x216`
- Output image size: `384*outputScale x 216*outputScale` (default `1920x1080`)

## Adding Fonts

Required format:
- manifest (`encoding: "sjis"`, `layout: "sjis-byte-matrix-256"`, `bitDepth: 1`)
- atlas (`bmp` or `bmp.gz`)

Generate from TTF:

```bash
python packages/make-sjis-bmp-from-ttf/make_sjis_bmp_from_ttf.py \
  /path/to/font.ttf \
  --out ./font.bmp.gz \
  --glyph-width 16 \
  --glyph-height 16 \
  --font-size 16
```

## Placing Sprites

Add `type: "png"` entries to `render` requests and specify `x`, `y`, `scale`.

```ts
requests: [
  { type: "png", x: 0, y: 0, scale: 1, image: backgroundRgba },
  { type: "png", x: 120, y: 80, scale: 2, image: spriteRgba },
  { type: "text", x: 20, y: 60, text: "Hello", scale: 1, color: "#000000" }
]
```

## Cloudflare Worker

For Cloudflare Worker deployment, use:

- https://github.com/onfi/pixpop-cf-worker

`pixpop-cf-worker`:
- accepts text via `?text=...`
- renders it on `config/bg.png`
- returns a scaled PNG image

## License and Credits

- Project code: MIT License ([LICENSE](../LICENSE))
- Bundled `KH-Dot-Akihabara-16` font asset: SIL Open Font License 1.1 (OFL-1.1)
  - Upstream: http://jikasei.me/font/kh-dotfont/
  - See `packages/pixel-renderer/assets/fonts/kh-dot-akihabara-16/LICENSE.OFL-1.1.txt` and `NOTICE.txt`

Acknowledgements:
- Thanks to Jikasei Font Kobo and related authors for publishing KH-Dot Font.
