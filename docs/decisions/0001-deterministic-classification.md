# 0001 — Failure classification is deterministic, not model-driven

**Status:** accepted · **Date:** 2026-10-02

## Context

ReleaseSignal decides whether a test failure should stop a release. That is a
decision with consequences: a false _block_ costs a team an afternoon, and a
false _pass_ ships a regression. Both errors are expensive, which puts pressure
on the classification layer to be right in a way most of this codebase does not.

The obvious implementation is to ask a model. It is also the one that is hardest
to defend when a release is held.

## Decision

Classification runs on **fourteen ordered, deterministic rules** in
[`classifier.ts`](../../src/lib/failure-analysis/classifier.ts). Each rule
examines the normalised error signature, stack frames, retry history, branch and
frequency, and contributes a score to a fixed set of buckets: `regression`,
`environment`, `flaky`, `test_defect`, `unknown`.

Every result carries `matchedRule` and `evidence` — the rule that fired and the
inputs it fired on.

An AI gateway exists in the codebase
([`gateway.ts`](../../src/lib/ai/gateway.ts)). It is **not in the decision
path**. It can be used to explain a failure in prose; it cannot decide whether
the release ships.

## Alternatives considered

**Model-first classification.** Rejected. A wrong answer would arrive with a
confidence number and no way to check it. When someone asks "why did this block
my release", the answer has to be a rule they can read and disagree with.

**Hybrid with a confidence gate.** Rejected for now. It doubles the surface area
that has to be correct and defers the hard question — what happens at 0.6
confidence — to a later version. Worth revisiting once the deterministic rules
have enough production data to be measured against.

**Rules only, no confidence at all.** Rejected. Confidence is useful, as long as
it is derived from rule agreement rather than a model's self-assessment.

## Consequences

- A classification is reproducible: same input, same output, forever.
- Every decision is explainable in one sentence naming a rule.
- Adding a language or framework means adding a rule, and the rule is reviewable
  like any other code.
- The system does not recognise failure shapes nobody has written a rule for.
  It says `unknown` and asks for triage, which is the honest answer and routes
  to the human path by design.
- A non-trivial amount of work went into failure normalisation
  (`normalizeError`, `extractStackFrames`, `generateSignature`) that a model
  approach would have skipped entirely. That work is what makes clustering
  stable across runs.
