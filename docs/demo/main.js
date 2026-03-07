import { createPixelRenderer } from './vendor/pixel-renderer/dist/index.js';
import { createWebPngEncode } from './vendor/pixel-renderer/dist/web-adapters.js';

const WIDTH = 256;
const HEIGHT = 224;
const FONT_PATH = './assets/fonts/kh-dot-akihabara-16';

const textInput = document.getElementById('textInput');
const colorInput = document.getElementById('colorInput');
const backgroundInput = document.getElementById('backgroundInput');
const resetBgButton = document.getElementById('resetBgButton');
const statusEl = document.getElementById('status');
const pngPreview = document.getElementById('pngPreview');
const downloadLink = document.getElementById('downloadLink');

let renderer;
const fontId = 'kh-dot-akihabara-16';
let currentBackground = makeDefaultBackground();
let renderSerial = 0;
let downloadUrl = null;

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? '#ff8b8b' : '';
}

function makeDefaultBackground() {
  const data = new Uint8Array(WIDTH * HEIGHT * 4);
  const skyTop = [8, 16, 44];
  const skyBottom = [24, 34, 72];
  const panelBg = [18, 24, 40];
  const panelShade = [14, 18, 32];
  const borderDark = [20, 28, 54];
  const borderLight = [224, 238, 255];

  function putPixel(x, y, c) {
    if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) {
      return;
    }
    const i = (y * WIDTH + x) * 4;
    data[i] = c[0];
    data[i + 1] = c[1];
    data[i + 2] = c[2];
    data[i + 3] = 255;
  }

  for (let y = 0; y < HEIGHT; y += 1) {
    const t = y / (HEIGHT - 1);
    const r = Math.round(skyTop[0] * (1 - t) + skyBottom[0] * t);
    const g = Math.round(skyTop[1] * (1 - t) + skyBottom[1] * t);
    const b = Math.round(skyTop[2] * (1 - t) + skyBottom[2] * t);
    for (let x = 0; x < WIDTH; x += 1) {
      const twinkle = ((x * 29 + y * 17) & 127) === 0 ? 20 : 0;
      putPixel(x, y, [Math.min(255, r + twinkle), Math.min(255, g + twinkle), Math.min(255, b + twinkle)]);
    }
  }

  const boxX = 20;
  const boxY = 60;
  const boxW = WIDTH - 36;
  const boxH = 100;

  for (let y = boxY; y < boxY + boxH; y += 1) {
    for (let x = boxX; x < boxX + boxW; x += 1) {
      const shade = ((x + y) & 3) === 0 ? panelShade : panelBg;
      putPixel(x, y, shade);
    }
  }

  for (let x = boxX; x < boxX + boxW; x += 1) {
    putPixel(x, boxY, borderLight);
    putPixel(x, boxY + boxH - 1, borderDark);
  }
  for (let y = boxY; y < boxY + boxH; y += 1) {
    putPixel(boxX, y, borderLight);
    putPixel(boxX + boxW - 1, y, borderDark);
  }

  const inset = 3;
  for (let x = boxX + inset; x < boxX + boxW - inset; x += 1) {
    putPixel(x, boxY + inset, borderLight);
    putPixel(x, boxY + boxH - 1 - inset, borderDark);
  }
  for (let y = boxY + inset; y < boxY + boxH - inset; y += 1) {
    putPixel(boxX + inset, y, borderLight);
    putPixel(boxX + boxW - 1 - inset, y, borderDark);
  }

  const tailBaseX = boxX + Math.floor(boxW * 0.74);
  const tailBaseY = boxY + boxH - 1;
  for (let i = 0; i < 12; i += 1) {
    const span = 10 - i;
    for (let dx = -span; dx <= span; dx += 1) {
      putPixel(tailBaseX + dx, tailBaseY + i, panelBg);
    }
    putPixel(tailBaseX - span, tailBaseY + i, borderDark);
    putPixel(tailBaseX + span, tailBaseY + i, borderDark);
  }

  for (let i = 0; i < 8; i += 1) {
    putPixel(tailBaseX - 10 + i, tailBaseY + i, borderLight);
  }

  return { width: WIDTH, height: HEIGHT, data };
}

