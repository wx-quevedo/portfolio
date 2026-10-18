// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://washingtonquevedo.com',
  trailingSlash: 'ignore',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    sitemap({
      i18n: { defaultLocale: 'en', locales: { en: 'en', es: 'es' } },
      filter: (page) => !page.includes('/404'),
    }),
  ],
  vite: {
    // The detector worker loads onnxruntime-web with dynamic imports, which needs ES module workers.
    worker: { format: 'es' },
  },
  build: {
    // The CSS is small; inlining it removes the only render-blocking request.
    inlineStylesheets: 'always',
  },
});
