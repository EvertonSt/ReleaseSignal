# 0005 — Known vulnerabilities get patched, not documented

**Status:** accepted · **Date:** 2026-10-02

## Context

Writing the security job in CI meant deciding what "green" means for a
dependency audit. Before that question had an answer, the answer had to be
tested:

```console
$ pnpm audit --prod --audit-level=high
3 vulnerabilities found
Severity: 2 high | 1 critical
```

The critical one was not in some corner of the toolchain. It was the framework:

| Package | Advisory                                 | Range              | Patched    |
| ------- | ---------------------------------------- | ------------------ | ---------- |
| `next`  | GHSA-vcvr-r3jv-pc5j — RCE in `next/og`   | `>=16.2.0 <16.3.6` | `>=16.3.6` |
| `sharp` | GHSA-rgj7-g3m4-5g8c, GHSA-g89c-p67h-r497 | `<0.35.4`          | `>=0.35.4` |

The repository shipped `next@16.3.3`, inside the vulnerable range.

The honest reading is that exposure here is low: `grep` finds no import of
`next/og` and no `ImageResponse` anywhere in `src/` or `e2e/`, so the vulnerable
code path is not reachable in this application. That argument is exactly how a
critical advisory stays open for three years. A security job that is red on day
one gets muted, and then it is not checking anything.

## Decision

**Patch the framework, and do it now.**

`next` and `eslint-config-next` moved together to **16.3.8** — a patch bump
inside the same minor, which is the lowest-risk kind of upgrade available. The
two were moved in lockstep because they are released from the same tag and
`eslint-config-next@16.3.3` against `next@16.3.8` is a version skew the lint
tier would eventually complain about.

pnpm's release-age window would have blocked the upgrade by default. The
packages are named explicitly in `minimumReleaseAgeExclude` in
`pnpm-workspace.yaml`, with a comment recording _why_ — which is the part that
matters when someone reads that file in six months and wonders whether the entry
can go.

## The second finding: an advisory with no upstream fix

After the upgrade one high advisory remained:

```console
$ pnpm why deepmerge-ts
deepmerge-ts@7.1.5
└─┬ @prisma/config@6.19.3
  └─┬ prisma@6.19.3
```

GHSA-ggr8-5vv4-36mx, prototype pollution in `deepmerge-ts < 8.0.0`. The
deciding detail is that `@prisma/config` depends on it by **exact version**,
`"deepmerge-ts": "7.1.5"` — not a range. Prisma 7.10.0, the newest stable
release, still pins 7.1.5. There is no version of Prisma to upgrade to that
clears this.

Forced the major bump anyway, via `overrides` in `pnpm-workspace.yaml`:

```yaml
overrides:
  deepmerge-ts: 8.0.2
```

**`overrides` goes in `pnpm-workspace.yaml`, not in the `pnpm` key of
`package.json`.** pnpm 11 no longer reads it there, and the failure mode is
worth recording because it is silent:

```console
$ pnpm install
[WARN] The "pnpm" field in package.json is no longer read by pnpm.
        The following keys were ignored: "pnpm.overrides".
```

Install exits 0, the lockfile does not change, and `pnpm why` still reports
7.1.5. A security fix that appears to apply and does not is worse than one that
was never attempted, so this is called out in the file itself.

## Why the override is safe here

Forcing a major version on an exact vendor pin is normally the wrong move. It
is defensible in this case because the surface actually used is one symbol:

```js
// node_modules/.pnpm/@prisma+config@6.19.3/.../dist/index.js:894
const { deepmerge } = await import("deepmerge-ts");
```

- One named import. No default export, no namespace use, no internal paths.
- Both versions are ESM with the same `exports` shape.
- Both declare `engines.node` satisfied by this project.
- 8.0.0 is the release that ships the fix. The major bump exists to deliver
  the security patch, not to signal an incompatible redesign.

The claim is verified rather than argued: `prisma generate`, the production
build, 310 unit tests and 735 end-to-end tests all run in CI on every commit.
A silent break in config merging fails the build the same day it lands.

## Alternatives considered

**Leave the audit red and document the advisory in the README.** Rejected. A
permanently red security job is a job that has stopped working — the classic
outcome of a blanket audit gate nobody can ever satisfy.

**Exclude the path with `pnpm.auditConfig.ignoreCves`.** Same problem in a
different wrapper: it converts "we accept this risk" into a line that reads like
"we checked and there is nothing here".

**Migrate to Prisma 7 or 8.** Prisma 8 is at `8.0.0-rc.19`; the stable line
still pins the vulnerable version, so this would be a major schema and client
migration that does not even fix the finding. Disproportionate.

**Run the audit at `critical` only, and call the day done.** The
twice-audited shape this repository already uses: the production tree is held
to `high`, the development tree to `critical`. That is honest about the
dev-toolchain tail while still failing on anything in shipped code. The `high`
advisories that remain are all in the development tree.

## Consequences

- `pnpm audit --prod --audit-level=high` reports **no known vulnerabilities**.
- `pnpm audit --audit-level=critical` exits 0. The development tree carries 6
  high and 2 moderate advisories, all transitive.
- The security job in `.github/workflows/ci.yml` is green on arrival, which is
  the only state in which a security job is worth having.
- `pnpm-workspace.yaml` now carries an override and a release-age exclusion
  list. Both are commented with the reason, because a bare override is
  indistinguishable from a mistake six months from now.
- A future `pnpm install` that upgrades `@prisma/config` past 7.1.5 should have
  the override removed and `pnpm audit` re-run — noted here so the next person
  knows the exit condition rather than only the entry.
