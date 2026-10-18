# washingtonquevedo.com

Personal portfolio of Washington X. Quevedo, AI & XR Engineer. A static, bilingual site (English at `/`, Spanish at `/es/`) that presents his story, selected machine learning work, XR projects since 2016, research, an embedded retrieval assistant (Ask Washington) and contact details.

## Stack

- [Astro](https://astro.build) 7 (static output) with TypeScript
- Hand-written CSS with design tokens (no CSS framework)
- Astro native i18n routing and `@astrojs/sitemap`
- `astro:assets` for images (AVIF and WebP, responsive widths, lazy loading)
- Self-hosted fonts: Jost and IBM Plex Mono (SIL OFL)
- Scene navigation for the whole page with [GSAP](https://gsap.com) ScrollTrigger and [Lenis](https://lenis.darkroom.engineering): each section is one screen, and Story, Work and Research advance step by step while pinned. With `prefers-reduced-motion` the page scrolls normally and every step is listed
- Little other client JavaScript: the menu toggle and the floating Ask Washington chat

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
| `npm run screenshots:scenes` | Every scene and step on desktop and phone, gesture tests, chat panel and reduced motion (needs `npm run preview`) |

The screenshot and Lighthouse scripts use Playwright's Chromium: run `npx playwright install chromium` once.

## Scene navigation

`src/scripts/scenes.ts` turns the page into scenes when `html.scenes` is set (an inline script in the `<head>` sets it unless the visitor prefers reduced motion):

- every `[data-scene]` is one screen and a wheel gesture, swipe or key press moves exactly one stop; the rest of a gesture and its inertia are ignored, so a scene is never skipped;
- `[data-steps]` scenes (Story, Work, Research) are pinned with ScrollTrigger and show one `[data-step-item]` per stop, with a step counter;
- a scene taller than the screen scrolls freely inside its own range; a stepped scene that does not fit is shown as a list (`.steps-off`);
- menu links, step buttons and keyboard focus move to the right scene and step.

The story uses the real project photos from Behance. An earlier version used a film generated with Wan 2.2 (ComfyUI); it was removed because generated footage made the projects look AI-made. Its scripts stay in `scripts/comfy/` and its evidence in `reports/comfy/` as a record only; nothing of it is loaded by the site.

## Structure

```
src/
  components/   page sections (Header, Hero, Stats, Story, Work, Detector, Xr, Research, Ask, Contact, AskChat)
  scripts/      scenes.ts (scene navigation: GSAP ScrollTrigger + Lenis)
  data/         papers.yaml (from Google Scholar and publisher pages), work, XR and story photo data
  i18n/ui.ts    all visible text in English and Spanish
  layouts/      base HTML, SEO and Open Graph metadata
  pages/        / (en), /es/, 404
public/         fonts, CV, favicon, OG image, robots.txt
scripts/        image download, OG image, screenshots, Lighthouse, comfy/ (record of the removed film, not used)
```

## License

The source code is released under the MIT license (see `LICENSE`). Texts, images, the CV and other content are © Washington X. Quevedo, all rights reserved. Fonts are under the SIL Open Font License (see `public/fonts/`).
