#!/usr/bin/env node
/**
 * Builds the favicon and touch icon from the client's own EA mark (design/assets/ea-mark.png, made
 * transparent from their PNG, never redrawn), copies the full-size mark (the logo in structured
 * data), and writes the small mask the header, footer and map draw it with (120 px tall, lossless
 * WebP: 3 KB instead of the 10 KB original, still sharp at 4x for its 30 px).
 * Run again when the vector logo arrives: node scripts/icons.mjs
 */
import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const mark = join(root, 'design', 'assets', 'ea-mark.png');
const cream = '#F4ECDF';

async function icon(size, out) {
  const markBuffer = await sharp(mark).resize({ width: Math.round(size * 0.72) }).toBuffer();
  const { width, height } = await sharp(markBuffer).metadata();
  await sharp({ create: { width: size, height: size, channels: 4, background: cream } })
    .composite([{ input: markBuffer, left: Math.round((size - width) / 2), top: Math.round((size - height) / 2) }])
    .png()
    .toFile(out);
}

await mkdir(join(root, 'public', 'brand'), { recursive: true });
await copyFile(mark, join(root, 'public', 'brand', 'ea-mark.png'));
await sharp(mark).resize({ height: 120, kernel: 'lanczos3' }).webp({ lossless: true, effort: 6 }).toFile(join(root, 'public', 'brand', 'ea-mark-mask.webp'));
await icon(512, join(root, 'src', 'app', 'icon.png'));
await icon(180, join(root, 'src', 'app', 'apple-icon.png'));
console.log('icons: icon.png, apple-icon.png, public/brand/ea-mark.png and ea-mark-mask.webp written');
