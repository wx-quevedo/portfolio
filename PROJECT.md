# Portafolio washingtonquevedo.com

## Contexto

Portafolio personal de Washington X. Quevedo (Ingeniero de IA y XR) para conseguir trabajo remoto internacional. Dominio: washingtonquevedo.com (deploy con `deploy/deploy.ps1`, P9d). El seguimiento del plan vive en el repo privado `enhanced-me`; aquí no hay `plan.json`.

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
- **JS mínimo**: el botón del menú móvil, el chat flotante y la navegación por escenas (`src/scripts/scenes.ts`, GSAP ScrollTrigger + Lenis, unos 47 KB comprimidos, cargado como módulo). La demo del detector y la constelación 3D se cargan aparte y solo cuando hacen falta. No hay ningún framework de islas (React) instalado: three.js y onnxruntime-web se usan directamente.
- **Espacios para islas**: `src/components/MediaSlot.astro` reserva el marco con su proporción y un contenido estático de respaldo. Puntos de montaje:
  - `detector-demo` (4:3) en `Detector.astro`: la demo del detector (P9c).
  - `paper-constellation` (8:5) en `Research.astro`: la constelación (SVG estático o 3D, P9c).
- **Ask Washington (desde P9b, chat flotante único; desde P9d sin aviso propio en el panel, porque el chat ya muestra el suyo)**: `src/components/AskChat.astro`. Botón "Ask me" / "Pregúntame" fijo abajo a la derecha (48 px, `aria-expanded`, `aria-controls`); panel `role="dialog"` anclado abajo a la derecha en escritorio y casi pantalla completa en móvil. Desde P9b·2 Ask Washington es una interfaz de chat: el iframe tiene alto fijo (`min(640px, 80vh, 100dvh - 160px)` en escritorio; el resto del panel en móvil) y el alto que informe por `postMessage` nunca se aplica. El iframe `https://ask.inmersoft.com/?embed=1&lang=<idioma>` se crea solo al abrir el panel por primera vez. Al abrir, el foco va al botón de cerrar; Escape cierra y el foco vuelve al botón que lo abrió. El aviso de fuentes públicas lo muestra el propio chat (el panel ya no lo repite). Mientras el widget no responde se muestra "Connecting to Ask Washington" con un pulso; el primer mensaje `ask-washington:*` (solo desde ese origen y ese iframe; hoy `height`) se toma como señal de listo. Si en 8 s no llega, aparece un aviso ("The chat could not load." / "No se pudo cargar el chat.") con enlace para abrirlo en otra pestaña; desde P9c es solo para errores reales. La sección "Ask me anything" ya no incrusta iframe: su botón abre el mismo panel (`[data-ask-open]`). Cambio de idioma: al pulsar EN/ES con el panel abierto se envía `{type: "ask-washington:lang", lang}` al iframe; como el cambio navega a la otra página, el estado abierto se guarda en `sessionStorage` y el panel se reabre allí con el nuevo idioma. También se envía si cambia `<html lang>` sin recargar. Desde P9c Ask Washington permite `http://localhost:4321` y `washingtonquevedo.com` (`frame-ancestors`) y el chat carga y responde dentro del panel en local (verificado en EN y ES).
- **Película de "The story" (P9b, retirada en P9b·2; queda solo como registro)**: Washington la revisó y la descartó, porque el video generado hacía parecer que sus proyectos fueron hechos con IA. Se borraron los MP4/WebM, el póster y la isla de video; `scripts/comfy/` y `reports/comfy/` se conservan como registro y nada de eso se carga en el sitio. Detalle de lo que se hizo:
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
  - Integración (ya retirada): `Story.astro` era estática por defecto (póster + lista de hitos). Tras el evento `load` y en un momento ocioso, si no hay `prefers-reduced-motion` ni Save-Data, carga `src/scripts/story-film.ts` (GSAP 3.15 ScrollTrigger + Lenis 1.3; unos 47 KB comprimidos). Ese script fija el escenario (pin de 3.5 pantallas en escritorio, 2.2 en móvil) y lleva el video hacia adelante y atrás con el scroll. Los hitos aparecen al llegar su escena (umbrales 0, 0.1, 0.25, 0.45, 0.65, 0.85). El video solo se descarga cuando la sección está a media pantalla (WebM primero, MP4 de respaldo; 720 en anchos menores de 768). En móvil Lenis no toca el scroll táctil, el pin es más corto y se ve un hito a la vez. En pantallas bajas se oculta la nota para que todo quepa sin quedar bajo el botón "Ask me". Lenis maneja los enlaces internos con 88 px de margen por el header; el menú y el panel del chat llevan `data-lenis-prevent`.
