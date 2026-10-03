import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  tooltip?: string;
  onClick?: () => void;
  className?: string;
}

export function MetricCard({
  label,
  value,
  change,
  changeLabel,
  icon,
  tooltip,
  onClick,
  className,
}: MetricCardProps) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight">{value}</span>
        {change !== undefined && (
          <span
            className={cn(
              "flex items-center gap-0.5 text-sm font-medium mb-1",
              change > 0 ? "text-success" : change < 0 ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {change > 0 ? (
              <ArrowUp className="h-3 w-3" />
            ) : change < 0 ? (
              <ArrowDown className="h-3 w-3" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
      {changeLabel && <p className="mt-2 text-xs text-muted-foreground">{changeLabel}</p>}
    </>
  );

  const base = "rounded-xl border bg-card p-5 transition-all hover:shadow-md";

  /*
   * A clickable card is a button wearing a div's clothes. Rendering the
   * interactive variant as a real <button> is what puts it in the tab order,
   * gives it Enter/Space activation, and announces it as activatable - none of
   * which a div with an onClick handler gets.
   */
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={tooltip}
        className={cn(base, "cursor-pointer hover:border-primary/30 text-left", className)}
      >
        {body}
      </button>
    );
  }

  return (
    <div className={cn(base, className)} title={tooltip}>
      {body}
    </div>
  );
}
