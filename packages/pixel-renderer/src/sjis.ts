import { EncodeSjisFn } from "./types.js";

export function createAsciiFallbackSjisEncoder(replacement: number = 0x003f): EncodeSjisFn {
  return (text: string): Uint16Array => {
    const out = new Uint16Array(text.length);
    for (let i = 0; i < text.length; i += 1) {
      const code = text.charCodeAt(i);
      out[i] = code <= 0x00ff ? code : replacement;
    }
    return out;
  };
}

export function createMappedSjisEncoder(mapping: Record<string, number>, replacement: number = 0x003f): EncodeSjisFn {
  return (text: string): Uint16Array => {
    const out = new Uint16Array(text.length);
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      const mapped = mapping[ch];
      if (typeof mapped === "number") {
        out[i] = mapped & 0xffff;
      } else {
        const code = text.charCodeAt(i);
        out[i] = code <= 0x00ff ? code : replacement;
      }
    }
    return out;
  };
}
