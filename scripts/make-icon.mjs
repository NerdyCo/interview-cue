import { mkdirSync, writeFileSync } from "node:fs";
import zlib from "node:zlib";

const DARK = [15, 23, 42, 255];
const SKY = [56, 189, 248, 255];
const CLEAR = [0, 0, 0, 0];

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32 ? zlib.crc32(body) : crc32(body));
  return Buffer.concat([len, body, crc]);
}

function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function png(size) {
  const s = size / 16;
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    for (let x = 0; x < size; x++) {
      const gx = x / s;
      const gy = y / s;
      const inside = gx >= 1 && gx < 15 && gy >= 1 && gy < 15;
      const border = inside && (gx < 2 || gx >= 14 || gy < 2 || gy >= 14);
      const l1 = inside && gy >= 6 && gy < 7.4 && gx >= 4 && gx < 12;
      const l2 = inside && gy >= 10 && gy < 11.4 && gx >= 4 && gx < 12;
      const c = border || l1 || l2 ? SKY : inside ? DARK : CLEAR;
      row.set(c, 1 + x * 4);
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(Buffer.concat(rows), { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const sizes = [16, 24, 32, 48, 256];
const images = sizes.map((n) => ({ size: n, data: png(n) }));

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(images.length, 4);

let offset = 6 + 16 * images.length;
const entries = [];
for (const { size, data } of images) {
  const e = Buffer.alloc(16);
  e[0] = size >= 256 ? 0 : size;
  e[1] = size >= 256 ? 0 : size;
  e.writeUInt16LE(1, 4);
  e.writeUInt16LE(32, 6);
  e.writeUInt32LE(data.length, 8);
  e.writeUInt32LE(offset, 12);
  entries.push(e);
  offset += data.length;
}

mkdirSync("assets", { recursive: true });
writeFileSync(
  "assets/icon.ico",
  Buffer.concat([header, ...entries, ...images.map((i) => i.data)]),
);
console.log("assets/icon.ico dibuat");
