// P9b·2 checks and captures: every scene and step (desktop and phone), gesture tests,
// chat panel and reduced motion. Needs a running server (npm run preview).
// Usage: node scripts/p9b2-screenshots.mjs [baseUrl]
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = process.argv[2] ?? 'http://localhost:4321';
const out = path.join(root, 'reports/screenshots/p9b2');
await mkdir(out, { recursive: true });
const report = { viewports: {}, gestures: {}, problems: [] };
const browser = await chromium.launch({ args: ['--disable-gpu'] });

async function open(vp, page = '/', opts = {}) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.dpr ?? 1,
    isMobile: vp.mobile ?? false,
    hasTouch: vp.mobile ?? false,
    ...opts,
  });
  await context.route('https://ask.inmersoft.com/**', (r) => r.abort());
  const p = await context.newPage();
  await p.goto(base + page, { waitUntil: 'load' });
  if (!opts.reducedMotion) await p.waitForFunction(() => window.__scenes?.stops().length > 0, null, { timeout: 15000 });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(400);
  return { context, p };
}

// What is on screen at a stop: anything of the current scene cut by the viewport edges?
const inspect = () => {
  const vh = innerHeight;
  const y = scrollY;
  const stops = window.__scenes.stops();
  const stop = stops.reduce((a, b) => (Math.abs(b.y - y) < Math.abs(a.y - y) ? b : a));
  const scene = document.querySelector(`[data-scene="${stop.scene}"]`);
  const free = window.__scenes.ranges().some((r) => y >= r.from - 2 && y <= r.to + 2);
  const visible = [...scene.querySelectorAll('h2, h3, p, li, img, a, button, dd, figcaption')].filter((el) => {
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none') return false;
    let n = el;
    while (n && n !== scene) {
      if (getComputedStyle(n).opacity === '0') return false;
      n = n.parentElement;
    }
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
  const cut = free
    ? []
    : visible
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.bottom > vh + 1 || r.top < 0 - 1;
        })
        .map((el) => el.tagName.toLowerCase() + ':' + (el.textContent || el.getAttribute('alt') || '').trim().slice(0, 40));
  return {
    scene: stop.scene,
    step: stop.step,
    free,
    stepsOff: scene.classList.contains('steps-off'),
    cut,
    hScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  };
};

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'laptop', width: 1280, height: 800, noShots: true },
  { name: 'tablet', width: 768, height: 1024, noShots: true, mobile: true },
  { name: 'phone', width: 390, height: 844, dpr: 2, mobile: true },
  { name: 'phone-se', width: 375, height: 667, dpr: 2, mobile: true, noShots: true },
];

for (const vp of viewports) {
  for (const lang of vp.name === 'desktop' || vp.name === 'phone' ? ['en', 'es'] : ['en']) {
    const { context, p } = await open(vp, lang === 'en' ? '/' : '/es/');
    const stops = await p.evaluate(() => window.__scenes.stops());
    const rows = [];
    for (const [i, s] of stops.entries()) {
      await p.evaluate(({ scene, step }) => window.__scenes.go(scene, Math.max(step, 0)), s);
      if (s.step === -1) await p.evaluate((y) => window.scrollTo(0, y), s.y);
      await p.waitForTimeout(1100);
      const info = await p.evaluate(inspect);
      rows.push(info);
      if (info.cut.length) report.problems.push({ vp: vp.name, lang, ...info });
      if (info.hScroll) report.problems.push({ vp: vp.name, lang, scene: info.scene, problem: 'horizontal scroll' });
      if (!vp.noShots && (lang === 'en' || vp.name === 'phone')) {
        const name = `${lang}-${vp.name}-${String(i + 1).padStart(2, '0')}-${s.scene}${s.step > 0 ? '-step' + (s.step + 1) : s.step === -1 ? '-end' : ''}.png`;
        await p.screenshot({ path: path.join(out, name) });
      }
    }
    report.viewports[`${vp.name}-${lang}`] = rows;
    console.log(`${vp.name} ${lang}: ${stops.length} stops; steps-off: ${[...new Set(rows.filter((r) => r.stepsOff).map((r) => r.scene))].join(',') || 'none'}; free: ${[...new Set(rows.filter((r) => r.free).map((r) => r.scene))].join(',') || 'none'}; cut: ${rows.filter((r) => r.cut.length).length}`);
    await context.close();
  }
}

