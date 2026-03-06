# make-sjis-bmp-from-ttf

TTF/OTF から `sjis-byte-matrix-256` 互換の 1bit `bmp.gz` アトラスを生成するユーティリティです。

## Requirements

- Python 3.10+
- Pillow

```bash
python -m pip install pillow
```

## Usage

```bash
python packages/make-sjis-bmp-from-ttf/make_sjis_bmp_from_ttf.py \
  /path/to/khdotfont.ttf \
  --out /path/to/kh16akihabara.bmp.gz \
  --glyph-width 16 \
  --glyph-height 16 \
  --font-size 16 \
  --exclude-range 8740-879C \
  --exclude-range F040-F9FC
```

### 除外レンジ

デフォルトで以下の Shift_JIS の通常あまり使わない領域を除外します。

- `ED40-EEFC` (IBM/NEC 外字領域)
- `FA40-FC4B` (IBM 拡張漢字領域)

追加で除外したい場合は `--exclude-range START-END` を複数回指定できます。

デフォルト除外を無効化したい場合は `--no-default-exclude-ranges` を指定してください。
