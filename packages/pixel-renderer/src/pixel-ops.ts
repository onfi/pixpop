import { PixelRendererError, RgbaImage } from "./types.js";

const CHANNELS = 4;

function splitSjisCode(code: number): { high: number; low: number } {
  // Spec: 1-byte codes are zero-padded and stored as 0x00xx.
  if (code <= 0xff) {
    return { high: 0x00, low: code & 0xff };
  }
  return { high: (code >> 8) & 0xff, low: code & 0xff };
}

export function parseHexColor(color: `#${string}`): [number, number, number] {
  const m = /^#([0-9a-fA-F]{6})$/.exec(color);
  if (!m) {
    throw new PixelRendererError("E_INVALID_COLOR", `Invalid color: ${color}`);
  }
  const hex = m[1];
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ];
}

export function createCanvas(width: number, height: number, color: [number, number, number]): RgbaImage {
  const data = new Uint8Array(width * height * CHANNELS);
  for (let i = 0; i < data.length; i += CHANNELS) {
    data[i] = color[0];
    data[i + 1] = color[1];
    data[i + 2] = color[2];
    data[i + 3] = 255;
  }
  return { width, height, data };
}

export function blitScaledRgba(dst: RgbaImage, src: RgbaImage, x: number, y: number, scale: number): void {
  if (!Number.isInteger(scale) || scale < 1) {
    throw new PixelRendererError("E_INVALID_SCALE", `Invalid scale: ${scale}`);
  }

  for (let sy = 0; sy < src.height; sy += 1) {
    for (let sx = 0; sx < src.width; sx += 1) {
      const si = (sy * src.width + sx) * CHANNELS;
      const sa = src.data[si + 3] / 255;
      if (sa <= 0) {
        continue;
      }

      for (let oy = 0; oy < scale; oy += 1) {
        const dy = y + sy * scale + oy;
        if (dy < 0 || dy >= dst.height) {
          continue;
        }
        for (let ox = 0; ox < scale; ox += 1) {
          const dx = x + sx * scale + ox;
          if (dx < 0 || dx >= dst.width) {
            continue;
          }

          const di = (dy * dst.width + dx) * CHANNELS;
          const da = dst.data[di + 3] / 255;
          const outA = sa + da * (1 - sa);
          if (outA <= 0) {
            continue;
          }

          dst.data[di] = Math.round((src.data[si] * sa + dst.data[di] * da * (1 - sa)) / outA);
          dst.data[di + 1] = Math.round((src.data[si + 1] * sa + dst.data[di + 1] * da * (1 - sa)) / outA);
          dst.data[di + 2] = Math.round((src.data[si + 2] * sa + dst.data[di + 2] * da * (1 - sa)) / outA);
          dst.data[di + 3] = Math.round(outA * 255);
        }
      }
    }
  }
}

export function drawSjisText1Bit(
  dst: RgbaImage,
  atlas1Bit: Uint8Array,
  glyphWidth: number,
  glyphHeight: number,
  bitOrder: "msb" | "lsb",
  codes: Uint16Array,
  x: number,
  y: number,
  scale: number,
  color: [number, number, number],
): void {
  if (!Number.isInteger(scale) || scale < 1) {
    throw new PixelRendererError("E_INVALID_SCALE", `Invalid scale: ${scale}`);
  }

  const atlasW = 256 * glyphWidth;
  const atlasH = 256 * glyphHeight;
  const expectedBits = atlasW * atlasH;
  const expectedBytes = Math.ceil(expectedBits / 8);
  if (atlas1Bit.length < expectedBytes) {
    throw new PixelRendererError("E_INVALID_FONT_BINARY", `Font bitmap too short: ${atlas1Bit.length}`);
  }

  let penX = x;
  let penY = y;

  for (const code of codes) {
    if (code === 0x0a) {
      penX = x;
      penY += glyphHeight * scale;
      continue;
    }

    const { high, low } = splitSjisCode(code);
    const gx = low * glyphWidth;
    const gy = high * glyphHeight;

    for (let py = 0; py < glyphHeight; py += 1) {
      for (let px = 0; px < glyphWidth; px += 1) {
        const atlasX = gx + px;
        const atlasY = gy + py;
        const bitIndex = atlasY * atlasW + atlasX;
        const byteIndex = bitIndex >> 3;
        const bitInByte = bitOrder === "msb" ? 7 - (bitIndex & 7) : bitIndex & 7;
        const bit = (atlas1Bit[byteIndex] >> bitInByte) & 1;

        if (bit === 0) {
          continue;
        }

        for (let oy = 0; oy < scale; oy += 1) {
          const dy = penY + py * scale + oy;
          if (dy < 0 || dy >= dst.height) {
            continue;
          }
          for (let ox = 0; ox < scale; ox += 1) {
            const dx = penX + px * scale + ox;
            if (dx < 0 || dx >= dst.width) {
              continue;
            }
            const di = (dy * dst.width + dx) * CHANNELS;
            dst.data[di] = color[0];
            dst.data[di + 1] = color[1];
            dst.data[di + 2] = color[2];
            dst.data[di + 3] = 255;
          }
        }
      }
    }

    penX += glyphWidth * scale;
  }
}
