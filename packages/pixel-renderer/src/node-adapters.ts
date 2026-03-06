import { readFile } from "node:fs/promises";
import path from "node:path";
import { gunzipSync } from "node:zlib";

import { DecodeSpriteImageFn, EncodePngFn, PixelRendererError, ResolveAssetFn, RgbaImage } from "./types.js";

function toUint8Array(bytes: Uint8Array): Uint8Array {
  return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function isGzip(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
}

export function createNodeFsAssetResolver(baseDir: string): ResolveAssetFn {
  return async (assetPath: string): Promise<Uint8Array> => {
    const resolved = path.resolve(baseDir, assetPath);
    try {
      const raw = toUint8Array(await readFile(resolved));
      if (isGzip(raw)) {
        return toUint8Array(gunzipSync(raw));
      }
      return raw;
    } catch {
      throw new PixelRendererError("E_ASSET_NOT_FOUND", `Asset not found: ${resolved}`);
    }
  };
}

export function createNodeCodecAdapters(codec: {
  decode: (bytes: Uint8Array) => Promise<RgbaImage>;
  encodePng: (image: RgbaImage) => Promise<Uint8Array>;
}): { decodeSpriteImage: DecodeSpriteImageFn; encodePng: EncodePngFn } {
  return {
    decodeSpriteImage: async (input): Promise<RgbaImage> => {
      if (typeof input === "string") {
        const bytes = await readFile(input);
        return codec.decode(toUint8Array(bytes));
      }
      const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
      return codec.decode(bytes);
    },
    encodePng: codec.encodePng,
  };
}
