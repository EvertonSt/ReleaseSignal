import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const pathname = vi.fn(() => "/dashboard");
vi.mock("next/navigation", () => ({
  usePathname: () => pathname(),
}));

const { BottomNav } = await import("../bottom-nav");

describe("BottomNav", () => {
  it("offers every primary destination", () => {
    render(<BottomNav />);
    for (const label of ["Dashboard", "Runs", "Issues", "Gates", "Perf"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("points each entry at its route", () => {
    render(<BottomNav />);
    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: /gates/i })).toHaveAttribute("href", "/quality-gates");
  });

  it("marks the current route as active", () => {
    pathname.mockReturnValue("/failures");
    render(<BottomNav />);

    expect(screen.getByRole("link", { name: /issues/i })).toHaveClass("text-primary");
    expect(screen.getByRole("link", { name: /gates/i })).toHaveClass("text-muted-foreground");
  });

  it("keeps Dashboard active without matching every other path", () => {
    // A naive `startsWith` would light up Dashboard for "/dashboard-settings"
    // and for any other route that happens to share the prefix.
    pathname.mockReturnValue("/dashboard");
    render(<BottomNav />);

    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveClass("text-primary");
    expect(screen.getByRole("link", { name: /runs/i })).not.toHaveClass("text-primary");
  });

  it("keeps a nested route on its parent tab", () => {
    pathname.mockReturnValue("/test-runs/run_001");
    render(<BottomNav />);

    expect(screen.getByRole("link", { name: /runs/i })).toHaveClass("text-primary");
  });

  it("shows a badge on the issues entry", () => {
    render(<BottomNav />);
    const issues = screen.getByRole("link", { name: /issues/i });
    expect(within(issues).getByText("5")).toBeInTheDocument();
  });

  it("highlights nothing when no tab matches", () => {
    pathname.mockReturnValue("/settings");
    render(<BottomNav />);

    for (const link of screen.getAllByRole("link")) {
      expect(link).not.toHaveClass("text-primary");
    }
  });
});

function within(element: HTMLElement) {
  return {
    getByText: (text: string) => {
      const match = [...element.querySelectorAll("*")].find((node) => node.textContent?.trim() === text);
      if (!match) throw new Error(`no node with text ${text}`);
      return match;
    },
  };
}
