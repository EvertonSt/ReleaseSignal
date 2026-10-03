// ── Core Domain Types ──────────────────────────────────────────────────────────

export type UserRole = "owner" | "admin" | "member" | "viewer";
export type RunStatus = "queued" | "running" | "passed" | "failed" | "cancelled";
export type TestStatus = "passed" | "failed" | "skipped" | "flaky" | "timed_out";
export type FailureClassification = "regression" | "flaky" | "environment" | "test_defect" | "unknown";
export type GateDecision = "pass" | "warning" | "blocked" | "pending";
export type Severity = "critical" | "high" | "medium" | "low";
export type TriageStatus = "pending" | "triaged" | "resolved" | "dismissed" | "escalated";
export type ReportType = "release" | "pull_request" | "weekly" | "flaky" | "regression";
export type IntegrationStatus = "connected" | "disconnected" | "error" | "pending";
export type NotificationType = "email" | "slack" | "webhook";

// ── Organization & User ────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  githubId?: string;
  createdAt: Date;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  plan: string;
  createdAt: Date;
  settings: OrgSettings;
}

export interface OrgSettings {
  timezone: string;
  defaultBranch: string;
  qualityGateRequired: boolean;
  aiEnabled: boolean;
  dataRetentionDays: number;
}

export interface Membership {
  id: string;
  userId: string;
  organizationId: string;
  role: UserRole;
  user: User;
}

// ── Repository & Integration ───────────────────────────────────────────────────

export interface Repository {
  id: string;
  organizationId: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  language?: string;
  connected: boolean;
  integrationStatus: IntegrationStatus;
  lastSyncAt?: Date;
}

export interface Workflow {
  id: string;
  repositoryId: string;
  name: string;
  path: string;
  enabled: boolean;
}

export interface Integration {
  id: string;
  organizationId: string;
  type: "github" | "ci" | "slack";
  status: IntegrationStatus;
  config: Record<string, unknown>;
}

// ── Test Runs & Results ────────────────────────────────────────────────────────

export interface TestRun {
  id: string;
  organizationId: string;
  repositoryId: string;
  repository: Repository;
  workflowId?: string;
  workflow?: Workflow;
  externalId?: string;
  branch: string;
  commitSha: string;
  commitMessage?: string;
  pullRequest?: PullRequestRef;
  environment: string;
  status: RunStatus;
  startedAt: Date;
  finishedAt?: Date;
  duration?: number;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
  retried: number;
  gateDecision: GateDecision;
  browser?: string;
  os?: string;
  trigger: string;
  actor?: string;
  failureClusters: FailureCluster[];
}

export interface PullRequestRef {
  number: number;
  title: string;
  url: string;
  author: string;
}

export interface TestSuite {
  id: string;
  testRunId: string;
  name: string;
  file: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration?: number;
}

export interface TestCase {
  id: string;
  testSuiteId: string;
  title: string;
  fullTitle: string;
  status: TestStatus;
  duration?: number;
  retries: number;
  retryResults?: TestStatus[];
  errorMessage?: string;
  stackTrace?: string;
  locator?: string;
  browser?: string;
  screenshotUrl?: string;
  videoUrl?: string;
  traceUrl?: string;
  logs?: string;
}

// ── Failure Intelligence ───────────────────────────────────────────────────────

export interface FailureCluster {
  id: string;
  organizationId: string;
  name: string;
  signature: string;
  classification: FailureClassification;
  confidence: number;
  severity: Severity;
  errorMessage: string;
  stackTrace?: string;
  locator?: string;
  affectedTests: number;
  affectedRuns: number;
  occurrences: number;
  firstSeen: Date;
  lastSeen: Date;
  trend: "increasing" | "stable" | "decreasing";
  aiExplanation?: string;
  suggestedAction?: string;
  historicalFrequency?: number;
  relatedClusters?: string[];
  triageStatus: TriageStatus;
  triage?: TriageDecision;
  examples: TestCase[];
}

export interface TriageDecision {
  id: string;
  failureClusterId: string;
  classification: FailureClassification;
  reason: string;
  decidedBy: string;
  decidedAt: Date;
  override: boolean;
  auditHistory: AuditEvent[];
}

// ── Flaky Tests ────────────────────────────────────────────────────────────────

export interface FlakyTest {
  id: string;
  organizationId: string;
  testCaseId: string;
  title: string;
  fullTitle: string;
  repository: string;
  suite: string;
  flakeRate: number;
  retryFrequency: number;
  totalRuns: number;
  flakyRuns: number;
  lastSeen: Date;
  trend: "increasing" | "stable" | "decreasing";
  team?: string;
  owner?: string;
  status: "active" | "quarantined" | "resolved";
  quarantineExpiry?: Date;
  quarantineApprovedBy?: string;
  quarantineReason?: string;
  suggestedRemediation?: string;
  failureExamples: { runId: string; date: Date; error?: string }[];
}

