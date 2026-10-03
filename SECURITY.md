# Security Policy

## Reporting a vulnerability

Use **GitHub's private vulnerability reporting** on this repository:
_Security_ → _Advisories_ → _Report a vulnerability_. That opens a private
channel visible only to the maintainer, and it needs no email address to be
published correctly.

If private reporting is unavailable to you, open an issue that says only "security
report available on request" with no technical detail, and wait for a response.

What to expect: an acknowledgement within a few days, and an assessment within a
week. This is a portfolio project maintained by one person, so "within a week"
means one person looking at it in the evenings, not a triage rota.

If a report turns out to be a known limitation already described in
[`README.md`](README.md#honest-status) or in [`docs/decisions/`](docs/decisions),
you will get a straight answer saying so rather than a delay.

## Supported versions

| Version  | Supported |
| -------- | --------- |
| `main`   | yes       |
| `v1.0.0` | yes       |

There is no backport policy. This is a single-maintainer portfolio project; the
honest version of "security fixes for old versions" is "upgrade to main".

## The ingestion endpoint

`POST /api/ingress` is the only write path a third party can reach. Everything
else in the API either reads demo data or sits behind the GitHub session.

### Authorization

```http
POST /api/ingress
Authorization: Bearer <INGEST_API_KEY>
Content-Type: application/json
```

- The token is compared against `INGEST_API_KEY` in **constant time**, over
  SHA-256 digests of both sides. `timingSafeEqual` leaks the length of its
  inputs through its argument check, so hashing first removes that channel.
- **The endpoint fails closed.** With no `INGEST_API_KEY` configured and demo
  mode off, it answers `503` and names the missing variable. It never falls back
  to accepting an anonymous write — that failure mode would let anyone forge the
  CI results every gate decision is derived from.
- A wrong or missing token is `401`. A repeated `idempotencyKey` is `409`, which
  is enforced in the database, so it survives a redeploy.

Set the key with `openssl rand -base64 32`.

### The demo-mode hazard

**This is the single most important thing on this page.**

`NEXT_PUBLIC_DEMO_MODE` is inlined into the bundle by Next.js at **build time**.
A build made with it set to `true`:

- compiles demo mode in permanently — restarting the server with the variable
  unset does **not** turn it off;
- skips the authorization check above entirely;
- leaves `POST /api/ingress` accepting anonymous writes.

Therefore:

- **Never deploy a build made with `NEXT_PUBLIC_DEMO_MODE=true`.**
- `next.config.ts` **refuses to build** for Vercel when demo mode is enabled,
  unless `ALLOW_DEMO_BUILD=1` is set deliberately. The end-to-end suite builds in
  demo mode on purpose and sets no such variable, because it is not deploying.
- `vercel.json` deliberately does not set the variable. It used to, which would
  have deployed exactly this build.
- To check a deployment: `GET /api/ingress` is harmless, but
  `POST /api/ingress` with **no** `Authorization` header must answer `401` or
  `503`. A `201` means a demo build is live, and the endpoint is open.

### What a correct deployment sets

| Variable                       | Why                                             |
| ------------------------------ | ----------------------------------------------- |
| `DATABASE_URL`                 | Postgres connection string — a real secret      |
| `AUTH_SECRET`                  | Session signing, from `openssl rand -base64 32` |
| `INGEST_API_KEY`               | The bearer token above                          |
| `GITHUB_CLIENT_ID` / `_SECRET` | GitHub OAuth, only if you want real sign-in     |

`NEXT_PUBLIC_DEMO_MODE` must be absent or `false`.

## Other controls

| Area                | Control                                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Webhooks            | HMAC-SHA256 verified with `timingSafeEqual`; a malformed digest returns `false` and never throws                                                 |
| Secrets in logs     | 17 credential shapes redacted before anything is logged                                                                                          |
| Request bodies      | Parsed and validated with zod at the boundary; a non-object is `422`, a bad schema `400`                                                         |
| Rate limiting       | Token bucket per key with a refill ceiling and `Retry-After`                                                                                     |
| Transport / framing | `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` — defined once in `next.config.ts` so Vercel and Docker cannot drift |

### Known limitations

Stated here rather than left for a reader to discover:

- **Rate limiting is implemented, tested, and not wired to anything.** The token
  bucket in `src/lib/security/rate-limit.ts` has a full test suite, and **no route
  calls it** — `checkRateLimit` is referenced only by its own module and its own
  tests. So it currently protects nothing, and `/api/ingress` in particular is
  unthrottled: a leaked key can be used without limit. It is listed in the README
  as a primitive the repository owns, which is true; this line is here so nobody
  reads that as "rate limiting is active in production".
- **Multi-tenant isolation is not implemented.** `getOrganizationId()` returns a
  single constant organization, so one token can write into that organization's
  data. There is no per-tenant authorization model yet.
- **CI holds the production dependency tree to `high` and the development tree to
  `critical`.** Six high and two moderate advisories remain in the development
  tree by design; none are in shipped code. The reasoning is in
  [`.github/workflows/ci.yml`](.github/workflows/ci.yml).
- **One transitive advisory is held by an override rather than a release.**
  `@prisma/config` pins a vulnerable `deepmerge-ts` exactly, and Prisma has not
  shipped a fix. See
  [`0005-patch-known-vulnerabilities.md`](docs/decisions/0005-patch-known-vulnerabilities.md).
- **The Prisma write branch has no authorization beyond the bearer token** — no
  row-level checks, because there are no tenants to check against yet.

## How this is kept true

Not by assertion. Each of these is enforced by a gate that fails:

| Guarantee                                          | Enforced by                                                              |
| -------------------------------------------------- | ------------------------------------------------------------------------ |
| No credentials committed                           | `scripts/check-secrets.ts` and the CI readiness job                      |
| No AI attribution in any commit                    | `.husky/commit-msg` plus `scripts/check-attribution.ts` across every ref |
| No known high advisory in production dependencies  | CI security job                                                          |
| A demo build cannot be deployed to Vercel          | the build guard in `next.config.ts`                                      |
| Unauthorised ingestion writes are refused          | 19 unit tests and 8 end-to-end tests over real HTTP                      |
| The authorization check still exists               | neutering it turns 7 of those 8 end-to-end tests red                     |
| The Prisma branch persists and honours idempotency | a CI job against a real PostgreSQL container                             |
