import { RgbaImage } from "./types.js";
export declare function parseHexColor(color: `#${string}`): [number, number, number];
export declare function createCanvas(width: number, height: number, color: [number, number, number]): RgbaImage;
export declare function blitScaledRgba(dst: RgbaImage, src: RgbaImage, x: number, y: number, scale: number): void;
export declare function drawSjisText1Bit(dst: RgbaImage, atlas1Bit: Uint8Array, glyphWidth: number, glyphHeight: number, bitOrder: "msb" | "lsb", codes: Uint16Array, x: number, y: number, scale: number, color: [number, number, number]): void;
