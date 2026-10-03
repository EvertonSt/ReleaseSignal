// ── GitHub API Client ──────────────────────────────────────────────────────
// Minimal GitHub API client for Checks and webhook management.
// Marked as "planned" when not configured.

export interface GitHubConfig {
  appId: string;
  privateKey: string;
  webhookSecret: string;
}

export interface CheckRun {
  id: number;
  name: string;
  status: "queued" | "in_progress" | "completed";
  conclusion?: "success" | "failure" | "neutral" | "cancelled" | "timed_out" | "action_required";
  output?: {
    title: string;
    summary: string;
    text?: string;
  };
}

/** Check if GitHub integration is configured */
export function isGitHubConfigured(): boolean {
  return !!(process.env.GITHUB_APP_ID && process.env.GITHUB_PRIVATE_KEY && process.env.GITHUB_WEBHOOK_SECRET);
}

/*
 * Publishing checks back to GitHub is not implemented yet, and no caller is
 * waiting on it. The two `async` stubs that used to sit here could only ever
 * resolve to `null`: an `async` signature implies a network call that never
 * happens, and a caller reading it has no way to tell the difference. They were
 * removed rather than left as decoration. See docs/decisions for the reasoning.
 */

/** Mark GitHub integration as available or planned */
export function getIntegrationStatus(): {
  configured: boolean;
  message: string;
} {
  if (isGitHubConfigured()) {
    return { configured: true, message: "GitHub App integration is active" };
  }
  return {
    configured: false,
    message: "GitHub integration is planned. Configure GITHUB_APP_ID and GITHUB_PRIVATE_KEY to enable.",
  };
}
