import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';
import markdownImages from './src/lib/markdown/images.ts';
import markdownLinks from './src/lib/markdown/links.ts';
import { imageBreakpoints } from './src/lib/images.ts';
import { site } from './src/config/site.ts';

export default defineConfig({
  site: site.origin,
  base: site.base,
  trailingSlash: 'always',
  output: 'static',
  integrations: [
    mdx(),
    sitemap({
      // Sitemap runs after HTML is written: use the same robots decision as the page.
      filter: (page) => {
        const pathname = new URL(page).pathname.slice(site.base.length);
        if (pathname === '/404.html' || pathname === '/search/' || pathname === '/search-data/') {
          return false;
        }
        const file = new URL(
          `./dist${pathname}${pathname.endsWith('/') ? 'index.html' : ''}`,
          import.meta.url,
        );
        return !readFileSync(file, 'utf8').includes('content="noindex,follow"');
      },
    }),
  ],
  vite: {
    cacheDir: './.astro/vite',
    plugins: [tailwindcss()],
    worker: { format: 'es' },
  },
  markdown: {
    processor: unified({ rehypePlugins: [markdownLinks, markdownImages] }),
    shikiConfig: { theme: 'github-light' },
  },
  image: {
    layout: 'constrained',
    breakpoints: imageBreakpoints,
    service: {
      entrypoint: 'astro/assets/services/sharp',
      config: { webp: { quality: 80, effort: 6 } },
    },
  },
});
