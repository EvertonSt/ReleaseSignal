import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DemoBanner } from "../demo-banner";

describe("DemoBanner", () => {
  it("says plainly that the data is synthetic", () => {
    render(<DemoBanner />);
    // The banner exists so nobody mistakes demo data for a live install. The
    // wording is the feature; a generic "notice" would defeat the point.
    expect(screen.getByText(/synthetic test data/i)).toBeInTheDocument();
  });

  it("announces itself as a status rather than as decoration", () => {
    render(<DemoBanner />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Demo mode active");
  });

  it("mentions that integrations are not enabled", () => {
    render(<DemoBanner />);
    expect(screen.getByText(/not enabled/i)).toBeInTheDocument();
  });
});
