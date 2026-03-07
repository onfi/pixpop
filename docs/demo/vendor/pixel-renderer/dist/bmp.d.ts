type ParsedBmp1 = {
    width: number;
    height: number;
    blackIndex: 0 | 1;
    rowStride: number;
    pixelOffset: number;
    bottomUp: boolean;
    bytes: Uint8Array;
};
export declare function parseBmp1(bytes: Uint8Array): ParsedBmp1;
export declare function bmp1ToPackedBlackBits(parsed: ParsedBmp1): Uint8Array;
export {};