- **Historia con fotos reales (P9b·2)**: seis fotos originales de Behance en orden cronológico, una por hito: simulador Unity3D–MatLab, teleoperación en realidad aumentada (`robot-teleoperation-3`, la de mejor resolución de ese proyecto), ensamblaje automotriz, dron, edificio histórico y VR Runner (`vr-runner-4`, una foto real con persona, que aquí está bien porque no hay IA). Cada foto lleva un pie con el nombre del proyecto, para que nunca se presente como si fuera el hito mismo (por ejemplo, el de Bagó). Al avanzar un paso, la foto se funde con la siguiente (0.8 s) y la actual hace un zoom muy lento de 1.00 a 1.06 en 9 s; el zoom vuelve a 1 después del fundido. Datos en `src/data/story.ts`.
  - **Tratamiento de las fotos (baja resolución)**: no se estiran a pantalla completa. Cada foto va en un marco con su propia proporción, nunca más ancho que 1.25 veces sus píxeles originales ni más alto que el escenario (`--w`, `--ratio` y unidades `cqh`). Las pequeñas (460 px) quedan en unos 575 px de ancho. Comparación en `reports/screenshots/p9b2/photo-treatment-comparison.png`: a la izquierda, la misma foto a 1440 px (borrosa, con bloques JPEG); a la derecha, el marco (nítido). Capturas completas a sangre en `photo-treatment-fullbleed-*.png`.
  - Recortes en el archivo: barra superior del editor de Unity (22 px) en `unity-matlab-simulator-1.png` y marco azul (14 px) en `robot-teleoperation-3.jpg`.
- **Navegación por escenas (P9b·2)**: `src/scripts/scenes.ts`.
  - Cada `[data-scene]` (inicio con cifras, Story, Work, Try the detector, XR, Research, Ask me, Contact) ocupa una pantalla. El script calcula las paradas: el inicio de cada escena y cada paso de las escenas con pasos.
  - **Story (6 pasos), Work (5: Buscapez y un proyecto por paso) y Research (3 papers)** quedan fijadas con ScrollTrigger (`pin`, una pantalla de recorrido por paso). Muestran un `[data-step-item]` a la vez y un contador "2 / 6". Work tiene además un índice de proyectos con botones (`[data-go-step]`). En Research se ilumina en la constelación el punto del paper actual.
  - **Por qué un controlador propio y no solo `snap`**: el requisito es que un gesto normal nunca salte una escena. El script intercepta rueda, toque y teclado, y cada gesto mueve exactamente una parada con `lenis.scrollTo` (1.05 s, 0.75 s en celular, ease in-out). Un gesto termina tras 220 ms sin eventos, así que la inercia del trackpad no cuenta como gesto nuevo. Hace falta un mínimo de 24 px de rueda o 40 px de deslizamiento. Lenis da la suavidad y ScrollTrigger el pin. La opción `virtualScroll` de Lenis no sirve aquí porque no bloquea el scroll nativo.
  - **Escenas más altas que la pantalla** (XR en laptops, el inicio en celular): tienen un rango libre donde el scroll es normal; el gesto siguiente después de su final pasa a la próxima escena. Si una escena con pasos no cabe, el script la deja como lista (`.steps-off`) y se recorre libre. Así nada queda cortado. Hoy solo pasa con Research a 375x667.
  - Enlaces del menú, "Watch my story" y botones de paso llevan a la parada correcta y mueven el foco a la escena. Tab hacia un elemento de otro paso o escena lleva a ese paso. Hay atajos de teclado: flechas, Av Pág / Re Pág, espacio, Inicio y Fin. El panel del chat y el menú llevan `data-lenis-prevent`. Si algo deja el scroll entre paradas (barra de scroll, buscar en la página), se asienta en la más cercana.
  - **prefers-reduced-motion**: un script en línea en el `<head>` pone `html.scenes` antes del primer pintado solo si no hay movimiento reducido. Así no hay saltos de diseño y, con movimiento reducido o sin JS, todo es una lista normal sin pin ni snap. Los pasos ocultos usan solo opacidad, así que siguen en el DOM y los lectores de pantalla los leen.
