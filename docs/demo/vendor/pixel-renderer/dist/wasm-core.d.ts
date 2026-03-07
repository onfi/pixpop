import { WasmCore } from "./types.js";
type WasmExports = {
    default?: (input?: RequestInfo | URL | Response | BufferSource | WebAssembly.Module) => Promise<unknown>;
    init?: (input?: RequestInfo | URL | Response | BufferSource | WebAssembly.Module) => Promise<unknown>;
    create_canvas?: (width: number, height: number, r: number, g: number, b: number) => Uint8Array;
    blit_scaled_rgba?: (base: Uint8Array, baseWidth: number, baseHeight: number, src: Uint8Array, srcWidth: number, srcHeight: number, x: number, y: number, scale: number) => Uint8Array;
    draw_sjis_text_1bit?: (base: Uint8Array, baseWidth: number, baseHeight: number, atlas1Bit: Uint8Array, glyphWidth: number, glyphHeight: number, bitOrderMsb: boolean, codes: Uint16Array, x: number, y: number, scale: number, r: number, g: number, b: number) => Uint8Array;
};
export declare function createWasmCoreFromModule(module: WasmExports): WasmCore;
export declare function loadWasmCore(factory: () => Promise<unknown>): Promise<WasmCore>;
export {};
