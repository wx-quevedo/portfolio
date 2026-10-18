// Renders public/og.png (1200x630) with the site fonts. Usage: node scripts/og.mjs
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const font = async (file) =>
  (await readFile(path.join(root, 'public/fonts', file))).toString('base64');

const html = `<!doctype html><html><head><style>
@font-face{font-family:Jost;font-weight:300;src:url(data:font/woff2;base64,${await font('jost-latin-300-normal.woff2')})}
@font-face{font-family:Plex;font-weight:400;src:url(data:font/woff2;base64,${await font('ibm-plex-mono-latin-400-normal.woff2')})}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:#F5F5F1;color:#111316;font-family:Jost;padding:72px 80px;display:flex;flex-direction:column;justify-content:space-between}
.mono{font-family:Plex;font-size:22px;color:#565B63}
h1{font-weight:300;font-size:132px;line-height:.95;letter-spacing:-.035em}
.bar{display:flex;justify-content:space-between;align-items:end}
.dot{width:20px;height:20px;border-radius:50%;background:#2142E7}
</style></head><body>
<p class="mono">AI Engineer · XR developer · Quito, Ecuador · Remote</p>
<h1>Washington<br>X. Quevedo</h1>
<div class="bar"><p class="mono">washingtonquevedo.com</p><span class="dot"></span></div>
</body></html>`;

const browser = await chromium.launch({ args: ['--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: path.join(root, 'public/og.png') });
await browser.close();
console.log('public/og.png written');
