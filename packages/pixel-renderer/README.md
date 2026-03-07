# @your-scope/pixel-renderer

v0.1 implementation for:
- BMP(1bit) + manifest font registration
- Ordered render requests (`png` / `text`)
- SJIS code rendering on 1bit atlas
- JS fallback core and pluggable WASM core
- Default UTF-8 -> CP932 text encoding
- RenderResult helpers: `toPng()` / `toImage()`

## Bundled Font Asset

The package includes a distributable KH-Dot font atlas:

- `assets/fonts/kh-dot-akihabara-16/KH-Dot-Akihabara-16-sjis16.bmp.gz`
- `assets/fonts/kh-dot-akihabara-16/manifest.json`
- `assets/fonts/kh-dot-akihabara-16/NOTICE.txt`
- `assets/fonts/kh-dot-akihabara-16/LICENSE.OFL-1.1.txt`

License and attribution for this font asset are included in the same directory.

## Entry Points
- `@your-scope/pixel-renderer`
- `@your-scope/pixel-renderer/node-adapters`
- `@your-scope/pixel-renderer/web-adapters`

## RenderResult Usage

- `toPng()`:
  - Works in both Node and browser (requires `encodePng` option).
  - Returns PNG bytes (`Uint8Array`).
- `toImage()`:
  - Browser-only API.
  - Returns `HTMLImageElement`.
  - In Node, this throws `E_WEB_API_UNAVAILABLE`.

Recommended:
- Node: use `toPng()` and write bytes to file/network.
- Browser: use `toImage()` for preview, `toPng()` for download/export.
