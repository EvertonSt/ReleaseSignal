import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarketingFooter } from "../footer";

describe("MarketingFooter", () => {
  it("links to the product sections", () => {
    render(<MarketingFooter />);
    expect(screen.getByRole("link", { name: "Features" })).toHaveAttribute("href", "#capabilities");
    expect(screen.getByRole("link", { name: "Pricing" })).toHaveAttribute("href", "#pricing");
    expect(screen.getByRole("link", { name: "Demo" })).toHaveAttribute("href", "/dashboard");
  });

  it("opens external profiles in a new tab without leaking the referrer", () => {
    render(<MarketingFooter />);
    const external = screen.getAllByRole("link").filter((a) => a.getAttribute("href")?.startsWith("http"));

    expect(external.length).toBeGreaterThan(0);
    for (const link of external) {
      // Without noopener the opened page can reach back through window.opener.
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    }
  });

  it("credits the builder", () => {
    render(<MarketingFooter />);
    expect(screen.getByText("Everton S. Andrade")).toBeInTheDocument();
  });

  it("shows the current year", () => {
    render(<MarketingFooter />);
    expect(screen.getByText(new RegExp(String(new Date().getFullYear())))).toBeInTheDocument();
  });
});
