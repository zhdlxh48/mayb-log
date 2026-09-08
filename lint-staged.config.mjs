export default {
  '*.{js,mjs,ts,astro}': ['prettier --write', 'eslint --fix'],
  '*.{css,json,md,mdx,yaml,yml}': 'prettier --write',
};
