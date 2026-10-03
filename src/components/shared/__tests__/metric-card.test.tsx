import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MetricCard } from "../metric-card";

describe("MetricCard", () => {
  it("shows the label and value", () => {
    render(<MetricCard label="Pass Rate" value="94.2%" />);

    expect(screen.getByText("Pass Rate")).toBeInTheDocument();
    expect(screen.getByText("94.2%")).toBeInTheDocument();
  });

  it("hides the trend when no change is supplied", () => {
    const { container } = render(<MetricCard label="Pass Rate" value="94.2%" />);
    expect(container.querySelector(".text-success, .text-destructive")).toBeNull();
  });

  it("colours a rising metric as a success and a falling one as destructive", () => {
    const { container: up } = render(<MetricCard label="Pass Rate" value="1%" change={2.1} />);
    expect(up.querySelector(".text-success")).not.toBeNull();
    expect(up.textContent).toContain("2.1%");

    const { container: down } = render(<MetricCard label="Duration" value="1m" change={-5.2} />);
    expect(down.querySelector(".text-destructive")).not.toBeNull();
    // The magnitude is what matters to a reader; the sign is carried by colour
    // and arrow, so it must not be rendered as a negative number.
    expect(down.textContent).toContain("5.2%");
    expect(down.textContent).not.toContain("-5.2%");
  });

  it("renders the caption and the icon when given", () => {
    render(
      <MetricCard
        label="Flaky Rate"
        value="2.7%"
        changeLabel="8 flaky tests detected"
        icon={<span data-testid="icon" />}
      />
    );

    expect(screen.getByText("8 flaky tests detected")).toBeInTheDocument();
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("is not a button when there is nothing to click", () => {
    render(<MetricCard label="Release Health" value="94.2%" />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("becomes a real button when it is clickable", async () => {
    const onClick = vi.fn();
    render(<MetricCard label="Open Regressions" value={3} onClick={onClick} />);

    const button = screen.getByRole("button");
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("passes the tooltip through as an accessible title", () => {
    render(<MetricCard label="Pass Rate" value="94.2%" tooltip="Across all repositories" />);
    expect(screen.getByTitle("Across all repositories")).toBeInTheDocument();
  });
});
