import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://zhdlxh48.github.io',
  base: '/mayb-log',
  trailingSlash: 'always',
  output: 'static',
  vite: { plugins: [tailwindcss()] },
  markdown: { processor: unified(), shikiConfig: { theme: 'github-light' } },
});