- **Retrato (P9b·2)**: `src/assets/washington-quevedo.jpg`, recortado a 4:5 centrado (1638x2048) desde el original cuadrado de 2048 px. Se sirve con `astro:assets` (AVIF/WebP, 240 a 840 px, `loading="eager"` y `fetchpriority="high"` porque está en la primera pantalla) y se muestra en blanco y negro con CSS. En escritorio va a la derecha del nombre; en celular, pequeño (132 px) sobre el nombre. Alt en EN y ES.
- **Demo "Try the detector" (P9c)**:
  - **Modelo**: `public/models/tuna4_n_v1/tuna4_n_v1_o2m.onnx` y `labels.json`, copiados sin cambios de `buscapez-ml/models/tuna4_n_v1/` (sha256 `ea33a556378d98cd...`, idéntico al original). Es el export one2many de YOLO26n (Ultralytics 8.4.106): salida cruda `(1, 8, 8400)` sin NMS. Clases: 0 Albacore, 1 Bigeye Tuna, 2 Bonito, 3 Yellowfin Tuna.
  - **Preprocesado** (idéntico al del entrenamiento y al de `buscapez-ml/inference_service/detector.py`): letterbox a 640x640 conservando la proporción, relleno gris 114, RGB, /255, sin mean/std, NCHW. Se hace con un `OffscreenCanvas` dentro del worker.
  - **Postprocesado en JS**: mejor clase por anchor, umbral de confianza 0.5, NMS por clase con IoU 0.5 (los mismos valores por defecto que el servicio de producción), y cajas devueltas a la imagen original (restar padding, dividir por escala, recortar).
  - **Validación contra Python**: script en el scratchpad que importa `TunaDetector` de buscapez-ml en solo lectura y lo corre desde su `.venv` con onnxruntime. 10 de 10 cajas coinciden en clase con IoU entre 0.978 y 0.994, en los 5 ejemplos WebP y en 3 fotos originales de 1824x4000. Las confianzas difieren a lo sumo 0.045, porque el reescalado del canvas no es idéntico al de PIL. Tabla en `reports/p9c-detector-validation.md`.
  - **Runtime**: onnxruntime-web 1.30 dentro de un Web Worker (`src/scripts/detector.worker.ts`). Si el navegador expone un adaptador WebGPU se usa el build WebGPU (binario asyncify, 26.8 MB sin comprimir, unos 6.6 MB con gzip). Si no, el build WASM (14.2 MB, unos 3.7 MB con gzip). Los descarga el propio worker con progreso visible y se pasan a ort con `env.wasm.wasmBinary`. WASM corre con un hilo salvo que la página tenga aislamiento cross-origin. Hay una corrida de calentamiento (WebGPU compila sus shaders ahí) para que la primera foto se mida bien.
  - **Carga diferida**: antes de "Try it" no se pide nada pesado: ni el modelo, ni el runtime, ni las fotos (0 peticiones medidas en escritorio y en celular). El inline de `Detector.astro` importa `detector-demo.ts` recién en el clic.
  - **Ejemplos**: 5 fotos del split test del dataset (Albacore, Bigeye, dos Bonitos, Yellowfin horizontal y vertical), reducidas a 1280 px y convertidas a WebP sin metadatos (`public/detector/examples/`). Se eligieron entre las que el modelo resuelve bien y sin personas.
  - **Licencia de las fotos**: el dataset es "Tuna Fish Detection" de Washington X. Quevedo en Roboflow Universe (`universe.roboflow.com/washington-x-quevedo/tuna-fish-detection-0gaol`), CC BY 4.0, según el `README.dataset.txt` del export. La atribución (título con enlace, autor, Roboflow Universe, licencia con enlace) va bajo la demo, junto con la licencia del modelo (Ultralytics YOLO26n, AGPL-3.0).
  - **Interfaz**: estado inicial con "Try it" y el peso de la descarga. Al cargar, barra de progreso (`role="progressbar"`) y después "Starting the detector". Hay botones de ejemplo, "Choose a photo" (input de archivo) y se puede soltar una imagen sobre el marco; la orientación EXIF se respeta. Las cajas se dibujan en un canvas con especie y confianza, y debajo va el texto con las detecciones y el tiempo de inferencia en ese dispositivo (`aria-live`). El texto de privacidad está siempre visible. La estructura tiene alto fijo en todos los estados, para que la escena no cambie de tamaño.
