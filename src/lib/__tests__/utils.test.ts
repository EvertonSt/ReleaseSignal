import { describe, it, expect } from "vitest";
import {
  cn,
  formatNumber,
  formatPercentage,
  formatDuration,
  truncate,
  getRelativeTime,
  generateId,
  capitalize,
  getStatusColor,
  getStatusBg,
} from "../utils";

describe("cn", () => {
  it("joins class names and drops falsy ones", () => {
    expect(cn("a", false && "b", undefined, "c")).toBe("a c");
  });

  it("lets the later Tailwind utility win a conflict", () => {
    // tail-merge is the reason this helper exists: `cn` that merely joined
    // strings would emit both classes and leave the cascade to decide.
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-sm text-muted-foreground", "text-lg")).toBe("text-muted-foreground text-lg");
  });
});

describe("formatNumber", () => {
  it("uses thousands separators", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
  });

  it("leaves small numbers alone", () => {
    expect(formatNumber(42)).toBe("42");
  });
});

describe("formatPercentage", () => {
  it("defaults to one decimal place", () => {
    expect(formatPercentage(94.25)).toBe("94.3%");
  });

  it("honours the requested precision", () => {
    expect(formatPercentage(94.25, 0)).toBe("94%");
    expect(formatPercentage(94.25, 2)).toBe("94.25%");
  });
});

describe("formatDuration", () => {
  it.each([
    [0, "0ms"],
    [499, "499ms"],
    [1000, "1s"],
    [59_000, "59s"],
    [60_000, "1m 0s"],
    [90_000, "1m 30s"],
    [3_600_000, "1h 0m"],
    [5_400_000, "1h 30m"],
  ])("formats %ims as %s", (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });
});

describe("truncate", () => {
  it("leaves short strings untouched", () => {
    expect(truncate("short", 10)).toBe("short");
  });

  it("cuts and marks longer strings with an ellipsis", () => {
    expect(truncate("a much longer string", 6)).toBe("a much…");
  });

  it("does not append an ellipsis when the length matches exactly", () => {
    expect(truncate("exact", 5)).toBe("exact");
  });
});

describe("getRelativeTime", () => {
  const now = new Date("2026-03-15T12:00:00Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    [0, "just now"],
    [30_000, "just now"],
    [60_000, "1m ago"],
    [59 * 60_000, "59m ago"],
    [60 * 60_000, "1h ago"],
    [23 * 3_600_000, "23h ago"],
    [24 * 3_600_000, "1d ago"],
    [6 * 86_400_000, "6d ago"],
    [7 * 86_400_000, "1w ago"],
    [27 * 86_400_000, "3w ago"],
  ])("describes a moment %ims ago as %s", (ago, expected) => {
    expect(getRelativeTime(new Date(now.getTime() - ago))).toBe(expected);
  });

  it("falls back to a calendar date beyond four weeks", () => {
    const old = new Date(now.getTime() - 120 * 86_400_000);
    expect(getRelativeTime(old)).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
  });
});

describe("generateId", () => {
  it("produces a RFC 4122 UUID", () => {
    expect(generateId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("does not collide across calls", () => {
    const ids = new Set(Array.from({ length: 500 }, () => generateId()));
    expect(ids.size).toBe(500);
  });
});

describe("capitalize", () => {
  it("upper-cases only the first character", () => {
    expect(capitalize("passed")).toBe("Passed");
    expect(capitalize("IN_PROGRESS")).toBe("IN_PROGRESS");
  });

  it("survives an empty string", () => {
    expect(capitalize("")).toBe("");
  });
});

describe("status colour helpers", () => {
  it.each([
    ["passed", "text-success"],
    ["failed", "text-destructive"],
    ["flaky", "text-warning"],
    ["running", "text-info"],
    ["skipped", "text-muted-foreground"],
  ])("maps %s to %s", (status, expected) => {
    expect(getStatusColor(status)).toBe(expected);
  });

  it("falls back to a neutral colour for an unknown status", () => {
    // An unrecognised status must never render as a success colour.
    expect(getStatusColor("exploded")).toBe("text-muted-foreground");
    expect(getStatusBg("exploded")).toBe("bg-muted text-muted-foreground");
  });

  it("pairs every colour with a background variant", () => {
    expect(getStatusBg("passed")).toBe("bg-success/10 text-success");
    expect(getStatusBg("failed")).toBe("bg-destructive/10 text-destructive");
  });
});
