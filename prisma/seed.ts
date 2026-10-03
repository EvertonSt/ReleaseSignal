// ── ReleaseSignal Seed Script ───────────────────────────────────────────
// Populates PostgreSQL with the full demo dataset.
// Usage: npx tsx prisma/seed.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ORG_ID = "org_demo_001";
const now = new Date();
const dAgo = (n: number) => new Date(now.getTime() - n * 86400000);
const mAgo = (n: number) => new Date(now.getTime() - n * 60000);

/**
 * Wrapping index into a literal list. `noUncheckedIndexedAccess` types
 * `list[i % list.length]` as `T | undefined`, and a non-null assertion would
 * only hide the fact that these lists are fixed, non-empty constants.
 */
function cycle<T>(items: readonly T[], index: number): T {
  const item = items[index % items.length];
  if (item === undefined) throw new Error("cycle() needs a non-empty list");
  return item;
}

async function main() {
  console.log("🌱 Seeding ReleaseSignal database...");

  // ── Users ───────────────────────────────────────────────────────────
  const users = await Promise.all([
    prisma.user.upsert({
      where: { id: "usr_demo_001" },
      update: {},
      create: {
        id: "usr_demo_001",
        name: "Everton Andrade",
        email: "everton@releasesignal.dev",
        githubId: "everton-andrade",
      },
    }),
    prisma.user.upsert({
      where: { id: "usr_2" },
      update: {},
      create: { id: "usr_2", name: "Sarah Chen", email: "sarah@acme.dev" },
    }),
    prisma.user.upsert({
      where: { id: "usr_3" },
      update: {},
      create: { id: "usr_3", name: "Marcus Johnson", email: "marcus@acme.dev" },
    }),
    prisma.user.upsert({
      where: { id: "usr_4" },
      update: {},
      create: { id: "usr_4", name: "Priya Patel", email: "priya@acme.dev" },
    }),
    prisma.user.upsert({
      where: { id: "usr_5" },
      update: {},
      create: { id: "usr_5", name: "Tom Wilson", email: "tom@acme.dev" },
    }),
  ]);
  console.log("  ✓ Users:", users.length);

  // ── Organization ────────────────────────────────────────────────────
  await prisma.organization.upsert({
    where: { id: ORG_ID },
    update: {},
    create: {
      id: ORG_ID,
      name: "Acme Engineering",
      slug: "acme-engineering",
      plan: "custom",
    },
  });
  console.log("  ✓ Organization: Acme Engineering");

  // ── Org Settings ────────────────────────────────────────────────────
  await prisma.orgSettings.upsert({
    where: { organizationId: ORG_ID },
    update: {},
    create: {
      organizationId: ORG_ID,
      timezone: "America/Sao_Paulo",
      defaultBranch: "main",
      qualityGateRequired: true,
      aiEnabled: true,
      dataRetentionDays: 90,
      branding: { logo: null, primaryColor: "#6366f1", accentColor: "#818cf8" },
    },
  });
  console.log("  ✓ OrgSettings");

  // ── Memberships ─────────────────────────────────────────────────────
  const memberships = [
    { id: "mem_1", userId: "usr_demo_001", role: "owner" },
    { id: "mem_2", userId: "usr_2", role: "admin" },
    { id: "mem_3", userId: "usr_3", role: "member" },
    { id: "mem_4", userId: "usr_4", role: "member" },
    { id: "mem_5", userId: "usr_5", role: "viewer" },
  ];
  for (const m of memberships) {
    await prisma.membership.upsert({
      where: { userId_organizationId: { userId: m.userId, organizationId: ORG_ID } },
      update: { role: m.role },
      create: { id: m.id, userId: m.userId, organizationId: ORG_ID, role: m.role },
    });
  }
  console.log("  ✓ Memberships:", memberships.length);

  // ── Repositories ────────────────────────────────────────────────────
  const repoData = [
    {
      id: "repo_1",
      name: "acme-web",
      fullName: "acme-engineering/acme-web",
      lang: "TypeScript",
      status: "connected",
      connected: true,
    },
    {
      id: "repo_2",
      name: "acme-api",
      fullName: "acme-engineering/acme-api",
      lang: "TypeScript",
      status: "connected",
      connected: true,
    },
    {
      id: "repo_3",
      name: "acme-mobile",
      fullName: "acme-engineering/acme-mobile",
      lang: "TypeScript",
      status: "connected",
      connected: true,
    },
    {
      id: "repo_4",
      name: "acme-infra",
      fullName: "acme-engineering/acme-infra",
      lang: "TypeScript",
      status: "connected",
      connected: true,
    },
    {
      id: "repo_5",
      name: "acme-design-system",
      fullName: "acme-engineering/acme-design-system",
      lang: "TypeScript",
      status: "connected",
      connected: true,
    },
    {
      id: "repo_6",
      name: "acme-docs",
      fullName: "acme-engineering/acme-docs",
      lang: "MDX",
      status: "disconnected",
      connected: false,
    },
    {
      id: "repo_7",
      name: "acme-analytics",
      fullName: "acme-engineering/acme-analytics",
      lang: "Python",
      status: "error",
      connected: true,
    },
    {
      id: "repo_8",
      name: "acme-payments",
      fullName: "acme-engineering/acme-payments",
      lang: "TypeScript",
      status: "connected",
      connected: true,
    },
  ];
  for (const r of repoData) {
    await prisma.repository.upsert({
      where: { organizationId_fullName: { organizationId: ORG_ID, fullName: r.fullName } },
      update: { integrationStatus: r.status },
      create: {
        id: r.id,
        organizationId: ORG_ID,
        name: r.name,
        fullName: r.fullName,
        language: r.lang,
        connected: r.connected,
        integrationStatus: r.status,
      },
    });
  }
  console.log("  ✓ Repositories:", repoData.length);

  // ── Workflows ──────────────────────────────────────────────────────
  const workflows = [
    { id: "wf_1", repoId: "repo_1", name: "E2E Tests (Playwright)", path: ".github/workflows/e2e.yml" },
    { id: "wf_2", repoId: "repo_1", name: "Unit Tests", path: ".github/workflows/unit.yml" },
    { id: "wf_3", repoId: "repo_2", name: "API Integration Tests", path: ".github/workflows/api-tests.yml" },
    { id: "wf_4", repoId: "repo_2", name: "Contract Tests", path: ".github/workflows/contract.yml" },
    { id: "wf_5", repoId: "repo_3", name: "Mobile E2E", path: ".github/workflows/mobile-e2e.yml" },
    { id: "wf_6", repoId: "repo_8", name: "Payment Flow Tests", path: ".github/workflows/payment-tests.yml" },
  ];
  for (const wf of workflows) {
    await prisma.workflow.upsert({
      where: { id: wf.id },
      update: {},
      create: { id: wf.id, repositoryId: wf.repoId, name: wf.name, path: wf.path },
    });
  }
  console.log("  ✓ Workflows:", workflows.length);

  // ── Integrations ────────────────────────────────────────────────────
  await prisma.integration.upsert({
    where: { id: "int_github" },
    update: {},
    create: {
      id: "int_github",
      organizationId: ORG_ID,
      type: "github",
      status: "connected",
      config: { appId: "demo_app_id" },
    },
  });
  console.log("  ✓ Integration: GitHub");

  // ── Test Runs (20 representative runs) ──────────────────────────────
  const repoIds = ["repo_1", "repo_1", "repo_2", "repo_3", "repo_1", "repo_2", "repo_1", "repo_3"];
  const branches = [
    "main",
    "main",
    "feat/auth-v2",
    "fix/dashboard-leak",
    "main",
    "chore/deps",
    "feat/perf",
    "main",
  ];
  const statuses = ["passed", "passed", "failed", "passed", "passed", "passed", "failed", "passed"];
  const triggers = ["push", "pull_request", "push", "push", "schedule", "push", "pull_request", "push"];
  const actors = ["Everton Andrade", "Sarah Chen", "Marcus Johnson", "Priya Patel"];
  for (let i = 0; i < 20; i++) {
    const dayOffset = Math.floor(i / 2);
    const repoId = cycle(repoIds, i);
    const branch = cycle(branches, i);
    const status = cycle(statuses, i);
    const total = 180 + Math.floor(Math.sin(i * 0.5) * 40);
    const failedCount = status === "failed" ? 2 + (i % 5) : i % 7 === 0 ? 1 : 0;
    const flakyCount = i % 4 === 0 ? 1 + (i % 3) : 0;
    const passedCount = Math.max(0, total - failedCount - flakyCount - 2);
    const skipped = Math.max(0, total - passedCount - failedCount - flakyCount);
    const duration = 45000 + Math.floor(Math.sin(i * 0.3) * 15000) + i * 100;
    const gateDecision = failedCount > 3 ? "blocked" : failedCount > 0 ? "warning" : "pass";
    const prNum = i % 5 === 0 ? 100 + i : null;
    const browser = i % 3 === 0 ? "Chromium" : i % 3 === 1 ? "Firefox" : "WebKit";

    await prisma.testRun.upsert({
      where: { id: "run_" + String(i + 1).padStart(3, "0") },
      update: {},
      create: {
        id: "run_" + String(i + 1).padStart(3, "0"),
        organizationId: ORG_ID,
        repositoryId: repoId,
        workflowId: i < 6 ? cycle(workflows, i).id : null,
        branch,
        commitSha: ((0xdead + i).toString(16) + (0xbeef + i * 7).toString(16)).substring(0, 7),
        commitMessage:
          i % 3 === 0
            ? "feat: add new dashboard widget"
            : i % 3 === 1
              ? "fix: resolve auth token refresh"
              : "chore: update dependencies",
        prNumber: prNum,
        prTitle: prNum ? "PR #" + prNum : null,
        prAuthor: cycle(actors, i),
        environment: i % 5 === 0 ? "staging" : "ci",
        status,
        startedAt: dAgo(dayOffset),
        finishedAt: new Date(dAgo(dayOffset).getTime() + duration),
        duration,
        totalTests: total,
        passed: passedCount,
        failed: failedCount,
        skipped,
        flaky: flakyCount,
        retried: flakyCount + (status === "failed" ? 2 : 0),
        gateDecision,
        browser,
        trigger: triggers[i % triggers.length],
        actor: actors[i % actors.length],
        idempotencyKey: "idem_run_" + String(i + 1).padStart(3, "0"),
      },
    });
  }
  console.log("  ✓ Test Runs: 20");

  // ── Failure Clusters (7 clusters) ──────────────────────────────────
  const failureData = [
    {
      id: "fc_1",
      name: "Authentication token expiry race",
      sig: "auth:token-expiry",
      class: "regression",
      conf: 0.92,
      sev: "critical",
      msg: "TypeError: Cannot read properties of undefined (reading token)",
      tests: 4,
      runs: 8,
      occ: 23,
      trend: "increasing",
      action: "Add mutex lock to token refresh logic",
    },
    {
      id: "fc_2",
      name: "Dashboard widget render timeout",
      sig: "ui:widget-timeout",
      class: "flaky",
      conf: 0.85,
      sev: "high",
      msg: "Timeout: Exceeded 10000ms waiting for element",
      tests: 2,
      runs: 15,
      occ: 45,
      trend: "stable",
      action: "Add explicit wait conditions for chart rendering",
    },
    {
      id: "fc_3",
      name: "CI runner memory exhaustion",
      sig: "ci:memory-oom",
      class: "environment",
      conf: 0.88,
      sev: "medium",
      msg: "FATAL ERROR: heap out of memory",
      tests: 6,
      runs: 3,
      occ: 8,
      trend: "decreasing",
      action: "Increase CI runner memory allocation",
    },
    {
      id: "fc_4",
      name: "Payment webhook timeout",
      sig: "payment:webhook-timeout",
      class: "regression",
      conf: 0.78,
      sev: "critical",
      msg: "Webhook delivery failed: ETIMEDOUT",
      tests: 2,
      runs: 5,
      occ: 12,
      trend: "increasing",
      action: "Review and fix connection pool configuration",
    },
    {
      id: "fc_5",
      name: "Flaky snapshot comparison",
      sig: "ui:snapshot-flake",
      class: "flaky",
      conf: 0.91,
      sev: "medium",
      msg: "Snapshot mismatch: 2.3% pixel diff",
      tests: 1,
      runs: 12,
      occ: 17,
      trend: "increasing",
      action: "Increase snapshot comparison threshold",
    },
    {
      id: "fc_6",
      name: "API rate limiting in tests",
      sig: "api:rate-limit",
      class: "environment",
      conf: 0.82,
      sev: "low",
      msg: "429 Too Many Requests",
      tests: 3,
      runs: 4,
      occ: 9,
      trend: "decreasing",
      action: "Add test-specific rate limit exceptions",
    },
    {
      id: "fc_7",
      name: "Mobile viewport overflow",
      sig: "mobile:overflow",
      class: "test_defect",
      conf: 0.75,
      sev: "low",
      msg: "Element is outside of the viewport",
      tests: 1,
      runs: 6,
      occ: 6,
      trend: "decreasing",
      action: "Update viewport configuration",
    },
  ];
  for (const fc of failureData) {
    const aiExplanations: Record<string, string> = {
      fc_1: "The token refresh logic has a race condition causing null access.",
      fc_2: "Widget rendering depends on async data fetch that completes inconsistently.",
      fc_3: "CI runner nodes are running low on memory during large test suites.",
      fc_4: "Payment webhook endpoint is timing out under load.",
      fc_5: "Font rendering differences between CI environments.",
      fc_6: "Test suite makes too many rapid API calls.",
      fc_7: "Mobile viewport height does not match device dimensions.",
    };
    await prisma.failureCluster.upsert({
      where: { id: fc.id },
      update: {},
      create: {
        id: fc.id,
        organizationId: ORG_ID,
        name: fc.name,
        signature: fc.sig,
        classification: fc.class,
        confidence: fc.conf,
        severity: fc.sev,
        errorMessage: fc.msg,
        affectedTests: fc.tests,
        affectedRuns: fc.runs,
        occurrences: fc.occ,
        firstSeen: dAgo(30),
        lastSeen: dAgo(0),
        trend: fc.trend,
        suggestedAction: fc.action,
        aiExplanation: aiExplanations[fc.id] || null,
        triageStatus:
          fc.id === "fc_3" || fc.id === "fc_6"
            ? "resolved"
            : fc.id === "fc_2" || fc.id === "fc_5" || fc.id === "fc_7"
              ? "triaged"
              : "pending",
      },
    });
  }
  console.log("  ✓ Failure Clusters:", failureData.length);

  // ── Flaky Tests (8 flaky tests) ────────────────────────────────────
  const flakyData = [
    {
      id: "flk_1",
      title: "should render dashboard widgets",
      full: "Dashboard > Widgets > should render dashboard widgets",
      repo: "acme-web",
      suite: "dashboard.spec.ts",
      rate: 0.23,
      retry: 3,
      total: 120,
      flaky: 28,
      trend: "increasing",
      team: "frontend",
      owner: "Sarah Chen",
      status: "active",
      remediation: "Add explicit wait for widget data loading",
    },
    {
      id: "flk_2",
      title: "should complete payment flow",
      full: "Payments > Checkout > should complete payment flow",
      repo: "acme-payments",
      suite: "checkout.spec.ts",
      rate: 0.18,
      retry: 2,
      total: 95,
      flaky: 17,
      trend: "stable",
      team: "payments",
      owner: "Marcus Johnson",
      status: "active",
      remediation: "Mock payment gateway response",
    },
    {
      id: "flk_3",
      title: "should load user profile",
      full: "Profile > Account > should load user profile",
      repo: "acme-web",
      suite: "profile.spec.ts",
      rate: 0.12,
      retry: 1,
      total: 150,
      flaky: 18,
      trend: "decreasing",
      team: "frontend",
      owner: "Everton Andrade",
      status: "active",
      remediation: "Add retry logic for network-dependent assertions",
    },
    {
      id: "flk_4",
      title: "should sync data across tabs",
      full: "Sync > MultiTab > should sync data across tabs",
      repo: "acme-web",
      suite: "sync.spec.ts",
      rate: 0.31,
      retry: 4,
      total: 80,
      flaky: 25,
      trend: "increasing",
      team: "frontend",
      owner: "Priya Patel",
      status: "active",
      remediation: "Increase BroadcastChannel timeout",
    },
    {
      id: "flk_5",
      title: "should upload file successfully",
      full: "Upload > FileTransfer > should upload file successfully",
      repo: "acme-api",
      suite: "upload.spec.ts",
      rate: 0.09,
      retry: 1,
      total: 110,
      flaky: 10,
      trend: "decreasing",
      team: "backend",
      owner: "Marcus Johnson",
      status: "quarantined",
      remediation: "Use local mock storage for upload tests",
    },
    {
      id: "flk_6",
      title: "should render charts with data",
      full: "Analytics > Charts > should render charts with data",
      repo: "acme-web",
      suite: "analytics.spec.ts",
      rate: 0.15,
      retry: 2,
      total: 100,
      flaky: 15,
      trend: "stable",
      team: "frontend",
      owner: "Sarah Chen",
      status: "active",
      remediation: "Wait for chart library to finish rendering",
    },
    {
      id: "flk_7",
      title: "should handle concurrent API requests",
      full: "API > Concurrency > should handle concurrent API requests",
      repo: "acme-api",
      suite: "concurrency.spec.ts",
      rate: 0.07,
      retry: 1,
      total: 130,
      flaky: 9,
      trend: "decreasing",
      team: "backend",
      owner: "Everton Andrade",
      status: "active",
      remediation: "Add rate limiting awareness to test setup",
    },
    {
      id: "flk_8",
      title: "should match visual regression",
      full: "Visual > Snapshot > should match visual regression",
      repo: "acme-design-system",
      suite: "visual.spec.ts",
      rate: 0.2,
      retry: 3,
      total: 85,
      flaky: 17,
      trend: "increasing",
      team: "design",
      owner: "Priya Patel",
      status: "active",
      remediation: "Increase snapshot threshold for anti-aliasing",
    },
  ];
  for (const ft of flakyData) {
    await prisma.flakyTest.upsert({
      where: { id: ft.id },
      update: {},
      create: {
        id: ft.id,
        organizationId: ORG_ID,
        title: ft.title,
        fullTitle: ft.full,
        repository: ft.repo,
        suite: ft.suite,
        flakeRate: ft.rate,
        retryFrequency: ft.retry,
        totalRuns: ft.total,
        flakyRuns: ft.flaky,
        lastSeen: dAgo(0),
        trend: ft.trend,
        team: ft.team,
        owner: ft.owner,
        status: ft.status,
        suggestedRemediation: ft.remediation,
        quarantineApprovedBy: ft.status === "quarantined" ? "Everton Andrade" : null,
        quarantineReason: ft.status === "quarantined" ? "Temp storage server intermittent failures" : null,
        failureExamples: [
          { runId: "run_0" + (Math.floor(Math.random() * 9) + 1), date: dAgo(1), error: "Test failed" },
        ],
      },
    });
  }
  console.log("  ✓ Flaky Tests:", flakyData.length);

  // ── Quality Gates (3 gates) ────────────────────────────────────────
  const gateData = [
    {
      id: "gate_1",
      name: "Production Release Gate",
      desc: "Required for all production deployments",
      last: "pass",
      rules: [
        {
          id: "rule_1",
          type: "failure_rate",
          cond: "less_than",
          thr: 2,
          sev: "critical",
          desc: "Failure rate must be less than 2%",
        },
        {
          id: "rule_2",
          type: "new_regressions",
          cond: "equals",
          thr: 0,
          sev: "critical",
          desc: "No new critical regressions allowed",
        },
        {
          id: "rule_3",
          type: "flaky_rate",
          cond: "less_than",
          thr: 5,
          sev: "high",
          desc: "Flaky test rate must be under 5%",
        },
        {
          id: "rule_4",
          type: "performance_budget",
          cond: "less_than",
          thr: 120,
          sev: "medium",
          desc: "p95 test duration must be under 120s",
        },
      ],
    },
    {
      id: "gate_2",
      name: "Staging Deployment Gate",
      desc: "Required for staging deployments",
      last: "warning",
      rules: [
        {
          id: "rule_5",
          type: "failure_rate",
          cond: "less_than",
          thr: 5,
          sev: "high",
          desc: "Failure rate must be less than 5%",
        },
        {
          id: "rule_6",
          type: "flaky_rate",
          cond: "less_than",
          thr: 10,
          sev: "medium",
          desc: "Flaky test rate must be under 10%",
        },
      ],
    },
    {
      id: "gate_3",
      name: "Pull Request Gate",
      desc: "Automated check for all pull requests",
      last: "pass",
      rules: [
        {
          id: "rule_7",
          type: "new_failures",
          cond: "equals",
          thr: 0,
          sev: "critical",
          desc: "No new failures introduced",
        },
        {
          id: "rule_8",
          type: "test_coverage",
          cond: "greater_than",
          thr: 80,
          sev: "medium",
          desc: "Minimum 80% test coverage",
        },
      ],
    },
  ];
  for (const g of gateData) {
    await prisma.qualityGate.upsert({
      where: { id: g.id },
      update: {},
      create: {
        id: g.id,
        organizationId: ORG_ID,
        name: g.name,
        description: g.desc,
        lastDecision: g.last,
        evaluatedAt: mAgo(5),
      },
    });
    for (const r of g.rules) {
      await prisma.qualityGateRule.upsert({
        where: { id: r.id },
        update: {},
        create: {
          id: r.id,
          gateId: g.id,
          type: r.type,
          condition: r.cond,
          threshold: r.thr,
          severity: r.sev,
          description: r.desc,
        },
      });
    }
  }
  console.log("  ✓ Quality Gates:", gateData.length, ", Rules:", 8);

  // ── Notifications ───────────────────────────────────────────────────
  const notifications = [
    {
      id: "notif_1",
      type: "regression_detected",
      title: "Regression detected",
      message: "Authentication token expiry race failed in acme-web",
      read: false,
      link: "/failures",
    },
    {
      id: "notif_2",
      type: "gate_failure",
      title: "Gate warning",
      message: "Staging Deployment Gate triggered for acme-web",
      read: false,
      link: "/quality-gates",
    },
    {
      id: "notif_3",
      type: "release_passed",
      title: "Release passed",
      message: "acme-web main: 213 tests passed",
      read: true,
      link: "/test-runs",
    },
    {
      id: "notif_4",
      type: "flaky_quarantined",
      title: "Flaky quarantined",
      message: "should render dashboard widgets quarantined by Sarah Chen",
      read: false,
      link: "/flaky-tests",
    },
    {
      id: "notif_5",
      type: "regression_detected",
      title: "PR blocked",
      message: "PR #347 in acme-infra blocked by quality gate",
      read: true,
      link: "/pull-requests",
    },
  ];
  for (const n of notifications) {
    await prisma.notification.upsert({
      where: { id: n.id },
      update: {},
      create: { ...n, organizationId: ORG_ID },
    });
  }
  console.log("  ✓ Notifications:", notifications.length);

  // ── Reports ────────────────────────────────────────────────────────
  await prisma.report.upsert({
    where: { id: "rpt_1" },
    update: {},
    create: {
      id: "rpt_1",
      organizationId: ORG_ID,
      type: "release",
      title: "Release v2.14.0 Quality Report",
      summary: "Release passed with 96.2% pass rate and 0 new regressions.",
      content: {
        metrics: [
          { label: "Pass Rate", value: "96.2%" },
          { label: "Total Tests", value: 213 },
          { label: "Failures", value: 8 },
          { label: "Flaky", value: 3 },
        ],
        sections: [
          {
            title: "Summary",
            content: "All critical tests passed. Two flaky tests noted but within threshold.",
          },
        ],
      },
    },
  });
  console.log("  ✓ Reports: 1");

  // ── Audit Events ────────────────────────────────────────────────────
  const auditEvents = [
    {
      id: "audit_1",
      userId: "usr_demo_001",
      action: "create",
      resource: "organization",
      resourceId: ORG_ID,
      details: { name: "Acme Engineering" },
    },
    {
      id: "audit_2",
      userId: "usr_demo_001",
      action: "configure",
      resource: "quality_gate",
      resourceId: "gate_1",
      details: { gate: "Production Release Gate" },
    },
    {
      id: "audit_3",
      userId: "usr_2",
      action: "triage",
      resource: "failure_cluster",
      resourceId: "fc_2",
      details: { classification: "flaky" },
    },
    {
      id: "audit_4",
      userId: "usr_demo_001",
      action: "quarantine",
      resource: "flaky_test",
      resourceId: "flk_5",
      details: { reason: "Temp storage intermittent" },
    },
    {
      id: "audit_5",
      userId: "usr_3",
      action: "override",
      resource: "failure_cluster",
      resourceId: "fc_1",
      details: { from: "unknown", to: "regression" },
    },
  ];
  for (const ae of auditEvents) {
    await prisma.auditEvent.upsert({
      where: { id: ae.id },
      update: {},
      create: { ...ae, organizationId: ORG_ID, resourceId: ae.resourceId },
    });
  }
  console.log("  ✓ Audit Events:", auditEvents.length);

  console.log("✅ Seed complete! All demo data populated.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
