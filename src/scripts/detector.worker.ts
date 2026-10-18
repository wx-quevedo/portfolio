/// <reference lib="webworker" />
// Tuna detector worker (P9c). Same pipeline as buscapez-ml/inference_service/detector.py:
//   letterbox to 640x640 keeping the aspect ratio, gray 114 padding, RGB, /255, no mean/std (NCHW)
//   -> YOLO26n one2many output (1, 4 + 4 classes, 8400): cx, cy, w, h in 640 space + class scores
//   -> best class per anchor, confidence threshold, per-class NMS
//   -> boxes back to the original image (minus padding, divided by scale, clipped).
// Runs onnxruntime-web on WebGPU when an adapter is available, otherwise on WASM.
import type * as OrtTypes from 'onnxruntime-web';
import wasmPlainUrl from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url';
import wasmAsyncifyUrl from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.wasm?url';

type Ort = typeof OrtTypes;
type Backend = 'webgpu' | 'wasm';

export interface Detection {
  classId: number;
  score: number;
  box: [number, number, number, number]; // x1, y1, x2, y2 in original image pixels
}

export type WorkerRequest =
  | { type: 'init'; modelUrl: string }
  | { type: 'detect'; id: number; bitmap: ImageBitmap; conf?: number; iou?: number };

export type WorkerMessage =
  | { type: 'progress'; loaded: number; total: number }
  | { type: 'ready'; backend: Backend; warmupMs: number }
  | { type: 'result'; id: number; detections: Detection[]; inferenceMs: number; totalMs: number; width: number; height: number }
  | { type: 'error'; message: string };

const SIZE = 640;
const PAD = 114;
const scope = self as unknown as DedicatedWorkerGlobalScope;
const post = (message: WorkerMessage) => scope.postMessage(message);

let ort: Ort;
let session: OrtTypes.InferenceSession;
let inputName = 'images';
let outputName = 'output0';

/** fetch() with a combined progress report across several downloads. */
async function download(urls: string[]): Promise<ArrayBuffer[]> {
  const loaded = urls.map(() => 0);
  const totals = urls.map(() => 0);
  const report = () =>
    post({ type: 'progress', loaded: loaded.reduce((a, b) => a + b, 0), total: totals.reduce((a, b) => a + b, 0) });
  return Promise.all(
    urls.map(async (url, i) => {
      const res = await fetch(url);
      if (!res.ok || !res.body) throw new Error(`Download failed: ${url} (${res.status})`);
      totals[i] = Number(res.headers.get('content-length') ?? 0);
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded[i] += value.length;
        report();
      }
      const out = new Uint8Array(loaded[i]);
      let offset = 0;
      for (const c of chunks) {
        out.set(c, offset);
        offset += c.length;
      }
      return out.buffer;
    }),
  );
}

async function init(modelUrl: string) {
  let backend: Backend = 'wasm';
  try {
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
    if (gpu && (await gpu.requestAdapter())) backend = 'webgpu';
  } catch {
    backend = 'wasm';
  }

  // The WebGPU build of onnxruntime-web also carries the WASM backend (asyncify binary).
  ort = backend === 'webgpu' ? await import('onnxruntime-web/webgpu') : await import('onnxruntime-web/wasm');
  const [wasmBinary, model] = await download([backend === 'webgpu' ? wasmAsyncifyUrl : wasmPlainUrl, modelUrl]);
  ort.env.wasm.wasmBinary = wasmBinary;
  // Threads need cross-origin isolation (SharedArrayBuffer); a static host usually does not have it.
  ort.env.wasm.numThreads = scope.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 2) : 1;

  const providers = backend === 'webgpu' ? ['webgpu', 'wasm'] : ['wasm'];
  try {
    session = await ort.InferenceSession.create(model, { executionProviders: providers, graphOptimizationLevel: 'all' });
  } catch (error) {
    if (backend !== 'webgpu') throw error;
    backend = 'wasm';
    session = await ort.InferenceSession.create(model, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
  }
  inputName = session.inputNames[0];
  outputName = session.outputNames[0];

  // Warm-up run (WebGPU compiles its shaders here), so the first real photo is timed fairly.
  const t0 = performance.now();
  await session.run({ [inputName]: new ort.Tensor('float32', new Float32Array(3 * SIZE * SIZE), [1, 3, SIZE, SIZE]) });
  post({ type: 'ready', backend, warmupMs: performance.now() - t0 });
}

