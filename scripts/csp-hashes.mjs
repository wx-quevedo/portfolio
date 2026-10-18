// sha256 hashes of every inline <script> in the built HTML, for the Content-Security-Policy
// (script-src) so no 'unsafe-inline' is needed. JSON data blocks (application/ld+json) are not
// executed and are skipped. Usage: node scripts/csp-hashes.mjs [dist]  -> prints the hash sources.
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(full);
    else if (entry.name.endsWith('.html')) yield full;
  }
}

export async function scriptHashes(dist) {
  const hashes = new Set();
  for await (const file of htmlFiles(dist)) {
    const html = await readFile(file, 'utf8');
    for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      const [, attrs, body] = m;
      if (/\bsrc\s*=/.test(attrs) || /type\s*=\s*["']?application\/(ld\+)?json/i.test(attrs) || !body.trim()) continue;
      hashes.add(`'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`);
    }
  }
  return [...hashes].sort();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const hashes = await scriptHashes(path.resolve(process.argv[2] ?? 'dist'));
  process.stdout.write(hashes.join(' ') + '\n');
}
