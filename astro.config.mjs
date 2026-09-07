import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import tailwindcss from '@tailwindcss/vite';
import remarkDirective from 'remark-directive';
import directives from './src/lib/markdown/directives.ts';

export default defineConfig({
  site: 'https://zhdlxh48.github.io',
  base: '/mayb-log',
  trailingSlash: 'always',
  output: 'static',
  vite: { plugins: [tailwindcss()] },
  markdown: { processor: unified({ remarkPlugins: [remarkDirective, directives] }), shikiConfig: { theme: 'github-light' } },
});
