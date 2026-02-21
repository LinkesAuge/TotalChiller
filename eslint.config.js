const nextConfig = require("eslint-config-next");
const tseslint = require("typescript-eslint");

module.exports = [
  ...nextConfig,
  {
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      /* ── Keep existing overrides ── */
      "react-hooks/set-state-in-effect": "off",

      /* ── Next.js image optimization ── */
      "@next/next/no-img-element": "error",

      /* ── TypeScript strictness ── */
      /* Flag explicit `any` — gradually eliminate untyped code */
      "@typescript-eslint/no-explicit-any": "warn",
      /* Catch unused variables (ignore _ prefixed) */
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],

      /* ── Accessibility ── */
      /* Ensure click handlers on non-interactive elements have keyboard support */
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",
      /* Interactive elements must be focusable */
      "jsx-a11y/interactive-supports-focus": "warn",
      /* All images must have alt text */
      "jsx-a11y/alt-text": "error",
      /* Anchors must have content */
      "jsx-a11y/anchor-has-content": "warn",
      /* Labels must be associated with controls */
      "jsx-a11y/label-has-associated-control": "warn",
      /* Headings must have content */
      "jsx-a11y/heading-has-content": "warn",

      /* ── Console output ── */
      /* Prevent console.log from leaking into production; allow warn/error */
      "no-console": ["warn", { allow: ["warn", "error"] }],

      /* ── React best practices ── */
      /* Prevent security issues with target="_blank" */
      "react/jsx-no-target-blank": "error",
    },
  },
  {
    /* Markdown renderers use native <img> for user-submitted images from arbitrary domains. */
    files: ["lib/markdown/renderers.tsx"],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
  {
    /* Test files legitimately use `any` for mocks and loose typing for unused mock params. */
    files: ["**/*.test.{ts,tsx}", "test/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_|^Mock|^mock",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    /* Tooling scripts intentionally print progress/output to console. */
    files: ["scripts/**/*.{js,mjs,ts}", "output/playwright/**/*.{js,mjs,ts}"],
    rules: {
      "no-console": "off",
    },
  },
];
