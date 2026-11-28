import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';

type Image = { width: number; height: number; channels: number; pixels: Uint8Array };

type Verdict =
  | { kind: 'ok' }
  | { kind: 'blank' }
  | { kind: 'splash'; box: { left: number; top: number; right: number; bottom: number } }
  | { kind: 'unsupported'; reason: string };

const STATUS_BAR_SHARE = 0.08;
const TOLERANCE = 24;
const STEP = 3;

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

function decodePng(file: Buffer): Image | string {
  if (file.readUInt32BE(0) !== 0x89504e47) return 'not a PNG';
  let offset = 8;
  let width = 0;
  let height = 0;
  let channels = 0;
  const data: Buffer[] = [];
  while (offset < file.length) {
    const length = file.readUInt32BE(offset);
    const type = file.toString('ascii', offset + 4, offset + 8);
    const body = file.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      const depth = body[8];
      const colorType = body[9];
      if (depth !== 8 || body[12] !== 0) return `bit depth ${depth}, interlace ${body[12]}`;
      if (colorType === 2) channels = 3;
      else if (colorType === 6) channels = 4;
      else return `color type ${colorType}`;
    }
    if (type === 'IDAT') data.push(body);
    if (type === 'IEND') break;
    offset += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(data));
  const stride = width * channels;
  const pixels = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const row = y * stride;
    for (let x = 0; x < stride; x++) {
      const value = raw[src + x];
      const left = x >= channels ? pixels[row + x - channels] : 0;
      const up = y > 0 ? pixels[row - stride + x] : 0;
      const upLeft = y > 0 && x >= channels ? pixels[row - stride + x - channels] : 0;
      let predicted = 0;
      if (filter === 1) predicted = left;
      else if (filter === 2) predicted = up;
      else if (filter === 3) predicted = (left + up) >> 1;
      else if (filter === 4) predicted = paeth(left, up, upLeft);
      pixels[row + x] = (value + predicted) & 0xff;
    }
  }
  return { width, height, channels, pixels };
}

function classify(image: Image): Verdict {
  const { width, height, channels, pixels } = image;
  const at = (x: number, y: number) => (y * width + x) * channels;
  const bg = at(2, Math.floor(height / 2));
  const top = Math.floor(height * STATUS_BAR_SHARE);
  let left = width;
  let right = -1;
  let first = height;
  let last = -1;
  for (let y = top; y < height; y += STEP) {
    for (let x = 0; x < width; x += STEP) {
      const i = at(x, y);
      const diff =
        Math.abs(pixels[i] - pixels[bg]) +
        Math.abs(pixels[i + 1] - pixels[bg + 1]) +
        Math.abs(pixels[i + 2] - pixels[bg + 2]);
      if (diff > TOLERANCE) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < first) first = y;
        if (y > last) last = y;
      }
    }
  }
  if (right < 0) return { kind: 'blank' };
  const box = {
    left: left / width,
    top: first / height,
    right: (right + 1) / width,
    bottom: (last + 1) / height,
  };
  const centered =
    Math.abs((box.left + box.right) / 2 - 0.5) < 0.1 &&
    Math.abs((box.top + box.bottom) / 2 - 0.5) < 0.1;
  const small = box.right - box.left < 0.4 && box.bottom - box.top < 0.25;
  return centered && small ? { kind: 'splash', box } : { kind: 'ok' };
}

function checkFile(path: string): Verdict {
  const image = decodePng(readFileSync(path));
  if (typeof image === 'string') return { kind: 'unsupported', reason: image };
  return classify(image);
}

if (import.meta.main) {
  const targets = process.argv.slice(2);
  if (targets.length === 0) {
    console.error('Usage: node scripts/qa/screenshot-splash-check.ts <dir or .png>...');
    process.exit(2);
  }
  const files = targets.flatMap((target) =>
    target.endsWith('.png')
      ? [target]
      : readdirSync(target)
          .filter((name) => name.endsWith('.png'))
          .sort()
          .map((name) => join(target, name)),
  );
  let bad = 0;
  for (const file of files) {
    const verdict = checkFile(file);
    switch (verdict.kind) {
      case 'ok':
        break;
      case 'blank':
        bad++;
        console.error(`  fail  ${file}: the screenshot is one flat color`);
        break;
      case 'splash':
        bad++;
        console.error(`  fail  ${file}: only a small centered icon, this is the launch splash`);
        break;
      case 'unsupported':
        console.error(`  warn  ${file}: not checked (${verdict.reason})`);
        break;
    }
  }
  if (bad > 0) {
    console.error(`screenshot-splash-check: ${bad} of ${files.length} screenshots show the splash`);
    process.exit(1);
  }
  console.log(`  ok    ${files.length} screenshots, none shows the splash`);
}
