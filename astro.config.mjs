import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import tailwindcss from '@tailwindcss/vite';
import remarkDirective from 'remark-directive';
import directives from './src/lib/markdown/directives.ts';
import markdownImages from './src/lib/markdown/images.ts';
import { imageBreakpoints } from './src/lib/images.ts';

export default defineConfig({
  site: 'https://zhdlxh48.github.io',
  base: '/mayb-log',
  trailingSlash: 'always',
  output: 'static',
  vite: { plugins: [tailwindcss()] },
  markdown: { processor: unified({ remarkPlugins: [remarkDirective, directives], rehypePlugins: [markdownImages] }), shikiConfig: { theme: 'github-light' } },
  image: {
    layout: 'constrained', breakpoints: imageBreakpoints,
    service: { entrypoint: 'astro/assets/services/sharp', config: { webp: { quality: 80, effort: 6 } } },
  },
});
