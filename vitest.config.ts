import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    /*
     * happy-dom rather than node. The suite renders components and exercises
     * hooks that read `matchMedia`, `localStorage` and `document`; under node
     * those assertions would pass without ever touching the behaviour they
     * claim to check.
     */
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["node_modules/**", ".next/**", "e2e/**", "coverage/**"],
    /*
     * Coverage is measured over the layers a unit test can actually reach:
     * the domain library, the components, and the React context. Page
     * composition is covered by the Playwright suite instead, which drives the
     * rendered routes rather than re-implementing them in jsdom - and
     * `src/lib/demo` is generated fixtures, not logic.
     *
     * The scope is declared here rather than inferred, so widening it is a
     * visible edit instead of a number quietly drifting up.
     */
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "lcov", "json-summary"],
      reportsDirectory: "./coverage",
      include: ["src/lib/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}", "src/contexts/**/*.tsx"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/lib/demo/**", "src/lib/db.ts", "src/types/**"],
      /*
       * A floor, not a score to display. Thresholds sit on lines, functions,
       * statements and branches together so a file cannot pass by having its
       * easy lines covered while every error branch is skipped.
       */
      thresholds: {
        lines: 70,
        functions: 70,
        statements: 70,
        branches: 65,
      },
    },
  },
});
