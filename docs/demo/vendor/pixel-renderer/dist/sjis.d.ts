import { EncodeSjisFn } from "./types.js";
export { createDefaultCp932SjisEncoder } from "./cp932-map.js";
export declare function createAsciiFallbackSjisEncoder(replacement?: number): EncodeSjisFn;
export declare function createMappedSjisEncoder(mapping: Record<string, number>, replacement?: number): EncodeSjisFn;
