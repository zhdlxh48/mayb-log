export default {
  plugins: ["prettier-plugin-ejs"],
  printWidth: 100,
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  endOfLine: "lf",
  overrides: [{ files: "*.ejs", options: { parser: "html" } }],
};
