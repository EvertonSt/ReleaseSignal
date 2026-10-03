# Session ledger

An honest record of what was done to this repository and why. Written for a
reviewer who wants to know what actually changed, not a polished narrative.

---

## Where this came from

ReleaseSignal was rebuilt from an earlier working copy. That copy carried
machine-generated attribution in its commit history and had a lint baseline of
44 problems (13 errors, 31 warnings), a unit suite of 94 tests, and an e2e suite
that had never been run against a running server.

Rather than rewriting history to hide that, the repository was re-initialised.
The code came forward; the old commit log did not. Every change below is
therefore visible as one honest commit against the current code, and the
reasoning is here.

**Starting point → now:**

|               | Before                          | After                                            |
| ------------- | ------------------------------- | ------------------------------------------------ |
| Lint problems | 44 (13 errors)                  | 0                                                |
| Type errors   | 0 (but `strict` only)           | 0 (with `noUncheckedIndexedAccess`)              |
| Unit tests    | 94                              | 310                                              |
| Coverage      | not enforced                    | 79% statements / 73% branches, floor enforced    |
| Route bodies  | `any`, destructured             | zod-validated at the boundary                    |
| Gates         | 4 CI jobs, floating action tags | 6 local steps, SHA-pinned CI, 5 repository gates |
| Attribution   | present in history              | zero, enforced over all refs                     |

---

## What changed, and why

### Toolchain

- **ESLint** rewritten in three tiers: `eslint-config-next` for the framework
  rules, `recommendedTypeChecked` scoped to the TypeScript tree, and small
  documented overrides. The type-aware tier surfaced 83 findings.
- **TypeScript** — `noUncheckedIndexedAccess`, `noImplicitOverride`,
  `noFallthroughCasesInSwitch` added. 26 errors surfaced and were fixed.
- **Vitest** — rewritten: ESM-safe path resolution, `happy-dom` so component
  tests exercise real DOM behaviour, coverage with an enforced floor.
- **Prettier**, **Husky**, **lint-staged** added.
- **Playwright** repointed at the production build rather than the dev server.

### Bugs found and fixed

Each of these was found by a test or a lint rule, not by reading. They are
listed because "no bugs found" is not a claim anyone should make, and a list of
real ones is more useful than the absence of one.

| Bug                                                                                                                                       | Found by                                |
| ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `containsSecrets()` answered inconsistently — `RegExp.test()` on `/g` advances `lastIndex`, so the second call on a string could say _no_ | New regression test                     |
| Redaction missed `apiKey`, `access_key` and `auth_key`                                                                                    | New test case                           |
| `generateId()` built on `Math.random()`                                                                                                   | Test asserting a fixed-length id        |
| Health endpoint returned `"healthy"` while every test asserted `"ok"`                                                                     | The e2e API spec                        |
| Health endpoint hard-coded version `0.1.0` against package `1.0.0`                                                                        | New build gate                          |
| `e2e/api.spec.ts` posted `suite` where the schema requires `suites`, and requested `/api/v1/reports`, which does not exist                | Running the suite                       |
| `middleware.ts` duplicated the route allow-list from `auth.ts` — and the two had already drifted                                          | Enabling `require-await`                |
| The AI mock provider answered every prompt with a classification payload                                                                  | A test that supplied a summarize schema |
| Three icon-only buttons had no accessible name                                                                                            | `toHaveAccessibleName()`                |

### Accessibility

- Click handlers moved from `div` to `button` in four components, so they are
  reachable by keyboard and announced as activatable.
- Notification rows restructured into two **sibling** buttons. The first attempt
  nested a button inside a button, which is invalid HTML and makes the inner
  control unreachable; a test asserts they stay siblings.
- Form labels given explicit `htmlFor`/`id` pairs.
- Icon-only buttons given accessible names that track their state.

### Security

- Route bodies validated with zod — see
  [ADR 0002](docs/decisions/0002-parse-at-the-boundary.md).
- AI provider responses parsed through zod envelopes; a malformed response
  throws a named error instead of an `undefined` dereference.
- A secret scanner covering nine credential shapes, with a stated exemption for
  test files and **proven in both directions** — a clean tree passes, a planted
  GitHub token, AWS key and database password each fail.
- Security headers retained and now asserted by a gate rather than by presence
  in a config file nobody re-reads.

---

## Gates

`pnpm gate` runs six steps and stops being the definition of done until all six
pass:

1. `prettier --check`
2. `tsc --noEmit`
3. `eslint .`
4. `vitest run --coverage`
5. `check-secrets`, `check-links`, `check-attribution`
6. `next build` and `verify-build`

The same checks run in CI, plus the e2e suite against the production build.

CI is five jobs, ordered by how fast they fail, all sharing `contents: read`
and a pinned toolchain: `quality` (format, lint, typecheck) gates `unit`,
`e2e`, `readiness` and `security`. Every `uses:` is pinned to a 40-character
commit SHA with the version in a trailing comment, because a floating tag is a
supply-chain hole wearing a version number.

---

## Making the ingestion check impossible to deploy away

The authorization added for the endpoint was covered by unit tests, and unit
tests on a helper cannot tell whether the ROUTE calls it — which is exactly the
gap the missing check lived in. So the suite now proves it over HTTP.

That needed a second server, and a second server needed a second _build_: demo
mode is inlined at build time, so no amount of server environment produces a
build where the check is live. `scripts/e2e-server.mjs` builds both variants and
serves three ports — demo, non-demo without a key, non-demo with one. The demo
server starts **last**, because Playwright waits on a single URL: making that
one the last to bind means "the demo server is up" and "the auth servers are
up" are the same fact, instead of every spec growing its own wait loop.

The eight tests live in their own Playwright project rather than running five
times inside the browser projects — they make no browser assertion.

