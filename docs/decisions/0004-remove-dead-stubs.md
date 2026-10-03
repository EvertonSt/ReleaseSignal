# 0004 — Dead stubs are deleted, not decorated

**Status:** accepted · **Date:** 2026-10-02

## Context

`src/lib/github/client.ts` exported two functions that could only ever resolve to
`null`:

```ts
/** Get installation access token (placeholder) */
export async function getInstallationToken(_installationId: number): Promise<string | null> {
  if (!isGitHubConfigured()) return null;
  // In production, use GitHub App JWT to get installation token
  // For now, return null to indicate "not implemented"
  return null;
}
```

Nothing called either function. The `async` keyword and the `Promise<string>`
return type both promise a network call that never happens — so a caller reading
only the signature has no way to tell the difference between "implemented and
returned nothing" and "not implemented".

`@typescript-eslint/require-await` flagged both, which is how the question got
asked at all.

## Decision

Deleted. What remains in the module is real and tested: `isGitHubConfigured()`
and `getIntegrationStatus()`, which read the environment and report accurately.

The same pattern elsewhere:

| Removed                                                      | Replaced by                                                               |
| ------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `getInstallationToken`, `createCheckRun` stubs               | A README entry under _Honest status_ saying publishing is not implemented |
| `JSON.parse(JSON.stringify(...)) as any` around gate results | An explicit field projection that also documents the Json column          |
| A hard-coded `version: "0.1.0"` in the health route          | An import from `package.json`                                             |
| An `async` `getOrganizationId()` that returned a constant    | A sync function with a `TODO` naming the real source                      |

## Alternatives considered

**Keep them, marked `@deprecated`.** Rejected. The function is not deprecated —
it never worked. `@deprecated` would suggest a working thing that was retired.

**Keep them and implement them.** Tempting, but writing a GitHub App JWT
exchange that cannot be tested without live credentials would be worse: it would
move the dishonesty from the signature into the body.

**Return a `Result` type instead of `null`.** The right shape, once the call is
implemented. Not worth a type that only one unimplemented function uses today.

## Consequences

- The module is smaller and every export in it works.
- The ESLint tier needs no `require-await` exception for this file.
- A reader of the README learns the real state of the project from the README,
  rather than from a comment that says "not implemented" next to a signature
  promising otherwise.
