/** @type {import('prettier').Config} */
export default {
  plugins: ['prettier-plugin-astro'],
  printWidth: 100,
  singleQuote: true,
  semi: true,
  trailingComma: 'all',
  endOfLine: 'lf',
  proseWrap: 'preserve',
  overrides: [{ files: '*.astro', options: { parser: 'astro' } }],
};
