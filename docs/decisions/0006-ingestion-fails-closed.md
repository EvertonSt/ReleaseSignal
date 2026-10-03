# 0006 — The ingestion endpoint fails closed

**Status:** accepted · **Date:** 2026-10-02

## Context

Reading `src/app/api/ingress/route.ts` to document it for the CI work turned up
a doc comment describing a security control the handler did not contain:

```ts
/**
 * POST /api/ingress — Ingest test results from a CI pipeline.
 *
 * Response:
 *   401 — Missing or invalid API key (production only)
 */
export async function POST(request: NextRequest) {
  const requestId = `req_${Date.now().toString(36)}_${Math.random()...}`;
```

`grep` for `Authorization` across `src/app/api/` returned this one comment and
nothing else. The header was never read. The endpoint accepted an anonymous
`POST` from anyone who could reach it, in every environment, and returned `201`.

This is precisely the failure mode [0004](0004-remove-dead-stubs.md) was written
about: a signature that promises a guard the body does not implement. There it
was a stub returning `null` under an `async` signature; here it was a documented
`401` over an unauthenticated write path. The severity is higher, because the
data behind this endpoint is the input to every gate decision the product makes.
A forged CI result is not a cosmetic problem — it is the whole product
accepting fabricated evidence.

## Decision

Implement the check, and make the unconfigured case **fail closed**.

`src/lib/ingress/auth.ts`:

| Condition                                      | Result |
| ---------------------------------------------- | ------ |
| Demo mode (`NEXT_PUBLIC_DEMO_MODE === "true"`) | allow  |
| `INGEST_API_KEY` set, bearer token matches     | allow  |
| `INGEST_API_KEY` set, token missing or wrong   | `401`  |
| `INGEST_API_KEY` unset, not demo mode          | `503`  |

The `503` is the decision that matters. The obvious implementation is "if a key
is configured, require it; otherwise let the request through" — which is
fail **open**, and means a deployment that forgets one variable accepts
anonymous writes to the ingestion endpoint. Failing closed turns a silent
misconfiguration into a loud, self-describing 503 that names the missing
variable.

The comparison is constant-time. `timingSafeEqual` throws on a length mismatch
and leaks length through that check, so both sides are hashed to a fixed 32
bytes with SHA-256 first. A bare `!==` on the raw string is exactly the bug this
avoids.

Verified over HTTP, not just in unit tests — three builds, seven probes:

```console
no INGEST_API_KEY, no token      -> 503   fails closed
no INGEST_API_KEY, with token    -> 503   still closed
key set, no token                -> 401
key set, wrong token             -> 401
key set, correct token           -> 503 from Prisma: DATABASE_URL unset
                                 -> auth passed; the failure is downstream
```

The last line is the one worth noting: reaching the database layer is the proof
that the token was accepted, in a machine with no database configured.

## The trap: `NEXT_PUBLIC_*` is baked in at build time

The first version of that probe was wrong, and the way it was wrong is worth
recording because it will bite anyone testing this locally.

All three servers were started with `NEXT_PUBLIC_DEMO_MODE` unset, and all three
accepted unauthenticated writes anyway. The build had been made with
`NEXT_PUBLIC_DEMO_MODE=true` — and Next.js **inlines** `NEXT_PUBLIC_*` variables
into the bundle at build time, including the copy the server reads at runtime.
Setting the variable when starting the server changes nothing.

Consequences, both of them real:

- A build produced with `NEXT_PUBLIC_DEMO_MODE=true` has demo mode compiled in
  and **cannot** be switched off at runtime. The auth bypass in `authorizeIngest`
  is not something a demo build can be talked out of.
- Therefore a demo build must never be deployed. The demo banner is the only
  thing telling a visitor, and a visitor is exactly who must not be able to
  write to the ingestion endpoint.

This is now stated in the README's deployment section rather than left as a
thing to rediscover.

## Also fixed while in the file

Three identifiers still used `Math.random()`:

```ts
// route.ts (x2)
`req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
// processor.ts
`run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
```

`generateId()` in `src/lib/utils.ts` was already fixed to use
`crypto.randomUUID()` — but in one place. The three siblings were missed, which
is what happens when a fix lands as an edit rather than as a search. Run IDs are
also guessable from a known ingest timestamp, so the timestamp prefix was not
buying anything.

`generateId()` now takes an optional prefix. The `run_` prefix stays — an e2e
test matches on it and it is what makes a log line readable — but the body is a
UUID. A prefix is a label, not part of the randomness.

## Alternatives considered

**Correct the doc comment to match the code** (drop the `401` line). Cheaper, and
it would have made the code honest. Rejected because it documents an
unauthenticated write endpoint as an intentional design rather than a gap, and
the next reader would have no reason to revisit it.

**Fail open when unconfigured, log a warning.** The conventional choice for a
demo-friendly app: never break a developer's local setup. Rejected. A missing
variable is not a developer's local setup, it is a production deployment that
silently accepts forgery. Demo mode already exists as the explicit escape hatch,
so failing open in the non-demo case buys nothing and costs the guarantee.

**Use the Auth.js session instead of a bearer token.** Inconsistent with the
endpoint's purpose: a CI pipeline has no user session, and forcing one would mean
minting a long-lived token per pipeline — strictly more machinery for the same
trust decision.

**Rate-limit instead of authenticate.** Rate limiting is already in the codebase
and is worth having, but it bounds the damage from an authenticated attacker; it
does nothing about an anonymous one. Not a substitute.

## Consequences

- `POST /api/ingress` is authenticated in every non-demo environment, and refuses
  to run unconfigured rather than running wide open.
- 19 new unit tests cover the token parsing, the timing-safe comparison, the
  fail-closed default, and the demo-mode exemption — including that demo mode
  only unlocks on the exact string `"true"`, so `1`, `yes` and `TRUE` do not.
- The e2e suite still passes at 735/735 because it runs in demo mode, which is
  the documented exemption.
- `INGEST_API_KEY` is documented in `.env.local.example` with the generation
  command and the fail-closed behaviour spelled out, because a variable nobody
  knows about is a variable nobody sets — which is the failure case above.
