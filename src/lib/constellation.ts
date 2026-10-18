// Shared layout for the paper constellation: the static SVG (Research.astro) and the 3D view
// (src/scripts/constellation.ts) use the same positions, so both show the same picture.
import { papers, topPapers, topicOf, TOPICS, type Topic } from '../data/papers';

export interface Star {
  id: string;
  title: string;
  year: number;
  citations: number;
  url: string;
  topic: Topic;
  /** 3D position; the SVG uses x and y. */
  x: number;
  y: number;
  z: number;
  /** Radius, from the square root of the citations. */
  r: number;
  /** Research step that features this paper (0-2), or -1. */
  step: number;
}

export interface Cluster {
  topic: Topic;
  x: number;
  y: number;
  z: number;
}

// Deterministic pseudo-random numbers from a string, so the layout never changes between builds.
const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 2166136261);
const rand = (s: string) => (hash(s) % 10000) / 10000;

export function buildConstellation(): { stars: Star[]; clusters: Cluster[] } {
  const clusters: Cluster[] = TOPICS.map((topic, i) => {
    const angle = (i / TOPICS.length) * Math.PI * 2 - Math.PI / 2;
    return { topic, x: Math.cos(angle) * 3.1, y: (i % 2 ? 0.45 : -0.45), z: Math.sin(angle) * 1.6 };
  });
  const steps = new Map(topPapers.map((p, i) => [p.id, i]));
  const stars = papers.map((p) => {
    const c = clusters.find((k) => k.topic === topicOf(p))!;
    // Spread the papers of a topic on a small sphere around its center.
    const u = rand(p.id + 'u') * Math.PI * 2;
    const v = Math.acos(2 * rand(p.id + 'v') - 1);
    const d = 0.45 + rand(p.id + 'd') * 0.75;
    return {
      id: p.id,
      title: p.title,
      year: p.year,
      citations: p.citations,
      url: p.url,
      topic: c.topic,
      x: c.x + d * Math.sin(v) * Math.cos(u),
      y: c.y + d * Math.cos(v) * 0.8,
      z: c.z + d * Math.sin(v) * Math.sin(u),
      r: 0.05 + Math.sqrt(p.citations) * 0.018,
      step: steps.get(p.id) ?? -1,
    };
  });
  return { stars, clusters };
}

/** One muted color per topic, readable on the dark scene. */
export const TOPIC_COLORS: Record<Topic, string> = {
  health: '#8FD3B6',
  robotics: '#9FB0FF',
  education: '#F2C879',
  industry: '#EDEDE8',
  marketing: '#F0A3B5',
  web: '#9ADBEA',
};
