// Scroll-driven film for "The story" (P9b). Loaded on demand by Story.astro.
// The pinned stage scrubs the video forwards and backwards with the scroll; milestones follow the scenes.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

/** Video progress (0-1) at which each milestone becomes current, matched to the six scenes. */
const MILESTONE_AT = [0, 0.1, 0.25, 0.45, 0.65, 0.85];

export function initStoryFilm(section: HTMLElement) {
  gsap.registerPlugin(ScrollTrigger);

  const stage = section.querySelector<HTMLElement>('.stage')!;
  const video = section.querySelector<HTMLVideoElement>('video')!;
  const items = [...section.querySelectorAll<HTMLElement>('[data-milestone]')];
  const mobile = window.matchMedia('(max-width: 767px)').matches;

  // Smooth wheel scrolling on desktop; touch scrolling stays native (Lenis default).
  const lenis = new Lenis({ anchors: { offset: -88 } });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  section.classList.add('is-film');

  // Download the video only when the section gets close.
  let loaded = false;
  const load = () => {
    if (loaded) return;
    loaded = true;
    const base = mobile ? video.dataset.srcMobile! : video.dataset.srcDesktop!;
    for (const [ext, type] of [
      ['webm', 'video/webm; codecs="vp9"'],
      ['mp4', 'video/mp4; codecs="avc1.640028"'],
    ]) {
      const source = document.createElement('source');
      source.src = `${base}.${ext}`;
      source.type = type;
      video.append(source);
    }
    video.preload = 'auto';
    video.load();
    video.addEventListener('loadeddata', () => {
      video.classList.add('is-ready');
      seek();
    }, { once: true });
  };
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        observer.disconnect();
        load();
      }
    },
    { rootMargin: '50% 0px' },
  );
  observer.observe(section);

  let progress = 0;
  let queued = false;
  const seek = () => {
    queued = false;
    if (!video.duration || Number.isNaN(video.duration)) return;
    const time = progress * (video.duration - 0.05);
    if (Math.abs(video.currentTime - time) > 0.01) video.currentTime = time;
  };
  const setMilestones = () => {
    let current = 0;
    MILESTONE_AT.forEach((at, i) => {
      if (progress >= at) current = i;
    });
    items.forEach((item, i) => {
      item.dataset.state = i < current ? 'past' : i === current ? 'current' : 'future';
    });
  };
  setMilestones();

  ScrollTrigger.create({
    trigger: stage,
    start: 'top top',
    // Shorter pin on phones so the page never feels stuck.
    end: () => `+=${window.innerHeight * (mobile ? 2.2 : 3.5)}`,
    pin: true,
    anticipatePin: 1,
    invalidateOnRefresh: true,
    onUpdate(self) {
      progress = self.progress;
      setMilestones();
      if (!queued) {
        queued = true;
        requestAnimationFrame(seek);
      }
    },
  });

  // Fonts and images can shift layout after init; recompute pin positions once settled.
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}
