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

const data = parse(raw) as { profile_url: string; papers: Paper[] };

export const scholarUrl = data.profile_url;
export const papers: Paper[] = data.papers;
export const topPapers: Paper[] = [...papers].sort((a, b) => b.citations - a.citations).slice(0, 3);
