import { demoFlakyTests } from "@/lib/demo/data";
import { StatusBadge } from "@/components/shared/status-badge";

export default function FlakyTestsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Flaky Test Center</h1>
        <p className="text-sm text-muted-foreground mt-1">Identified flaky tests with quarantine workflows</p>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-warning">
            {demoFlakyTests.filter((t) => t.status === "active").length}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Active Flaky</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-info">
            {demoFlakyTests.filter((t) => t.status === "quarantined").length}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Quarantined</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-success">
            {demoFlakyTests.filter((t) => t.status === "resolved").length}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Resolved</p>
        </div>
      </div>
      <div className="space-y-3">
        {demoFlakyTests.map((ft) => (
          <div key={ft.id} className="rounded-lg border bg-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <StatusBadge
                    variant={ft.status === "quarantined" ? "info" : "warning"}
                    label={ft.status}
                    size="xs"
                  />
                  <StatusBadge
                    variant={
                      ft.trend === "increasing"
                        ? "destructive"
                        : ft.trend === "decreasing"
                          ? "success"
                          : "outline"
                    }
                    label={ft.trend}
                    size="xs"
                  />
                </div>
                <h3 className="font-medium text-sm">{ft.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {ft.repository} | {ft.suite}
                </p>
                {ft.suggestedRemediation && (
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    Suggested: {ft.suggestedRemediation}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-2xl font-bold text-warning">{(ft.flakeRate * 100).toFixed(0)}%</p>
                <p className="text-[10px] text-muted-foreground">flake rate</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {ft.flakyRuns}/{ft.totalRuns} runs
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
