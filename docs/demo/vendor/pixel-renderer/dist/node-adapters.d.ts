import { DecodeSpriteImageFn, EncodePngFn, ResolveAssetFn, RgbaImage } from "./types.js";
export declare function createNodeFsAssetResolver(baseDir: string): ResolveAssetFn;
export declare function createNodeCodecAdapters(codec: {
    decode: (bytes: Uint8Array) => Promise<RgbaImage>;
    encodePng: (image: RgbaImage) => Promise<Uint8Array>;
}): {
    decodeSpriteImage: DecodeSpriteImageFn;
    encodePng: EncodePngFn;
};
