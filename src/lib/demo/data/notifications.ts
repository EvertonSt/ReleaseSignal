export interface Notification {
  id: string;
  type: "failure" | "flaky" | "regression" | "gate" | "release" | "pr" | "system";
  title: string;
  message: string;
  repository?: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

export const demoNotifications: Notification[] = [
  {
    id: "n1",
    type: "regression",
    title: "New regression detected",
    message: "Authentication token expiry race failed in acme-web on main",
    repository: "acme-web",
    timestamp: new Date(Date.now() - 1000 * 60 * 12),
    read: false,
    actionUrl: "/failures",
  },
  {
    id: "n2",
    type: "gate",
    title: "Staging gate: warning",
    message: "Staging Deployment Gate triggered a warning on acme-api",
    repository: "acme-api",
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
    read: false,
    actionUrl: "/quality-gates",
  },
  {
    id: "n3",
    type: "release",
    title: "Release passed",
    message: "acme-mobile main branch: 213 tests passed",
    repository: "acme-mobile",
    timestamp: new Date(Date.now() - 1000 * 60 * 90),
    read: false,
    actionUrl: "/test-runs",
  },
  {
    id: "n4",
    type: "flaky",
    title: "Flaky test quarantined",
    message: '"should render dashboard widgets" quarantined after 23% flake rate',
    repository: "acme-web",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
    read: true,
    actionUrl: "/flaky-tests",
  },
  {
    id: "n5",
    type: "pr",
    title: "PR quality check: blocked",
    message: "PR #347 in acme-infra blocked by 2 new critical regressions",
    repository: "acme-infra",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
    read: true,
    actionUrl: "/pull-requests",
  },
  {
    id: "n6",
    type: "failure",
    title: "Environment failure",
    message: "Payment webhook timeout on staging — 3 consecutive failures",
    repository: "acme-payments",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8),
    read: true,
    actionUrl: "/failures",
  },
  {
    id: "n7",
    type: "system",
    title: "Demo data imported",
    message: "30 days of synthetic test data loaded into ReleaseSignal",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    read: true,
  },
];

export function getUnreadCount(): number {
  return demoNotifications.filter((n) => !n.read).length;
}
