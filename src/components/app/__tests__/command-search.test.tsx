import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const { CommandSearch } = await import("../command-search");

function open() {
  return render(<CommandSearch open onClose={vi.fn()} />);
}

beforeEach(() => {
  push.mockReset();
});

describe("CommandSearch", () => {
  it("renders nothing while closed", () => {
    const { container } = render(<CommandSearch open={false} onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows every group when the query is empty", () => {
    open();
    expect(screen.getByText("Navigation")).toBeInTheDocument();
    expect(screen.getByText("Recent")).toBeInTheDocument();
  });

  it("narrows the list as the user types", async () => {
    open();
    await userEvent.type(screen.getByRole("textbox"), "flaky");

    expect(screen.getByText("Flaky Tests")).toBeInTheDocument();
    expect(screen.queryByText("Reports")).not.toBeInTheDocument();
  });

  it("matches on keywords as well as titles", async () => {
    open();
    // "quarantine" appears only in the keywords list, so a title-only filter
    // would drop the very result the user is looking for.
    await userEvent.type(screen.getByRole("textbox"), "quarantine");

    expect(screen.getByText("Flaky Tests")).toBeInTheDocument();
    expect(screen.queryByText("Reports")).not.toBeInTheDocument();
  });

  it("is case insensitive", async () => {
    open();
    await userEvent.type(screen.getByRole("textbox"), "REPORTS");
    expect(screen.getByText("Reports")).toBeInTheDocument();
  });

  it("shows nothing rather than everything when there is no match", async () => {
    open();
    await userEvent.type(screen.getByRole("textbox"), "zzzzzznotathing");

    expect(screen.queryByText("Navigation")).not.toBeInTheDocument();
    expect(screen.queryByText("Recent")).not.toBeInTheDocument();
  });

  it("navigates when a result is chosen", async () => {
    open();
    await userEvent.type(screen.getByRole("textbox"), "Quality Gates");
    await userEvent.click(screen.getByText("Quality Gates"));

    expect(push).toHaveBeenCalledWith("/quality-gates");
  });

  it("closes on Escape", async () => {
    const onClose = vi.fn();
    render(<CommandSearch open onClose={onClose} />);

    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("closes when the backdrop is clicked", async () => {
    const onClose = vi.fn();
    render(<CommandSearch open onClose={onClose} />);

    await userEvent.click(screen.getByRole("button", { name: "Close search" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("starts empty every time it is reopened", async () => {
    const { rerender } = render(<CommandSearch open onClose={vi.fn()} />);
    await userEvent.type(screen.getByRole("textbox"), "flaky");
    expect(screen.getByRole("textbox")).toHaveValue("flaky");

    rerender(<CommandSearch open={false} onClose={vi.fn()} />);
    rerender(<CommandSearch open onClose={vi.fn()} />);

    // Carrying the last query into a fresh palette is the classic "I reopened
    // it and it was still filtered" bug.
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("groups results under a heading per category", async () => {
    open();
    await userEvent.type(screen.getByRole("textbox"), "gate");

    // Two different categories match "gate": the navigation destination and
    // the recently-seen entry. Both must survive under their own headings.
    expect(screen.getByText("Navigation")).toBeInTheDocument();
    expect(screen.getByText("Recent")).toBeInTheDocument();
    expect(screen.getByText("Quality Gates")).toBeInTheDocument();
    expect(screen.getByText("Production Gate")).toBeInTheDocument();
  });
});
