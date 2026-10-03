import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function formatPercentage(n: number, decimals = 1): string {
  return `${n.toFixed(decimals)}%`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "…";
}

export function getRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Identifier for a client-side record.
 *
 * This used to be `Math.random().toString(36)`, which is not a random source
 * for anything that matters: its output is predictable from a handful of
 * observed values, and the length varied with the value. `crypto.randomUUID`
 * is available in both the browser and the Node runtime, costs nothing, and
 * does not need defending.
 *
 * `prefix` is for IDs that have to stay recognisable in a log line - a request
 * correlation ID, a run ID. It is a label, not part of the randomness.
 */
export function generateId(prefix?: string): string {
  const id = crypto.randomUUID();
  return prefix ? `${prefix}_${id}` : id;
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "passed":
    case "healthy":
    case "success":
      return "text-success";
    case "failed":
    case "failing":
    case "error":
      return "text-destructive";
    case "flaky":
    case "warning":
      return "text-warning";
    case "running":
    case "pending":
    case "queued":
      return "text-info";
    case "skipped":
    case "neutral":
      return "text-muted-foreground";
    default:
      return "text-muted-foreground";
  }
}

export function getStatusBg(status: string): string {
  switch (status) {
    case "passed":
    case "healthy":
    case "success":
      return "bg-success/10 text-success";
    case "failed":
    case "failing":
    case "error":
      return "bg-destructive/10 text-destructive";
    case "flaky":
    case "warning":
      return "bg-warning/10 text-warning";
    case "running":
    case "pending":
    case "queued":
      return "bg-info/10 text-info";
    case "skipped":
    case "neutral":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}
