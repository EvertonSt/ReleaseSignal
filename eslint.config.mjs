import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";
import tseslint from "typescript-eslint";

/*
 * Three layers, in order of how much they know:
 *
 *  1. `eslint-config-next` supplies the framework rules that matter here (the
 *     React Compiler-aware hooks rules, Next's own import rules).
 *  2. `recommendedTypeChecked` is scoped to the TypeScript tree. It is not
 *     applied globally because a type-aware rule throws at config-load time
 *     when handed a file with no program in it.
 *  3. Small overrides for the places where the strict defaults are wrong:
 *     Playwright specs and the verification gates.
 */
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "node_modules/**",
    "test-results/**",
    "playwright-report/**",
    "next-env.d.ts",
    "public/**",
  ]),
  {
    files: ["src/**/*.{ts,tsx}", "e2e/**/*.{ts,tsx}", "prisma/**/*.ts", "scripts/**/*.ts", "*.config.ts"],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    /*
     * `eslint-config-next` already registers the jsx-a11y plugin, so only the
     * rules are spread here. Re-declaring the plugin is a hard config error.
     */
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,

      /*
       * Rules with teeth rather than style opinions. `any` is how a type error
       * becomes a runtime one three files away, and an unhandled promise in a
       * request handler is a 500 that never reaches a log.
       */
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/no-unnecessary-condition": "off",

      /* Route handlers and server actions legitimately return promises to Next. */
      "@typescript-eslint/no-unsafe-return": "off",

      eqeqeq: ["error", "always", { null: "ignore" }],
      "prefer-const": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    /*
     * Next's config API is Promise-based by contract: `headers()` and
     * `redirects()` must return a Promise whether or not anything inside them
     * awaits. `require-await` cannot tell that difference.
     */
    files: ["next.config.ts"],
    rules: {
      "@typescript-eslint/require-await": "off",
    },
  },
  {
    /*
     * Playwright specs and the Prisma seed name deliberately synthetic values
     * and reach into non-null fixtures. That is the job, not a smell.
     */
    files: ["e2e/**/*.ts", "prisma/**/*.ts", "scripts/**/*.ts"],
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
  {
    /*
     * A test exists to feed deliberately wrong-shaped values into the code and
     * assert on `expect.any(String)`, which is typed `any` by design. The
     * `no-unsafe-*` family treats that as a type escape; here it is the point.
     *
     * The rules stay on everywhere else. Scoping them off for test files is not
     * the same as turning them off - and these are the only paths where a
     * value can be untyped on purpose.
     */
    files: ["src/**/__tests__/**/*.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "no-console": "off",
    },
  },
  {
    /*
     * The attribution and secret scanners necessarily contain every pattern
     * they hunt for. Linting them would mean switching rules off to accommodate
     * the guard - and a rule switched off for the guard gets switched off again
     * later for something else.
     */
    files: ["scripts/check-attribution.ts", "scripts/check-secrets.ts"],
    rules: {
      "no-empty": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);
