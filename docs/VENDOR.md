# Vendored runtime libraries

The browser and Worker runtime files are copied from the official npm release tarballs. They are kept in the repository so production pages do not depend on a runtime CDN.

| Library                   | Version | Files                                               |
| ------------------------- | ------- | --------------------------------------------------- |
| htmx                      | 2.0.10  | `public/vendor/htmx.min.js`                         |
| Marked                    | 18.0.12 | `public/vendor/marked.js`                           |
| Prism                     | 1.30.0  | `public/vendor/prism.js`, `public/vendor/prism.css` |
| browser-image-compression | 2.0.2   | `public/vendor/browser-image-compression.js`        |

Prism contains the core distribution plus TypeScript, Bash, SQL, C#, Go, Markdown, and YAML components. Its core already includes markup, CSS, JavaScript, JSON, and aliases. License texts are in `docs/vendor-licenses/`.
