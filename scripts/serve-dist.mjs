// Local stand-in for the production nginx: serves dist/ with the same headers, CSP and cache
// policy, read from deploy/nginx/ (the map of washingtonquevedo.com.conf and the add_header lines
// of washingtonquevedo.com-snippet.conf, with this build's script hashes), and serves the
// precompressed .br/.gz files like brotli_static/gzip_static.
// Usage: npm run build && node scripts/precompress.mjs && node scripts/serve-dist.mjs [port]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scriptHashes } from './csp-hashes.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const port = Number(process.argv[2] ?? 4321);

const site = await readFile(path.join(root, 'deploy/nginx/washingtonquevedo.com.conf'), 'utf8');
const snippet = (await readFile(path.join(root, 'deploy/nginx/washingtonquevedo.com-snippet.conf'), 'utf8')).replaceAll(
  '__SCRIPT_HASHES__',
  (await scriptHashes(dist)).join(' '),
);

// map $uri $wq_cache_control { default "..."; ~^/prefix/ "..."; }
const mapBody = site.match(/map \$uri \$wq_cache_control \{([\s\S]*?)\}/)[1];
const cacheRules = [...mapBody.matchAll(/^\s*(\S+)\s+"([^"]+)";/gm)].map(([, key, value]) => ({ key, value }));
const cacheFor = (uri) =>
  (cacheRules.find((r) => r.key.startsWith('~') && new RegExp(r.key.slice(1)).test(uri)) ?? cacheRules.find((r) => r.key === 'default')).value;
const staticHeaders = [...snippet.matchAll(/^add_header (\S+) "([^"]*)" always;/gm)].map(([, name, value]) => [name, value]);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.wasm': 'application/wasm',
  '.onnx': 'application/octet-stream',
};

async function isFile(p) {
  try {
    return (await stat(p)).isFile();
  } catch {
    return false;
  }
}

// try_files $uri $uri/ $uri.html =404 (with index.html for directories)
async function resolve(uri) {
  const clean = path.normalize(decodeURIComponent(uri)).replace(/^(\.\.[/\\])+/, '');
  const base = path.join(dist, clean);
  if (!base.startsWith(dist)) return null;
  for (const candidate of [base, path.join(base, 'index.html'), base + '.html']) {
    if (await isFile(candidate)) return candidate;
  }
  return null;
}

createServer(async (req, res) => {
  const uri = new URL(req.url, 'http://localhost').pathname;
  let file = await resolve(uri);
  let status = 200;
  if (!file) {
    file = path.join(dist, '404.html');
    status = 404;
  }
  const headers = { 'Content-Type': TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream', 'Cache-Control': cacheFor(uri) };
  for (const [name, value] of staticHeaders) headers[name] = value;

  const accept = String(req.headers['accept-encoding'] ?? '');
  let body = file;
  if (/\bbr\b/.test(accept) && (await isFile(file + '.br'))) {
    body = file + '.br';
    headers['Content-Encoding'] = 'br';
  } else if (/\bgzip\b/.test(accept) && (await isFile(file + '.gz'))) {
    body = file + '.gz';
    headers['Content-Encoding'] = 'gzip';
  }
  headers.Vary = 'Accept-Encoding';
  const data = await readFile(body);
  headers['Content-Length'] = data.length;
  res.writeHead(status, headers);
  res.end(req.method === 'HEAD' ? undefined : data);
}).listen(port, () => console.log(`serving dist with the production headers on http://localhost:${port}`));
