import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge, GateStatusBadge } from "../status-badge";

describe("StatusBadge", () => {
  it("prefers an explicit label over the raw status", () => {
    render(<StatusBadge label="Blocked by gate" status="blocked" />);
    expect(screen.getByText("Blocked by gate")).toBeInTheDocument();
  });

  it("falls back to the status when there is no label", () => {
    render(<StatusBadge status="flaky" />);
    expect(screen.getByText("flaky")).toBeInTheDocument();
  });

  it("colours a passing status as a success", () => {
    const { container } = render(<StatusBadge status="passed" />);
    expect(container.firstChild).toHaveClass("text-success");
  });

  it("colours a critical status as destructive", () => {
    const { container } = render(<StatusBadge status="critical" />);
    expect(container.firstChild).toHaveClass("text-destructive");
  });

  it("uses the variant palette when a variant is given", () => {
    const { container } = render(<StatusBadge variant="info" label="Beta" />);
    expect(container.firstChild).toHaveClass("bg-info/10");
  });

  it("falls back to a neutral style for an unrecognised status", () => {
    // An unknown value must never inherit a success colour from a previous
    // entry; a badge that says something untrue is worse than a plain one.
    const { container } = render(<StatusBadge status="exploded" label="Exploded" />);
    expect(container.firstChild).toHaveClass("text-muted-foreground");
    expect(container.firstChild).not.toHaveClass("text-success");
  });

  it("applies the requested size", () => {
    const { container } = render(<StatusBadge status="passed" size="xs" />);
    expect(container.firstChild).toHaveClass("text-[10px]");
  });

  it("adds a pulse indicator only when asked", () => {
    const { container: quiet } = render(<StatusBadge status="running" />);
    expect(quiet.querySelector(".animate-ping")).toBeNull();

    const { container: pulsing } = render(<StatusBadge status="running" pulse />);
    expect(pulsing.querySelector(".animate-ping")).not.toBeNull();
  });
});

describe("GateStatusBadge", () => {
  it.each([
    ["pass", "bg-success"],
    ["warning", "bg-warning"],
    ["blocked", "bg-destructive"],
    ["pending", "bg-info"],
  ])("renders %s with %s", (decision, expected) => {
    const { container } = render(<GateStatusBadge decision={decision} />);
    expect(container.querySelector(`.${expected}`)).not.toBeNull();
    expect(screen.getByText(decision)).toBeInTheDocument();
  });

  it("falls back to a neutral style for a decision it does not know", () => {
    const { container } = render(<GateStatusBadge decision="maybe" />);
    expect(container.querySelector(".bg-destructive, .bg-success")).toBeNull();
    expect(screen.getByText("maybe")).toBeInTheDocument();
  });

  it("defaults to a readable size when given one it does not know", () => {
    // `size` is typed loosely on purpose because callers pass gate records
    // straight through; an unknown size must not collapse the padding to none.
    const { container } = render(<GateStatusBadge decision="pass" size="enormous" />);
    expect(container.firstElementChild?.className).toContain("px-2.5");
  });
});
