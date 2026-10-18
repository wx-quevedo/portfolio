// Browser check of the production headers (run against scripts/serve-dist.mjs): loads / and /es/,
// runs the detector demo, shows the 3D constellation and opens the chat, and reports every console
// error and Content-Security-Policy violation (page and worker).
// Usage: node scripts/csp-check.mjs [baseUrl]
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:4321';
const results = [];

for (const run of [
  { name: 'chromium (WASM)', launch: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }, path: '/' },
  { name: 'chrome (WebGPU)', launch: { channel: 'chrome', args: ['--enable-unsafe-webgpu'] }, path: '/es/' },
]) {
  const browser = await chromium.launch(run.launch);
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const problems = [];
  page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text().slice(0, 200)}`));
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message.slice(0, 200)}`));
  page.on('worker', (w) => w.on('console', (m) => m.type() === 'error' && problems.push(`worker: ${m.text().slice(0, 200)}`)));
  await page.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
  });
  const res = await page.goto(base + run.path, { waitUntil: 'load' });
  const csp = res.headers()['content-security-policy'] ?? '';
  await page.waitForFunction(() => window.__scenes?.stops().length > 0, null, { timeout: 15000 });
  await page.waitForTimeout(800);

  // Detector demo
  await page.evaluate(() => window.__scenes.go('detector'));
  await page.waitForTimeout(600);
  await page.locator('[data-try]').click();
  await page.waitForFunction(() => document.querySelector('[data-detector]').dataset.lastRequest === '1', null, { timeout: 180000 });
  const detector = await page.evaluate(() => ({
    backend: document.querySelector('[data-detector]').dataset.backend,
    detections: JSON.parse(document.querySelector('[data-detector]').dataset.lastDetections).length,
  }));

  // Constellation
  await page.evaluate(() => window.__scenes.go('research', 1));
  await page.waitForFunction(() => window.__constellation, null, { timeout: 20000 }).catch(() => {});
  const constellation = await page.evaluate(() => !document.querySelector('[data-constellation]').hidden);

  // Chat
  await page.locator('.fab').click();
  const chat = await page
    .waitForSelector('.ask-chat.is-ready', { state: 'attached', timeout: 20000 })
    .then(() => true)
    .catch(() => false);
  await page.waitForTimeout(1500);

  const violations = await page.evaluate(() => window.__csp);
  results.push({ run: run.name, page: run.path, cspHeader: csp.length > 0, detector, constellation, chat, violations, problems });
  await browser.close();
}

for (const r of results) {
  console.log(`\n${r.run} ${r.page}`);
  console.log(`  CSP header sent: ${r.cspHeader}`);
  console.log(`  detector: ${r.detector.backend}, ${r.detector.detections} detection(s)`);
  console.log(`  constellation 3D shown: ${r.constellation}`);
  console.log(`  chat ready: ${r.chat}`);
  console.log(`  CSP violations: ${r.violations.length ? r.violations.join(' | ') : 'none'}`);
  console.log(`  console errors: ${r.problems.length ? '\n    ' + r.problems.join('\n    ') : 'none'}`);
}
process.exitCode = results.some((r) => r.violations.length || r.problems.length || !r.chat || !r.constellation) ? 1 : 0;
