# AGENTS

このリポジトリで作業するエージェント向けの簡易メモです。

## 構成
- `packages/pixel-renderer`: TS実装のレンダラ本体
- `packages/pixel-core-wasm`: Rust/WASM core
- `packages/make-sjis-bmp-from-ttf`: TTF/OTF から SJIS `bmp.gz` を作るツール
- `docs/API_SPEC_v0.1.md`: 仕様書

## よく使うコマンド
- `npm --prefix packages/pixel-renderer test`
- `cargo check --manifest-path packages/pixel-core-wasm/Cargo.toml`
- `python packages/make-sjis-bmp-from-ttf/make_sjis_bmp_from_ttf.py ...`

## 注意点
- `sjis-byte-matrix-256` では 1バイト文字は `0x00xx` (0 pad) で扱う。
- フォントアセット配布時は、ライセンス文書とNOTICEを同梱する。
