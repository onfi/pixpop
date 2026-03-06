import { createPixelRenderer, loadWasmCore } from "@your-scope/pixel-renderer";
import { createNodeCodecAdapters, createNodeFsAssetResolver } from "@your-scope/pixel-renderer/node-adapters";

async function main(): Promise<void> {
  const wasm = await loadWasmCore(() => import("@your-scope/pixel-core-wasm/pkg"));

  const codec = createNodeCodecAdapters({
    decode: async (_bytes) => {
      throw new Error("Provide PNG/BMP decoder (e.g. pngjs/sharp)");
    },
    encodePng: async (_image) => {
      throw new Error("Provide PNG encoder (e.g. pngjs/sharp)");
    },
  });

  const renderer = createPixelRenderer({
    wasm,
    resolveAsset: createNodeFsAssetResolver(process.cwd()),
    decodeSpriteImage: codec.decodeSpriteImage,
    encodePng: codec.encodePng,
  });

  await renderer.registerBitmapFont({
    manifest: {
      version: 1,
      encoding: "sjis",
      atlas: "font.bmp",
      glyphWidth: 16,
      glyphHeight: 16,
      layout: "sjis-byte-matrix-256",
      bitDepth: 1,
      bitOrder: "msb",
    },
    atlas1bit: "font.bmp",
  });

  const result = await renderer.render({
    width: 320,
    height: 180,
    backgroundColor: "#000000",
    requests: [
      { type: "text", x: 8, y: 8, text: "HELLO", scale: 1, color: "#ffffff" },
    ],
  });

  const png = await result.toPng();
  console.log("Rendered bytes:", png.length);
}

void main();
