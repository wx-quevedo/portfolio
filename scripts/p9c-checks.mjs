// P9c checks and captures. Needs a running server (npm run preview).
// Usage: node scripts/p9c-checks.mjs [--only=validate,timing,shots,constellation,chat] [--ref=py.json] [--tests=a.jpg,b.jpg]
//   validate      run the demo on the examples and on full-size test photos; compare with --ref (Python)
//   timing        inference time: desktop WASM, desktop WebGPU (if the browser exposes it), phone profile
//   shots         demo before loading, loading and with results, desktop and phone
//   constellation the 3D constellation in the 3 Research steps and the static version
//   chat          the Ask Washington panel answering, EN and ES
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const base = arg('base') ?? 'http://localhost:4321';
const only = (arg('only') ?? 'validate,timing,shots,constellation,chat').split(',');
const out = path.join(root, 'reports/screenshots/p9c');
await mkdir(out, { recursive: true });
const report = {};
const shot = (name) => path.join(out, name);

const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const EXAMPLES = ['albacore', 'bigeye', 'bonito-pair', 'yellowfin', 'yellowfin-portrait'];

async function openPage(browser, viewport, url = '/', options = {}) {
  const { width, height, ...rest } = viewport;
  const context = await browser.newContext({ viewport: { width, height }, ...rest, ...options });
  const page = await context.newPage();
  await page.goto(base + url, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  return { context, page };
}

async function toDetector(page) {
  await page.waitForFunction(() => window.__scenes?.stops().length > 0, null, { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => {
    if (window.__scenes) window.__scenes.go('detector');
    const demo = document.querySelector('[data-detector]');
    const r = demo.getBoundingClientRect();
    if (r.bottom > innerHeight || r.top < 80) window.scrollTo(0, r.top + scrollY - 88);
  });
  await page.waitForTimeout(800);
}

async function startDemo(page) {
  await page.locator('[data-try]').click();
  await page.waitForSelector('[data-detector][data-state="ready"]', { timeout: 180000 });
  await page.waitForFunction(() => document.querySelector('[data-detector]').dataset.lastRequest === '1', null, { timeout: 60000 });
}

async function runAndRead(page, action) {
  const before = await page.evaluate(() => Number(document.querySelector('[data-detector]').dataset.lastRequest ?? 0));
  await action();
  await page.waitForFunction((n) => Number(document.querySelector('[data-detector]').dataset.lastRequest ?? 0) > n, before, {
    timeout: 60000,
  });
  return page.evaluate(() => {
    const d = document.querySelector('[data-detector]').dataset;
    return { detections: JSON.parse(d.lastDetections), inferenceMs: Number(d.lastInferenceMs), backend: d.backend };
  });
}
const clickExample = (page, name) => () => page.locator(`[data-example$="/${name}.webp"]`).click();
const choosePhoto = (page, file) => () => page.locator('[data-file]').setInputFiles(file);

const iou = (a, b) => {
  const ix = Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0]));
  const iy = Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
  const inter = ix * iy;
  return inter / ((a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter);
};
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

// ---------------------------------------------------------------- validate
if (only.includes('validate')) {
  const ref = JSON.parse(await readFile(arg('ref'), 'utf8'));
  const tests = (arg('tests') ?? '').split(',').filter(Boolean);
  const browser = await chromium.launch({ args: ['--disable-gpu'] });
  const { context, page } = await openPage(browser, DESKTOP);
  await toDetector(page);
  await startDemo(page);
  const rows = [];
  const inputs = [
    ...EXAMPLES.map((n) => ({ key: `${n}.webp`, action: clickExample(page, n) })),
    ...tests.map((f) => ({ key: path.basename(f), action: choosePhoto(page, f) })),
  ];
  for (const input of inputs) {
    const js = await runAndRead(page, input.action);
    const py = ref[input.key];
    const used = new Set();
    for (const p of py.dets) {
      let best = -1;
      let bestIou = 0;
      js.detections.forEach((d, i) => {
        if (used.has(i) || d.classId !== p.class_id) return;
        const v = iou(p.box, d.box);
        if (v > bestIou) [best, bestIou] = [i, v];
      });
      if (best >= 0) used.add(best);
      const j = best >= 0 ? js.detections[best] : null;
      rows.push({
        image: input.key,
        size: `${py.w}x${py.h}`,
        pyClass: p.class_id,
        jsClass: j ? j.classId : null,
        pyConf: p.confidence,
        jsConf: j ? Number(j.score.toFixed(4)) : null,
        iou: Number(bestIou.toFixed(4)),
        ok: !!j && bestIou >= 0.95,
      });
    }
    js.detections.forEach((d, i) => {
      if (!used.has(i)) rows.push({ image: input.key, size: `${py.w}x${py.h}`, pyClass: null, jsClass: d.classId, iou: 0, ok: false, extra: true });
    });
  }
  report.validation = rows;
  const names = ['Albacore', 'Bigeye Tuna', 'Bonito', 'Yellowfin Tuna'];
  const md = [
    '| Image | Size | Python class | JS class | Python conf. | JS conf. | IoU | OK |',
    '|---|---|---|---|---|---|---|---|',
    ...rows.map(
      (r) =>
        `| ${r.image.slice(0, 34)} | ${r.size} | ${r.pyClass === null ? '-' : names[r.pyClass]} | ${r.jsClass === null ? '-' : names[r.jsClass]} | ${r.pyConf ?? '-'} | ${r.jsConf ?? '-'} | ${r.iou} | ${r.ok ? 'yes' : 'NO'} |`,
    ),
  ].join('\n');
  await writeFile(path.join(root, 'reports/p9c-detector-validation.md'), md + '\n');
  console.log(md);
  console.log(`validation: ${rows.filter((r) => r.ok).length}/${rows.length} boxes match (IoU >= 0.95, same class)`);
  await context.close();
  await browser.close();
}

