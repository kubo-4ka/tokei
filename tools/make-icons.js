#!/usr/bin/env node
'use strict';
/*
 * アプリアイコン（PNG）を作るスクリプト。外部ライブラリ不要。
 *   node tools/make-icons.js
 * favicon.svg と同じ図柄（文字盤と針）を、4×4 のスーパーサンプリングで描きます。
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.join(__dirname, '..', 'icons');
fs.mkdirSync(OUT, { recursive: true });

const C1 = [0x24, 0x1c, 0x3a];
const C2 = [0x0b, 0x0b, 0x10];
const INK = [0xf4, 0xf1, 0xea];
const DOT = [0xa9, 0x8c, 0xf2];

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function draw(size, { maskable = false, rounded = true } = {}) {
  const k = (maskable ? 0.62 : 0.84) * size / 64; // favicon の 64 単位を拡大
  const cx = size / 2, cy = size / 2;
  const P = (x, y) => [cx + (x - 32) * k, cy + (y - 32) * k];
  const ring = 21 * k, ringW = 2.4 * k, handW = 4 * k, dot = 3.4 * k;
  const c = P(32, 32), hHour = P(32, 18), hMin = P(41, 38);
  const rad = rounded ? size * 0.22 : 0;
  const inBg = (x, y) => {
    if (!rad) return true;
    const qx = Math.max(rad - x, 0, x - (size - rad));
    const qy = Math.max(rad - y, 0, y - (size - rad));
    return qx * qx + qy * qy <= rad * rad;
  };
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

  const S = 4;
  const buf = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    buf[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) {
        const px = x + (sx + 0.5) / S, py = y + (sy + 0.5) / S;
        if (!inBg(px, py)) continue;
        let col = mix(C1, C2, (px + py) / (2 * size));
        const d = Math.hypot(px - c[0], py - c[1]);
        if (d <= dot) col = DOT;
        else if (segDist(px, py, c[0], c[1], hHour[0], hHour[1]) <= handW / 2 || segDist(px, py, c[0], c[1], hMin[0], hMin[1]) <= handW / 2) col = INK;
        else if (Math.abs(d - ring) <= ringW / 2) col = mix(col, INK, 0.45);
        r += col[0]; g += col[1]; b += col[2]; a += 255;
      }
      const n = S * S, o = y * (size * 4 + 1) + 1 + x * 4;
      if (a) { buf[o] = Math.round(r / (a / 255)); buf[o + 1] = Math.round(g / (a / 255)); buf[o + 2] = Math.round(b / (a / 255)); }
      buf[o + 3] = Math.round(a / n);
    }
  }
  return png(size, size, buf);
}

function crc32(b) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < b.length; n++) {
    c = (crc ^ b[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(w, h, raw) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))
  ]);
}

const jobs = [
  ['icon-192.png', 192, {}],
  ['icon-512.png', 512, {}],
  ['icon-maskable-512.png', 512, { maskable: true, rounded: false }],
  ['apple-touch-icon.png', 180, { rounded: false }]
];
for (const [name, size, opt] of jobs) {
  fs.writeFileSync(path.join(OUT, name), draw(size, opt));
  console.log('icons/' + name);
}
