# Working agreement

The conventions this repository follows, and why each one is here. Written down
so a reviewer does not have to infer them, and so the next change follows them
without being told twice.

---

## 1. The gate is the definition of done

```bash
pnpm gate
```

Format, types, lint, unit tests with coverage, the repository gates, and a
production build — in that order, failing fastest first. The same checks run in
CI.

**A red gate is not finished work.** Fix the cause. Loosening a rule so the gate
goes green is a change to this document, not a quiet edit to a config file.

## 2. Rules get narrower, never weaker

There are exactly four places where a rule is scoped off, and each carries a
comment saying why:

| Scope                                                      | Rules                                  | Reason                                             |
| ---------------------------------------------------------- | -------------------------------------- | -------------------------------------------------- |
| `scripts/check-attribution.ts`, `scripts/check-secrets.ts` | `no-empty`, `no-explicit-any`          | A scanner must contain the patterns it hunts for   |
| `e2e/**`, `prisma/**`, `scripts/**`                        | `no-console`, `no-non-null-assertion`  | Build-time and fixture code, not runtime paths     |
| `src/**/__tests__/**`, `src/**/*.test.*`                   | `no-unsafe-*`, `no-non-null-assertion` | Tests exist to feed wrong-shaped values on purpose |
| `next.config.ts`                                           | `require-await`                        | Next's config API is Promise-based by contract     |

Anything not in that table is on. When a new exception seems necessary, write
the reason next to it — a rule switched off to accommodate one case is a rule
that will be switched off again for something else.

## 3. Types are the first reviewer

- `strict` plus `noUncheckedIndexedAccess`. `array[0]` is `T | undefined`,
  because it is. Index assumptions get fixed, not silenced.
- No `any`. When a boundary genuinely produces unknown data, it gets a schema
  (see §4), not a cast.
- Route handlers return the value Next expects; they do not `async` for show.

## 4. Validate at the trust boundary

Every `POST` body goes through `readJson(request, schema)` in
[`src/lib/api/body.ts`](../src/lib/api/body.ts). `request.json()` is `any`, so
destructuring it hands every downstream call a value the compiler cannot check
— and lets a caller send `{"totalTests": "many"}` into an arithmetic
comparison.

The same applies outward: the AI gateway parses provider responses through zod
envelopes, because a model is an untrusted input source like any other.

## 5. Deterministic before clever

The failure classifier and the gate evaluator are rule-based on purpose. When a
decision can block a release, the explanation has to be a rule you can read, not
a probability you have to trust. The AI gateway exists and is not in the
decision path.

## 6. Coverage is a floor

Thresholds are enforced in `vitest.config.ts` and in CI: 70% lines, functions
and statements, 65% branches.

The measured scope is the domain library, the components and the React context.
Page composition is covered end-to-end instead — driving rendered routes is a
better use of a browser than re-implementing them in jsdom. The scope is written
out in the config rather than inferred, so widening it is a visible edit.

## 7. Tests assert behaviour, and say why

A test that exists to prevent a specific failure names that failure in a
comment. "Regression guard: `test()` on a `/g` regex advances `lastIndex`, so
the previous implementation answered true and then false" is worth more than the
assertion it protects.

Tests are deterministic. No wall-clock, no network, no ordering assumptions. A
suite that passes only when the files happen to run in a particular order is
not a suite.

## 8. Commit messages explain why

One honest commit per change. Not a manufactured cadence of small commits
spread over invented dates — the history is the evidence, and evidence that had
to be assembled does not survive being looked at closely.

Every commit is authored and committed by the repository owner. No co-author
trailers, no tool signatures. This is enforced over the whole history by
`scripts/check-attribution.ts`, not just on the branch you are standing on.

## 9. Remove what pretends to work

A function whose signature promises more than its body delivers is worse than
no function. When something is not implemented, delete the stub rather than
leaving an `async` that resolves to `null`, and list it in the README's honest
status instead.

## 10. The README does not oversell

Claims in this README are checked against the code. When a feature is partial,
it is in the _Honest status_ section with what is and is not exercised. A
portfolio that oversells is worth less than one that does not.