// ---------------------------------------------------------------- timing
if (only.includes('timing')) {
  const profiles = [
    { name: 'desktop-wasm', launch: { args: ['--disable-gpu'] }, viewport: DESKTOP },
    { name: 'desktop-webgpu', launch: { args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan'] }, viewport: DESKTOP },
    { name: 'desktop-webgpu-chrome', launch: { channel: 'chrome', args: ['--enable-unsafe-webgpu'] }, viewport: DESKTOP },
    { name: 'phone-emulated-4x-cpu', launch: { args: ['--disable-gpu'] }, viewport: PHONE, throttle: 4 },
  ];
  report.timing = {};
  for (const prof of profiles) {
    let browser;
    try {
      browser = await chromium.launch(prof.launch);
    } catch (e) {
      report.timing[prof.name] = { error: String(e).slice(0, 120) };
      continue;
    }
    const { context, page } = await openPage(browser, prof.viewport);
    if (prof.throttle) {
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: prof.throttle });
    }
    await toDetector(page);
    const t0 = Date.now();
    await startDemo(page);
    const loadMs = Date.now() - t0;
    const times = [];
    let backend = '';
    for (let round = 0; round < 2; round++) {
      for (const n of EXAMPLES) {
        const r = await runAndRead(page, clickExample(page, n));
        times.push(r.inferenceMs);
        backend = r.backend;
      }
    }
    report.timing[prof.name] = {
      backend,
      runs: times.length,
      medianMs: Math.round(median(times)),
      minMs: Math.round(Math.min(...times)),
      maxMs: Math.round(Math.max(...times)),
      loadAndWarmupMs: loadMs,
    };
    console.log(prof.name, report.timing[prof.name]);
    await context.close();
    await browser.close();
  }
}

// ---------------------------------------------------------------- shots
if (only.includes('shots')) {
  const browser = await chromium.launch({ args: ['--disable-gpu'] });
  const tests = (arg('tests') ?? '').split(',').filter(Boolean);
  for (const [name, viewport] of [
    ['desktop', DESKTOP],
    ['phone', PHONE],
  ]) {
    const { context, page } = await openPage(browser, viewport, name === 'phone' ? '/es/' : '/');
    await toDetector(page);
    const requests = [];
    page.on('request', (r) => requests.push(r.url()));
    await page.screenshot({ path: shot(`demo-1-before-${name}.png`) });
    const heavyBefore = requests.filter((u) => /\.onnx|\.wasm|ort\.|detector\.worker/.test(u)).length;
    // Slow network only for the "loading" capture.
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 40, downloadThroughput: 1_500_000, uploadThroughput: 500_000 });
    await page.locator('[data-try]').click();
    await page.waitForFunction(() => Number(document.querySelector('[role="progressbar"]').getAttribute('aria-valuenow')) > 15, null, { timeout: 60000 });
    await page.screenshot({ path: shot(`demo-2-loading-${name}.png`) });
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await page.waitForSelector('[data-detector][data-state="ready"]', { timeout: 180000 });
    await page.waitForFunction(() => document.querySelector('[data-detector]').dataset.lastRequest === '1', null, { timeout: 60000 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: shot(`demo-3-result-albacore-${name}.png`) });
    await runAndRead(page, clickExample(page, 'bonito-pair'));
    await page.waitForTimeout(300);
    await page.screenshot({ path: shot(`demo-4-result-bonito-pair-${name}.png`) });
    if (tests[0]) {
      await runAndRead(page, choosePhoto(page, tests[0]));
      await page.waitForTimeout(300);
      await page.screenshot({ path: shot(`demo-5-own-photo-${name}.png`) });
    }
    report[`shots-${name}`] = { heavyRequestsBeforeTry: heavyBefore };
    console.log(`shots ${name}: heavy requests before "Try it": ${heavyBefore}`);
    await context.close();
  }
  await browser.close();
}

