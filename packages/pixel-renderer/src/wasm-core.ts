import { PixelRendererError, WasmCore } from "./types.js";

type WasmExports = {
  default?: (input?: RequestInfo | URL | Response | BufferSource | WebAssembly.Module) => Promise<unknown>;
  init?: (input?: RequestInfo | URL | Response | BufferSource | WebAssembly.Module) => Promise<unknown>;
  create_canvas?: (width: number, height: number, r: number, g: number, b: number) => Uint8Array;
  blit_scaled_rgba?: (
    base: Uint8Array,
    baseWidth: number,
    baseHeight: number,
    src: Uint8Array,
    srcWidth: number,
    srcHeight: number,
    x: number,
    y: number,
    scale: number,
  ) => Uint8Array;
  draw_sjis_text_1bit?: (
    base: Uint8Array,
    baseWidth: number,
    baseHeight: number,
    atlas1Bit: Uint8Array,
    glyphWidth: number,
    glyphHeight: number,
    bitOrderMsb: boolean,
    codes: Uint16Array,
    x: number,
    y: number,
    scale: number,
    r: number,
    g: number,
    b: number,
  ) => Uint8Array;
};

async function initializeWasmModule(module: WasmExports): Promise<void> {
  const init = module.default ?? module.init;
  if (typeof init !== "function") {
    return;
  }
  await init();
}

export function createWasmCoreFromModule(module: WasmExports): WasmCore {
  if (!module.create_canvas || !module.blit_scaled_rgba || !module.draw_sjis_text_1bit) {
    throw new PixelRendererError("E_INVALID_WASM_MODULE", "WASM exports are missing required functions.");
  }

  return {
    createCanvas: module.create_canvas,
    blitScaledRgba: module.blit_scaled_rgba,
    drawSjisText1Bit: module.draw_sjis_text_1bit,
  };
}

export async function loadWasmCore(factory: () => Promise<unknown>): Promise<WasmCore> {
  const mod = await factory();
  if (!mod || typeof mod !== "object") {
    throw new PixelRendererError("E_INVALID_WASM_MODULE", "WASM factory did not return an object.");
  }

  const wasmModule = mod as WasmExports;
  await initializeWasmModule(wasmModule);

  return createWasmCoreFromModule(wasmModule);
}
