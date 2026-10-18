// Writes .gz (and .br) next to every compressible file in dist/, for nginx gzip_static/brotli_static.
// The 14-27 MB WebAssembly runtimes and the 9.8 MB model are compressed once here instead of on
// every request on the server. Usage: node scripts/precompress.mjs [dist]
import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import zlib from 'node:zlib';

const gzip = promisify(zlib.gzip);
const brotli = promisify(zlib.brotliCompress);
const root = path.resolve(process.argv[2] ?? 'dist');
const EXTENSIONS = new Set(['.html', '.css', '.js', '.mjs', '.json', '.svg', '.wasm', '.onnx', '.txt', '.xml', '.webmanifest']);
const MIN_BYTES = 1024;

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

let files = 0;
let before = 0;
let afterGz = 0;
let afterBr = 0;
for await (const file of walk(root)) {
  if (!EXTENSIONS.has(path.extname(file).toLowerCase())) continue;
  const size = (await stat(file)).size;
  if (size < MIN_BYTES) continue;
  const data = await readFile(file);
  const big = size > 1_000_000;
  const gz = await gzip(data, { level: 9 });
  const br = await brotli(data, {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: big ? 9 : 11,
      [zlib.constants.BROTLI_PARAM_SIZE_HINT]: size,
    },
  });
  // Only keep a compressed copy when it actually saves space.
  if (gz.length < size * 0.95) {
    await writeFile(file + '.gz', gz);
    afterGz += gz.length;
  } else afterGz += size;
  if (br.length < size * 0.95) {
    await writeFile(file + '.br', br);
    afterBr += br.length;
  } else afterBr += size;
  files += 1;
  before += size;
}
const mb = (n) => (n / 1_000_000).toFixed(1);
console.log(`precompressed ${files} files: ${mb(before)} MB -> gzip ${mb(afterGz)} MB, brotli ${mb(afterBr)} MB`);
