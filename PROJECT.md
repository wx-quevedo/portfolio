# Portafolio washingtonquevedo.com

## Contexto

Portafolio personal de Washington X. Quevedo (Ingeniero de IA y XR) para conseguir trabajo remoto internacional. Dominio comprado: washingtonquevedo.com (aún sin deploy). El seguimiento del plan vive en `C:\xampp\htdocs\enhanced-me`; aquí no hay `plan.json`.

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
- **JS mínimo**: el botón del menú móvil, el chat flotante y la película de "The story" (que se carga aparte, solo cuando hace falta). No hay ningún framework de islas instalado todavía.
- **Espacios para islas**: `src/components/MediaSlot.astro` reserva el marco con su proporción y un contenido estático de respaldo. Puntos de montaje:
  - `story-film` (16:7) en `Story.astro`: ocupado desde P9b por la película (ver abajo).
  - `detector-demo` (4:3) en `Detector.astro`: hoy un marco con "Demo coming soon". P9c.
  - `paper-constellation` (8:5) en `Research.astro`: hoy un SVG estático generado desde `papers.yaml` (x = año, tamaño = citas). P9c lo reemplaza por la versión 3D.
  - Para P9c habrá que agregar `@astrojs/react` (React Three Fiber) y cargar ONNX Runtime Web solo dentro de la isla.
- **Ask Washington (desde P9b, chat flotante único)**: `src/components/AskChat.astro`. Botón "Ask me" / "Pregúntame" fijo abajo a la derecha (48 px, `aria-expanded`, `aria-controls`); panel `role="dialog"` de 400x600 en escritorio y casi pantalla completa en móvil. El iframe `https://ask.inmersoft.com/?embed=1&lang=<idioma>` se crea solo al abrir el panel por primera vez. Al abrir, el foco va al botón de cerrar; Escape cierra y el foco vuelve al botón que lo abrió. Debajo del iframe va el aviso de fuentes públicas en el idioma de la página. Mientras el widget no responde se muestra "Connecting to Ask Washington" con un pulso; el primer mensaje `ask-washington:height` (solo desde ese origen y ese iframe) se toma como señal de listo. Si en 8 s no llega, aparece un aviso sereno ("The chat is not available on this page yet.") con enlace para abrirlo en otra pestaña; no se trata como error. La sección "Ask me anything" ya no incrusta iframe: su botón abre el mismo panel (`[data-ask-open]`). Cambio de idioma: al pulsar EN/ES con el panel abierto se envía `{type: "ask-washington:lang", lang}` al iframe; como el cambio navega a la otra página, el estado abierto se guarda en `sessionStorage` y el panel se reabre allí con el nuevo idioma. También se envía si cambia `<html lang>` sin recargar. En local y hasta P9d el iframe no carga porque Ask Washington no permite este origen (esperado).
- **Película de "The story" (P9b)**:
  - Generada en la torre (ComfyUI 0.28, RTX 4090) con nodos nativos de Wan 2.2: `UNETLoader` (I2V 14B high y low noise fp8), LoRA lightx2v 4 pasos para cada uno, `ModelSamplingSD3` (shift 5), `CLIPLoader` umt5_xxl_fp8 (tipo wan), `VAELoader` wan_2.1_vae, `WanFirstLastFrameToVideo`, dos `KSamplerAdvanced` (pasos 0-2 y 2-4, cfg 1, euler/simple) y `SaveImage`. No se usó `clip_vision_h`: el flujo oficial de Wan 2.2 FLF2V no lo usa (el modelo 2.2 no tiene entrada de embedding de imagen). No se descargó ningún modelo.
  - Workflow en `scripts/comfy/wan22_flf2v_api.json`, generación en `scripts/comfy/generate_story.py` (URL por `COMFY_URL`), empalme y codificación en `scripts/comfy/encode_story.py`.
  - 5 tramos de 65 fotogramas (4 s a 16 fps), 1280x720, recorte centrado sin deformar. Prompt y negativo tal como se pidieron.
  - **Cambio de imágenes (por decidir)**: con las imágenes pedidas, `robot-teleoperation-1` y `vr-runner-4` muestran a una persona y Wan inventa figuras humanas, retiene a la persona y corta en seco (capturas en `reports/comfy/01` y `02`). Se usaron otras imágenes de los mismos proyectos, sin personas: `robot-teleoperation-3` (HUD de realidad aumentada con el robot) y `vr-runner-2` (el laberinto desde arriba). El orden cronológico se mantiene. Se recortan la barra de Unity del simulador (22 px) y el marco azul de `robot-teleoperation-3` (14 px).
  - **Seeds**: tramos 1, 3 y 4 con seed 7; tramo 2 con seed 99; tramo 5 con seed 2026 (`reports/comfy/final-seeds.json`). En 720p la seed 7 metía una cara en el tramo 2 y un texto inventado sobre el edificio en el tramo 5 (`reports/comfy/07`); se re-renderizaron esos dos con seeds 11, 2026 y 99 y se eligieron los más limpios (`reports/comfy/08`).
  - **Tramo 5 (edificio patrimonial a laberinto)**: con todas las seeds probadas (7, 11, 99, 2026, 424242 y con otra imagen del laberinto) Wan mantiene el edificio y corta en seco en el último segundo. En el montaje, los últimos 24 fotogramas del tramo se funden con su fotograma final (disolvencia de 1.5 s).
  - Sin LoRA (20 pasos, cfg 3.5) fue peor: tramos estáticos con corte al final (`reports/comfy/03`).
  - Limitación conocida: en el tramo 2 el HUD de la imagen de origen tiene texto pequeño y Wan lo reescribe como letras sin sentido; no hay caras ni personas.
  - Montaje: 65 + 4 x 64 = 321 fotogramas (20.06 s, sin repetir el fotograma de unión), sin audio.
  - Web: MP4 H.264 con keyframe en cada fotograma (`-g 1`) y WebM VP9 con keyframe cada 4 fotogramas. En VP9, con `-g 1` no se llega a 6 MB a 1280 (7.8 MB con crf 50). Pesos: `story-1280.mp4` 5.99 MB (crf 30), `story-1280.webm` 4.89 MB (crf 40), `story-720.mp4` 5.20 MB (crf 24), `story-720.webm` 4.23 MB (crf 32). Póster: primer fotograma en `src/assets/story/poster.jpg`, servido optimizado por `astro:assets` (AVIF/WebP).
  - Integración: `Story.astro` es estática por defecto (póster + lista de hitos). Tras el evento `load` y en un momento ocioso, si no hay `prefers-reduced-motion` ni Save-Data, carga `src/scripts/story-film.ts` (GSAP 3.15 ScrollTrigger + Lenis 1.3; unos 47 KB comprimidos). Ese script fija el escenario (pin de 3.5 pantallas en escritorio, 2.2 en móvil) y lleva el video hacia adelante y atrás con el scroll. Los hitos aparecen al llegar su escena (umbrales 0, 0.1, 0.25, 0.45, 0.65, 0.85). El video solo se descarga cuando la sección está a media pantalla (WebM primero, MP4 de respaldo; 720 en anchos menores de 768). En móvil Lenis no toca el scroll táctil, el pin es más corto y se ve un hito a la vez. En pantallas bajas se oculta la nota para que todo quepa sin quedar bajo el botón "Ask me". Lenis maneja los enlaces internos con 88 px de margen por el header; el menú y el panel del chat llevan `data-lenis-prevent`.
