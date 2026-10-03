# ReleaseSignal

**Turn every test run into a release decision — with the evidence attached.**

A CI pipeline tells you a suite is red. It does not tell you whether the release
should stop, whether the failure is new, or whether it is the same flake you
have been re-running for six weeks. ReleaseSignal ingests raw CI results,
groups failures by signature, classifies them with deterministic rules, and
returns a pass / warn / block decision a reviewer can defend line by line.

> **Status: working demo.** The core domain — ingestion, classification, gate
> evaluation, security primitives — is implemented and tested. GitHub App
> publishing is not wired up; see [Honest status](#honest-status) before you
> read anything else as production-ready.

---

## The problem this solves

Teams already have CI. What they lack is a **defensible answer** to "is this
safe to ship?" — and that answer needs three things a red X does not provide:

| Question                       | What a CI badge gives you | What ReleaseSignal gives you              |
| ------------------------------ | ------------------------- | ----------------------------------------- |
| Is this failure new?           | Nothing                   | Signature clustering over history         |
| Is it a flake or a real break? | Nothing                   | Deterministic classification + confidence |
| Does it block the release?     | A boolean nobody trusts   | A rule set you can read and edit          |

The classification is **deterministic on purpose**. Fourteen ordered rules
([`classifier.ts`](src/lib/failure-analysis/classifier.ts)) classify a failure
from its error signature, stack frames, retry history and branch, and every
decision carries the rule that produced it. There is no model in the loop
deciding whether your release ships, and there is nothing to explain away.

---

## What is actually built

### Failure classification — deterministic, explainable

```ts
const { classification, confidence, matchedRule, evidence } = classifyFailure({
  testTitle: "checkout > applies discount",
  errorMessage: "TypeError: Cannot read properties of undefined (reading 'total')",
  stackTrace: "at applyDiscount (src/checkout/discount.ts:42:11)",
  retryResults: ["failed", "failed"],
  historicalFailures: 0,
});
// -> { classification: "regression", confidence: 0.94, matchedRule: "R7", evidence: [...] }
```

Fourteen rules cover regressions, environment faults, flakes and test defects.
Signatures are normalised (stack frames stripped, error text canonicalised) and
hashed, so the same failure clusters across runs regardless of line numbers.

### Quality gates — rules, not vibes

```ts
const result = evaluateGate(rules, {
  totalTests: 200,
  failedTests: 12,
  flakyTests: 3,
  newRegressions: 3,
});
// -> { decision: "blocked", summary: "1/3 rules passed", rules: [...] }
```

Eight rule types (pass rate, failure rate, flaky rate, new regressions, new
failures, performance budget, coverage, required suites) across four conditions
and four severities. Severity drives the decision: a `critical` failure blocks,
a `high` one warns.

### Ingestion with an idempotency contract

`POST /api/ingress` validates an untrusted payload against a zod schema,
computes statistics, deduplicates on `idempotencyKey`, and returns `409` on a
replay. The schema is the boundary — a caller cannot get `"many"` into an
arithmetic comparison.

### Security primitives that are actually tested

| Module                                                    | What it does                                                                                 |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| [`rate-limit.ts`](src/lib/security/rate-limit.ts)         | Token bucket per key, with a refill ceiling and `Retry-After` — **not yet wired to a route** |
| [`webhook-verify.ts`](src/lib/security/webhook-verify.ts) | HMAC-SHA256 with `timingSafeEqual`; malformed digests return `false`, never throw            |
| [`secrets.ts`](src/lib/security/secrets.ts)               | Redaction of 17 credential shapes before anything is logged                                  |
| [`auth.ts`](src/lib/ingress/auth.ts)                      | Bearer token on the CI write endpoint, constant-time, **fails closed**                       |
| [`body.ts`](src/lib/api/body.ts)                          | One typed reader for every route body                                                        |

`POST /api/ingress` is the one write endpoint a third party can reach, so it
requires `Authorization: Bearer $INGEST_API_KEY`, compared in constant time over
SHA-256 digests. With the key unset and demo mode off it answers `503` — it
refuses to run rather than accepting anonymous writes.

That is proven three ways, which matters because a unit test on the helper would
still pass if someone deleted the call to it:

- **19 unit tests** on the comparison, the token parsing and the fail-closed
  default.
- **8 end-to-end tests** driving the real endpoint over HTTP against a
  non-demo build, in their own Playwright project.
- **A regression probe**: neutering `authorizeIngest` to always allow turns
  7 of those 8 red. A security test that cannot fail is a comment.

### Provider-agnostic AI gateway

An optional gateway in front of OpenAI, Anthropic and Ollama with schema
validation, timeouts, caching and a mock provider. **It is not in the decision
path** — classification and gating run without it. Provider responses are
parsed through zod envelopes, because a model is an untrusted input source
like any other.

---

## Engineering quality

Numbers from `pnpm gate`, reproducible on a clean checkout:

| Gate                              | Result                                                         |
| --------------------------------- | -------------------------------------------------------------- |
| `prettier --check`                | clean                                                          |
| `tsc --noEmit`                    | 0 errors                                                       |
| `eslint` (type-aware)             | 0 problems                                                     |
| Unit tests                        | **341 passing**, 25 files                                      |
| Coverage (domain + components)    | **79%** statements, **73%** branches — floor enforced at 70/65 |
| `next build`                      | 22 routes emitted                                              |
| E2E (Playwright)                  | against the **production build**, 743 tests, 5 browsers        |
| Secret / link / attribution gates | clean                                                          |
| Dependency audit (production)     | **0 known vulnerabilities**                                    |

### Decisions worth knowing about

A few choices that a reviewer would otherwise have to reverse-engineer:

- **`noUncheckedIndexedAccess` is on.** `array[0]` is `T | undefined`, because
  it is. This surfaced 26 latent index assumptions that were fixed rather than
  silenced.
- **The type-aware ESLint tier is on**, including `no-unsafe-assignment` and
  `no-floating-promises`. The only scoped exceptions are test files and the two
  scanner scripts that necessarily contain the patterns they forbid — each with
  the reason in a comment next to it.
- **Route bodies are parsed, not destructured.** `request.json()` is `any`;
  every handler goes through `readJson(request, schema)`.
- **The AI gateway validates its own input.** A malformed provider response
  throws a named error instead of an `undefined` dereference three weeks later.
- **Coverage is scoped, and the scope is written down.** The unit suite measures
  the domain and components; page composition is covered end-to-end. Both
  thresholds are enforced in CI, so the number cannot drift quietly.
- **A vulnerable dependency is patched, not annotated.** Writing the CI
  security job turned up a critical RCE advisory against the framework version
  this repository shipped. `next` and `eslint-config-next` moved to 16.3.8, and
  one transitive advisory with no upstream fix is closed by a commented
  [`overrides`](pnpm-workspace.yaml) entry rather than by a suppress file. The
  reasoning, including the alternatives rejected, is in
  [`0005-patch-known-vulnerabilities.md`](docs/decisions/0005-patch-known-vulnerabilities.md).
- **A documented `401` over a handler that never read the header.** The ingestion
  endpoint's doc comment promised an API-key check that did not exist. It does
  now, and with no key configured it returns `503` rather than opening up —
  [`0006-ingestion-fails-closed.md`](docs/decisions/0006-ingestion-fails-closed.md).

### Bugs the tests caught while writing them

Recorded because they are more convincing than a claim that there were none:

- `containsSecrets()` used `RegExp.test()` on `/g` patterns, which advances
  `lastIndex` — so the second call on the same string could answer _no_. A leak
  detector that intermittently says no is worse than none.
- The redaction list covered `password`, `secret` and `token` but not
  `apiKey`, so an integration logging its own config would have printed it.
- `generateId()` was built on `Math.random()`, which is not a random source for
  anything that matters. Now `crypto.randomUUID()`.
- The health endpoint reported `"healthy"` while every test asserted `"ok"`,
  and reported version `0.1.0` while the package said `1.0.0`.
- Three icon-only buttons had no accessible name. Caught by
  `toHaveAccessibleName()`, not by review.

---

## Stack

| Layer      | Choice                                              | Why                                                                                       |
| ---------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Framework  | Next.js 16.3.8 (App Router), React 19               | Server components for the read paths, client components only where interaction needs them |
| Language   | TypeScript 5, `strict` + `noUncheckedIndexedAccess` | The compiler is the first reviewer                                                        |
| Data       | Prisma 6 + PostgreSQL 16                            | Typed queries; migrations are checked in                                                  |
| Validation | zod 4                                               | One schema at every trust boundary                                                        |
| Auth       | Auth.js 5 (GitHub OAuth)                            | Least privilege, no password storage                                                      |
| Styling    | Tailwind v4                                         | No runtime cost, design tokens in CSS variables                                           |
| Charts     | Recharts 3                                          | Composable, and the tooltip payload is now typed                                          |
| Tests      | Vitest 4 + Testing Library, Playwright 1.62         | Same runner for unit and component tests                                                  |
| Gates      | Custom scripts under [`scripts/`](scripts)          | See [`gate.sh`](scripts/gate.sh)                                                          |

---

## Running it

```bash
pnpm install
pnpm db:generate
cp .env.local.example .env.local     # then fill in what you need
pnpm dev                            # http://localhost:3000
```

Demo mode runs with no database at all — synthetic data, every integration
disabled, and a banner saying so:

```bash
NEXT_PUBLIC_DEMO_MODE=true pnpm dev
```

> **Never deploy a build made with `NEXT_PUBLIC_DEMO_MODE=true`.** Next.js
> inlines `NEXT_PUBLIC_*` variables at _build_ time, so demo mode is compiled
> into the bundle: starting the server without the variable does not turn it
> back off, and the ingestion endpoint's auth check stays bypassed. A demo build
> has to be rebuilt without the flag, not reconfigured.

For a real deployment, set at minimum `DATABASE_URL`, `AUTH_SECRET` (from
`openssl rand -base64 32`) and `INGEST_API_KEY`. The app also runs behind a
reverse proxy in `docker-compose.yml` and on Vercel, both of which require
`trustHost` for the OAuth round trip to complete.

### Deploying

The app is a standard Next.js App Router project and deploys to Vercel or to
Docker without modification.

**Vercel.** Import the repository and accept the detected settings:
[`vercel.json`](vercel.json) pins the install and build commands. Three things
are deliberate:

- **No demo mode.** `NEXT_PUBLIC_DEMO_MODE` is absent from `vercel.json` on
  purpose — it used to be set to `"true"` there, which would have deployed a
  build with the ingestion authorization check compiled out.
- **The build refuses a demo deploy.** [next.config.ts](next.config.ts) fails
  the build when `NEXT_PUBLIC_DEMO_MODE=true` under Vercel, unless
  `ALLOW_DEMO_BUILD=1` is set explicitly. A warning in a README stops nobody; a
  build that will not finish does.
- **Migrations are not run at build time.** `prisma migrate deploy` on every
  build means a preview deployment can migrate production's schema. The initial
  migration is checked in; apply it once with `pnpm db:deploy`.

Required environment variables: `DATABASE_URL`, `AUTH_SECRET` (from
`openssl rand -base64 32`), `INGEST_API_KEY` (same generator), and the
`GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` pair if you want OAuth rather than
demo data.

**Docker.** [`Dockerfile`](Dockerfile) builds a standalone output and
[`docker-compose.yml`](docker-compose.yml) runs it behind nginx with
PostgreSQL. The security headers are defined once, in `next.config.ts`, so they
behave identically on Vercel, in Docker and in local development.

### The gate

```bash
pnpm gate          # everything: format, types, lint, tests, repo gates, build
pnpm verify        # secrets, links, attribution, build artefacts
```

The same checks run in CI. Nothing merges on a red gate.

---

## Honest status

Stated plainly, because a portfolio that oversells is worse than one that
does not:

**Working and tested**

- Ingestion pipeline with validation, statistics and idempotency
- Deterministic failure classification (14 rules) with signature clustering
- Quality-gate evaluation (8 rule types, 4 severities, 4 conditions)
- Token-bucket rate limiting, HMAC webhook verification, secret redaction
- Full dashboard UI: 11 routes, responsive, accessible
- 341 unit tests, 743 end-to-end across five browser projects, six local gates
- The production Prisma branch, on every push, against a real PostgreSQL

**Implemented but not exercised end to end**

- **The CI ingestion endpoint is authenticated, and that is proven three ways.**
  `POST /api/ingress` requires `Authorization: Bearer $INGEST_API_KEY`, compares
  it in constant time, and refuses to run at all when the key is unset — by
  unit test, over real HTTP against a non-demo build, and by neutering the check
  and watching the end-to-end suite go red. What is _not_ proven is the path
  after authentication against a production-sized database; the integration job
  uses a throwaway container.
- **GitHub App publishing.** The configuration check and status reporting are
  real and tested; the API calls to create Check Runs are not implemented. The
  dead stubs that used to sit there pretending otherwise were deleted rather
  than kept as decoration.
- **PostgreSQL writes are covered, but only against a throwaway database.** A CI
  job runs the ingestion pipeline against a real PostgreSQL container on every
  push, applying the checked-in migrations first. What it does not cover is a
  production-sized database: connection limits, slow queries under load, and
  the migration path against a database that already holds real data.

**Not started**

- Multi-tenant isolation (single-org today)
- WebSocket live updates
- Report export and scheduled generation

**Known limits worth naming**

- **Rate limiting is written and tested but not wired to any route.** The token
  bucket has a full suite; nothing calls it yet. Named here because the table
  above lists it as a primitive this repository owns, and owning it is not the
  same as running it.
- **A demo build is not a production build.** `NEXT_PUBLIC_DEMO_MODE` is inlined
  at build time, so the ingestion endpoint's auth check is compiled out of a
  demo build and cannot be re-enabled by restarting the server. Every
  non-demo verification path — the fail-closed `503`, the unauthorised `401` —
  depends on building with the flag off, which CI does deliberately.
- **One transitive advisory is held by an override, not by a release.**
  `deepmerge-ts` is pinned to a vulnerable exact version by `@prisma/config`
  and Prisma has not shipped a fix; the override is commented with why in
  [`pnpm-workspace.yaml`](pnpm-workspace.yaml) and should be dropped the day
  upstream moves. See [ADR 0005](docs/decisions/0005-patch-known-vulnerabilities.md).
- **The development dependency tree carries 6 high and 2 moderate advisories.**
  None are in shipped code; CI holds production to `high` and development to
  `critical` deliberately, and the reasoning is in the workflow file.

---

## Design notes

Decisions with a reason behind them live in
[`docs/decisions/`](docs/decisions). The conventions this repository follows are
written down in [`docs/WORKING-AGREEMENT.md`](docs/WORKING-AGREEMENT.md), and
the work log is in [`SESSION-LEDGER.md`](SESSION-LEDGER.md).

---

## Security

[`SECURITY.md`](SECURITY.md) documents the ingestion authorization model, the
demo-build hazard, the known limitations and how to report a vulnerability.

---

## Built by

**Everton S. Andrade** — QA Automation Engineer, Brazil.

- GitHub: [@EvertonSt](https://github.com/EvertonSt)
- LinkedIn: [everton-s-andrade](https://www.linkedin.com/in/everton-s-andrade-760407128/)

Interested in hiring or working together? The fastest route is a code review of
[`classifier.ts`](src/lib/failure-analysis/classifier.ts) or
[`evaluator.ts`](src/lib/quality-gates/evaluator.ts) — both are short, both are
heavily tested, and both show how I think about boring problems.

---

## License

UNLICENSED — all rights reserved. Built as a portfolio piece.
