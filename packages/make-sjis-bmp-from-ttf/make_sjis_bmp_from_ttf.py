#!/usr/bin/env python3
import argparse
import gzip
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


DEFAULT_EXCLUDE_RANGES = (
    (0xED40, 0xEEFC),  # IBM/NEC 外字領域
    (0xFA40, 0xFC4B),  # IBM 拡張漢字領域
)


def parse_codepoint(value: str) -> int:
    raw = value.strip().lower()
    if raw.startswith("0x"):
        raw = raw[2:]
    if not raw:
        raise ValueError("empty code")

    try:
        code = int(raw, 16)
    except ValueError as exc:
        raise ValueError(f"invalid hex code '{value}'") from exc

    if code < 0x0000 or code > 0xFFFF:
        raise ValueError(f"code out of range '{value}' (must be 0000-FFFF)")

    return code


def parse_exclude_range(value: str) -> tuple[int, int]:
    start_str, sep, end_str = value.partition("-")
    if not sep:
        raise ValueError(f"invalid range '{value}' (use START-END)")

    start = parse_codepoint(start_str)
    end = parse_codepoint(end_str)
    if start > end:
        raise ValueError(f"invalid range '{value}' (start must be <= end)")

    return (start, end)


def is_excluded(code: int, exclude_ranges: list[tuple[int, int]]) -> bool:
    return any(start <= code <= end for start, end in exclude_ranges)


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
    parser.add_argument(
        "--exclude-range",
        action="append",
        default=[],
        metavar="START-END",
        help=(
            "Exclude SJIS code range in hex (e.g. ED40-EEFC). "
            "Can be specified multiple times."
        ),
    )
    parser.add_argument(
        "--no-default-exclude-ranges",
        action="store_true",
        help="Do not apply default exclusion ranges for rarely used SJIS areas.",
    )

    args = parser.parse_args()

    if not args.out.endswith(".gz"):
        raise SystemExit("--out must end with .gz (use bmp.gz output)")

    if args.glyph_width <= 0 or args.glyph_height <= 0 or args.font_size <= 0:
        raise SystemExit("glyph-width/glyph-height/font-size must be > 0")

    exclude_ranges = [] if args.no_default_exclude_ranges else list(DEFAULT_EXCLUDE_RANGES)
    for item in args.exclude_range:
        try:
            exclude_ranges.append(parse_exclude_range(item))
        except ValueError as exc:
            raise SystemExit(str(exc)) from exc

    font = ImageFont.truetype(args.font, size=args.font_size)
    atlas_w = 256 * args.glyph_width
    atlas_h = 256 * args.glyph_height

    atlas = Image.new("1", (atlas_w, atlas_h), 1)

    for high in range(256):
        for low in range(256):
            code = (high << 8) | low
            if is_excluded(code, exclude_ranges):
                continue
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
