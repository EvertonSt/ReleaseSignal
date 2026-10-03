# ReleaseSignal — future improvements

A list, not a plan. Every item names what "done" means, because an improvement
without a finished state is just a wish.

Ordered by what would matter most if a hiring manager or a user spent twenty
minutes on it. The current state is honest about itself in
[README → Honest status](../README.md#honest-status) and
[SECURITY.md](../SECURITY.md#known-limitations); this file extends that honesty
to the parts nobody has asked about yet.

---

## Start here

Written for whoever picks this up next, including a future version of me who
will not remember any of this.

**Where things stand.** `bash scripts/gate.sh` passes all six steps and exits 0.
`main` is green. The private vulnerability reporting channel is live and was
verified from a logged-out browser. Section 0 is resolved and is kept only
because the reasoning is worth more than the outcome.

**The whole file, if the goal is to show this to someone.** Do these two things
and stop.

1. **[Deploy it](#5-infrastructure-and-release).** Nothing else on this list
   changes an impression as much as a URL. Every claim in the README is
   currently mediated by a CI badge; a build that answers `401` without a token
   converts all of it into something clickable in five seconds. `vercel.json` is
   already correct and the demo-build guard is verified.
2. **Close one of the two product-shaped gaps** — GitHub App publishing or
   multi-tenant isolation. Both are findable in about five minutes by anyone who
   reads carefully, because both are the difference between a demo and a product.
   GitHub App publishing is the better story if you want something to _show_;
   tenant isolation is the better signal if you are being interviewed on system
   design.

Then leave items 7 through 45 alone. They buy test counts, not credibility, and
each additional item increases the odds that this reads as effort spent without a
shipped thing — which is the one perception worth optimising against.

**Open dependency pull requests, so nobody re-derives them.** Each was
diagnosed individually after the Dependabot regrouping:

| PR  | Update                               | Status                                                             |
| --- | ------------------------------------ | ------------------------------------------------------------------ |
| #9  | dev-dependencies, minor/patch bundle | **green — takeable**                                               |
| #10 | `@types/node` major                  | **green — takeable**                                               |
| #11 | `@vitest/coverage-v8`                | blocked — V8 provider now sends an object, reporter wants a string |
| #12 | `eslint` major                       | blocked — `eslint-plugin-react` uses an API ESLint 10 removed      |
| #13 | `typescript` major                   | blocked — `typescript-eslint does not support TS 7.0`              |
| #14 | `vitest` major                       | blocked — same root cause as #11                                   |

`#9` and `#10` are the proof the regrouping worked: under the old configuration
both were fused with blockers and neither could land.

---

## 0. Fix first — these are defects, not improvements

_Nothing is outstanding here. Both items are resolved; the record of how is
kept below because the reasoning is worth more than the outcome._

**Private vulnerability reporting — done.** The endpoint returns
`enabled: true`, and the path `SECURITY.md` names works for someone who has
never seen the repository: signed out, `/security/advisories` offers
**Report a vulnerability**, which routes to the reporting form. Verified from a
logged-out browser, because that is the only vantage point that proves anything
— an owner looking at their own repository would have seen the button whether or
not the channel existed.

The reason it took a person and not a token is worth recording. GitHub answers
`404` for `PATCH .../private-vulnerability-reporting` to an OAuth token, and
`404` rather than `403`, because it will not disclose that a token is merely
unauthorised. Every other repository setting on this repository answers `200` to
the same token, which is what makes the one failure so confusing to debug. The
fix is a fine-grained personal access token with _Administration: read and
write_; the toggle is _Settings → Advanced Security_, in the "Security and
quality" section of the sidebar — **not** "Code security", which is the CodeQL
page and a genuinely easy place to end up instead.

### Resolved, and why almost none of it was a merge

The seven stale Dependabot pull requests are closed. Five were applied — four
action pins and the production dependency bundle — and none through the merge
button, which is worth explaining once because it will happen again: GitHub's
squash merge appends `Co-authored-by: dependabot[bot]`, and the `commit-msg`
hook rejects trailers. Every bot update here lands as a local squash with an
owner-authored message, and the branch is deleted afterwards.

Two were refused, and both refusals changed something:

- **#6** bundled eight development dependencies into one branch and was
  unmergeable, because eslint 10 breaks `eslint-config-next` and TypeScript 7 is
  unsupported by `typescript-eslint`. Four updates that were perfectly
  mergeable went down with two that could not land. The grouping was the cause,
  not bad luck: majors are now their own group with one pull request per
  dependency, and the routine groups accept only minor and patch.
- **#7** would produce a repository that does not build. See **Technical debt,
  named → Prisma migration** for what it actually involves. The major is now
  ignored so it stops returning every Monday, with the reasoning recorded next
  to the rule rather than only in a closed pull request.

Two more arrived as a direct consequence of the regrouping, which is the proof
it worked. The five majors that used to arrive fused into #6 — eslint,
TypeScript, vitest, `@types/node` and `@vitest/coverage-v8` — now arrive as five
separate pull requests, and the routine minor/patch bundle is its own again. The
same split then made `pnpm/action-setup` v6.1.0 (#8) takeable on its own
evidence: seven jobs green against current `main` before landing.

---

## 1. Correctness under real conditions

**Load and performance testing.**
Every number in this repository comes from a fast machine with an empty
database. Nothing has measured p95 latency on `/api/ingress` under
concurrent writes, and the write path creates rows in a loop with one `await`
per test case — a 2,000-test suite is 2,000 sequential round trips. That is the
most likely performance cliff in the codebase and nothing is watching for it.
_Done when:_ an ingest of a realistic suite size completes within a stated
budget, measured in CI or a repeatable script.

**Connection-pool behaviour.**
Prisma's default pool size is not configured, so a burst of parallel ingests on a
serverless runtime can exhaust it. This is exactly the class of failure the
integration job cannot catch, because it runs one container with one client.
_Done when:_ pool size is explicit and a burst test stays within it.

**Bulk-write the test cases.**
The `for` loop over `suite.tests` awaits `testCase.create` per test. A single
`createMany` would turn a 2,000-test ingest from 2,000 round trips into one.
_Done when:_ the integration suite measures a meaningful difference.

**Migration safety against a populated database.**
`migration 1` adds a unique index and will fail on any database that already
contains duplicate workflows. That is deliberate, but it means there is no
documented remediation path. _Done when:_ a runbook exists for deduplicating
before the index is applied.

**Idempotency under simultaneous retries.**
The bounded `P2002` retry was written and proven for repository and workflow
creation. The `TestRun` insert itself is _not_ protected the same way: two
requests with the same `idempotencyKey` arriving together can still race at the
insert. _Done when:_ a test fires N concurrent requests with one key and exactly
one row exists afterwards.

---

## 2. Security

**Confirm a private report actually reaches anyone.**
The reporting channel exists and is now live, which closes the defect without
closing the risk. GitHub emails the repository administrator about a private
report only if they are watching the repository with "All Activity" or "Security
alerts" enabled. If that preference is off, a report sits in the advisories
queue and nobody is told — a channel that works and is unwatched is harder to
notice than one that is obviously missing, because it looks healthy. _Done when:_
the notification preference is confirmed rather than assumed.

**Give the reporting form something worth filling in.**
`.github/VULNERABILITY_REPORT.yml` defines the form GitHub shows a reporter,
using the same YAML schema as issue forms. Without one, a reporter gets
GitHub's generic default, which knows nothing about this application's attack
surface: a bearer-token ingest endpoint, `idempotencyKey` replay semantics, and
`401` / `409` / `503` meaning different things. Adding one is safe by
construction — if GitHub cannot parse it, reporters silently get the default
instead, so a mistake cannot break the channel. _Done when:_ the form asks for
what is needed to reproduce an ingest finding.

**Wire the rate limiter to the routes it was written for.**
`src/lib/security/rate-limit.ts` is fully tested and called by nothing. The
ingestion endpoint is the endpoint most worth limiting and is currently
unlimited. _Done when:_ every `/api` route either applies it or has a comment
saying why not.

**Tenant isolation.**
`getOrganizationId()` returns a constant with a `TODO` in it. There is no
per-tenant authorization anywhere: one valid key can write into the single
organization's data. This is the difference between a demo and a product, and it
is the largest single piece of remaining work. _Done when:_ organization comes
from the authenticated principal, and a key for org A cannot read or write org
B's runs.

**Row-level authorization on reads.**
`GET /api/runs` and `/api/failures` currently trust the caller. Tenant isolation
above is the prerequisite; this is applying it to the read paths rather than only
the write path.

**CSP and the remaining security headers.**
Four headers are set. `Content-Security-Policy` is not, and a strict one is
genuinely hard here because Next.js emits inline scripts for hydration. Worth
doing with `nonce` support rather than a policy full of `unsafe-inline`.
_Done when:_ a CSP ships in report-only mode and is measured before enforcing.

**Secret rotation runbook.**
A credential is committed to no one, but `AUTH_SECRET` rotation invalidates
every session and `INGEST_API_KEY` rotation drops in-flight webhooks. Nothing
documents the procedure. _Done when:_ both rotations have a documented path.

**Dependency advisories in the development tree.**
Six high and two moderate, all transitive, deliberately tolerated at a `critical`
threshold. Most will resolve themselves; the point is to have decided rather
than drifted into the policy. _Done when:_ each remaining advisory has a
recorded reason or is fixed.

**Automated static analysis.**
Nothing scans the source. Secret scanning is on and catches leaked credentials;
nothing catches a safe pattern quietly disappearing. CodeQL is free on a public
repository and no analysis has ever run here. A read of the code suggests it
would come back near-empty — there is no `dangerouslySetInnerHTML`, no `eval`,
no child process, no raw SQL because Prisma parameterises, and the two
`Math.random` hits are comments explaining that the calls were _removed_ — which
makes this a regression guard rather than a bug hunt, and is the honest framing
for choosing it. _Done when:_ a SHA-pinned `security-extended` workflow runs on
push to `main` and on a schedule, and is trusted enough to gate. Start advisory
and promote it only once it is provably quiet; making an unknown unknown into a
red gate on day one is how teams learn to ignore gates.

---

## 3. Product completeness

The three items the README lists as not started, plus the one that is
half-finished.

**GitHub App publishing.**
`isGitHubConfigured()` and `getIntegrationStatus()` are real; the Check Run
API calls are not. This is the feature that makes the product close its own
loop — a CI run reports a gate decision back onto the pull request that caused
it. The GitHub client is already there and mocked in tests; this is the
difference between an ingestion sink and an integration. _Done when:_ a gate
decision appears as a check on a real pull request.

**Live updates.**
The dashboard shows a snapshot. A CI run finishing while someone watches the
dashboard should update it. WebSockets on serverless are awkward; Server-Sent
Events or polling with an `ETag` are the realistic options. _Done when:_ a new
run appears without a manual refresh.

**Report export and scheduled generation.**
The reports page lists reports and offers a share action; there is no export and
no scheduler. _Done when:_ a weekly report can be generated on a schedule and
exported in at least one real format.

**Multi-tenancy.**
Not just the authorization above: organizations, membership, roles, and the
`Membership` and `AuditEvent` models already in the schema becoming reachable
through the API.

**Flaky-test remediation workflow.**
Flaky tests are detected and displayed with a suggested action. Nothing acts on
the suggestion. _Done when:_ a quarantine can be opened, tracked and closed
through the UI.

---

## 4. Testing

**Coverage of the excluded modules.**
`src/lib/db.ts`, `src/lib/demo/**` and `src/types/**` sit outside the coverage
scope. The demo data is deterministic fixture data and the exclusion is
defensible; `db.ts` is not — it is the module every query depends on. _Done
when:_ `db.ts` is covered, probably by extending the database job.

**Page-composition coverage.**
Page composition is covered end to end and the components are covered by unit
tests, with nothing in between. A page that renders the wrong data in the right
hierarchy can pass both. _Done when:_ at least the data-shaping layer of the
busiest pages has direct tests.

**Mutation testing.**
The suite is strong on behaviour and would not notice a test that asserts
nothing. Stryker on the domain modules — classifier and gate evaluator — would
answer whether 341 tests are actually constraining anything. _Done when:_ the
domain survives a mutation run above a stated score.

**Contract tests for the ingestion payload.**
The zod schema is validated, and the CI workflow that would send real payloads is
the kind of thing that drifts from the schema until it 400s in production.
_Done when:_ a fixture payload per consumer, validated in CI.

**Flake budget.**
One retry was added locally for load-induced Firefox timeouts. A retry can hide a
real regression, so the flake rate should be measured rather than absorbed.
_Done when:_ CI reports the flaky count as a gate rather than a notice.

---

## 5. Infrastructure and release

**Actually deploy it.**
`vercel.json` is correct and the demo-deploy guard is verified, but the project
has never been deployed. A live URL is the single highest-value item on this
list for a portfolio. _Done when:_ the deployment serves a non-demo build and
`POST /api/ingress` without a token returns 401 or 503.

**Release automation.**
`v1.0.0` is signed and manual. Releases should produce a changelog from
conventional commits and attach build provenance. _Done when:_ a tag produces a
GitHub release automatically.

**Docker image build in CI.**
The Dockerfile produces a standalone output that has never been built by the
pipeline. An untested Dockerfile is a broken deployment path that looks working.
_Done when:_ CI builds the image and runs the health check against it.

**Preview environments per pull request.**
Preview deployments would need a database per preview, which is why the demo
mode exists. Wiring them together is the missing half of the demo-mode story.
_Done when:_ every PR gets a URL.

**Dependabot for the Docker base image.**
The image tag is not watched, so a base-image CVE will not raise a pull request
the way the lockfile ones do.

**Backup and restore for the database.**
No plan exists for the data this is designed to hold. _Done when:_ a restore has
been performed at least once, from a documented procedure.

---

## 6. Technical debt, named

**Prisma migration — 7, or 8.**
Dependabot proposed 6 → 7 and it was refused on purpose, not on a whim. It is
not a dependency bump: the Rust-free `prisma-client` generator makes `output`
required, so every `PrismaClient` import in the tree changes; a driver adapter
is now required for every database; the package ships as an ES module;
environment variables stop loading by default, which reaches the CLI, the
integration job and the e2e server; and both the connection pool defaults and
SSL certificate validation change. Those last two are why this cannot be
deferred indefinitely — the project has never been deployed against a managed
Postgres, and they are exactly what changes on the first deploy to one.

Prisma 8 is already released, so 6 → 8 is one migration rather than two, and
the version is better chosen when the work is done than inherited from a pull
request that predates it. One supply-chain note for whoever starts: the 7.10.0
build is not attested, where 6.19.3 is. _Done when:_ the schema, the client
construction, the CI job and the database integration tests all work on the
chosen major.

**The `deepmerge-ts` override.**
Exists only because `@prisma/config` pins a vulnerable version exactly. It
should be deleted the moment upstream moves. _Done when:_ `pnpm audit --prod` is
clean with no override in `pnpm-workspace.yaml`.

**`next build` mutates `tsconfig.json`.**
It re-adds `allowJs` and appends type paths for whichever `distDir` was used, so
a build can leave a dirty tree. Tolerable, documented, and mildly unpleasant.
_Done when:_ a build leaves no diff.

**`generateId` gains a prefix parameter.**
Added during the ingestion work to keep `run_` prefixed IDs while moving to
`crypto.randomUUID`. A one-off parameter added under pressure is exactly the
kind of thing that should be revisited once.

**Four security headers defined once — verify it stays that way.**
`vercel.json` and `next.config.ts` both declared them until the duplication was
removed. The regression risk is a platform config re-adding them.
_Done when:_ a gate asserts the headers exist in the served response.

---

## What is deliberately not on this list

**Rewriting anything in TypeScript strict, with `noUncheckedIndexedAccess`,**
because it is already that.

**Adding an AI classifier.** The classifier is deterministic on purpose
([ADR 0001](decisions/0001-deterministic-classification.md)) and the AI gateway
is off the decision path. Adding a model to that path would undo the best
property this codebase has.

**More dashboards.** Eleven routes and one data source. Breadth is not the
constraint here; the gap between what is displayed and what is stored is.

**A larger test count.** 341 unit and 743 end-to-end tests already exist. Adding
numbers without adding confidence is the failure mode this project's gates were
built to prevent.
