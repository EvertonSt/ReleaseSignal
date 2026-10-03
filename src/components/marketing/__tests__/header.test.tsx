import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MarketingHeader } from "../header";

describe("MarketingHeader", () => {
  it("links to every section of the landing page", () => {
    render(<MarketingHeader />);
    const nav = screen.getAllByRole("navigation")[0];

    expect(nav).toBeInTheDocument();
    for (const label of ["Features", "How it Works", "Pricing", "About"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it("points each link at the anchor it names", () => {
    render(<MarketingHeader />);
    const features = screen.getAllByRole("link", { name: "Features" })[0];
    expect(features).toHaveAttribute("href", "#capabilities");
  });

  it("keeps the mobile menu closed until it is asked for", () => {
    render(<MarketingHeader />);
    // Both copies of every nav item are rendered at different breakpoints;
    // the collapsed one must not be reachable before the button is pressed.
    expect(screen.getAllByRole("link", { name: "Features" })).toHaveLength(1);
  });

  it("opens and closes the mobile menu", async () => {
    render(<MarketingHeader />);
    const toggle = screen.getByRole("button", { name: /navigation menu/i });

    await userEvent.click(toggle);
    expect(screen.getAllByRole("link", { name: "Features" })).toHaveLength(2);

    await userEvent.click(toggle);
    expect(screen.getAllByRole("link", { name: "Features" })).toHaveLength(1);
  });

  it("closes the mobile menu when a link inside it is followed", async () => {
    render(<MarketingHeader />);
    await userEvent.click(screen.getByRole("button", { name: /navigation menu/i }));

    const mobilePricing = screen.getAllByRole("link", { name: "Pricing" })[1];
    await userEvent.click(mobilePricing!);

    // Leaving the drawer open behind a navigation traps focus on a page that
    // no longer shows it.
    expect(screen.getAllByRole("link", { name: "Pricing" })).toHaveLength(1);
  });

  it("always offers a way into the demo", () => {
    render(<MarketingHeader />);
    for (const link of screen.getAllByRole("link", { name: /explore demo/i })) {
      expect(link).toHaveAttribute("href", "/dashboard");
    }
  });

  it("gives the menu button an accessible name that follows its state", async () => {
    render(<MarketingHeader />);
    // The button renders an icon only; without a name a screen reader
    // announces "button" and nothing else.
    const toggle = screen.getByRole("button", { name: /navigation menu/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(toggle);
    expect(screen.getByRole("button", { name: /navigation menu/i })).toHaveAttribute("aria-expanded", "true");
  });
});
