#!/usr/bin/env bash
#
# The local gate. Everything that has to be true before a commit is worth
# making, in the order that fails fastest.
#
# Every step's exit code is checked individually. Piping through `tail` or
# `&&` hides the status of everything upstream of the last command in the
# chain, and a gate that reports success while a middle step failed is worse
# than no gate at all.

set -uo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.." || exit 1

# ── output ──────────────────────────────────────────────────────────────────

if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'
  BOLD=$'\033[1m'; DIM=$'\033[2m'; RESET=$'\033[0m'
else
  RED=''; GREEN=''; YELLOW=''; BOLD=''; DIM=''; RESET=''
fi

FAILED=()
STEP_NO=0

step() {
  STEP_NO=$((STEP_NO + 1))
  printf '\n%s[%d/%d] %s%s\n' "$BOLD" "$STEP_NO" "$TOTAL_STEPS" "$1" "$RESET"
}

pass() { printf '      %s✓ %s%s\n' "$GREEN" "$1" "$RESET"; }
fail() {
  printf '      %s✗ %s%s\n' "$RED" "$1" "$RESET"
  FAILED+=("$STEP_NO")
}
skip() { printf '      %s— %s (skipped)%s\n' "$DIM" "$1" "$RESET"; }

# ── steps ───────────────────────────────────────────────────────────────────

TOTAL_STEPS=6

printf '%sReleaseSignal local gate%s\n' "$BOLD" "$RESET"

step "Formatting (prettier --check)"
if npx prettier --check . > /tmp/rs-format.log 2>&1; then
  pass "formatting is consistent"
else
  fail "unformatted files - run: pnpm format"
  tail -20 /tmp/rs-format.log | sed 's/^/        /'
fi

step "Type check (tsc --noEmit)"
if npx tsc --noEmit > /tmp/rs-tsc.log 2>&1; then
  pass "no type errors"
else
  fail "type errors"
  head -20 /tmp/rs-tsc.log | sed 's/^/        /'
fi

step "Lint (eslint)"
if npx eslint . > /tmp/rs-lint.log 2>&1; then
  pass "no lint problems"
else
  fail "lint problems"
  tail -30 /tmp/rs-lint.log | sed 's/^/        /'
fi

step "Unit tests with coverage (vitest)"
if npx vitest run --coverage > /tmp/rs-test.log 2>&1; then
  # vitest colourises its summary even when stdout is a file, so the leading
  # ANSI escape defeats the `^ *Tests` anchor and the escape codes themselves
  # would land in the middle of the printed line. Strip them once, then read
  # both summaries from the clean copy.
  sed -E 's/\x1b\[[0-9;]*m//g' /tmp/rs-test.log > /tmp/rs-test.clean
  TEST_SUMMARY=$(grep -E '^[[:space:]]*Tests[[:space:]]' /tmp/rs-test.clean | tail -1)
  pass "${TEST_SUMMARY:-all unit tests passed}"
  grep -E '^(Statements|Branches|Functions|Lines)[[:space:]]+:' /tmp/rs-test.clean | sed 's/^/        /'
else
  fail "unit tests or coverage threshold failed"
  tail -40 /tmp/rs-test.log | sed 's/^/        /'
fi

step "Repository gates (secrets, links, attribution)"
REPO_OK=1
for script in check-secrets check-links check-attribution; do
  if npx tsx "scripts/${script}.ts" > "/tmp/rs-${script}.log" 2>&1; then
    pass "${script}"
  else
    fail "${script}"
    sed 's/^/        /' "/tmp/rs-${script}.log" | tail -25
    REPO_OK=0
  fi
done

step "Production build (next build)"
if [ "${SKIP_BUILD:-}" = "1" ]; then
  skip "next build (SKIP_BUILD=1)"
elif NEXT_PUBLIC_DEMO_MODE=true npx next build > /tmp/rs-build.log 2>&1; then
  pass "build succeeded"
  if npx tsx scripts/verify-build.ts > /tmp/rs-verify.log 2>&1; then
    pass "build artefacts verified"
  else
    fail "build verification"
    sed 's/^/        /' /tmp/rs-verify.log
  fi
else
  fail "build failed"
  tail -40 /tmp/rs-build.log | sed 's/^/        /'
fi

# ── verdict ─────────────────────────────────────────────────────────────────

printf '\n%s────────────────────────────────────────%s\n' "$DIM" "$RESET"
if [ "${#FAILED[@]}" -eq 0 ]; then
  printf '%s%sGATE GREEN%s  all %d steps passed\n' "$BOLD" "$GREEN" "$RESET" "$TOTAL_STEPS"
  exit 0
fi

printf '%s%sGATE RED%s  failing step(s): %s\n' "$BOLD" "$RED" "$RESET" "${FAILED[*]}"
printf '%s  A red gate is not finished work. Fix it before committing.%s\n' "$YELLOW" "$RESET"
exit 1