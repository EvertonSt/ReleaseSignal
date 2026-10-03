# 0002 — Parse every request body; never destructure `any`

**Status:** accepted · **Date:** 2026-10-02

## Context

The original route handlers all began the same way:

```ts
const body = await request.json(); // typed `any`
const { totalTests, branch, gateId } = body;
```

Nothing in the rest of the handler could be checked by the compiler. `body` was
`any`, every destructured field was `any`, and `totalTests ?? 100` type-checked
even when a caller posted `{"totalTests": "many"}` — which then reached an
arithmetic comparison and a database write.

Enabling the type-aware ESLint tier made this visible: 38
`no-unsafe-assignment` errors across two handlers, every one of them a real
escape hatch rather than a false positive.

## Decision

Every route body goes through one reader,
[`readJson`](../../src/lib/api/body.ts), which parses against a zod schema
before a single field is read.

```ts
const EvaluateBody = z.object({
  gateId: z.string().optional(),
  totalTests: z.number().int().min(0).optional(),
  testCoverage: z.number().min(0).max(100).optional(),
  // …
});

const input = await readJson(request, EvaluateBody);
```

Three consequences fall out of that signature:

1. **Malformed JSON returns 400**, not 422. The caller did not send JSON at all,
   which is a different mistake from sending JSON in the wrong shape.
2. **A wrong shape returns 422 with the offending field named.** A handler that
   returns "Validation failed" sends the caller hunting.
3. **An internal error returns a generic message in production.** The detail
   stays in the server log; a connection string in an API response is a
   disclosure bug.

## Alternatives considered

**Casting through `unknown`.** Rejected. It silences the same lint errors while
preserving every runtime problem. The point was never to make the type checker
quiet.

**Type the handlers and validate deeper in.** Rejected. Validation that runs
after the data has been destructured cannot stop a field from being used
unvalidated, and each handler ends up doing it slightly differently.

**Trust the type after one cast.** Rejected on the same grounds.

## Consequences

- Schema and handler live next to each other, so a route's contract is readable
  in one screen.
- Adding an endpoint means writing a schema. That is the intended friction: an
  unvalidated endpoint should require a decision, not a default.
- The same principle applies outward. The AI gateway parses provider responses
  through zod envelopes rather than reading `json.choices[0]` off an `any`.
