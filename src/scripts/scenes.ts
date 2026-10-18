// Scene navigation for the whole page (P9b·2).
//
// Every [data-scene] is one screen. A wheel gesture, a swipe or a key press moves exactly one stop:
// to the next scene, or to the next internal step of a pinned scene ([data-steps]: Story, Work,
// Research). Lenis performs the smooth scroll and ScrollTrigger pins the stepped scenes; this module
// decides where each gesture goes, so a normal trackpad or wheel gesture can never skip a scene.
//
// A scene taller than the screen (for example XR on a short laptop, or the hero on a phone) gets a
// "free" range: inside it the page scrolls normally, and the next gesture after its end moves on.
// A stepped scene whose content does not fit is switched to list mode (.steps-off) and scrolls freely.
// Loaded only when html.scenes is set (no prefers-reduced-motion), see Base.astro and Home.astro.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

interface Stop {
  y: number;
  scene: HTMLElement;
  step: number;
}
interface Range {
  from: number;
  to: number;
}

const QUIET_MS = 220; // a pause this long ends a wheel gesture (and its inertia)
const WHEEL_THRESHOLD = 24; // px of wheel delta before a gesture counts
const SWIPE_THRESHOLD = 40; // px of finger travel before a swipe counts
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export function initScenes() {
  gsap.registerPlugin(ScrollTrigger);
  const root = document.documentElement;
  const scenes = [...document.querySelectorAll<HTMLElement>('[data-scene]')];
  const phone = () => window.matchMedia('(max-width: 767px)').matches;

  const lenis = new Lenis({ smoothWheel: true, syncTouch: false });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // ---------- steps inside a pinned scene ----------
  const pins = new Map<HTMLElement, ScrollTrigger>();
  const stepCount = (scene: HTMLElement) => Number(scene.dataset.steps ?? 0);

  function setStep(scene: HTMLElement, step: number) {
    if (scene.dataset.step === String(step)) return;
    scene.dataset.step = String(step);
    scene.querySelectorAll<HTMLElement>('[data-step-item]').forEach((item) => {
      const i = Number(item.dataset.step);
      item.dataset.state = i === step ? 'active' : i < step ? 'past' : 'future';
    });
    scene.querySelectorAll('[data-step-now]').forEach((el) => (el.textContent = String(step + 1)));
    scene.querySelectorAll<HTMLElement>('[data-go-step]').forEach((b) => {
      if (Number(b.dataset.goStep) === step) b.setAttribute('aria-current', 'step');
      else b.removeAttribute('aria-current');
    });
    scene.querySelectorAll<SVGElement>('[data-dot-step]').forEach((dot) => {
      dot.classList.toggle('is-current', Number(dot.dataset.dotStep) === step);
    });
  }

  /** True when every step of the scene fits inside one screen. */
  function fits(scene: HTMLElement) {
    if (scene.scrollHeight > scene.clientHeight + 2) return false;
    return [...scene.querySelectorAll<HTMLElement>('[data-step-item]')].every(
      (item) => item.scrollHeight <= item.clientHeight + 2 || getComputedStyle(item).position !== 'absolute',
    );
  }

  function buildPins() {
    pins.forEach((st) => st.kill());
    pins.clear();
    for (const scene of scenes) {
      const n = stepCount(scene);
      if (n < 2) continue;
      scene.classList.remove('steps-off');
      if (!fits(scene)) {
        scene.classList.add('steps-off');
        continue;
      }
      pins.set(
        scene,
        ScrollTrigger.create({
          trigger: scene,
          start: 'top top',
          end: () => `+=${(n - 1) * window.innerHeight}`,
          pin: true,
          onUpdate: (self) => setStep(scene, Math.round(self.progress * (n - 1))),
        }),
      );
    }
    ScrollTrigger.refresh();
  }

  // ---------- stops and free ranges ----------
  let stops: Stop[] = [];
  let ranges: Range[] = [];

  function computeStops() {
    const vh = window.innerHeight;
    const max = ScrollTrigger.maxScroll(window);
    stops = [];
    ranges = [];
    for (const scene of scenes) {
      const st = pins.get(scene);
      if (st) {
        for (let i = 0; i < stepCount(scene); i++) stops.push({ y: Math.min(st.start + i * vh, max), scene, step: i });
        continue;
      }
      const top = Math.min(Math.round(scene.getBoundingClientRect().top + window.scrollY), max);
      stops.push({ y: top, scene, step: 0 });
      const end = Math.min(top + scene.offsetHeight - vh, max);
      if (end > top + 4) {
        stops.push({ y: end, scene, step: -1 });
        ranges.push({ from: top, to: end });
      }
    }
    stops.sort((a, b) => a.y - b.y);
  }

  const current = () => (animating ? lenis.targetScroll : window.scrollY);
  const freeRange = (dir: number, y: number) =>
    ranges.find((r) => (dir > 0 ? y >= r.from - 2 && y < r.to - 2 : y > r.from + 2 && y <= r.to + 2));
  const clamp = (v: number, r: Range) => Math.max(r.from, Math.min(r.to, v));
  const nearest = (y: number) => stops.reduce((a, b) => (Math.abs(b.y - y) < Math.abs(a.y - y) ? b : a), stops[0]);

  // ---------- movement ----------
  let animating = false;

  function goTo(y: number, immediate = false) {
    animating = !immediate;
    lenis.scrollTo(y, {
      immediate,
      force: true,
      lock: true,
      duration: phone() ? 0.75 : 1.05,
      easing: easeInOutCubic,
      onComplete: () => {
        animating = false;
      },
    });
    if (immediate) ScrollTrigger.update();
  }

  function stepBy(dir: number) {
    const y = current();
    const next = dir > 0 ? stops.find((s) => s.y > y + 2) : [...stops].reverse().find((s) => s.y < y - 2);
    if (next) goTo(next.y);
  }

  const stopFor = (scene: HTMLElement, step = 0) =>
    stops.find((s) => s.scene === scene && s.step === step) ?? stops.find((s) => s.scene === scene);

  // ---------- wheel ----------
  let lastWheel = 0;
  let wheelSum = 0;
  let gestureUsed = false;

  window.addEventListener(
    'wheel',
    (event) => {
      if (event.ctrlKey) return; // pinch zoom
      if ((event.target as Element).closest?.('[data-lenis-prevent]')) return;
      event.preventDefault();
      event.stopImmediatePropagation(); // Lenis' own wheel handling stays out of the way

      const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaMode === 2 ? event.deltaY * 400 : event.deltaY;
      const now = performance.now();
      if (now - lastWheel > QUIET_MS) {
        wheelSum = 0;
        gestureUsed = false;
      }
      lastWheel = now;
      if (delta === 0) return;
      wheelSum += delta;

      if (animating) {
        gestureUsed = true; // the rest of this gesture (and its inertia) is ignored
        return;
      }
      const dir = Math.sign(delta);
      const range = freeRange(dir, lenis.targetScroll);
      if (range) {
        gestureUsed = true; // reaching the end of a tall scene never jumps on in the same gesture
        lenis.scrollTo(clamp(lenis.targetScroll + delta, range), { lerp: 0.12 });
        return;
      }
      if (gestureUsed || Math.abs(wheelSum) < WHEEL_THRESHOLD) return;
      gestureUsed = true;
      stepBy(Math.sign(wheelSum));
    },
    { passive: false, capture: true },
  );

  // ---------- touch ----------
  let touchStartY = 0;
  let touchDy = 0;
  let touchMode: 'free' | 'step' | null = null;
  let touchFree: Range | null = null;

  window.addEventListener(
    'touchstart',
    (event) => {
      touchStartY = event.touches[0].clientY;
      touchDy = 0;
      touchMode = null;
    },
    { passive: true },
  );
  window.addEventListener(
    'touchmove',
    (event) => {
      if ((event.target as Element).closest?.('[data-lenis-prevent]') || event.touches.length > 1) return;
      touchDy = touchStartY - event.touches[0].clientY;
      if (touchMode === null && Math.abs(touchDy) > 6) {
        touchFree = animating ? null : (freeRange(Math.sign(touchDy), window.scrollY) ?? null);
        touchMode = touchFree ? 'free' : 'step';
      }
      if (touchMode === 'step' && event.cancelable) event.preventDefault();
    },
    { passive: false },
  );
  window.addEventListener('touchend', () => {
    if (touchMode === 'step' && !animating && Math.abs(touchDy) > SWIPE_THRESHOLD) stepBy(Math.sign(touchDy));
    touchMode = touchMode === 'free' ? 'free' : null;
  });

  // Native momentum inside a free range must not carry past it into the next scenes.
  let settleTimer = 0;
  window.addEventListener(
    'scroll',
    () => {
      if (animating) return;
      if (touchMode === 'free' && touchFree) {
        const y = window.scrollY;
        if (y > touchFree.to + 24 || y < touchFree.from - 24) {
          const dir = y > touchFree.to ? 1 : -1;
          touchMode = null;
          const next = dir > 0 ? stops.find((s) => s.y > touchFree!.to + 2) : [...stops].reverse().find((s) => s.y < touchFree!.from - 2);
          goTo(next ? next.y : nearest(y).y);
          return;
        }
      }
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(settle, 180);
    },
    { passive: true },
  );

  /** After any scroll that ends between stops (scrollbar drag, find in page), rest on a stop. */
  function settle() {
    if (animating || stops.length === 0) return;
    const y = window.scrollY;
    if (ranges.some((r) => y >= r.from - 2 && y <= r.to + 2)) return;
    const stop = nearest(y);
    if (Math.abs(stop.y - y) > 2) goTo(stop.y);
  }

  // ---------- keyboard ----------
  window.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target as HTMLElement;
    if (target.closest('input, textarea, select, [contenteditable], iframe, [data-lenis-prevent]')) return;
    if (root.classList.contains('menu-open')) return;
    let dir = 0;
    if (event.key === 'ArrowDown' || event.key === 'PageDown') dir = 1;
    else if (event.key === 'ArrowUp' || event.key === 'PageUp') dir = -1;
    else if (event.key === ' ' && !target.closest('a, button, summary, [role="button"]')) dir = event.shiftKey ? -1 : 1;
    else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      goTo(event.key === 'Home' ? stops[0].y : stops[stops.length - 1].y);
      return;
    } else return;
    event.preventDefault();
    if (animating) return;
    const range = freeRange(dir, window.scrollY);
    if (range) lenis.scrollTo(clamp(window.scrollY + dir * window.innerHeight * 0.6, range), { duration: 0.6 });
    else stepBy(dir);
  });

  // ---------- links, step buttons and focus ----------
  document.addEventListener('click', (event) => {
    const goStep = (event.target as Element).closest<HTMLElement>('[data-go-step]');
    if (goStep) {
      const scene = goStep.closest<HTMLElement>('[data-scene]');
      const stop = scene && stopFor(scene, Number(goStep.dataset.goStep));
      if (stop) goTo(stop.y);
      return;
    }
    const link = (event.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
    if (!link || link.hash.length < 2) return;
    const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
    const scene = target?.closest<HTMLElement>('[data-scene]');
    if (!target || !scene) return;
    event.preventDefault();
    const stop = stopFor(scene);
    if (stop) goTo(stop.y);
    history.pushState(null, '', link.hash);
    // Move keyboard focus to the scene without a native scroll jump.
    (target.matches('[data-scene], main') ? target : scene).focus({ preventScroll: true });
  });

  // Tabbing into an element of another scene or step brings that scene (and step) on screen.
  document.addEventListener('focusin', (event) => {
    const el = event.target as HTMLElement;
    const scene = el.closest<HTMLElement>('[data-scene]');
    if (!scene || el === scene || animating) return;
    const item = el.closest<HTMLElement>('[data-step-item]');
    if (pins.has(scene)) {
      const stop = stopFor(scene, item ? Number(item.dataset.step) : 0);
      if (stop && Math.abs(window.scrollY - stop.y) > 2) goTo(stop.y);
      return;
    }
    const rect = el.getBoundingClientRect();
    const header = 88;
    if (rect.top < header || rect.bottom > window.innerHeight) {
      const stop = stopFor(scene);
      const range = ranges.find((r) => stop && r.from === stop.y);
      let y = window.scrollY + rect.top - header - 16;
      y = range ? clamp(y, range) : (stop?.y ?? y);
      goTo(y);
    }
  });

  // ---------- setup, resize ----------
  function layout(keepPlace: boolean) {
    const place = keepPlace && stops.length ? nearest(window.scrollY) : null;
    buildPins();
    computeStops();
    if (place) {
      const again = stopFor(place.scene, Math.max(place.step, 0));
      if (again) goTo(again.y, true);
    }
  }

  layout(false);
  const hashTarget = location.hash.length > 1 ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
  const hashScene = hashTarget?.closest<HTMLElement>('[data-scene]');
  if (hashScene) goTo(stopFor(hashScene)?.y ?? 0, true);
  else if (window.scrollY > 0) goTo(nearest(window.scrollY).y, true);

  let resizeTimer = 0;
  let lastWidth = window.innerWidth;
  let lastHeight = window.innerHeight;
  window.addEventListener('resize', () => {
    // Ignore the small height changes of mobile browser bars.
    if (window.innerWidth === lastWidth && Math.abs(window.innerHeight - lastHeight) < 120) return;
    lastWidth = window.innerWidth;
    lastHeight = window.innerHeight;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => layout(true), 200);
  });
  document.fonts?.ready.then(() => layout(true));
  window.addEventListener('load', () => layout(true));

  // Exposed for the screenshot and test scripts.
  (window as unknown as { __scenes: unknown }).__scenes = {
    stops: () => stops.map((s) => ({ y: s.y, scene: s.scene.dataset.scene, step: s.step })),
    ranges: () => ranges,
    go: (scene: string, step = 0) => {
      const el = scenes.find((s) => s.dataset.scene === scene);
      const stop = el && stopFor(el, step);
      if (stop) goTo(stop.y, true);
    },
    next: () => stepBy(1),
  };
}
