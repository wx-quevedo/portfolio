import { parse } from 'yaml';
import raw from './papers.yaml?raw';

export interface Paper {
  id: string;
  title: string;
  year: number;
  citations: number;
  venue: string;
  doi: string;
  url: string;
}

export type Topic = 'health' | 'robotics' | 'education' | 'industry' | 'marketing' | 'web';

/**
 * Topic of a paper, derived from its title (first rule that matches wins; order matters).
 * The venues are mostly the same AVR/ISVC conferences, so they do not separate topics.
 */
const TOPIC_RULES: [Topic, RegExp][] = [
  ['health', /rehabilitation|phobia|respiratory|motor skills|haptic/i],
  ['robotics', /robot|tele-?operation|unmanned|simulator/i],
  ['education', /teaching|reading|signs/i],
  ['industry', /training|industrial|automotive|bodywork|oil|P&ID|pneumatic/i],
  ['marketing', /marketing|tourism|sales/i],
  ['web', /webgl|webvr/i],
];
export const TOPICS: Topic[] = TOPIC_RULES.map(([t]) => t);
export const topicOf = (p: Paper): Topic => TOPIC_RULES.find(([, re]) => re.test(p.title))?.[0] ?? 'web';

const data = parse(raw) as { profile_url: string; papers: Paper[] };

export const scholarUrl = data.profile_url;
export const papers: Paper[] = data.papers;
export const topPapers: Paper[] = [...papers].sort((a, b) => b.citations - a.citations).slice(0, 3);
