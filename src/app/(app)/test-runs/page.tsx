import { demoTestRuns } from "@/lib/demo/data";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDuration } from "@/lib/utils";

export default function TestRunsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Test Runs</h1>
        <p className="text-sm text-muted-foreground mt-1">
          History of all test runs across connected repositories
        </p>
      </div>
      <div className="flex gap-2 flex-wrap">
        {["All", "Passed", "Failed", "Running"].map((f) => (
          <button
            key={f}
            className="px-3 py-1.5 rounded-md text-xs font-medium border border-border hover:bg-accent transition-colors"
          >
            {f}
          </button>
        ))}
      </div>
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Repository</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Branch</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Commit</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tests</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Duration</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Gate</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Time</th>
              </tr>
            </thead>
            <tbody>
              {demoTestRuns.slice(0, 20).map((run) => (
                <tr
                  key={run.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <StatusBadge
                      variant={run.status === "passed" ? "success" : "destructive"}
                      label={run.status}
                      size="xs"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">{run.repository.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{run.branch}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{run.commitSha}</td>
                  <td className="px-4 py-3">
                    <span className="text-success">{run.passed}</span>/
                    <span className="text-destructive">{run.failed}</span>/
                    <span className="text-muted-foreground">{run.skipped}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {run.duration ? formatDuration(run.duration) : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      variant={
                        run.gateDecision === "pass"
                          ? "success"
                          : run.gateDecision === "blocked"
                            ? "destructive"
                            : "warning"
                      }
                      label={run.gateDecision}
                      size="xs"
                    />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {run.startedAt.toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
