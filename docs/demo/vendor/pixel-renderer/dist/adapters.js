import { PixelRendererError } from "./types.js";
export function createMapAssetResolver(entries) {
    return async (assetPath) => {
        const bytes = entries[assetPath];
        if (!bytes) {
            throw new PixelRendererError("E_ASSET_NOT_FOUND", `Asset not found: ${assetPath}`);
        }
        return bytes;
    };
}
//# sourceMappingURL=adapters.js.map