# washingtonquevedo.com

Personal portfolio of Washington X. Quevedo, AI Engineer and XR developer. A static, bilingual site (English at `/`, Spanish at `/es/`) that presents his story, selected machine learning work, XR projects since 2016, research, an embedded retrieval assistant (Ask Washington) and contact details.

## Stack

- [Astro](https://astro.build) 7 (static output) with TypeScript
- Hand-written CSS with design tokens (no CSS framework)
- Astro native i18n routing and `@astrojs/sitemap`
- `astro:assets` for images (AVIF and WebP, responsive widths, lazy loading)
- Self-hosted fonts: Jost and IBM Plex Mono (SIL OFL)
- Almost no client JavaScript: a menu toggle and the Ask Washington embed bridge

Interactive pieces planned as islands: a scroll-driven story film (GSAP + Lenis) and an in-browser detector and paper constellation (ONNX Runtime Web, Three.js / React Three Fiber). Their mount points are `MediaSlot` components with `data-island` set to `story-film`, `detector-demo` and `paper-constellation`.

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

The screenshot and Lighthouse scripts use Playwright's Chromium: run `npx playwright install chromium` once.

## Structure

```
src/
  components/   page sections (Header, Hero, Stats, Story, Work, Detector, Xr, Research, Ask, Contact)
  data/         papers.yaml (from Google Scholar and publisher pages), work and XR project data
  i18n/ui.ts    all visible text in English and Spanish
  layouts/      base HTML, SEO and Open Graph metadata
  pages/        / (en), /es/, 404
public/         fonts, CV, favicon, OG image, robots.txt
scripts/        image download, OG image, screenshots, Lighthouse
```

## License

The source code is released under the MIT license (see `LICENSE`). Texts, images, the CV and other content are © Washington X. Quevedo, all rights reserved. Fonts are under the SIL Open Font License (see `public/fonts/`).
