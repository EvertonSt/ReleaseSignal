# 0003 — `noUncheckedIndexedAccess` is on

**Status:** accepted · **Date:** 2026-10-02

## Context

The inherited `tsconfig.json` had `strict: true` and nothing else. Under
`strict`, `array[0]` is typed `T` — the compiler will not tell you that the
index might be out of range.

That is a large class of bug for this codebase specifically. The demo fixtures
index fixed-size constant lists (`demoRepos[i % 4]`, `branches[i % branches.length]`),
the quality-gate evaluator indexes its own rule results in tests, and the
ingestion processor indexes repository and workflow arrays. Every one of those
sites is a place where an off-by-one silently produces `undefined` and the type
system says nothing.

## Decision

`noUncheckedIndexedAccess` is enabled, alongside `noImplicitOverride`,
`noFallthroughCasesInSwitch` and `forceConsistentCasingInFileNames`.

Enabling it surfaced **26 errors**. All 26 were fixed.

Where the list really is non-empty and known — a `const` array of fixtures — the
fix is a named helper that says so:

```ts
export function cycle<T>(items: readonly T[], index: number): T {
  const item = items[index % items.length];
  if (item === undefined) {
    throw new Error("cycle() needs a non-empty list");
  }
  return item;
}
```

Where the index is genuinely dynamic, the fix is to handle the missing case:
the onboarding wizard clamps its step and throws only if the wizard has no steps
at all, which is a build-time mistake rather than a runtime one.

## Alternatives considered

**Non-null assertions (`items[i]!`).** Rejected. Twenty-six of them would be
twenty-six places where a later edit silently breaks, with the type checker
explicitly told not to look.

**Leave it off.** Rejected. The flag is the only thing standing between a
renamed array and a `undefined` that TypeScript happily propagates into a
`Record<string, string>`.

## Consequences

- Fixture generators read better than they did: `cycle(BRANCHES, i)` states the
  intent, where `branches[i % branches.length]` only restated the arithmetic.
- Some code is longer. Every extra line is a named decision about what happens
  when the index is wrong, which is the point.
- A few patterns need documenting — `next.config.ts` and the test files have
  scoped overrides, each with the reason in a comment.
