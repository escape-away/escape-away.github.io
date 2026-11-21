#!/usr/bin/env node
/**
 * Serves the static export in out/ the way GitHub Pages does: folders get a trailing slash and their
 * index.html, anything missing gets 404.html, and text files are sent gzipped when the browser asks,
 * so speed measured here matches the live site. No dependencies. PORT defaults to 4174.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const compressible = new Set(['.html', '.js', '.mjs', '.css', '.json', '.txt', '.xml', '.svg', '.webmanifest']);
const gzipped = new Map();

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'out');
const port = Number(process.env.PORT ?? 4174);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  // The map's worker is an ES module; browsers only start it when it arrives as JavaScript.
  '.mjs': 'text/javascript; charset=utf-8',
  '.wasm': 'application/wasm',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const path = decodeURIComponent(url.pathname);
  let file = normalize(join(root, path));
  if (file !== root && !file.startsWith(root + sep)) {
    res.writeHead(403).end();
    return;
  }
  try {
    if ((await stat(file)).isDirectory()) {
      if (!path.endsWith('/')) {
        res.writeHead(301, { Location: `${path}/${url.search}` }).end();
        return;
      }
      file = join(file, 'index.html');
    }
    const body = await readFile(file);
    const headers = { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' };
    if (compressible.has(extname(file))) {
      headers.Vary = 'Accept-Encoding';
      if (/\bgzip\b/.test(req.headers['accept-encoding'] ?? '')) {
        const stamp = `${(await stat(file)).mtimeMs}:${body.length}`;
        let packed = gzipped.get(file);
        if (packed?.stamp !== stamp) {
          packed = { stamp, data: gzipSync(body) };
          gzipped.set(file, packed);
        }
        headers['Content-Encoding'] = 'gzip';
        res.writeHead(200, headers).end(packed.data);
        return;
      }
    }
    res.writeHead(200, headers).end(body);
  } catch {
    const body = await readFile(join(root, '404.html')).catch(() => 'Not found');
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }).end(body);
  }
}).listen(port, '127.0.0.1', () => console.log(`Serving out/ at http://127.0.0.1:${port}/`));