function letterbox(bitmap: ImageBitmap) {
  const { width: w, height: h } = bitmap;
  const scale = Math.min(SIZE / w, SIZE / h);
  const nw = Math.round(w * scale);
  const nh = Math.round(h * scale);
  const padX = Math.floor((SIZE - nw) / 2);
  const padY = Math.floor((SIZE - nh) / 2);

  const canvas = new OffscreenCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = `rgb(${PAD}, ${PAD}, ${PAD})`;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, padX, padY, nw, nh);

  const rgba = ctx.getImageData(0, 0, SIZE, SIZE).data;
  const area = SIZE * SIZE;
  const tensor = new Float32Array(3 * area);
  for (let i = 0; i < area; i++) {
    tensor[i] = rgba[i * 4] / 255;
    tensor[area + i] = rgba[i * 4 + 1] / 255;
    tensor[2 * area + i] = rgba[i * 4 + 2] / 255;
  }
  return { tensor, scale, padX, padY };
}

const iouOf = (a: number[], b: number[]) => {
  const ix = Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0]));
  const iy = Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
  const inter = ix * iy;
  const union = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter;
  return inter / Math.max(union, 1e-9);
};

/** Decode the one2many output and run NMS within each class (same rules as detector.py). */
function decode(data: Float32Array, dims: readonly number[], conf: number, iou: number) {
  const channels = dims[1];
  const anchors = dims[2];
  const classes = channels - 4;
  const candidates: { box: number[]; score: number; classId: number }[] = [];
  for (let a = 0; a < anchors; a++) {
    let best = -1;
    let score = -Infinity;
    for (let c = 0; c < classes; c++) {
      const s = data[(4 + c) * anchors + a];
      if (s > score) {
        score = s;
        best = c;
      }
    }
    if (score < conf) continue;
    const cx = data[a];
    const cy = data[anchors + a];
    const w = data[2 * anchors + a];
    const h = data[3 * anchors + a];
    candidates.push({ box: [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2], score, classId: best });
  }
  const kept: typeof candidates = [];
  for (let c = 0; c < classes; c++) {
    let order = candidates.filter((d) => d.classId === c).sort((x, y) => y.score - x.score);
    while (order.length) {
      const top = order[0];
      kept.push(top);
      order = order.slice(1).filter((d) => iouOf(top.box, d.box) <= iou);
    }
  }
  return kept;
}

async function detect(request: Extract<WorkerRequest, { type: 'detect' }>) {
  const t0 = performance.now();
  const { bitmap } = request;
  const { tensor, scale, padX, padY } = letterbox(bitmap);
  const t1 = performance.now();
  const output = await session.run({ [inputName]: new ort.Tensor('float32', tensor, [1, 3, SIZE, SIZE]) });
  const inferenceMs = performance.now() - t1;
  const result = output[outputName];
  const kept = decode(result.data as Float32Array, result.dims, request.conf ?? 0.5, request.iou ?? 0.5);
  const { width, height } = bitmap;
  const detections: Detection[] = kept
    .map((d) => {
      const [x1, y1, x2, y2] = d.box;
      const box: [number, number, number, number] = [
        Math.min(Math.max((x1 - padX) / scale, 0), width),
        Math.min(Math.max((y1 - padY) / scale, 0), height),
        Math.min(Math.max((x2 - padX) / scale, 0), width),
        Math.min(Math.max((y2 - padY) / scale, 0), height),
      ];
      return { classId: d.classId, score: d.score, box };
    })
    .sort((a, b) => b.score - a.score);
  bitmap.close();
  post({ type: 'result', id: request.id, detections, inferenceMs, totalMs: performance.now() - t0, width, height });
}

scope.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  try {
    if (event.data.type === 'init') await init(event.data.modelUrl);
    else if (event.data.type === 'detect') await detect(event.data);
  } catch (error) {
    post({ type: 'error', message: error instanceof Error ? error.message : String(error) });
  }
};