// ── Quality Gates ──────────────────────────────────────────────────────────────

export interface QualityGate {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  enabled: boolean;
  rules: QualityGateRule[];
  evaluatedAt?: Date;
  lastDecision?: GateDecision;
}

export interface QualityGateRule {
  id: string;
  gateId: string;
  type: string;
  condition: string;
  threshold: number;
  severity: Severity;
  enabled: boolean;
  description: string;
}

export interface GateEvaluation {
  gateId: string;
  decision: GateDecision;
  evaluatedAt: Date;
  ruleResults: RuleResult[];
  summary: string;
}

export interface RuleResult {
  ruleId: string;
  ruleType: string;
  passed: boolean;
  actual: number;
  threshold: number;
  message: string;
}

// ── Pull Request Quality ───────────────────────────────────────────────────────

export interface PullRequestQuality {
  id: string;
  pullRequestNumber: number;
  repositoryId: string;
  repository: Repository;
  branch: string;
  commitSha: string;
  title: string;
  author: string;
  url: string;
  gateDecision: GateDecision;
  overallScore: number;
  riskSummary: RiskSummary;
  newFailures: TestCase[];
  existingFailures: TestCase[];
  flakyFailures: TestCase[];
  environmentIssues: TestCase[];
  coverageChange?: { before: number; after: number; delta: number };
  performanceChange?: { before: number; after: number; delta: number };
  aiExplanation?: string;
  evidenceLinks: string[];
  reviewerComments: ReviewerComment[];
  approvalHistory: ApprovalEvent[];
  createdAt: Date;
}

export interface RiskSummary {
  totalTests: number;
  newFailures: number;
  existingFailures: number;
  flakyTests: number;
  environmentIssues: number;
  riskLevel: "low" | "medium" | "high" | "critical";
}

export interface ReviewerComment {
  author: string;
  body: string;
  createdAt: Date;
}

export interface ApprovalEvent {
  action: "approved" | "changes_requested" | "commented";
  author: string;
  reason?: string;
  createdAt: Date;
}

// ── Performance ────────────────────────────────────────────────────────────────

export interface PerformanceMetric {
  id: string;
  repositoryId: string;
  date: Date;
  branch: string;
  commitSha: string;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
  totalDuration: number;
  testCount: number;
  budget: number;
  withinBudget: boolean;
}

export interface PerformanceBudget {
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
}

export interface PerformanceRegression {
  id: string;
  repositoryId: string;
  detectedAt: Date;
  commitSha: string;
  branch: string;
  metric: string;
  baselineValue: number;
  currentValue: number;
  percentChange: number;
  severity: Severity;
  investigationStatus: "open" | "investigating" | "resolved" | "dismissed";
}

// ── Reports ──
export interface Report {
  id: string;
  organizationId: string;
  type: ReportType;
  title: string;
  summary: string;
  period?: { from: Date; to: Date };
  repositoryId?: string;
  pullRequestId?: number;
  content: ReportContent;
  shareLink?: ShareLink;
  createdAt: Date;
  generatedBy: "system" | "user" | "ai";
}
export interface ReportContent {
  metrics: ReportMetric[];
  sections: ReportSection[];
}
export interface ReportMetric {
  label: string;
  value: string | number;
  change?: number;
  trend?: "up" | "down" | "flat";
}
export interface ReportSection {
  title: string;
  content: string;
  data?: unknown;
}
export interface ShareLink {
  token: string;
  expiresAt?: Date;
  passwordProtected: boolean;
  revoked: boolean;
  accessCount: number;
}
export interface AuditEvent {
  id: string;
  organizationId: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId: string;
  details?: Record<string, unknown>;
  createdAt: Date;
}
export interface ApiKey {
  id: string;
  organizationId: string;
  name: string;
  key: string;
  scopes: string[];
  lastUsedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
}
export interface DashboardMetrics {
  releaseHealth: number;
  releaseHealthTrend: "improving" | "stable" | "declining";
  qualityGateStatus: GateDecision;
  passRate: number;
  failureRate: number;
  flakyRate: number;
  openRegressions: number;
  avgTestDuration: number;
  testDurationTrend: number;
  performanceRisk: "low" | "medium" | "high";
  testsAffectedByPR: number;
  recentReleases: TestRun[];
  mostUnstableTests: FlakyTest[];
  recommendedActions: RecommendedAction[];
  passRateHistory: { date: string; rate: number }[];
  failureBreakdown: { type: string; count: number; color: string }[];
  testDurationHistory: { date: string; p50: number; p95: number }[];
}
export interface RecommendedAction {
  id: string;
  type: "quarantine" | "investigate" | "fix" | "review" | "configure";
  title: string;
  description: string;
  priority: Severity;
  linkedResource?: { type: string; id: string; name: string };
}
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  requestId: string;
}
