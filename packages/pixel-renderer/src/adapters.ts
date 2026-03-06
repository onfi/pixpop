import { PixelRendererError, ResolveAssetFn } from "./types.js";

export function createMapAssetResolver(entries: Record<string, Uint8Array>): ResolveAssetFn {
  return async (assetPath: string): Promise<Uint8Array> => {
    const bytes = entries[assetPath];
    if (!bytes) {
      throw new PixelRendererError("E_ASSET_NOT_FOUND", `Asset not found: ${assetPath}`);
    }
    return bytes;
  };
}
