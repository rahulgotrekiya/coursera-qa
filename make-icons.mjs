// Minimal PNG writer: signature + IHDR + IDAT + IEND. RGBA, no interlace.
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

const crc32 = (buf) => {
  let c = -1;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  // rows are filter-byte + pixels
  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 4)] = 0;
    rgba.copy(raw, y * (1 + size * 4) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

export function draw(size, frame, { bg, lit, dim, radius = 0.22, n = 7 }) {
  const rgba = Buffer.alloc(size * size * 4);
  const [br, bgc, bb] = hex(bg);
  const r = size * radius;

  const put = (x, y, [cr, cg, cb]) => {
    const i = (y * size + x) * 4;
    rgba[i] = cr; rgba[i + 1] = cg; rgba[i + 2] = cb; rgba[i + 3] = 255;
  };

  // rounded-square background, transparent outside
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = Math.max(r - x - 0.5, x + 0.5 - (size - r), 0);
      const dy = Math.max(r - y - 0.5, y + 0.5 - (size - r), 0);
      if (dx * dx + dy * dy <= r * r) put(x, y, [br, bgc, bb]);
    }
  }

  // 7x7 grid, boundaries computed from the span so nothing drifts
  const pad = Math.round(size * 0.14);
  const span = size - 2 * pad;
  const gap = Math.max(size >= 48 ? 1 : 0, Math.round(size * 0.018));
  const edge = (i) => pad + Math.round((i * span) / n);

  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const on = frame.includes(row * n + col);
      const c = hex(on ? lit : dim);
      for (let y = edge(row); y < edge(row + 1) - gap; y++)
        for (let x = edge(col); x < edge(col + 1) - gap; x++) put(x, y, c);
    }
  }
  return png(size, rgba);
}

export const write = (path, size, frame, opts) =>
  writeFileSync(path, draw(size, frame, opts));

// --- the extension mark -------------------------------------------------
// A diamond of dots: the shape the side panel's loader traces as it runs.
// 5x5 rather than the loader's 7x7 because at 16px a 7x7 cell is ~2px and the
// ring merges into a blob. Same silhouette at every size; only the unlit grid
// behind it appears once there are enough pixels to show it.

const CREAM = "#ffffeb";
const INK = "#1a1a1a";

const diamond = (n) => {
  const mid = (n - 1) / 2;
  const cells = [];
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (Math.abs(r - mid) + Math.abs(c - mid) === mid) cells.push(r * n + c);
  return cells;
};

const mark = diamond(5);

for (const [size, dim] of [[16, INK], [48, "#333330"], [128, "#333330"]]) {
  write(`icon${size}.png`, size, mark, { bg: INK, lit: CREAM, dim, n: 5 });
  console.log(`icon${size}.png`);
}
