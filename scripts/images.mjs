#!/usr/bin/env node
/**
 * Pre-resizes every photo slot in data/images.json into public/img/<slot>/<width>.avif and .webp at
 * the widths next/image asks for (next.config.ts: imageSizes + deviceSizes), and writes
 * src/generated/images.json with each slot's size and placeholder colour. Originals are cached in
 * .cache/images. Pages offer the AVIF first (about 40% lighter at the same look) and fall back to WebP.
 *
 * A slot can point at a remote stock photo ("src") or, later, at Escape Away's own file ("file",
 * a path inside the repo). A slot whose source can't be read is skipped with a warning, and the page
 * shows the sand placeholder for it. An optional "crop" trims edges, as fractions of the photo
 * ({ "right": 0.095 } drops the right 9.5%); changing it re-encodes that slot.
 */
import { createHash } from 'node:crypto';
import { access, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const WIDTHS = [320, 480, 640, 768, 1080, 1440, 1920];
const FORMATS = [
  { ext: 'avif', options: { quality: 50, effort: 3 } },
  { ext: 'webp', options: { quality: 72, effort: 5 } },
];
/** Part of every slot's stamp: new widths or encoder settings make every slot encode again. */
const SETTINGS = JSON.stringify({ WIDTHS, FORMATS });

const exists = (p) => access(p).then(() => true, () => false);

function downloadUrl(src) {
  const url = new URL(src);
  if (url.hostname === 'images.unsplash.com') {
    url.searchParams.set('w', '2400');
    url.searchParams.set('q', '85');
    url.searchParams.set('fm', 'jpg');
    url.searchParams.set('fit', 'max');
  }
  return url.toString();
}

async function originalOf(slot) {
  if (slot.file) return join(root, slot.file);
  if (!slot.src) return null;
  const cached = join(root, '.cache', 'images', `${slot.slot}.jpg`);
  if (await exists(cached)) return cached;
  const res = await fetch(downloadUrl(slot.src));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  await mkdir(dirname(cached), { recursive: true });
  await writeFile(cached, Buffer.from(await res.arrayBuffer()));
  return cached;
}

const { slots } = JSON.parse(await readFile(join(root, 'data', 'images.json'), 'utf8'));
const manifest = {};
let written = 0;
let skipped = 0;

for (const slot of slots) {
  let file;
  try {
    file = await originalOf(slot);
  } catch (error) {
    console.warn(`images: ${slot.slot} could not be fetched (${error.message}); the page shows a placeholder`);
    skipped += 1;
    continue;
  }
  if (!file) {
    console.warn(`images: ${slot.slot} has no "file" or "src"; the page shows a placeholder`);
    skipped += 1;
    continue;
  }

  const meta = await sharp(file).metadata();
  const turned = (meta.orientation ?? 1) >= 5;
  const fullWidth = turned ? meta.height : meta.width;
  const fullHeight = turned ? meta.width : meta.height;
  const sourceTime = (await stat(file)).mtimeMs;
  const outDir = join(root, 'public', 'img', slot.slot);
  await mkdir(outDir, { recursive: true });

  // The region kept: the whole photo, or what an optional crop leaves.
  const cut = slot.crop ?? {};
  const region = {
    left: Math.round((cut.left ?? 0) * fullWidth),
    top: Math.round((cut.top ?? 0) * fullHeight),
  };
  region.width = fullWidth - region.left - Math.round((cut.right ?? 0) * fullWidth);
  region.height = fullHeight - region.top - Math.round((cut.bottom ?? 0) * fullHeight);
  const cropped = region.width !== fullWidth || region.height !== fullHeight;
  const sourceWidth = region.width;
  const sourceHeight = region.height;
  const photo = () => (cropped ? sharp(file).rotate().extract(region) : sharp(file).rotate());

  // A slot's stamp records what its files were made from: the photo's content, the crop and the
  // encoder settings. Files whose stamp still matches are kept, whatever their dates; a fresh checkout
  // (as in CI, where every photo looks new) doesn't make them all again. Anything different is made again.
  const stampFile = join(root, '.cache', 'images', `${slot.slot}.crop.json`);
  const sourceHash = createHash('sha1').update(await readFile(file)).digest('hex');
  const stamp = JSON.stringify({ source: sourceHash, crop: cropped ? region : null, settings: SETTINGS });
  const oldStamp = (await exists(stampFile)) ? await readFile(stampFile, 'utf8') : null;
  // Stamps from before content hashes held only the crop: trust those files if they're newer than the photo.
  const oldFormatFresh = oldStamp === JSON.stringify(cropped ? region : null);

  for (const width of WIDTHS) {
    for (const format of FORMATS) {
      const out = join(outDir, `${width}.${format.ext}`);
      if (await exists(out)) {
        if (oldStamp === stamp) continue;
        if (oldFormatFresh && (await stat(out)).mtimeMs >= sourceTime) continue;
      }
      const resized = photo().resize({ width: Math.min(width, sourceWidth), withoutEnlargement: true });
      await resized[format.ext](format.options).toFile(out);
      written += 1;
    }
  }
  await mkdir(dirname(stampFile), { recursive: true });
  await writeFile(stampFile, stamp);

  // The placeholder a photo shows while it loads, or if it can't: its average colour, softened a
  // little towards the brand sand so a dark room never flashes as a black block.
  const { data: mean } = await photo().resize(1, 1, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const sand = [0xdb, 0xc9, 0xb3];
  const color = `#${[0, 1, 2].map((i) => Math.round(mean[i] * 0.72 + sand[i] * 0.28).toString(16).padStart(2, '0')).join('')}`;
  const width = Math.min(WIDTHS.at(-1), sourceWidth);
  manifest[slot.slot] = { width, height: Math.round((sourceHeight * width) / sourceWidth), color };
}

await mkdir(join(root, 'src', 'generated'), { recursive: true });
await writeFile(join(root, 'src', 'generated', 'images.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`images: ${Object.keys(manifest).length} slots ready, ${written} files written, ${skipped} skipped`);
