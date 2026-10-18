// P9b checks and captures: story film scroll moments, chat panel (desktop and mobile), reduced motion.
// Needs a running server (npm run preview). Usage: node scripts/p9b-screenshots.mjs [baseUrl]
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = process.argv[2] ?? 'http://localhost:4321';
const out = path.join(root, 'reports/screenshots/p9b');
await mkdir(out, { recursive: true });
const shot = (name) => path.join(out, name);
const log = (...a) => console.log(...a);

const browser = await chromium.launch({ args: ['--disable-gpu', '--autoplay-policy=no-user-gesture-required'] });

// 1. Story film: four scroll moments on desktop.
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(base + '/', { waitUntil: 'load' });
  await page.waitForSelector('#story.is-film', { timeout: 15000 });
  const top = await page.evaluate(() => document.getElementById('story').getBoundingClientRect().top + scrollY);
  await page.evaluate((y) => scrollTo(0, y), top);
  await page.waitForFunction(() => document.querySelector('#story video').readyState >= 2, null, { timeout: 30000 });
  const pin = 900 * 3.5;
  for (const [i, p] of [0.02, 0.33, 0.62, 0.97].entries()) {
    await page.evaluate((y) => scrollTo(0, y), top + pin * p);
    await page.waitForTimeout(900);
    const state = await page.evaluate(() => {
      const v = document.querySelector('#story video');
      const cur = [...document.querySelectorAll('[data-milestone]')].findIndex((li) => li.dataset.state === 'current');
      return { t: v.currentTime.toFixed(2), d: v.duration.toFixed(2), src: v.currentSrc.split('/').pop(), milestone: cur + 1 };
    });
    log(`story ${i + 1} progress=${p}`, state);
    await page.screenshot({ path: shot(`story-${i + 1}-desktop.png`) });
  }
  // Scroll back: the film must rewind.
  await page.evaluate((y) => scrollTo(0, y), top + pin * 0.2);
  await page.waitForTimeout(900);
  log('rewind', await page.evaluate(() => document.querySelector('#story video').currentTime.toFixed(2)));
  await page.close();
}

// 2. Chat panel: desktop and mobile.
for (const vp of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.name === 'mobile' ? 2 : 1 });
  const page = await context.newPage();
  await page.goto(base + (vp.name === 'mobile' ? '/es/' : '/'), { waitUntil: 'load' });
  const framesBefore = await page.locator('iframe').count();
  await page.locator('.fab').focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);
  const focusOnClose = await page.evaluate(() => document.activeElement?.hasAttribute('data-ask-close'));
  const iframeSrc = await page.locator('#ask-panel iframe').getAttribute('src');
  log(`chat ${vp.name}: iframes before open=${framesBefore}, src=${iframeSrc}, focus on close=${focusOnClose}`);
  await page.screenshot({ path: shot(`chat-${vp.name}-loading.png`) });
  await page.waitForTimeout(8000);
  await page.screenshot({ path: shot(`chat-${vp.name}.png`) });
  await page.keyboard.press('Escape');
  const after = await page.evaluate(() => ({
    hidden: document.getElementById('ask-panel').hidden,
    focusOnFab: document.activeElement?.classList.contains('fab'),
  }));
  log(`chat ${vp.name}: after Escape`, after);
  await context.close();
}

// 3. Reduced motion: no film, poster + list.
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const scripts = [];
  page.on('request', (r) => r.url().includes('story-film') && scripts.push(r.url()));
  const videos = [];
  page.on('request', (r) => r.url().includes('/media/story/') && videos.push(r.url()));
  await page.goto(base + '/', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  await page.locator('#story').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  const film = await page.evaluate(() => document.getElementById('story').classList.contains('is-film'));
  log('reduced motion: film mode =', film, 'film script requests =', scripts.length, 'video requests =', videos.length);
  await page.locator('#story').screenshot({ path: shot('story-reduced-motion.png') });
  await context.close();
}

// 4. Lazy loading: no video request at the top of the page.
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const videos = [];
  page.on('request', (r) => r.url().includes('/media/story/') && videos.push(r.url()));
  await page.goto(base + '/', { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  log('video requests at top of page:', videos.length);
  await page.close();
}

await browser.close();
