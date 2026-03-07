import {
  BitmapFontSource,
  EncodeSjisFn,
  PixelRenderer,
  PixelRendererError,
  RendererOptions,
  RenderResult,
  RgbaImage,
  WasmCore,
  WasmRenderInput,
} from "./types.js";
import { blitScaledRgba, createCanvas, drawSjisText1Bit, parseHexColor } from "./pixel-ops.js";
import { bmp1ToPackedBlackBits, parseBmp1 } from "./bmp.js";
import { createDefaultCp932SjisEncoder } from "./cp932-map.js";

type RegisteredFont = {
  id: string;
  atlas1Bit: Uint8Array;
  glyphWidth: number;
  glyphHeight: number;
  bitOrder: "msb" | "lsb";
};

function defaultWasmCore(): WasmCore {
  return {
    createCanvas: (width, height, r, g, b) => createCanvas(width, height, [r, g, b]).data,
    blitScaledRgba: (base, baseWidth, baseHeight, src, srcWidth, srcHeight, x, y, scale) => {
      const dst: RgbaImage = { width: baseWidth, height: baseHeight, data: base.slice() };
      const image: RgbaImage = { width: srcWidth, height: srcHeight, data: src };
      blitScaledRgba(dst, image, x, y, scale);
      return dst.data;
    },
    drawSjisText1Bit: (
      base,
      baseWidth,
      baseHeight,
      atlas1Bit,
      glyphWidth,
      glyphHeight,
      bitOrderMsb,
      codes,
      x,
      y,
      scale,
      r,
      g,
      b,
    ) => {
      const dst: RgbaImage = { width: baseWidth, height: baseHeight, data: base.slice() };
      drawSjisText1Bit(
        dst,
        atlas1Bit,
        glyphWidth,
        glyphHeight,
        bitOrderMsb ? "msb" : "lsb",
        codes,
        x,
        y,
        scale,
        [r, g, b],
      );
      return dst.data;
    },
  };
}

function isRgbaImage(value: unknown): value is RgbaImage {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<RgbaImage>;
  return (
    typeof candidate.width === "number" &&
    typeof candidate.height === "number" &&
    candidate.data instanceof Uint8Array
  );
}

function normalizeColorHex(hex: `#${string}`): [number, number, number] {
  return parseHexColor(hex);
}

function toBytes(input: ArrayBuffer | Uint8Array): Uint8Array {
  return input instanceof Uint8Array ? input : new Uint8Array(input);
}

const defaultEncodeSjis = createDefaultCp932SjisEncoder();

function looksLikeBmp(bytes: Uint8Array): boolean {
  return bytes.length > 2 && bytes[0] === 0x42 && bytes[1] === 0x4d;
}

export class PixelRendererImpl implements PixelRenderer {
  private readonly resolveAsset?: RendererOptions["resolveAsset"];
  private readonly decodeSpriteImage?: RendererOptions["decodeSpriteImage"];
  private readonly encodePng?: RendererOptions["encodePng"];
  private readonly encodeSjis: EncodeSjisFn;
  private readonly wasm: WasmCore;
  private disposed = false;
  private readonly fonts = new Map<string, RegisteredFont>();
  private firstFontId: string | null = null;
  private nextFont = 1;

  public constructor(options: RendererOptions = {}) {
    this.resolveAsset = options.resolveAsset;
    this.decodeSpriteImage = options.decodeSpriteImage;
    this.encodePng = options.encodePng;
    this.encodeSjis = options.encodeSjis ?? defaultEncodeSjis;
    this.wasm = options.wasm ?? defaultWasmCore();
  }

  private ensureActive(): void {
    if (this.disposed) {
      throw new PixelRendererError("E_RENDERER_DISPOSED", "renderer is disposed");
    }
  }

  private async resolveAtlas(input: ArrayBuffer | Uint8Array | string): Promise<Uint8Array> {
    if (input instanceof Uint8Array || input instanceof ArrayBuffer) {
      return toBytes(input);
    }
    if (typeof input === "string" && this.resolveAsset) {
      return this.resolveAsset(input);
    }
    throw new PixelRendererError("E_FONT_REGISTER_FAILED", "String atlas1bit needs resolveAsset option.");
  }

  private async normalizePngImage(input: unknown): Promise<RgbaImage> {
    if (isRgbaImage(input)) {
      return input;
    }
    if ((input instanceof Uint8Array || input instanceof ArrayBuffer || typeof input === "string") && this.decodeSpriteImage) {
      return this.decodeSpriteImage(input);
    }
    throw new PixelRendererError("E_INVALID_REQUEST", "PNG request requires RgbaImage or decodeSpriteImage option.");
  }

