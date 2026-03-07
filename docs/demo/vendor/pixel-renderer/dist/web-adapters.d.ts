import { DecodeSpriteImageFn, EncodePngFn, ResolveAssetFn } from "./types.js";
export declare function createFetchAssetResolver(baseUrl: string): ResolveAssetFn;
export declare function createWebPngDecode(): DecodeSpriteImageFn;
export declare function createWebPngEncode(): EncodePngFn;
export declare function createWebCodecAdapters(): {
    decodeSpriteImage: DecodeSpriteImageFn;
    encodePng: EncodePngFn;
};
