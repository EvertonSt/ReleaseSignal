import { z } from "zod";

// ── CI Ingestion Payload Schema ─────────────────────────────────────────────
// Validates incoming test results from CI pipelines.

const TestResultSchema = z.object({
  /** Unique test identifier within the suite */
  id: z.string().min(1),
  /** Full test title (e.g., "Authentication > Login > should validate credentials") */
  title: z.string().min(1),
  /** Optional fully-qualified test path */
  fullTitle: z.string().optional(),
  /** Test outcome */
  status: z.enum(["passed", "failed", "skipped", "flaky", "timed_out"]),
  /** Test duration in milliseconds */
  duration: z.number().min(0).optional(),
  /** Number of retry attempts */
  retries: z.number().min(0).default(0),
  /** Results of each retry attempt */
  retryResults: z.array(z.enum(["passed", "failed", "skipped", "flaky", "timed_out"])).optional(),
  /** Error message if failed */
  errorMessage: z.string().optional(),
  /** Stack trace if failed */
  stackTrace: z.string().optional(),
  /** Test locator or selector */
  locator: z.string().optional(),
  /** Browser used (chromium, firefox, webkit) */
  browser: z.string().optional(),
  /** URL to screenshot attachment */
  screenshotUrl: z.string().url().optional(),
  /** URL to video attachment */
  videoUrl: z.string().url().optional(),
  /** URL to trace file */
  traceUrl: z.string().url().optional(),
  /** Test stdout/stderr logs */
  logs: z.string().optional(),
});

const TestSuiteSchema = z.object({
  /** Suite name (e.g., "authentication.spec.ts") */
  name: z.string().min(1),
  /** File path relative to repo root */
  file: z.string().optional(),
  /** Test results in this suite */
  tests: z.array(TestResultSchema).min(1),
});

const PullRequestRefSchema = z
  .object({
    number: z.number().int().positive(),
    title: z.string().optional(),
    url: z.string().url().optional(),
    author: z.string().optional(),
  })
  .optional();

/** Main ingestion payload schema */
export const IngestPayloadSchema = z.object({
  /** Repository full name (e.g., "acme-engineering/acme-web") */
  repository: z.string().min(1),
  /** Branch name */
  branch: z.string().min(1),
  /** Commit SHA (full or short) */
  commit: z.string().min(1),
  /** Optional commit message */
  commitMessage: z.string().optional(),
  /** Pull request reference if triggered by a PR */
  pullRequest: PullRequestRefSchema,
  /** CI environment (ci, staging, production) */
  environment: z.enum(["ci", "staging", "production"]).default("ci"),
  /** GitHub Actions workflow name or CI pipeline name */
  workflow: z.string().optional(),
  /** GitHub Actions run ID */
  workflowRunId: z.string().optional(),
  /** CI system trigger (push, pull_request, schedule, workflow_dispatch) */
  trigger: z.enum(["push", "pull_request", "schedule", "workflow_dispatch", "manual", "api"]).default("api"),
  /** Actor who triggered the run */
  actor: z.string().optional(),
  /** Browser used for E2E tests */
  browser: z.string().optional(),
  /** OS of the CI runner */
  os: z.string().optional(),
  /** Test suites containing results */
  suites: z.array(TestSuiteSchema).min(1),
  /** Optional idempotency key to prevent duplicate ingestion */
  idempotencyKey: z.string().optional(),
  /** Custom metadata (arbitrary key-value pairs) */
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type IngestPayload = z.infer<typeof IngestPayloadSchema>;
export type TestResult = z.infer<typeof TestResultSchema>;
export type TestSuite = z.infer<typeof TestSuiteSchema>;

// ── Validation Helpers ──────────────────────────────────────────────────────

export function validatePayload(data: unknown) {
  return IngestPayloadSchema.safeParse(data);
}

/** Compute aggregate statistics from suites */
export function computeStats(payload: IngestPayload) {
  let total = 0;
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let flaky = 0;
  let timedOut = 0;

  for (const suite of payload.suites) {
    for (const test of suite.tests) {
      total++;
      switch (test.status) {
        case "passed":
          passed++;
          break;
        case "failed":
          failed++;
          break;
        case "skipped":
          skipped++;
          break;
        case "flaky":
          flaky++;
          break;
        case "timed_out":
          timedOut++;
          break;
      }
    }
  }

  return { total, passed, failed, skipped, flaky, timedOut };
}
