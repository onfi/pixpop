export { createDefaultCp932SjisEncoder } from "./cp932-map.js";
export function createAsciiFallbackSjisEncoder(replacement = 0x003f) {
    return (text) => {
        const out = new Uint16Array(text.length);
        for (let i = 0; i < text.length; i += 1) {
            const code = text.charCodeAt(i);
            out[i] = code <= 0x00ff ? code : replacement;
        }
        return out;
    };
}
export function createMappedSjisEncoder(mapping, replacement = 0x003f) {
    return (text) => {
        const out = new Uint16Array(text.length);
        for (let i = 0; i < text.length; i += 1) {
            const ch = text[i];
            const mapped = mapping[ch];
            if (typeof mapped === "number") {
                out[i] = mapped & 0xffff;
            }
            else {
                const code = text.charCodeAt(i);
                out[i] = code <= 0x00ff ? code : replacement;
            }
        }
        return out;
    };
}
//# sourceMappingURL=sjis.js.map