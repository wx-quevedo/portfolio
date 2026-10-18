// Full-page screenshots of / and /es at 1440 (desktop) and 390 (mobile), plus checks for
// horizontal overflow at 390, 768, 1280 and 1440. Needs a running server (npm run preview).
// Usage: node scripts/screenshots.mjs [baseUrl]
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = process.argv[2] ?? 'http://localhost:4321';
const outDir = path.join(root, 'reports/screenshots');
await mkdir(outDir, { recursive: true });

const pages = [
  { name: 'en', path: '/' },
  { name: 'es', path: '/es/' },
];
const viewports = [
  { name: 'mobile', width: 390, height: 844, shot: true },
  { name: 'tablet', width: 768, height: 1024, shot: false },
  { name: 'laptop', width: 1280, height: 800, shot: false },
  { name: 'desktop', width: 1440, height: 900, shot: true },
];

const browser = await chromium.launch({ args: ['--disable-gpu'] });
const results = [];
for (const vp of viewports) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.name === 'mobile' ? 2 : 1,
    reducedMotion: 'reduce',
  });
  // Ask Washington does not allow this origin yet (P9d); keep the iframe from loading.
  await context.route('https://ask.inmersoft.com/**', (route) => route.abort());
  const page = await context.newPage();
  for (const p of pages) {
    await page.goto(base + p.path, { waitUntil: 'networkidle' });
    // Load lazy images before the full-page capture.
    await page.evaluate(async () => {
      // Scroll through the page so the browser requests every lazy image.
      for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight / 2) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 80));
      }
      window.scrollTo(0, 0);
      await Promise.all(
        [...document.images].map((img) =>
          img.complete ? null : new Promise((r) => img.addEventListener('load', r, { once: true })),
        ),
      );
      await document.fonts.ready;
    });
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      const wide = [...document.querySelectorAll('body *')]
        .filter((el) => el.getBoundingClientRect().right > doc.clientWidth + 1)
        .slice(0, 5)
        .map((el) => el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : ''));
      return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, wide };
    });
    results.push({ page: p.name, viewport: vp.name, width: vp.width, ...overflow });
    if (vp.shot) {
      const file = path.join(outDir, `${p.name}-${vp.name}-${vp.width}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log('saved', path.relative(root, file));
    }
  }
  await context.close();
}
await browser.close();

for (const r of results) {
  const ok = r.scrollWidth <= r.clientWidth;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${r.page} ${r.width}px scrollWidth=${r.scrollWidth} clientWidth=${r.clientWidth}${r.wide.length ? ' wide: ' + r.wide.join(', ') : ''}`);
}
await writeFile(path.join(root, 'reports/overflow.json'), JSON.stringify(results, null, 2));
