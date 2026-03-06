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
  --font-size 16
```