function fitCover(srcW, srcH, dstW, dstH) {
  const scale = Math.max(dstW / srcW, dstH / srcH);
  const drawW = Math.round(srcW * scale);
  const drawH = Math.round(srcH * scale);
  const dx = Math.floor((dstW - drawW) / 2);
  const dy = Math.floor((dstH - drawH) / 2);
  return { dx, dy, drawW, drawH };
}

async function fileToRgbaImage(file) {
  const bitmap = await createImageBitmap(file);
  const c = document.createElement('canvas');
  c.width = WIDTH;
  c.height = HEIGHT;
  const cctx = c.getContext('2d', { willReadFrequently: true });
  cctx.imageSmoothingEnabled = false;
  cctx.fillStyle = '#000';
  cctx.fillRect(0, 0, WIDTH, HEIGHT);

  const { dx, dy, drawW, drawH } = fitCover(bitmap.width, bitmap.height, WIDTH, HEIGHT);
  cctx.drawImage(bitmap, dx, dy, drawW, drawH);

  const imageData = cctx.getImageData(0, 0, WIDTH, HEIGHT);
  return { width: WIDTH, height: HEIGHT, data: new Uint8Array(imageData.data) };
}

function measureText(text, glyphWidth, glyphHeight, scale) {
  const lines = text.split('\n');
  const maxLen = lines.reduce((m, line) => Math.max(m, [...line].length), 0);
  return {
    width: maxLen * glyphWidth * scale,
    height: Math.max(1, lines.length) * glyphHeight * scale,
  };
}

async function renderFrame() {
  if (!renderer) {
    return;
  }
  const serial = ++renderSerial;
  const text = textInput.value;

  const requests = [{ type: 'png', x: 0, y: 0, scale: 1, image: currentBackground }];
  if (text.length > 0) {
    const glyphWidth = 16;
    const glyphHeight = 16;
    const scale = 1;
    const metrics = measureText(text, glyphWidth, glyphHeight, scale);
    const x = Math.floor((WIDTH - metrics.width) / 2);
    const y = Math.floor((HEIGHT - metrics.height) / 2);
    requests.push({
      type: 'text',
      x,
      y,
      text,
      scale,
      color: colorInput.value,
      fontId,
    });
  }

  const result = await renderer.render({
    width: WIDTH,
    height: HEIGHT,
    backgroundColor: '#000000',
    requests,
  });

  if (serial !== renderSerial) {
    return;
  }

  const img = await result.toImage();
  pngPreview.src = img.src;

  const pngBytes = await result.toPng();
  if (downloadUrl) {
    URL.revokeObjectURL(downloadUrl);
  }
  downloadUrl = URL.createObjectURL(new Blob([pngBytes], { type: 'image/png' }));
  downloadLink.href = downloadUrl;

  setStatus(`rendered ${WIDTH}x${HEIGHT} PNG`);
}

async function setup() {
  try {
    setStatus('フォント読み込み中...');

    const manifestRes = await fetch(`${FONT_PATH}/manifest.json`);
    const manifest = await manifestRes.json();

    const atlasRes = await fetch(`${FONT_PATH}/KH-Dot-Akihabara-16-sjis16.bmp`);
    const atlasBytes = new Uint8Array(await atlasRes.arrayBuffer());

    renderer = createPixelRenderer({
      encodePng: createWebPngEncode(),
    });
    await renderer.registerBitmapFont(
      {
        manifest,
        atlas1bit: atlasBytes,
      },
      { id: fontId },
    );

    textInput.addEventListener('input', () => {
      void renderFrame();
    });

    colorInput.addEventListener('input', () => {
      void renderFrame();
    });

    backgroundInput.addEventListener('change', async (ev) => {
      const file = ev.target.files?.[0];
      if (!file) {
        return;
      }
      currentBackground = await fileToRgbaImage(file);
      await renderFrame();
    });

    resetBgButton.addEventListener('click', async () => {
      currentBackground = makeDefaultBackground();
      backgroundInput.value = '';
      await renderFrame();
    });

    await renderFrame();
  } catch (err) {
    console.error(err);
    setStatus(`初期化エラー: ${String(err)}`, true);
  }
}

void setup();