  public async registerBitmapFont(font: BitmapFontSource, options?: { id?: string }): Promise<{ fontId: string }> {
    this.ensureActive();

    const m = font.manifest;
    if (m.version !== 1 || m.encoding !== "sjis" || m.layout !== "sjis-byte-matrix-256" || m.bitDepth !== 1) {
      throw new PixelRendererError("E_INVALID_MANIFEST", "Unsupported manifest settings.");
    }
    if (m.glyphWidth <= 0 || m.glyphHeight <= 0) {
      throw new PixelRendererError("E_INVALID_MANIFEST", "glyphWidth and glyphHeight must be > 0.");
    }

    const src = await this.resolveAtlas(font.atlas1bit);
    let atlas1Bit: Uint8Array;

    if (looksLikeBmp(src)) {
      const parsed = parseBmp1(src);
      const expectedW = 256 * m.glyphWidth;
      const expectedH = 256 * m.glyphHeight;
      if (parsed.width !== expectedW || parsed.height !== expectedH) {
        throw new PixelRendererError(
          "E_INVALID_FONT_IMAGE",
          `BMP size mismatch: expected ${expectedW}x${expectedH}, got ${parsed.width}x${parsed.height}`,
        );
      }
      atlas1Bit = bmp1ToPackedBlackBits(parsed);
    } else {
      const expectedBits = (256 * m.glyphWidth) * (256 * m.glyphHeight);
      const expectedBytes = Math.ceil(expectedBits / 8);
      if (src.length < expectedBytes) {
        throw new PixelRendererError("E_INVALID_FONT_BINARY", `Packed font too short: ${src.length}`);
      }
      atlas1Bit = src;
    }

    const fontId = options?.id ?? `font-${this.nextFont++}`;

    this.fonts.set(fontId, {
      id: fontId,
      atlas1Bit,
      glyphWidth: m.glyphWidth,
      glyphHeight: m.glyphHeight,
      bitOrder: m.bitOrder,
    });

    if (!this.firstFontId) {
      this.firstFontId = fontId;
    }

    return { fontId };
  }

  public async render(input: WasmRenderInput): Promise<RenderResult> {
    this.ensureActive();

    if (input.width <= 0 || input.height <= 0) {
      throw new PixelRendererError("E_INVALID_RESOLUTION", "width/height must be > 0");
    }

    const bg = normalizeColorHex(input.backgroundColor);
    let frameData = this.wasm.createCanvas(input.width, input.height, bg[0], bg[1], bg[2]);

    for (const req of input.requests) {
      if (!Number.isInteger(req.scale) || req.scale < 1) {
        throw new PixelRendererError("E_INVALID_SCALE", `Invalid scale: ${req.scale}`);
      }

      if (req.type === "png") {
        const img = await this.normalizePngImage(req.image);
        frameData = this.wasm.blitScaledRgba(
          frameData,
          input.width,
          input.height,
          img.data,
          img.width,
          img.height,
          req.x,
          req.y,
          req.scale,
        );
        continue;
      }

      if (req.type === "text") {
        const fontId = req.fontId ?? this.firstFontId;
        if (!fontId) {
          throw new PixelRendererError("E_FONT_NOT_FOUND", "No font registered.");
        }
        const font = this.fonts.get(fontId);
        if (!font) {
          throw new PixelRendererError("E_FONT_NOT_FOUND", `Unknown fontId: ${fontId}`);
        }

        const sjis = this.encodeSjis(req.text);
        const color = normalizeColorHex(req.color);
        frameData = this.wasm.drawSjisText1Bit(
          frameData,
          input.width,
          input.height,
          font.atlas1Bit,
          font.glyphWidth,
          font.glyphHeight,
          font.bitOrder === "msb",
          sjis,
          req.x,
          req.y,
          req.scale,
          color[0],
          color[1],
          color[2],
        );
        continue;
      }

      throw new PixelRendererError("E_INVALID_REQUEST", "Unknown request type.");
    }

    const image: RgbaImage = { width: input.width, height: input.height, data: frameData };
    return {
      image,
      toPng: async (): Promise<Uint8Array> => {
        if (!this.encodePng) {
          throw new PixelRendererError("E_INVALID_IMAGE_DATA", "encodePng option is not configured.");
        }
        return this.encodePng(image);
      },
      toImage: async (): Promise<HTMLImageElement> => {
        if (typeof Image === "undefined") {
          throw new PixelRendererError("E_WEB_API_UNAVAILABLE", "Image API is not available.");
        }
        const png = await (async (): Promise<Uint8Array> => {
          if (!this.encodePng) {
            throw new PixelRendererError("E_INVALID_IMAGE_DATA", "encodePng option is not configured.");
          }
          return this.encodePng(image);
        })();
        const copy = new Uint8Array(png.byteLength);
        copy.set(png);
        const blob = new Blob([copy.buffer as ArrayBuffer], { type: "image/png" });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        return await new Promise((resolve, reject) => {
          img.onload = () => {
            resolve(img);
          };
          img.onerror = () => {
            reject(new PixelRendererError("E_INVALID_IMAGE_DATA", "Failed to decode PNG into HTMLImageElement."));
          };
          img.src = url;
        });
      },
    };
  }

  public dispose(): void {
    this.disposed = true;
    this.fonts.clear();
    this.firstFontId = null;
  }
}

export function createPixelRenderer(options?: RendererOptions): PixelRenderer {
  return new PixelRendererImpl(options);
}