- **Cifra 0.96 (P9c)**: en el inicio y en la ficha de Buscapez lleva la etiqueta "mAP50, detection (validation)" / "mAP50, detección (validación)". Es la precisión de detección medida en el split de validación; no es una tasa de acierto de especie. La ficha agrega una línea honesta: la detección es muy precisa y la clasificación de especie sigue mejorando a medida que el equipo valida más fotos reales. No se publican porcentajes internos de prueba.
- **Constelación de papers (P9c)**:
  - **Datos**: los 25 papers de `src/data/papers.yaml` (copia de `ask-washington/data/papers.yaml`, hoy idéntica). Tamaño del punto según la raíz cuadrada de las citas.
  - **Temas**: se derivan del título con reglas en orden (gana la primera que coincide), en `src/data/papers.ts`:
    - salud y rehabilitación: rehabilitation, phobia, respiratory, motor skills, haptic;
    - robótica y simulación: robot, tele-operation, unmanned, simulator;
    - educación: teaching, reading, signs;
    - capacitación industrial: training, industrial, automotive, bodywork, oil, P&ID, pneumatic;
    - marketing y turismo: marketing, tourism, sales;
    - 3D en la web: WebGL, WebVR.

    Los venues no sirven para separar temas, porque casi todos son AVR o ISVC. Resultado: 6 en salud, 4 en robótica, 3 en educación, 6 en industria, 4 en marketing y 2 en web.
  - **Disposición**: compartida (`src/lib/constellation.ts`, determinista). Los temas van en un anillo y cada paper cerca del centro de su tema. La versión estática es el mismo dibujo visto desde arriba, en SVG, con un enlace por paper (25 enlaces, con foco visible).
  - **3D** (`src/scripts/constellation.ts`, three 0.186 sin R3F; unos 130 KB comprimidos):
    - se arrastra con mouse o dedo para girar;
    - hover muestra título, año y citas; clic abre el paper (en celular, un toque muestra y el segundo abre);
    - el foco del teclado en un paper de la lista muestra su ficha;
    - el paper del paso actual se ilumina y la cámara se acerca suavemente; el scroll de escenas avisa con el evento `scenestep`;
    - un vaivén lento mantiene la sensación de 3D sin sacar los temas del cuadro; en marcos chicos (celular) se ocultan las etiquetas de tema;
    - el canvas lleva `aria-hidden` y el dedo sobre él no cambia de escena (`data-touch-own`).
  - **Cuándo se carga**: solo al acercarse a Research (IntersectionObserver más una comprobación en scroll y en `scenestep`, porque un salto directo desde el menú cae dentro del pin sin aviso del observer). Se queda la versión estática con prefers-reduced-motion, Save-Data, celulares de gama baja (`deviceMemory` de 4 GB o menos, o táctil con 4 núcleos o menos) o sin WebGL2. El soporte de WebGL se prueba recién en ese momento: probarlo al cargar la página arranca el proceso de GPU y costaba unos 850 ms de hilo principal en Lighthouse.
