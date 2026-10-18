import type { ImageMetadata } from 'astro';

/** Responsive widths for an image, never larger than the original (Behance originals are small). */
export function widthsFor(img: ImageMetadata, wanted: number[]): number[] {
  const list = wanted.filter((w) => w < img.width);
  list.push(img.width);
  return [...new Set(list)];
}
