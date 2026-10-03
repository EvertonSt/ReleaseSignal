import { demoQualityGates } from "@/lib/demo/data";
import { StatusBadge, GateStatusBadge } from "@/components/shared/status-badge";
import { Shield, CheckCircle2 } from "lucide-react";

export default function QualityGatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Quality Gates</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configurable rules that determine release readiness
        </p>
      </div>
      <div className="space-y-4">
        {demoQualityGates.map((gate) => (
          <div key={gate.id} className="rounded-lg border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="font-semibold">{gate.name}</h2>
                  <p className="text-xs text-muted-foreground">{gate.description}</p>
                </div>
              </div>
              <GateStatusBadge decision={gate.lastDecision || "pending"} />
            </div>
            <div className="space-y-2">
              {gate.rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <div>
                      <p className="text-sm">{rule.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {rule.type} | threshold: {rule.threshold}
                      </p>
                    </div>
                  </div>
                  <StatusBadge
                    variant={
                      rule.severity === "critical"
                        ? "destructive"
                        : rule.severity === "high"
                          ? "warning"
                          : "info"
                    }
                    label={rule.severity}
                    size="xs"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
