import { readFile } from "node:fs/promises";
import path from "node:path";

import { DecodeSpriteImageFn, EncodePngFn, PixelRendererError, ResolveAssetFn, RgbaImage } from "./types.js";

export function createNodeFsAssetResolver(baseDir: string): ResolveAssetFn {
  return async (assetPath: string): Promise<Uint8Array> => {
    const resolved = path.resolve(baseDir, assetPath);
    try {
      const bytes = await readFile(resolved);
      return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
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
        return codec.decode(new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength));
      }
      const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
      return codec.decode(bytes);
    },
    encodePng: codec.encodePng,
  };
}
