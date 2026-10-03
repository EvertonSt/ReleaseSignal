import { cn } from "@/lib/utils";

const variantStyles: Record<string, string> = {
  default: "bg-primary/10 text-primary border-primary/20",
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  destructive: "bg-destructive/10 text-destructive border-destructive/20",
  info: "bg-info/10 text-info border-info/20",
  outline: "bg-transparent text-muted-foreground border-border",
};

const statusStyles: Record<string, string> = {
  passed: "bg-success/15 text-success border-success/20",
  success: "bg-success/15 text-success border-success/20",
  healthy: "bg-success/15 text-success border-success/20",
  connected: "bg-success/15 text-success border-success/20",
  pass: "bg-success/15 text-success border-success/20",
  failed: "bg-destructive/15 text-destructive border-destructive/20",
  error: "bg-destructive/15 text-destructive border-destructive/20",
  critical: "bg-destructive/15 text-destructive border-destructive/20",
  blocked: "bg-destructive/15 text-destructive border-destructive/20",
  flaky: "bg-warning/15 text-warning border-warning/20",
  warning: "bg-warning/15 text-warning border-warning/20",
  high: "bg-warning/15 text-warning border-warning/20",
  running: "bg-info/15 text-info border-info/20",
  pending: "bg-info/15 text-info border-info/20",
  queued: "bg-info/15 text-info border-info/20",
  medium: "bg-primary/15 text-primary border-primary/20",
  low: "bg-muted text-muted-foreground border-border",
  skipped: "bg-muted text-muted-foreground border-border",
  disconnected: "bg-muted text-muted-foreground border-border",
  active: "bg-success/15 text-success border-success/20",
  quarantined: "bg-warning/15 text-warning border-warning/20",
  resolved: "bg-success/15 text-success border-success/20",
  dismissed: "bg-muted text-muted-foreground border-border",
  escalated: "bg-destructive/15 text-destructive border-destructive/20",
  triaged: "bg-info/15 text-info border-info/20",
  increasing: "bg-destructive/15 text-destructive border-destructive/20",
  stable: "bg-muted text-muted-foreground border-border",
  decreasing: "bg-success/15 text-success border-success/20",
  regression: "bg-destructive/15 text-destructive border-destructive/20",
  environment: "bg-info/15 text-info border-info/20",
  test_defect: "bg-muted text-muted-foreground border-border",
  unknown: "bg-muted text-muted-foreground border-border",
};

const sizeStyles: Record<string, string> = {
  xs: "px-1.5 py-0.5 text-[10px]",
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-0.5 text-xs",
  lg: "px-3 py-1 text-sm",
};

export function StatusBadge({
  label,
  status,
  variant,
  size = "sm",
  pulse,
}: {
  label?: string;
  status?: string;
  variant?: string;
  size?: "xs" | "sm" | "md" | "lg";
  pulse?: boolean;
}) {
  const display = label || status || "";
  const styleKey = status || variant || "default";
  const styles = variant ? variantStyles : statusStyles;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        styles[styleKey] || "bg-muted text-muted-foreground border-border",
        sizeStyles[size] || sizeStyles.sm
      )}
    >
      {pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
              styleKey === "pass" || styleKey === "passed" || styleKey === "success"
                ? "bg-success"
                : "bg-primary"
            )}
          />
          <span
            className={cn(
              "relative inline-flex h-1.5 w-1.5 rounded-full",
              styleKey === "pass" || styleKey === "passed" || styleKey === "success"
                ? "bg-success"
                : "bg-primary"
            )}
          />
        </span>
      )}
      {display}
    </span>
  );
}

export function GateStatusBadge({ decision, size = "md" }: { decision: string; size?: string }) {
  const gateStyles: Record<string, string> = {
    pass: "bg-success/15 text-success border-success/20",
    warning: "bg-warning/15 text-warning border-warning/20",
    blocked: "bg-destructive/15 text-destructive border-destructive/20",
    pending: "bg-info/15 text-info border-info/20",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-semibold",
        gateStyles[decision] || "bg-muted text-muted-foreground border-border",
        sizeStyles[size] || sizeStyles.md
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          decision === "pass"
            ? "bg-success"
            : decision === "blocked"
              ? "bg-destructive"
              : decision === "warning"
                ? "bg-warning"
                : "bg-info"
        )}
      />
      {decision}
    </span>
  );
}