// ---------------------------------------------------------------- constellation
if (only.includes('constellation')) {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const [name, viewport] of [
    ['desktop', DESKTOP],
    ['phone', PHONE],
  ]) {
    const { context, page } = await openPage(browser, viewport);
    const threeBefore = await page.evaluate(() => performance.getEntriesByType('resource').filter((e) => e.name.includes('constellation')).length);
    await page.waitForFunction(() => window.__scenes?.stops().length > 0);
    const steps = [];
    for (let s = 0; s < 3; s++) {
      await page.evaluate((step) => window.__scenes.go('research', step), s);
      await page.waitForTimeout(s === 0 ? 2500 : 1600);
      const state = await page.evaluate(() => ({
        threeShown: !document.querySelector('[data-constellation]').hidden,
        current: window.__constellation?.step(),
        researchStep: document.getElementById('research').dataset.step,
      }));
      steps.push(state);
      await page.screenshot({ path: shot(`constellation-step${s + 1}-${name}.png`) });
    }
    report[`constellation-${name}`] = { loadedAtTop: threeBefore, steps };
    console.log(`constellation ${name}: loaded at top=${threeBefore}`, steps);
    await context.close();
  }
  // Static version (reduced motion): same data, links, no 3D.
  const { context, page } = await openPage(browser, DESKTOP, '/', { reducedMotion: 'reduce' });
  await page.locator('#research figure').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  const stat = await page.evaluate(() => ({
    threeShown: !document.querySelector('[data-constellation]').hidden,
    links: document.querySelectorAll('#research svg.static a').length,
  }));
  report['constellation-static'] = stat;
  console.log('constellation static:', stat);
  await page.locator('#research figure').screenshot({ path: shot('constellation-static.png') });
  await context.close();
  await browser.close();
}

// ---------------------------------------------------------------- chat
if (only.includes('chat')) {
  const browser = await chromium.launch({ args: ['--disable-gpu'] });
  const questions = { en: 'What did Washington build for Stanford?', es: '¿Qué construyó Washington para Stanford?' };
  for (const [lang, viewport] of [
    ['en', DESKTOP],
    ['es', PHONE],
  ]) {
    const { context, page } = await openPage(browser, viewport, lang === 'en' ? '/' : '/es/');
    await page.locator('.fab').click();
    await page.waitForSelector('.ask-chat.is-ready', { state: 'attached', timeout: 20000 });
    const frame = page.frameLocator('#ask-panel iframe');
    await frame.locator('#question').fill(questions[lang]);
    await frame.locator('#send').click();
    // The first assistant message is the greeting; wait for the answer (the second one).
    await frame.locator('.msg.assistant:not(.typing):not(.error) .bubble').nth(1).waitFor({ timeout: 90000 });
    await page.waitForTimeout(1500);
    const state = await page.evaluate(() => ({
      unavailableShown: !document.querySelector('[data-ask-unavailable]').hidden,
      frameHeight: Math.round(document.querySelector('#ask-panel iframe').getBoundingClientRect().height),
    }));
    const answer = (await frame.locator('.msg.assistant:not(.typing) .bubble').nth(1).innerText()).slice(0, 160);
    report[`chat-${lang}`] = { ...state, answer };
    console.log(`chat ${lang}:`, state, answer.replace(/\s+/g, ' ').slice(0, 120));
    await page.screenshot({ path: shot(`chat-${lang}-${lang === 'en' ? 'desktop' : 'phone'}.png`) });
    await context.close();
  }
  await browser.close();
}

const file = path.join(root, 'reports/p9c-checks.json');
let previous = {};
try {
  previous = JSON.parse(await readFile(file, 'utf8'));
} catch {}
await writeFile(file, JSON.stringify({ ...previous, ...report }, null, 2));
