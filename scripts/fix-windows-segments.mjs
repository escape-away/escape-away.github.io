#!/usr/bin/env node
/**
 * Works around a Windows-only bug in Next.js 16's static export. Segment prefetch files are named from
 * path.relative(), and on Windows its backslashes slip past Next's "/" → "." encoding, so the files
 * land in nested folders (out/ar/__next.$d$locale/__PAGE__.txt) instead of the flat names the router
 * requests (out/ar/__next.$d$locale.__PAGE__.txt). Client navigation then hits 404s.
 *
 * This flattens them after `next build`. It does nothing on Linux and macOS (GitHub Actions builds on
 * Linux, where the export is already right) or when there is no out/ folder (the GoDaddy server build).
 */
import { access, readdir, rename, rm } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'out');
if (process.platform !== 'win32' || !(await access(out).then(() => true, () => false))) process.exit(0);

async function files(dir) {
  const list = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) list.push(...(await files(full)));
    else list.push(full);
  }
  return list;
}

let moved = 0;
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const full = join(dir, entry.name);
    if (entry.name.startsWith('__next.')) {
      for (const file of await files(full)) {
        const flat = [entry.name, ...relative(full, file).split(/[\\/]/)].join('.');
        await rename(file, join(dir, flat));
        moved += 1;
      }
      await rm(full, { recursive: true, force: true });
    } else {
      await walk(full);
    }
  }
}

await walk(out);
console.log(`fix-windows-segments: ${moved} segment files flattened`);
