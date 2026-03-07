import { PixelRendererError } from "./types.js";
async function initializeWasmModule(module) {
    const init = module.default ?? module.init;
    if (typeof init !== "function") {
        return;
    }
    await init();
}
export function createWasmCoreFromModule(module) {
    if (!module.create_canvas || !module.blit_scaled_rgba || !module.draw_sjis_text_1bit) {
        throw new PixelRendererError("E_INVALID_WASM_MODULE", "WASM exports are missing required functions.");
    }
    return {
        createCanvas: module.create_canvas,
        blitScaledRgba: module.blit_scaled_rgba,
        drawSjisText1Bit: module.draw_sjis_text_1bit,
    };
}
export async function loadWasmCore(factory) {
    const mod = await factory();
    if (!mod || typeof mod !== "object") {
        throw new PixelRendererError("E_INVALID_WASM_MODULE", "WASM factory did not return an object.");
    }
    const wasmModule = mod;
    await initializeWasmModule(wasmModule);
    return createWasmCoreFromModule(wasmModule);
}
//# sourceMappingURL=wasm-core.js.map