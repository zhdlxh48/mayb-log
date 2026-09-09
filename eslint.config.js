import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default [
  {
    ignores: [
      "dist/**",
      ".astro/**",
      ".wrangler/**",
      ".vendor-download/**",
      ".fixtures/**",
      "public/vendor/**",
      "playwright-report/**",
      "test-results/**",
      "coverage/**",
    ],
  },
  js.configs.recommended,
  {
    files: ["src/**/*.js", "scripts/**/*.{js,mjs}", "tests/**/*.js", "*.js"],
    languageOptions: { ecmaVersion: "latest", sourceType: "module", globals: { ...globals.node } },
  },
  {
    files: ["src/**/*.js"],
    languageOptions: { globals: { ...globals.node, ...globals.worker } },
  },
  {
    files: ["public/**/*.js", "tests/browser/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        marked: "readonly",
        imageCompression: "readonly",
      },
    },
  },
  { rules: { "no-unused-vars": ["error", { argsIgnorePattern: "^_" }] } },
  prettier,
];
