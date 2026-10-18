// Lighthouse (mobile preset) for / and /es. Needs a running server (npm run preview).
// Usage: node scripts/lighthouse.mjs [baseUrl]
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = process.argv[2] ?? 'http://localhost:4321';
const outDir = path.join(root, 'reports/lighthouse');
await mkdir(outDir, { recursive: true });

const chrome = await chromeLauncher.launch({
  chromePath: process.env.CHROME_PATH ?? chromium.executablePath(),
  chromeFlags: ['--headless=new', '--no-sandbox'],
});
const summary = {};
try {
  for (const [name, p] of [
    ['en', '/'],
    ['es', '/es/'],
  ]) {
    const result = await lighthouse(base + p, {
      port: chrome.port,
      output: 'html',
      logLevel: 'error',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    });
    const cats = result.lhr.categories;
    summary[name] = Object.fromEntries(Object.entries(cats).map(([k, v]) => [k, Math.round(v.score * 100)]));
    await writeFile(path.join(outDir, `${name}-mobile.html`), result.report);
    const failed = Object.values(result.lhr.audits)
      .filter((a) => a.score !== null && a.score < 0.9 && a.scoreDisplayMode !== 'informative' && a.scoreDisplayMode !== 'notApplicable')
      .map((a) => `${a.id} (${a.score})`);
    console.log(name, summary[name], failed.length ? '\n  below 0.9: ' + failed.join(', ') : '');
  }
} finally {
  await chrome.kill();
}
await writeFile(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
