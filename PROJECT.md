# Portafolio washingtonquevedo.com

## Contexto

Portafolio personal de Washington X. Quevedo (AI Engineer y desarrollador XR) para conseguir trabajo remoto internacional. Dominio comprado: washingtonquevedo.com (aún sin deploy). El seguimiento del plan vive en `C:\xampp\htdocs\enhanced-me`; aquí no hay `plan.json`.

Fases del portafolio:

- **P9** (este paso): base estática, bilingüe, con todas las secciones y espacios reservados.
- **P9b**: película controlada por scroll (GSAP + Lenis) en la escena "The story".
- **P9c**: demo del detector en el navegador (ONNX Runtime Web) y constelación de artículos (Three.js / React Three Fiber).
- **P9d**: permitir el dominio en Ask Washington (`EMBED_ALLOWED_ORIGINS`) y deploy.

## Decisiones

- **Astro 7.4 estático + TypeScript + CSS propio.** Sin Tailwind: el diseño es pequeño y está definido por tokens (`src/styles/global.css`); un framework no ahorra nada aquí.
- **i18n nativo de Astro**: inglés en `/` (sin prefijo) y español en `/es/`. Todos los textos visibles en `src/i18n/ui.ts`; los datos de proyectos traen su texto en ambos idiomas.
- **Fuentes autoalojadas**: subconjunto latin de Jost 300/400/500 e IBM Plex Mono 400/500 copiado a `public/fonts/` (licencias OFL incluidas), con `preload` de Jost 300 y 400. El subconjunto incluye acentos, "·" y "−".
- **CSS en línea** (`build.inlineStylesheets: 'always'`): elimina la única petición que bloqueaba el render.
- **JS mínimo**: solo el botón del menú móvil y el puente `postMessage` de Ask Washington. No hay ningún framework de islas instalado todavía.
- **Espacios para islas**: `src/components/MediaSlot.astro` reserva el marco con su proporción y un contenido estático de respaldo. Puntos de montaje:
  - `story-film` (16:7) en `Story.astro`: hoy una imagen fija del simulador Unity3D-MatLab. P9b la reemplaza por `<StoryFilm client:visible />`.
  - `detector-demo` (4:3) en `Detector.astro`: hoy un marco con "Demo coming soon". P9c.
  - `paper-constellation` (8:5) en `Research.astro`: hoy un SVG estático generado desde `papers.yaml` (x = año, tamaño = citas). P9c lo reemplaza por la versión 3D.
  - Para P9c habrá que agregar `@astrojs/react` (React Three Fiber) y cargar ONNX Runtime Web solo dentro de la isla.
- **Ask Washington**: iframe `https://ask.inmersoft.com/?embed=1&lang=<idioma>` con `loading="lazy"`. Escucha `ask-washington:height` solo desde ese origen y desde ese iframe; envía `ask-washington:lang` al cargar y si cambia `<html lang>` sin recargar (también expuesto como `window.setAskWashingtonLanguage`). El aviso "Answers are generated from public sources and may contain errors." lo muestra el sitio debajo del iframe. En local no carga porque el dominio aún no está permitido (esperado, P9d).
- **Imágenes de Behance**: descargadas con `scripts/fetch-behance.mjs`, que prueba `source`, `max_3840`, `fs`, `1400`, `max_1200`... sin `_webp`. Las 24 bajaron desde `source` (JPG/PNG). Se optimizan con `astro:assets` (AVIF + WebP + JPG de respaldo, anchos responsivos que nunca superan el original, lazy).
- **Buscapez sin imágenes** (trabajo para Stanford): placeholder sobrio con cuadrícula y un recuadro de detección. No hay enlaces a las tiendas porque no están en ningún repo local; se menciona "App Store y Google Play" sin enlazar.
- **Retrato**: placeholder 4:5 en grises con grano y monograma; cuando haya foto, va con `loading="eager"` y `fetchpriority="high"` (comentario en `Hero.astro`).
- **Datos de papers**: `src/data/papers.yaml` copiado de `ask-washington/data/papers.yaml` (25 entradas con año y citas). El top 3 se calcula por citas.
- **CV**: `public/cv/CV_Washington_X_Quevedo_AI_Engineer_EN.pdf` (copiado de `enhanced-me/cv/`). En español el enlace dice "CV (PDF, en inglés)".
- **Márgenes**: 32 px en todos los anchos, como en el diseño aprobado (también a 390 px).
- **Menú**: navegación completa desde 1024 px; por debajo, botón "Menu" con panel a pantalla completa (Escape cierra y devuelve el foco).
- **SEO**: canonical, hreflang (en, es, x-default), OpenGraph y Twitter con `public/og.png` (1200x630, generado con `scripts/og.mjs`), JSON-LD `Person`, `robots.txt` y sitemap.

## Bitácora

### 2026-10-18 · P9 base del portafolio

- Proyecto Astro 7.4.0 creado a mano (sin plantilla), git inicializado.
- 10 secciones en el orden aprobado, en inglés y español.
- 24 imágenes de Behance descargadas en su máxima resolución disponible (`source`). Observaciones:
  - Las originales son pequeñas: entre 425 y 968 px de ancho (salvo `vr-runner-3.png` 1452 px y `unity-matlab-simulator-1.png` 1742 px). En pantallas de alta densidad las tarjetas XR se ven algo suaves.
  - `robot-teleoperation-4/5/6` eran copias exactas de `1/2/3` (mismo hash); se borraron.
  - `unity-matlab-simulator-1.png` traía un borde azul de ventana de 8 px; se recortó.
  - `ar-filters` no tiene imágenes en el inventario (es video).
- Verificación:
  - `astro check`: 0 errores, 0 advertencias.
  - Sin scroll horizontal a 390, 768, 1280 y 1440 px en `/` y `/es/` (`reports/overflow.json`).
  - Lighthouse móvil (`/` y `/es/`): Performance 100, Accessibility 100, Best Practices 100, SEO 100 (`reports/lighthouse/`).
  - Menú móvil probado con teclado (abre, Escape cierra y devuelve el foco, los enlaces cierran el panel); todas las imágenes tienen `alt`.
  - Capturas de página completa en `reports/screenshots/` (1440 y 390, en y es).

## Siguiente paso

P9b: película controlada por scroll en "The story" (GSAP + Lenis) dentro de `MediaSlot island="story-film"`, respetando `prefers-reduced-motion` (con movimiento reducido se queda la imagen fija). Pendiente de decidir: la foto del retrato y los enlaces de Buscapez en las tiendas.