- **Título**: "AI & XR Engineer" / "Ingeniero de IA y XR" en hero, `<title>`, descripción, OpenGraph, JSON-LD, imagen OG y README; la sección XR pasa a "XR Engineering, since 2016" / "Ingeniería XR, desde 2016".
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

### 2026-10-18 · P9b película con scroll, chat flotante y título

- ComfyUI en la torre respondió (`/system_stats`: ComfyUI 0.28.0, RTX 4090 24 GB). Todos los modelos ya estaban instalados.
- Tiempos de render en la torre (sin contar subidas ni descargas):
  - Pruebas a 832x480: 1 421 s (prueba inicial 45 s, comparación con y sin LoRA, 3 seeds completas, 4 seeds del tramo 5). Con LoRA, cada tramo tarda unos 40 s; sin LoRA, unos 275 s.
  - 1280x720: 1 429 s (5 tramos con seed 7 a 130.6 s cada uno; tramos 2 y 5 con seeds 11, 2026 y 99, unos 129 s cada uno).
  - Total: 2 851 s (unos 47.5 min). Los tramos que quedaron en el montaje suman unos 653 s.
- Evidencia de cada prueba en `reports/comfy/` (hojas de contacto 01 a 09).
- Verificación:
  - `astro check` sin errores.
  - Sin scroll horizontal a 390, 768, 1280 y 1440 px en `/` y `/es/`.
  - Lighthouse móvil: `/` 99 / 100 / 100 / 100 y `/es/` 100 / 100 / 100 / 100 (Performance / Accessibility / Best Practices / SEO). Los hitos futuros usaban opacidad 0.18 y fallaban contraste; ahora quedan en 0 hasta su escena y los pasados en 0.75.
  - Pruebas con Playwright (`scripts/p9b-screenshots.mjs`): el video avanza y retrocede con el scroll; los hitos 1, 3, 4 y 6 quedan activos en 2 %, 33 %, 62 % y 97 %; el iframe no existe hasta abrir el panel; Escape cierra y el foco vuelve al botón; con reduced motion no se piden ni el script ni el video; en móvil se usa `story-720.webm`, que no se pide desde la parte de arriba de la página.
  - El escenario fijado cabe sin solaparse con el botón flotante a 390x844, 375x667 y 768x1024.
  - Capturas en `reports/screenshots/p9b/`.

## Siguiente paso

P9c: demo del detector en el navegador (ONNX Runtime Web) en `MediaSlot island="detector-demo"` y constelación 3D de artículos en `paper-constellation`. Por decidir:
- aprobar el cambio de imágenes de la película (sin personas), o dar otras;
- la foto del retrato;
- los enlaces de Buscapez en las tiendas;
- P9d: permitir `https://washingtonquevedo.com` (y `http://localhost:4321` para pruebas) en `EMBED_ALLOWED_ORIGINS` de Ask Washington.
