# pixpop

`pixpop` は、ビットマップフォント（1bit atlas）を使って、テキストやスプライトを重ねた PNG 画像を簡単に生成するライブラリです。

- npm package: `pixpop`
- デモ: https://onfi.github.io/pixpop/demo/
- English documentation is available at `docs/README.en.md`.

## 主な機能

- 1bit BMP フォントアトラス（SJIS byte-matrix 256）による文字描画
- UTF-8 文字列のデフォルト CP932 変換
- 背景やスプライトの重ね描き（`png` リクエスト）
- Node / ブラウザ両対応（`toPng()`）
- ブラウザでは `toImage()` で `HTMLImageElement` を取得可能

## 構成

- `packages/pixel-renderer`: 本体（npm公開対象）
- `packages/make-sjis-bmp-from-ttf`: TTF/OTF -> `bmp.gz` 変換スクリプト
- `packages/pixel-core-wasm`: WASM core
- `docs/demo`: ブラウザデモ

## Node.js で使う

必要環境:
- Node.js 20 以上

インストール:

```bash
npm i pixpop
```

最小例（Node.js）:

```ts
import { createPixelRenderer } from "pixpop";
import { createNodeFsAssetResolver, createNodeCodecAdapters } from "pixpop/node-adapters";

const codec = createNodeCodecAdapters({
  decode: async (_bytes) => {
    throw new Error("PNG/BMP decode を実装してください（pngjs/sharp など）");
  },
  encodePng: async (_image) => {
    throw new Error("PNG encode を実装してください（pngjs/sharp など）");
  },
});

const renderer = createPixelRenderer({
  resolveAsset: createNodeFsAssetResolver(process.cwd()),
  decodeSpriteImage: codec.decodeSpriteImage,
  encodePng: codec.encodePng,
});
```

## ブラウザで使う

```ts
import { createPixelRenderer } from "pixpop";
import { createWebPngEncode } from "pixpop/web-adapters";

const renderer = createPixelRenderer({
  encodePng: createWebPngEncode(),
});
```

- `toPng()` は Node / ブラウザ両方で利用可能
- `toImage()` はブラウザ専用（Node では `E_WEB_API_UNAVAILABLE`）

## 標準的な config 例

Cloudflare Worker 側の標準設定例:

```json
{
  "fontManifestPath": "fonts/kh-dot-akihabara-16/manifest.json",
  "fontAtlasGzPath": "fonts/kh-dot-akihabara-16/KH-Dot-Akihabara-16-sjis16.bmp.gz",
  "backgroundPngPath": "bg.png",
  "textColor": "#000000",
  "center": { "x": 194, "y": 110 },
  "textScale": 1,
  "outputScale": 5
}
```

- 背景画像サイズ: `384x216`
- 出力サイズ: `384*outputScale x 216*outputScale`（デフォルト `1920x1080`）

## フォントの追加方法

フォーマット:
- manifest（`encoding: "sjis"`, `layout: "sjis-byte-matrix-256"`, `bitDepth: 1`）
- atlas（`bmp` または `bmp.gz`）

TTF から作成:

```bash
python packages/make-sjis-bmp-from-ttf/make_sjis_bmp_from_ttf.py \
  /path/to/font.ttf \
  --out ./font.bmp.gz \
  --glyph-width 16 \
  --glyph-height 16 \
  --font-size 16
```

## スプライトの配置方法

`render` の `requests` に `type: "png"` を追加し、`x`, `y`, `scale` を指定します。

```ts
requests: [
  { type: "png", x: 0, y: 0, scale: 1, image: backgroundRgba },
  { type: "png", x: 120, y: 80, scale: 2, image: spriteRgba },
  { type: "text", x: 20, y: 60, text: "こんにちは", scale: 1, color: "#000000" }
]
```

## Cloudflare Worker で使う

Cloudflare Worker での利用は以下のリポジトリを利用できます。

- https://github.com/onfi/pixpop-cf-worker

`pixpop-cf-worker` は:
- クエリ `?text=...` でテキストを受け取り
- `config/bg.png` にテキストを合成し
- 拡大 PNG を返します

## ライセンスと謝辞

- 本リポジトリのコード: MIT License（[LICENSE](./LICENSE)）
- 同梱フォント `KH-Dot-Akihabara-16`: SIL Open Font License 1.1（OFL-1.1）
  - 配布元: http://jikasei.me/font/kh-dotfont/
  - 詳細: `packages/pixel-renderer/assets/fonts/kh-dot-akihabara-16/` 配下の `LICENSE.OFL-1.1.txt` と `NOTICE.txt`

謝辞:
- 素晴らしい KH-Dot Font を公開している自家製フォント工房、および関連する作者の皆様に感謝します。