- **Navegación por escenas, ajuste (P9c)**: tras reconstruir los pins se llama a `lenis.resize()`. Sin eso, un salto justo después de cargar las fuentes quedaba recortado al alto viejo de la página (Lenis actualiza su límite de forma asíncrona).
- **Deploy (P9d)**: VPS con nginx y certbot, sin Docker. `deploy/deploy.ps1` (PowerShell 5.1, `-DryRun`, `-ForceNginx`, `-AllowDirty`, `-SkipSmokeTest`) hace en orden:
  1. build local (`npm ci`, `npm run build`);
  2. `scripts/precompress.mjs`, que escribe `.gz` y `.br` (los runtimes WASM de 14 y 27 MB y el modelo de 9.8 MB se comprimen una vez y no en cada petición del VPS de 2 núcleos);
  3. `scripts/csp-hashes.mjs`, que calcula los sha256 de los scripts en línea para la CSP sin `'unsafe-inline'`;
  4. empaqueta, sube con scp y corre `deploy/remote-deploy.sh` por `ssh -t`, con un solo sudo;
  5. prueba de humo por internet.
  - Servidor:
    - versiones en `/var/www/washingtonquevedo.com/releases/<fecha>-<commit>/` con el symlink `current` cambiado de forma atómica; se guardan las 5 más nuevas;
    - antes de tocar nada verifica que ningún otro sitio de nginx sirva el dominio o `www`;
    - el sitio (`deploy/nginx/washingtonquevedo.com.conf`) se instala la primera vez y después lo maneja certbot (con `-ForceNginx` se reemplaza);
    - los encabezados, la CSP y la compresión van en `/etc/nginx/snippets/washingtonquevedo.com.conf`, que se reescribe en cada deploy porque los hashes cambian con el build;
    - brotli solo si el módulo ya existe; si `nginx -t` falla con brotli se reintenta con gzip;
    - si `nginx -t` falla, se restaura todo y no se recarga nginx;
    - certbot para el apex y `www` con `--redirect`; el email es opcional (`CERTBOT_EMAIL`) y se usa la cuenta existente del servidor.
  - `deploy/rollback.ps1`: vuelve `current` a la versión anterior (o a `-Release <id>`; `-List` muestra las versiones).
  - **Caché** (un `map` en el sitio):
    - `/_astro/` y `/models/`: un año `immutable`; el modelo ya va en una carpeta versionada, `tuna4_n_v1`;
    - fuentes y fotos de ejemplo: 30 días;
    - HTML y lo demás: `max-age=0, must-revalidate`.
  - **CSP**: `default-src 'self'`; `script-src 'self' 'wasm-unsafe-eval'` más los hashes; `style-src 'self' 'unsafe-inline'` (Astro pone estilos y atributos `style` en línea); `img-src 'self' data: blob:`; `worker-src 'self' blob:`; `frame-src https://ask.inmersoft.com`; `object-src 'none'`; `base-uri 'self'`; `form-action 'self'`; `frame-ancestors 'none'`; `upgrade-insecure-requests`. WebGPU no necesita nada en la CSP.
  - Ningún `location` usa `add_header`, así todas las respuestas heredan los encabezados del snippet.
  - **Verificación local**: `scripts/serve-dist.mjs` sirve `dist/` con el mismo `map`, los mismos `add_header` (leídos de `deploy/nginx/`) y los `.br`/`.gz`. `scripts/csp-check.mjs` abre `/` y `/es/`, corre la demo, muestra la constelación y abre el chat.
