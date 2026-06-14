// Generates the favicon / PWA icon set and the social (Open Graph) image as
// committed PNG artifacts, so the static site ships without a build step.
//
// Run after changing the brand mark:  node scripts/generate-icons.mjs
//
// Dependency-free: writes raw PNGs using Node's built-in zlib. The brand mark
// is a stylized leaf on a green gradient, matching the site's garden palette.

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import process from 'node:process';

const rootDir = process.cwd();

const TOP_GREEN = [74, 124, 47];   // --secondary-green #4a7c2f
const BOTTOM_GREEN = [45, 80, 22]; // --primary-green  #2d5016
const LEAF = [244, 249, 236];      // soft cream
const VEIN = [74, 124, 47];

// --- PNG encoding -----------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

// rgb: Uint8Array of width*height*3, row-major.
function encodePng(width, height, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor RGB
  // ihdr[10..12] = 0 (deflate / adaptive / no interlace)

  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter type: none
    raw.set(rgb.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }

  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- Drawing ----------------------------------------------------------------

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function mix(c1, c2, t) {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

// Leaf coverage at a point, sampled in the unit square [0,1]x[0,1].
// Returns { leaf, vein } coverage flags for a single sub-sample.
function sampleLeaf(u, v) {
  // Center the leaf and tilt it slightly.
  const cx = u - 0.5;
  const cy = v - 0.5;
  const angle = -0.32; // radians, top leans right
  const dx = Math.sin(angle);
  const dy = -Math.cos(angle);
  // Perpendicular (lateral) axis.
  const px = -dy;
  const py = dx;

  const length = 0.72;
  const width = 0.34;
  // Base point so the leaf is centered.
  const bx = -dx * (length / 2);
  const by = -dy * (length / 2);

  const rx = cx - bx;
  const ry = cy - by;
  const along = rx * dx + ry * dy;      // 0 (base) .. length (tip)
  const lateral = rx * px + ry * py;    // signed distance from midrib

  const t = along / length;
  if (t < 0 || t > 1) return { leaf: false, vein: false };

  const halfW = (width / 2) * Math.pow(Math.sin(Math.PI * t), 0.62);
  const absLat = Math.abs(lateral);
  if (absLat > halfW) return { leaf: false, vein: false };

  // Midrib vein, tapering toward the tip.
  const veinHalf = 0.012 * (1 - t * 0.6);
  return { leaf: true, vein: absLat <= veinHalf };
}

function renderSquare(size) {
  const rgb = new Uint8Array(size * size * 3);
  const SS = 4; // supersampling per axis
  const SS2 = SS * SS;

  for (let y = 0; y < size; y++) {
    const bgT = y / (size - 1);
    const bg = mix(TOP_GREEN, BOTTOM_GREEN, bgT);
    for (let x = 0; x < size; x++) {
      let leafHits = 0;
      let veinHits = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (x + (sx + 0.5) / SS) / size;
          const v = (y + (sy + 0.5) / SS) / size;
          const s = sampleLeaf(u, v);
          if (s.leaf) leafHits++;
          if (s.vein) veinHits++;
        }
      }
      const leafCov = leafHits / SS2;
      const veinCov = veinHits / SS2;
      // Composite: background -> leaf -> vein.
      let c = bg;
      if (leafCov > 0) c = mix(bg, LEAF, leafCov);
      if (veinCov > 0) c = mix(c, VEIN, veinCov);

      const i = (y * size + x) * 3;
      rgb[i] = Math.round(c[0]);
      rgb[i + 1] = Math.round(c[1]);
      rgb[i + 2] = Math.round(c[2]);
    }
  }
  return rgb;
}

function renderOg(width, height) {
  const rgb = new Uint8Array(width * height * 3);
  const SS = 4;
  const SS2 = SS * SS;
  // The leaf occupies a centered square region for consistent proportions.
  const leafSize = Math.round(height * 0.82);
  const leafLeft = Math.round(width / 2 - leafSize / 2);
  const leafTop = Math.round(height / 2 - leafSize / 2);

  for (let y = 0; y < height; y++) {
    const bgT = y / (height - 1);
    const bg = mix(TOP_GREEN, BOTTOM_GREEN, bgT);
    for (let x = 0; x < width; x++) {
      let c = bg;
      const lu = (x - leafLeft) / leafSize;
      const lv = (y - leafTop) / leafSize;
      if (lu >= 0 && lu <= 1 && lv >= 0 && lv <= 1) {
        let leafHits = 0;
        let veinHits = 0;
        for (let sy = 0; sy < SS; sy++) {
          for (let sx = 0; sx < SS; sx++) {
            const u = lu + (sx + 0.5) / SS / leafSize;
            const v = lv + (sy + 0.5) / SS / leafSize;
            const s = sampleLeaf(u, v);
            if (s.leaf) leafHits++;
            if (s.vein) veinHits++;
          }
        }
        const leafCov = leafHits / SS2;
        const veinCov = veinHits / SS2;
        if (leafCov > 0) c = mix(bg, LEAF, leafCov);
        if (veinCov > 0) c = mix(c, VEIN, veinCov);
      }
      const i = (y * width + x) * 3;
      rgb[i] = Math.round(c[0]);
      rgb[i + 1] = Math.round(c[1]);
      rgb[i + 2] = Math.round(c[2]);
    }
  }
  return rgb;
}

// --- Output -----------------------------------------------------------------

function write(relPath, buf) {
  const full = path.join(rootDir, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, buf);
  console.log(`wrote ${relPath} (${buf.length} bytes)`);
}

const squares = [
  ['icons/favicon-32.png', 32],
  ['icons/apple-touch-icon.png', 180],
  ['icons/icon-192.png', 192],
  ['icons/icon-512.png', 512],
];

for (const [rel, size] of squares) {
  write(rel, encodePng(size, size, renderSquare(size)));
}

write('og-image.png', encodePng(1200, 630, renderOg(1200, 630)));

console.log('Icon generation complete.');
