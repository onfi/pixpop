#!/usr/bin/env python3
import argparse
import gzip
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def decode_sjis_code(code: int) -> str | None:
    high = (code >> 8) & 0xFF
    low = code & 0xFF

    raw = bytes([low]) if high == 0x00 else bytes([high, low])

    try:
        ch = raw.decode("cp932")
    except UnicodeDecodeError:
        return None

    if not ch:
        return None

    if any(ord(c) < 0x20 and c not in ("\n", "\r", "\t") for c in ch):
        return None

    return ch


def draw_glyph(tile: Image.Image, font: ImageFont.FreeTypeFont, ch: str, offset_y: int) -> None:
    draw = ImageDraw.Draw(tile)
    bbox = draw.textbbox((0, 0), ch, font=font)
    if bbox is None:
        return

    glyph_w = bbox[2] - bbox[0]
    glyph_h = bbox[3] - bbox[1]

    x = (tile.width - glyph_w) // 2 - bbox[0]
    y = (tile.height - glyph_h) // 2 - bbox[1] + offset_y
    draw.text((x, y), ch, fill=0, font=font)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate SJIS byte-matrix-256 1-bit BMP.GZ atlas from a TTF/OTF font."
    )
    parser.add_argument("font", help="Path to TTF/OTF file (e.g. KH dot font).")
    parser.add_argument("--out", required=True, help="Output BMP.GZ path (e.g. kh16akihabara.bmp.gz).")
    parser.add_argument("--glyph-width", type=int, default=16)
    parser.add_argument("--glyph-height", type=int, default=16)
    parser.add_argument("--font-size", type=int, default=16)
    parser.add_argument("--offset-y", type=int, default=0)

    args = parser.parse_args()

    if not args.out.endswith(".gz"):
        raise SystemExit("--out must end with .gz (use bmp.gz output)")

    if args.glyph_width <= 0 or args.glyph_height <= 0 or args.font_size <= 0:
        raise SystemExit("glyph-width/glyph-height/font-size must be > 0")

    font = ImageFont.truetype(args.font, size=args.font_size)
    atlas_w = 256 * args.glyph_width
    atlas_h = 256 * args.glyph_height

    atlas = Image.new("1", (atlas_w, atlas_h), 1)

    for high in range(256):
        for low in range(256):
            code = (high << 8) | low
            ch = decode_sjis_code(code)
            if ch is None:
                continue

            tile = Image.new("1", (args.glyph_width, args.glyph_height), 1)
            draw_glyph(tile, font, ch, args.offset_y)
            atlas.paste(tile, (low * args.glyph_width, high * args.glyph_height))

    bmp_buf = BytesIO()
    atlas.save(bmp_buf, format="BMP")
    bmp_bytes = bmp_buf.getvalue()

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(out_path, "wb", compresslevel=9) as gz:
        gz.write(bmp_bytes)

    print(
        f"Created SJIS BMP.GZ atlas: {out_path.resolve()} "
        f"({atlas_w}x{atlas_h}, bmp={len(bmp_bytes)} bytes)"
    )


if __name__ == "__main__":
    main()