- **Repo público (P9d)**:
  - la IP y el usuario del VPS solo están en `deploy/.deploy.local` (ignorado por git);
  - no hay IP de la red local ni rutas personales en los archivos;
  - el sitio no muestra el correo personal;
  - el `LICENSE` aclara que el modelo es AGPL-3.0 (Ultralytics) y las fotos de ejemplo CC BY 4.0.
- **Título**: "AI & XR Engineer" / "Ingeniero de IA y XR" en hero, `<title>`, descripción, OpenGraph, JSON-LD, imagen OG y README; la sección XR pasa a "XR Engineering, since 2016" / "Ingeniería XR, desde 2016".
- **Imágenes de Behance**: descargadas con `scripts/fetch-behance.mjs`, que prueba `source`, `max_3840`, `fs`, `1400`, `max_1200`... sin `_webp`. Las 24 bajaron desde `source` (JPG/PNG). Se optimizan con `astro:assets` (AVIF + WebP + JPG de respaldo, anchos responsivos que nunca superan el original, lazy).
- **Buscapez sin imágenes** (trabajo para Stanford): placeholder sobrio con cuadrícula y un recuadro de detección. La app no está publicada: se quitó la mención a App Store y Google Play y se muestra "In development" / "En desarrollo" como una píldora discreta, del estilo de los chips.
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

### 2026-10-18 · P9b·2 historia con fotos y navegación por escenas

- Se retiró la película generada (videos, póster, isla y GSAP en modo video). En su lugar, una historia con las fotos reales de Behance, con fundido y zoom lento.
- Navegación por escenas en todo el sitio, con pasos internos en Story, Work y Research.
- Chat con alto fijo, retrato real, Buscapez "In development".
- Verificación (`scripts/p9b2-screenshots.mjs`, detalle en `reports/p9b2-checks.json`):
  - `npm run build` y `astro check` sin errores.
  - Paradas: 20 en escritorio y laptop, 21 en tablet y celular. Nada cortado en ninguna parada en 1440x900, 1280x800, 768x1024, 390x844 y 375x667, ni en EN ni en ES. Sin scroll horizontal en ninguna parada.
  - Trackpad simulado con inercia (60 eventos por gesto): recorre las 20 paradas una a una, sin saltos. Una rueda girada rápido (5 muescas) avanza una sola parada. Av Pág y flecha abajo avanzan una. Los 6 enlaces del menú llegan a su escena. Tab a un enlace del proyecto 4 lleva al paso 4 de Work. En celular cada deslizamiento avanza una parada.
  - Chat: iframe de 640 px de alto en escritorio y 706 px en celular (panel casi a pantalla completa).
  - Movimiento reducido: sin `html.scenes`, sin pins y sin pasos ocultos.
  - Lighthouse móvil: `/` 97 / 100 / 100 / 100 y `/es/` 96 / 100 / 100 / 100. Sin scroll horizontal (vista de lista) a 390, 768, 1280 y 1440.
  - Capturas en `reports/screenshots/p9b2/`: cada escena y paso (EN escritorio, EN y ES celular), chat abierto, movimiento reducido y comparación del tratamiento de las fotos.

### 2026-10-18 · P9c demo del detector y constelación de papers

