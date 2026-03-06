# pixel-renderer workspace

Current implementation targets `docs/API_SPEC_v0.1.md`.

## Implemented
- BMP(1bit) font registration with manifest validation
- BMP(1bit) parser and canonical black-bit packing
- Ordered request rendering (`png`, `text`)
- JS fallback core + pluggable WASM core interface
- Rust wasm core functions:
  - `create_canvas`
  - `blit_scaled_rgba`
  - `draw_sjis_text_1bit`

## Next
- wire wasm-pack output to `createWasmCoreFromModule`
- add png decode/encode adapters for Node/Web
