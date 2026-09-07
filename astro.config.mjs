import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import tailwindcss from '@tailwindcss/vite';
import remarkDirective from 'remark-directive';
import directives from './src/lib/markdown/directives.ts';
import markdownImages from './src/lib/markdown/images.ts';
import { imageBreakpoints } from './src/lib/images.ts';
import sitemap from '@astrojs/sitemap';
import { readFileSync } from 'node:fs';
import { site } from './src/config/site.ts';

export default defineConfig({
  site: site.origin,
  base: site.base,
  trailingSlash: 'always',
  output: 'static',
  integrations: [sitemap({
    // Sitemap runs after HTML is written: use the same robots decision as the page.
    filter: page => {
      const pathname = new URL(page).pathname.slice(site.base.length);
      if (pathname === '/404.html' || pathname === '/search/') return false;
      const file = new URL(`./dist${pathname}${pathname.endsWith('/') ? 'index.html' : ''}`, import.meta.url);
      return !readFileSync(file, 'utf8').includes('content="noindex,follow"');
    },
  })],
  vite: { plugins: [tailwindcss()] },
  markdown: { processor: unified({ remarkPlugins: [remarkDirective, directives], rehypePlugins: [markdownImages] }), shikiConfig: { theme: 'github-light' } },
  image: {
    layout: 'constrained', breakpoints: imageBreakpoints,
    service: { entrypoint: 'astro/assets/services/sharp', config: { webp: { quality: 80, effort: 6 } } },
  },
});
