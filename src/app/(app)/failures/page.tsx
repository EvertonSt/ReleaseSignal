import { demoFailureClusters } from "@/lib/demo/data";
import { StatusBadge } from "@/components/shared/status-badge";

export default function FailuresPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Failure Intelligence</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Normalized and classified failure clusters with AI explanations
        </p>
      </div>
      <div className="grid sm:grid-cols-4 gap-4">
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-destructive">
            {demoFailureClusters.filter((f) => f.classification === "regression").length}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Regressions</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-warning">
            {demoFailureClusters.filter((f) => f.classification === "flaky").length}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Flaky</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-info">
            {demoFailureClusters.filter((f) => f.classification === "environment").length}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Environment</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-muted-foreground">
            {demoFailureClusters.filter((f) => f.classification === "test_defect").length}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Test Defects</p>
        </div>
      </div>
      <div className="space-y-3">
        {demoFailureClusters.map((fc) => (
          <div key={fc.id} className="rounded-lg border bg-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <StatusBadge status={fc.severity} size="xs" />
                  <StatusBadge status={fc.classification} size="xs" />
                </div>
                <h3 className="font-medium text-sm">{fc.name}</h3>
                <p className="text-xs text-muted-foreground mt-1 font-mono">{fc.errorMessage}</p>
                {fc.aiExplanation && (
                  <div className="mt-3 rounded-md bg-primary/5 border border-primary/10 p-3">
                    <p className="text-xs font-medium text-primary mb-1">AI Explanation</p>
                    <p className="text-xs text-muted-foreground">{fc.aiExplanation}</p>
                  </div>
                )}
                {fc.suggestedAction && (
                  <p className="text-xs text-muted-foreground mt-2">Suggested: {fc.suggestedAction}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold">{(fc.confidence * 100).toFixed(0)}%</p>
                <p className="text-[10px] text-muted-foreground">confidence</p>
                <p className="text-xs text-muted-foreground mt-2">{fc.occurrences} occurrences</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