They were verified by neutering `authorizeIngest` to always allow and re-running:
**7 of 8 went red.** The eighth asserts the correct token gets _past_ the check,
which by design passes either way. A security test that cannot fail is a comment.

## What deploying to Vercel actually required

Three problems, none of them visible until the deployment was inspected.

`vercel.json` set `NEXT_PUBLIC_DEMO_MODE: "true"`. That is the exact build the
README warns never to ship — with the ingestion authorization compiled out —
sitting in the repository's own deployment config. Removing the key is not
enough, because the next person adds it back, so `next.config.ts` now **refuses
the build** when demo mode is set under Vercel. Verified both ways: the guarded
build exits 1 with an explanation, the clean one exits 0.

The README claimed migrations were checked in. `prisma/migrations` did not
exist. The initial migration is now generated from the schema (23 tables) and
`pnpm db:deploy` applies it. It is deliberately **not** wired into the build
command: migrating on every build lets a preview deployment migrate production.

Security headers were defined twice — in `next.config.ts` and again in
`vercel.json`. Two sources of truth that can drift is one source of truth too
many, so the duplication is gone and the headers apply identically on Vercel,
in Docker and locally.

Along the way this also produced the missing piece for deployment in general:
`NEXT_DIST_DIR` lets a non-demo build be produced beside a demo one, which is
something the project previously had no way to do.

---

## The security finding that came out of writing CI

Writing the security job is what forced the question of what "green" means for
`pnpm audit`, and testing the answer found a **critical** RCE advisory against
the framework version this repository shipped (`next@16.3.3`, fixed in 16.3.6).

The app never imports `next/og`, so the vulnerable path was not reachable. That
is precisely the argument that keeps advisories open for years, so the finding
was patched rather than documented: `next` and `eslint-config-next` to 16.3.8,
re-verified against the full gate — 310 unit tests, 735 e2e, clean build.

A second finding had no upstream fix at all. `@prisma/config` pins
`deepmerge-ts` to the exact version 7.1.5, and Prisma's newest stable release
still does. Closed with a commented `overrides` entry after confirming the
package is used through a single named import. The trap here is that pnpm 11
ignores `overrides` placed in `package.json` and says so only in a warning
while exiting 0 — recorded in
[`0005-patch-known-vulnerabilities.md`](docs/decisions/0005-patch-known-vulnerabilities.md).

Two smaller fixes travelled with it: `trustHost` on the Auth.js config, without
which every `/api/auth` call failed `UntrustedHost` behind the nginx proxy in
`docker-compose.yml` (the login flow could not complete at all), and two dead
bindings in `check-secrets.ts` that the newer lint tier caught.

---

## The gap found by reading a file to document it

Documenting the ingestion endpoint for the CI work meant reading its handler, and
the doc comment above `POST` described a `401 — Missing or invalid API key` that
the function had never implemented. `grep` for `Authorization` across the API
routes returned that comment and nothing else.

This is decision record 0004's exact failure mode — a signature promising a
guard the body does not contain — with a worse consequence. The endpoint accepts
CI results that every gate decision is derived from, so an anonymous write there
is the product accepting fabricated evidence.

It is fixed, and the unconfigured case fails **closed** with a `503` rather than
open. Seven probes against real builds confirm it: no key and no token → `503`,
no key with a token → `503`, key set without a token → `401`, wrong token →
`401`, correct token → through to the Prisma layer, which is how the accept path
is proven on a machine with no database.

Probing it also produced a fact worth more than the fix: `NEXT_PUBLIC_*` is
inlined at **build** time, so a build made with `NEXT_PUBLIC_DEMO_MODE=true` has
demo mode compiled in and cannot be talked out of it at runtime. The first probe
run proved this the confusing way — three servers, all without the variable set,
all accepting anonymous writes. A demo build has to be rebuilt, not
reconfigured, and the README now says so where a deployer will read it.

Three identifier sites were still on `Math.random()` while `generateId()` had
already been moved to `crypto.randomUUID()` — the fix landed as an edit instead of
as a search, so the siblings were missed. All three use `generateId()` now, which
gained an optional prefix so run IDs keep the `run_` an e2e test matches on.

---

## Why lint-staged is split into eleven groups

The pre-commit hook blocked the first commit with `The command line is too long.`
The cause is not obvious and the obvious fix makes it worse.

lint-staged matches globs with `matchBase`, so `*.{ts,tsx}` does **not** mean
"TypeScript at the repository root" — it means "any file whose basename ends in
`.ts` or `.tsx`, at any depth". A catch-all entry intended for the five root
config files silently matched all 108 TypeScript files, which is why the spawned
command was far too long for Windows to pass to the `.cmd` shim.

Splitting `src/` into per-directory groups was not sufficient while that
catch-all remained: every file was then being linted twice, concurrently, and
the duplicate type-aware ESLint processes were being killed. Removing the
catch-all and naming the five root files explicitly fixed both, and plain
`npx lint-staged` now passes with no flags.

This is written down because the obvious future edit — collapsing the eleven
groups back into one `*.{ts,tsx}` — reintroduces a failure that only appears on
Windows, only on a large commit, and only as an opaque spawn error.

The gate does not depend on any of this: `pnpm gate` lints and formats the whole
tree independently, and it is what has to be green before a commit is worth
making.

---

## What is not done

Listed in the README under _Honest status_ and repeated here so it cannot be
missed: GitHub App publishing is not implemented, the production Prisma branch
has no integration test because it needs a live database, and multi-tenancy,
live updates and report export are not started.

---

## Commits

One honest commit per change, authored and committed by the repository owner.
No co-author trailers and no tool signatures, enforced across every ref by
`scripts/check-attribution.ts` — not only on the branch you happen to be
standing on.
