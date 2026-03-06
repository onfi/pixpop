import { PixelRendererError } from "./types.js";

type ParsedBmp1 = {
  width: number;
  height: number;
  blackIndex: 0 | 1;
  rowStride: number;
  pixelOffset: number;
  bottomUp: boolean;
  bytes: Uint8Array;
};

function u16le(bytes: Uint8Array, off: number): number {
  return bytes[off] | (bytes[off + 1] << 8);
}

function u32le(bytes: Uint8Array, off: number): number {
  return bytes[off] | (bytes[off + 1] << 8) | (bytes[off + 2] << 16) | (bytes[off + 3] << 24);
}

function i32le(bytes: Uint8Array, off: number): number {
  const v = u32le(bytes, off);
  return v > 0x7fffffff ? v - 0x100000000 : v;
}

function luminance(b: number, g: number, r: number): number {
  return r * 0.299 + g * 0.587 + b * 0.114;
}

export function parseBmp1(bytes: Uint8Array): ParsedBmp1 {
  if (bytes.length < 62 || bytes[0] !== 0x42 || bytes[1] !== 0x4d) {
    throw new PixelRendererError("E_INVALID_FONT_BINARY", "Invalid BMP signature");
  }

  const pixelOffset = u32le(bytes, 10);
  const dibSize = u32le(bytes, 14);
  if (dibSize < 40) {
    throw new PixelRendererError("E_INVALID_FONT_BINARY", "Unsupported BMP DIB header");
  }

  const width = i32le(bytes, 18);
  const rawHeight = i32le(bytes, 22);
  const planes = u16le(bytes, 26);
  const bpp = u16le(bytes, 28);
  const compression = u32le(bytes, 30);

  if (planes !== 1 || bpp !== 1 || compression !== 0) {
    throw new PixelRendererError("E_INVALID_FONT_BINARY", "Only BI_RGB 1bpp BMP is supported");
  }
  if (width <= 0 || rawHeight === 0) {
    throw new PixelRendererError("E_INVALID_FONT_BINARY", "Invalid BMP dimensions");
  }

  const bottomUp = rawHeight > 0;
  const height = Math.abs(rawHeight);
  const rowStride = Math.ceil(width / 32) * 4;

  if (pixelOffset + rowStride * height > bytes.length) {
    throw new PixelRendererError("E_INVALID_FONT_BINARY", "BMP data is truncated");
  }

  // Palette entries: BGRA * 2 at offset 14 + dibSize
  const palOff = 14 + dibSize;
  if (palOff + 8 > bytes.length) {
    throw new PixelRendererError("E_INVALID_FONT_BINARY", "BMP palette is missing");
  }

  const l0 = luminance(bytes[palOff], bytes[palOff + 1], bytes[palOff + 2]);
  const l1 = luminance(bytes[palOff + 4], bytes[palOff + 5], bytes[palOff + 6]);
  const blackIndex: 0 | 1 = l0 <= l1 ? 0 : 1;

  return {
    width,
    height,
    blackIndex,
    rowStride,
    pixelOffset,
    bottomUp,
    bytes,
  };
}

export function bmp1ToPackedBlackBits(parsed: ParsedBmp1): Uint8Array {
  const outBits = parsed.width * parsed.height;
  const out = new Uint8Array(Math.ceil(outBits / 8));

  for (let y = 0; y < parsed.height; y += 1) {
    const srcY = parsed.bottomUp ? parsed.height - 1 - y : y;
    const rowStart = parsed.pixelOffset + srcY * parsed.rowStride;

    for (let x = 0; x < parsed.width; x += 1) {
      const byte = parsed.bytes[rowStart + (x >> 3)];
      const idx = (byte >> (7 - (x & 7))) & 1;
      const isBlack = idx === parsed.blackIndex;
      if (!isBlack) {
        continue;
      }

      const bitIndex = y * parsed.width + x;
      out[bitIndex >> 3] |= 1 << (7 - (bitIndex & 7));
    }
  }

  return out;
}
