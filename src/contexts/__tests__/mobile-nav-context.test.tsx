import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MobileNavProvider, useMobileNav } from "../mobile-nav-context";

function Probe({ onToggle }: { onToggle?: () => void }) {
  const { open, toggle, setOpen } = useMobileNav();
  return (
    <div>
      <span data-testid="state">{open ? "open" : "closed"}</span>
      <button type="button" onClick={toggle}>
        toggle
      </button>
      <button type="button" onClick={onToggle ?? (() => {})}>
        probe
      </button>
      <button type="button" onClick={() => setOpen(true)}>
        open
      </button>
    </div>
  );
}

describe("MobileNavProvider", () => {
  it("starts closed", () => {
    render(
      <MobileNavProvider>
        <Probe />
      </MobileNavProvider>
    );
    expect(screen.getByTestId("state")).toHaveTextContent("closed");
  });

  it("toggles open and closed", async () => {
    render(
      <MobileNavProvider>
        <Probe />
      </MobileNavProvider>
    );

    await userEvent.click(screen.getByRole("button", { name: "toggle" }));
    expect(screen.getByTestId("state")).toHaveTextContent("open");

    await userEvent.click(screen.getByRole("button", { name: "toggle" }));
    expect(screen.getByTestId("state")).toHaveTextContent("closed");
  });

  it("can be set directly without toggling", async () => {
    render(
      <MobileNavProvider>
        <Probe />
      </MobileNavProvider>
    );

    await userEvent.click(screen.getByRole("button", { name: "open" }));
    expect(screen.getByTestId("state")).toHaveTextContent("open");
  });

  it("shares one state between every consumer", async () => {
    // The sidebar and the hamburger button are separate components that have
    // to agree; a provider that stored state per consumer would leave the menu
    // stuck open.
    render(
      <MobileNavProvider>
        <Probe />
        <Probe />
      </MobileNavProvider>
    );

    const [first] = screen.getAllByTestId("state");
    await userEvent.click(screen.getAllByRole("button", { name: "toggle" })[0]!);

    expect(first).toHaveTextContent("open");
    for (const state of screen.getAllByTestId("state")) {
      expect(state).toHaveTextContent("open");
    }
  });
});

describe("useMobileNav outside a provider", () => {
  it("falls back to an inert default instead of throwing", () => {
    // The default context value keeps a component renderable in isolation -
    // a story, a test, or a page that forgot the provider - rather than
    // crashing the whole tree.
    const spy = vi.fn();
    expect(() => render(<Probe onToggle={spy} />)).not.toThrow();
    expect(screen.getByTestId("state")).toHaveTextContent("closed");
  });
});