// Gestures (desktop): one trackpad swipe with inertia = exactly one stop.
{
  const { context, p } = await open({ width: 1440, height: 900 });
  const stops = await p.evaluate(() => window.__scenes.stops().map((s) => s.y));
  const at = async () => {
    const y = await p.evaluate(() => scrollY);
    return stops.reduce((a, b, i) => (Math.abs(b - y) < Math.abs(stops[a] - y) ? i : a), 0);
  };
  await p.mouse.move(700, 450);
  const visited = [await at()];
  for (let g = 0; g < stops.length + 2; g++) {
    // Trackpad-like: a burst of large deltas, then a long decaying inertia tail.
    for (let k = 0; k < 60; k++) {
      await p.mouse.wheel(0, Math.max(1, 60 * Math.exp(-k / 12)));
      await p.waitForTimeout(16);
    }
    await p.waitForTimeout(450);
    visited.push(await at());
  }
  const skips = visited.slice(1).filter((v, i) => v - visited[i] > 1).length;
  report.gestures.trackpadDown = { visited, skips };
  console.log('trackpad down, stop index after each gesture:', visited.join(' '), 'skips:', skips);

  // Mouse wheel notches, fast spin (5 notches 40 ms apart) = one stop.
  await p.evaluate(() => window.__scenes.go('hero'));
  await p.waitForTimeout(300);
  for (let k = 0; k < 5; k++) {
    await p.mouse.wheel(0, 100);
    await p.waitForTimeout(40);
  }
  await p.waitForTimeout(1500);
  report.gestures.wheelSpin = await at();
  console.log('fast wheel spin from hero ends at stop', report.gestures.wheelSpin);

  // Keyboard.
  await p.evaluate(() => window.__scenes.go('hero'));
  await p.locator('body').focus();
  await p.keyboard.press('PageDown');
  await p.waitForTimeout(1300);
  report.gestures.pageDown = await at();
  await p.keyboard.press('ArrowDown');
  await p.waitForTimeout(1300);
  report.gestures.arrowDown = await at();
  console.log('PageDown ->', report.gestures.pageDown, 'ArrowDown ->', report.gestures.arrowDown);

  // Menu links.
  const links = {};
  for (const id of ['research', 'xr', 'contact', 'story', 'work', 'ask']) {
    await p.locator(`.nav-list a[href="#${id}"]`).click();
    await p.waitForTimeout(1500);
    links[id] = await p.evaluate(() => {
      const stops = window.__scenes.stops();
      const s = stops.reduce((a, b) => (Math.abs(b.y - scrollY) < Math.abs(a.y - scrollY) ? b : a));
      return `${s.scene}/${s.step}`;
    });
  }
  report.gestures.menuLinks = links;
  console.log('menu links:', links);

  // Tab into Work: focusing a link of a later project brings that step on screen.
  await p.evaluate(() => window.__scenes.go('work'));
  await p.waitForTimeout(400);
  await p.evaluate(() => document.querySelector('#work [data-step="3"] a')?.focus());
  await p.waitForTimeout(1500);
  report.gestures.focusWorkStep = await p.evaluate(() => document.querySelector('#work').dataset.step);
  console.log('focus link in Work project 4 -> step', report.gestures.focusWorkStep);
  await context.close();
}

// Phone swipe: one swipe = one stop.
{
  const { context, p } = await open({ width: 390, height: 844, mobile: true, dpr: 2 });
  const swipe = async (dy) => {
    const cdp = await context.newCDPSession(p);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 200, y: 600 }] });
    for (let k = 1; k <= 8; k++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 200, y: 600 - (dy * k) / 8 }] });
      await p.waitForTimeout(16);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await p.waitForTimeout(1200);
  };
  const stops = await p.evaluate(() => window.__scenes.stops().map((s) => `${s.scene}/${s.step}`));
  const where = () =>
    p.evaluate(() => {
      const st = window.__scenes.stops();
      const s = st.reduce((a, b) => (Math.abs(b.y - scrollY) < Math.abs(a.y - scrollY) ? b : a));
      return `${s.scene}/${s.step}@${Math.round(scrollY)}`;
    });
  const seq = [await where()];
  for (let k = 0; k < 8; k++) {
    await swipe(260);
    seq.push(await where());
  }
  report.gestures.phoneSwipes = { stops, seq };
  console.log('phone swipes:', seq.join(' > '));
  await context.close();
}

// Chat panel open.
for (const vp of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'phone', width: 390, height: 844, dpr: 2, mobile: true },
]) {
  const { context, p } = await open(vp);
  await p.locator('.fab').click();
  await p.waitForTimeout(9000);
  const size = await p.evaluate(() => {
    const f = document.querySelector('#ask-panel .frame-wrap').getBoundingClientRect();
    const panel = document.querySelector('#ask-panel').getBoundingClientRect();
    return { frameH: Math.round(f.height), panelTop: Math.round(panel.top), panelH: Math.round(panel.height) };
  });
  report.gestures[`chat-${vp.name}`] = size;
  console.log(`chat ${vp.name}:`, size);
  await p.screenshot({ path: path.join(out, `chat-${vp.name}.png`) });
  await context.close();
}

// Reduced motion: plain scroll, everything listed.
for (const vp of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'phone', width: 390, height: 844, dpr: 2, mobile: true },
]) {
  const { context, p } = await open(vp, '/', { reducedMotion: 'reduce' });
  const state = await p.evaluate(() => ({
    scenes: document.documentElement.classList.contains('scenes'),
    pinned: document.querySelectorAll('.pin-spacer').length,
    hiddenSteps: [...document.querySelectorAll('[data-step-item]')].filter((el) => getComputedStyle(el).opacity === '0').length,
  }));
  report.gestures[`reduced-${vp.name}`] = state;
  console.log(`reduced motion ${vp.name}:`, state);
  await p.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight / 2) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    scrollTo(0, 0);
  });
  await p.waitForTimeout(600);
  await p.screenshot({ path: path.join(out, `reduced-motion-${vp.name}.png`), fullPage: true });
  await context.close();
}

// Photo treatment evidence: the same small originals stretched full-bleed at 1440 px
// (compare with the framed story steps above).
{
  const { readFile } = await import('node:fs/promises');
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  for (const file of ['automotive-assembling-1.jpg', 'drone-instrumentation-2.jpg']) {
    const data = (await readFile(path.join(root, 'src/assets/behance', file))).toString('base64');
    await page.setContent(
      `<body style="margin:0;background:#0e1013"><img src="data:image/jpeg;base64,${data}" style="display:block;width:100vw;height:100vh;object-fit:cover"></body>`,
    );
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(out, `photo-treatment-fullbleed-${file.replace('.jpg', '')}.png`) });
  }
  await page.close();
}

await browser.close();
await writeFile(path.join(root, 'reports/p9b2-checks.json'), JSON.stringify(report, null, 2));
console.log('problems:', report.problems.length);
for (const pr of report.problems.slice(0, 20)) console.log(' ', JSON.stringify(pr).slice(0, 300));
