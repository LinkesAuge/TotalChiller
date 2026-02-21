import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["lib/**/*.test.{ts,tsx}", "app/**/*.test.{ts,tsx}"],
    environment: "node",
    environmentMatchGlobs: [["**/*.test.tsx", "jsdom"]],
    setupFiles: ["./test/vitest.setup.ts"],
    coverage: {
      provider: "v8",
      include: ["app/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
      exclude: [
        "**/*.test.{ts,tsx}",
        "**/*.spec.{ts,tsx}",
        "**/node_modules/**",
        "**/*.d.ts",
        "**/*-types.ts",
        "**/types/**",
        "**/error.tsx",
        "**/loading.tsx",
        "**/global-error.tsx",
        "**/not-found.tsx",
        "app/robots.ts",
        "app/sitemap.ts",
      ],
      all: true,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
