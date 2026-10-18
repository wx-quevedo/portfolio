// "Try the detector" UI (P9c). Loaded only after the visitor presses "Try it".
// Inference runs in detector.worker.ts; this file handles progress, examples, the visitor's own
// photo (file picker or drag and drop, never uploaded) and draws the boxes on a canvas.
import type { Detection, WorkerMessage } from './detector.worker';

const COLORS = ['#2142E7', '#B4530A', '#0E7A5B', '#A3226B']; // one per class, readable on photos with a dark chip

export function startDetector(root: HTMLElement) {
  const strings = JSON.parse(root.dataset.strings!) as Record<string, string>;
  const species = JSON.parse(root.dataset.species!) as string[];
  const stage = root.querySelector<HTMLElement>('.stage')!;
  const canvas = root.querySelector<HTMLCanvasElement>('canvas')!;
  const status = root.querySelector<HTMLElement>('[data-status]')!;
  const bar = root.querySelector<HTMLElement>('[data-bar]')!;
  const progress = root.querySelector<HTMLElement>('[role="progressbar"]')!;
  const loadingLabel = root.querySelector<HTMLElement>('[data-loading-label]')!;
  const loadingDetail = root.querySelector<HTMLElement>('[data-loading-detail]')!;
  const exampleButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-example]')];
  const fileInput = root.querySelector<HTMLInputElement>('[data-file]')!;
  const chooseLabel = root.querySelector<HTMLElement>('[data-choose]')!;
  const canvasLabel = canvas.getAttribute('aria-label') ?? '';

  let backend = 'WASM';
  let ready = false;
  let requestId = 0;
  let shown: { bitmap: ImageBitmap; detections: Detection[] } | null = null;

  root.dataset.state = 'loading';
  root.querySelector<HTMLElement>('.loading')?.focus?.();
  const worker = new Worker(new URL('./detector.worker.ts', import.meta.url), { type: 'module' });

  const mb = (bytes: number) => (bytes / 1_000_000).toFixed(1);

  worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
    const msg = event.data;
    if (msg.type === 'progress') {
      const pct = msg.total > 0 ? Math.min(100, (msg.loaded / msg.total) * 100) : 0;
      bar.style.width = `${pct}%`;
      progress.setAttribute('aria-valuenow', String(Math.round(pct)));
      loadingDetail.textContent = msg.total > 0 ? `${mb(msg.loaded)} / ${mb(msg.total)} MB` : `${mb(msg.loaded)} MB`;
      if (pct >= 100) loadingLabel.textContent = strings.starting;
    } else if (msg.type === 'ready') {
      ready = true;
      backend = msg.backend === 'webgpu' ? 'WebGPU' : 'WASM';
      root.dataset.state = 'ready';
      root.dataset.backend = msg.backend;
      exampleButtons.forEach((b) => (b.disabled = false));
      fileInput.disabled = false;
      chooseLabel.removeAttribute('aria-disabled');
      runExample(exampleButtons[0]);
    } else if (msg.type === 'result') {
      if (msg.id !== requestId || !shown) return;
      shown.detections = msg.detections;
      draw();
      const found = msg.detections.map((d) => `${species[d.classId]} ${Math.round(d.score * 100)}%`).join(', ');
      const timing = `${strings.inference}: ${Math.round(msg.inferenceMs)} ms ${strings.onDevice} (${backend})`;
      status.textContent = `${found ? `${strings.found}: ${found}` : strings.none} · ${timing}`;
      canvas.setAttribute('aria-label', `${canvasLabel}. ${found || strings.none}`);
      // Read by scripts/p9c-checks.mjs to compare with the Python reference.
      root.dataset.lastInferenceMs = String(msg.inferenceMs);
      root.dataset.lastDetections = JSON.stringify(msg.detections);
      root.dataset.lastRequest = String(msg.id);
    } else if (msg.type === 'error') {
      if (!ready) root.dataset.state = 'error';
      status.textContent = ready ? strings.badImage : strings.error;
    }
  };
  worker.postMessage({ type: 'init', modelUrl: new URL(root.dataset.model!, location.href).href });

  async function analyse(bitmap: ImageBitmap) {
    shown?.bitmap.close();
    shown = { bitmap, detections: [] };
    draw();
    requestId += 1;
    const copy = await createImageBitmap(bitmap);
    worker.postMessage({ type: 'detect', id: requestId, bitmap: copy }, [copy]);
  }

  async function runExample(button: HTMLButtonElement) {
    exampleButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
    const blob = await (await fetch(button.dataset.example!)).blob();
    analyse(await createImageBitmap(blob));
  }

  async function runFile(file: File | undefined) {
    if (!file || !ready) return;
    exampleButtons.forEach((b) => b.setAttribute('aria-pressed', 'false'));
    try {
      analyse(await createImageBitmap(file, { imageOrientation: 'from-image' }));
    } catch {
      status.textContent = strings.badImage;
    }
  }

  exampleButtons.forEach((b) => b.addEventListener('click', () => ready && runExample(b)));
  fileInput.addEventListener('change', () => {
    runFile(fileInput.files?.[0]);
    fileInput.value = '';
  });
  stage.addEventListener('dragover', (event) => {
    if (!ready) return;
    event.preventDefault();
    root.classList.add('is-dragging');
  });
  stage.addEventListener('dragleave', () => root.classList.remove('is-dragging'));
  stage.addEventListener('drop', (event) => {
    event.preventDefault();
    root.classList.remove('is-dragging');
    runFile(event.dataTransfer?.files?.[0]);
  });

  function draw() {
    const rect = stage.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!shown) return;
    const { bitmap, detections } = shown;
    const scale = Math.min(canvas.width / bitmap.width, canvas.height / bitmap.height);
    const w = bitmap.width * scale;
    const h = bitmap.height * scale;
    const ox = (canvas.width - w) / 2;
    const oy = (canvas.height - h) / 2;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, ox, oy, w, h);

    const font = Math.round(12 * dpr);
    ctx.font = `500 ${font}px "IBM Plex Mono", ui-monospace, monospace`;
    ctx.textBaseline = 'top';
    for (const d of detections) {
      const [x1, y1, x2, y2] = d.box;
      const bx = ox + x1 * scale;
      const by = oy + y1 * scale;
      const bw = (x2 - x1) * scale;
      const bh = (y2 - y1) * scale;
      const color = COLORS[d.classId % COLORS.length];
      ctx.lineWidth = 2 * dpr;
      ctx.strokeStyle = color;
      ctx.strokeRect(bx, by, bw, bh);
      const text = `${species[d.classId]} ${Math.round(d.score * 100)}%`;
      const pad = 5 * dpr;
      const tw = ctx.measureText(text).width + pad * 2;
      const th = font + pad * 2;
      const ty = by - th >= 0 ? by - th : by;
      ctx.fillStyle = color;
      ctx.fillRect(bx - ctx.lineWidth / 2, ty, tw, th);
      ctx.fillStyle = '#fff';
      ctx.fillText(text, bx - ctx.lineWidth / 2 + pad, ty + pad);
    }
  }
  new ResizeObserver(() => draw()).observe(stage);
}
