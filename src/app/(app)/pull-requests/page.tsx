import { StatusBadge } from "@/components/shared/status-badge";
import { GitPullRequest } from "lucide-react";

const prs = [
  {
    id: 1,
    number: 142,
    title: "feat: Add dashboard analytics widget",
    author: "Sarah Chen",
    branch: "feat/auth-v2",
    repo: "acme-web",
    decision: "pass",
    score: 94,
    newFailures: 0,
    flaky: 2,
  },
  {
    id: 2,
    number: 139,
    title: "fix: Resolve auth token refresh race condition",
    author: "Everton Andrade",
    branch: "fix/auth-race",
    repo: "acme-web",
    decision: "warning",
    score: 78,
    newFailures: 1,
    flaky: 3,
  },
  {
    id: 3,
    number: 137,
    title: "chore: Update dependencies across all packages",
    author: "Marcus Johnson",
    branch: "chore/deps-update",
    repo: "acme-api",
    decision: "pass",
    score: 96,
    newFailures: 0,
    flaky: 1,
  },
  {
    id: 4,
    number: 135,
    title: "feat: Implement payment webhook handler",
    author: "Priya Patel",
    branch: "feat/payment-webhook",
    repo: "acme-payments",
    decision: "blocked",
    score: 45,
    newFailures: 4,
    flaky: 0,
  },
];

export default function PullRequestsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pull Request Quality</h1>
        <p className="text-sm text-muted-foreground mt-1">Quality reports for open pull requests</p>
      </div>
      <div className="space-y-3">
        {prs.map((pr) => (
          <div key={pr.id} className="rounded-lg border bg-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <GitPullRequest className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">#{pr.number}</span>
                  <StatusBadge
                    variant={
                      pr.decision === "pass"
                        ? "success"
                        : pr.decision === "blocked"
                          ? "destructive"
                          : "warning"
                    }
                    label={pr.decision}
                    size="xs"
                  />
                </div>
                <h3 className="font-medium text-sm">{pr.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {pr.author} | {pr.branch} | {pr.repo}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-2xl font-bold">{pr.score}</p>
                <p className="text-[10px] text-muted-foreground">quality score</p>
                <div className="mt-2 space-y-1 text-xs">
                  {pr.newFailures > 0 && <p className="text-destructive">{pr.newFailures} new failures</p>}
                  {pr.flaky > 0 && <p className="text-warning">{pr.flaky} flaky</p>}
                  {pr.newFailures === 0 && <p className="text-success">No new failures</p>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
