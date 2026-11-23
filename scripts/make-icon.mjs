/**
 * Рисует иконку языка Kuza (PNG) без внешних зависимостей.
 *
 * Форма взята из логотипа: оранжевый скруглённый квадрат, тёмная
 * вертикальная черта и «K» в виде скобки кода.
 *
 * Запуск: node scripts/make-icon.mjs
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const SIZE = 128;
const SUPERSAMPLE = 4;

const COLORS = {
  light: { accent: [242, 107, 33], ink: [16, 20, 23] },
  dark: { accent: [255, 154, 61], ink: [16, 20, 23] },
};

// ── PNG ────────────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = -1;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(width, height, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // бит на канал
  header[9] = 6; // RGBA
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // фильтр none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── рисование ──────────────────────────────────────────────────────────────

function insideRoundRect(x, y, left, top, width, height, radius) {
  if (x < left || y < top || x > left + width || y > top + height) return false;
  const cx = Math.min(Math.max(x, left + radius), left + width - radius);
  const cy = Math.min(Math.max(y, top + radius), top + height - radius);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= radius * radius;
}

function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  const x = ax + t * dx;
  const y = ay + t * dy;
  return Math.hypot(px - x, py - y);
}

function drawIcon({ accent, ink }) {
  const canvas = Buffer.alloc(SIZE * SIZE * 4);
  const unit = SIZE / 96; // координаты логотипа заданы в сетке 96×96
  const samples = SUPERSAMPLE * SUPERSAMPLE;

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      for (let sy = 0; sy < SUPERSAMPLE; sy++) {
        for (let sx = 0; sx < SUPERSAMPLE; sx++) {
          const px = (x + (sx + 0.5) / SUPERSAMPLE) / unit;
          const py = (y + (sy + 0.5) / SUPERSAMPLE) / unit;

          let color = null;
          const bar = insideRoundRect(px, py, 27, 24, 10, 48, 5);
          const stroke = 5;
          const k =
            distanceToSegment(px, py, 66, 24, 42, 48) <= stroke ||
            distanceToSegment(px, py, 42, 48, 66, 72) <= stroke;
          const tile = insideRoundRect(px, py, 0, 0, 96, 96, 22);

          if (bar || k) color = ink;
          else if (tile) color = accent;

          if (color) {
            r += color[0];
            g += color[1];
            b += color[2];
            a += 255;
          }
        }
      }

      const index = (y * SIZE + x) * 4;
      if (a > 0) {
        canvas[index] = Math.round(r / (a / 255));
        canvas[index + 1] = Math.round(g / (a / 255));
        canvas[index + 2] = Math.round(b / (a / 255));
      }
      canvas[index + 3] = Math.round(a / samples);
    }
  }

  return canvas;
}

const outDir = new URL("../packages/vscode/icons/", import.meta.url);
mkdirSync(outDir, { recursive: true });

for (const [name, palette] of Object.entries(COLORS)) {
  const file = new URL(`kuza-${name}.png`, outDir);
  writeFileSync(file, encodePng(SIZE, SIZE, drawIcon(palette)));
  console.log(`• ${file.pathname}`);
}

console.log("✅ Иконки готовы");
