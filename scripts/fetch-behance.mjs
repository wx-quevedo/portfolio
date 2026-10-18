// Downloads the Behance images listed in behance_inventory.json into src/assets/behance/<id>-<n>.<ext>.
// For each URL it tries the largest non-webp variants first and keeps the first one that is a real JPG/PNG.
// Usage: node scripts/fetch-behance.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'src/assets/behance');
const inventory = JSON.parse(await readFile(path.join(root, 'behance_inventory.json'), 'utf8'));

const SIZES = ['source', 'max_3840', 'fs', '1400', 'max_1200', 'disp', 'max_632'];

function candidates(url) {
  const m = url.match(/^(.*\/project_modules\/)([^/]+)\/(.+)$/);
  if (!m) return [url];
  const [, base, size, file] = m;
  const plain = size.replace(/_webp$/, '');
  const list = SIZES.map((s) => `${base}${s}/${file}`);
  // Keep the original size (without _webp) and finally the original URL as fallbacks.
  list.push(`${base}${plain}/${file}`, url);
  return [...new Set(list)];
}

function sniff(buf) {
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'jpg';
  if (buf[0] === 0x89 && buf[1] === 0x50) return 'png';
  if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'webp';
  return null;
}

await mkdir(outDir, { recursive: true });
const report = [];
for (const project of inventory.projects) {
  let n = 0;
  for (const url of project.images) {
    n += 1;
    let saved = null;
    for (const c of candidates(url)) {
      try {
        const res = await fetch(c, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!res.ok) continue;
        const buf = Buffer.from(await res.arrayBuffer());
        const ext = sniff(buf);
        if (!ext || ext === 'webp') continue;
        const name = `${project.id}-${n}.${ext}`;
        await writeFile(path.join(outDir, name), buf);
        saved = { name, from: c, bytes: buf.length };
        break;
      } catch {
        /* try next candidate */
      }
    }
    report.push({ project: project.id, n, url, ...(saved ?? { failed: true }) });
    console.log(saved ? `ok   ${saved.name} <- ${saved.from} (${saved.bytes} B)` : `FAIL ${project.id}-${n} <- ${url}`);
  }
}
await writeFile(path.join(root, 'reports/behance-download.json'), JSON.stringify(report, null, 2));
