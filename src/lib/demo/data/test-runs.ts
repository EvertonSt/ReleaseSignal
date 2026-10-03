import type { GateDecision, RunStatus, TestRun } from "@/types";
import { demoRepos } from "./organizations";
import { cycle } from "./cycle";

const now = new Date();
const dAgo = (n: number) => new Date(now.getTime() - n * 86400000);

const BRANCHES = [
  "main",
  "main",
  "main",
  "feat/auth-v2",
  "fix/dashboard-leak",
  "chore/deps-update",
  "feat/perf-optimization",
] as const;
const STATUSES: readonly RunStatus[] = [
  "passed",
  "passed",
  "passed",
  "passed",
  "passed",
  "failed",
  "passed",
  "passed",
  "passed",
  "failed",
];
const TRIGGERS = ["push", "pull_request", "schedule", "workflow_dispatch"] as const;
const ACTORS = ["Everton Andrade", "Sarah Chen", "Marcus Johnson", "Priya Patel"] as const;
const COMMIT_MESSAGES = [
  "feat: add new dashboard widget",
  "fix: resolve auth token refresh",
  "chore: update dependencies",
] as const;

export function generateTestRuns(count = 60): TestRun[] {
  const runs: TestRun[] = [];

  for (let i = 0; i < count; i++) {
    const dayOffset = Math.floor(i / 2);
    const repo = cycle(demoRepos, i);
    const branch = cycle(BRANCHES, i);
    const status = cycle(STATUSES, i);
    const actor = cycle(ACTORS, i);

    const totalTests = 180 + Math.floor(Math.sin(i * 0.5) * 40);
    const failedCount = status === "failed" ? 2 + (i % 5) : i % 7 === 0 ? 1 : 0;
    const flakyCount = i % 4 === 0 ? 1 + (i % 3) : 0;
    const passedCount = totalTests - failedCount - flakyCount - Math.floor(Math.abs(Math.sin(i * 0.7) * 3));
    const skipped = Math.max(0, totalTests - passedCount - failedCount - flakyCount);
    const duration = 45000 + Math.floor(Math.sin(i * 0.3) * 15000) + i * 100;
    const gateDecision: GateDecision = failedCount > 3 ? "blocked" : failedCount > 0 ? "warning" : "pass";
    const isPullRequest = i % 5 === 0;

    runs.push({
      id: "run_" + String(i + 1).padStart(3, "0"),
      organizationId: "org_demo_001",
      repositoryId: repo.id,
      repository: repo,
      branch,
      commitSha: ((0xdead + i).toString(16) + (0xbeef + i * 7).toString(16)).substring(0, 7),
      commitMessage: cycle(COMMIT_MESSAGES, i),
      pullRequest: isPullRequest
        ? {
            number: 100 + i,
            title: "Add dashboard analytics",
            url: "https://github.com/acme/acme-web/pull/" + (100 + i),
            author: actor,
          }
        : undefined,
      environment: isPullRequest ? "staging" : "ci",
      status,
      startedAt: dAgo(dayOffset),
      finishedAt: new Date(dAgo(dayOffset).getTime() + duration),
      duration,
      totalTests,
      passed: Math.max(0, passedCount),
      failed: failedCount,
      skipped,
      flaky: flakyCount,
      retried: flakyCount + (status === "failed" ? 2 : 0),
      gateDecision,
      browser: i % 3 === 0 ? "Chromium" : i % 3 === 1 ? "Firefox" : "WebKit",
      trigger: cycle(TRIGGERS, i),
      actor,
      failureClusters: [],
    });
  }

  return runs;
}

export const demoTestRuns = generateTestRuns();
