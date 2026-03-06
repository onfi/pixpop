# API仕様書 v0.1 (BMP + Manifest + SJIS)

最終更新日: 2026-03-06
対象: `@your-scope/pixel-renderer` / `@your-scope/pixel-core-wasm`

## 1. 基本方針
- フォントは `BMP(1bit) + manifest` で管理
- UTF-8 -> SJIS 変換は TS 側
- フォントは 1bit のまま登録
- 背景色でキャンバス初期化後、リクエスト配列を順次描画

## 2. 描画リクエスト

### 2.1 `png`
- `x`, `y`, `image`, `scale`
- `image` は `RgbaImage`
- 合成は alpha 乗算

### 2.2 `text`
- `x`, `y`, `text`, `scale`, `color`, `fontId?`
- `fontId` 未指定時は最初に登録したフォントを使用
- 1bitフォントの黒ピクセルを `color` で描画
- 白ピクセルは透過扱い

## 3. フォント座標
`sjis-byte-matrix-256`:
- `x = lowByte * glyphWidth`
- `y = highByte * glyphHeight`

## 4. Manifest
```json
{
  "version": 1,
  "encoding": "sjis",
  "atlas": "font.bmp",
  "glyphWidth": 16,
  "glyphHeight": 16,
  "layout": "sjis-byte-matrix-256",
  "bitDepth": 1,
  "bitOrder": "msb"
}
```

## 5. TS型
- `BitmapFontSource = { manifest, atlas1bit }`
- `WasmRenderInput = { width, height, backgroundColor, requests }`
- `RendererOptions = { resolveAsset, decodeSpriteImage, encodePng, encodeSjis, wasm }`

## 6. WASM Core IF
- `create_canvas(width,height,r,g,b)`
- `blit_scaled_rgba(base,...,src,...,x,y,scale)`
- `draw_sjis_text_1bit(base,...,atlas1bit,glyphW,glyphH,bitOrder,codes,x,y,scale,r,g,b)`

TSの `createWasmCoreFromModule` で上記exportを接続する。

## 7. エラー
- `E_INVALID_MANIFEST`
- `E_INVALID_FONT_BINARY`
- `E_INVALID_FONT_IMAGE`
- `E_FONT_NOT_FOUND`
- `E_INVALID_REQUEST`
- `E_INVALID_SCALE`
- `E_INVALID_COLOR`

## 8. 実装順
1. フォント登録 (manifest + BMP 1bit正規化)
2. `png` / `text` 描画
3. WASM接続
4. Node/Web codec adapter 追加
