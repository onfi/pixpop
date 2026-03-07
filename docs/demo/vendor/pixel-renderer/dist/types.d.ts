export type RgbaImage = {
    width: number;
    height: number;
    data: Uint8Array;
};
export type EncodeSjisFn = (text: string) => Uint16Array;
export type ResolveAssetFn = (assetPath: string) => Promise<Uint8Array>;
export type DecodeSpriteImageFn = (input: ArrayBuffer | Uint8Array | string) => Promise<RgbaImage>;
export type EncodePngFn = (image: RgbaImage) => Promise<Uint8Array>;
export type BitmapFontManifest = {
    version: 1;
    encoding: "sjis";
    atlas: string;
    glyphWidth: number;
    glyphHeight: number;
    layout: "sjis-byte-matrix-256";
    bitDepth: 1;
    bitOrder: "msb" | "lsb";
};
export type BitmapFontSource = {
    manifest: BitmapFontManifest;
    atlas1bit: ArrayBuffer | Uint8Array | string;
};
export type WasmDrawRequest = {
    type: "png";
    x: number;
    y: number;
    scale: number;
    image: RgbaImage;
} | {
    type: "text";
    x: number;
    y: number;
    text: string;
    scale: number;
    color: `#${string}`;
    fontId?: string;
};
export type WasmRenderInput = {
    width: number;
    height: number;
    backgroundColor: `#${string}`;
    requests: WasmDrawRequest[];
};
export type RenderResult = {
    image: RgbaImage;
    toPng(): Promise<Uint8Array>;
    toImage(): Promise<HTMLImageElement>;
};
export type WasmCore = {
    createCanvas(width: number, height: number, r: number, g: number, b: number): Uint8Array;
    blitScaledRgba(base: Uint8Array, baseWidth: number, baseHeight: number, src: Uint8Array, srcWidth: number, srcHeight: number, x: number, y: number, scale: number): Uint8Array;
    drawSjisText1Bit(base: Uint8Array, baseWidth: number, baseHeight: number, atlas1Bit: Uint8Array, glyphWidth: number, glyphHeight: number, bitOrderMsb: boolean, codes: Uint16Array, x: number, y: number, scale: number, r: number, g: number, b: number): Uint8Array;
};
export type RendererOptions = {
    resolveAsset?: ResolveAssetFn;
    decodeSpriteImage?: DecodeSpriteImageFn;
    encodePng?: EncodePngFn;
    encodeSjis?: EncodeSjisFn;
    wasm?: WasmCore;
};
export interface PixelRenderer {
    registerBitmapFont(font: BitmapFontSource, options?: {
        id?: string;
    }): Promise<{
        fontId: string;
    }>;
    render(input: WasmRenderInput): Promise<RenderResult>;
    dispose(): void;
}
export declare class PixelRendererError extends Error {
    readonly code: string;
    constructor(code: string, message: string);
}
