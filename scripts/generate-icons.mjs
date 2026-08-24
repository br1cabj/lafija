// Generates PWA icons without external dependencies (pure Node + zlib).
// Usage: node scripts/generate-icons.mjs
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const crcTable = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const BRAND = [255, 85, 0];
const DARK = [11, 12, 16];
const WHITE = [255, 255, 255];

// Lightning bolt polygon in normalized coords
const BOLT = [
  [0.63, 0.04],
  [0.24, 0.56],
  [0.46, 0.56],
  [0.37, 0.96],
  [0.76, 0.42],
  [0.53, 0.42],
];

function inPolygon(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function roundRectSDF(x, y, cx, cy, hw, hh, r) {
  const dx = Math.abs(x - cx) - (hw - r);
  const dy = Math.abs(y - cy) - (hh - r);
  const ox = Math.max(dx, 0);
  const oy = Math.max(dy, 0);
  return Math.sqrt(ox * ox + oy * oy) + Math.min(Math.max(dx, dy), 0) - r;
}

/**
 * variant 'any': dark bg + orange rounded square + white bolt
 * variant 'maskable': full-bleed orange bg + white bolt (safe zone centered)
 */
function render(size, variant) {
  const rgba = Buffer.alloc(size * size * 4);
  const pad = variant === 'maskable' ? 0 : size * 0.08;
  const boxR = variant === 'maskable' ? 0 : size * 0.18;
  const half = (size - pad * 2) / 2;

  // bolt occupies central safe zone
  const zoneMin = variant === 'maskable' ? pad + size * 0.2 : pad + size * 0.14;
  const zoneMax = variant === 'maskable' ? size - pad - size * 0.2 : size - pad - size * 0.14;
  const zone = zoneMax - zoneMin;
  const scaled = BOLT.map(([x, y]) => [zoneMin + x * zone, zoneMin + y * zone]);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let color;
      if (variant === 'maskable') {
        color = BRAND;
      } else {
        const d = roundRectSDF(x + 0.5, y + 0.5, size / 2, size / 2, half, half, boxR);
        color = d <= 0.5 ? BRAND : DARK;
      }
      if (inPolygon(x + 0.5, y + 0.5, scaled)) color = WHITE;
      const i = (y * size + x) * 4;
      rgba[i] = color[0];
      rgba[i + 1] = color[1];
      rgba[i + 2] = color[2];
      rgba[i + 3] = 255;
    }
  }
  return encodePng(size, size, rgba);
}

writeFileSync(join(outDir, 'icon-192.png'), render(192, 'any'));
writeFileSync(join(outDir, 'icon-512.png'), render(512, 'any'));
writeFileSync(join(outDir, 'icon-maskable-512.png'), render(512, 'maskable'));
console.log('Icons written to public/icons/');
