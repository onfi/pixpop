import { BitmapFontSource, PixelRenderer, RendererOptions, RenderResult, WasmRenderInput } from "./types.js";
export declare class PixelRendererImpl implements PixelRenderer {
    private readonly resolveAsset?;
    private readonly decodeSpriteImage?;
    private readonly encodePng?;
    private readonly encodeSjis;
    private readonly wasm;
    private disposed;
    private readonly fonts;
    private firstFontId;
    private nextFont;
    constructor(options?: RendererOptions);
    private ensureActive;
    private resolveAtlas;
    private normalizePngImage;
    registerBitmapFont(font: BitmapFontSource, options?: {
        id?: string;
    }): Promise<{
        fontId: string;
    }>;
    render(input: WasmRenderInput): Promise<RenderResult>;
    dispose(): void;
}
export declare function createPixelRenderer(options?: RendererOptions): PixelRenderer;
