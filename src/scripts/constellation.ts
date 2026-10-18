// 3D paper constellation (P9c). Loaded only near Research and only when Research.astro decides it
// is worth it; otherwise the static SVG with the same layout stays. Plain three.js, no React.
//   drag (mouse or finger) rotates, hover shows title/year/citations, click opens the paper,
//   the paper of the current Research step lights up and the camera eases towards it.
// The canvas is aria-hidden: the paper list and the links stay in the DOM.
import {
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Raycaster,
  Scene,
  SphereGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { Cluster, Star } from '../lib/constellation';

const HOME = new Vector3(0, 5.2, 6.6);

export function initConstellation(figure: HTMLElement) {
  const mount = figure.querySelector<HTMLElement>('[data-constellation]')!;
  const tip = figure.querySelector<HTMLElement>('[data-constellation-tip]')!;
  const svg = figure.querySelector<SVGElement>('svg.static')!;
  const section = figure.closest<HTMLElement>('[data-scene]');
  const stars = JSON.parse(mount.dataset.stars!) as Star[];
  const topics = JSON.parse(mount.dataset.topics!) as {
    labels: Record<string, string>;
    colors: Record<string, string>;
    clusters: Cluster[];
  };
  const citationsLabel = mount.dataset.citationsLabel ?? 'citations';

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch {
    return; // keep the static SVG
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  mount.append(renderer.domElement);
  mount.hidden = false;
  svg.style.display = 'none';
  figure.querySelector<HTMLElement>('.caption-3d')!.hidden = false;

  const scene = new Scene();
  const camera = new PerspectiveCamera(44, 1, 0.1, 100);
  camera.position.copy(HOME);
  const lookAt = new Vector3(0, 0, 0);
  camera.lookAt(lookAt);

  // Render-loop state (declared first: focusStep() below already wakes the loop).
  let visible = true;
  let running = false;
  let idleFrames = 0;

  const world = new Group();
  scene.add(world);

  // Stars
  const sphere = new SphereGeometry(1, 24, 16);
  const meshes = stars.map((s) => {
    const mesh = new Mesh(sphere, new MeshBasicMaterial({ color: topics.colors[s.topic], transparent: true, opacity: 0.85 }));
    mesh.position.set(s.x, s.y, s.z);
    mesh.scale.setScalar(s.r);
    mesh.userData.star = s;
    world.add(mesh);
    return mesh;
  });

  // Faint lines from each topic center to its papers
  const positions: number[] = [];
  for (const s of stars) {
    const c = topics.clusters.find((k) => k.topic === s.topic)!;
    positions.push(c.x, c.y, c.z, s.x, s.y, s.z);
  }
  const lineGeometry = new BufferGeometry();
  lineGeometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  world.add(new LineSegments(lineGeometry, new LineBasicMaterial({ color: 0x3a404a, transparent: true, opacity: 0.8 })));

  // Topic labels (HTML, projected each frame)
  const labels = topics.clusters.map((c) => {
    const el = document.createElement('span');
    el.className = 'label';
    el.textContent = topics.labels[c.topic];
    mount.append(el);
    return { el, pos: new Vector3(c.x, c.y, c.z) };
  });

  // ---------- current step ----------
  let current = -1;
  const cameraFrom = new Vector3();
  const cameraTo = new Vector3();
  const lookFrom = new Vector3();
  const lookTo = new Vector3();
  let tweenStart = 0;
  const TWEEN_MS = 1100;

  function focusStep(step: number) {
    current = step;
    const target = meshes.find((m) => (m.userData.star as Star).step === step);
    meshes.forEach((m) => {
      const s = m.userData.star as Star;
      const on = s.step === step;
      (m.material as MeshBasicMaterial).color.set(on ? '#ffffff' : topics.colors[s.topic]);
      (m.material as MeshBasicMaterial).opacity = on ? 1 : 0.7;
      m.scale.setScalar(on ? s.r * 1.25 : s.r);
    });
    cameraFrom.copy(camera.position);
    lookFrom.copy(lookAt);
    if (target) {
      const p = target.getWorldPosition(new Vector3());
      // Turn gently towards the paper and come a little closer; the whole constellation stays in view.
      lookTo.copy(p).multiplyScalar(0.25);
      cameraTo.copy(HOME).add(new Vector3(p.x * 0.2, p.y * 0.2, p.z * 0.2)).multiplyScalar(0.88);
    } else {
      cameraTo.copy(HOME);
      lookTo.set(0, 0, 0);
    }
    tweenStart = performance.now();
    wake();
  }
  section?.addEventListener('scenestep', (event) => focusStep((event as CustomEvent<{ step: number }>).detail.step));
  focusStep(Number(section?.dataset.step ?? 0));

  // ---------- interaction ----------
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  let dragging = false;
  let moved = 0;
  let lastX = 0;
  let lastY = 0;
  let hovered: Mesh | null = null;
  let lastInteraction = 0;
  let userYaw = 0;

  function pick(clientX: number, clientY: number) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    return (raycaster.intersectObjects(meshes, false)[0]?.object as Mesh | undefined) ?? null;
  }

  function showTip(mesh: Mesh | null) {
    hovered = mesh;
    renderer.domElement.style.cursor = mesh ? 'pointer' : dragging ? 'grabbing' : 'grab';
    if (!mesh) {
      tip.hidden = true;
      return;
    }
    const s = mesh.userData.star as Star;
    tip.textContent = `${s.title} · ${s.year} · ${s.citations} ${citationsLabel}`;
    tip.hidden = false;
    placeTip();
  }

  function placeTip() {
    if (!hovered || tip.hidden) return;
    const p = hovered.getWorldPosition(new Vector3()).project(camera);
    const w = mount.clientWidth;
    const h = mount.clientHeight;
    const x = Math.min(Math.max(((p.x + 1) / 2) * w + 12, 8), w - tip.offsetWidth - 8);
    const y = Math.min(Math.max(((1 - p.y) / 2) * h + 12, 8), h - tip.offsetHeight - 8);
    tip.style.transform = `translate(${x}px, ${y}px)`;
  }

  const canvas = renderer.domElement;
  canvas.addEventListener('pointerdown', (event) => {
    dragging = true;
    moved = 0;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
    wake();
  });
  canvas.addEventListener('pointermove', (event) => {
    lastInteraction = performance.now();
    if (dragging) {
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      moved += Math.abs(dx) + Math.abs(dy);
      lastX = event.clientX;
      lastY = event.clientY;
      userYaw += dx * 0.006;
      world.rotation.x = Math.max(-0.6, Math.min(0.6, world.rotation.x + dy * 0.004));
      placeTip();
    } else if (event.pointerType === 'mouse') {
      showTip(pick(event.clientX, event.clientY));
    }
    wake();
  });
  canvas.addEventListener('pointerup', (event) => {
    dragging = false;
    canvas.releasePointerCapture(event.pointerId);
    if (moved < 6) {
      const hit = pick(event.clientX, event.clientY);
      if (hit) {
        // Touch: first tap shows the details, a second tap on the same paper opens it.
        if (event.pointerType !== 'mouse' && hovered !== hit) showTip(hit);
        else window.open((hit.userData.star as Star).url, '_blank', 'noopener');
      } else showTip(null);
    }
  });
  canvas.addEventListener('pointerleave', () => {
    if (!dragging) showTip(null);
  });

  // Keyboard focus on a paper in the list shows its details in the constellation.
  figure
    .closest('section')
    ?.querySelectorAll<HTMLAnchorElement>('[data-paper-id]')
    .forEach((link) => {
      link.addEventListener('focus', () => showTip(meshes.find((m) => (m.userData.star as Star).id === link.dataset.paperId) ?? null));
      link.addEventListener('blur', () => showTip(null));
    });

  // ---------- render loop (only while visible and something moves) ----------

  function resize() {
    const w = mount.clientWidth;
    const h = mount.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    wake();
  }
  new ResizeObserver(resize).observe(mount);
  new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    if (visible) wake();
  }).observe(mount);

  function wake() {
    idleFrames = 0;
    if (!running && visible) {
      running = true;
      requestAnimationFrame(frame);
    }
  }

  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

  function frame(now: number) {
    const t = Math.min(1, (now - tweenStart) / TWEEN_MS);
    if (t < 1) {
      camera.position.lerpVectors(cameraFrom, cameraTo, ease(t));
      lookAt.lerpVectors(lookFrom, lookTo, ease(t));
    }
    // A very slow sway (not a full spin), so the constellation reads as 3D and stays in the frame.
    world.rotation.y = userYaw + 0.22 * Math.sin(now / 7000);
    camera.lookAt(lookAt);
    renderer.render(scene, camera);

    const w = mount.clientWidth;
    const h = mount.clientHeight;
    // On a small frame (phones) the topic labels would pile up: dots only.
    const showLabels = w >= 480;
    for (const l of labels) {
      const p = l.pos.clone().applyMatrix4(world.matrixWorld).project(camera);
      // Label just above the topic center, in screen space so it never lands on another topic.
      l.el.style.transform = `translate(${((p.x + 1) / 2) * w}px, ${((1 - p.y) / 2) * h - 44}px) translate(-50%, -50%)`;
      l.el.style.opacity = showLabels && p.z < 1 ? '1' : '0';
    }
    placeTip();

    idleFrames = t < 1 || dragging ? 0 : idleFrames + 1;
    if (visible && !document.hidden) requestAnimationFrame(frame);
    else running = false;
  }
  resize();
  (window as unknown as { __constellation: unknown }).__constellation = { step: () => current };
}
