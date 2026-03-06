import { DecodeSpriteImageFn, EncodePngFn, PixelRendererError, ResolveAssetFn, RgbaImage } from "./types.js";

function ensureCanvasApi(): void {
  if (typeof OffscreenCanvas === "undefined" || typeof createImageBitmap === "undefined" || typeof ImageData === "undefined") {
    throw new PixelRendererError("E_WEB_API_UNAVAILABLE", "Web adapters require OffscreenCanvas/createImageBitmap/ImageData.");
  }
}

export function createFetchAssetResolver(baseUrl: string): ResolveAssetFn {
  return async (assetPath: string): Promise<Uint8Array> => {
    const url = new URL(assetPath, baseUrl).toString();
    const res = await fetch(url);
    if (!res.ok) {
      throw new PixelRendererError("E_ASSET_NOT_FOUND", `Failed to fetch asset: ${url}`);
    }
    return new Uint8Array(await res.arrayBuffer());
  };
}

export function createWebPngDecode(): DecodeSpriteImageFn {
  return async (input): Promise<RgbaImage> => {
    ensureCanvasApi();

    let bytes: Uint8Array;
    if (typeof input === "string") {
      const res = await fetch(input);
      if (!res.ok) {
        throw new PixelRendererError("E_INVALID_IMAGE_DATA", `Failed to fetch image: ${input}`);
      }
      bytes = new Uint8Array(await res.arrayBuffer());
    } else {
      bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    }

    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    const blob = new Blob([copy.buffer as ArrayBuffer], { type: "image/png" });
    const bitmap = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      throw new PixelRendererError("E_WEB_API_UNAVAILABLE", "2D context unavailable.");
    }
    ctx.drawImage(bitmap, 0, 0);
    const data = ctx.getImageData(0, 0, bitmap.width, bitmap.height).data;

    return {
      width: bitmap.width,
      height: bitmap.height,
      data: new Uint8Array(data),
    };
  };
}

export function createWebPngEncode(): EncodePngFn {
  return async (image): Promise<Uint8Array> => {
    ensureCanvasApi();

    const canvas = new OffscreenCanvas(image.width, image.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new PixelRendererError("E_WEB_API_UNAVAILABLE", "2D context unavailable.");
    }
    const clamped = new Uint8ClampedArray(image.data);
    const imageData = new ImageData(clamped, image.width, image.height);
    ctx.putImageData(imageData, 0, 0);
    const blob = await canvas.convertToBlob({ type: "image/png" });
    return new Uint8Array(await blob.arrayBuffer());
  };
}

export function createWebCodecAdapters(): { decodeSpriteImage: DecodeSpriteImageFn; encodePng: EncodePngFn } {
  return {
    decodeSpriteImage: createWebPngDecode(),
    encodePng: createWebPngEncode(),
  };
}
