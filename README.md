# washingtonquevedo.com

Personal portfolio of Washington X. Quevedo, AI & XR Engineer. A static, bilingual site (English at `/`, Spanish at `/es/`) that presents his story, selected machine learning work, XR projects since 2016, research, an embedded retrieval assistant (Ask Washington) and contact details.

## Stack

- [Astro](https://astro.build) 7 (static output) with TypeScript
- Hand-written CSS with design tokens (no CSS framework)
- Astro native i18n routing and `@astrojs/sitemap`
- `astro:assets` for images (AVIF and WebP, responsive widths, lazy loading)
- Self-hosted fonts: Jost and IBM Plex Mono (SIL OFL)
- Little client JavaScript: a menu toggle, the floating Ask Washington chat and the story film
- Scroll-driven story film with [GSAP](https://gsap.com) ScrollTrigger and [Lenis](https://lenis.darkroom.engineering), loaded only after the page has loaded and skipped with `prefers-reduced-motion` or Save-Data
- Film generated with Wan 2.2 First-Last-Frame to Video on ComfyUI (`scripts/comfy/`)

Planned islands: an in-browser detector and a paper constellation (ONNX Runtime Web, Three.js / React Three Fiber). Their mount points are `MediaSlot` components with `data-island` set to `detector-demo` and `paper-constellation`.

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
| `npm run screenshots:p9b` | Story film scroll moments, chat panel and reduced-motion captures (needs `npm run preview`) |

The screenshot and Lighthouse scripts use Playwright's Chromium: run `npx playwright install chromium` once.

## Story film

The film in "The story" joins six project stills with five Wan 2.2 First-Last-Frame to Video segments rendered on a ComfyUI server (native nodes, API format in `scripts/comfy/wan22_flf2v_api.json`).

```powershell
$env:COMFY_URL = "http://<comfy-host>:8188"
uv run --with pillow python scripts/comfy/generate_story.py --segments 1 --width 832 --height 480   # quick test
uv run --with pillow python scripts/comfy/generate_story.py --seed 7                                # 1280x720
uv run --with pillow python scripts/comfy/encode_story.py --src build/story-src/<folder>            # needs ffmpeg
```

Raw frames go to `build/` (not committed). `encode_story.py` writes the web versions to `public/media/story/` (MP4 H.264 and WebM VP9, 1280 and 720 wide, at most 6 MB each) and the poster to `src/assets/story/poster.jpg`.

## Structure

```
src/
  components/   page sections (Header, Hero, Stats, Story, Work, Detector, Xr, Research, Ask, Contact, AskChat)
  scripts/      story-film.ts (GSAP + Lenis island, loaded on demand)
  data/         papers.yaml (from Google Scholar and publisher pages), work and XR project data
  i18n/ui.ts    all visible text in English and Spanish
  layouts/      base HTML, SEO and Open Graph metadata
  pages/        / (en), /es/, 404
public/         fonts, CV, favicon, OG image, robots.txt, media/story (film)
scripts/        image download, OG image, screenshots, Lighthouse, comfy/ (film generation)
```

## License

The source code is released under the MIT license (see `LICENSE`). Texts, images, the CV and other content are © Washington X. Quevedo, all rights reserved. Fonts are under the SIL Open Font License (see `public/fonts/`).