- Demo del detector con el modelo real de Buscapez en el navegador, constelación 3D con versión estática, chat verificado en local, cifra 0.96 con etiqueta honesta.
- Verificación (`scripts/p9c-checks.mjs`, resultados en `reports/p9c-checks.json`):
  - `npm run build` y `astro check` sin errores.
  - JS contra Python: 10/10 cajas con la misma clase e IoU de 0.95 o más (tabla en `reports/p9c-detector-validation.md`).
  - Tiempo de inferencia (mediana de 10 corridas sobre los ejemplos, solo `session.run`):

    | Perfil | Motor | Mediana | Rango |
    |---|---|---|---|
    | Chromium de Playwright en escritorio | WASM (no expone WebGPU) | 224 ms | 212-236 ms |
    | Chrome estable en escritorio | WebGPU | 27 ms | 21-38 ms |
    | Perfil de celular emulado (390x844, táctil, DPR 2) | WASM | 229 ms | 218-236 ms |

    Con la foto completa de 1824x4000 el tiempo total visible en la página sube a unos 300-650 ms, porque incluye decodificar y escalar la imagen. El perfil de celular corre en la CPU de esta máquina: Chromium no permite limitar la CPU de un Web Worker por CDP ("Operation is only supported for pages, not workers"). Falta una medición en un celular real.
  - Antes de "Try it": 0 peticiones del modelo, del runtime o de las fotos.
  - Constelación: no se carga arriba de la página; sigue los pasos 1, 2 y 3 de Research en escritorio y en celular. Hover muestra la ficha, clic abre el paper (abrió la página de Springer) y el foco del teclado en la lista muestra la ficha. La versión estática (movimiento reducido) tiene los 25 enlaces.
  - Chat: carga y responde dentro del panel en EN (escritorio, iframe de 640 px) y ES (celular, 706 px), sin aviso de error.
  - Navegación por escenas igual que antes: paradas una a una con trackpad (sin saltos), teclado, enlaces del menú, foco, movimiento reducido. Nada cortado en 1440x900, 1280x800, 768x1024, 390x844 y 375x667. A 375x667, Work y Research pasan a lista porque la ficha de Buscapez creció.
  - Sin scroll horizontal a 390, 768, 1280 y 1440.
  - Lighthouse móvil, sin abrir la demo:

    | Página | Performance | Accessibility | Best Practices | SEO |
    |---|---|---|---|---|
    | `/` | 96-97 | 100 | 100 | 100 |
    | `/es/` | 100 | 100 | 100 | 100 |
  - Capturas en `reports/screenshots/p9c/`: demo antes, cargando y con resultado (2 ejemplos y una foto propia) en escritorio y celular; constelación en los 3 pasos (escritorio y celular) y estática; chat respondiendo en EN y ES.

### 2026-10-18 · P9d publicar washingtonquevedo.com

- Panel del chat sin el aviso duplicado.
- Scripts de deploy (`deploy/deploy.ps1`, `remote-deploy.sh`, `rollback.ps1`, `nginx/`) y `deploy/.deploy.local` creado con solo `DEPLOY_HOST`, copiado del de Ask Washington, sin imprimirlo y en `.gitignore`.
- Verificación local con los encabezados de producción (`scripts/serve-dist.mjs` y `scripts/csp-check.mjs`), con 0 violaciones de CSP y 0 errores de consola:
  - Chromium con WASM en `/`: la demo detecta, se ve la constelación 3D y el chat carga;
  - Chrome con WebGPU en `/es/`: lo mismo.
- Compresión local: el `.wasm` de 14.2 MB viaja en 2.7 MB con brotli, el modelo de 9.8 MB en 8.8 MB, y `dist` completo pasa de 51.9 a 16.5 MB comprimible.
- `deploy.ps1 -DryRun`: build, precompresión, 3 hashes CSP y paquete de 59 MB; no envía nada ni muestra el host.
- Revisión del repo público: sin IP del VPS ni de la red local, sin rutas personales, el sitio no muestra el correo personal; LICENSE con el alcance de MIT, AGPL-3.0 del modelo y CC BY 4.0 de las fotos.
- Pendiente de decisión antes de publicar:
  - el PDF del CV (`public/cv/`, en el historial desde P9) incluye un número de teléfono;
  - los commits llevan como autor el correo personal, que será visible en el repo público.

## Siguiente paso

Ejecutar el deploy (`deploy\deploy.ps1`), revisar el sitio en vivo y crear el repo público `wx-quevedo/portfolio`. Por decidir antes:
- CV sin teléfono;
- correo del autor de los commits;
- si se publica el modelo (AGPL-3.0, trabajo para Stanford);
- corregir las fuentes de Ask Washington sobre la publicación de Buscapez en las tiendas.
