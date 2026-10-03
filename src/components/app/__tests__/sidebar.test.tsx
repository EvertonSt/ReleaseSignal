import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const pathname = vi.fn(() => "/dashboard");
vi.mock("next/navigation", () => ({ usePathname: () => pathname() }));

const setOpen = vi.fn();
vi.mock("@/contexts/mobile-nav-context", () => ({
  useMobileNav: () => ({ open: true, setOpen, toggle: vi.fn() }),
}));

vi.mock("@/components/auth/user-menu", () => ({
  UserMenu: () => <div data-testid="user-menu" />,
}));

const { Sidebar } = await import("../sidebar");

function link(name: string) {
  // The desktop rail and the mobile drawer render the same navigation, so a
  // name lookup returns both. The first is the desktop rail.
  return screen.getAllByRole("link", { name: new RegExp(name, "i") })[0]!;
}

function drawer() {
  return screen.getByRole("button", { name: "Close navigation" }).parentElement!;
}

describe("Sidebar", () => {
  beforeEach(() => {
    pathname.mockReturnValue("/dashboard");
    setOpen.mockReset();
  });

  it("lists every destination in the app", () => {
    render(<Sidebar />);
    for (const name of ["Dashboard", "Test Runs", "Failures", "Flaky Tests", "Quality Gates"]) {
      expect(link(name)).toBeInTheDocument();
    }
  });

  it("points each entry at its route", () => {
    render(<Sidebar />);
    expect(link("Quality Gates")).toHaveAttribute("href", "/quality-gates");
    expect(link("Pull Requests")).toHaveAttribute("href", "/pull-requests");
  });

  it("marks the active route", () => {
    pathname.mockReturnValue("/failures");
    render(<Sidebar />);

    expect(link("Failures")).toHaveClass("bg-sidebar-accent");
    expect(link("Reports")).not.toHaveClass("bg-sidebar-accent");
  });

  it("does not treat every route as Home", () => {
    pathname.mockReturnValue("/test-runs");
    render(<Sidebar />);
    // `startsWith("/")` matches every path; Home must not light up everywhere.
    expect(link("Home")).not.toHaveClass("bg-sidebar-accent");
  });

  it("shows the product name when expanded", () => {
    render(<Sidebar />);
    expect(screen.getAllByText("ReleaseSignal").length).toBeGreaterThan(0);
  });

  it("collapses and expands on demand", async () => {
    render(<Sidebar />);
    const rail = screen.getByRole("complementary");
    expect(within(rail).getByText("ReleaseSignal")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Collapse navigation" }));

    // Collapsed, the rail's wordmark is replaced by the monogram. The mobile
    // drawer is open in this fixture, so the assertion is scoped to the rail.
    expect(within(rail).queryByText("ReleaseSignal")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand navigation" })).toHaveAttribute(
      "aria-expanded",
      "false"
    );
  });

  it("closes the mobile drawer when a destination is followed", async () => {
    render(<Sidebar />);
    const withinDrawer = within(drawer());
    await userEvent.click(withinDrawer.getByRole("link", { name: /dashboard/i }));

    expect(setOpen).toHaveBeenCalledWith(false);
  });

  it("closes the mobile drawer when the overlay is dismissed", async () => {
    render(<Sidebar />);
    await userEvent.click(screen.getByRole("button", { name: "Close navigation" }));
    expect(setOpen).toHaveBeenCalledWith(false);
  });

  it("shows unread badges on the failure queues", () => {
    render(<Sidebar />);
    expect(link("Failures")).toHaveTextContent("5");
    expect(link("Flaky Tests")).toHaveTextContent("10");
  });

  it("renders the account menu", () => {
    render(<Sidebar />);
    expect(screen.getAllByTestId("user-menu").length).toBeGreaterThan(0);
  });
});
