# washingtonquevedo.com

Source of [washingtonquevedo.com](https://washingtonquevedo.com), the portfolio of Washington X. Quevedo, AI & XR Engineer.

A static, bilingual site (English at `/`, Spanish at `/es/`) with:

- **The story**, from a 2016 robotics simulator to on-device detection, told with real project photos;
- **Selected work**, including Buscapez (an on-device tuna detector built for a Stanford project) and Ask Washington (a retrieval assistant that cites its sources);
- **Try the detector**: the Buscapez model running in your browser. Your photo is never uploaded;
- **XR engineering since 2016**, from Behance;
- **Research**: 30+ papers as a 3D constellation grouped by topic;
- **Ask me anything**: the Ask Washington chat, in a floating panel.

The page moves scene by scene (one screen per section, step by step inside Story, Work and Research). With `prefers-reduced-motion` it is a plain scrolling page.

## Stack

- [Astro](https://astro.build) 7 (static output) with TypeScript
- Hand-written CSS with design tokens (no CSS framework)
- Astro native i18n routing and `@astrojs/sitemap`
- `astro:assets` for images (AVIF and WebP, responsive widths, lazy loading)
- Self-hosted fonts: Jost and IBM Plex Mono (SIL OFL)
- Scene navigation for the whole page with [GSAP](https://gsap.com) ScrollTrigger and [Lenis](https://lenis.darkroom.engineering): each section is one screen, and Story, Work and Research advance step by step while pinned. With `prefers-reduced-motion` the page scrolls normally and every step is listed
- In-browser tuna detector with [onnxruntime-web](https://onnxruntime.ai) in a Web Worker (WebGPU when available, otherwise WASM), loaded only when the visitor presses "Try it"
- 3D paper constellation with [three.js](https://threejs.org), loaded only near Research, with a static SVG fallback
- Little other client JavaScript: the menu toggle and the floating Ask Washington chat


## Run locally

Requires Node.js 22.12 or newer.

```bash
npm install
npm run dev        # http://localhost:4321
```

Production build and preview:

```bash
npm run build
npm run preview    # serves dist/ at http://localhost:4321
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Static build into `dist/` |
| `npm run preview` | Serve the build |
| `npm run check` | Type and template checks (`astro check`) |
| `npm run fetch:behance` | Download Behance images listed in `behance_inventory.json` into `src/assets/behance/` |
| `npm run og` | Render `public/og.png` (Open Graph image) |
| `npm run screenshots` | Full-page screenshots and horizontal overflow checks (needs `npm run preview`) |
| `npm run lighthouse` | Lighthouse mobile audit of `/` and `/es/` (needs `npm run preview`) |
| `npm run precompress` | Write `.gz` and `.br` copies of the compressible files in `dist/` (used by the server) |
| `npm run serve:prod` | Serve `dist/` locally with the production headers, CSP and cache policy from `deploy/nginx/` |
| `npm run check:csp` | Browser check under that CSP: detector demo, 3D constellation and chat, no violations or console errors (needs `npm run serve:prod`) |
| `npm run checks:p9c` | Detector validation against a Python reference, inference timing, demo/constellation/chat captures (needs `npm run preview`; see the header of `scripts/p9c-checks.mjs`) |
| `npm run screenshots:scenes` | Every scene and step on desktop and phone, gesture tests, chat panel and reduced motion (needs `npm run preview`) |

The screenshot and Lighthouse scripts use Playwright's Chromium: run `npx playwright install chromium` once.

## Scene navigation

`src/scripts/scenes.ts` turns the page into scenes when `html.scenes` is set (an inline script in the `<head>` sets it unless the visitor prefers reduced motion):

- every `[data-scene]` is one screen and a wheel gesture, swipe or key press moves exactly one stop; the rest of a gesture and its inertia are ignored, so a scene is never skipped;
- `[data-steps]` scenes (Story, Work, Research) are pinned with ScrollTrigger and show one `[data-step-item]` per stop, with a step counter;
- a scene taller than the screen scrolls freely inside its own range; a stepped scene that does not fit is shown as a list (`.steps-off`);
- menu links, step buttons and keyboard focus move to the right scene and step.

The story uses the real project photos from Behance. An earlier version used a film generated with Wan 2.2 (ComfyUI); it was removed because generated footage made the projects look AI-made. Its scripts stay in `scripts/comfy/` and its evidence in `reports/comfy/` as a record only; nothing of it is loaded by the site.

## Detector demo

"Try the detector" runs the Buscapez tuna model in the visitor's browser. The photo is never uploaded.

- **Model**: `public/models/tuna4_n_v1/tuna4_n_v1_o2m.onnx` (Ultralytics YOLO26n, raw one2many output, no NMS in the graph) and `labels.json`, copied unchanged from the `buscapez-ml` project. Classes: 0 Albacore, 1 Bigeye Tuna, 2 Bonito, 3 Yellowfin Tuna.
- **Preprocessing** (same as training and as the production service): letterbox to 640x640 keeping the aspect ratio with gray 114 padding, RGB, divided by 255, no mean/std, NCHW.
- **Postprocessing** in JavaScript: output `(1, 8, 8400)` = cx, cy, w, h in the 640 space plus four class scores; best class per anchor, confidence 0.5, NMS within each class at IoU 0.5, then boxes mapped back to the original image.
- **Runtime**: `src/scripts/detector.worker.ts` (Web Worker). WebGPU build of onnxruntime-web when the browser exposes a WebGPU adapter, otherwise the WASM build; single-threaded WASM unless the page is cross-origin isolated. The model and the runtime are downloaded with visible progress only after "Try it".
- **Validation**: the same model run with onnxruntime in Python (buscapez-ml's own detector) on the examples and on full-size test photos gives the same boxes and classes (IoU 0.98-0.99, see `reports/p9c-detector-validation.md`).
- **Example photos**: five photos from the test split of the [Tuna Fish Detection](https://universe.roboflow.com/washington-x-quevedo/tuna-fish-detection-0gaol) dataset by Washington X. Quevedo on Roboflow Universe, licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); resized to 1280 px and converted to WebP. The attribution is shown under the demo.
- **Model license**: Ultralytics YOLO models are AGPL-3.0; this is stated under the demo.

## Paper constellation

Research shows the 25 papers of `src/data/papers.yaml` (copied from the Ask Washington project) as a constellation: one dot per paper, sized by the square root of its citations, grouped by topic. Topics come from the paper titles (`src/data/papers.ts`, first matching rule wins): health and rehabilitation, robotics and simulation, education, industrial training, marketing and tourism, 3D on the web. The layout (`src/lib/constellation.ts`) is shared by the 3D view (`src/scripts/constellation.ts`, three.js: drag to rotate, hover for details, click to open; the paper of the current Research step lights up and the camera eases towards it) and the static SVG used with reduced motion, Save-Data, low-end phones or without WebGL. The 3D canvas is `aria-hidden`; the paper list and the SVG links stay in the DOM.

## Deploy

The site is plain static files behind nginx on a VPS (no Docker). `deploy/deploy.ps1` (Windows PowerShell 5.1 or newer) does everything in one command:

1. reads the SSH target from `deploy/.deploy.local` (ignored by git; see `deploy/.deploy.local.example`);
2. builds locally (`npm ci`, `npm run build`), precompresses `dist/` and computes the sha256 hashes of the inline scripts for the Content-Security-Policy;
3. uploads the package and runs `deploy/remote-deploy.sh` over one `ssh -t` session (one sudo prompt): a new folder in `/var/www/washingtonquevedo.com/releases/`, an atomic switch of the `current` symlink, the nginx site and its headers snippet, and certbot for the apex and `www`;
4. runs a smoke test over the internet (HTTPS, `www` redirect, cache and compression headers of the model and the WebAssembly runtime).

```powershell
powershell -ExecutionPolicy Bypass -File deploy\deploy.ps1 -DryRun   # build and package only
powershell -ExecutionPolicy Bypass -File deploy\deploy.ps1           # publish
powershell -ExecutionPolicy Bypass -File deploy\rollback.ps1         # back to the previous release
```

Server configuration (`deploy/nginx/`):

- `www` redirects to the apex with 301; HTTP redirects to HTTPS (certbot).
- Cache: one year, `immutable`, for `/_astro/` (hashed names) and `/models/` (versioned folder, `tuna4_n_v1`); HTML is revalidated on every visit.
- Compression: precompressed `.gz` (and `.br` when the nginx brotli module is installed) for HTML, CSS, JS, JSON, SVG, WebAssembly and ONNX; `.wasm` is served as `application/wasm`, `.onnx` as `application/octet-stream`.
- Headers: a Content-Security-Policy that allows only what the site needs (its own files, the inline script hashes, `'wasm-unsafe-eval'` for onnxruntime-web, `worker-src 'self' blob:`, `frame-src https://ask.inmersoft.com`), `X-Content-Type-Options`, `Referrer-Policy` and `Permissions-Policy`.

## Structure

```
src/
  components/   page sections (Header, Hero, Stats, Story, Work, Detector, Xr, Research, Ask, Contact, AskChat)
  scripts/      scenes.ts (scene navigation), detector-demo.ts + detector.worker.ts (detector), constellation.ts (3D)
  lib/          constellation.ts (shared layout of the paper constellation)
  data/         papers.yaml (from Google Scholar and publisher pages), work, XR and story photo data
  i18n/ui.ts    all visible text in English and Spanish
  layouts/      base HTML, SEO and Open Graph metadata
  pages/        / (en), /es/, 404
deploy/         deploy.ps1, remote-deploy.sh, rollback.ps1, nginx/ (site, headers snippet, brotli)
public/         fonts, CV, favicon, OG image, robots.txt, models/ (ONNX detector), detector/examples/
scripts/        image download, OG image, screenshots, Lighthouse, comfy/ (record of the removed film, not used)
```

## Licenses

- **Code**: MIT (see `LICENSE`).
- **Detector model** (`public/models/`): an Ultralytics YOLO model, AGPL-3.0.
- **Example photos** (`public/detector/examples/`): from the Tuna Fish Detection dataset by Washington X. Quevedo on Roboflow Universe, CC BY 4.0.
- **Fonts** (`public/fonts/`): SIL Open Font License.
- **Content**: texts, photos, the CV and other content are © Washington X. Quevedo, all rights reserved.
